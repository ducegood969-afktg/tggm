const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const {verifyWindowsSignature:verifySignature}=require('../src/update-security.cjs');
(async()=>{
 if(process.platform!=='win32')throw Error('Authenticode acceptance tests require Windows.');
 const publisher=process.env.TGG_WINDOWS_PUBLISHER;if(!publisher)throw Error('Publisher is required.');
 const root=path.resolve(__dirname,'../dist');const app=path.join(root,'win-unpacked','TGG AI Ultra.exe');
 const installer=fs.readdirSync(root).find(name=>name.endsWith('.exe')&&!name.includes('__uninstaller'));
 if(!installer)throw Error('Installer is missing.');
 for(const file of [app,path.join(root,installer)])assert.equal(await verifySignature([publisher],file),null,`Signature must validate: ${file}`);
 const wrongPublisher=await verifySignature(['TGG Incorrect Publisher'],path.join(root,installer));
 assert.notEqual(wrongPublisher,null,'Updater must reject a different publisher');
 const modified=path.join(root,'tampered-test.exe');const bytes=fs.readFileSync(path.join(root,installer));bytes[4096]^=1;
 try{fs.writeFileSync(modified,bytes);assert.notEqual(await verifySignature([publisher],modified),null,'Updater must reject tampered bytes');}
 finally{fs.rmSync(modified,{force:true});}
 const yaml=require('js-yaml');const update=yaml.load(fs.readFileSync(path.join(root,'win-unpacked/resources/app-update.yml'),'utf8'));
 assert.ok(update.publisherName.includes(publisher),'Packaged update config must pin the trusted publisher');
 const metadata=yaml.load(fs.readFileSync(path.join(root,'latest.yml'),'utf8'));
 const file=metadata.files.find(file=>file.url===installer);assert.ok(file,'Update feed must reference installer');
 const hash=require('node:crypto').createHash('sha512').update(fs.readFileSync(path.join(root,installer))).digest('base64');
 assert.equal(file.sha512,hash,'Update feed checksum must match final signed installer');
 console.log('Windows signatures, wrong-publisher rejection, tamper rejection and update checksums passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
