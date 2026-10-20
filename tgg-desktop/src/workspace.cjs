const fs=require('node:fs/promises');const path=require('node:path');const {createHash,randomUUID}=require('node:crypto');const {TextDecoder}=require('node:util');const {reviewProject}=require('./project-snapshot.cjs');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function encodeText(content,old){let text=content;if(old.includes(Buffer.from('\r\n')))text=text.replace(/\r?\n/g,'\r\n');let bytes=Buffer.from(text);if(old.subarray(0,3).equals(Buffer.from([239,187,191])))bytes=Buffer.concat([Buffer.from([239,187,191]),bytes]);return bytes;}
class Workspace {
 constructor(){this.root=null;this.allowed=new Set();this.saving=false;}
 async open(folder){if(this.saving)throw Error('Wait for the current save to finish.');const review=await reviewProject(folder);this.root=review.root;this.allowed=new Set(review.files.map(f=>f.path));return {folder:this.root,name:path.basename(this.root),files:[...this.allowed],skipped:review.skipped};}
 async resolve(name){
  if(!this.root||typeof name!=='string'||!this.allowed.has(name))throw Error('Choose a file from the opened workspace.');
  const file=path.join(this.root,...name.split('/'));const info=await fs.lstat(file);
  if(!info.isFile()||info.isSymbolicLink()||info.nlink>1)throw Error('Linked files cannot be edited in this workspace.');
  const resolved=await fs.realpath(file);if(!resolved.startsWith(this.root+path.sep))throw Error('File resolves outside the selected workspace.');return {file,resolved,info};
 }
 async read(name){const {resolved}=await this.resolve(name);const bytes=await fs.readFile(resolved);if(bytes.length>256*1024||bytes.includes(0))throw Error('This editor supports UTF-8 text files up to 256 KiB.');let content;try{content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw Error('This file is not valid UTF-8 text.');}return {path:name,content,hash:hash(bytes)};}
 async save({path:name,content,expectedHash}={}){
  if(this.saving)throw Error('A save is already running.');
  if(typeof content!=='string'||Buffer.byteLength(content,'utf8')>256*1024||content.includes('\0')||! /^[a-f0-9]{64}$/.test(expectedHash||''))throw Error('Invalid text or file revision.');
  this.saving=true;let temporary;
  try{
   const current=await this.read(name);if(current.hash!==expectedHash)throw Error('This file changed in another app. Reopen it before saving; your editor text has not been written.');
   const {file,resolved,info}=await this.resolve(name);const old=await fs.readFile(resolved);if(hash(old)!==expectedHash)throw Error('File changed before saving. Reopen it first.');
   const bytes=encodeText(content,old);
   if(bytes.length>256*1024)throw Error('Saved text would exceed 256 KiB.');
   temporary=path.join(path.dirname(file),'.tgg-save-'+randomUUID()+'.tmp');await fs.writeFile(temporary,bytes,{flag:'wx',mode:info.mode&0o777});
   const check=await this.resolve(name);if(check.resolved!==resolved||hash(await fs.readFile(check.resolved))!==expectedHash)throw Error('File changed during save. Reopen it first.');
   await fs.rename(temporary,file);temporary=null;return {path:name,hash:hash(bytes)};
  }finally{if(temporary)await fs.rm(temporary,{force:true});this.saving=false;}
 }
}
module.exports={Workspace,encodeText};
