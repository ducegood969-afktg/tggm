#include "TGGDeliveryMission.h"
#include "TGGDeliverySave.h"
#include "TGGWorldHUD.h"
#include "TGGEconomyRules.h"
#include "Components/SceneComponent.h"
#include "DrawDebugHelpers.h"
#include "Engine/Engine.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

namespace
{
    const FString TGGDeliverySaveSlot = TEXT("TGG_Delivery_Prototype_v1");
}

ATGGDeliveryMission::ATGGDeliveryMission()
{
    PrimaryActorTick.bCanEverTick = true;
    SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(SceneRoot);
}

void ATGGDeliveryMission::BeginPlay()
{
    Super::BeginPlay();

    // This prototype writes one local save slot; never run it as a network economy.
    if (GetNetMode() != NM_Standalone)
    {
        UE_LOG(LogTemp, Error, TEXT("TGG delivery supports standalone play only."));
        SetActorTickEnabled(false);
        return;
    }

    // This first prototype supports one player and one mission actor.
    TArray<AActor*> Missions;
    UGameplayStatics::GetAllActorsOfClass(
        this, StaticClass(), Missions);

    if (Missions.Num() != 1)
    {
        UE_LOG(LogTemp, Error,
            TEXT("TGG delivery requires exactly one mission actor."));
        SetActorTickEnabled(false);
        return;
    }

    if (UGameplayStatics::DoesSaveGameExist(TGGDeliverySaveSlot, 0))
    {
        UTGGDeliverySave* Data = Cast<UTGGDeliverySave>(
            UGameplayStatics::LoadGameFromSlot(TGGDeliverySaveSlot, 0));

        bool bValid = Data
            && TGGEconomyRules::ValidMissionState(Data->Stage, Data->Cash)
            && Data->LastCollectedBusinessDay >= -1
            && Data->CurrentBusinessDay >= 0;
        TSet<FName> Seen;
        if (Data)
        {
            for (FName ID : Data->OwnedPropertyIDs)
            {
                if (ID.IsNone() || Seen.Contains(ID)) { bValid = false; }
                Seen.Add(ID);
            }
        }
        if (!bValid)
        {
            UE_LOG(LogTemp, Error,
                TEXT("TGG delivery save could not be validated. "
                     "Existing save was preserved."));
            SetActorTickEnabled(false);
            return;
        }

        Stage = Data->Stage;
        Cash = Data->Cash;
        OwnedPropertyIDs = Data->OwnedPropertyIDs;
        LastCollectedBusinessDay = Data->LastCollectedBusinessDay;
        // Older saves only tracked the last collected day. Never pay it again.
        CurrentBusinessDay = FMath::Max(Data->CurrentBusinessDay,
            FMath::Max(0, LastCollectedBusinessDay));
    }

    if (bUseStarterCatalogWhenEmpty && PropertyCatalog.IsEmpty())
    {
        InstallStarterBusinesses();
    }
    if (!IsCatalogValid())
    {
        BusinessStatus = TEXT("Invalid business catalog: check unique IDs and prices.");
    }

    bReady = true;
    UE_LOG(LogTemp, Display,
        TEXT("TGG delivery loaded. Stage=%d Cash=%d"), Stage, Cash);
}

bool ATGGDeliveryMission::SaveState(int32 NewStage, int32 NewCash)
{
    return CommitState(NewStage, NewCash, OwnedPropertyIDs,
        LastCollectedBusinessDay, CurrentBusinessDay);
}

bool ATGGDeliveryMission::CommitState(int32 NewStage, int32 NewCash,
    const TArray<FName>& NewOwnedPropertyIDs, int32 NewBusinessDay,
    int32 NewCurrentDay)
{
    if (!TGGEconomyRules::ValidMissionState(NewStage, NewCash)
        || NewBusinessDay < -1 || NewCurrentDay < 0
        || NewBusinessDay > NewCurrentDay) { return false; }
    UTGGDeliverySave* Data = Cast<UTGGDeliverySave>(
        UGameplayStatics::CreateSaveGameObject(
            UTGGDeliverySave::StaticClass()));

    if (!Data)
    {
        return false;
    }

    Data->Stage = NewStage;
    Data->Cash = NewCash;
    Data->OwnedPropertyIDs = NewOwnedPropertyIDs;
    Data->LastCollectedBusinessDay = NewBusinessDay;
    Data->CurrentBusinessDay = NewCurrentDay;

    if (!UGameplayStatics::SaveGameToSlot(Data, TGGDeliverySaveSlot, 0))
    {
        UE_LOG(LogTemp, Error,
            TEXT("TGG save failed. Transaction was not applied."));
        return false;
    }

    Stage = NewStage;
    Cash = NewCash;
    OwnedPropertyIDs = NewOwnedPropertyIDs;
    LastCollectedBusinessDay = NewBusinessDay;
    CurrentBusinessDay = NewCurrentDay;
    UE_LOG(LogTemp, Display,
        TEXT("TGG delivery saved. Stage=%d Cash=%d"), Stage, Cash);
    return true;
}

