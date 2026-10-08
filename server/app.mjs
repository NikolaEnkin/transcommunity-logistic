import http from 'node:http';
import { isIP } from 'node:net';
import { readFile, stat, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { gzip as gzipCallback } from 'node:zlib';
import { content, serviceFields } from '../src/upgrades.mjs';
import { company, href } from '../src/content.mjs';
import { selectedDigitalScope } from '../src/digital-content.mjs';
import { renderErrorPage } from '../src/error-view.mjs';
const gzip=promisify(gzipCallback);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.xml':'application/xml'};
const limits={name:100,email:254,phone:50,service:30,message:1500,language:2,goods:200,volume:200,period:200,origin:200,destination:200,topic:200,market:200,goal:200,website:200,requestId:36};
const emailPattern=/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/;
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function validateEnquiry(input){
 const errors={},data={};
 if(!input||typeof input!=='object'||Array.isArray(input))return {errors:{form:'invalid'}};
 for(const key of Object.keys(input))if(!Object.hasOwn(limits,key)&&key!=='enhanced')errors.form='invalid';
 for(const [key,max] of Object.entries(limits)){
  if(input[key]!==undefined&&typeof input[key]!=='string'){errors[key]='invalid';continue;}
  const value=(input[key]||'').trim();
  if(value.length>max||/\p{Cc}/u.test(value.replaceAll('\n','').replaceAll('\r','').replaceAll('\t','')))errors[key]='length';
  data[key]=value;
 }
 for(const key of ['name','email','message'])if(!data[key])errors[key]='required';
 if(data.email&&!emailPattern.test(data.email))errors.email='email';
 if(!Object.hasOwn(content,data.language))errors.language='invalid';
 if(data.service&&!Object.hasOwn(serviceFields,data.service))errors.service='invalid';
 if(input.enhanced!==undefined&&input.enhanced!==true)errors.form='invalid';
 if(data.website)errors.form='invalid';
 if(data.requestId&&!uuidPattern.test(data.requestId))errors.form='invalid';
 const fields=Object.hasOwn(serviceFields,data.service)?serviceFields[data.service]:[];
 if(input.enhanced===true)for(const key of fields)if(!data[key])errors[key]='required';
 return {errors,data:{name:data.name,email:data.email,phone:data.phone,service:data.service,message:data.message,language:data.language,details:Object.fromEntries(fields.map(key=>[key,data[key]]))},requestId:data.requestId||randomUUID()};
}
async function readBody(req){
 let bytes=0;const chunks=[];
 for await(const chunk of req){bytes+=chunk.length;if(bytes>16384)throw Object.assign(new Error('Body too large'),{status:413});chunks.push(chunk);}
 const raw=Buffer.concat(chunks).toString('utf8');
 try{
  if(req.headers['content-type']?.split(';')[0]==='application/json')return JSON.parse(raw);
  if(req.headers['content-type']?.split(';')[0]==='application/x-www-form-urlencoded'){
   const params=new URLSearchParams(raw);if([...params.keys()].length!==new Set(params.keys()).size)throw new Error('Duplicate fields');return Object.fromEntries(params);
  }
  throw Object.assign(new Error('Unsupported content type'),{status:415});
 }catch(error){throw Object.assign(error,{status:error.status||400});}
}
export function createApp({root=resolve('dist'),inboxDir=resolve('.local/enquiries'),mode='local',transport,from,maxRequests=12,windowMs=15*60*1000,allowedOrigins=[],trustRenderProxy=false,indexable=false}={}){
 if(!['local','inbox','smtp','disabled'].includes(mode)||(mode==='smtp'&&(!transport||!from)))throw new Error('Invalid mail configuration');
 const publicOrigins=new Set(allowedOrigins),publicHosts=new Set(allowedOrigins.map(origin=>new URL(origin).host));
 const rates=new Map(),inFlight=new Map();
 const baseHeaders={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()','X-Robots-Tag':'noindex, nofollow'};
 if(indexable)delete baseHeaders['X-Robots-Tag'];
 // A rejected build read must produce a controlled response, never an unhandled rejection.
 const cspPromise=readFile(resolve(root,'_headers'),'utf8').then(text=>text.match(/Content-Security-Policy: (.+)/)?.[1]||"default-src 'self'").catch(()=>null);
 function respond(res,status,value,json=true,lang='bg'){
  res.setHeader('Cache-Control','no-store');
  if(json){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));return;}
  if([400,404,500].includes(status)){
   res.writeHead(status,{'Content-Type':'text/html; charset=utf-8'});
   res.end(renderErrorPage(status,lang));return;
  }
  const t=content[lang]||content.bg,f=t.upgrade.form;
  const message=value.ok?(value.mode==='local'?f.localSuccess:value.mode==='inbox'?f.inboxSuccess:f.success):(status===503?f.unavailable:status===422?t.contact.invalid:status===429?f.limited:f.failure);
  res.writeHead(status,{'Content-Type':'text/html; charset=utf-8'});
  res.end(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(t.contact.submit)} | ${company.name}</title><link rel="stylesheet" href="/assets/fonts.css"><link rel="stylesheet" href="/styles.css"></head><body><main class="container error-page"><h1>${escape(message)}</h1>${value.id?`<p>${escape(f.receipt)}: ${value.id}</p>`:''}<p><a class="button button-outline" href="${href(lang,'contacts')}">${escape(t.nav.contacts)}</a></p><p><a href="mailto:${company.email}">${company.email}</a></p></main></body></html>`);
 }
 async function accept(data,requestId){
  const digest=createHash('sha256').update(JSON.stringify(data)).digest('hex'),file=resolve(inboxDir,requestId+'.json');
  await mkdir(inboxDir,{recursive:true,mode:0o700});
  try{
   const previous=JSON.parse(await readFile(file,'utf8'));
   if(previous.digest!==digest)return {status:409,value:{ok:false,error:'idempotency-conflict'}};
   if(previous.state==='accepted')return {status:200,value:{ok:true,id:previous.id,mode:previous.mode}};
   return {status:502,value:{ok:false,error:'delivery-unconfirmed'}};
  }catch(error){if(error.code!=='ENOENT')throw error;}
  const record={id:randomUUID(),requestId,digest,createdAt:new Date().toISOString(),mode,state:'pending',...data};
  await writeFile(file,JSON.stringify(record,null,2),{flag:'wx',mode:0o600});
  if(mode==='smtp'){
   const t=content[data.language],service=data.service==='digital'?t.digital.nav:t.services.find(s=>s.id===data.service)?.title||t.contact.other;
   const text=[`Reference: ${record.id}`,`Language: ${data.language}`,`Service: ${service}`,`Name: ${data.name}`,`Email: ${data.email}`,`Phone: ${data.phone}`,...Object.entries(data.details).map(([k,v])=>`${t.upgrade.form.fields[k]}: ${v}`),'',data.message].join('\n');
   try{
    const result=await transport.sendMail({from,to:company.email,replyTo:{address:data.email,name:data.name.replace(/[\r\n]/g,' ')},subject:`Website enquiry — ${service}`,text,disableFileAccess:true,disableUrlAccess:true});
    if(!result.accepted?.map(String).includes(company.email))throw new Error('Recipient not accepted');
   }catch{
    record.state='delivery-unconfirmed';await writeFile(file,JSON.stringify(record,null,2),{mode:0o600});
    return {status:502,value:{ok:false,error:'delivery-unconfirmed'}};
   }
  }
  record.state='accepted';const temporary=file+'.tmp';
  await writeFile(temporary,JSON.stringify(record,null,2),{flag:'wx',mode:0o600});await rename(temporary,file);
  return {status:202,value:{ok:true,id:record.id,mode}};
 }
 const server=http.createServer(async(req,res)=>{
  for(const [k,v] of Object.entries(baseHeaders))res.setHeader(k,v);
  let json=true,lang='bg';
  try{
   const host=req.headers.host||'';
   if(req.url==='/healthz'&&['GET','HEAD'].includes(req.method)){
    const ready=Boolean(await cspPromise)&&await stat(resolve(root,'index.html')).then(s=>s.isFile()).catch(()=>false);
    respond(res,ready?200:503,{ok:ready});return;
   }
   // Loopback binding plus Host checks prevents local DNS-rebinding access.
   if(publicHosts.size?!publicHosts.has(host):!/^(127\.0\.0\.1|localhost):\d+$/.test(host)){respond(res,403,{ok:false,error:'host'});return;}
   const csp=await cspPromise;
   if(!csp)throw new Error('Build unavailable');
   res.setHeader('Content-Security-Policy',csp);
   const url=new URL(req.url,`http://${host}`);
   const locale=url.pathname.split('/')[1];
   lang=['en','fr','de'].includes(locale)?locale:'bg';
   json=url.pathname.startsWith('/api/');
   if(url.pathname==='/api/contact-config'&&req.method==='GET'){respond(res,200,{mode});return;}
   if(url.pathname==='/api/enquiries'){
    if(req.method!=='POST'){res.setHeader('Allow','POST');respond(res,405,{ok:false,error:'method'});return;}
    json=req.headers['content-type']?.split(';')[0]==='application/json';
    const expectedOrigin=publicHosts.size?`https://${host}`:`http://${host}`;
    if(req.headers.origin!==expectedOrigin||(publicOrigins.size&&!publicOrigins.has(req.headers.origin))||req.headers['sec-fetch-site']==='cross-site'){respond(res,403,{ok:false,error:'origin'},json);return;}
    const input=await readBody(req);
    lang=typeof input?.language==='string'&&Object.hasOwn(content,input.language)?input.language:'bg';
    if(mode==='disabled'){respond(res,503,{ok:false,error:'unavailable'},json,lang);return;}
    // Render's public edge overwrites CF-Connecting-IP; never trust caller-controlled X-Forwarded-For.
    const forwarded=trustRenderProxy&&req.headers['cf-connecting-ip'];
    const now=Date.now(),ip=typeof forwarded==='string'&&isIP(forwarded)?forwarded:req.socket.remoteAddress,rate=rates.get(ip);
    for(const [key,value] of rates)if(now-value.start>=windowMs)rates.delete(key);
    if(rate&&now-rate.start<windowMs&&rate.count>=maxRequests){res.setHeader('Retry-After',String(Math.ceil((windowMs-(now-rate.start))/1000)));respond(res,429,{ok:false,error:'rate-limit'},json,lang);return;}
    rates.set(ip,rate&&now-rate.start<windowMs?{...rate,count:rate.count+1}:{start:now,count:1});
    const checked=validateEnquiry(input);
    if(Object.keys(checked.errors).length){respond(res,422,{ok:false,errors:checked.errors},json,lang);return;}
    const previous=inFlight.get(checked.requestId)||Promise.resolve();
    const pending=previous.catch(()=>{}).then(()=>accept(checked.data,checked.requestId));inFlight.set(checked.requestId,pending);
    try{const result=await pending;respond(res,result.status,result.value,json,lang);}
    finally{if(inFlight.get(checked.requestId)===pending)inFlight.delete(checked.requestId);}
    return;
   }
   if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');respond(res,405,{ok:false,error:'method'});return;}
   let path;
   try{path=decodeURIComponent(url.pathname);}catch{throw Object.assign(new Error('Malformed address'),{status:400});}
   const errorRoute=path.match(/^\/(?:en\/|fr\/|de\/)?(400|404|500)\.html$/);
   let file=resolve(root,`.${path}`),status=errorRoute?Number(errorRoute[1]):200;
   const missingPage=resolve(root,lang==='bg'?'404.html':`${lang}/404.html`);
   if(file!==root&&!file.startsWith(root+sep)){respond(res,403,{ok:false,error:'path'});return;}
   if(path.split('/').some(p=>p.startsWith('.')||p.startsWith('_'))){file=missingPage;status=404;}
   try{if((await stat(file)).isDirectory())file=resolve(file,'index.html');}catch{file=missingPage;status=404;}
   let data=await readFile(file);const extension=extname(file);
   if(extension==='.html'){
    if(status===200 && /^\/(?:en\/|fr\/|de\/)?contacts\.html$/.test(path)){
     const requested=url.searchParams.get('service');
     if(requested && Object.hasOwn(serviceFields,requested)){
      let html=data.toString().replace(`<option value="${requested}">`,`<option value="${requested}" selected>`);
      if(requested==='digital'){
       const locale=path.split('/').length===3?path.split('/')[1]:'bg';
       const scope=selectedDigitalScope(url.searchParams,locale);
       if(scope)html=html.replace(/(<input id="goal"[^>]*)(>)/,(_,start,end)=>`${start} value="${escape(scope)}"${end}`);
      }
      data=Buffer.from(html);
     }
    }
    const bypass=/\bno-cache\b/i.test(req.headers['cache-control']||'')||/\bno-cache\b/i.test(req.headers.pragma||'');
    data=Buffer.from(data.toString().replace('<meta name="trcl-refresh" content="normal">',`<meta name="trcl-refresh" content="${bypass?'bypass':'normal'}">`));
    if(mode!=='local')for(const t of Object.values(content)){
     const f=t.upgrade.form;
     data=Buffer.from(data.toString().replace(`<p id="form-mode" class="form-mode">${escape(f.localNotice)}</p>`,`<p id="form-mode" class="form-mode">${escape(mode==='smtp'?f.smtpNotice:mode==='inbox'?f.inboxNotice:f.unavailable)}</p>`));
    }
    if(mode==='disabled')data=Buffer.from(data.toString().replace('<button class="button button-primary" type="submit">','<button class="button button-primary" type="submit" disabled>'));
    if(mode==='disabled')for(const t of Object.values(content))data=Buffer.from(data.toString().replace(escape(t.upgrade.form.noJs),escape(t.upgrade.form.unavailable)));
   }
   res.setHeader('Cache-Control',status>=400?'no-store':path.startsWith('/assets/')?'public, max-age=86400':'no-cache');res.setHeader('Content-Type',types[extension]||'application/octet-stream');
   if(/\bgzip\b/.test(req.headers['accept-encoding']||'')&&['.html','.css','.js','.xml','.txt'].includes(extension)){data=await gzip(data);res.setHeader('Content-Encoding','gzip');res.setHeader('Vary','Accept-Encoding');}
   res.writeHead(status);res.end(req.method==='HEAD'?undefined:data);
  }catch(error){if(!res.headersSent)respond(res,error.status||500,{ok:false,error:error.status?'request':'server'},json,lang);else res.end();}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;return server;
}
