const os=require('node:os');
async function diagnostics({source,studio,everythingOs,request=fetch,version}){
 const result={appVersion:version,system:{platform:process.platform,arch:process.arch,totalMemoryGiB:Math.round(os.totalmem()/1024**3)},ollama:{connected:false},source:{connected:false},studio:{configured:!!studio},everythingOs:{checked:!!everythingOs},remote:{liveScreen:false,remoteCommands:false}};
 try{const response=await request('http://127.0.0.1:11434/api/tags',{redirect:'error',signal:AbortSignal.timeout(4000)});if(!response.ok)throw Error('unavailable');const data=await response.json();result.ollama={connected:true,models:(Array.isArray(data.models)?data.models:[]).slice(0,100).map(m=>String(m.name||'').slice(0,128))};}catch{result.ollama={connected:false,message:'Start Ollama on this computer.'};}
 try{const data=await source();result.source={connected:true,repositories:Array.isArray(data.repositories)?data.repositories.length:0};}catch{result.source={connected:false,message:'Source startup or repository listing failed.'};}
 if(studio){try{await studio();result.studio.available=true;}catch{result.studio.available=false;}}
 if(everythingOs){try{await everythingOs();result.everythingOs.available=true;}catch{result.everythingOs.available=false;}}
 return result;
}
module.exports={diagnostics};
