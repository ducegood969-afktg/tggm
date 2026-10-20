# Manual, commit-pinned updater/builder. This grants no remote access.
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{40}$')]
    [string]$Commit,
    [switch]$Quiet
)
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'Run this helper on Windows.' }
if (!(Get-Command node -ErrorAction SilentlyContinue) -or !(Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'Install Node.js 24 from https://nodejs.org/ and reopen PowerShell.'
}
$major = & node -p 'process.versions.node.slice(0,2)'
if ($LASTEXITCODE -ne 0 -or $major -ne '24') { throw 'Node.js 24 is required.' }
$repository = 'ducegood969-afktg/tggm'
$buildRoot = Join-Path $env:USERPROFILE ('Downloads\TGG-build-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $buildRoot | Out-Null
$archive = Join-Path $buildRoot 'source.zip'
Write-Host "Building $repository at commit $Commit"
Write-Host 'This runs the selected repository code locally. No remote-control service is installed.'
Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/$repository/archive/$Commit.zip" -OutFile $archive
Expand-Archive -LiteralPath $archive -DestinationPath $buildRoot
$sourceRoot = Join-Path $buildRoot ('tggm-' + $Commit.ToLowerInvariant())
$builder = Join-Path $sourceRoot 'tgg-desktop\scripts\build-free.ps1'
if (!(Test-Path -LiteralPath $builder -PathType Leaf)) { throw 'Expected build script was not found. No build was started.' }
if ($Quiet) {
    $env:TGG_SMOKE_HIDDEN = '1'
    $buildOutput = Join-Path $buildRoot 'build-output.log'
    $buildErrors = Join-Path $buildRoot 'build-errors.log'
    $arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $builder + '"'
    $process = Start-Process powershell.exe -WindowStyle Hidden -ArgumentList $arguments -RedirectStandardOutput $buildOutput -RedirectStandardError $buildErrors -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "Build failed. Logs: $buildOutput and $buildErrors. No installer was launched." }
} else {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $builder
    if ($LASTEXITCODE -ne 0) { throw 'Build failed. See the error above. No installer was launched.' }
}
$dist = Join-Path $sourceRoot 'tgg-desktop\dist'
$package = Get-Content -LiteralPath (Join-Path $sourceRoot 'tgg-desktop\package.json') -Raw | ConvertFrom-Json
$version = [string]$package.version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid installer version.' }
$installer = Join-Path $dist ("TGG-AI-Ultra-Setup-$version-x64.exe")
$checksumFile = $installer + '.sha256'
$hash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
$expected = ([string](Get-Content -LiteralPath $checksumFile -Raw)).Substring(0,64).ToLowerInvariant()
if ($hash -ne $expected) { throw 'Installer checksum mismatch. No ready installer was recorded.' }
$readyFolder = Join-Path $env:USERPROFILE 'Downloads\TGG Updates'
New-Item -ItemType Directory -Force -Path $readyFolder | Out-Null
$readyInstaller = Join-Path $readyFolder ("TGG-AI-Ultra-Setup-$version-x64-" + $hash.Substring(0,8) + '.exe')
Copy-Item -LiteralPath $installer -Destination $readyInstaller -Force
if ((Get-FileHash -LiteralPath $readyInstaller -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hash) { throw 'Prepared installer copy failed checksum verification.' }
Set-Content -LiteralPath ($readyInstaller + '.sha256') -Encoding ascii -Value ($hash + '  ' + [IO.Path]::GetFileName($readyInstaller))
$readyRecord = Join-Path $env:USERPROFILE 'Downloads\TGG-Update-Ready.json'
@{version=$version;sha256=$hash;installer=$readyInstaller} | ConvertTo-Json | Set-Content -LiteralPath ($readyRecord + '.tmp') -Encoding utf8
Move-Item -LiteralPath ($readyRecord + '.tmp') -Destination $readyRecord -Force
Write-Host "Ready installer: $readyInstaller"
Write-Host "Installer and checksum are in $dist"
Write-Host 'Close TGG before running the installer. Keep your existing app data and backups.'
if (!$Quiet) { Start-Process explorer.exe -ArgumentList ('"' + $dist + '"') }
