#pragma once

#include "GameFramework/HUD.h"
#include "TGGWorldHUD.generated.h"

UCLASS()
class TGGGAMEDESIGNER_API ATGGWorldHUD : public AHUD
{
    GENERATED_BODY()

public:
    virtual void DrawHUD() override;
};
