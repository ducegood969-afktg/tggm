# Owner-started Unreal plugin update

Run Update-TGGGameDesigner.ps1 on The Studio with Unreal Editor, the game and other Unreal builds closed. Defaults target D:\TGG\Projects\TGGWorld and C:\Program Files\Epic Games\UE_5.8. Pass -ProjectRoot or -EngineRoot only to select the intended matching 5.8 project/installation. No administrator session or recurring task is required by the helper.

The helper clones the local plugin into a unique Downloads\TGG-Plugin-* staging directory, retaining local Content and extras while excluding generated binaries and intermediates. It downloads 16 reviewed files from immutable commit 52af8e597484000f6408fcdbebffd032aafc670b and verifies every SHA-256 against its embedded manifest. -StageOnly stops there without a build or project write.

By default it calls that engine's RunUAT BuildPlugin for Win64 and retains BuildPlugin.log. It requires successful exit and both editor DLLs/module metadata before installation. Missing tools or failed builds stop before changing the project. Build times and Unreal compilation success are not guaranteed.

Before installation it checks the editor/game are still closed, rejects linked paths, and checks existing source/descriptor have not changed during the build. It backs up the complete original plugin, project descriptor and project Saved/SaveGames folder under the staging directory before writing the project. The backup does not include all Content maps or save directories of separately packaged games; keep an independent complete project backup.

Installation copies built Source, Win64 Binaries and reviewed manifest files, then verifies copied file hashes. Existing plugin Content and unrelated local extras remain untouched. Copy failures trigger a best-effort restore from the backup and remove newly introduced files. If rollback itself fails, the error identifies the retained backup; keep Unreal closed and restore it manually. This does not provide crash/power-failure atomicity.

The helper never launches the game, changes maps/configuration/save files, resets mission data, creates a startup task or packages a Shipping game. A successful plugin build still requires Blueprint compilation and gameplay/save acceptance from Plugins/TGGGameDesigner/README.md. The complete Config folder and assets remain unreviewed.

Validation here: the official PowerShell parser accepts the script, and all 16 manifest entries match the pinned Git source bytes. The helper's Windows build, file-copy and rollback paths have not been executed in this Linux environment. Read script output and BuildPlugin.log on failure; do not assume a staged candidate was installed.

## 0.2.1 HUD update

The helper now selects source candidate 0.2.1. The owner has demonstrated that the 0.2.0 helper compiled with Unreal 5.8, backed up the original and copied verified plugin files. The 0.2.1 HUD code still needs its own target-machine compile and Play check. No uploaded Android file-server token or project input/configuration file is included in this update.
