using UnrealBuildTool;

public class TGGGameDesignerEditor : ModuleRules
{
    public TGGGameDesignerEditor(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "Core", "CoreUObject", "Engine", "UnrealEd", "TGGGameDesigner",
            "Slate", "SlateCore", "ToolMenus", "PythonScriptPlugin"
        });
    }
}
