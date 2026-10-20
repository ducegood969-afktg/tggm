#include "Modules/ModuleManager.h"
#include "Framework/Docking/TabManager.h"
#include "Widgets/Docking/SDockTab.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Input/SButton.h"
#include "ToolMenus.h"
#include "Editor.h"
#include "Misc/Paths.h"
#include "HAL/FileManager.h"
#include "IPythonScriptPlugin.h"
#include "EngineUtils.h"
#include "ScopedTransaction.h"
#include "TGGDeliveryMission.h"

#define LOCTEXT_NAMESPACE "TGGWorldDesigner"

static const FName TGGDesignerTabId(TEXT("TGGWorldDesigner"));

class FTGGGameDesignerEditorModule : public IModuleInterface
{
    FString Status = TEXT("Ready. World changes preview in the Unreal viewport.");

    ATGGDeliveryMission* FindEditableMission()
    {
        if (!CanEdit()) { return nullptr; }
        UWorld* World = GEditor->GetEditorWorldContext().World();
        if (!World) { Status = TEXT("Open the gameplay map first."); return nullptr; }
        ATGGDeliveryMission* Mission = nullptr;
        int32 Count = 0;
        for (TActorIterator<ATGGDeliveryMission> It(World); It; ++It)
        {
            Mission = *It;
            ++Count;
        }
        if (Count != 1)
        {
            Status = TEXT("Expected exactly one delivery mission actor. No changes made.");
            return nullptr;
        }
        return Mission;
    }

    void SeedBusinesses()
    {
        ATGGDeliveryMission* Mission = FindEditableMission();
        if (!Mission) { return; }
        if (!Mission->PropertyCatalog.IsEmpty())
        {
            Status = TEXT("Existing property catalog preserved. Edit it in Details.");
            return;
        }
        const FScopedTransaction Transaction(
            LOCTEXT("StarterBusinesses", "TGG starter business catalog"));
        Mission->Modify();
        Mission->InstallStarterBusinesses();
        Mission->MarkPackageDirty();
        Status = TEXT("Starter businesses added. Review Details and save the map. Undo is available.");
    }

    void CheckBusinesses()
    {
        ATGGDeliveryMission* Mission = FindEditableMission();
        if (!Mission) { return; }
        int32 Revenue = 0;
        if (Mission->PropertyCatalog.IsEmpty())
        {
            Status = TEXT("Catalog empty. Runtime starter fallback applies if enabled in Details.");
        }
        else if (!Mission->GetDailyBusinessRevenue(Revenue))
        {
            Status = TEXT("Invalid catalog: use unique non-empty IDs, positive prices and nonnegative revenue/staff.");
        }
        else
        {
            Status = FString::Printf(TEXT("Catalog valid: %d businesses. In Play, press B to open purchases."),
                Mission->PropertyCatalog.Num());
        }
    }

    bool CanEdit()
    {
        if (!GEditor || GEditor->PlayWorld
            || GEditor->IsSimulateInEditorInProgress())
        {
            Status = TEXT("Stop Play or Simulate mode before editing.");
            return false;
        }
        return true;
    }

    FReply RunCode(const FString& Code)
    {
        if (!CanEdit())
        {
            return FReply::Handled();
        }

        IPythonScriptPlugin* Python = IPythonScriptPlugin::Get();
        if (!Python || !Python->IsPythonAvailable())
        {
            Status = TEXT("Python editor scripting is unavailable.");
            return FReply::Handled();
        }

        const bool bOK = Python->ExecPythonCommand(*Code);
        Status = bOK
            ? TEXT("Action finished. Review the viewport. Save when ready.")
            : TEXT("Action refused or failed. See Output Log for details.");
        return FReply::Handled();
    }

    FReply RunScript(const FString& Relative)
    {
        FString Path = FPaths::ConvertRelativePathToFull(
            FPaths::Combine(FPaths::ProjectDir(), Relative));
        FPaths::NormalizeFilename(Path);

        if (!IFileManager::Get().FileExists(*Path))
        {
            Status = TEXT("Required script missing: ") + Path;
            return FReply::Handled();
        }

        return RunCode(FString::Printf(TEXT("\"%s\""), *Path));
    }

