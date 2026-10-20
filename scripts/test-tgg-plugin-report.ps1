# Tests the real install gate without launching Unreal or changing a project.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0
$helper = Join-Path $PSScriptRoot '..\Update-TGGGameDesigner.ps1'
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $helper).Path, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Plugin updater syntax is invalid.' }
$function = $ast.Find({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Assert-NativeReport'}, $true)
if (!$function) { throw 'Native report install gate was not found.' }
Invoke-Expression $function.Extent.Text
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
    Write-Output ('Native install gate: ' + $cases.Count + ' cases passed; missing, duplicate, failed and unrun tests rejected.')
} finally { Remove-Item -LiteralPath $root -Recurse -Force }
