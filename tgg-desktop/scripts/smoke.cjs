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
    await page.click('[data-service=source]');
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
    await page.fill('#api-key','tgg-fake-smoke-key');
    await page.click('#settings-form button');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('saved using OS encryption'));
    assert.equal(await page.inputValue('#api-key'),'');
    const stored=JSON.parse(fs.readFileSync(path.join(profile,'owner.json'),'utf8'));
    assert.equal(JSON.stringify(stored).includes('tgg-fake-smoke-key'),false);
    const roundTrip=await application.evaluate(({safeStorage},encrypted)=>
      JSON.parse(safeStorage.decryptString(Buffer.from(encrypted,'base64'))).apiKey==='tgg-fake-smoke-key',stored.settings);
    assert.equal(roundTrip,true);
    await application.evaluate(()=>{global.fetch=async()=>({ok:true,json:async()=>({choices:[{message:{content:'<script>unsafe()</script> TGG smoke response'}}]})});});
    await page.click('#chat-tab');await page.fill('#prompt','Smoke test');await page.click('#send');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Response complete.');
    assert.equal(await page.locator('#messages script').count(),0);
    assert.match(await page.locator('#messages').textContent(),/<script>unsafe\(\)<\/script> TGG smoke response/);
    await page.click('#owner-tab');
    await page.selectOption('#provider','ollama');
    assert.equal(await page.locator('#api-key').isVisible(),false);
    await page.click('#settings-form button');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('saved using OS encryption'));
    await application.evaluate(()=>{global.fetch=async(url,options)=>{if(url!=='http://127.0.0.1:11434/api/chat'||options.headers.Authorization)throw Error('Local provider boundary failed');return {ok:true,json:async()=>({message:{content:'Local model smoke response'}})};};});
    await page.click('#chat-tab');await page.fill('#prompt','Local smoke test');await page.click('#send');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Response complete.');
    assert.match(await page.locator('#messages').textContent(),/Local model smoke response/);
    await page.click('#owner-tab');await page.selectOption('#provider','openai');
    await page.click('#owner-tab');await page.click('#lock');
    await page.fill('#api-key','tgg-fake-other-key');await page.click('#settings-form button');
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Unlock owner settings first'));
    // A signed packaged app can contact its real feed; test the disabled update path only in development.
    if(!process.env.TGG_TEST_EXE){await page.click('#update');await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('signed release'));}
    fs.mkdirSync(path.resolve(__dirname,'../test-results'),{recursive:true});
    await page.click('#chat-tab');await page.screenshot({path:path.resolve(__dirname,'../test-results/desktop.png')});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,checks:['real GUI','sandbox enabled','owner setup','OS encryption round trip','mocked chat rendered as text','owner lock','managed Source startup and repository creation'],backend:secure.backend}));
  } finally {
    if(application) await application.close();
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
