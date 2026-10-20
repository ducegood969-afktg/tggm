#pragma once

#include "GameFramework/HUD.h"
#include "TGGWorldHUD.generated.h"

class ATGGDeliveryMission;
class UInputComponent;

UCLASS()
class TGGGAMEDESIGNER_API ATGGWorldHUD : public AHUD
{
    GENERATED_BODY()

public:
    virtual void DrawHUD() override;
    virtual void NotifyHitBoxClick(FName BoxName) override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
    UPROPERTY(Transient)
    TObjectPtr<UInputComponent> BusinessMenuInput;

    bool bInputBound = false;
    bool bBusinessMenuOpen = false;
    bool bPreviousCursorVisible = false;
    bool bPreviousClickEvents = false;
    int32 SelectedBusiness = 0;

    ATGGDeliveryMission* FindMission() const;
    void EnsureInputBindings();
    void ToggleBusinessMenu();
    void CloseBusinessMenu();
    void PreviousBusiness();
    void NextBusiness();
    void BuySelectedBusiness();
    void DrawBusinessMenu(ATGGDeliveryMission* Mission, float Scale);
};
