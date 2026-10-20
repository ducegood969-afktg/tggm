# Owner-started, build-first plugin update. Windows PowerShell 5.1 or newer.
[CmdletBinding()]
param(
    [string]$ProjectRoot = 'D:\TGG\Projects\TGGWorld',
    [string]$EngineRoot = 'C:\Program Files\Epic Games\UE_5.8',
    [switch]$StageOnly,
    [switch]$VerifyAutomation,
    [string]$ResumeWork
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'Run this helper on The Studio, in Windows.' }
$sourceCommit = 'd634b4e8bfc65cac58ffb7d2b35ae301e08545e0'
$sourceBase = "https://raw.githubusercontent.com/ducegood969-afktg/tggm/$sourceCommit/game/unreal/Plugins/TGGGameDesigner"
$manifest = @(
    @{ Path = 'Config/FilterPlugin.ini'; SHA256 = '266ea37f9ab51887ab2eada839386009e2ec8e43f750646959e922152e2e01f6' }
    @{ Path = 'README.md'; SHA256 = 'aa3a7fe3777780dd3b4aade1fe78d8df0b9b88be35e53523b082f966ef011805' }
    @{ Path = 'Source/TGGGameDesigner/Private/TGGDeliveryMission.cpp'; SHA256 = '1bc9e2355a7b85b9760cb5cddc762a7d3df4696b062cd12a4e3fbef54ded7e96' }
    @{ Path = 'Source/TGGGameDesigner/Private/TGGDesignerLibrary.cpp'; SHA256 = '7efc71198e551ed27607ec7c7c9fe954f07e3b31ef66885d1183724c0bdb9983' }
    @{ Path = 'Source/TGGGameDesigner/Private/TGGGameDesignerModule.cpp'; SHA256 = 'f4241b6b750fc2e9cd52263af6e96df1926a40a1aae9a677388f07d803094673' }
    @{ Path = 'Source/TGGGameDesigner/Private/TGGWorldHUD.cpp'; SHA256 = 'd7cdade927e9ee280f937f0fd2a894d77b38d473c301954122d294d11d23174d' }
    @{ Path = 'Source/TGGGameDesigner/Private/Tests/BusinessAutomationTests.cpp'; SHA256 = 'f26e68dd2b3d2cb33f52c277a5cedd0596153cd626fac68c7e5388c3a003e3c5' }
    @{ Path = 'Source/TGGGameDesigner/Public/TGGDeliveryMission.h'; SHA256 = 'c39ff6dbf39d6e642f7ac48ee5161b9767c138893f5ceb5240a9edc858b12894' }
    @{ Path = 'Source/TGGGameDesigner/Public/TGGDeliverySave.h'; SHA256 = 'e28e3a7ae4ba65f674b31787fe3f1287060a319e39315da019c43896e51e1493' }
    @{ Path = 'Source/TGGGameDesigner/Public/TGGDesignerLibrary.h'; SHA256 = 'd4b81e7bf58f078d25a947af6d5320861a08a78f8e7712e282330d5aaf388a27' }
    @{ Path = 'Source/TGGGameDesigner/Public/TGGEconomyRules.h'; SHA256 = '8d1a88ed8072d56fa8d6eefc903274255be18fdbe77f680bacdad04b7e2a0738' }
    @{ Path = 'Source/TGGGameDesigner/Public/TGGPropertyDefinition.h'; SHA256 = '25a0b053eb21698331264fddb10ed451597b821d2a9b24c294258b5cde502896' }
    @{ Path = 'Source/TGGGameDesigner/Public/TGGWorldHUD.h'; SHA256 = '70752c12ebc4555038d21171746e7cf704d69cbb7bd4a80cd053c9518f1d3407' }
    @{ Path = 'Source/TGGGameDesigner/TGGGameDesigner.Build.cs'; SHA256 = '7d20c12a883216d1b81908a955c423a313ea4cb2c42f5b75443192356cf50584' }
    @{ Path = 'Source/TGGGameDesignerEditor/Private/TGGGameDesignerEditorModule.cpp'; SHA256 = 'ef6a79b2565706d3079ad6645c63b61db6bd1047a949162205713f8d71e5736f' }
    @{ Path = 'Source/TGGGameDesignerEditor/TGGGameDesignerEditor.Build.cs'; SHA256 = '25f2b9525eec25f321db9e5b9eb9027cb0b0417527b912d1ef3e5af7cb4c9f2e' }
    @{ Path = 'TGGGameDesigner.uplugin'; SHA256 = '94f32c455f6dea184e04bbd157099a646eb7f3302a99df3566efb6bc90efe9b8' }
)
function Assert-NativeReport([string]$ReportFile) {
    $report = Get-Content -LiteralPath $ReportFile -Raw | ConvertFrom-Json
    if ($report.failed -ne 0 -or $report.notRun -ne 0) { throw "Native report contains failed or unrun tests: $ReportFile" }
    foreach ($testPath in @('TGG.Business.TransactionRules','TGG.Business.SaveRoundTrip')) {
        $results = @($report.tests | Where-Object { $_.fullTestPath -eq $testPath })
        if ($results.Count -ne 1 -or $results[0].state -ne 'Success') { throw "Native check missing or failed: $testPath. No plugin installed. Report: $ReportFile" }
    }
}
function Assert-NativeCompletion($ExitCode, [string]$ReportFile) {
    if ($null -eq $ExitCode) { throw 'Windows did not provide a native process exit status. No plugin installed.' }
    if ($ExitCode -ne 0) { throw "Native process exited with status $ExitCode. No plugin installed." }
    if (!(Test-Path -LiteralPath $ReportFile -PathType Leaf)) { throw "Native test report was not produced: $ReportFile" }
    Assert-NativeReport $ReportFile
}
function Assert-ResumeCandidate([string]$WorkFolder, $Entries, [string]$InstalledPlugin) {
    $staged = Join-Path $WorkFolder 'Candidate/TGGGameDesigner'
    $packaged = Join-Path $WorkFolder 'BuiltPlugin'
    $log = Join-Path $WorkFolder 'BuildPlugin.log'
    if (!(Test-Path -LiteralPath $log -PathType Leaf)) { throw 'Resume requires the original successful BuildPlugin.log.' }
    $buildText = Get-Content -LiteralPath $log -Raw
    if ($buildText -notmatch 'BUILD SUCCESSFUL' -or $buildText -notmatch 'AutomationTool exiting with ExitCode=0') { throw 'Resume build log does not establish successful compilation.' }
    foreach ($entry in $Entries) {
        $file = Join-Path $staged $entry.Path
        if (!(Test-Path -LiteralPath $file -PathType Leaf) -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.SHA256) { throw "Resume candidate changed or is missing: $($entry.Path)" }
        if ($entry.Path.StartsWith('Source/')) {
            $compiledSource = Join-Path $packaged $entry.Path
            if (!(Test-Path -LiteralPath $compiledSource -PathType Leaf) -or (Get-FileHash -LiteralPath $compiledSource -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.SHA256) { throw "Packaged source does not match the pinned candidate: $($entry.Path)" }
        }
    }
    # UAT legitimately adds Installed/EngineVersion to the packaged descriptor.
    $expected = Get-Content -LiteralPath (Join-Path $staged 'TGGGameDesigner.uplugin') -Raw | ConvertFrom-Json
    $actual = Get-Content -LiteralPath (Join-Path $packaged 'TGGGameDesigner.uplugin') -Raw | ConvertFrom-Json
    $expectedModules = @($expected.Modules | ForEach-Object { $_.Name + ':' + $_.Type } | Sort-Object) -join ','
    $actualModules = @($actual.Modules | ForEach-Object { $_.Name + ':' + $_.Type } | Sort-Object) -join ','
    if ($expected.VersionName -ne $actual.VersionName -or $expectedModules -cne $actualModules) { throw 'Packaged plugin version/modules do not match the staged candidate.' }
    $pinned = @($Entries | ForEach-Object { $_.Path })
    foreach ($base in @($InstalledPlugin, $staged)) {
        $other = if ($base -eq $InstalledPlugin) { $staged } else { $InstalledPlugin }
        foreach ($file in Get-ChildItem -LiteralPath (Join-Path $base 'Source') -Recurse -File) {
            $relative = $file.FullName.Substring($base.Length).TrimStart([IO.Path]::DirectorySeparatorChar).Replace('\','/')
            if ($relative -in $pinned) { continue }
            $counterpart = Join-Path $other $relative
            if (!(Test-Path -LiteralPath $counterpart -PathType Leaf) -or (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $counterpart -Algorithm SHA256).Hash) { throw "Unreviewed local source differs from the earlier build; rebuild instead: $relative" }
        }
    }
}
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
if ($ResumeWork) {
    if ($StageOnly) { throw 'Choose ResumeWork or StageOnly, not both.' }
    $work = (Resolve-Path -LiteralPath $ResumeWork).Path.TrimEnd('\')
    $downloads = (Resolve-Path -LiteralPath (Join-Path $env:USERPROFILE 'Downloads')).Path.TrimEnd('\')
    if ((Split-Path -Parent $work) -ine $downloads -or (Split-Path -Leaf $work) -notmatch '^TGG-Plugin-[a-f0-9]{32}$') { throw 'ResumeWork must select a TGG-Plugin staging folder directly inside your Downloads.' }
    Assert-NoLinks $work
    $VerifyAutomation = $true
} else {
    $work = Join-Path $env:USERPROFILE ('Downloads\TGG-Plugin-' + [guid]::NewGuid().ToString('N'))
}
$candidate = Join-Path $work 'Candidate\TGGGameDesigner'
$built = Join-Path $work 'BuiltPlugin'
$backup = Join-Path $work ('Backup-' + [guid]::NewGuid().ToString('N'))
if ($ResumeWork) {
    Assert-ResumeCandidate $work $manifest $plugin
    Write-Host "Resuming verified plugin build: $built. No recompilation requested."
} else {
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
}
$candidateVersion = (Get-Content -LiteralPath (Join-Path $candidate 'TGGGameDesigner.uplugin') -Raw | ConvertFrom-Json).VersionName
Write-Host "Plugin version: $candidateVersion"
foreach ($name in @('UnrealEditor-TGGGameDesigner.dll','UnrealEditor-TGGGameDesignerEditor.dll','UnrealEditor.modules')) {
    if (!(Test-Path -LiteralPath (Join-Path $built ('Binaries\Win64\' + $name)) -PathType Leaf)) { throw "Build output missing $name. Existing plugin was not changed." }
}
if ($VerifyAutomation) {
    $editor = Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
    if (!(Test-Path -LiteralPath $editor -PathType Leaf)) { throw 'UnrealEditor-Cmd.exe is required for native checks. Candidate built but not installed.' }
    $nativeRun = Join-Path $work ('NativeCheck-' + [guid]::NewGuid().ToString('N'))
    $verification = Join-Path $nativeRun 'VerificationProject'
    $verificationPlugin = Join-Path $verification 'Plugins\TGGGameDesigner'
    New-Item -ItemType Directory -Path $verificationPlugin -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $built 'TGGGameDesigner.uplugin') -Destination $verificationPlugin
    Copy-Item -LiteralPath (Join-Path $built 'Binaries') -Destination $verificationPlugin -Recurse -Force
    $verificationProject = Join-Path $verification 'TGGVerification.uproject'
    @{FileVersion=3; EngineAssociation='5.8'; Plugins=@(@{Name='TGGGameDesigner'; Enabled=$true})} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $verificationProject -Encoding utf8
    $reports = Join-Path $nativeRun 'AutomationReport'
    $automationLog = Join-Path $nativeRun 'Automation.log'
    $automationStdout = Join-Path $nativeRun 'Automation-stdout.log'
    $automationStderr = Join-Path $nativeRun 'Automation-stderr.log'
    $arguments = '"' + $verificationProject + '" -unattended -NullRHI -nosound -nosplash -NoSourceControl -ExecCmds="Automation RunTests TGG.Business" -TestExit="Automation Test Queue Empty" -ReportExportPath="' + $reports + '" -AbsLog="' + $automationLog + '"'
    Write-Host 'Running native business and save checks in a disposable project (maximum five minutes).'
    $process = Start-Process -FilePath $editor -ArgumentList $arguments -WindowStyle Hidden -RedirectStandardOutput $automationStdout -RedirectStandardError $automationStderr -PassThru
    # Retain the OS handle while the process is alive; Windows PowerShell can
    # otherwise lose ExitCode after a non-child process exits. Do not Refresh it.
    $nativeHandle = $process.Handle
    if (!$process.WaitForExit(300000)) {
        & (Join-Path $env:SystemRoot 'System32\taskkill.exe') /PID $process.Id /T /F | Out-Null
        throw "Native checks timed out. Existing plugin was not changed. Log: $automationLog"
    }
    $process.WaitForExit()
    $reportFile = Join-Path $reports 'index.json'
    $nativeExitCode = $process.ExitCode
    Write-Host "Native process exit status: $nativeExitCode"
    try { Assert-NativeCompletion $nativeExitCode $reportFile }
    catch { throw ("Native verification stopped: " + $_.Exception.Message + " Existing plugin was not changed. Log: " + $automationLog) }
    Write-Host 'NATIVE CHECKS PASSED: business transactions and Unreal SaveGame round trip.'
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
