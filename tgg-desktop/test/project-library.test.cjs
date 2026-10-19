const {test}=require('node:test');const assert=require('node:assert/strict');const {ProjectLibrary}=require('../src/project-library.cjs');
test('project library preserves stable IDs, bounds recents, and forgets shortcuts only',()=>{
 const library=new ProjectLibrary();const first=library.remember('/projects/one','README.md');library.remember('/projects/one','notes.md');assert.equal(library.entries.length,1);assert.equal(library.entries[0].id,first.id);assert.deepEqual(library.entries[0].files,['notes.md','README.md']);
 const restored=new ProjectLibrary(JSON.parse(JSON.stringify(library.entries)));assert.equal(restored.get(first.id).folder,'/projects/one');for(let n=0;n<8;n++)restored.remember('/projects/one',`file${n}.md`);assert.equal(restored.get(first.id).files.length,5);restored.forget(first.id);assert.equal(restored.entries.length,0);assert.throws(()=>restored.get(first.id),/Choose/);
 for(let n=0;n<15;n++)library.remember(`/projects/${n}`);assert.equal(library.entries.length,12);
});
