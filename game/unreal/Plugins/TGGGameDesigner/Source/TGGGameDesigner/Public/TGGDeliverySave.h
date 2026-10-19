#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "TGGDeliverySave.generated.h"

UCLASS()
class TGGGAMEDESIGNER_API UTGGDeliverySave : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY(SaveGame)
    int32 Stage = 0;

    UPROPERTY(SaveGame)
    int32 Cash = 0;

    UPROPERTY(SaveGame)
    TArray<FName> OwnedPropertyIDs;

    UPROPERTY(SaveGame)
    int32 LastCollectedBusinessDay = -1;
};
