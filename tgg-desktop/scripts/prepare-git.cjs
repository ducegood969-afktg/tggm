const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');const crypto=require('node:crypto');
const {extract}=require('@electron-internal/extract-zip');
const version='2.56.0.2';
const expected='da35e72aa21c005a5a0d298cfbae110bc1609a815730ea0dde84b01a1b3cd3be';
const url='https://github.com/git-for-windows/git/releases/download/v2.56.0.windows.2/MinGit-2.56.0.2-64-bit.zip';
// SHA-256 published by Git for Windows on its official GitHub release asset.
async function prepare(){
 const cache=path.join(process.env.XDG_CACHE_HOME||os.tmpdir(),'tgg-mingit');await fs.mkdir(cache,{recursive:true});
 const archive=path.join(cache,`MinGit-${version}-64-bit.zip`);
 let bytes;try{bytes=await fs.readFile(archive);}catch(error){if(error.code!=='ENOENT')throw error;}
 if(!bytes){const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error(`MinGit download returned HTTP ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());}
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('MinGit checksum mismatch. Refusing to use the archive.');
 await fs.writeFile(archive,bytes);
 const vendor=path.resolve(__dirname,'../vendor');const destination=path.join(vendor,'mingit');await fs.mkdir(vendor,{recursive:true});
 try{await fs.access(destination);await fs.access(path.join(destination,'.tgg-generated.json'));}catch(error){if(error.code!=='ENOENT')throw error;if(await fs.stat(destination).catch(()=>null))throw Error('Unrecognized vendor/mingit directory; preserving existing files.');}
 const temporary=await fs.mkdtemp(path.join(vendor,'mingit-'));
 try{
  await extract(archive,{dir:temporary});await fs.access(path.join(temporary,'cmd/git.exe'));
  await fs.writeFile(path.join(temporary,'.tgg-generated.json'),JSON.stringify({version,sha256:expected,url}));
  await fs.rm(destination,{recursive:true,force:true});await fs.rename(temporary,destination);
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
 console.log(`Bundled Git for Windows ${version}; SHA-256 verified.`);
}
if(require.main===module)prepare().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={prepare};
