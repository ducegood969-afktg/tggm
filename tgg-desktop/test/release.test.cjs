const {test}=require('node:test');const assert=require('node:assert/strict');
const {releaseConfig}=require('../scripts/release.cjs');
const {validateConfiguration}=require('app-builder-lib/out/util/config/config');
const {DebugLogger}=require('builder-util');
test('cloud signing requires configured identity and validates against the builder schema',async()=>{
 assert.throws(()=>releaseConfig({}),/TGG_WINDOWS_PUBLISHER/);
 const env={TGG_WINDOWS_PUBLISHER:'TGG Test Publisher',TGG_AZURE_SIGNING_ENDPOINT:'https://eus.codesigning.azure.net',TGG_AZURE_SIGNING_ACCOUNT:'tgg',TGG_AZURE_CERTIFICATE_PROFILE:'public-trust'};
 const config=releaseConfig(env);assert.equal(config.win.forceCodeSigning,true);assert.deepEqual(config.win.signtoolOptions.publisherName,[env.TGG_WINDOWS_PUBLISHER]);assert.match(config.win.signtoolOptions.sign,/sign-azure\.cjs$/);
 await validateConfiguration({...require('../package.json').build,win:config.win},new DebugLogger(false));
 assert.throws(()=>releaseConfig({...env,TGG_AZURE_SIGNING_ENDPOINT:'http://example.com'}),/HTTPS/);
 assert.throws(()=>releaseConfig({...env,TGG_AZURE_SIGNING_ACCOUNT:''}),/ACCOUNT/);
});
test('certificate fallback pins publisher with current builder schema',async()=>{
 const env={TGG_SIGNING_PROVIDER:'pfx',TGG_WINDOWS_PUBLISHER:'TGG Test Publisher',CSC_LINK:'test.pfx',CSC_KEY_PASSWORD:'test-only'};
 const config=releaseConfig(env);assert.deepEqual(config.win.signtoolOptions.publisherName,['TGG Test Publisher']);
 await validateConfiguration({...require('../package.json').build,win:config.win},new DebugLogger(false));
 assert.throws(()=>releaseConfig({...env,CSC_LINK:''}),/CSC_LINK/);
});

test('TGGhub feed is opt-in and requires a clean HTTPS directory',()=>{
 const env={TGG_SIGNING_PROVIDER:'pfx',TGG_WINDOWS_PUBLISHER:'TGG',CSC_LINK:'certificate.pfx',CSC_KEY_PASSWORD:'test',TGG_UPDATE_URL:'https://downloads.example.com/updates/'};
 assert.deepEqual(releaseConfig(env).publish,[{provider:'generic',url:env.TGG_UPDATE_URL}]);
 for(const url of ['http://downloads.example.com/updates/','https://user:password@example.com/updates/','https://example.com/updates','https://example.com/updates/?key=value'])assert.throws(()=>releaseConfig({...env,TGG_UPDATE_URL:url}));
});
