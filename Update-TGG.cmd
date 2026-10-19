@echo off
setlocal
 title TGG Update
 echo TGG Update - build the latest TGG preview
 echo This downloads and runs code from the TGG development branch.
 echo Save your work. Close TGG before running the resulting installer.
 echo.
 powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; try { $tggRepo='ducegood969-afktg/tggm'; $tggLatest=Invoke-RestMethod -Uri ('https://api.github.com/repos/'+$tggRepo+'/commits/codex/tgg-ai-ultra-windows-release') -Headers @{'User-Agent'='TGG-Update'}; $tggCommit=[string]$tggLatest.sha; if($tggCommit -notmatch '^[0-9a-f]{40}$'){throw 'The repository did not return a valid commit.'}; $tggFolder=Join-Path $env:USERPROFILE ('Downloads\TGG-updater-'+[guid]::NewGuid().ToString('N')); New-Item -ItemType Directory -Path $tggFolder | Out-Null; $tggHelper=Join-Path $tggFolder 'Update-TGG.ps1'; Invoke-WebRequest -UseBasicParsing -Uri ('https://raw.githubusercontent.com/'+$tggRepo+'/'+$tggCommit+'/Update-TGG.ps1') -OutFile $tggHelper; Write-Host ('Selected commit: '+$tggCommit); & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $tggHelper -Commit $tggCommit; if($LASTEXITCODE -ne 0){throw 'Update build failed. See the message above.'} } catch { Write-Host ('TGG update stopped: '+$_.Exception.Message) -ForegroundColor Red; exit 1 }"
 if errorlevel 1 (
 echo.
 echo No installer was started. Check the error above and try again after fixing it.
 pause
 exit /b 1
 )
 echo.
 echo Build finished. Run the installer in the folder that opened.
 pause
