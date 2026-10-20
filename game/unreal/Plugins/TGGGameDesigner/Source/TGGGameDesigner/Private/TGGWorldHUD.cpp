#include "TGGWorldHUD.h"
#include "TGGDeliveryMission.h"
#include "Components/InputComponent.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"

ATGGDeliveryMission* ATGGWorldHUD::FindMission() const
{
    ATGGDeliveryMission* Mission = nullptr;
    int32 Count = 0;
    for (TActorIterator<ATGGDeliveryMission> It(GetWorld()); It; ++It)
    {
        Mission = *It;
        ++Count;
    }
    return Count == 1 && Mission && Mission->IsMissionReady() ? Mission : nullptr;
}

void ATGGWorldHUD::EnsureInputBindings()
{
    APlayerController* Controller = GetOwningPlayerController();
    if (bInputBound || !Controller || !Controller->IsLocalController()) { return; }
    InputPriority = 10;
    EnableInput(Controller);
    if (!InputComponent) { return; }
    InputComponent->BindKey(EKeys::B, IE_Pressed, this,
        &ATGGWorldHUD::ToggleBusinessMenu);
    BusinessMenuInput = NewObject<UInputComponent>(this, TEXT("TGGBusinessMenuInput"));
    BusinessMenuInput->Priority = 100;
    BusinessMenuInput->bBlockInput = true;
    BusinessMenuInput->RegisterComponent();
    BusinessMenuInput->BindKey(EKeys::B, IE_Pressed, this,
        &ATGGWorldHUD::ToggleBusinessMenu);
    BusinessMenuInput->BindKey(EKeys::Escape, IE_Pressed, this,
        &ATGGWorldHUD::CloseBusinessMenu);
    BusinessMenuInput->BindKey(EKeys::Up, IE_Pressed, this,
        &ATGGWorldHUD::PreviousBusiness);
    BusinessMenuInput->BindKey(EKeys::Down, IE_Pressed, this,
        &ATGGWorldHUD::NextBusiness);
    BusinessMenuInput->BindKey(EKeys::Enter, IE_Pressed, this,
        &ATGGWorldHUD::BuySelectedBusiness);
    bInputBound = true;
}

void ATGGWorldHUD::ToggleBusinessMenu()
{
    if (bBusinessMenuOpen) { CloseBusinessMenu(); return; }
    APlayerController* Controller = GetOwningPlayerController();
    if (!Controller || !BusinessMenuInput || !FindMission()) { return; }
    bPreviousCursorVisible = Controller->bShowMouseCursor;
    bPreviousClickEvents = Controller->bEnableClickEvents;
    Controller->bShowMouseCursor = true;
    Controller->bEnableClickEvents = true;
    Controller->SetIgnoreLookInput(true);
    Controller->SetIgnoreMoveInput(true);
    Controller->PushInputComponent(BusinessMenuInput);
    bBusinessMenuOpen = true;
}

void ATGGWorldHUD::CloseBusinessMenu()
{
    if (!bBusinessMenuOpen) { return; }
    bBusinessMenuOpen = false;
    APlayerController* Controller = GetOwningPlayerController();
    if (IsValid(Controller))
    {
        if (BusinessMenuInput) { Controller->PopInputComponent(BusinessMenuInput); }
        Controller->bShowMouseCursor = bPreviousCursorVisible;
        Controller->bEnableClickEvents = bPreviousClickEvents;
        // Balance only this menu's ignore-input calls; do not reset other UI locks.
        Controller->SetIgnoreLookInput(false);
        Controller->SetIgnoreMoveInput(false);
    }
}

void ATGGWorldHUD::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    CloseBusinessMenu();
    if (APlayerController* Controller = GetOwningPlayerController())
    {
        DisableInput(Controller);
    }
    Super::EndPlay(EndPlayReason);
}

void ATGGWorldHUD::PreviousBusiness()
{
    const ATGGDeliveryMission* Mission = FindMission();
    if (!Mission || Mission->PropertyCatalog.IsEmpty()) { return; }
    SelectedBusiness = (SelectedBusiness + Mission->PropertyCatalog.Num() - 1)
        % Mission->PropertyCatalog.Num();
}

void ATGGWorldHUD::NextBusiness()
{
    const ATGGDeliveryMission* Mission = FindMission();
    if (!Mission || Mission->PropertyCatalog.IsEmpty()) { return; }
    SelectedBusiness = (SelectedBusiness + 1) % Mission->PropertyCatalog.Num();
}

void ATGGWorldHUD::BuySelectedBusiness()
{
    ATGGDeliveryMission* Mission = FindMission();
    if (!bBusinessMenuOpen || !Mission
        || !Mission->PropertyCatalog.IsValidIndex(SelectedBusiness)) { return; }
    const FTGGPropertyDefinition Property = Mission->PropertyCatalog[SelectedBusiness];
    Mission->AttemptPropertyPurchase(Property.PropertyID.ToString(), Property.PurchasePrice);
}

