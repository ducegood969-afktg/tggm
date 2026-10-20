import path from 'node:path';
import {readFile,mkdir,copyFile,writeFile,rename,rm,open,stat} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
async function digest(file,algorithm,encoding){const hash=createHash(algorithm);for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest(encoding);}
export async function publish({root,installer,version,publisher,preview=false}){
 if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Use a numeric major.minor.patch version.');
 const file=`TGG-AI-Ultra-Setup-${version}-x64.exe`;
 if(path.basename(installer)!==file)throw Error('Installer filename must match the version.');
 if(!preview&&!publisher)throw Error('Signed publication requires TGG_WINDOWS_PUBLISHER.');
 await mkdir(root,{recursive:true,mode:0o700});
 const lock=await open(path.join(root,'.publish.lock'),'wx',0o600);
 const stage=path.join(root,'.stage-'+randomUUID());
 try{
  await mkdir(stage,{mode:0o700});await copyFile(installer,path.join(stage,file));
  const header=await open(path.join(stage,file),'r');try{const b=Buffer.alloc(2);await header.read(b,0,2,0);if(b.toString()!=='MZ')throw Error('Not a Windows executable.');}finally{await header.close();}
  if(!preview){const {verifyWindowsSignature}=require('../tgg-desktop/src/update-security.cjs');const error=await verifyWindowsSignature([publisher],path.join(stage,file));if(error)throw Error(error);await copyFile(installer+'.blockmap',path.join(stage,file+'.blockmap'));}
  let index=[];try{index=JSON.parse(await readFile(path.join(root,'index.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(index.some(r=>r.version===version))throw Error('Release versions are immutable; increase the version.');
  const compare=(a,b)=>{const left=a.split('.').map(Number),right=b.split('.').map(Number);for(let i=0;i<3;i++)if(left[i]!==right[i])return left[i]-right[i];return 0;};
  if(!preview&&index.some(r=>r.trusted&&compare(r.version,version)>=0))throw Error('Stable releases must increase the version.');
  const release={version,file,trusted:!preview,sha256:await digest(path.join(stage,file),'sha256','hex'),sha512:await digest(path.join(stage,file),'sha512','base64'),published:new Date().toISOString()};
  await mkdir(path.join(root,'releases'),{recursive:true});await rename(stage,path.join(root,'releases',version));
  index.unshift(release);const tmp=path.join(root,'index.json.tmp');await writeFile(tmp,JSON.stringify(index,null,2));await rename(tmp,path.join(root,'index.json'));
  if(!preview){const relative=`${version}/${file}`;const size=(await stat(path.join(root,'releases',version,file))).size;const feed=`version: ${version}\nfiles:\n  - url: ${relative}\n    sha512: ${release.sha512}\n    size: ${size}\npath: ${relative}\nsha512: ${release.sha512}\nreleaseDate: '${release.published}'\n`;await writeFile(path.join(root,'latest.yml.tmp'),feed);await rename(path.join(root,'latest.yml.tmp'),path.join(root,'latest.yml'));}
  return release;
 }finally{await rm(stage,{recursive:true,force:true});await lock.close();await rm(path.join(root,'.publish.lock'),{force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const [installer,version,...flags]=process.argv.slice(2);publish({root:process.env.TGG_HUB_ROOT||'/workspace/.state/tgg-hub',installer:installer||'',version:version||'',publisher:process.env.TGG_WINDOWS_PUBLISHER,preview:flags.includes('--preview')}).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1;});}
