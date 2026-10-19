const {test}=require('node:test');const assert=require('node:assert/strict');
const {chromium}=require('../tgg-desktop/node_modules/playwright');
const http=require('node:http');const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
const {spawn}=require('node:child_process');const {once}=require('node:events');
const listen=async server=>{server.listen(0,'127.0.0.1');await once(server,'listening');return server.address().port;};
test('Source dashboard works at root and a proxy prefix; API failures do not masquerade as zero repositories',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tgg-source-ui-'));
 const reservation=http.createServer();const port=await listen(reservation);await new Promise(resolve=>reservation.close(resolve));
 const child=spawn(process.execPath,['tgg-source/server.mjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,TGG_SOURCE_ROOT:root,TGG_SOURCE_HOST:'127.0.0.1',TGG_SOURCE_PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let output='';child.stderr.on('data',data=>output+=data);child.stdout.on('data',()=>{});
 let browser,proxy;
 try{
  const base=`http://127.0.0.1:${port}`;let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
  assert.ok(ready,output);
  const html=await fs.readFile(path.resolve(__dirname,'../tgg-source/index.html'),'utf8');const requests=[];
  proxy=http.createServer((request,response)=>{
   requests.push(request.url);
   if(request.url.startsWith('/source/')){
    const upstream=http.request(base+request.url.slice('/source'.length),{method:request.method,headers:request.headers},result=>{response.writeHead(result.statusCode,result.headers);result.pipe(response);});
    upstream.on('error',()=>{response.writeHead(502);response.end();});request.pipe(upstream);return;
   }
   if(request.url==='/static/index.html'||request.url.startsWith('/fallback/')){response.writeHead(200,{'content-type':'text/html'});response.end(html);return;}
   response.writeHead(404,{'content-type':'text/plain'});response.end('Not found');
  });const proxyBase=`http://127.0.0.1:${await listen(proxy)}`;
  browser=await chromium.launch({executablePath:process.env.TGG_CHROMIUM||'/usr/bin/chromium',headless:true,chromiumSandbox:true,args:['--disable-setuid-sandbox']});
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/index.html');await page.waitForFunction(()=>document.querySelector('#repoCount').textContent==='0');
  assert.match(await page.locator('#repos').textContent(),/No repositories yet/);
  await page.goto(proxyBase+'/source/');await page.waitForFunction(()=>document.querySelector('#repoCount').textContent==='0');
  await page.fill('#newRepo','smoke-repository');await page.locator('button').filter({hasText:/^Create$/}).click();
  await page.waitForFunction(()=>document.querySelector('#repoCount').textContent==='1');
  await page.waitForFunction(()=>document.querySelector('#repoTitle').textContent==='smoke-repository');
  assert.equal((await (await fetch(base+'/v1/repos')).json()).repositories[0].name,'smoke-repository');
  assert.ok(requests.includes('/source/v1/repos'));assert.ok(!requests.includes('/v1/repos'));
  await page.goto(base+'/');await page.waitForFunction(()=>document.querySelector('#repoCount').textContent==='1');
  const missing=await page.evaluate(async()=>{try{await api('/v1/repos/missing');return null;}catch(error){return error.message;}});
  assert.equal(missing,'repo_not_found','A missing repository must keep its real server error');
  await page.goto(proxyBase+'/static/index.html');await page.waitForFunction(()=>document.querySelector('#repoCount').textContent==='Unavailable');
  assert.match(await page.locator('#repos').textContent(),/Repository API not found at \/static\/v1\/repos/);
  await page.goto(proxyBase+'/fallback/index.html');await page.waitForFunction(()=>document.querySelector('#repoCount').textContent==='Unavailable');
  assert.match(await page.locator('#repos').textContent(),/unexpected response/);
  assert.deepEqual(errors,[]);
 }finally{
  if(browser)await browser.close();
  if(proxy){proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve));}
  if(child.exitCode===null){child.kill();await once(child,'exit');}
  await fs.rm(root,{recursive:true,force:true});
 }
});
