const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const path=require('node:path');
async function verifyWindowsSignature(publishers,file,{run=promisify(execFile),platform=process.platform}={}) {
 if(platform!=='win32')return 'Windows signature verification is unavailable.';
 if(!Array.isArray(publishers)||!publishers.length||publishers.some(name=>typeof name!=='string'||!name))return 'No trusted publisher is configured.';
 const escaped=String(file).replace(/'/g,"''");
 const script=`$ErrorActionPreference='Stop'; $s=Get-AuthenticodeSignature -LiteralPath '${escaped}'; if($null -eq $s.SignerCertificate){throw 'Missing signer'}; [PSCustomObject]@{status=[int]$s.Status;publisher=$s.SignerCertificate.GetNameInfo([System.Security.Cryptography.X509Certificates.X509NameType]::SimpleName,$false);path=$s.Path}|ConvertTo-Json -Compress`;
 try {
  const executable=path.win32.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  const result=await run(executable,['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{timeout:20000,windowsHide:true,maxBuffer:1024*1024,encoding:'utf8',shell:false});
  if(result.stderr?.trim())return 'Windows signature verification reported an error.';
  const data=JSON.parse(result.stdout.trim().replace(/^\uFEFF/,''));
  if(data.status!==0)return 'Update has an invalid or untrusted Windows signature.';
  if(typeof data.path!=='string'||path.win32.resolve(data.path).toLowerCase()!==path.win32.resolve(file).toLowerCase())return 'Windows verified a different update file.';
  if(!publishers.includes(data.publisher))return 'Update publisher does not match the trusted publisher.';
  return null;
 } catch { return 'Windows signature verification could not complete. Update rejected.'; }
}
module.exports={verifyWindowsSignature};
