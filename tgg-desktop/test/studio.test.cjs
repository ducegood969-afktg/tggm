const {test}=require('node:test');const assert=require('node:assert/strict');const {validateStudioPath,launchStudio}=require('../src/studio.cjs');
test('Studio launch is restricted to a real local executable without arguments',async()=>{
 const file='C:\\Users\\owner\\AppData\\Local\\Programs\\TGG Studio\\TGG_Studio.exe';
 const files={realpath:async p=>p,stat:async()=>({isFile:()=>true})};const options={platform:'win32',files};
 assert.equal(await validateStudioPath('"'+file+'"',options),file);
 let opened;assert.equal(await launchStudio(file,{...options,openPath:async p=>{opened=p;return '';}}),true);assert.equal(opened,file);
 for(const bad of ['https://example.com/TGG_Studio.exe','\\\\server\\share\\TGG_Studio.exe','C:\\Windows\\cmd.exe',file+' --flag',file+':stream','C:\\a\u0000\\TGG_Studio.exe'])await assert.rejects(validateStudioPath(bad,options));
 await assert.rejects(validateStudioPath(file,{...options,files:{realpath:async()=>{throw Error('missing');}}}),/not found/);
 await assert.rejects(validateStudioPath(file,{...options,files:{...files,realpath:async()=> 'C:\\Windows\\cmd.exe'}}),/not found/);
 await assert.rejects(validateStudioPath(file,{...options,platform:'linux'}),/Windows/);
 await assert.rejects(launchStudio(file,{...options,openPath:async()=> 'denied'}),/could not open/);
});
