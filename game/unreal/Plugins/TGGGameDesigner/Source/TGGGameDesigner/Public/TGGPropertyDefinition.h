#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "TGGPropertyDefinition.generated.h"

USTRUCT(BlueprintType)
struct TGGGAMEDESIGNER_API FTGGPropertyDefinition : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="TGG|Business")
    FName PropertyID;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="TGG|Business",
        meta=(ClampMin="1"))
    int32 PurchasePrice = 100;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="TGG|Business",
        meta=(ClampMin="0"))
    int32 DailyRevenue = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="TGG|Business",
        meta=(ClampMin="0"))
    int32 StaffHiredCount = 0;
};
