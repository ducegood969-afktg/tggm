const {test}=require('node:test');const assert=require('node:assert/strict');const {listLocalModels,proposeEdit}=require('../src/local-coder.cjs');
test('installed model discovery stays on loopback and filters unsupported model names',async()=>{
 const names=await listLocalModels({request:async(url,options)=>{assert.equal(url,'http://127.0.0.1:11434/api/tags');assert.equal(options.redirect,'error');return {ok:true,json:async()=>({models:[{name:'qwen2.5-coder:1.5b'},{name:'qwen2.5-coder:1.5b'},{name:'../bad'},{}]})};}});assert.deepEqual(names,['qwen2.5-coder:1.5b']);
});
test('local coding proposals return only bounded replacement text and never forward cloud keys',async()=>{
 const result=await proposeEdit({provider:'ollama',model:'coder',apiKey:'must-not-forward'},{path:'README.md',content:'old',instructions:'Improve it'},{request:async(url,options)=>{assert.equal(url,'http://127.0.0.1:11434/api/chat');assert.equal(options.headers.Authorization,undefined);assert.equal(options.redirect,'error');const body=JSON.parse(options.body);assert.equal(body.format.type,'object');assert.equal(JSON.parse(body.messages[1].content).file.content,'old');return {ok:true,json:async()=>({message:{content:JSON.stringify({edits:[{find:'old',replace:'new'}]})}})};}});assert.equal(result,'new');
});
test('invalid or oversized model edits and cloud-provider proposals are rejected',async()=>{
 const config={provider:'ollama',model:'coder'},input={path:'README.md',content:'old',instructions:'Improve it'};
 for(const answer of ['not JSON',JSON.stringify({content:'new',path:'outside'}),JSON.stringify({edits:[{find:'old',replace:'a'.repeat(33000)}]})])await assert.rejects(proposeEdit(config,input,{request:async()=>({ok:true,json:async()=>({message:{content:answer}})})}),/valid edit|unsupported edit/);
 await assert.rejects(proposeEdit({provider:'openai'},input),/Local Ollama/);
 await assert.rejects(proposeEdit(config,{...input,content:'a'.repeat(12001)}),/12,000/);
});

const {applyExactEdits}=require('../src/local-coder.cjs');
test('a one-sentence README edit preserves all unrelated sections exactly',()=>{
 const original='# tgg\n\n## Overview\nA starter project.\n\n## Contents\nREADME.md\n\n## Workflow\nSave explicitly.\n\n## License\nNo license has been selected.\n';
 const replacement='A beginner-friendly project for practicing editing, local AI assistance, and version-history snapshots in TGG.';
 const changed=applyExactEdits(original,{edits:[{find:'A starter project.',replace:replacement}]},{path:'README.md'});
 assert.equal(changed,original.replace('A starter project.',replacement));
 assert.throws(()=>applyExactEdits(original,{content:replacement},{path:'README.md'}),/unsupported/);
 assert.throws(()=>applyExactEdits(original,{edits:[{find:original,replace:replacement}]},{path:'README.md'}),/removes/);
 assert.throws(()=>applyExactEdits(original,{edits:[{find:'A starter project.',replace:'A starter project.'}]}),/no changes/);
});
test('missing, ambiguous and overlapping edit matches are rejected',()=>{
 for(const edits of [[{find:'missing',replace:'x'}],[{find:'abc',replace:'x'}],[{find:'abc abc',replace:'x'},{find:'bc a',replace:'y'}]])assert.throws(()=>applyExactEdits('abc abc',{edits}),/match|overlap/);
});
