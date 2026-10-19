const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('tgg', Object.freeze(Object.fromEntries(['status','unlock','lock','configure','studio-configure','project-review','project-save','workspace-open','workspace-read','workspace-save','remote-export','remote-diagnostics','remote-screenshot','chat','service','updates'].map(name=>[name,arg=>ipcRenderer.invoke(name,arg)]))));
ipcRenderer.on('update-status',(_event,message)=>window.dispatchEvent(new CustomEvent('tgg-update',{detail:message})));
