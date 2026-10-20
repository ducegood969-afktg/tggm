const {contextBridge,ipcRenderer}=require('electron');let channel;ipcRenderer.on('browser-channel',(_event,value)=>{channel=value;});
contextBridge.exposeInMainWorld('browser',Object.freeze({act:arg=>channel?ipcRenderer.invoke(channel,arg):Promise.resolve({ok:false,error:'Browser is starting. Try again.'})}));
ipcRenderer.on('browser-state',(_event,state)=>window.dispatchEvent(new CustomEvent('browser-state',{detail:state})));
