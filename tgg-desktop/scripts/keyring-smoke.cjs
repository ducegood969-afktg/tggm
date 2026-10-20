const {spawnSync}=require('node:child_process');
const {randomBytes}=require('node:crypto');
// Disposable, isolated test keyring; never used to retain a real provider key.
const daemon=spawnSync(process.env.TGG_KEYRING_DAEMON,['--unlock','--components=secrets'],{input:randomBytes(32).toString('hex'),encoding:'utf8'});
if(daemon.status!==0){console.error(daemon.stderr);process.exit(1);}
const result=spawnSync(process.execPath,[require('node:path').join(__dirname,'smoke.cjs')],{stdio:'inherit'});
process.exit(result.status??1);
