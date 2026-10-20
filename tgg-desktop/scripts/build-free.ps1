# Run on your own Windows PC from an extracted copy of this repository.
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'This builder requires Windows.' }
if (!(Get-Command node -ErrorAction SilentlyContinue) -or !(Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw 'Install the free Node.js 24 LTS Windows package from https://nodejs.org/ and reopen PowerShell.'
}
$major = & node -p 'process.versions.node.slice(0,2)'
if ($LASTEXITCODE -ne 0 -or $major -ne '24') { throw 'Node.js 24 is required.' }
function Invoke-Npm([string[]]$CommandArgs) {
  & npm.cmd @CommandArgs
  if ($LASTEXITCODE -ne 0) { throw "npm $($CommandArgs -join ' ') failed; stopped without reporting a successful build." }
}
Push-Location (Join-Path $PSScriptRoot '..')
try {
  Invoke-Npm -CommandArgs @('ci', '--no-audit', '--no-fund')
  Invoke-Npm -CommandArgs @('run', 'prepare:git')
  Invoke-Npm -CommandArgs @('test')
  Invoke-Npm -CommandArgs @('run', 'smoke')
  Invoke-Npm -CommandArgs @('run', 'dist:unsigned')
  $version = & node -p "require('./package.json').version"
  if ($LASTEXITCODE -ne 0) { throw 'Cannot read the application version.' }
  $installer = Join-Path $PWD "dist/TGG-AI-Ultra-Setup-$version-x64.exe"
  if (!(Test-Path -LiteralPath $installer)) { throw 'Installer not produced.' }
  $hash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
  Set-Content -LiteralPath ($installer + '.sha256') -Encoding ascii -Value "$hash  $([IO.Path]::GetFileName($installer))"
  Write-Host "Unsigned installer built: $installer"
  Write-Host 'Windows may show unknown-publisher warnings. Automatic updates are disabled.'
} finally {
  Pop-Location
}
