const path=require('node:path');
const fs=require('node:fs');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const http=require('node:http');
const {randomBytes}=require('node:crypto');
function readJson(url,token){return new Promise((resolve,reject)=>{
 const request=http.get(url,{headers:{Cookie:'tgg_source_session='+token}},response=>{let body='';response.setEncoding('utf8');response.on('data',chunk=>{body+=chunk;if(body.length>1024*1024){request.destroy(Error('Source response is too large.'));}});response.on('end',()=>{try{if(response.statusCode!==200)throw Error('Source API did not become ready.');resolve(JSON.parse(body));}catch(error){reject(error);}});});
 request.setTimeout(5000,()=>request.destroy(Error('Source readiness check timed out.')));request.on('error',reject);
});}
class SourceService {
 constructor({app,utilityProcess}){this.app=app;this.utilityProcess=utilityProcess;this.child=null;this.pending=null;this.url=null;this.stopping=false;}
 async start(){
  if(this.pending)return this.pending;
  this.stopping=false;
  this.pending=this.launch().catch(error=>{this.stop();throw error;});
  return this.pending;
 }
 async launch(){
  const app=this.app;
  const sourceRoot=app.isPackaged?path.join(process.resourcesPath,'tgg-source'):path.resolve(__dirname,'../../tgg-source');
  const gitRoot=app.isPackaged?path.join(process.resourcesPath,'mingit'):path.resolve(__dirname,'../vendor/mingit');
  const git=process.platform==='win32'?path.join(gitRoot,'cmd/git.exe'):'git';
  if(process.platform==='win32'&&!fs.existsSync(git))throw Error('Bundled Git is missing. Reinstall the current TGG AI Ultra installer.');
  await promisify(execFile)(git,['--version'],{windowsHide:true,timeout:10000});
  if(this.stopping)throw Error('Source startup was cancelled.');
  this.token=randomBytes(32).toString('hex');
  const env={...process.env,TGG_SOURCE_ROOT:path.join(app.getPath('userData'),'source-store'),TGG_SOURCE_HOST:'127.0.0.1',TGG_SOURCE_PORT:'0',TGG_SOURCE_DESKTOP_SESSION:this.token};
  if(process.platform==='win32'){
   // Windows environment keys are case insensitive. Avoid passing both Path and PATH.
   const pathKey=Object.keys(env).find(key=>key.toUpperCase()==='PATH')||'PATH';
   env[pathKey]=[path.join(gitRoot,'cmd'),path.join(gitRoot,'ucrt64/bin'),path.join(gitRoot,'usr/bin'),env[pathKey]||''].join(path.delimiter);
  }
  return new Promise((resolve,reject)=>{
   const child=this.utilityProcess.fork(path.join(__dirname,'source-runner.cjs'),[path.join(sourceRoot,'server.mjs')],{env,stdio:'pipe',serviceName:'TGG Source'});
   this.child=child;
   const timer=setTimeout(()=>{child.kill();reject(Error('TGG Source did not start in time.'));},20000);timer.unref();
   child.stdout?.resume();child.stderr?.resume();
   child.once('exit',()=>{clearTimeout(timer);if(this.child===child){this.child=null;this.url=null;this.pending=null;}reject(Error('TGG Source stopped. Reopen Source to restart it.'));});
   child.on('message',async message=>{
    if(message?.type!=='tgg-source-ready'||!Number.isInteger(message.port)||message.port<1||message.port>65535)return;
    const url=`http://127.0.0.1:${message.port}/`;
    try{
     const health=await readJson(url+'health',this.token);const repos=await readJson(url+'v1/repos',this.token);
     if(health.service!=='tgg-source'||health.owner!=='TGG'||repos.ok!==true||!Array.isArray(repos.repositories))throw Error('Source API readiness check failed.');
     this.url=url;clearTimeout(timer);resolve(url);
    }catch(error){clearTimeout(timer);child.kill();reject(error);}
   });
  });
 }
 async api(route,{method='GET',body}={}){
  if(!route.startsWith('/v1/')||route.includes('..'))throw Error('Invalid Source route.');
  const base=await this.start();const response=await fetch(new URL(route.slice(1),base),{method,redirect:'error',headers:{Cookie:'tgg_source_session='+this.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
  const data=await response.json();if(!response.ok||data.ok===false)throw Error('Source snapshot failed: '+(data.error||response.status));return data;
 }
 stop(){this.stopping=true;this.child?.kill();this.child=null;this.url=null;this.pending=null;}
}
module.exports={SourceService};
