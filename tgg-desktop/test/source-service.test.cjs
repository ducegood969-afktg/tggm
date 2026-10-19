const {test}=require('node:test');const assert=require('node:assert/strict');
const {fork}=require('node:child_process');const {once}=require('node:events');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');
const {SourceService}=require('../src/source-service.cjs');
test('managed Source starts once, serves repository operations, restarts with retained data and stops its child',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tgg-managed-source-'));let starts=0;
 const service=new SourceService({app:{isPackaged:false,getPath:()=>root},utilityProcess:{fork:(runner,args,options)=>{starts++;return fork(runner,args,{env:options.env,stdio:['ignore','pipe','pipe','ipc']});}}});
 try{
  const [a,b]=await Promise.all([service.start(),service.start()]);assert.equal(a,b);assert.equal(starts,1);
  assert.equal((await fetch(a+'v1/repos')).status,403,'Requests outside the desktop session must be rejected');
  const headers={Cookie:'tgg_source_session='+service.token};
  assert.equal((await fetch(a+'v1/repos',{headers:{...headers,Origin:'https://other.example'}})).status,403,'Cross-origin requests must be rejected');
  const created=await fetch(a+'v1/repos',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({name:'desktop-managed'})});assert.equal(created.status,201);
  const rows=await (await fetch(a+'v1/repos',{headers})).json();assert.equal(rows.repositories[0].name,'desktop-managed');
  const {reviewProject,saveProject}=require('../src/project-snapshot.cjs');
  const project=path.join(root,'studio-project');await fs.mkdir(project);await fs.writeFile(path.join(project,'notes.md'),'first version');
  const snapshot=await reviewProject(project);const link=await saveProject(snapshot,{api:(route,options)=>service.api(route,options)});
  assert.match(link.repo,/^studio-/);await fs.writeFile(path.join(project,'notes.md'),'second version');
  const saved=await saveProject(await reviewProject(project),{api:(route,options)=>service.api(route,options),link});assert.equal(saved.repo,link.repo);assert.notEqual(saved.head,link.head);
  const history=await service.api('/v1/repos/'+link.repo+'/commits');assert.equal(history.commits.length,3);
  const noChange=await saveProject(await reviewProject(project),{api:(route,options)=>service.api(route,options),link});assert.equal(noChange.noChange,true);
  assert.equal(await fs.readFile(path.join(project,'notes.md'),'utf8'),'second version');
  let child=service.child;let exited=once(child,'exit');service.stop();await exited;
  assert.equal(service.child,null);
  const restarted=await service.start();const persisted=await (await fetch(restarted+'v1/repos',{headers:{Cookie:'tgg_source_session='+service.token}})).json();assert.ok(persisted.repositories.some(r=>r.name==='desktop-managed'));assert.ok(persisted.repositories.some(r=>r.name===link.repo));assert.equal(starts,2);
 }finally{const child=service.child;const exited=child?once(child,'exit'):null;service.stop();if(exited)await exited;await fs.rm(root,{recursive:true,force:true});}
});