void ATGGDeliveryMission::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    // Controllers may be created after this actor's BeginPlay. Retry until one
    // exists, and re-check after a controller/HUD change without caching actors.
    UpdateMissionHUD();

    if (!bReady)
    {
        return;
    }

    RetryDelay = FMath::Max(0.0f, RetryDelay - DeltaSeconds);
    TickBusinesses(DeltaSeconds);

    APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
    const bool bHasMissionHUD = Controller
        && Cast<ATGGWorldHUD>(Controller->GetHUD()) != nullptr;
    if (GEngine && !bHasMissionHUD)
    {
        const FString Objective = Stage == 0
            ? TEXT("Walk to TGG Dispatch")
            : Stage == 1
                ? TEXT("Deliver the package")
                : TEXT("Delivery complete");

        GEngine->AddOnScreenDebugMessage(
            70801, 0.2f, FColor::Cyan,
            FString::Printf(TEXT("TGG | %s | Cash: $%d"),
                *Objective, Cash));
    }

    if (Stage == 2)
    {
        return;
    }

    const FVector Target = GetActorTransform().TransformPosition(
        Stage == 0 ? PickupOffset : DeliveryOffset);

    const FColor Color = Stage == 0
        ? FColor::Green : FColor::Yellow;

    DrawDebugCylinder(
        GetWorld(), Target, Target + FVector(0, 0, 200),
        100.0f, 20, Color, false, -1.0f, 0, 4.0f);

    APawn* Player = UGameplayStatics::GetPlayerPawn(this, 0);
    if (!Player || RetryDelay > 0.0f)
    {
        return;
    }

    const FVector Position = Player->GetActorLocation();
    const bool bClose =
        FVector::DistSquared2D(Position, Target)
            <= FMath::Square(FMath::Max(50.0f, InteractionRadius))
        && FMath::Abs(Position.Z - Target.Z) < 300.0f;

    if (bClose)
    {
        int32 RewardedCash = Cash;
        const bool bSaved = Stage == 0
            ? SaveState(1, Cash)
            : TGGEconomyRules::CreditBalance(Cash, 100, RewardedCash)
                && SaveState(2, RewardedCash);

        if (!bSaved)
        {
            RetryDelay = 3.0f;
        }
    }
}

void ATGGDeliveryMission::UpdateMissionHUD()
{
    // A duplicate actor must not race to select the HUD. Failed initialization
    // already disables its tick, preserving the existing controller state.
    if (!bReady || !bEnableMissionHUD) { return; }
    APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
    if (!Controller || !Controller->IsLocalController()) { return; }
    AHUD* ExistingHUD = Controller->GetHUD();
    // A null HUD can mean the GameMode is still spawning its chosen class.
    // Wait rather than racing or replacing an intentionally absent HUD.
    if (!ExistingHUD) { return; }
    if (Cast<ATGGWorldHUD>(ExistingHUD)) { return; }
    if (ExistingHUD->GetClass() != AHUD::StaticClass())
    {
        if (!bReportedCustomHUD)
        {
            UE_LOG(LogTemp, Display,
                TEXT("TGG preserved custom HUD %s. To use the TGG panel, "
                     "set HUD Class to TGGWorldHUD in the active GameMode."),
                *ExistingHUD->GetClass()->GetPathName());
            bReportedCustomHUD = true;
        }
        return;
    }
    Controller->ClientSetHUD(ATGGWorldHUD::StaticClass());
    UE_LOG(LogTemp, Display, TEXT("TGG mission HUD attached to local controller."));
}

bool ATGGDeliveryMission::IsCatalogValid() const
{
    TSet<FName> Seen;
    for (const FTGGPropertyDefinition& Property : PropertyCatalog)
    {
        if (Property.PropertyID.IsNone() || Seen.Contains(Property.PropertyID)
            || Property.PurchasePrice <= 0 || Property.DailyRevenue < 0
            || Property.StaffHiredCount < 0)
        {
            return false;
        }
        Seen.Add(Property.PropertyID);
    }
    return true;
}

bool ATGGDeliveryMission::AttemptPropertyPurchase(
    FString PropertyName, int32 PurchaseCost)
{
    if (!bReady || !HasAuthority() || !IsCatalogValid())
    {
        BusinessStatus = TEXT("Business system unavailable: check mission/catalog.");
        return false;
    }
    const FName ID(*PropertyName.TrimStartAndEnd());
    const FTGGPropertyDefinition* Property = PropertyCatalog.FindByPredicate(
        [ID](const FTGGPropertyDefinition& Item) { return Item.PropertyID == ID; });
    int32 NewCash = Cash;
    if (!Property || PurchaseCost != Property->PurchasePrice)
    {
        BusinessStatus = TEXT("Unknown property or price does not match catalog.");
        return false;
    }
    if (OwnedPropertyIDs.Contains(ID))
    {
        BusinessStatus = TEXT("You already own this business. No cash was spent.");
        return false;
    }
    if (!TGGEconomyRules::PurchaseBalance(Cash, PurchaseCost,
            OwnedPropertyIDs.Contains(ID), NewCash))
    {
        BusinessStatus = TEXT("Insufficient cash. No purchase was made.");
        return false;
    }
    TArray<FName> NewOwned = OwnedPropertyIDs;
    NewOwned.Add(ID);
    if (!CommitState(Stage, NewCash, NewOwned, LastCollectedBusinessDay,
        CurrentBusinessDay))
    {
        BusinessStatus = TEXT("Save failed. Purchase was not applied.");
        return false;
    }
    BusinessStatus = FString::Printf(TEXT("Purchased %s for $%d. Ownership saved."),
        *ID.ToString(), PurchaseCost);
    return true;
}

