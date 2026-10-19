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
  let child=service.child;let exited=once(child,'exit');service.stop();await exited;
  assert.equal(service.child,null);
  const restarted=await service.start();const persisted=await (await fetch(restarted+'v1/repos',{headers:{Cookie:'tgg_source_session='+service.token}})).json();assert.equal(persisted.repositories[0].name,'desktop-managed');assert.equal(starts,2);
 }finally{const child=service.child;const exited=child?once(child,'exit'):null;service.stop();if(exited)await exited;await fs.rm(root,{recursive:true,force:true});}
});
