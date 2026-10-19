# Read-only, time-limited process watcher. Does not stop processes or change startup settings.
$ErrorActionPreference = 'Stop'
$report = Join-Path $env:USERPROFILE 'Downloads\TGG-Popup-Diagnostic.json'
$rows = New-Object System.Collections.Generic.List[object]
$watcher = $null
try {
    $query = New-Object System.Management.WqlEventQuery('SELECT * FROM Win32_ProcessStartTrace')
    $watcher = New-Object System.Management.ManagementEventWatcher($query)
    $watcher.Options.Timeout = [TimeSpan]::FromSeconds(2)
    $watcher.Start()
    $until = (Get-Date).AddSeconds(90)
    $reportData = @{status='watching';started=(Get-Date).ToString('o');note='Executable paths and parent identities only; no command lines or environment values.';events=@()}
    $reportData | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $report -Encoding UTF8
    while ((Get-Date) -lt $until) {
        try { $event = $watcher.WaitForNextEvent() }
        catch [System.Management.ManagementException] {
            if ($_.Exception.ErrorCode -eq [System.Management.ManagementStatus]::Timedout) { continue }
            throw
        }
        $processId = [uint32]$event.ProcessID
        $parentId = [uint32]$event.ParentProcessID
        $name = [string]$event.ProcessName
        if ($name -notmatch '^(WindowsTerminal|OpenConsole|conhost|cmd|powershell|pwsh|wscript|cscript|node|python|pythonw|wt|TGG.*)\.exe$') { continue }
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
        $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $parentId" -ErrorAction SilentlyContinue
        $grandparent = if ($parent) { Get-CimInstance Win32_Process -Filter "ProcessId = $($parent.ParentProcessId)" -ErrorAction SilentlyContinue }
        $rows.Add([pscustomobject]@{
            time=(Get-Date).ToString('o');name=$name;pid=$processId;path=$process.ExecutablePath
            parentPid=$parentId;parentName=$parent.Name;parentPath=$parent.ExecutablePath
            grandparentPid=$parent.ParentProcessId;grandparentName=$grandparent.Name;grandparentPath=$grandparent.ExecutablePath
        })
        $reportData.events=@($rows.ToArray())
        $reportData | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $report -Encoding UTF8
    }
    $reportData.status='complete'
    $reportData.events=@($rows.ToArray())
    $reportData | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $report -Encoding UTF8
} catch {
    @{status='failed';error=$_.Exception.Message;events=@($rows.ToArray())} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $report -Encoding UTF8
} finally {
    if ($watcher) { $watcher.Stop(); $watcher.Dispose() }
}
