Option Explicit
' User-started quiet updater. No startup entry, scheduled task, or automatic installation.
Dim shell, command
Set shell = CreateObject("WScript.Shell")
command = "powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -Command " & Chr(34)
command = command & "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; $tggLog=Join-Path $env:USERPROFILE 'Downloads\TGG-Update.log'; & { try { Write-Output ('T"
command = command & "GG update started: '+(Get-Date)); $tggRepo='ducegood969-afktg/tggm'; $tggCommit=[string](Invoke-RestMethod -Uri ('https://api.github.com/repos/'+$tggRepo+'/comm"
command = command & "its/codex/tgg-ai-ultra-windows-release') -Headers @{'User-Agent'='TGG-Update'}).sha; if($tggCommit -notmatch '^[0-9a-f]{40}$'){throw 'Invalid repository commit."
command = command & "'}; $tggFolder=Join-Path $env:USERPROFILE ('Downloads\TGG-updater-'+[guid]::NewGuid().ToString('N')); New-Item -ItemType Directory -Path $tggFolder | Out-Null; "
command = command & "$tggHelper=Join-Path $tggFolder 'Update-TGG.ps1'; Invoke-WebRequest -UseBasicParsing -Uri ('https://raw.githubusercontent.com/'+$tggRepo+'/'+$tggCommit+'/Update"
command = command & "-TGG.ps1') -OutFile $tggHelper; & $tggHelper -Commit $tggCommit -Quiet; Write-Output 'READY: build complete. Installer folder is listed above. Close TGG before "
command = command & "installing.' } catch { Write-Output ('FAILED: '+$_.Exception.Message) } } *> $tggLog"
command = command & Chr(34)
shell.Run command, 0, False
