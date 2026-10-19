const {test}=require('node:test');const assert=require('node:assert/strict');const {validateOsPath,launchOs}=require('../src/tgg-os.cjs');
test('OS launch is restricted to a real local executable without arguments',async()=>{
 const file='C:\\Users\\owner\\AppData\\Local\\Programs\\TGG Everything OS\\TGG_EVERYTHING_OS_v1.7.4.exe';
 const files={realpath:async p=>p,stat:async()=>({isFile:()=>true})};const options={platform:'win32',files};
 assert.equal(await validateOsPath('"'+file+'"',options),file);
 let opened;assert.equal(await launchOs(file,{...options,openPath:async p=>{opened=p;return '';}}),true);assert.equal(opened,file);
 for(const bad of ['https://example.com/TGG_EVERYTHING_OS_v1.7.4.exe','\\\\server\\share\\TGG_EVERYTHING_OS_v1.7.4.exe','C:\\Windows\\cmd.exe',file+' --flag',file+':stream','C:\\a\u0000\\TGG_EVERYTHING_OS_v1.7.4.exe'])await assert.rejects(validateOsPath(bad,options));
 await assert.rejects(validateOsPath(file,{...options,files:{realpath:async()=>{throw Error('missing');}}}),/not found/);
 await assert.rejects(validateOsPath(file,{...options,files:{...files,realpath:async()=> 'C:\\Windows\\cmd.exe'}}),/not found/);
 await assert.rejects(validateOsPath(file,{...options,platform:'linux'}),/Windows/);
 await assert.rejects(launchOs(file,{...options,openPath:async()=> 'denied'}),/could not open/);
});
