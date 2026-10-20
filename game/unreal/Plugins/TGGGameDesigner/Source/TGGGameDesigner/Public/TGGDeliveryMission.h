#pragma once

#include "GameFramework/Actor.h"
#include "TGGPropertyDefinition.h"
#include "TGGDeliveryMission.generated.h"

class USceneComponent;

UCLASS()
class TGGGAMEDESIGNER_API ATGGDeliveryMission : public AActor
{
    GENERATED_BODY()

public:
    ATGGDeliveryMission();
    virtual void Tick(float DeltaSeconds) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="TGG|Mission")
    FVector PickupOffset = FVector(0, 0, 0);

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="TGG|Mission")
    FVector DeliveryOffset = FVector(4000, 0, 0);

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="TGG|Mission",
        meta=(ClampMin="50.0"))
    float InteractionRadius = 200.0f;

    // Preserve custom HUDs; attach our panel only when Unreal uses its generic HUD.
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="TGG|HUD")
    bool bEnableMissionHUD = true;

    UPROPERTY(BlueprintReadOnly, Category="TGG|Mission")
    int32 Stage = 0;

    UPROPERTY(BlueprintReadOnly, Category="TGG|Mission")
    int32 Cash = 0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="TGG|Business")
    TArray<FTGGPropertyDefinition> PropertyCatalog;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="TGG|Business")
    bool bUseStarterCatalogWhenEmpty = true;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="TGG|Business",
        meta=(ClampMin="5.0", ClampMax="86400.0"))
    float BusinessDayLengthSeconds = 300.0f;

    UPROPERTY(BlueprintReadOnly, Category="TGG|Business")
    int32 CurrentBusinessDay = 0;

    UPROPERTY(BlueprintReadOnly, Category="TGG|Business")
    FString BusinessStatus;

    UPROPERTY(BlueprintReadOnly, Category="TGG|Business")
    TArray<FName> OwnedPropertyIDs;

    UPROPERTY(BlueprintReadOnly, Category="TGG|Business")
    int32 LastCollectedBusinessDay = -1;

    // Retains the existing Blueprint function signature. Cost must match catalog.
    UFUNCTION(BlueprintCallable, Category="TGG|Economy")
    bool AttemptPropertyPurchase(FString PropertyName, int32 PurchaseCost);

    // Called by the game's trusted day controller, not a real-world timer.
    UFUNCTION(BlueprintCallable, Category="TGG|Business")
    bool CollectBusinessRevenue(int32 InGameDay);

    UFUNCTION(BlueprintPure, Category="TGG|Business")
    bool GetDailyBusinessRevenue(int32& Revenue) const;

    UFUNCTION(BlueprintPure, Category="TGG|Business")
    float GetSecondsUntilBusinessDay() const;

    UFUNCTION(BlueprintCallable, CallInEditor, Category="TGG|Business")
    void InstallStarterBusinesses();

    UFUNCTION(BlueprintPure, Category="TGG|Mission")
    bool IsMissionReady() const { return bReady; }

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TObjectPtr<USceneComponent> SceneRoot;

    bool bReady = false;
    float RetryDelay = 0.0f;
    bool bReportedCustomHUD = false;
    float BusinessDayElapsed = 0.0f;
    float BusinessRetryDelay = 0.0f;

    void UpdateMissionHUD();
    void TickBusinesses(float DeltaSeconds);
    bool AdvanceBusinessDay();
    bool SaveState(int32 NewStage, int32 NewCash);
    bool CommitState(int32 NewStage, int32 NewCash,
        const TArray<FName>& NewOwnedPropertyIDs, int32 NewBusinessDay,
        int32 NewCurrentDay);
    bool IsCatalogValid() const;
};
