# Read-only 90-second watcher. No process termination, startup changes or command-line collection.
$ErrorActionPreference = 'Stop'
$report = Join-Path $env:USERPROFILE 'Downloads\TGG-Popup-Diagnostic.json'
$rows = New-Object System.Collections.Generic.List[object]
$seen = @{}
$started = (Get-Date).ToString('o')
$matchNames = '^(WindowsTerminal|OpenConsole|conhost|cmd|powershell|pwsh|wscript|cscript|node|python|pythonw|wt|TGG.*)\.exe$'
try {
    $until = (Get-Date).AddSeconds(90)
    $first = $true
    @{status='watching';started=$started;events=@()} | ConvertTo-Json | Set-Content -LiteralPath $report -Encoding UTF8
    while ((Get-Date) -lt $until) {
        $processes = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,Name,ExecutablePath,CreationDate)
        $byId = @{}
        foreach ($item in $processes) { $byId[[uint32]$item.ProcessId] = $item }
        $changed = $false
        foreach ($item in $processes) {
            if ($item.Name -notmatch $matchNames) { continue }
            $key = [string]$item.ProcessId + ':' + [string]$item.CreationDate
            if ($seen.ContainsKey($key)) { continue }
            $seen[$key] = $true
            $parent = $byId[[uint32]$item.ParentProcessId]
            $grandparent = if ($parent) { $byId[[uint32]$parent.ParentProcessId] }
            $rows.Add([pscustomobject]@{
                observed=(Get-Date).ToString('o');alreadyRunning=$first;name=$item.Name;pid=$item.ProcessId;path=$item.ExecutablePath
                parentPid=$item.ParentProcessId;parentName=$parent.Name;parentPath=$parent.ExecutablePath
                grandparentPid=$parent.ParentProcessId;grandparentName=$grandparent.Name;grandparentPath=$grandparent.ExecutablePath
            })
            $changed = $true
        }
        if ($changed) {
            @{status='watching';started=$started;note='Paths and process identities only. Blank paths may reflect Windows access restrictions. Very short processes can be missed.';events=@($rows.ToArray())} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $report -Encoding UTF8
        }
        $first = $false
        if ($rows.Count -ge 2000) { break }
        Start-Sleep -Milliseconds 200
    }
    @{status='complete';started=$started;events=@($rows.ToArray())} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $report -Encoding UTF8
} catch {
    @{status='failed';error=$_.Exception.Message;events=@($rows.ToArray())} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $report -Encoding UTF8
}
