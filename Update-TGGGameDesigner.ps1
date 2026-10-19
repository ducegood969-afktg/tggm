# Owner-started, build-first plugin update. Windows PowerShell 5.1 or newer.
[CmdletBinding()]
param(
    [string]$ProjectRoot = 'D:\TGG\Projects\TGGWorld',
    [string]$EngineRoot = 'C:\Program Files\Epic Games\UE_5.8',
    [switch]$StageOnly
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'Run this helper on The Studio, in Windows.' }
$sourceCommit = '52af8e597484000f6408fcdbebffd032aafc670b'
$sourceBase = "https://raw.githubusercontent.com/ducegood969-afktg/tggm/$sourceCommit/game/unreal/Plugins/TGGGameDesigner"
$manifest = @(
    @{ Path = 'Config/FilterPlugin.ini'; SHA256 = '266ea37f9ab51887ab2eada839386009e2ec8e43f750646959e922152e2e01f6' }
    @{ Path = 'README.md'; SHA256 = '6e73731460bcadcfc419111111f0cd7ec4b088c317534da11840214d5b07d398' }
    @{ Path = 'Source/TGGGameDesigner/Private/TGGDeliveryMission.cpp'; SHA256 = 'd877a2d85f2c3fc52851a4125c905e0aeee0d51df9374f129c702096e31ff77c' }
    @{ Path = 'Source/TGGGameDesigner/Private/TGGDesignerLibrary.cpp'; SHA256 = 'fbb8b206ab0484fec7f4372d6505bf700f42aeda63ca8853c3773825bed0105e' }
    @{ Path = 'Source/TGGGameDesigner/Private/TGGGameDesignerModule.cpp'; SHA256 = 'f4241b6b750fc2e9cd52263af6e96df1926a40a1aae9a677388f07d803094673' }
    @{ Path = 'Source/TGGGameDesigner/Private/TGGWorldHUD.cpp'; SHA256 = 'ad0594f8858df4af148c49b49fef15fc4a8ad4e3fe1a7f71ada3d060b67c7c21' }
    @{ Path = 'Source/TGGGameDesigner/Public/TGGDeliveryMission.h'; SHA256 = '2ebb2a1d8e7b2b622902650c5e4b708a72a20c5b7aef176046b540a50aa41360' }
    @{ Path = 'Source/TGGGameDesigner/Public/TGGDeliverySave.h'; SHA256 = '34fb5eafa2fd1a04ccf04ebf62ba9589847789ab94c5f52eef0b878dc1a004ec' }
    @{ Path = 'Source/TGGGameDesigner/Public/TGGDesignerLibrary.h'; SHA256 = 'd4b81e7bf58f078d25a947af6d5320861a08a78f8e7712e282330d5aaf388a27' }
    @{ Path = 'Source/TGGGameDesigner/Public/TGGEconomyRules.h'; SHA256 = '4db7ae319c116cec67f1925688ab8dc0e6fea0ef220fa2c76e919e57877ecd46' }
    @{ Path = 'Source/TGGGameDesigner/Public/TGGPropertyDefinition.h'; SHA256 = '25a0b053eb21698331264fddb10ed451597b821d2a9b24c294258b5cde502896' }
    @{ Path = 'Source/TGGGameDesigner/Public/TGGWorldHUD.h'; SHA256 = '7c8a846318d966a2b5bea9abc3e9e7ec07ea2dbd33cbff21e488177a49765bd4' }
    @{ Path = 'Source/TGGGameDesigner/TGGGameDesigner.Build.cs'; SHA256 = '833ab87fa331a0d309be962b4f3864bf838af82bac24bdc473a930b593ed3178' }
    @{ Path = 'Source/TGGGameDesignerEditor/Private/TGGGameDesignerEditorModule.cpp'; SHA256 = '6794afe6552bff6b3c33767a9b6b5cfe1f946697e35c38a42b92792f95984c9c' }
    @{ Path = 'Source/TGGGameDesignerEditor/TGGGameDesignerEditor.Build.cs'; SHA256 = 'a5f473b5694ce7ca0006b511195dfa8bf69df5908bf2f4d1aa6383d19cf07613' }
    @{ Path = 'TGGGameDesigner.uplugin'; SHA256 = '68b044a70d988bb9e2a53d803a631efd7ebd8ef44f323f7f8c4edd59d35983be' }
)
function Assert-EditorClosed {
    if (Get-Process -Name UnrealEditor,UnrealEditor-Cmd,TGGWorld,TGGWorld-Win64-Shipping -ErrorAction SilentlyContinue) {
        throw 'Close Unreal Editor, TGGWorld and any Unreal build before continuing. No editor was terminated.'
    }
}
function Assert-NoLinks([string]$Folder) {
    $items = @((Get-Item -LiteralPath $Folder)) + @(Get-ChildItem -LiteralPath $Folder -Recurse -Force)
    foreach ($item in $items) {
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Linked paths are unsupported: $($item.FullName)" }
    }
}
function Source-Fingerprint([string]$Folder) {
    $lines = foreach ($item in (Get-ChildItem -LiteralPath (Join-Path $Folder 'Source') -Recurse -File | Sort-Object FullName)) {
        $item.FullName.Substring($Folder.Length) + ':' + (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash
    }
    $lines += (Get-FileHash -LiteralPath (Join-Path $Folder 'TGGGameDesigner.uplugin') -Algorithm SHA256).Hash
    return ($lines -join "`n")
}
Assert-EditorClosed
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path.TrimEnd('\')
$plugin = Join-Path $ProjectRoot 'Plugins\TGGGameDesigner'
$projectFile = Join-Path $ProjectRoot 'TGGWorld.uproject'
if (!(Test-Path -LiteralPath $projectFile -PathType Leaf) -or !(Test-Path -LiteralPath (Join-Path $plugin 'Source') -PathType Container)) { throw 'Expected TGGWorld project and existing plugin Source were not found.' }
$project = Get-Content -LiteralPath $projectFile -Raw | ConvertFrom-Json
if ($project.EngineAssociation -ne '5.8') { throw 'This helper targets the uploaded Unreal 5.8 project only.' }
Assert-NoLinks $plugin
$before = Source-Fingerprint $plugin
$uat = Join-Path $EngineRoot 'Engine\Build\BatchFiles\RunUAT.bat'
if (!$StageOnly -and !(Test-Path -LiteralPath $uat -PathType Leaf)) { throw "Unreal build tool not found: $uat. Pass -EngineRoot with your UE_5.8 installation." }
$work = Join-Path $env:USERPROFILE ('Downloads\TGG-Plugin-' + [guid]::NewGuid().ToString('N'))
$candidate = Join-Path $work 'Candidate\TGGGameDesigner'
$built = Join-Path $work 'BuiltPlugin'
$backup = Join-Path $work 'Backup'
New-Item -ItemType Directory -Path $candidate -Force | Out-Null
# Retain local Content and plugin extras; generated binaries are rebuilt separately.
foreach ($item in Get-ChildItem -LiteralPath $plugin -Force) {
    if ($item.Name -notin @('Binaries','Intermediate','.git','Saved','DerivedDataCache')) {
        Copy-Item -LiteralPath $item.FullName -Destination $candidate -Recurse -Force
    }
}
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
foreach ($entry in $manifest) {
    $target = Join-Path $candidate $entry.Path
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Invoke-WebRequest -UseBasicParsing -Uri ($sourceBase + '/' + $entry.Path) -OutFile $target
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.SHA256) { throw "Source checksum mismatch: $($entry.Path). Existing plugin was not changed." }
}
Write-Host "Verified candidate: $candidate"
if ($StageOnly) { Write-Host 'STAGED ONLY: existing plugin was not changed or compiled.'; return }
Write-Host 'Building plugin with Unreal. This can take several minutes; no compile time is promised.'
$buildLog = Join-Path $work 'BuildPlugin.log'
& $uat BuildPlugin ("-Plugin=" + (Join-Path $candidate 'TGGGameDesigner.uplugin')) ("-Package=" + $built) -TargetPlatforms=Win64 -Rocket 2>&1 | Tee-Object -FilePath $buildLog
if ($LASTEXITCODE -ne 0) { throw "Unreal plugin build failed. Existing plugin was not changed. Log: $buildLog" }
foreach ($name in @('UnrealEditor-TGGGameDesigner.dll','UnrealEditor-TGGGameDesignerEditor.dll','UnrealEditor.modules')) {
    if (!(Test-Path -LiteralPath (Join-Path $built ('Binaries\Win64\' + $name)) -PathType Leaf)) { throw "Build output missing $name. Existing plugin was not changed." }
}
Assert-EditorClosed
if ((Source-Fingerprint $plugin) -cne $before) { throw 'Existing source changed during the build. The candidate was built but not installed.' }
Assert-NoLinks $plugin
Assert-NoLinks $built
$saveFolder = Join-Path $ProjectRoot 'Saved\SaveGames'
if (Test-Path -LiteralPath $saveFolder) { Assert-NoLinks $saveFolder }
New-Item -ItemType Directory -Path $backup -Force | Out-Null
# Backup must finish before the first project write.
Copy-Item -LiteralPath $plugin -Destination (Join-Path $backup 'TGGGameDesigner') -Recurse -Force
Copy-Item -LiteralPath $projectFile -Destination $backup
if (Test-Path -LiteralPath $saveFolder) { Copy-Item -LiteralPath $saveFolder -Destination (Join-Path $backup 'SaveGames') -Recurse -Force }
Write-Host "Backup: $backup"
# Install only source, generated Win64 binaries and the reviewed manifest files.
# Existing game/plugin Content and unrelated local extras stay untouched.
$builtFiles = @(Get-ChildItem -LiteralPath $built -Recurse -File | Where-Object {
    $relative = $_.FullName.Substring($built.Length).TrimStart('\').Replace('\','/')
    $relative.StartsWith('Source/') -or $relative.StartsWith('Binaries/Win64/') -or $relative -in @($manifest | ForEach-Object { $_.Path })
})
$newTargets = @()
foreach ($item in $builtFiles) {
    $relative = $item.FullName.Substring($built.Length).TrimStart('\')
    $destination = Join-Path $plugin $relative
    if (!(Test-Path -LiteralPath $destination)) { $newTargets += $destination }
}
try {
    foreach ($item in $builtFiles) {
        $relative = $item.FullName.Substring($built.Length).TrimStart('\')
        $destination = Join-Path $plugin $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
        Copy-Item -LiteralPath $item.FullName -Destination $destination -Force
        if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash) { throw "Installed file verification failed: $relative" }
    }
} catch {
    $installError = $_
    try {
        foreach ($target in $newTargets) { if (Test-Path -LiteralPath $target -PathType Leaf) { Remove-Item -LiteralPath $target -Force } }
        foreach ($item in Get-ChildItem -LiteralPath (Join-Path $backup 'TGGGameDesigner') -Force) { Copy-Item -LiteralPath $item.FullName -Destination $plugin -Recurse -Force }
    } catch { throw "Installation and automatic restore failed. Keep Unreal closed. Restore plugin from $backup. Original error: $installError" }
    throw "Installation failed; previous plugin restored from $backup. Error: $installError"
}
Write-Host 'BUILT AND COPIED: plugin compiled and files verified. This does not cook or package the game.'
Write-Host "Backup retained: $backup"
Write-Host 'Open the project and compile dependent Blueprints. Verify mission/save behavior in a disposable save copy before relying on it.'
Write-Host 'Project maps, configuration and save files were not modified by this helper.'
