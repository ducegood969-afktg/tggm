# Tests the real install gate without launching Unreal or changing a project.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0
$helper = Join-Path $PSScriptRoot '..\Update-TGGGameDesigner.ps1'
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $helper).Path, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Plugin updater syntax is invalid.' }
foreach ($name in @('Assert-NativeReport','Assert-NativeCompletion','Assert-ResumeCandidate')) {
    $function = $ast.Find({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name}, $true)
    if (!$function) { throw ('Install gate was not found: ' + $name) }
    Invoke-Expression $function.Extent.Text
}
function Expect-Rejection([scriptblock]$Operation, [string]$Pattern) {
    try { & $Operation } catch {
        if ($_.Exception.Message -notmatch $Pattern) { throw }
        return
    }
    throw ('Expected rejection matching: ' + $Pattern)
}
$root = Join-Path ([IO.Path]::GetTempPath()) ('tgg-report-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null
$transactions = @{fullTestPath='TGG.Business.TransactionRules';state='Success'}
$save = @{fullTestPath='TGG.Business.SaveRoundTrip';state='Success'}
$cases = @(
    @{Name='both passed'; Accept=$true; Report=@{failed=0;notRun=0;tests=@($transactions,$save)}}
    @{Name='zero tests'; Accept=$false; Report=@{failed=0;notRun=0;tests=@()}}
    @{Name='missing save test'; Accept=$false; Report=@{failed=0;notRun=0;tests=@($transactions)}}
    @{Name='failed save test'; Accept=$false; Report=@{failed=1;notRun=0;tests=@($transactions,@{fullTestPath='TGG.Business.SaveRoundTrip';state='Fail'})}}
    @{Name='duplicate result'; Accept=$false; Report=@{failed=0;notRun=0;tests=@($transactions,$save,$save)}}
    @{Name='other failure'; Accept=$false; Report=@{failed=1;notRun=0;tests=@($transactions,$save)}}
    @{Name='unrun tests'; Accept=$false; Report=@{failed=0;notRun=1;tests=@($transactions,$save)}}
)
try {
    foreach ($case in $cases) {
        $file = Join-Path $root 'index.json'
        $case.Report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $file -Encoding utf8
        $accepted = $true
        try { Assert-NativeReport $file } catch { $accepted = $false }
        if ($accepted -ne $case.Accept) { throw ('Incorrect gate result: ' + $case.Name) }
    }
    $file = Join-Path $root 'index.json'
    @{failed=0;notRun=0;tests=@($transactions,$save)} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $file -Encoding utf8
    Assert-NativeCompletion 0 $file
    Expect-Rejection { Assert-NativeCompletion $null $file } 'did not provide'
    Expect-Rejection { Assert-NativeCompletion 7 $file } 'status 7'
    Expect-Rejection { Assert-NativeCompletion 0 (Join-Path $root 'missing.json') } 'not produced'
    # Exercise the same retained-handle wait path using owned short-lived processes.
    $executable = (Get-Process -Id $PID).Path
    foreach ($expectedExit in @(0,7)) {
        $arguments = '-NoLogo -NoProfile -NonInteractive -Command "Start-Sleep -Milliseconds 200; exit ' + $expectedExit + '"'
        $process = Start-Process -FilePath $executable -ArgumentList $arguments -PassThru
        $nativeHandle = $process.Handle
        if (!$process.WaitForExit(10000)) { $process.Kill(); throw 'Owned test process timed out.' }
        $process.WaitForExit()
        if ($process.ExitCode -ne $expectedExit) { throw 'Owned process exit status was lost.' }
        $process.Dispose()
    }
    $work = Join-Path $root 'Resume'
    $staged = Join-Path $work 'Candidate/TGGGameDesigner'
    $built = Join-Path $work 'BuiltPlugin'
    $installed = Join-Path $root 'Installed'
    foreach ($folder in @($staged,$built,$installed)) {
        New-Item -ItemType Directory -Path (Join-Path $folder 'Source/Runtime') -Force | Out-Null
    }
    $descriptor = @{VersionName='0.3.0'; Modules=@(@{Name='TGGGameDesigner';Type='Runtime'})}
    $descriptor | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $staged 'TGGGameDesigner.uplugin') -Encoding utf8
    $descriptor.Installed = $true
    $descriptor | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $built 'TGGGameDesigner.uplugin') -Encoding utf8
    $candidateSource = Join-Path $staged 'Source/Runtime/Test.cpp'
    $builtSource = Join-Path $built 'Source/Runtime/Test.cpp'
    'pinned source' | Set-Content -LiteralPath $candidateSource -Encoding utf8
    Copy-Item -LiteralPath $candidateSource -Destination $builtSource
    'old installed source' | Set-Content -LiteralPath (Join-Path $installed 'Source/Runtime/Test.cpp') -Encoding utf8
    $extra = Join-Path $installed 'Source/Runtime/Local.cpp'
    'preserved custom source' | Set-Content -LiteralPath $extra -Encoding utf8
    Copy-Item -LiteralPath $extra -Destination (Join-Path $staged 'Source/Runtime/Local.cpp')
    $log = Join-Path $work 'BuildPlugin.log'
    "BUILD SUCCESSFUL`nAutomationTool exiting with ExitCode=0 (Success)" | Set-Content -LiteralPath $log -Encoding utf8
    $entries = @(
        @{Path='Source/Runtime/Test.cpp';SHA256=(Get-FileHash $candidateSource -Algorithm SHA256).Hash.ToLowerInvariant()}
        @{Path='TGGGameDesigner.uplugin';SHA256=(Get-FileHash (Join-Path $staged 'TGGGameDesigner.uplugin') -Algorithm SHA256).Hash.ToLowerInvariant()}
    )
    Assert-ResumeCandidate $work $entries $installed
    'tampered package' | Set-Content -LiteralPath $builtSource -Encoding utf8
    Expect-Rejection { Assert-ResumeCandidate $work $entries $installed } 'Packaged source'
    Copy-Item -LiteralPath $candidateSource -Destination $builtSource -Force
    'changed local source' | Set-Content -LiteralPath $extra -Encoding utf8
    Expect-Rejection { Assert-ResumeCandidate $work $entries $installed } 'Unreviewed local source'
    Copy-Item -LiteralPath (Join-Path $staged 'Source/Runtime/Local.cpp') -Destination $extra -Force
    $descriptor.VersionName = 'wrong'
    $descriptor | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $built 'TGGGameDesigner.uplugin') -Encoding utf8
    Expect-Rejection { Assert-ResumeCandidate $work $entries $installed } 'version/modules'
    'BUILD FAILED' | Set-Content -LiteralPath $log -Encoding utf8
    Expect-Rejection { Assert-ResumeCandidate $work $entries $installed } 'successful compilation'
    Write-Output ('Native report gate: ' + $cases.Count + ' cases; completion: 4 cases; retained exit handles: 2 processes; resume validation: 5 cases passed.')
} finally { Remove-Item -LiteralPath $root -Recurse -Force }
