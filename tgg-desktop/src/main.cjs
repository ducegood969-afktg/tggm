const {app, BrowserWindow, ipcMain, safeStorage, shell, session, utilityProcess, dialog, WebContentsView} = require('electron');
const {autoUpdater} = require('electron-updater');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {hashPassword, verifyPassword, validateSettings} = require('./security.cjs');
const {verifyWindowsSignature} = require('./update-security.cjs');
const {listLocalModels,proposeEdit}=require('./local-coder.cjs');
const {Workspace}=require('./workspace.cjs');
const workspace=new Workspace();
const {ProjectLibrary}=require('./project-library.cjs');
function library(){secureStorage();return new ProjectLibrary(record.library?JSON.parse(safeStorage.decryptString(Buffer.from(record.library,'base64'))):[]);}
function persistLibrary(value){secureStorage();save({...record,library:safeStorage.encryptString(JSON.stringify(value.entries)).toString('base64')});}
function rememberProject(folder,name){const value=library();value.remember(folder,name);persistLibrary(value);}
const {diagnostics,serviceAvailability}=require('./remote-tools.cjs');
const {supportBundle}=require('./remote-support.cjs');
const {reviewProject,saveProject}=require('./project-snapshot.cjs');
const {validateOsPath,launchOs}=require('./tgg-os.cjs');
const defaultOsPath=()=>path.join(require('node:os').homedir(),'AppData','Local','TGG Everything OS','TGG_EVERYTHING_OS_v1.7.4.exe');
function osPath(){secureStorage();return record.os?safeStorage.decryptString(Buffer.from(record.os,'base64')):defaultOsPath();}
const {validateStudioPath,launchStudio}=require('./studio.cjs');
const {validateTurns}=require('./conversation.cjs');
function savedChats(){secureStorage();return record.chats?JSON.parse(safeStorage.decryptString(Buffer.from(record.chats,'base64'))):[];}
function storeChats(chats){secureStorage();save({...record,chats:safeStorage.encryptString(JSON.stringify(chats)).toString('base64')});}
const {OwnerStore,envelope}=require('./owner-store.cjs');
const {ActivityLog}=require('./activity-log.cjs');
const {EditJournal}=require('./edit-journal.cjs');
const {runAgent}=require('./local-agent.cjs');
const {CheckRunner}=require('./check-runner.cjs');
const {preparedInstaller}=require('./prepared-installer.cjs');
const downloads=()=>path.join(require('node:os').homedir(),'Downloads');
const {verifyBundle}=require('./bundle-recovery.cjs');
const {complete} = require('./provider.cjs');
const {SourceService} = require('./source-service.cjs');
const sourceService=new SourceService({app,utilityProcess});
let stateStore,bootState={blocked:false},activityLog,editJournal,pendingAgent=null,pendingBundle=null,activeController=null,workspaceOpening=false;
const primaryInstance=!app.requestSingleInstanceLock||app.requestSingleInstanceLock();if(!primaryInstance)app.quit();
const recentActivity=[];
function activity(event){const value={time:new Date().toISOString(),type:event.type,detail:event.detail};recentActivity.push(value);if(recentActivity.length>80)recentActivity.shift();try{activityLog?.append(event);}catch{recentActivity.push({time:new Date().toISOString(),type:'log-error',detail:'Activity could not be saved to disk.'});}}
const checkRunner=new CheckRunner({workspace,activity});
function stopWork(){activeController?.abort();checkRunner.stop();}
function idle(){if(busy||checkRunner.running||workspace.saving||snapshotBusy||selectingProject||workspaceOpening)throw Error('Wait for the active operation, or use Stop.');}
async function generation(fn){if(busy||checkRunner.running)throw Error('A task is already running.');const controller=new AbortController();activeController=controller;busy=true;try{return await fn(controller.signal);}catch(error){if(controller.signal.aborted)throw Error('Work stopped. Completed saves are kept; pending proposals were not applied.');throw error;}finally{if(activeController===controller)activeController=null;busy=false;}}
function validateOwner(value){envelope(value);for(const field of ['settings','studio','os','projects','library','chats']){if(value[field]===undefined)continue;secureStorage();const plain=safeStorage.decryptString(Buffer.from(value[field],'base64'));if(['studio','os'].includes(field))continue;const data=JSON.parse(plain);if(field==='settings')validateSettings(data);if(['library','chats'].includes(field)&&!Array.isArray(data))throw Error('Saved library is invalid.');if(field==='chats')for(const chat of data)validateTurns(chat.turns);if(field==='projects'&&(!data||typeof data!=='object'||Array.isArray(data)))throw Error('Project links are invalid.');}return value;}
let browserWindow;
let sourceWindow,projectReview=null,selectingProject=false,snapshotBusy=false;
let win, record = {}, unlockedUntil = 0, attempts = 0, retryAt = 0, busy = false;
const smokeHidden=process.argv.includes('--tgg-smoke-hidden');
const page = pathToFileURL(path.join(__dirname, 'index.html')).href;
const file = () => path.join(app.getPath('userData'), 'owner.json');
function save(next) {stateStore.save(next);record=next;bootState.blocked=false;}
function owner() { if (Date.now() >= unlockedUntil) throw Error('Unlock owner settings first.'); }
function secureStorage() {
  if (!safeStorage.isEncryptionAvailable() || (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')) throw Error('OS credential encryption is unavailable.');
}
function settings() { secureStorage(); if (!record.settings) throw Error('Owner must configure an AI provider first.'); return JSON.parse(safeStorage.decryptString(Buffer.from(record.settings, 'base64'))); }
function handle(name, fn) {
  ipcMain.handle(name, async (event, arg) => {
    if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame || event.senderFrame.url !== page) throw Error('Untrusted caller');
    try { return {ok:true, data:await fn(arg)}; } catch (e) { return {ok:false,error:e.message}; }
  });
}
app.whenReady().then(() => {
  if(!primaryInstance)return;
  stateStore=new OwnerStore(file(),{validate:validateOwner});bootState=stateStore.load();record=bootState.record;
  const encryption={encrypt:text=>{secureStorage();return safeStorage.encryptString(text).toString('base64');},decrypt:text=>{secureStorage();return safeStorage.decryptString(Buffer.from(text,'base64'));}};
  activityLog=new ActivityLog(path.join(app.getPath('userData'),'activity.jsonl'),encryption);editJournal=new EditJournal(path.join(app.getPath('userData'),'edit-recovery'),encryption);
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,cb) => cb(false));
  win = new BrowserWindow({show:!smokeHidden,width:1160,height:820,minWidth:760,minHeight:600,backgroundColor:'#0b1020',webPreferences:{offscreen:smokeHidden,backgroundThrottling:!smokeHidden,preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
  win.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.on('blur', () => {if(!selectingProject){unlockedUntil=0;if(checkRunner.running)checkRunner.stop();}});
  handle('status', () => {const config=record.settings?settings():null;return {recoveryMessage:bootState.message||'',recoveryBlocked:bootState.blocked,initialized:!!record.password,configured:!!record.settings,unlocked:Date.now()<unlockedUntil,version:app.getVersion(),provider:config?.provider||(config?'openai':'ollama'),model:config?.model,osPath:osPath(),studioPath:record.studio?safeStorage.decryptString(Buffer.from(record.studio,'base64')):path.join(require('node:os').homedir(),'AppData','Local','Programs','TGG Studio','TGG_Studio.exe')};});
  handle('unlock', ({password}) => {
    if(bootState.blocked)throw Error(bootState.message);
    if (Date.now()<retryAt) throw Error('Too many attempts. Wait one minute.');
    if (!record.password) {secureStorage(); save({...record,password:hashPassword(password)});}
    else if (!verifyPassword(password,record.password)) {attempts++; if(attempts>=5){retryAt=Date.now()+60000;attempts=0;} throw Error('Incorrect password.');}
    attempts=0; unlockedUntil=Date.now()+300000; return true;
  });
  handle('lock', () => {stopWork();unlockedUntil=0; return true;});
  handle('configure', input => {owner(); secureStorage(); const config=validateSettings(input); save({...record,settings:safeStorage.encryptString(JSON.stringify(config)).toString('base64')});return true;});
  handle('studio-configure',async value=>{owner();secureStorage();const executable=await validateStudioPath(value);owner();save({...record,studio:safeStorage.encryptString(executable).toString('base64')});return true;});
  handle('os-configure',async value=>{owner();secureStorage();const executable=await validateOsPath(value);owner();save({...record,os:safeStorage.encryptString(executable).toString('base64')});return true;});
  handle('local-models',()=>listLocalModels());
  handle('workspace-propose',async input=>{
    owner();if(!input||busy)throw Error('Wait for the current AI request to finish.');
    const current=await workspace.read(input.path);if(current.hash!==input.expectedHash)throw Error('This file changed on disk. Reopen it before requesting an edit.');
    const config=settings();return generation(async signal=>({path:input.path,content:await proposeEdit(config,{path:input.path,content:input.content,instructions:input.instructions},{signal})}));
  });
  handle('workspace-open',async()=>{
    owner();idle();pendingAgent=null;
    let selected;selectingProject=true;try{selected=await dialog.showOpenDialog(win,{title:'Open a folder in Studio workspace',properties:['openDirectory']});}finally{selectingProject=false;}
    if(selected.canceled)return {cancelled:true};owner();workspaceOpening=true;try{const result=await workspace.open(selected.filePaths[0]);rememberProject(result.folder);return result;}finally{workspaceOpening=false;}
  });
  handle('workspace-read',async name=>{owner();const result=await workspace.read(name);rememberProject(workspace.root,name);return result;});
  handle('library-list',()=>{owner();return library().entries;});
  handle('library-forget',id=>{owner();const value=library();value.forget(id);persistLibrary(value);return true;});
  handle('library-open',async id=>{owner();idle();pendingAgent=null;const entry=library().get(id);workspaceOpening=true;try{const result=await workspace.open(entry.folder);owner();rememberProject(result.folder);return result;}finally{workspaceOpening=false;}});
  handle('workspace-save',input=>{owner();idle();return generation(()=>editJournal.apply(workspace,input));});
  handle('remote-diagnostics',async()=>{
    owner();return diagnostics({checkOptional:true,version:app.getVersion(),source:()=>sourceService.api('/v1/repos'),everythingOs:()=>validateOsPath(osPath()),studio:record.studio?()=>{secureStorage();return validateStudioPath(safeStorage.decryptString(Buffer.from(record.studio,'base64')));}:null});
  });
  handle('remote-screenshot',async()=>{
    owner();if(selectingProject)throw Error('Close the active file dialog first.');
    let selected;selectingProject=true;try{selected=await dialog.showSaveDialog(win,{title:'Save a screenshot of this TGG AI Ultra window',defaultPath:'TGG-Remote-app.png',filters:[{name:'PNG image',extensions:['png']}]});}finally{selectingProject=false;}
    if(selected.canceled)return {cancelled:true};owner();const image=await win.webContents.capturePage();owner();fs.writeFileSync(selected.filePath,image.toPNG(),{mode:0o600});return {saved:true};
  });
  handle('project-review',async mode=>{
    owner();if(snapshotBusy||selectingProject)throw Error('A project operation is already running.');projectReview=null;
    let selected;if(mode==='workspace'){if(!workspace.root)throw Error('Open a Studio workspace folder first.');selected={canceled:false,filePaths:[workspace.root]};}else{selectingProject=true;try{selected=await dialog.showOpenDialog(win,{title:'Choose the Studio project folder to review',properties:['openDirectory']});}finally{selectingProject=false;}}
    if(selected.canceled)return {cancelled:true};owner();snapshotBusy=true;
    try{const snapshot=await reviewProject(selected.filePaths[0]);owner();const id=require('node:crypto').randomUUID();projectReview={id,snapshot,expires:Date.now()+300000};return {id,folder:snapshot.root,files:snapshot.files.map(f=>f.path),skipped:snapshot.skipped,bytes:snapshot.bytes};}finally{snapshotBusy=false;}
  });
  handle('remote-export',async id=>{
    owner();if(snapshotBusy||selectingProject)throw Error('A project operation is already running.');
    const pending=projectReview;if(!pending||pending.id!==id||pending.expires<Date.now())throw Error('Review the project again before exporting.');
    let selected;selectingProject=true;try{selected=await dialog.showSaveDialog(win,{title:'Save reviewed TGG Remote support bundle',defaultPath:'TGG-Remote-support.json',filters:[{name:'TGG Remote JSON',extensions:['json']}]});}finally{selectingProject=false;}
    if(selected.canceled)return {cancelled:true};owner();
    const bundle=supportBundle(pending.snapshot,{version:app.getVersion(),platform:process.platform,arch:process.arch});
    fs.writeFileSync(selected.filePath,JSON.stringify(bundle,null,2),{mode:0o600});return {saved:true};
  });
  handle('project-save',async id=>{
    owner();if(snapshotBusy||selectingProject)throw Error('A project operation is already running.');
    const pending=projectReview;if(!pending||pending.id!==id||pending.expires<Date.now())throw Error('Review the project again before saving.');
    snapshotBusy=true;
    try{secureStorage();const links=record.projects?JSON.parse(safeStorage.decryptString(Buffer.from(record.projects,'base64'))):{};
      const result=await saveProject(pending.snapshot,{api:(route,options)=>sourceService.api(route,options),link:links[pending.snapshot.root]});
      links[pending.snapshot.root]={repo:result.repo};save({...record,projects:safeStorage.encryptString(JSON.stringify(links)).toString('base64')});projectReview=null;return result;
    }finally{snapshotBusy=false;}
  });
  handle('conversation',async turns=>{if(busy)throw Error('A request is already running.');const messages=validateTurns(turns);if(!messages.length||messages.length%2!==1)throw Error('Enter a message first.');const config=settings();return generation(signal=>complete(config,messages.at(-1).content,{history:messages.slice(0,-1),signal}));});
  handle('chats-list',()=>{owner();return savedChats().map(({id,title})=>({id,title}));});
  handle('chats-load',id=>{owner();const chat=savedChats().find(item=>item.id===id);if(!chat)throw Error('Saved chat was not found.');return chat;});
  handle('chats-save',input=>{owner();const turns=validateTurns(input?.turns);if(!turns.length)throw Error('Send a message before saving.');const chats=savedChats();const previous=input.id&&chats.find(item=>item.id===input.id);const chat={id:previous?.id||require('node:crypto').randomUUID(),title:turns[0].content.slice(0,70),turns};storeChats([chat,...chats.filter(item=>item.id!==chat.id)].slice(0,10));return {id:chat.id};});
  handle('chats-delete',id=>{owner();storeChats(savedChats().filter(item=>item.id!==id));return true;});
  handle('chat', async text => {
    if(typeof text!=='string'||!text.trim()||text.length>20000) throw Error('Enter a message of at most 20,000 characters.');
    if(busy) throw Error('A request is already running.');
    const config=settings();return generation(signal=>complete(config,text,{signal}));
  });
  handle('stop-work',()=>{stopWork();pendingAgent=null;activity({type:'stop',detail:'Owner requested Stop'});return true;});
  handle('agent-status',()=>{owner();return {running:busy||checkRunner.running,root:workspace.root,activity:recentActivity.length?recentActivity:activityLog.list(),check:{running:checkRunner.running,output:checkRunner.output,result:checkRunner.result}};});
  handle('agent-run',async task=>{owner();idle();pendingAgent=null;activity({type:'agent-start',detail:'Local project task'});try{const result=await generation(signal=>runAgent({workspace,config:settings(),task,signal,authorize:owner,activity}));owner();pendingAgent={...result,id:require('node:crypto').randomUUID(),expires:Date.now()+300000};return pendingAgent;}catch(error){activity({type:'agent-failed',detail:activeController?.signal.aborted?'Stopped':'Task ended without applying proposals'});throw error;}});
  handle('agent-apply',async input=>{owner();idle();const pending=pendingAgent;if(!pending||pending.id!==input?.id||pending.expires<Date.now()||pending.root!==workspace.root)throw Error('Generate and review a fresh proposal.');const item=pending.changes.find(change=>change.path===input.path);if(!item)throw Error('This file has no pending proposal.');return generation(async()=>{const result=await editJournal.apply(workspace,{path:item.path,content:item.content,expectedHash:item.expectedHash});pending.changes=pending.changes.filter(change=>change!==item);projectReview=null;activity({type:'edit-applied',detail:item.path});return result;});});
  handle('agent-reject',()=>{pendingAgent=null;activity({type:'edit-rejected',detail:'Pending changes discarded'});return true;});
  handle('check-plan',async action=>{owner();idle();return checkRunner.prepare(action);});
  handle('check-run',async id=>{owner();idle();return generation(signal=>checkRunner.run(id,{authorize:owner,signal}));});
  handle('installer-info',()=>{owner();return preparedInstaller(downloads());});
  handle('installer-open',async()=>{owner();idle();if(process.platform!=='win32')throw Error('Installers can only be launched on Windows.');const info=await preparedInstaller(downloads());owner();if(!info.ready)throw Error(info.message);const error=await shell.openPath(info.installer);if(error)throw Error('Windows could not open the installer.');return {opened:true};});
  handle('recovery-status',()=>({blocked:bootState.blocked,recovered:!!bootState.recovered,message:bootState.message||'Owner data loaded successfully.',previousCopy:fs.existsSync(file()+'.previous'),assets:['index.html','preload.cjs','workspace.cjs','local-agent.cjs','provider.cjs'].map(name=>({name,present:fs.existsSync(path.join(__dirname,name))})),automaticInstallationRollback:false}));
  handle('recovery-edits',()=>{owner();return editJournal.list();});
  handle('recovery-undo',async id=>{owner();idle();return generation(async()=>{const result=await editJournal.undo(workspace,id);projectReview=null;activity({type:'edit-recovered',detail:result.path});return result;});});
  handle('recovery-export',async()=>{owner();idle();let selected;selectingProject=true;try{selected=await dialog.showSaveDialog(win,{title:'Export encrypted TGG owner data',defaultPath:'TGG-owner-backup.json',filters:[{name:'Encrypted owner backup',extensions:['json']}]});}finally{selectingProject=false;}if(selected.canceled)return {cancelled:true};owner();fs.writeFileSync(selected.filePath,JSON.stringify({format:'tgg-owner-backup-v1',createdAt:new Date().toISOString(),record}),{mode:0o600});return {saved:true};});
  handle('recovery-restore',async password=>{idle();if(Date.now()<retryAt)throw Error('Too many attempts. Wait one minute.');let selected;selectingProject=true;try{selected=await dialog.showOpenDialog(win,{title:'Restore encrypted owner data from this Windows account',properties:['openFile'],filters:[{name:'Encrypted owner backup',extensions:['json']}]});}finally{selectingProject=false;}if(selected.canceled)return {cancelled:true};const info=fs.lstatSync(selected.filePaths[0]);if(!info.isFile()||info.isSymbolicLink()||info.size>8*1024*1024)throw Error('Unsupported owner backup.');const backup=JSON.parse(fs.readFileSync(selected.filePaths[0],'utf8'));if(backup.format!=='tgg-owner-backup-v1')throw Error('Unsupported owner backup.');validateOwner(backup.record);if(!backup.record.password||!verifyPassword(password,backup.record.password)){if(++attempts>=5){retryAt=Date.now()+60000;attempts=0;}throw Error('Enter the owner password used by this backup.');}save(backup.record);attempts=0;unlockedUntil=0;pendingAgent=null;projectReview=null;bootState={record,recovered:false,blocked:false,message:'Owner backup restored. Unlock with its owner password.'};return {restored:true};});
  handle('bundle-review',async()=>{owner();idle();pendingBundle=null;let selected;selectingProject=true;try{selected=await dialog.showOpenDialog(win,{title:'Verify a TGG Git bundle',properties:['openFile'],filters:[{name:'Git bundle',extensions:['bundle']}]});}finally{selectingProject=false;}if(selected.canceled)return {cancelled:true};owner();const id='recovery-'+require('node:crypto').randomUUID();const exportsDir=path.join(app.getPath('userData'),'source-store','exports');fs.mkdirSync(exportsDir,{recursive:true});const copy=path.join(exportsDir,id+'.bundle');const info=fs.lstatSync(selected.filePaths[0]);if(!info.isFile()||info.isSymbolicLink()||info.size>64*1024*1024)throw Error('Choose a bundle up to 64 MiB.');fs.copyFileSync(selected.filePaths[0],copy,fs.constants.COPYFILE_EXCL);try{const git=process.platform==='win32'?path.join(app.isPackaged?path.join(process.resourcesPath,'mingit'):path.resolve(__dirname,'../vendor/mingit'),'cmd/git.exe'):'git';const report=await verifyBundle(copy,{git});owner();pendingBundle={id,file:copy,report,expires:Date.now()+300000,name:'recovered-'+require('node:crypto').randomUUID()};return {id,...report,name:pendingBundle.name};}catch(error){fs.rmSync(copy,{force:true});throw error;}});
  handle('bundle-restore',async id=>{owner();idle();const pending=pendingBundle;if(!pending||pending.id!==id||pending.expires<Date.now())throw Error('Verify the bundle again.');const actual=require('node:crypto').createHash('sha256').update(fs.readFileSync(pending.file)).digest('hex');if(actual!==pending.report.sha256)throw Error('The verified bundle changed.');const result=await sourceService.api('/v1/restore',{method:'POST',body:{bundle_id:pending.id,name:pending.name}});pendingBundle=null;activity({type:'bundle-restored',detail:pending.name});return result.restored;});
  const services={projects:'http://127.0.0.1:10020',creative:'http://127.0.0.1:10040'};
  handle('service', async name => {
    if(name==='os')return launchOs(osPath(),{openPath:file=>shell.openPath(file)});
    if(name==='browser'){if(!browserWindow||browserWindow.isDestroyed())browserWindow=require('./browser.cjs').createBrowser({BrowserWindow,WebContentsView,session,ipcMain});if(!smokeHidden){browserWindow.show();browserWindow.focus();}return true;}
    if(name==='studio'){if(!record.studio)throw Error('Unlock Owner settings and save the TGG Studio path first.');secureStorage();return launchStudio(safeStorage.decryptString(Buffer.from(record.studio,'base64')),{openPath:file=>shell.openPath(file)});}
    if(name==='source'){
      const url=await sourceService.start();
      const sourceSession=session.fromPartition('tgg-source');
      sourceSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
      await sourceSession.cookies.set({url,name:'tgg_source_session',value:sourceService.token,httpOnly:true,sameSite:'strict',path:'/'});
      if(!sourceWindow||sourceWindow.isDestroyed()){
        sourceWindow=new BrowserWindow({show:!smokeHidden,width:1250,height:900,title:'TGG Source',webPreferences:{offscreen:smokeHidden,backgroundThrottling:!smokeHidden,partition:'tgg-source',nodeIntegration:false,contextIsolation:true,sandbox:true}});
        sourceWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
        sourceWindow.webContents.on('will-navigate',(event,target)=>{if(new URL(target).origin!==new URL(sourceService.url||url).origin)event.preventDefault();});
      }
      await sourceWindow.loadURL(url);if(!smokeHidden){sourceWindow.show();sourceWindow.focus();}
      return true;
    }
    if(!services[name])throw Error('Unknown service');
    if(!(await serviceAvailability(name)).available)throw Error('This optional '+name+' backend is not running. Start its separate service before opening it.');
    return shell.openExternal(services[name]);
  });
  if(process.platform==='win32')autoUpdater.verifyUpdateCodeSignature=verifyWindowsSignature;
  autoUpdater.autoDownload=true; autoUpdater.autoInstallOnAppQuit=true;
  // No update checks unless the packaged build pins an Authenticode publisher.
  let trusted=false;
  if(app.isPackaged){
    const yaml=require('fs').readFileSync(path.join(process.resourcesPath,'app-update.yml'),'utf8');
    trusted=/^publisherName:\s*\S/m.test(yaml)||/^publisherName:\s*\n\s+-\s*\S/m.test(yaml);
  }
  const notify = message => {if(!win.isDestroyed()) win.webContents.send('update-status',message);};
  autoUpdater.on('error',()=>notify('Update check failed. The installed version remains available.'));
  autoUpdater.on('update-available',()=>notify('Downloading a signed update…'));
  autoUpdater.on('update-not-available',()=>notify('You have the latest release.'));
  autoUpdater.on('update-downloaded',()=>notify('Verified update ready. It will install when you quit.'));
  handle('updates',async()=>{if(!trusted)return {manual:true,message:'Use the quiet updater to build this unsigned preview, then check the prepared installer in Recovery. Automatic installation remains disabled.'};await autoUpdater.checkForUpdates();return true;});
  win.loadFile(path.join(__dirname,'index.html'));
  if(trusted){autoUpdater.checkForUpdates().catch(()=>{});setInterval(()=>autoUpdater.checkForUpdates().catch(()=>{}),4*60*60*1000).unref();}
});
app.on('window-all-closed',()=>app.quit());
app.on('second-instance',()=>{if(win&&!win.isDestroyed()){if(win.isMinimized?.())win.restore();win.show?.();win.focus?.();}});
app.on('before-quit',()=>{stopWork();sourceService.stop();});
