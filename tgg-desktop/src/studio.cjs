const path=require('node:path');
const fs=require('node:fs/promises');
async function validateStudioPath(value,{platform=process.platform,files=fs}={}){
 if(platform!=='win32')throw Error('TGG Studio launching is available on Windows.');
 if(typeof value!=='string'||value.length>4096)throw Error('Enter the TGG Studio executable path.');
 let file=value.trim();if(file.startsWith('"')&&file.endsWith('"'))file=file.slice(1,-1);
 if(!/^[a-z]:[\\/]/i.test(file)||/[\x00-\x1f"<>|?*]/.test(file)||file.slice(2).includes(':'))throw Error('Use a local Windows executable path without arguments.');
 file=path.win32.normalize(file);
 if(path.win32.basename(file).toLowerCase()!=='tgg_studio.exe')throw Error('Select TGG_Studio.exe.');
 try{
  const resolved=await files.realpath(file);
  if(!/^[a-z]:[\\/]/i.test(resolved)||path.win32.basename(resolved).toLowerCase()!=='tgg_studio.exe'||!(await files.stat(resolved)).isFile())throw Error('Invalid executable');
  return resolved;
 }catch{throw Error('TGG Studio executable was not found. Check its shortcut Target.');}
}
async function launchStudio(file,{openPath,...options}){
 const resolved=await validateStudioPath(file,options);
 const error=await openPath(resolved);if(error)throw Error('Windows could not open TGG Studio. Check its installation.');return true;
}
module.exports={validateStudioPath,launchStudio};