void ATGGWorldHUD::NotifyHitBoxClick(FName BoxName)
{
    Super::NotifyHitBoxClick(BoxName);
    if (BoxName == TEXT("TGG_BusinessToggle")) { ToggleBusinessMenu(); return; }
    if (BoxName == TEXT("TGG_BusinessClose")) { CloseBusinessMenu(); return; }
    if (!bBusinessMenuOpen) { return; }
    if (BoxName == TEXT("TGG_BusinessPrevious")) { PreviousBusiness(); return; }
    if (BoxName == TEXT("TGG_BusinessNext")) { NextBusiness(); return; }
    const FString Name = BoxName.ToString();
    if (Name.StartsWith(TEXT("TGG_Buy_")))
    {
        const FString Index = Name.RightChop(8);
        if (!Index.IsNumeric()) { return; }
        SelectedBusiness = FCString::Atoi(*Index);
        BuySelectedBusiness();
    }
}

void ATGGWorldHUD::DrawHUD()
{
    Super::DrawHUD();
    if (!Canvas || !GEngine) { return; }
    EnsureInputBindings();
    ATGGDeliveryMission* Mission = FindMission();
    const float Scale = FMath::Clamp(Canvas->ClipX / 1600.0f, 0.65f, 1.4f);
    const float X = 24.0f * Scale;
    const float Y = 24.0f * Scale;
    const FLinearColor Mint(0.45f, 0.95f, 0.72f, 1.0f);
    DrawRect(FLinearColor(0.025f, 0.045f, 0.06f, 0.94f),
        X, Y, 470.0f * Scale, 240.0f * Scale);
    DrawRect(Mint, X, Y, 5.0f * Scale, 240.0f * Scale);
    DrawText(TEXT("TGG WORLD"), Mint, X + 20 * Scale, Y + 14 * Scale,
        GEngine->GetLargeFont(), 0.8f * Scale);
    if (!Mission)
    {
        CloseBusinessMenu();
        DrawText(TEXT("Mission unavailable - check Output Log"), FLinearColor::Yellow,
            X + 20 * Scale, Y + 72 * Scale, GEngine->GetMediumFont(), Scale);
        return;
    }
    DrawText(FString::Printf(TEXT("CASH  $%d"), Mission->Cash), FLinearColor::White,
        X + 20 * Scale, Y + 56 * Scale, GEngine->GetMediumFont(), 1.15f * Scale);
    const FString Objective = Mission->Stage == 0
        ? TEXT("Collect the package at TGG Dispatch")
        : Mission->Stage == 1 ? TEXT("Deliver the package to the yellow marker")
        : TEXT("Delivery complete - progress saved");
    DrawText(Objective, FLinearColor::White, X + 20 * Scale, Y + 94 * Scale,
        GEngine->GetMediumFont(), Scale);
    int32 Revenue = 0;
    const bool bRevenueValid = Mission->GetDailyBusinessRevenue(Revenue);
    const FString Income = bRevenueValid
        ? FString::Printf(TEXT("BUSINESSES  %d owned | +$%d / day"),
            Mission->OwnedPropertyIDs.Num(), Revenue)
        : TEXT("BUSINESSES  Catalog needs attention");
    DrawText(Income, Mint, X + 20 * Scale, Y + 130 * Scale,
        GEngine->GetSmallFont(), Scale);
    DrawText(FString::Printf(TEXT("Day %d | Next payout in %ds"),
        Mission->CurrentBusinessDay, FMath::CeilToInt(Mission->GetSecondsUntilBusinessDay())),
        FLinearColor::White, X + 20 * Scale, Y + 160 * Scale,
        GEngine->GetSmallFont(), Scale);
    DrawRect(FLinearColor(0.10f, 0.24f, 0.19f, 1),
        X + 16 * Scale, Y + 192 * Scale, 438 * Scale, 34 * Scale);
    DrawText(TEXT("[B] Businesses - buy and review ownership"), Mint,
        X + 26 * Scale, Y + 200 * Scale, GEngine->GetSmallFont(), Scale);
    AddHitBox(FVector2D(X + 16 * Scale, Y + 192 * Scale),
        FVector2D(438 * Scale, 34 * Scale), TEXT("TGG_BusinessToggle"), true, 1);
    if (bBusinessMenuOpen) { DrawBusinessMenu(Mission, Scale); }
}

