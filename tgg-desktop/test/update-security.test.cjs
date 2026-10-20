const {test}=require('node:test');const assert=require('node:assert/strict');
const {verifyWindowsSignature}=require('../src/update-security.cjs');
const file='C:\\Users\\TGG\\update.exe';
const run=data=>async(executable,args,options)=>{assert.match(executable,/powershell\.exe$/);assert.equal(options.shell,false);assert.equal(args[2],'-EncodedCommand');return {stdout:JSON.stringify(data),stderr:''};};
test('updates accept only valid signatures for the expected file and publisher',async()=>{
 const data={status:0,publisher:'TGG',path:file};
 assert.equal(await verifyWindowsSignature(['TGG'],file,{platform:'win32',run:run(data)}),null);
 for(const invalid of [{...data,status:1},{...data,publisher:'Someone Else'},{...data,path:'C:\\other.exe'}])assert.notEqual(await verifyWindowsSignature(['TGG'],file,{platform:'win32',run:run(invalid)}),null);
});
test('updates fail closed when PowerShell is unavailable, fails, or produces invalid output',async()=>{
 for(const runner of [async()=>{throw Error('missing PowerShell');},async()=>({stdout:'not JSON',stderr:''}),async()=>({stdout:'{}',stderr:'error'})])assert.notEqual(await verifyWindowsSignature(['TGG'],file,{platform:'win32',run:runner}),null);
 assert.notEqual(await verifyWindowsSignature([],file,{platform:'win32'}),null);
 assert.notEqual(await verifyWindowsSignature(['TGG'],file,{platform:'linux'}),null);
});
