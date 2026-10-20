$ErrorActionPreference='Stop'
$ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot '..\Install-TGG-Checkpoint.ps1'),[ref]$null,[ref]$null)
$functions=$ast.FindAll({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst]},$false)
foreach($function in $functions){Invoke-Expression $function.Extent.Text}
$root=Join-Path ([IO.Path]::GetTempPath()) ('tgg-model-path-'+[guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($root)
try{
 $expected=Join-Path $root 'models/checkpoints'
 if((Get-ComfyCheckpointDirectory @('main.py','--base-directory',$root)) -ne $expected){throw 'Base path failed'}
 if((Get-ComfyCheckpointDirectory @('main.py',('--base-directory='+$root))) -ne $expected){throw 'Equals path failed'}
 $custom=Join-Path $root 'custom-models'
 if((Get-ComfyCheckpointDirectory @('main.py','--base-directory',$root,'--models-directory',$custom)) -ne (Join-Path $custom 'checkpoints')){throw 'Override failed'}
 [IO.File]::WriteAllText((Join-Path $root 'folder_paths.py'),'# fixture')
 if((Get-ComfyCheckpointDirectory @((Join-Path $root 'main.py'))) -ne $expected){throw 'Script path failed'}
 foreach($arguments in @(@('main.py'),@('main.py','--base-directory','relative'),@('main.py','--base-directory'))){$rejected=$false;try{Get-ComfyCheckpointDirectory $arguments | Out-Null}catch{$rejected=$true};if(-not $rejected){throw 'Unsafe path accepted'}}
 'PASS: base directory, equals syntax, models override, script path, and three failure cases.'
}finally{Remove-Item -LiteralPath $root -Recurse -Force}
