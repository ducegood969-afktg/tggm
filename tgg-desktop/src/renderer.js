const $ = id => document.getElementById(id);
const notice = text => {$('notice').textContent=text;};
async function call(name,arg){const r=await window.tgg[name](arg);if(!r.ok)throw Error(r.error);return r.data;}
function run(fn){return async event=>{event?.preventDefault();try{await fn();}catch(e){notice(e.message);}};}
$('chat-tab').onclick=()=>{$('chat-panel').hidden=false;$('owner-panel').hidden=true;};
$('owner-tab').onclick=()=>{$('chat-panel').hidden=true;$('owner-panel').hidden=false;};
$('unlock-form').onsubmit=run(async()=>{try{await call('unlock',{password:$('password').value});notice('Owner settings unlocked for five minutes.');}finally{$('password').value='';}});
$('lock').onclick=run(async()=>{await call('lock');notice('Owner settings locked.');});
$('settings-form').onsubmit=run(async()=>{try{await call('configure',{apiKey:$('api-key').value,model:$('model').value});notice('Provider settings saved using OS encryption.');}finally{$('api-key').value='';}});
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
run(async()=>{const s=await call('status');$('version').textContent=`Version ${s.version}`;notice(s.configured?'Provider configured. Ready for your next idea.':s.initialized?'Unlock Owner settings to configure your provider.':'Open Owner settings to create your local owner password.');})();