    FReply Lighting(float Pitch, float Yaw, float Intensity)
    {
        const FString Code = FString::Printf(
            TEXT("import unreal\n")
            TEXT("actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)\n")
            TEXT("lights = [a for a in actors.get_all_level_actors() if isinstance(a, unreal.DirectionalLight)]\n")
            TEXT("if len(lights) != 1:\n")
            TEXT("    raise RuntimeError('Expected exactly one directional sunlight actor.')\n")
            TEXT("with unreal.ScopedEditorTransaction('TGG lighting preset'):\n")
            TEXT("    sun = lights[0]\n")
            TEXT("    sun.modify()\n")
            TEXT("    sun.set_actor_rotation(unreal.Rotator(%f, %f, 0), False)\n")
            TEXT("    component = sun.get_component_by_class(unreal.DirectionalLightComponent)\n")
            TEXT("    component.modify()\n")
            TEXT("    component.set_intensity(%f)\n"),
            Pitch, Yaw, Intensity);
        return RunCode(Code);
    }

    TSharedRef<SWidget> Button(
        const FString& Label, FSimpleDelegate Action)
    {
        return SNew(SButton)
            .Text(FText::FromString(Label))
            .OnClicked_Lambda([Action]()
            {
                Action.ExecuteIfBound();
                return FReply::Handled();
            });
    }

    TSharedRef<SDockTab> CreateTab(const FSpawnTabArgs& Args)
    {
        TSharedRef<SVerticalBox> Layout = SNew(SVerticalBox);

        auto Text = [&Layout](const FString& Value)
        {
            Layout->AddSlot().AutoHeight().Padding(0, 4, 0, 10)
            [
                SNew(STextBlock)
                .AutoWrapText(true)
                .Text(FText::FromString(Value))
            ];
        };

        auto Add = [this, &Layout](
            const FString& Label, FSimpleDelegate Action)
        {
            Layout->AddSlot().AutoHeight().Padding(0, 0, 0, 8)
            [
                Button(Label, Action)
            ];
        };

        Text(TEXT("TGG WORLD DESIGNER"));
        Text(TEXT(
            "Dock this panel beside the viewport for live world previews. "
            "Stop Play before editing. Use Unreal's Undo for supported edits."));

        Add(TEXT("Select Delivery Mission"),
            FSimpleDelegate::CreateLambda([this]()
        {
            RunCode(TEXT(
                "import unreal\n"
                "s = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)\n"
                "c = unreal.load_class(None, '/Script/TGGGameDesigner.TGGDeliveryMission')\n"
                "matches = [a for a in s.get_all_level_actors() if a.get_class() == c]\n"
                "if len(matches) != 1:\n"
                "    raise RuntimeError('Expected exactly one delivery actor.')\n"
                "s.set_selected_level_actors(matches)\n"));
        }));

        Text(TEXT(
            "After selecting the mission, edit Pickup Offset and Delivery Offset "
            "in Unreal's Details panel. These do not reset saved completion."));

        Text(TEXT("BUSINESSES - Press B in Play to buy. Daily income is saved automatically."));
        Add(TEXT("Install Starter Businesses (empty catalog only)"),
            FSimpleDelegate::CreateLambda([this]() { SeedBusinesses(); }));
        Add(TEXT("Check Business Catalog"),
            FSimpleDelegate::CreateLambda([this]() { CheckBusinesses(); }));
        Text(TEXT("Edit Property Catalog and Business Day Length Seconds on the mission actor. "
            "These controls do not reset cash or ownership. Staff counts are catalog metadata."));

        Add(TEXT("Lighting: Day"),
            FSimpleDelegate::CreateLambda([this]()
        {
            Lighting(-45.0f, -35.0f, 8.0f);
        }));
        Add(TEXT("Lighting: Late Afternoon"),
            FSimpleDelegate::CreateLambda([this]()
        {
            Lighting(-15.0f, -70.0f, 4.0f);
        }));
        Add(TEXT("Lighting: Overhead"),
            FSimpleDelegate::CreateLambda([this]()
        {
            Lighting(-75.0f, -35.0f, 8.0f);
        }));

        Text(TEXT(
            "Lighting presets change the existing sun. "
            "They do not add dynamic weather or a day/night cycle."));

        Add(TEXT("Check Current Map"),
            FSimpleDelegate::CreateLambda([this]()
        {
            RunScript(TEXT("Scripts/check_unreal.py"));
        }));

        Add(TEXT("Save Current Map"),
            FSimpleDelegate::CreateLambda([this]()
        {
            RunCode(TEXT(
                "import unreal\n"
                "s = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)\n"
                "if not s.save_current_level():\n"
                "    raise RuntimeError('Map save did not succeed.')\n"
                "unreal.log('TGG current map saved.')\n"));
        }));

        Text(TEXT(
            "GENERATION TOOLS - use only when the corresponding content "
            "is missing. Existing content is protected against duplicates."));

        Add(TEXT("Generate Prototype Neighborhood"),
            FSimpleDelegate::CreateLambda([this]()
        {
            RunScript(TEXT("build_tgg_neighborhood.py"));
        }));
        Add(TEXT("Place Delivery Mission"),
            FSimpleDelegate::CreateLambda([this]()
        {
            RunScript(TEXT("Scripts/place_tgg_delivery.py"));
        }));
        Add(TEXT("Apply Base Visuals"),
            FSimpleDelegate::CreateLambda([this]()
        {
            RunScript(TEXT("Scripts/tgg_visual_pass.py"));
        }));
        Add(TEXT("Add Windows, Entrances, Lamps and Benches"),
            FSimpleDelegate::CreateLambda([this]()
        {
            RunScript(TEXT("Scripts/tgg_street_details.py"));
        }));

        Text(TEXT(
            "Your existing cash and mission save are not reset by these tools. "
            "Use Play in Unreal's toolbar for gameplay preview."));

        Layout->AddSlot().AutoHeight().Padding(0, 12)
        [
            SNew(STextBlock)
            .AutoWrapText(true)
            .Text_Lambda([this]()
            {
                return FText::FromString(Status);
            })
        ];

        return SNew(SDockTab).TabRole(ETabRole::NomadTab)
        [
            SNew(SBorder).Padding(16.0f)
            [
                SNew(SScrollBox)
                + SScrollBox::Slot()
                [
                    Layout
                ]
            ]
        ];
    }

