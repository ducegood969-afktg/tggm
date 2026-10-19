#include "TGGWorldHUD.h"
#include "TGGDeliveryMission.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "EngineUtils.h"

void ATGGWorldHUD::DrawHUD()
{
    Super::DrawHUD();

    if (!Canvas || !GEngine)
    {
        return;
    }

    ATGGDeliveryMission* Mission = nullptr;
    int32 MissionCount = 0;

    for (TActorIterator<ATGGDeliveryMission> It(GetWorld()); It; ++It)
    {
        Mission = *It;
        ++MissionCount;
    }

    const float Scale = FMath::Clamp(
        Canvas->ClipX / 1600.0f, 0.65f, 1.4f);
    const float X = 24.0f * Scale;
    const float Y = 24.0f * Scale;
    const FLinearColor Mint(0.45f, 0.95f, 0.72f, 1.0f);

    DrawRect(
        FLinearColor(0.025f, 0.045f, 0.06f, 0.94f),
        X, Y, 470.0f * Scale, 164.0f * Scale);
    DrawRect(Mint, X, Y, 5.0f * Scale, 164.0f * Scale);

    DrawText(
        TEXT("TGG WORLD"), Mint,
        X + 20.0f * Scale, Y + 14.0f * Scale,
        GEngine->GetLargeFont(), 0.8f * Scale);

    if (MissionCount != 1 || !Mission || !Mission->IsMissionReady())
    {
        DrawText(
            TEXT("Mission unavailable - check Output Log"),
            FLinearColor::Yellow,
            X + 20.0f * Scale, Y + 72.0f * Scale,
            GEngine->GetMediumFont(), Scale);
        return;
    }

    DrawText(
        FString::Printf(TEXT("CASH  $%d"), Mission->Cash),
        FLinearColor::White,
        X + 20.0f * Scale, Y + 56.0f * Scale,
        GEngine->GetMediumFont(), 1.15f * Scale);

    const FString Objective = Mission->Stage == 0
        ? TEXT("Collect the package at TGG Dispatch")
        : Mission->Stage == 1
            ? TEXT("Deliver the package to the yellow marker")
            : TEXT("Delivery complete");

    DrawText(
        Objective, FLinearColor::White,
        X + 20.0f * Scale, Y + 94.0f * Scale,
        GEngine->GetMediumFont(), Scale);

    const FString Hint = Mission->Stage == 2
        ? TEXT("Progress saved | Reward already received")
        : TEXT("Walk into the active marker to continue");

    DrawText(
        Hint, Mint,
        X + 20.0f * Scale, Y + 128.0f * Scale,
        GEngine->GetSmallFont(), Scale);
}
