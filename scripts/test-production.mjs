import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createApp } from '../server/app.mjs';
import { productionConfig } from '../server/production.mjs';
import { content, allPages } from '../src/upgrades.mjs';
import { href } from '../src/content.mjs';

const publicOrigin='https://transcommunity-preview.onrender.com';
async function fixture(t,options={}){
 const inboxDir=await mkdtemp(join(tmpdir(),'trcl-production-'));
 const server=createApp({allowedOrigins:[publicOrigin],mode:'disabled',inboxDir,...options});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(inboxDir,{recursive:true,force:true});});
 const request=(path,options={})=>new Promise((done,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port:server.address().port,path,method:options.method||'GET',headers:{Host:new URL(publicOrigin).host,...options.headers}},res=>{
   const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>done({status:res.statusCode,headers:res.headers,text:Buffer.concat(chunks).toString()}));
  });req.on('error',reject);req.end(options.body);
 });
 const post=(data,headers={})=>request('/api/enquiries',{method:'POST',headers:{'Content-Type':'application/json',Origin:publicOrigin,...headers},body:JSON.stringify(data)});
 return {request,post,inboxDir};
}
const data=()=>({name:'Test',email:'qa@example.test',message:'Production integration test',language:'en',requestId:randomUUID()});

test('production config uses Render URL, defaults to disabled and rejects unsafe origins/storage',()=>{
 const config=productionConfig({RENDER_EXTERNAL_URL:publicOrigin,RENDER:'true'});
 assert.equal(config.port,10000);assert.equal(config.app.mode,'disabled');assert.equal(config.app.trustRenderProxy,true);
 assert.deepEqual(config.app.allowedOrigins,[publicOrigin]);
 for(const patch of [{},{APP_ORIGIN:'http://example.test'},{APP_ORIGIN:'https://example.test/path'},{APP_ORIGIN:'https://user:pass@example.test'},{APP_ORIGIN:publicOrigin,PORT:'0'},{APP_ORIGIN:publicOrigin,MAIL_MODE:'local'},{APP_ORIGIN:publicOrigin,MAIL_MODE:'inbox'},{APP_ORIGIN:publicOrigin,MAIL_MODE:'inbox',PERSISTENT_STORAGE:'true',ENQUIRY_DIR:resolve('dist/private')}])assert.throws(()=>productionConfig(patch));
 const inbox=productionConfig({APP_ORIGIN:publicOrigin,MAIL_MODE:'inbox',PERSISTENT_STORAGE:'true',ENQUIRY_DIR:'/var/data/enquiries'});
 assert.equal(inbox.app.mode,'inbox');assert.equal(inbox.app.inboxDir,'/var/data/enquiries');
 assert.equal(inbox.app.trustRenderProxy,false);
});

test('Render health checks allow internal Host, reflect missing build and support HEAD',async t=>{
 const f=await fixture(t);
 const health=await f.request('/healthz',{headers:{Host:'internal.render'}});
 assert.equal(health.status,200);assert.deepEqual(JSON.parse(health.text),{ok:true});
 assert.equal(health.headers['cache-control'],'no-store');
 assert.equal((await f.request('/healthz',{method:'HEAD'})).text,'');
 const root=await mkdtemp(join(tmpdir(),'trcl-unready-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await writeFile(join(root,'_headers'),"Content-Security-Policy: default-src 'self'");
 const broken=await fixture(t,{root});assert.equal((await broken.request('/healthz')).status,503);
 const noBuild=await fixture(t,{root:join(root,'missing')});assert.equal((await noBuild.request('/healthz')).status,503);
});

test('all 40 pages serve behind HTTPS proxy; safe headers, errors and refresh hints remain',async t=>{
 const f=await fixture(t);
 for(const lang of Object.keys(content))for(const page of allPages){
  const response=await f.request(href(lang,page));assert.equal(response.status,200);
  assert(response.text.includes(`<html lang="${lang}">`));assert(response.headers['content-security-policy'].includes("form-action 'self'"));
  assert.equal(response.headers['x-robots-tag'],'noindex, nofollow');
 }
 for(const path of ['/404.html','/en/500.html','/fr/400.html','/de/missing','/.env','/_headers'])assert.equal((await f.request(path)).status,path.includes('500')?500:path.includes('400')?400:404);
 const hard=await f.request('/',{headers:{'Cache-Control':'no-cache'}});assert(hard.text.includes('name="trcl-refresh" content="bypass"'));
 assert((await f.request('/')).text.includes('name="trcl-refresh" content="normal"'));
});

test('unknown hosts and cross-origin POSTs remain blocked despite forged proxy headers',async t=>{
 const f=await fixture(t);
 assert.equal((await f.request('/',{headers:{Host:'attacker.example','X-Forwarded-Host':new URL(publicOrigin).host}})).status,403);
 for(const origin of ['https://attacker.example','http://transcommunity-preview.onrender.com','null'])assert.equal((await f.post(data(),{Origin:origin,'X-Forwarded-Proto':'https'})).status,403);
 assert.equal((await f.post(data(),{'Sec-Fetch-Site':'cross-site'})).status,403);
});

test('free preview disables enquiry UI and native submissions without writing any record in every language',async t=>{
 const f=await fixture(t);
 assert.deepEqual(JSON.parse((await f.request('/api/contact-config')).text),{mode:'disabled'});
 for(const lang of Object.keys(content)){
  const response=await f.request(href(lang,'contacts'));
  assert(response.text.includes(`<p id="form-mode" class="form-mode">${content[lang].upgrade.form.unavailable}</p>`));
  assert(response.text.includes('type="submit" disabled>'));
  assert(response.text.includes('href="tel:+359888710053"'));assert(response.text.includes('href="mailto:office@transcommunitylogistic.com"'));
  assert(!response.text.includes(`<p class="form-note">${content[lang].upgrade.form.noJs}</p>`));
  const native=await f.request('/api/enquiries',{method:'POST',headers:{Origin:publicOrigin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...data(),language:lang}).toString()});
  assert.equal(native.status,503);assert(native.text.includes(`<html lang="${lang}">`));assert(native.text.includes(content[lang].upgrade.form.unavailable));
 }
 assert.equal((await f.post(data())).status,503);assert.deepEqual(await readdir(f.inboxDir),[]);
});

test('persistent inbox receipts are honest, private and idempotent; only Render edge IP is trusted',async t=>{
 const f=await fixture(t,{mode:'inbox',trustRenderProxy:true,maxRequests:1});
 const record=data();const headers={'CF-Connecting-IP':'192.0.2.1','X-Forwarded-For':'spoofed'};
 const first=await f.post(record,headers);assert.equal(first.status,202);assert.equal(JSON.parse(first.text).mode,'inbox');
 const throttled=await f.post(data(),{...headers,'X-Forwarded-For':'192.0.2.99'});assert.equal(throttled.status,429);
 const duplicate=await f.post(record,{'CF-Connecting-IP':'192.0.2.2'});assert.equal(duplicate.status,200);
 const files=await readdir(f.inboxDir);assert.equal(files.length,1);assert.equal(JSON.parse(await readFile(join(f.inboxDir,files[0]))).state,'accepted');
 const local=await fixture(t,{mode:'inbox',maxRequests:1});assert.equal((await local.post(data(),headers)).status,202);
 assert.equal((await local.post(data(),{'CF-Connecting-IP':'192.0.2.9'})).status,429);
});
