import http from 'node:http';
import path from 'node:path';
import {readFile,stat,realpath} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {pathToFileURL} from 'node:url';
export function createHub({root=process.env.TGG_HUB_ROOT||'/workspace/.state/tgg-hub'}={}) {
  return http.createServer(async(req,res)=>{
    const reply=(status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'",'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:body);};
    try {
      if(!['GET','HEAD'].includes(req.method))return reply(405,JSON.stringify({error:'Publishing requires the owner CLI on the server.'}));
      const pathname=new URL(req.url,'http://localhost').pathname;
      if(pathname==='/health')return reply(200,JSON.stringify({ok:true,service:'tgg-hub'}));
      let releases=[];
      try{releases=JSON.parse(await readFile(path.join(root,'index.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
      if(pathname==='/v1/releases')return reply(200,JSON.stringify({releases}));
      if(pathname==='/') {
        const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        return reply(200,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TGGhub</title><style>body{background:#081725;color:#edf5ff;font:18px system-ui;max-width:850px;margin:60px auto;padding:24px}a{color:#71d6ff}article{border:1px solid #345;padding:24px;margin:20px 0}small{overflow-wrap:anywhere}</style><h1>TGGhub</h1><p>TGG AI Ultra · Windows downloads</p>${releases.length?releases.map(r=>`<article><h2>${escape(r.version)}</h2><p>${r.trusted?'Signed release':'Unsigned engineering preview — Windows may show security warnings. Automatic updates are disabled.'}</p><p><a href="/releases/${escape(r.version)}/${escape(r.file)}">Download Windows installer</a></p><small>SHA-256: ${escape(r.sha256)}</small></article>`).join(''):'<p>No releases published yet.</p>'}</html>`,'text/html; charset=utf-8');
      }
      let file;
      if(pathname==='/updates/latest.yml')file=path.join(root,'latest.yml');
      else {
        const match=pathname.match(/^\/(?:releases|updates)\/(\d+\.\d+\.\d+)\/(TGG-AI-Ultra-Setup-\d+\.\d+\.\d+-x64\.exe(?:\.blockmap)?)$/);
        if(!match||!releases.some(r=>r.version===match[1]&&(match[2]===r.file||match[2]===r.file+'.blockmap')))return reply(404,'{"error":"Not found"}');
        file=path.join(root,'releases',match[1],match[2]);
      }
      const base=await realpath(root);const resolved=await realpath(file);
      if(!resolved.startsWith(base+path.sep))return reply(404,'{}');
      const info=await stat(resolved);if(!info.isFile())return reply(404,'{}');
      let start=0,end=info.size-1,status=200;
      if(req.headers.range){const range=req.headers.range.match(/^bytes=(\d+)-(\d*)$/);if(!range)return reply(416,'{}');start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),end):end;if(start>end||start>=info.size){res.setHeader('Content-Range',`bytes */${info.size}`);return reply(416,'{}');}status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);}
      res.writeHead(status,{'Content-Type':file.endsWith('.yml')?'text/yaml':'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Cache-Control':file.endsWith('.yml')?'no-cache':'public, max-age=31536000, immutable'});
      if(req.method==='HEAD')return res.end();
      const stream=createReadStream(resolved,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
    }catch(e){if(res.headersSent)return res.destroy();reply(e.code==='ENOENT'?404:500,JSON.stringify({error:e.code==='ENOENT'?'Not found':'Release store unavailable'}));}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const server=createHub();server.listen(Number(process.env.TGG_HUB_PORT||10040),process.env.TGG_HUB_HOST||'127.0.0.1',()=>console.log('TGGhub ready'));}
