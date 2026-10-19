const providerModels={openai:'gpt-4.1-mini',ollama:'qwen2.5:0.5b'};
const $ = id => document.getElementById(id);
const notice = text => {$('notice').textContent=text;};
async function call(name,arg){const r=await window.tgg[name](arg);if(!r.ok)throw Error(r.error);return r.data;}
function run(fn){return async event=>{event?.preventDefault();try{await fn();}catch(e){notice(e.message);}};}
$('chat-tab').onclick=()=>{$('chat-panel').hidden=false;$('owner-panel').hidden=true;};
$('owner-tab').onclick=()=>{$('chat-panel').hidden=true;$('owner-panel').hidden=false;};
$('unlock-form').onsubmit=run(async()=>{try{await call('unlock',{password:$('password').value});notice('Owner settings unlocked for five minutes.');}finally{$('password').value='';}});
$('lock').onclick=run(async()=>{await call('lock');notice('Owner settings locked.');});
$('settings-form').onsubmit=run(async()=>{try{await call('configure',{provider:$('provider').value,apiKey:$('api-key').value,model:$('model').value});notice('Provider settings saved using OS encryption.');}finally{$('api-key').value='';}});
$('provider').onchange=()=>{const local=$('provider').value==='ollama';$('api-key').required=!local;$('api-key').hidden=local;$('key-label').hidden=local;$('api-key').value='';$('model').value=providerModels[$('provider').value];$('provider-help').textContent=local?'Install Ollama, run ollama pull qwen2.5:0.5b, and keep Ollama running. Model downloads need Internet and disk space; inference uses your laptop hardware.':'OpenAI requires an API key and separate billing.';};
$('studio-form').onsubmit=run(async()=>{await call('studio-configure',$('studio-path').value);notice('TGG Studio launch path saved. Use Open TGG Studio to launch it.');});
function message(text,role){const el=document.createElement('article');el.className=role;el.textContent=text;$('messages').append(el);el.scrollIntoView({block:'end'});}
$('chat-form').onsubmit=run(async()=>{const text=$('prompt').value;message(text,'user');$('send').disabled=true;notice('Generating…');try{const answer=await call('chat',text);message(answer,'assistant');$('prompt').value='';notice('Response complete.');}finally{$('send').disabled=false;}});
$('update').onclick=run(async()=>{notice('Checking for signed updates…');await call('updates');});
document.querySelectorAll('[data-service]').forEach(el=>el.onclick=run(async()=>{
  el.disabled=true;
  if(el.dataset.service==='source')notice('Starting your local Source workspace…');
  try{await call('service',el.dataset.service);if(el.dataset.service==='source')notice('TGG Source is open. Your repositories are stored on this computer.');}
  finally{el.disabled=false;}
}));
window.addEventListener('tgg-update',event=>notice(event.detail));
run(async()=>{const s=await call('status');$('provider').value=s.provider||'openai';$('provider').onchange();if(s.model)$('model').value=s.model;$('studio-path').value=s.studioPath||'';$('version').textContent=`Version ${s.version}`;notice(s.configured?'Provider configured. Ready for your next idea.':s.initialized?'Unlock Owner settings to configure your provider.':'Open Owner settings to create your local owner password.');})();

let projectReviewId=null;
$('project-review').onclick=run(async()=>{projectReviewId=null;$('project-save').disabled=true;$('remote-export').disabled=true;$('project-summary').textContent='Reviewing…';try{const result=await call('project-review');if(result.cancelled){$('project-summary').textContent='Selection cancelled.';return;}projectReviewId=result.id;$('project-summary').textContent=`${result.folder}\n${result.files.length} text files · ${result.bytes} bytes\n\nIncluded:\n${result.files.join('\n')}\n\nSkipped:\n${result.skipped.join('\n')||'None'}`;$('project-save').disabled=false;$('remote-export').disabled=false;notice('Review the included files before saving. The snapshot contains the text read during this review.');}catch(error){$('project-summary').textContent='';throw error;}});
$('project-save').onclick=run(async()=>{$('project-save').disabled=true;try{const result=await call('project-save',projectReviewId);projectReviewId=null;$('remote-export').disabled=true;notice(`Project text saved in Source repository ${result.repo}. Open TGG Source to view its commits.`);}catch(error){$('project-save').disabled=!projectReviewId;throw error;}});

$('remote-export').onclick=run(async()=>{const result=await call('remote-export',projectReviewId);notice(result.cancelled?'Export cancelled.':'Support bundle saved. Review its contents before sharing it in this chat. No live remote access was enabled.');});

$('remote-diagnostics').onclick=run(async()=>{$('remote-diagnostics').disabled=true;try{const result=await call('remote-diagnostics');$('remote-diagnostics-result').textContent=JSON.stringify(result,null,2);notice('Local connection checks complete. No diagnostic report was uploaded.');}finally{$('remote-diagnostics').disabled=false;}});
$('remote-screenshot').onclick=run(async()=>{const result=await call('remote-screenshot');notice(result.cancelled?'Screenshot cancelled.':'App screenshot saved locally. Review it before sharing; other windows were not captured.');});
