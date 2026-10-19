const {build} = require('electron-builder');
function releaseConfig(env=process.env) {
  const required = name => {const value=env[name]?.trim();if(!value)throw Error(`Signed releases require ${name}. See WINDOWS-RELEASE.md.`);return value;};
  const publisher=required('TGG_WINDOWS_PUBLISHER');
  let publish;
  if(env.TGG_UPDATE_URL){
    const feed=new URL(env.TGG_UPDATE_URL);
    if(feed.protocol!=='https:'||feed.username||feed.password||feed.search||feed.hash||!feed.pathname.endsWith('/'))throw Error('TGG_UPDATE_URL must be an HTTPS directory URL ending in /.');
    publish=[{provider:'generic',url:feed.href}];
  }
  const provider=env.TGG_SIGNING_PROVIDER || 'azure';
  if(provider==='azure') {
    const endpoint=required('TGG_AZURE_SIGNING_ENDPOINT');
    const url=new URL(endpoint);
    if(url.protocol!=='https:' || !url.hostname.endsWith('.codesigning.azure.net') || url.username || url.password || url.port || url.search || url.hash || url.pathname!=='/')throw Error('Use the HTTPS regional Microsoft code-signing endpoint.');
    required('TGG_AZURE_SIGNING_ACCOUNT');required('TGG_AZURE_CERTIFICATE_PROFILE');
    return {...(publish?{publish}:{}),win:{forceCodeSigning:true,verifyUpdateCodeSignature:true,signtoolOptions:{publisherName:[publisher],
      signingHashAlgorithms:['sha256'],sign:require('node:path').join(__dirname,'sign-azure.cjs')}}};
  }
  if(provider==='pfx') {
    required('CSC_LINK');required('CSC_KEY_PASSWORD');
    return {...(publish?{publish}:{}),win:{forceCodeSigning:true,verifyUpdateCodeSignature:true,signtoolOptions:{publisherName:[publisher],signingHashAlgorithms:['sha256']}}};
  }
  throw Error('TGG_SIGNING_PROVIDER must be azure or pfx.');
}
if(require.main===module) {
  try {const config=releaseConfig();require('./prepare-git.cjs').prepare().then(()=>build({win:['nsis'],publish:'never',config})).catch(error=>{console.error(error.message);process.exitCode=1;});}
  catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={releaseConfig};
