async function complete(config,text,{request=fetch}={}) {
 const local=config.provider==='ollama';
 const url=local?'http://127.0.0.1:11434/api/chat':'https://api.openai.com/v1/chat/completions';
 let response;
 try{response=await request(url,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',...(!local?{Authorization:`Bearer ${config.apiKey}`}:{})},body:JSON.stringify({model:config.model,messages:[{role:'user',content:text}],...(local?{stream:false,options:{num_predict:2048}}:{max_completion_tokens:2048})}),signal:AbortSignal.timeout(local?180000:90000)});}catch{throw Error(local?'Cannot reach local AI. Start Ollama on this computer and download the selected model.':'Cannot reach OpenAI. Check your connection.');}
 if(!response.ok)throw Error(local?`Local AI returned HTTP ${response.status}. Check Ollama and the selected model.`:`AI provider returned HTTP ${response.status}. Check your key, billing, and model access.`);
 const data=await response.json();const answer=local?data.message?.content:data.choices?.[0]?.message?.content;
 if(typeof answer!=='string')throw Error('Provider returned no text.');return answer;
}
module.exports={complete};
