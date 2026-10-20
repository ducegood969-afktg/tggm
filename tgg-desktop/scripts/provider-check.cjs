(async()=>{
 const key=process.env.TGG_AI_API_KEY;
 if(!key)throw Error('Set TGG_AI_API_KEY securely in cloud environment settings to run the live provider check.');
 const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.TGG_AI_MODEL || 'gpt-4.1-mini',messages:[{role:'user',content:'Reply with the word READY.'}],max_completion_tokens:32}),signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error(`Provider check returned HTTP ${response.status}; confirm API billing, model access and destination binding.`);
 const data=await response.json();if(!data.choices?.[0]?.message?.content)throw Error('Provider returned no text.');
 console.log('Live AI provider returned a text completion successfully.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
