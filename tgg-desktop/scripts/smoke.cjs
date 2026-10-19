const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tgg-ui-'));
  let application;
  try {
    const linux = process.platform === 'linux';
    application = await electron.launch({executablePath:process.env.TGG_TEST_EXE || require('electron'),
      args:[...(linux ? ['--disable-setuid-sandbox','--password-store=gnome-libsecret'] : []), `--user-data-dir=${profile}`,
        ...(!process.env.TGG_TEST_EXE ? [path.resolve(__dirname,'..')] : [])],
      chromiumSandbox:true, timeout:45000});
    const page = await application.firstWindow();
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await page.waitForSelector('#notice');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('create your local owner'));
    const secure = await application.evaluate(({safeStorage,BrowserWindow})=>({
      encrypted:safeStorage.isEncryptionAvailable(),
      backend:process.platform==='linux'?safeStorage.getSelectedStorageBackend():'windows-dpapi',
      sandbox:BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences().sandbox
    }));
    assert.equal(secure.encrypted,true);assert.notEqual(secure.backend,'basic_text');assert.equal(secure.sandbox,true);
    // Source starts its bundled backend and opens inside the app, without a website URL.
    const sourceOpened=application.waitForEvent('window',{timeout:30000});
    await page.locator('.sidebar [data-service=source]').click();
    const source=await sourceOpened;
    await source.waitForFunction(()=>document.querySelector('#repoCount')?.textContent==='0');
    assert.equal(await source.evaluate(()=>typeof require),'undefined');
    assert.equal(await source.evaluate(()=>document.cookie.includes('tgg_source_session')),false,'Source session must be HTTP-only');
    assert.equal(await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().every(window=>window.webContents.getLastWebPreferences().sandbox===true)),true);
    await source.fill('#newRepo','desktop-smoke');
    await source.locator('button').filter({hasText:/^Create$/}).click();
    await source.waitForFunction(()=>document.querySelector('#repoCount').textContent==='1');
    assert.match(await source.locator('#repos').textContent(),/desktop-smoke/);
    await source.close();
    await page.click('#owner-tab');
    await page.fill('#password','tgg smoke owner password');
    await page.click('#unlock-form button[type=submit]');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('unlocked'));
    await page.selectOption('#provider','openai');
    await page.fill('#api-key','tgg-fake-smoke-key');
    await page.click('#settings-form button[type=submit]');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('saved using OS encryption'));
    assert.equal(await page.inputValue('#api-key'),'');
    const stored=JSON.parse(fs.readFileSync(path.join(profile,'owner.json'),'utf8'));
    assert.equal(JSON.stringify(stored).includes('tgg-fake-smoke-key'),false);
    const roundTrip=await application.evaluate(({safeStorage},encrypted)=>
      JSON.parse(safeStorage.decryptString(Buffer.from(encrypted,'base64'))).apiKey==='tgg-fake-smoke-key',stored.settings);
    assert.equal(roundTrip,true);
    await application.evaluate(()=>{global.__tggSmokeFetch=global.fetch;global.fetch=async()=>({ok:true,json:async()=>({choices:[{message:{content:'<script>unsafe()</script> TGG smoke response'}}]})});});
    await page.click('#chat-tab');await page.fill('#prompt','Smoke test');await page.click('#send');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Response complete.');
    assert.equal(await page.locator('#messages script').count(),0);
    assert.match(await page.locator('#messages').textContent(),/<script>unsafe\(\)<\/script> TGG smoke response/);
    await page.click('#owner-tab');
    await page.selectOption('#provider','ollama');
    assert.equal(await page.locator('#api-key').isVisible(),false);
    await page.click('#settings-form button[type=submit]');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('saved using OS encryption'));
    await application.evaluate(()=>{global.fetch=async(url,options)=>{if(String(url)==='http://127.0.0.1:11434/api/tags')return {ok:true,json:async()=>({models:[{name:'qwen2.5:0.5b'}]})};if(String(url)!=='http://127.0.0.1:11434/api/chat')return global.__tggSmokeFetch(url,options);if(options.headers.Authorization)throw Error('Local provider boundary failed');if(JSON.parse(options.body).format)return {ok:true,json:async()=>({message:{content:JSON.stringify({edits:[{find:'Edited in the Obsidian workspace',replace:'Reviewed local edit'}]})}})};return {ok:true,json:async()=>({message:{content:'Local model smoke response'}})};};});
    await page.click('#chat-tab');await page.fill('#prompt','Local smoke test');await page.click('#send');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Response complete.');
    assert.match(await page.locator('#messages').textContent(),/Local model smoke response/);
    await page.click('#owner-tab');await page.click('#local-models');await page.waitForFunction(()=>document.querySelector('#local-model-picker').options.length>1);await page.selectOption('#local-model-picker','qwen2.5:0.5b');assert.equal(await page.inputValue('#model'),'qwen2.5:0.5b');await page.selectOption('#provider','openai');
    await page.click('#remote-tab');
    assert.equal(await page.locator('#remote-panel').isVisible(),true);
    assert.equal(await page.locator('#owner-panel').isVisible(),false);
    assert.equal(await page.locator('#project-review').count(),1);
    assert.equal(await page.locator('#remote-export').isDisabled(),true);
    assert.equal(await page.locator('#project-save').isDisabled(),true);
    const projectFolder=path.join(profile,'smoke-project');fs.mkdirSync(projectFolder);fs.writeFileSync(path.join(projectFolder,'notes.md'),'Studio project smoke');fs.writeFileSync(path.join(projectFolder,'.env'),'dummy-secret-for-exclusion');
    await application.evaluate(({dialog},{folder,profile})=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});dialog.showSaveDialog=async(_window,options)=>({canceled:false,filePath:profile+'/'+options.defaultPath});},{folder:projectFolder,profile});
    await page.click('#project-review');
    await page.waitForFunction(()=>!document.querySelector('#project-save').disabled);
    assert.match(await page.locator('#project-summary').textContent(),/notes.md/);
    await page.click('#remote-export');await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Support bundle saved'));
    const support=JSON.parse(fs.readFileSync(path.join(profile,'TGG-Remote-support.json'),'utf8'));assert.equal(support.files[0].content,'Studio project smoke');assert.equal(JSON.stringify(support).includes('dummy-secret-for-exclusion'),false);
    await page.click('#project-save');await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Project text saved in Source repository'));
    assert.equal(fs.readFileSync(path.join(projectFolder,'notes.md'),'utf8'),'Studio project smoke');
    await page.click('#workspace-tab');await page.click('#workspace-open');
    await page.waitForSelector('.file-item');await page.locator('.file-item').first().click();
    await page.waitForFunction(()=>!document.querySelector('#workspace-editor').disabled);
    assert.equal(await page.inputValue('#workspace-editor'),'Studio project smoke');
    await page.fill('#workspace-editor','Edited in the Obsidian workspace');await page.click('#workspace-save');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('File saved.'));
    assert.equal(fs.readFileSync(path.join(projectFolder,'notes.md'),'utf8'),'Edited in the Obsidian workspace');
    await page.fill('#workspace-editor','Unsaved snapshot must be blocked');await page.click('#workspace-snapshot');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Save your editor changes'));
    await page.fill('#workspace-editor','Edited in the Obsidian workspace');await page.click('#workspace-save');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('File saved.'));
    await application.evaluate(({dialog})=>{dialog.showOpenDialog=async()=>{throw Error('Snapshot shortcut must not reopen the folder picker');};});
    await page.click('#workspace-snapshot');await page.waitForFunction(()=>!document.querySelector('#project-save').disabled);
    assert.match(await page.locator('#project-summary').textContent(),/notes.md/);
    await page.click('#project-save');await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Project text saved in Source repository'));
    await page.click('#workspace-tab');
    await page.fill('#workspace-ai-prompt','Explain this note');await page.check('#workspace-context');await page.click('#workspace-ai-send');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('Studio companion response complete'));
    assert.match(await page.locator('#workspace-ai-messages').textContent(),/Local model smoke response/);
    await page.fill('#workspace-ai-prompt','Improve this note');await page.click('#workspace-propose');await page.waitForSelector('#proposal-dialog[open]');
    assert.equal(fs.readFileSync(path.join(projectFolder,'notes.md'),'utf8'),'Edited in the Obsidian workspace');
    await page.click('#proposal-reject');assert.equal(await page.inputValue('#workspace-editor'),'Edited in the Obsidian workspace');
    await page.click('#workspace-propose');await page.waitForSelector('#proposal-dialog[open]');await page.click('#proposal-apply');
    assert.equal(await page.inputValue('#workspace-editor'),'Reviewed local edit');assert.equal(fs.readFileSync(path.join(projectFolder,'notes.md'),'utf8'),'Edited in the Obsidian workspace');
    await page.click('#workspace-save');await page.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('File saved.'));
    assert.equal(fs.readFileSync(path.join(projectFolder,'notes.md'),'utf8'),'Reviewed local edit');
    await page.click('#dashboard-tab');await page.waitForSelector('.dashboard-project');
    assert.match(await page.locator('#dashboard-projects').textContent(),/notes.md/);
    await page.screenshot({path:path.resolve(__dirname,'../test-results/dashboard.png')});
    await page.locator('.recent-file').first().click();
    await page.waitForFunction(()=>!document.querySelector('#workspace-panel').hidden&&document.querySelector('#workspace-editor').value==='Reviewed local edit');
    await page.screenshot({path:path.resolve(__dirname,'../test-results/workspace.png')});
    fs.writeFileSync(path.join(projectFolder,'notes.md'),'Changed by another editor');
    await page.fill('#workspace-editor','Do not overwrite external edits');await page.click('#workspace-save');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('changed in another app'));
    assert.equal(fs.readFileSync(path.join(projectFolder,'notes.md'),'utf8'),'Changed by another editor');
    await page.locator('.file-item').first().click();await page.click('#discard-confirm');
    await page.waitForFunction(()=>document.querySelector('#workspace-editor').value==='Changed by another editor');
    await page.click('#remote-tab');
    await page.click('#remote-diagnostics');await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Local connection checks complete'));
    const diagnostic=JSON.parse(await page.locator('#remote-diagnostics-result').textContent());assert.equal(diagnostic.source.connected,true);assert.equal(diagnostic.ollama.connected,true);
    await page.click('#remote-screenshot');await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('App screenshot saved locally'));
    assert.ok(fs.statSync(path.join(profile,'TGG-Remote-app.png')).size>0);
    await page.click('#owner-tab');await page.click('#lock');
    await page.fill('#api-key','tgg-fake-other-key');await page.click('#settings-form button[type=submit]');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Unlock owner settings first'));
    // A signed packaged app can contact its real feed; test the disabled update path only in development.
    if(!process.env.TGG_TEST_EXE){await page.click('#update');await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('signed release'));}
    fs.mkdirSync(path.resolve(__dirname,'../test-results'),{recursive:true});
    await page.click('#chat-tab');await page.click('#new-chat');
    assert.equal(await page.locator('#messages .user').count(),0);
    assert.equal(await page.locator('#messages .welcome').count(),1);
    await page.locator('[data-prompt]').first().click();assert.match(await page.inputValue('#prompt'),/plan a small app/);
    await page.click('#new-chat');assert.equal(await page.inputValue('#prompt'),'');
    await page.screenshot({path:path.resolve(__dirname,'../test-results/desktop.png')});
    await page.click('#owner-tab');await page.screenshot({path:path.resolve(__dirname,'../test-results/owner.png')});
    await page.click('#remote-tab');await page.screenshot({path:path.resolve(__dirname,'../test-results/remote.png')});
    await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:760,height:700}));
    await page.click('#chat-tab');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(()=>document.body.scrollWidth<=innerWidth+1),true);
    assert.equal(await page.locator('#send').isVisible(),true);
    await page.screenshot({path:path.resolve(__dirname,'../test-results/desktop-compact.png')});

    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,checks:['real GUI','sandbox enabled','owner setup','OS encryption round trip','mocked chat rendered as text','owner lock','managed Source startup and repository creation','project review and real Source snapshot','support export','local diagnostics','app screenshot','Studio workspace edit/save','external-edit rejection','Studio companion with opt-in context','local model picker','review/reject/apply local edit proposal','separate explicit save of AI proposal'],backend:secure.backend}));
  } finally {
    if(application) await application.close();
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
