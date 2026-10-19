# Manual, commit-pinned updater/builder. This grants no remote access.
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{40}$')]
    [string]$Commit
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
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $builder
if ($LASTEXITCODE -ne 0) { throw 'Build failed. See the error above. No installer was launched.' }
$dist = Join-Path $sourceRoot 'tgg-desktop\dist'
Write-Host "Installer and checksum are in $dist"
Write-Host 'Close TGG before running the installer. Keep your existing app data and backups.'
Start-Process explorer.exe -ArgumentList ('"' + $dist + '"')
