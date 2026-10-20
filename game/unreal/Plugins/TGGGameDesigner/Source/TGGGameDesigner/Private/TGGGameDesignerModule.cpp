#include "Modules/ModuleManager.h"

class FTGGGameDesignerModule : public IModuleInterface
{
public:
    virtual void StartupModule() override
    {
        UE_LOG(LogTemp, Display,
            TEXT("TGG Game Designer module loaded."));
    }
};

IMPLEMENT_MODULE(FTGGGameDesignerModule, TGGGameDesigner)