    void RegisterMenus()
    {
        FToolMenuOwnerScoped Owner(this);
        UToolMenu* Menu = UToolMenus::Get()->ExtendMenu(
            TEXT("LevelEditor.MainMenu.Tools"));

        Menu->FindOrAddSection(TEXT("TGG")).AddMenuEntry(
            TEXT("OpenTGGWorldDesigner"),
            LOCTEXT("OpenPanel", "TGG World Designer"),
            LOCTEXT("Help", "Open TGG world editing controls."),
            FSlateIcon(),
            FUIAction(FExecuteAction::CreateLambda([]()
            {
                FGlobalTabmanager::Get()->TryInvokeTab(TGGDesignerTabId);
            }))
        );
    }

public:
    virtual void StartupModule() override
    {
        FGlobalTabmanager::Get()->RegisterNomadTabSpawner(
            TGGDesignerTabId,
            FOnSpawnTab::CreateRaw(
                this, &FTGGGameDesignerEditorModule::CreateTab))
            .SetDisplayName(LOCTEXT("Tab", "TGG World Designer"))
            .SetMenuType(ETabSpawnerMenuType::Hidden);

        UToolMenus::RegisterStartupCallback(
            FSimpleMulticastDelegate::FDelegate::CreateRaw(
                this, &FTGGGameDesignerEditorModule::RegisterMenus));
    }

    virtual void ShutdownModule() override
    {
        UToolMenus::UnRegisterStartupCallback(this);
        UToolMenus::UnregisterOwner(this);
        FGlobalTabmanager::Get()->UnregisterNomadTabSpawner(TGGDesignerTabId);
    }
};

IMPLEMENT_MODULE(FTGGGameDesignerEditorModule, TGGGameDesignerEditor)

#undef LOCTEXT_NAMESPACE
