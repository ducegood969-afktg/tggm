const fs=require('node:fs');const path=require('node:path');
class ActivityLog{
 constructor(file,{encrypt,decrypt}){this.file=file;this.encrypt=encrypt;this.decrypt=decrypt;}
 append(event){const value={time:new Date().toISOString(),type:String(event.type||'activity').slice(0,60),detail:String(event.detail||'').slice(0,300)};const line=this.encrypt(JSON.stringify(value))+'\n';fs.mkdirSync(path.dirname(this.file),{recursive:true});if(fs.existsSync(this.file)&&fs.statSync(this.file).size>4*1024*1024){fs.rmSync(this.file+'.previous',{force:true});fs.renameSync(this.file,this.file+'.previous');}fs.appendFileSync(this.file,line,{mode:0o600});return value;}
 list(){if(!fs.existsSync(this.file))return [];const bytes=fs.readFileSync(this.file);return bytes.toString().trim().split('\n').slice(-80).filter(Boolean).map(line=>{try{return JSON.parse(this.decrypt(line));}catch{return {type:'unreadable',detail:'An activity entry could not be decrypted.'};}});}
}
module.exports={ActivityLog};
