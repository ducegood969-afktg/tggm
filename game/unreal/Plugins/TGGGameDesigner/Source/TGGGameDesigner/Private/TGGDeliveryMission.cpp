#include "TGGDeliveryMission.h"
#include "TGGDeliverySave.h"
#include "TGGEconomyRules.h"
#include "Components/SceneComponent.h"
#include "DrawDebugHelpers.h"
#include "Engine/Engine.h"
#include "GameFramework/Pawn.h"
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
            && Data->LastCollectedBusinessDay >= -1;
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
    }

    bReady = true;
    UE_LOG(LogTemp, Display,
        TEXT("TGG delivery loaded. Stage=%d Cash=%d"), Stage, Cash);
}

bool ATGGDeliveryMission::SaveState(int32 NewStage, int32 NewCash)
{
    return CommitState(NewStage, NewCash, OwnedPropertyIDs,
        LastCollectedBusinessDay);
}

bool ATGGDeliveryMission::CommitState(int32 NewStage, int32 NewCash,
    const TArray<FName>& NewOwnedPropertyIDs, int32 NewBusinessDay)
{
    if (!TGGEconomyRules::ValidMissionState(NewStage, NewCash)) { return false; }
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
    UE_LOG(LogTemp, Display,
        TEXT("TGG delivery saved. Stage=%d Cash=%d"), Stage, Cash);
    return true;
}

void ATGGDeliveryMission::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (!bReady)
    {
        return;
    }

    RetryDelay = FMath::Max(0.0f, RetryDelay - DeltaSeconds);

    if (GEngine)
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
    if (!bReady || !HasAuthority() || !IsCatalogValid()) { return false; }
    const FName ID(*PropertyName.TrimStartAndEnd());
    const FTGGPropertyDefinition* Property = PropertyCatalog.FindByPredicate(
        [ID](const FTGGPropertyDefinition& Item) { return Item.PropertyID == ID; });
    int32 NewCash = Cash;
    if (!Property || PurchaseCost != Property->PurchasePrice
        || !TGGEconomyRules::PurchaseBalance(Cash, PurchaseCost,
            OwnedPropertyIDs.Contains(ID), NewCash))
    {
        return false;
    }
    TArray<FName> NewOwned = OwnedPropertyIDs;
    NewOwned.Add(ID);
    return CommitState(Stage, NewCash, NewOwned, LastCollectedBusinessDay);
}

bool ATGGDeliveryMission::CollectBusinessRevenue(int32 InGameDay)
{
    if (!bReady || !HasAuthority() || InGameDay < 0
        || InGameDay <= LastCollectedBusinessDay || OwnedPropertyIDs.IsEmpty()
        || !IsCatalogValid())
    {
        return false;
    }
    int32 NewCash = Cash;
    for (FName ID : OwnedPropertyIDs)
    {
        const FTGGPropertyDefinition* Property = PropertyCatalog.FindByPredicate(
            [ID](const FTGGPropertyDefinition& Item) { return Item.PropertyID == ID; });
        if (!Property || !TGGEconomyRules::CreditBalance(
            NewCash, Property->DailyRevenue, NewCash))
        {
            return false;
        }
    }
    return CommitState(Stage, NewCash, OwnedPropertyIDs, InGameDay);
}

