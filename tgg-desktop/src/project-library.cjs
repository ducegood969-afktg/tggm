const path=require('node:path');const {randomUUID}=require('node:crypto');
class ProjectLibrary{
 constructor(entries=[]){this.entries=Array.isArray(entries)?entries.slice(0,12):[];}
 remember(folder,file){let entry=this.entries.find(item=>item.folder===folder);if(!entry)entry={id:randomUUID(),folder,name:path.basename(folder),files:[]};entry.updated=new Date().toISOString();if(file)entry.files=[file,...entry.files.filter(name=>name!==file)].slice(0,5);this.entries=[entry,...this.entries.filter(item=>item.id!==entry.id)].slice(0,12);return entry;}
 get(id){const entry=this.entries.find(item=>item.id===id);if(!entry)throw Error('Choose a project from your dashboard.');return entry;}
 forget(id){this.get(id);this.entries=this.entries.filter(item=>item.id!==id);}
}
module.exports={ProjectLibrary};
