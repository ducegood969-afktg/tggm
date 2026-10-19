const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const {Workspace}=require('../src/workspace.cjs');
test('Studio workspace scopes text edits and rejects external changes and unselected files',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tgg-editor-'));
 try{const file=path.join(root,'notes.md');await fs.writeFile(file,'first\r\nline\r\n');await fs.writeFile(path.join(root,'.env'),'private');const workspace=new Workspace();const listing=await workspace.open(root);assert.deepEqual(listing.files,['notes.md']);
 const first=await workspace.read('notes.md');const saved=await workspace.save({path:first.path,content:'edited\nline\n',expectedHash:first.hash});assert.notEqual(saved.hash,first.hash);assert.equal(await fs.readFile(file,'utf8'),'edited\r\nline\r\n');
 await fs.writeFile(file,'external edit');await assert.rejects(workspace.save({path:first.path,content:'overwrite',expectedHash:saved.hash}),/changed/);assert.equal(await fs.readFile(file,'utf8'),'external edit');
 await assert.rejects(workspace.read('../outside.md'),/Choose/);await assert.rejects(workspace.read('.env'),/Choose/);await assert.rejects(workspace.save({path:'notes.md',content:'a'.repeat(300000),expectedHash:saved.hash}),/Invalid/);
 assert.equal((await fs.readdir(root)).some(name=>name.startsWith('.tgg-save-')),false);
 if(process.platform!=='win32'){await fs.rm(file);await fs.symlink(path.join(root,'.env'),file);await assert.rejects(workspace.read('notes.md'),/Linked/);}
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
