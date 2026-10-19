const {app, BrowserWindow, ipcMain, safeStorage, shell, session, utilityProcess} = require('electron');
const {autoUpdater} = require('electron-updater');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {hashPassword, verifyPassword, validateSettings} = require('./security.cjs');
const {verifyWindowsSignature} = require('./update-security.cjs');
const {validateStudioPath,launchStudio}=require('./studio.cjs');
const {complete} = require('./provider.cjs');
const {SourceService} = require('./source-service.cjs');
const sourceService=new SourceService({app,utilityProcess});
let sourceWindow;
let win, record = {}, unlockedUntil = 0, attempts = 0, retryAt = 0, busy = false;
const page = pathToFileURL(path.join(__dirname, 'index.html')).href;
const file = () => path.join(app.getPath('userData'), 'owner.json');
function save(next) {
  fs.mkdirSync(path.dirname(file()), {recursive:true});
  fs.writeFileSync(file()+'.tmp', JSON.stringify(next), {mode:0o600});
  fs.renameSync(file()+'.tmp', file()); record = next;
}
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
  if (fs.existsSync(file())) record = JSON.parse(fs.readFileSync(file(), 'utf8'));
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,cb) => cb(false));
  win = new BrowserWindow({width:1160,height:820,minWidth:760,minHeight:600,backgroundColor:'#0b1020',webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
  win.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.on('blur', () => {unlockedUntil = 0;});
  handle('status', () => {const config=record.settings?settings():null;return {initialized:!!record.password,configured:!!record.settings,unlocked:Date.now()<unlockedUntil,version:app.getVersion(),provider:config?.provider||'openai',model:config?.model,studioPath:record.studio?safeStorage.decryptString(Buffer.from(record.studio,'base64')):path.join(require('node:os').homedir(),'AppData','Local','Programs','TGG Studio','TGG_Studio.exe')};});
  handle('unlock', ({password}) => {
    if (Date.now()<retryAt) throw Error('Too many attempts. Wait one minute.');
    if (!record.password) {secureStorage(); save({...record,password:hashPassword(password)});}
    else if (!verifyPassword(password,record.password)) {attempts++; if(attempts>=5){retryAt=Date.now()+60000;attempts=0;} throw Error('Incorrect password.');}
    attempts=0; unlockedUntil=Date.now()+300000; return true;
  });
  handle('lock', () => {unlockedUntil=0; return true;});
  handle('configure', input => {owner(); secureStorage(); const config=validateSettings(input); save({...record,settings:safeStorage.encryptString(JSON.stringify(config)).toString('base64')});return true;});
  handle('studio-configure',async value=>{owner();secureStorage();const executable=await validateStudioPath(value);owner();save({...record,studio:safeStorage.encryptString(executable).toString('base64')});return true;});
  handle('chat', async text => {
    if(typeof text!=='string'||!text.trim()||text.length>20000) throw Error('Enter a message of at most 20,000 characters.');
    if(busy) throw Error('A request is already running.');
    const config=settings(); busy=true;
    try {
      return await complete(config,text);
    } finally {busy=false;}
  });
  const services={projects:'http://127.0.0.1:10020',creative:'http://127.0.0.1:10040'};
  handle('service', async name => {
    if(name==='studio'){if(!record.studio)throw Error('Unlock Owner settings and save the TGG Studio path first.');secureStorage();return launchStudio(safeStorage.decryptString(Buffer.from(record.studio,'base64')),{openPath:file=>shell.openPath(file)});}
    if(name==='source'){
      const url=await sourceService.start();
      const sourceSession=session.fromPartition('tgg-source');
      sourceSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
      await sourceSession.cookies.set({url,name:'tgg_source_session',value:sourceService.token,httpOnly:true,sameSite:'strict',path:'/'});
      if(!sourceWindow||sourceWindow.isDestroyed()){
        sourceWindow=new BrowserWindow({width:1250,height:900,title:'TGG Source',webPreferences:{partition:'tgg-source',nodeIntegration:false,contextIsolation:true,sandbox:true}});
        sourceWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
        sourceWindow.webContents.on('will-navigate',(event,target)=>{if(new URL(target).origin!==new URL(sourceService.url||url).origin)event.preventDefault();});
      }
      await sourceWindow.loadURL(url);sourceWindow.show();sourceWindow.focus();
      return true;
    }
    if(!services[name])throw Error('Unknown service');
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
  handle('updates',async()=>{if(!trusted) throw Error('Updates require a signed release with a pinned publisher.');await autoUpdater.checkForUpdates();return true;});
  win.loadFile(path.join(__dirname,'index.html'));
  if(trusted){autoUpdater.checkForUpdates().catch(()=>{});setInterval(()=>autoUpdater.checkForUpdates().catch(()=>{}),4*60*60*1000).unref();}
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>sourceService.stop());
