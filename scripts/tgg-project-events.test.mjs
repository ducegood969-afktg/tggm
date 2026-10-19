import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import vm from 'node:vm';
test('project event routes persist under the path project and filter other projects',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'tgg-project-events-'));
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
 const child=spawn(process.execPath,['tgg-projects/server.mjs'],{env:{...process.env,TGG_PROJECTS_ROOT:root,TGG_PROJECTS_HOST:'127.0.0.1',TGG_PROJECTS_PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let output='';child.stderr.on('data',data=>output+=data);child.stdout.on('data',()=>{});
 const base=`http://127.0.0.1:${port}`;
 try{
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
  assert.ok(ready,output);
  const html=await (await fetch(base+'/')).text();
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script,'Projects must serve its dashboard script');
  assert.doesNotThrow(()=>new vm.Script(script),'Served dashboard JavaScript must compile');
  const post=async(url,body)=>{const response=await fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,201);return response.json();};
  const created=await post('/v1/projects/project-a/events',{project_id:'project-b',type:'build',title:'First build',source_service:'ci'});
  assert.equal(created.event.project_id,'project-a');
  await post('/v1/projects/project-b/events',{type:'build',title:'Other project',source_service:'ci'});
  await post('/v1/projects/project-a/events',{type:'note',title:'A note',source_service:'desktop'});
  const list=await (await fetch(base+'/v1/projects/project-a/events?type=build&source_service=ci')).json();
  assert.equal(list.events.length,1);assert.equal(list.events[0].id,created.event.id);
  const all=await (await fetch(base+'/v1/events?project_id=project-a')).json();assert.equal(all.events.length,2);
 }finally{if(child.exitCode===null){child.kill();await once(child,'exit');}await rm(root,{recursive:true,force:true});}
});
