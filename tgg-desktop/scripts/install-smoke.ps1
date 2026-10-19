param([bool]$SignedBuild = $true)
$ErrorActionPreference = 'Stop'
$installer = Get-ChildItem dist -Filter '*.exe' | Where-Object Name -NotLike '*__uninstaller*' | Select-Object -First 1
if (!$installer) { throw 'Installer missing' }
$destination = Join-Path $env:RUNNER_TEMP 'TGG AI Ultra Acceptance'
if (Test-Path $destination) { throw 'Acceptance directory already exists; refusing to overwrite it' }
try {
  $process = Start-Process -FilePath $installer.FullName -ArgumentList @('/S', "/D=$destination") -Wait -PassThru
  if ($process.ExitCode -ne 0) { throw "Installer exited $($process.ExitCode)" }
  $exe = Join-Path $destination 'TGG AI Ultra.exe'
  if (!(Test-Path $exe)) { throw 'Installed application is missing' }
  $env:TGG_TEST_EXE = $exe
  node scripts/smoke.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Installed desktop smoke test failed' }
  $uninstaller = Join-Path $destination 'Uninstall TGG AI Ultra.exe'
  if (!(Test-Path $uninstaller)) { throw 'Uninstaller missing' }
  if ($SignedBuild -and (Get-AuthenticodeSignature $uninstaller).Status -ne 'Valid') { throw 'Uninstaller signature invalid' }
  $process = Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait -PassThru
  if ($process.ExitCode -ne 0) { throw "Uninstaller exited $($process.ExitCode)" }
  # NSIS may finish cleanup in a child process; wait for the specific installed executable to disappear.
  $deadline = (Get-Date).AddSeconds(30)
  while ((Test-Path $exe) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 250 }
  if (Test-Path $exe) { throw 'Uninstaller did not remove the application' }
} finally {
  Remove-Item Env:TGG_TEST_EXE -ErrorAction SilentlyContinue
}
