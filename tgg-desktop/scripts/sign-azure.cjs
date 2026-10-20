const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const path=require('node:path');
const {verifyWindowsSignature}=require('../src/update-security.cjs');
module.exports=async function sign({path:file}) {
 if(process.platform!=='win32')throw Error('Production cloud signing requires the Windows runner.');
 const publisher=process.env.TGG_WINDOWS_PUBLISHER;if(!publisher)throw Error('Publisher is required.');
 await promisify(execFile)('pwsh.exe',['-NoProfile','-NonInteractive','-File',path.join(__dirname,'sign-azure.ps1'),'-FilePath',file],{timeout:300000,windowsHide:true,maxBuffer:2*1024*1024,shell:false});
 const error=await verifyWindowsSignature([publisher],file);if(error)throw Error(error);
};
