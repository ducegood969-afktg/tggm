const {test}=require('node:test');const assert=require('node:assert/strict');const {listLocalModels,proposeEdit}=require('../src/local-coder.cjs');
test('installed model discovery stays on loopback and filters unsupported model names',async()=>{
 const names=await listLocalModels({request:async(url,options)=>{assert.equal(url,'http://127.0.0.1:11434/api/tags');assert.equal(options.redirect,'error');return {ok:true,json:async()=>({models:[{name:'qwen2.5-coder:1.5b'},{name:'qwen2.5-coder:1.5b'},{name:'../bad'},{}]})};}});assert.deepEqual(names,['qwen2.5-coder:1.5b']);
});
test('local coding proposals return only bounded replacement text and never forward cloud keys',async()=>{
 const result=await proposeEdit({provider:'ollama',model:'coder',apiKey:'must-not-forward'},{path:'README.md',content:'old',instructions:'Improve it'},{request:async(url,options)=>{assert.equal(url,'http://127.0.0.1:11434/api/chat');assert.equal(options.headers.Authorization,undefined);assert.equal(options.redirect,'error');const body=JSON.parse(options.body);assert.equal(body.format.type,'object');assert.equal(JSON.parse(body.messages[1].content).file.content,'old');return {ok:true,json:async()=>({message:{content:JSON.stringify({content:'new'})}})};}});assert.equal(result,'new');
});
test('invalid or oversized model edits and cloud-provider proposals are rejected',async()=>{
 const config={provider:'ollama',model:'coder'},input={path:'README.md',content:'old',instructions:'Improve it'};
 for(const answer of ['not JSON',JSON.stringify({content:'new',path:'outside'}),JSON.stringify({content:'a'.repeat(33000)})])await assert.rejects(proposeEdit(config,input,{request:async()=>({ok:true,json:async()=>({message:{content:answer}})})}),/valid edit|unsupported edit/);
 await assert.rejects(proposeEdit({provider:'openai'},input),/Local Ollama/);
 await assert.rejects(proposeEdit(config,{...input,content:'a'.repeat(12001)}),/12,000/);
});
