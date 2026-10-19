const {test}=require('node:test');const assert=require('node:assert/strict');const {diagnostics}=require('../src/remote-tools.cjs');
test('remote diagnostics probe only fixed local services and report failures without private errors',async()=>{
 const result=await diagnostics({version:'0.1.4',source:async()=>({repositories:[{}]}),studio:async()=>true,request:async(url,options)=>{assert.equal(url,'http://127.0.0.1:11434/api/tags');assert.equal(options.redirect,'error');return {ok:true,json:async()=>({models:[{name:'qwen2.5:0.5b'}]})};}});
 assert.equal(result.source.repositories,1);assert.equal(result.ollama.connected,true);assert.equal(result.studio.available,true);assert.equal(result.remote.remoteCommands,false);
 const failed=await diagnostics({version:'0.1.4',source:async()=>{throw Error('private path');},studio:async()=>{throw Error('private key');},request:async()=>{throw Error('private token');}});assert.equal(failed.source.connected,false);assert.equal(failed.ollama.connected,false);assert.equal(failed.studio.available,false);assert.equal(JSON.stringify(failed).includes('private'),false);
});
