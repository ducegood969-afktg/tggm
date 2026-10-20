# Copies the owner's completed SD 1.5 download into the running ComfyUI's model path.
# No model download, process termination, startup change, or settings change.
[CmdletBinding()]
param([string]$ModelFile, [string]$CheckpointDirectory)
$ErrorActionPreference = 'Stop'
function Get-ComfyArgument {
    param([object[]]$Arguments, [string]$Name)
    for ($i = 0; $i -lt $Arguments.Count; $i++) {
        if ([string]$Arguments[$i] -eq $Name) {
            if ($i + 1 -ge $Arguments.Count) { throw "Missing value for $Name" }
            return [string]$Arguments[$i + 1]
        }
        if (([string]$Arguments[$i]).StartsWith($Name + '=')) { return ([string]$Arguments[$i]).Substring($Name.Length + 1) }
    }
    return $null
}
function Get-ComfyCheckpointDirectory {
    param([object[]]$Arguments)
    $config = Get-ComfyArgument $Arguments '--extra-model-paths-config'
    if ($config -and -not (Get-ComfyArgument $Arguments '--models-directory') -and -not (Get-ComfyArgument $Arguments '--base-directory')) {
        $configRoot = Join-Path $env:APPDATA 'Comfy Desktop\instance-model-paths'
        if ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($config)) -ne [IO.Path]::GetFullPath($configRoot)) { throw 'ComfyUI model configuration is outside the expected Desktop folder.' }
        $info = Get-Item -LiteralPath $config
        if ($info.Length -gt 256KB -or $info.LinkType) { throw 'Unsupported model configuration file.' }
        $lines = @(Get-Content -LiteralPath $config)
        $bases = @($lines | Where-Object { $_ -match "^  base_path: '([^']+)'\s*$" } | ForEach-Object { [void]($_ -match "^  base_path: '([^']+)'\s*$"); $Matches[1] })
        $checkpoints = @($lines | Where-Object { $_ -match "^  'checkpoints': 'checkpoints/'\s*$" })
        if ($bases.Count -ne 1 -or $checkpoints.Count -ne 1 -or -not [IO.Path]::IsPathRooted($bases[0]) -or $bases[0].StartsWith('\\')) { throw 'Model configuration is ambiguous or uses an unsupported layout. Use TGG Create Install downloaded checkpoint.' }
        return Join-Path $bases[0] 'checkpoints'
    }
    $models = Get-ComfyArgument $Arguments '--models-directory'
    if (-not $models) {
        $basePath = Get-ComfyArgument $Arguments '--base-directory'
        if (-not $basePath) {
            $scripts = @($Arguments | Where-Object { [string]$_ -match '[\\/]main\.py$' -and [IO.Path]::IsPathRooted([string]$_) })
            if ($scripts.Count -ne 1) { throw 'ComfyUI did not report an absolute installation path. No files were changed. Send the output of http://127.0.0.1:8188/system_stats so its folder can be identified.' }
            $basePath = [IO.Path]::GetDirectoryName([string]$scripts[0])
            if (-not (Test-Path -LiteralPath (Join-Path $basePath 'folder_paths.py') -PathType Leaf)) { throw 'The reported script folder is not a recognizable ComfyUI installation.' }
        }
        if (-not [IO.Path]::IsPathRooted($basePath) -or -not (Test-Path -LiteralPath $basePath -PathType Container)) { throw 'ComfyUI reported an unavailable or relative base directory. No files were changed.' }
        $models = Join-Path $basePath 'models'
    }
    if (-not [IO.Path]::IsPathRooted($models) -or $models.StartsWith('\\')) { throw 'A local absolute ComfyUI model path is required.' }
    return Join-Path $models 'checkpoints'
}
$stats = Invoke-RestMethod -Uri 'http://127.0.0.1:8188/system_stats' -TimeoutSec 10 -MaximumRedirection 0
if (-not $stats.system.argv) { throw 'The running service did not report ComfyUI launch arguments. No files were changed.' }
$destinationDirectory = if ($CheckpointDirectory) { if (-not [IO.Path]::IsPathRooted($CheckpointDirectory) -or $CheckpointDirectory.StartsWith('\\')) { throw 'Checkpoint directory must be a local absolute path.' }; $CheckpointDirectory } else { Get-ComfyCheckpointDirectory @($stats.system.argv) }
$downloadDirectory = Join-Path $env:USERPROFILE 'Downloads'
$candidates = @(Get-ChildItem -LiteralPath $downloadDirectory -File | Where-Object { $_.Name -match '^v1-5-pruned-emaonly(?: \(\d+\))?\.safetensors$' } | Sort-Object LastWriteTime -Descending)
if (Test-Path -LiteralPath 'D:\v1-5-pruned-emaonly.safetensors' -PathType Leaf) { $candidates = @((Get-Item -LiteralPath 'D:\v1-5-pruned-emaonly.safetensors')) + $candidates }
if ($ModelFile) { $candidates = @((Get-Item -LiteralPath $ModelFile)) }
if ($candidates.Count -eq 0) { throw 'The completed v1-5-pruned-emaonly.safetensors file was not found in Downloads. Do not rename a .crdownload or .part file.' }
$source = $candidates[0]
if ($source.Length -lt 1GB) { throw 'The checkpoint is smaller than expected. Let the download finish before retrying.' }
# Reject HTML/error pages and incomplete safetensors headers before copying.
$stream = [IO.File]::OpenRead($source.FullName)
try {
    $lengthBytes = New-Object byte[] 8
    if ($stream.Read($lengthBytes,0,8) -ne 8) { throw 'The checkpoint header is incomplete.' }
    $headerLength = [BitConverter]::ToUInt64($lengthBytes,0)
    if ($headerLength -lt 2 -or $headerLength -gt 8MB -or $headerLength + 8 -ge $source.Length) { throw 'This is not a supported safetensors checkpoint.' }
    $headerBytes = New-Object byte[] ([int]$headerLength)
    $read = 0
    while ($read -lt $headerBytes.Length) {
        $count = $stream.Read($headerBytes,$read,$headerBytes.Length - $read)
        if ($count -eq 0) { throw 'The checkpoint header is incomplete.' }
        $read += $count
    }
    $header = [Text.Encoding]::UTF8.GetString($headerBytes) | ConvertFrom-Json
    if (-not @($header.PSObject.Properties | Where-Object { $_.Name -ne '__metadata__' -and $_.Value.dtype -and $_.Value.data_offsets }).Count) { throw 'No tensor metadata was found in the checkpoint.' }
} finally { $stream.Dispose() }
$destination = Join-Path $destinationDirectory 'v1-5-pruned-emaonly.safetensors'
Write-Host "Downloaded model: $($source.FullName)"
Write-Host "Active ComfyUI checkpoint folder: $destinationDirectory"
Write-Host 'Checking the file and copying it. This can take a few minutes.'
$hash = (Get-FileHash -LiteralPath $source.FullName -Algorithm SHA256).Hash
if (Test-Path -LiteralPath $destination) {
    if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne $hash) { throw 'A different checkpoint already exists at the destination. It was not overwritten.' }
    Write-Host 'The identical checkpoint is already installed.'
} else {
    [void][IO.Directory]::CreateDirectory($destinationDirectory)
    $temporary = Join-Path $destinationDirectory ('tgg-checkpoint-' + [guid]::NewGuid().ToString('N') + '.partial')
    try {
        [IO.File]::Copy($source.FullName,$temporary,$false)
        if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne $hash) { throw 'Copy verification failed. Original download was preserved.' }
        [IO.File]::Move($temporary,$destination)
    } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary } }
    Write-Host 'Checkpoint copied and SHA-256 copy integrity verified. Original download was preserved.'
}
try {
    $info = Invoke-RestMethod -Uri 'http://127.0.0.1:8188/object_info/CheckpointLoaderSimple' -TimeoutSec 10 -MaximumRedirection 0
    $names = @($info.CheckpointLoaderSimple.input.required.ckpt_name[0])
    if ($names -contains 'v1-5-pruned-emaonly.safetensors') { Write-Host 'COMFYUI SEES THE MODEL. In TGG Create, click Check this computer and select the checkpoint.' }
    else { Write-Host 'Copy complete. Restart ComfyUI, then click Check this computer in TGG Create.' }
} catch { Write-Host 'Copy complete. Restart ComfyUI, then click Check this computer in TGG Create.' }
