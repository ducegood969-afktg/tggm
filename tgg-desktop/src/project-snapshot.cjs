const fs=require('node:fs/promises');const path=require('node:path');const {TextDecoder}=require('node:util');
const excluded=new Set(['.git','.svn','.hg','node_modules','vendor','dist','dist-preview','build','.next','.cache','__pycache__','.venv','venv','.ssh','.aws','.azure','binaries','intermediate','saved','deriveddatacache','.vs']);
const textExtensions=new Set(['.txt','.md','.js','.cjs','.mjs','.ts','.tsx','.jsx','.json','.html','.css','.scss','.py','.toml','.yaml','.yml','.xml','.csv','.sql','.sh','.ps1','.bat','.cmd','.rs','.go','.java','.cs','.cpp','.c','.h','.ini','.cfg','.uproject','.uplugin']);
async function reviewProject(folder){
 const root=await fs.realpath(folder);if(!(await fs.stat(root)).isDirectory())throw Error('Select a project folder.');
 const files=[],skipped=[];let total=0,seen=0;
 async function walk(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){
  if(++seen>5000)throw Error('Project exceeds the 5,000 entry scan limit. Select a smaller project.');
  const full=path.join(dir,item.name),relative=path.relative(root,full).split(path.sep).join('/');
  if(excluded.has(item.name.toLowerCase())||item.name.startsWith('.env')||/secret|credential|private.?key|token/i.test(item.name)||/\.(pem|key|pfx|p12|exe|dll|bundle|zip)$/i.test(item.name)){skipped.push(relative);continue;}
  const info=await fs.lstat(full);if(info.isSymbolicLink()){skipped.push(relative);continue;}
  if(info.isDirectory()){await walk(full);continue;}
  if(!info.isFile()||(!textExtensions.has(path.extname(item.name).toLowerCase())&&!['README','LICENSE','.gitignore','.editorconfig','Dockerfile'].includes(item.name))){skipped.push(relative);continue;}
  if(info.size>256*1024){skipped.push(relative);continue;}
  const resolved=await fs.realpath(full);if(!resolved.startsWith(root+path.sep))throw Error('Project file resolves outside the selected folder.');
  const handle=await fs.open(full,'r');let bytes;try{if(!(await handle.stat()).isFile())throw Error('Project changed during review.');bytes=await handle.readFile();}finally{await handle.close();}
  if(bytes.length>256*1024){skipped.push(relative);continue;}
  if(bytes.includes(0)){skipped.push(relative);continue;}let content;try{content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{skipped.push(relative);continue;}
  total+=bytes.length;if(total>2*1024*1024||files.length>=200)throw Error('Snapshot limit is 200 text files and 2 MB. Select a smaller project.');
  files.push({path:relative,content});
 }}
 await walk(root);if(!files.length)throw Error('No supported UTF-8 text files found.');
 return {root,files,skipped,bytes:total};
}
async function saveProject(snapshot,{api,link}){
 let target=link;
 if(!target){const repo='studio-'+require('node:crypto').randomUUID();await api('/v1/repos',{method:'POST',body:{name:repo}});target={repo};}
 // Add/update reviewed files only. Deletions are intentionally not mirrored.
 const result=await api('/v1/repos/'+encodeURIComponent(target.repo)+'/commits',{method:'POST',body:{branch:'main',message:'Studio project text snapshot',files:snapshot.files}});
 return {...target,head:result.result.head,noChange:result.result.no_change===true};
}
module.exports={reviewProject,saveProject};