bool ATGGDeliveryMission::CollectBusinessRevenue(int32 InGameDay)
{
    if (!bReady || !HasAuthority() || InGameDay <= 0
        || InGameDay != CurrentBusinessDay
        || InGameDay <= LastCollectedBusinessDay || OwnedPropertyIDs.IsEmpty()
        || !IsCatalogValid())
    {
        return false;
    }
    int32 Revenue = 0;
    int32 NewCash = Cash;
    if (!GetDailyBusinessRevenue(Revenue)
        || !TGGEconomyRules::CollectAvailableDay(Cash, Revenue,
            InGameDay, LastCollectedBusinessDay, NewCash)) { return false; }
    return CommitState(Stage, NewCash, OwnedPropertyIDs, InGameDay,
        CurrentBusinessDay);
}

void ATGGDeliveryMission::InstallStarterBusinesses()
{
    if (!PropertyCatalog.IsEmpty()) { return; }
    const auto Add = [this](const TCHAR* ID, int32 Price, int32 Revenue)
    {
        FTGGPropertyDefinition Item;
        Item.PropertyID = FName(ID);
        Item.PurchasePrice = Price;
        Item.DailyRevenue = Revenue;
        PropertyCatalog.Add(Item);
    };
    Add(TEXT("MusicVenue"), 60, 10);
    Add(TEXT("CornerCafe"), 80, 15);
    Add(TEXT("RentalApartment"), 100, 20);
    BusinessStatus = TEXT("Starter catalog loaded. No cash or ownership was reset.");
}

bool ATGGDeliveryMission::GetDailyBusinessRevenue(int32& Revenue) const
{
    Revenue = 0;
    if (!IsCatalogValid()) { return false; }
    for (FName ID : OwnedPropertyIDs)
    {
        const FTGGPropertyDefinition* Property = PropertyCatalog.FindByPredicate(
            [ID](const FTGGPropertyDefinition& Item) { return Item.PropertyID == ID; });
        if (!Property || !TGGEconomyRules::CreditBalance(
            Revenue, Property->DailyRevenue, Revenue))
        {
            Revenue = 0;
            return false;
        }
    }
    return true;
}

float ATGGDeliveryMission::GetSecondsUntilBusinessDay() const
{
    const float Duration = FMath::IsFinite(BusinessDayLengthSeconds)
        ? FMath::Clamp(BusinessDayLengthSeconds, 5.0f, 86400.0f) : 300.0f;
    return FMath::Max(0.0f, Duration - BusinessDayElapsed);
}

void ATGGDeliveryMission::TickBusinesses(float DeltaSeconds)
{
    if (!FMath::IsFinite(DeltaSeconds) || DeltaSeconds <= 0.0f) { return; }
    BusinessRetryDelay = FMath::Max(0.0f, BusinessRetryDelay - DeltaSeconds);
    const float Remaining = GetSecondsUntilBusinessDay();
    BusinessDayElapsed += FMath::Min(DeltaSeconds, Remaining);
    if (GetSecondsUntilBusinessDay() > 0.0f || BusinessRetryDelay > 0.0f) { return; }
    if (AdvanceBusinessDay()) { BusinessDayElapsed = 0.0f; }
    else { BusinessRetryDelay = 3.0f; }
}

bool ATGGDeliveryMission::AdvanceBusinessDay()
{
    int32 Revenue = 0;
    int32 NewCash = Cash;
    int32 NewDay = CurrentBusinessDay;
    if (!GetDailyBusinessRevenue(Revenue)
        || !TGGEconomyRules::CloseBusinessDay(Cash, Revenue,
            CurrentBusinessDay, LastCollectedBusinessDay, NewCash, NewDay))
    {
        BusinessStatus = TEXT("Daily income paused: invalid catalog or balance limit.");
        return false;
    }
    if (!CommitState(Stage, NewCash, OwnedPropertyIDs, NewDay, NewDay))
    {
        BusinessStatus = TEXT("Daily income save failed. No cash was credited; retrying.");
        return false;
    }
    BusinessStatus = FString::Printf(TEXT("Business day %d: +$%d income saved."),
        NewDay, Revenue);
    return true;
}
