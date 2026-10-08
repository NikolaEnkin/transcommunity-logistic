import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, stat, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import net from 'node:net';
import http from 'node:http';
import nodemailer from 'nodemailer';
import { createApp } from '../server/app.mjs';
import { mailConfig } from '../server/mail.mjs';
const valid=()=>({name:'QA Test',email:'qa@example.test',phone:'',service:'',message:'Local integration test',language:'bg',enhanced:true,requestId:randomUUID()});
async function fixture(t,options={}){
 const inboxDir=await mkdtemp(join(tmpdir(),'trcl-api-')),server=createApp({inboxDir,maxRequests:100,...options});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin=`http://127.0.0.1:${server.address().port}`;
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(inboxDir,{recursive:true,force:true});});
 const post=(data,extra={})=>fetch(origin+'/api/enquiries',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...extra.headers},body:typeof data==='string'?data:JSON.stringify(data)});
 return {origin,post,inboxDir};
}
test('local receipt, private persistence, concurrent/restart idempotency and conflicts',async t=>{
 const f=await fixture(t),data=valid();
 const responses=await Promise.all([f.post(data),f.post(data)]),receipts=await Promise.all(responses.map(r=>r.json()));
 assert.deepEqual(responses.map(r=>r.status),[202,200]);assert.equal(receipts[0].id,receipts[1].id);assert.equal(receipts[0].mode,'local');
 const files=await readdir(f.inboxDir);assert.equal(files.length,1);
 const file=join(f.inboxDir,files[0]);assert.equal((await stat(file)).mode&0o777,0o600);assert.equal((await stat(f.inboxDir)).mode&0o777,0o700);
 const record=JSON.parse(await readFile(file));assert.equal(record.state,'accepted');assert.equal(record.email,data.email);
 assert.equal((await f.post({...data,message:'Changed payload'})).status,409);
 const restarted=await fixture(t,{inboxDir:f.inboxDir});const result=await restarted.post(data);assert.equal(result.status,200);assert.equal((await result.json()).id,receipts[0].id);
});
test('required/conditional/type/length/email validation rejects before persistence',async t=>{
 const f=await fixture(t);
 for(const patch of [{name:''},{email:'invalid'},{email:'x@example.test\r\nBcc: x@y.test'},{message:''},{name:42},{message:'a'.repeat(1501)},{goal:'a'.repeat(201)},{service:'constructor'},{language:'toString'},{extra:'x'},{website:'bot'},{requestId:'../escape'}])assert.equal((await f.post({...valid(),...patch})).status,422,JSON.stringify(patch));
 for(const [service,fields] of Object.entries({warehousing:['goods','volume','period'],trade:['goods','origin','destination'],partners:['goods','origin','destination'],consulting:['topic','market'],digital:['goal']})){
  const data={...valid(),service};const bad=await f.post(data);assert.equal(bad.status,422);assert.deepEqual(Object.keys((await bad.json()).errors),fields);
  for(const key of fields)data[key]='Test detail';assert.equal((await f.post(data)).status,202);
 }
 assert.equal((await readdir(f.inboxDir)).length,5);
});
test('cross-origin, Host, methods, malformed/oversized body, content type and no CORS',async t=>{
 const f=await fixture(t);
 assert.equal((await f.post(valid(),{headers:{Origin:'https://external.example'}})).status,403);
 const hostStatus=await new Promise((resolve,reject)=>{const req=http.get(f.origin+'/',{headers:{Host:'external.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});assert.equal(hostStatus,403);
 assert.equal((await fetch(f.origin+'/api/enquiries')).status,405);
 assert.equal((await f.post('{')).status,400);
 assert.equal((await f.post('x'.repeat(17000))).status,413);
 assert.equal((await f.post('text',{headers:{'Content-Type':'text/plain'}})).status,415);
 const config=await fetch(f.origin+'/api/contact-config');assert.deepEqual(await config.json(),{mode:'local'});assert.equal(config.headers.get('access-control-allow-origin'),null);
 const html=await fetch(f.origin+'/');assert(html.headers.get('content-security-policy').includes("form-action 'self'"));assert.equal(html.headers.get('x-robots-tag'),'noindex, nofollow');
 assert.equal((await fetch(f.origin+'/.env')).status,404);assert.equal((await fetch(f.origin+'/_headers')).status,404);
});
test('rate limiting with retry guidance',async t=>{
 const f=await fixture(t,{maxRequests:2});await f.post(valid());await f.post(valid());const blocked=await f.post(valid());assert.equal(blocked.status,429);assert(Number(blocked.headers.get('retry-after'))>0);
});
test('localized HTML error recovery, actual malformed address and server failure preserve statuses',async t=>{
 const f=await fixture(t);
 for(const lang of ['bg','en','fr','de'])for(const status of [400,404,500]){
  const prefix=lang==='bg'?'':`/${lang}`;
  const response=await fetch(`${f.origin}${prefix}/${status}.html`),html=await response.text();
  assert.equal(response.status,status);assert(response.headers.get('content-type').startsWith('text/html'));
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert(html.includes(`<html lang="${lang}">`));assert(html.includes(`data-error="${status}"`));
  assert(html.includes('data-brand-logo'));assert(html.includes('noindex, nofollow'));
  assert(html.includes(`class="button button-primary" href="${prefix}/"`));
 }
 const missing=await fetch(f.origin+'/fr/does-not-exist');assert.equal(missing.status,404);assert((await missing.text()).includes('<html lang="fr">'));
 const malformed=await fetch(f.origin+'/de/%E0%A4%A');assert.equal(malformed.status,400);assert((await malformed.text()).includes('<html lang="de">'));
 const root=await mkdtemp(join(tmpdir(),'trcl-missing-index-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await writeFile(join(root,'_headers'),"Content-Security-Policy: default-src 'self'");
 const broken=await fixture(t,{root});const failure=await fetch(broken.origin+'/');
 assert.equal(failure.status,500);const html=await failure.text();assert(html.includes('data-error="500"'));assert(html.includes('data-brand-logo'));assert(!html.includes('ENOENT'));assert(!html.includes(root));
 const api=await f.post('{');assert.equal(api.status,400);assert.equal((await api.json()).error,'request');
 const head=await fetch(f.origin+'/500.html',{method:'HEAD'});assert.equal(head.status,500);assert.equal(await head.text(),'');
});
test('no-JavaScript HTML form uses localized receipt and never renders submitted HTML',async t=>{
 const f=await fixture(t),data=valid();delete data.enhanced;data.language='fr';data.message='<script>alert(1)</script>';
 const response=await f.post(new URLSearchParams(data).toString(),{headers:{'Content-Type':'application/x-www-form-urlencoded'}});
 assert.equal(response.status,202);const html=await response.text();assert(html.includes('enregistrée localement'));assert(!html.includes('<script>'));assert(html.includes('lang="fr"'));
});
test('SMTP failure never claims success and retry cannot send the same request twice',async t=>{
 let calls=0;const f=await fixture(t,{mode:'smtp',from:'site@example.test',transport:{async sendMail(){calls++;throw new Error('Temporary SMTP failure');}}});
 const data=valid();assert.equal((await f.post(data)).status,502);assert.equal((await f.post(data)).status,502);assert.equal(calls,1);
 const record=JSON.parse(await readFile(join(f.inboxDir,(await readdir(f.inboxDir))[0])));assert.equal(record.state,'delivery-unconfirmed');
});
test('real Nodemailer SMTP exchange against an isolated loopback sink, fixed recipient and Reply-To',async t=>{
 let message='';const recipients=[];
 const smtp=net.createServer(socket=>{
  socket.setEncoding('utf8');socket.write('220 localhost ESMTP test\r\n');let buffer='',inData=false;
  socket.on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+2);
   if(inData){if(line==='.'){inData=false;socket.write('250 Message accepted\r\n');}else message+=line+'\n';continue;}
   if(/^EHLO|^HELO/.test(line))socket.write('250 localhost\r\n');
   else if(/^MAIL FROM/.test(line))socket.write('250 OK\r\n');
   else if(/^RCPT TO/.test(line)){recipients.push(line);socket.write('250 OK\r\n');}
   else if(line==='DATA'){inData=true;socket.write('354 End with dot\r\n');}
   else if(line==='QUIT'){socket.end('221 Bye\r\n');}else socket.write('250 OK\r\n');
  }});
 });smtp.listen(0,'127.0.0.1');await once(smtp,'listening');t.after(()=>new Promise(r=>smtp.close(r)));
 // Plaintext is limited to this test sink; the configured application always requires TLS.
 const transport=nodemailer.createTransport({host:'127.0.0.1',port:smtp.address().port,ignoreTLS:true,secure:false});
 const f=await fixture(t,{mode:'smtp',from:'site@example.test',transport});const data=valid();
 const result=await f.post(data);assert.equal(result.status,202);assert.equal((await result.json()).mode,'smtp');
 assert.deepEqual(recipients,['RCPT TO:<office@transcommunitylogistic.com>']);assert(message.includes('Reply-To: QA Test <qa@example.test>'));assert(message.includes('Local integration test'));
 assert.equal((await f.post(data)).status,200);assert.equal(recipients.length,1);
});
test('SMTP configuration fails closed and requires TLS',()=>{
 assert.deepEqual(mailConfig({}),{mode:'local'});assert.throws(()=>mailConfig({MAIL_MODE:'smtp'}));
 const config=mailConfig({MAIL_MODE:'smtp',SMTP_HOST:'smtp.example.test',SMTP_USER:'test',SMTP_PASS:'test',SMTP_FROM:'site@example.test',SMTP_PORT:'587'});
 assert.equal(config.transport.options.requireTLS,true);assert.equal(config.transport.options.disableFileAccess,true);assert.equal(config.transport.options.disableUrlAccess,true);
});

test('digital enquiry labels, safe localized scope and static contact prefill',async t=>{
 const f=await fixture(t);
 for(const [lang,expected] of Object.entries({bg:'Уебсайтове, CRM системи',en:'Websites, CRM systems',fr:'Sites web, Systèmes CRM',de:'Websites, CRM-Systeme'})){
  const response=await fetch(f.origin+(lang==='bg'?'':`/${lang}`)+'/contacts.html?service=digital&solutions=web&solutions=crm&solutions=web&solutions=%3Cscript%3E');
  const html=await response.text();assert.equal(response.status,200);assert(html.includes('<option value="digital" selected>'));assert(html.includes(`value="${expected}"`));assert(!html.includes('value="<script>"'));
  const data={...valid(),language:lang,service:'digital',goal:expected};assert.equal((await f.post(data)).status,202);
 }
 assert.equal((await readdir(f.inboxDir)).length,4);
 let mail;const smtp=await fixture(t,{mode:'smtp',from:'site@example.test',transport:{async sendMail(message){mail=message;return {accepted:['office@transcommunitylogistic.com']};}}});
 assert.equal((await smtp.post({...valid(),service:'digital',goal:'CRM'})).status,202);assert(mail.subject.includes('Дигитални решения'));assert(mail.text.includes('CRM'));
});
