const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('tgg', Object.freeze(Object.fromEntries(['status','unlock','lock','configure','chat','service','updates'].map(name=>[name,arg=>ipcRenderer.invoke(name,arg)]))));
ipcRenderer.on('update-status',(_event,message)=>window.dispatchEvent(new CustomEvent('tgg-update',{detail:message})));
