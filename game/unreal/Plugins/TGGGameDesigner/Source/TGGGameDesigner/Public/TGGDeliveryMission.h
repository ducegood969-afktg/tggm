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

    UPROPERTY(BlueprintReadOnly, Category="TGG|Mission")
    int32 Stage = 0;

    UPROPERTY(BlueprintReadOnly, Category="TGG|Mission")
    int32 Cash = 0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="TGG|Business")
    TArray<FTGGPropertyDefinition> PropertyCatalog;

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

    UFUNCTION(BlueprintPure, Category="TGG|Mission")
    bool IsMissionReady() const { return bReady; }

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TObjectPtr<USceneComponent> SceneRoot;

    bool bReady = false;
    float RetryDelay = 0.0f;

    bool SaveState(int32 NewStage, int32 NewCash);
    bool CommitState(int32 NewStage, int32 NewCash,
        const TArray<FName>& NewOwnedPropertyIDs, int32 NewBusinessDay);
    bool IsCatalogValid() const;
};
