# Read-only local diagnostics. Does not install, start, stop, or enable services.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$report = [ordered]@{ version = 1; checkedAt = [DateTime]::UtcNow.ToString('o'); graphics = @(); nvidia = @(); engines = @(); installations = @(); notes = @() }
try {
    $report.graphics = @(Get-CimInstance Win32_VideoController | ForEach-Object {
        [ordered]@{ name = $_.Name; driverVersion = $_.DriverVersion; status = $_.Status }
    })
} catch { $report.notes += 'Windows could not report graphics controller details.' }
# nvidia-smi reports actual VRAM; WMI AdapterRAM can truncate larger GPU memory.
$nvidiaPaths = @("$env:WINDIR\System32\nvidia-smi.exe", "$env:ProgramFiles\NVIDIA Corporation\NVSMI\nvidia-smi.exe")
foreach ($exe in $nvidiaPaths) {
    if (Test-Path -LiteralPath $exe -PathType Leaf) {
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo.FileName = $exe
        $process.StartInfo.Arguments = '--query-gpu=name,memory.total,driver_version --format=csv,noheader,nounits'
        $process.StartInfo.UseShellExecute = $false
        $process.StartInfo.CreateNoWindow = $true
        $process.StartInfo.RedirectStandardOutput = $true
        $process.StartInfo.RedirectStandardError = $true
        try {
            [void]$process.Start()
            $stdout = $process.StandardOutput.ReadToEndAsync()
            $stderr = $process.StandardError.ReadToEndAsync()
            if ($process.WaitForExit(10000)) {
                if ($process.ExitCode -eq 0) { $report.nvidia = @($stdout.Result.Trim() -split '\r?\n' | Select-Object -First 8) }
            } else { $process.Kill(); $report.notes += 'NVIDIA diagnostic timed out.' }
        } catch { $report.notes += 'NVIDIA diagnostic was unavailable.' } finally { $process.Dispose() }
        break
    }
}
foreach ($port in @(8188,8000)) {
    try {
        $stats = Invoke-RestMethod -Uri "http://127.0.0.1:$port/system_stats" -TimeoutSec 4 -MaximumRedirection 0
        $info = Invoke-RestMethod -Uri "http://127.0.0.1:$port/object_info/CheckpointLoaderSimple" -TimeoutSec 4 -MaximumRedirection 0
        $models = @($info.CheckpointLoaderSimple.input.required.ckpt_name[0] | Select-Object -First 100)
        $report.engines += [ordered]@{ port = $port; running = $true; checkpoints = $models; devices = @($stats.devices | Select-Object name,type,vram_total,vram_free) }
    } catch { $report.engines += [ordered]@{ port = $port; running = $false } }
}
$roots = @("$env:USERPROFILE\ComfyUI", "$env:USERPROFILE\Documents\ComfyUI", "$env:LOCALAPPDATA\Programs\ComfyUI", "$env:USERPROFILE\Downloads", 'C:\ComfyUI', 'C:\AI', 'D:\ComfyUI', 'D:\AI', 'D:\TGG')
foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root -PathType Container)) { continue }
    $candidates = @($root)
    # Bound discovery to common roots and one child level; never scan personal files.
    try { $candidates += @(Get-ChildItem -LiteralPath $root -Directory -ErrorAction Stop | Where-Object { $_.Name -match 'Comfy|StabilityMatrix|stable.diffusion|automatic1111|forge' } | Select-Object -First 40 -ExpandProperty FullName) } catch {}
    foreach ($candidate in $candidates) {
        foreach ($marker in @('ComfyUI.exe','main.py','ComfyUI\main.py','resources\ComfyUI\main.py','webui.bat','run_nvidia_gpu.bat')) {
            $item = Join-Path $candidate $marker
            if (Test-Path -LiteralPath $item -PathType Leaf) {
                $report.installations += [ordered]@{ folder = $candidate; marker = $marker }
                break
            }
        }
    }
}
$report.notes += 'Discovery is limited to common folders. An undetected engine may be installed elsewhere.'
$report.notes += 'No models, services, startup entries or settings were changed. Review local paths before sharing.'
$outFile = Join-Path $env:USERPROFILE 'Downloads\TGG-Create-Diagnostic.json'
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $outFile -Encoding UTF8
Write-Host ($report | ConvertTo-Json -Depth 8)
Write-Host "Saved diagnostic: $outFile"