void ATGGWorldHUD::DrawBusinessMenu(ATGGDeliveryMission* Mission, float Scale)
{
    const FLinearColor Mint(0.45f, 0.95f, 0.72f, 1);
    // Absorb background clicks so menu clicks never interact with world actors.
    AddHitBox(FVector2D::ZeroVector, FVector2D(Canvas->ClipX, Canvas->ClipY),
        TEXT("TGG_BusinessBackground"), true, 5);
    DrawRect(FLinearColor(0, 0, 0, 0.68f), 0, 0, Canvas->ClipX, Canvas->ClipY);
    const float W = FMath::Max(1.0f, FMath::Min(760 * Scale, Canvas->ClipX - 32));
    const float H = FMath::Max(1.0f, FMath::Min(540 * Scale, Canvas->ClipY - 32));
    const float X = (Canvas->ClipX - W) / 2;
    const float Y = (Canvas->ClipY - H) / 2;
    const float RowH = 76 * Scale;
    const int32 Rows = FMath::Clamp(FMath::FloorToInt((H - 190 * Scale) / RowH), 1, 6);
    const int32 Count = Mission->PropertyCatalog.Num();
    SelectedBusiness = Count ? FMath::Clamp(SelectedBusiness, 0, Count - 1) : 0;
    const int32 Start = (SelectedBusiness / Rows) * Rows;
    DrawRect(FLinearColor(0.025f, 0.05f, 0.045f, 0.99f), X, Y, W, H);
    DrawRect(Mint, X, Y, 4 * Scale, H);
    DrawText(TEXT("TGG BUSINESSES"), Mint, X + 24 * Scale, Y + 18 * Scale,
        GEngine->GetLargeFont(), 0.8f * Scale);
    DrawText(FString::Printf(TEXT("Cash $%d | Prototype ownership catalog"), Mission->Cash),
        FLinearColor::White, X + 24 * Scale, Y + 54 * Scale,
        GEngine->GetSmallFont(), Scale);
    DrawText(TEXT("Up/Down select | Enter buy | B close | Or click Buy"), Mint,
        X + 24 * Scale, Y + 80 * Scale, GEngine->GetSmallFont(), Scale);
    for (int32 Index = Start; Index < FMath::Min(Start + Rows, Count); ++Index)
    {
        const FTGGPropertyDefinition& Property = Mission->PropertyCatalog[Index];
        const bool bOwned = Mission->OwnedPropertyIDs.Contains(Property.PropertyID);
        const float RowY = Y + 116 * Scale + (Index - Start) * RowH;
        DrawRect(Index == SelectedBusiness ? FLinearColor(0.10f, 0.25f, 0.19f, 1)
            : FLinearColor(0.06f, 0.10f, 0.085f, 1),
            X + 16 * Scale, RowY, W - 32 * Scale, RowH - 8 * Scale);
        DrawText(Property.PropertyID.ToString().Left(38), FLinearColor::White,
            X + 28 * Scale, RowY + 10 * Scale, GEngine->GetMediumFont(), Scale);
        DrawText(FString::Printf(TEXT("$%d | +$%d/day | Staff %d"),
            Property.PurchasePrice, Property.DailyRevenue, Property.StaffHiredCount),
            Mint, X + 28 * Scale, RowY + 38 * Scale, GEngine->GetSmallFont(), Scale);
        const float ButtonX = X + W - 158 * Scale;
        DrawRect(FLinearColor(0.12f, 0.30f, 0.23f, 1), ButtonX,
            RowY + 12 * Scale, 118 * Scale, 40 * Scale);
        const FString Label = bOwned ? TEXT("OWNED") : TEXT("BUY");
        DrawText(Label, bOwned ? Mint : FLinearColor::White, ButtonX + 16 * Scale,
            RowY + 22 * Scale, GEngine->GetSmallFont(), Scale);
        if (!bOwned)
        {
            AddHitBox(FVector2D(ButtonX, RowY + 12 * Scale), FVector2D(118 * Scale, 40 * Scale),
                FName(*FString::Printf(TEXT("TGG_Buy_%d"), Index)), true, 10);
        }
    }
    if (!Count)
    {
        DrawText(TEXT("No businesses configured. Use the editor starter catalog tool."),
            FLinearColor::White, X + 24 * Scale, Y + 130 * Scale,
            GEngine->GetSmallFont(), Scale);
    }
    DrawText(Mission->BusinessStatus.Left(90), Mint,
        X + 24 * Scale, Y + H - 68 * Scale, GEngine->GetSmallFont(), 0.9f * Scale);
    DrawText(TEXT("Income saves each in-game day. No offline payouts. [Close]"),
        FLinearColor::White, X + 24 * Scale, Y + H - 36 * Scale,
        GEngine->GetSmallFont(), 0.9f * Scale);
    AddHitBox(FVector2D(X + W - 100 * Scale, Y + 10 * Scale),
        FVector2D(80 * Scale, 34 * Scale), TEXT("TGG_BusinessClose"), true, 10);
    DrawText(TEXT("CLOSE"), Mint, X + W - 92 * Scale, Y + 20 * Scale,
        GEngine->GetSmallFont(), Scale);
    AddHitBox(FVector2D(X + W - 280 * Scale, Y + 10 * Scale),
        FVector2D(76 * Scale, 34 * Scale), TEXT("TGG_BusinessPrevious"), true, 10);
    AddHitBox(FVector2D(X + W - 190 * Scale, Y + 10 * Scale),
        FVector2D(76 * Scale, 34 * Scale), TEXT("TGG_BusinessNext"), true, 10);
    DrawText(TEXT("< PREV"), Mint, X + W - 274 * Scale, Y + 20 * Scale,
        GEngine->GetSmallFont(), Scale);
    DrawText(TEXT("NEXT >"), Mint, X + W - 184 * Scale, Y + 20 * Scale,
        GEngine->GetSmallFont(), Scale);
}
