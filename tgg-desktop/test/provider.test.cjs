const {test}=require('node:test');const assert=require('node:assert/strict');const {complete}=require('../src/provider.cjs');const {validateSettings}=require('../src/security.cjs');
test('local AI uses fixed loopback endpoint, no cloud key, and rejects redirects',async()=>{
 const config=validateSettings({provider:'ollama',apiKey:'must-not-be-kept',model:'qwen2.5:0.5b'});assert.equal(config.apiKey,undefined);
 const answer=await complete(config,'hello',{request:async(url,opts)=>{assert.equal(url,'http://127.0.0.1:11434/api/chat');assert.equal(opts.headers.Authorization,undefined);assert.equal(opts.redirect,'error');assert.equal(JSON.parse(opts.body).stream,false);return {ok:true,json:async()=>({message:{content:'local answer'}})};}});assert.equal(answer,'local answer');
 await assert.rejects(complete(config,'hello',{request:async()=>{throw Error('offline');}}),/Start Ollama/);
 await assert.rejects(complete(config,'hello',{request:async()=>({ok:false,status:404})}),/selected model/);
 await assert.rejects(complete(config,'hello',{request:async()=>({ok:true,json:async()=>({})})}),/no text/);
 assert.throws(()=>validateSettings({provider:'custom',apiKey:'secret',model:'model'}),/Unknown/);
 assert.throws(()=>validateSettings({provider:'ollama',model:'../bad'}),/Invalid/);
});
