import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHub} from './server.mjs';
import {publish} from './publish.mjs';
test('owner publication, immutable previews, downloads and update-feed isolation',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'tgg-hub-'));const root=path.join(tmp,'store');const installer=path.join(tmp,'TGG-AI-Ultra-Setup-0.1.1-x64.exe');await writeFile(installer,'MZfixture');
 const server=createHub({root});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(base+'/health')).status,200);
  assert.match(await(await fetch(base)).text(),/No releases/);
  await assert.rejects(publish({root,installer,version:'0.1.1'}),/PUBLISHER/);
  const release=await publish({root,installer,version:'0.1.1',preview:true});assert.equal(release.trusted,false);assert.equal(release.sha256.length,64);
  assert.match(await(await fetch(base)).text(),/Unsigned engineering preview/);
  assert.equal((await(await fetch(base+'/v1/releases')).json()).releases.length,1);
  const url=base+'/releases/0.1.1/'+release.file;
  assert.equal(await(await fetch(url)).text(),'MZfixture');
  const range=await fetch(url,{headers:{Range:'bytes=2-4'}});assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),'bytes 2-4/9');assert.equal(await range.text(),'fix');
  assert.equal((await fetch(url,{method:'HEAD'})).headers.get('content-length'),'9');
  assert.equal((await fetch(url,{headers:{Range:'bytes=999-'}})).status,416);
  assert.equal((await fetch(base+'/updates/latest.yml')).status,404);
  assert.equal((await fetch(base+'/releases/0.1.1/../../index.json')).status,404);
  assert.equal((await fetch(base+'/v1/releases',{method:'POST',body:'{}'})).status,405);
  await assert.rejects(publish({root,installer,version:'0.1.1',preview:true}),/immutable/);
  await assert.rejects(readFile(path.join(root,'latest.yml')),/ENOENT/);
  if(process.platform!=='win32')await assert.rejects(publish({root,installer,version:'0.1.1',publisher:'TGG'}),/unavailable/);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(tmp,{recursive:true,force:true});}
});
