const {test}=require('node:test');const assert=require('node:assert/strict');const Module=require('node:module');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {pathToFileURL}=require('node:url');
test('desktop owner, IPC boundary, encrypted settings, provider request and fail-closed updates',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tgg-test-'));const handlers={};let window;
 const frame={url:pathToFileURL(path.resolve(__dirname,'../src/index.html')).href};
 class Window {constructor(){window=this;this.webContents={mainFrame:frame,setWindowOpenHandler(){},on(){},send(){}};}on(){}loadFile(){}isDestroyed(){return false;}}
 const electron={app:{whenReady:()=>Promise.resolve(),getPath:()=>root,getVersion:()=> '0.1.0',isPackaged:false,on(){}},BrowserWindow:Window,ipcMain:{handle:(name,fn)=>handlers[name]=fn},safeStorage:{isEncryptionAvailable:()=>true,getSelectedStorageBackend:()=> 'gnome_libsecret',encryptString:s=>Buffer.from('encrypted:'+s),decryptString:b=>b.toString().slice(10)},session:{defaultSession:{setPermissionRequestHandler(){}}},shell:{openExternal:async()=>{}}};
 const original=Module._load;const oldFetch=global.fetch;
 Module._load=function(name,...args){if(name==='electron')return electron;if(name==='electron-updater')return {autoUpdater:{on(){}}};return original.call(this,name,...args);};
 try{
 require('../src/main.cjs');await new Promise(resolve=>setImmediate(resolve));
 const invoke=(name,arg,event={sender:window.webContents,senderFrame:frame})=>handlers[name](event,arg);
 assert.equal((await invoke('configure',{apiKey:'test',model:'gpt-4.1-mini'})).ok,false);
 assert.match((await invoke('studio-configure','C:\\TGG Studio\\TGG_Studio.exe')).error,/Unlock/);
 assert.equal((await invoke('unlock',{password:'a secure owner password'})).ok,true);
 assert.equal((await invoke('configure',{apiKey:'test',model:'gpt-4.1-mini'})).ok,true);
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'owner.json'))).settings.includes('test'),false);
 await assert.rejects(()=>invoke('status',null,{sender:{},senderFrame:frame}),/Untrusted/);
 global.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer test');assert.equal(JSON.parse(options.body).messages[0].content,'Hello');return {ok:true,json:async()=>({choices:[{message:{content:'Hello from provider'}}]})};};
 assert.deepEqual(await invoke('chat','Hello'),{ok:true,data:'Hello from provider'});
 assert.equal((await invoke('updates')).ok,false);
 await invoke('lock');assert.equal((await invoke('configure',{apiKey:'changed',model:'gpt-4.1-mini'})).ok,false);
 for(let i=0;i<5;i++)assert.equal((await invoke('unlock',{password:'wrong'})).ok,false);
 assert.match((await invoke('unlock',{password:'a secure owner password'})).error,/Wait/);
 }finally{Module._load=original;global.fetch=oldFetch;fs.rmSync(root,{recursive:true,force:true});}
});
