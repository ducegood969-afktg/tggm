#pragma once

#include "Kismet/BlueprintFunctionLibrary.h"
#include "TGGDesignerLibrary.generated.h"

UCLASS()
class TGGGAMEDESIGNER_API UTGGDesignerLibrary
    : public UBlueprintFunctionLibrary
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintPure, Category="TGG|Designer")
    static FString GetTGGDesignerVersion();
};
