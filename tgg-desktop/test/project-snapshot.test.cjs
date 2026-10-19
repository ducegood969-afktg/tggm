const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');const {reviewProject}=require('../src/project-snapshot.cjs');
test('project review copies supported UTF-8 text without changing original files or collecting common secrets',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tgg-project-'));
 try{await fs.writeFile(path.join(root,'README.md'),'hello');await fs.writeFile(path.join(root,'.env'),'secret');await fs.writeFile(path.join(root,'image.png'),Buffer.from([0,1,2]));await fs.mkdir(path.join(root,'node_modules'));await fs.writeFile(path.join(root,'node_modules','module.js'),'generated');
 const result=await reviewProject(root);assert.deepEqual(result.files,[{path:'README.md',content:'hello'}]);assert.ok(result.skipped.includes('.env'));assert.ok(result.skipped.includes('node_modules'));assert.equal(await fs.readFile(path.join(root,'README.md'),'utf8'),'hello');
 await fs.writeFile(path.join(root,'bad.txt'),Buffer.from([255]));const next=await reviewProject(root);assert.ok(next.skipped.includes('bad.txt'));
 if(process.platform!=='win32'){await fs.symlink(os.tmpdir(),path.join(root,'outside'));assert.ok((await reviewProject(root)).skipped.includes('outside'));}
 await fs.writeFile(path.join(root,'large.txt'),Buffer.alloc(300000,65));assert.ok((await reviewProject(root)).skipped.includes('large.txt'));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('TGG Remote bundle contains only reviewed text and minimal diagnostics',()=>{
 const {supportBundle}=require('../src/remote-support.cjs');
 const result=supportBundle({root:'C:/private/user/project',files:[{path:'README.md',content:'hello'}],skipped:['.env'],password:'private',settings:'private'},{version:'0.1.4',platform:'win32',arch:'x64',apiKey:'private'});
 assert.equal(result.format,'tgg-remote-support-v1');assert.equal(result.files[0].content,'hello');assert.equal(result.root,undefined);assert.equal(result.apiKey,undefined);assert.equal(JSON.stringify(result).includes('private'),false);
});
