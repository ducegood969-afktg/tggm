const path=require('node:path');
const fs=require('node:fs/promises');
async function validateOsPath(value,{platform=process.platform,files=fs}={}){
 if(platform!=='win32')throw Error('TGG OS launching is available on Windows.');
 if(typeof value!=='string'||value.length>4096)throw Error('Enter the TGG OS executable path.');
 let file=value.trim();if(file.startsWith('"')&&file.endsWith('"'))file=file.slice(1,-1);
 if(!/^[a-z]:[\\/]/i.test(file)||/[\x00-\x1f"<>|?*]/.test(file)||file.slice(2).includes(':'))throw Error('Use a local Windows executable path without arguments.');
 file=path.win32.normalize(file);
 if(!/^tgg_everything_os_v\d+(?:\.\d+){1,3}\.exe$/i.test(path.win32.basename(file)))throw Error('Select the versioned TGG_EVERYTHING_OS executable.');
 try{
  const resolved=await files.realpath(file);
  if(!/^[a-z]:[\\/]/i.test(resolved)||!/^tgg_everything_os_v\d+(?:\.\d+){1,3}\.exe$/i.test(path.win32.basename(resolved))||!(await files.stat(resolved)).isFile())throw Error('Invalid executable');
  return resolved;
 }catch{throw Error('TGG OS executable was not found. Check its shortcut Target.');}
}
async function launchOs(file,{openPath,...options}){
 const resolved=await validateOsPath(file,options);
 const error=await openPath(resolved);if(error)throw Error('Windows could not open TGG OS. Check its installation.');return true;
}
module.exports={validateOsPath,launchOs};
