using UnrealBuildTool;

public class TGGGameDesigner : ModuleRules
{
    public TGGGameDesigner(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(
            new string[] { "Core", "CoreUObject", "Engine", "InputCore" }
        );
    }
}
