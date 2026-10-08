import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { languages, href } from '../src/content.mjs';
import { content, allPages as pages } from '../src/upgrades.mjs';
const root=resolve('dist');
const headers=await readFile(resolve(root,'_headers'),'utf8');
const sitemap=await readFile(resolve(root,'sitemap.xml'),'utf8');
let refs=0;
for(const lang of Object.keys(languages)) {
  const titles=new Set();
  assert.equal(content[lang].services.length,4);
  for(const p of pages) {
    const url=href(lang,p);
    const path=resolve(root,`.${url.endsWith('/')?url+'index.html':url}`);
    const html=await readFile(path,'utf8');
    assert(html.includes(`<html lang="${lang}">`),`${url}: language`);
    assert.equal((html.match(/<h1[ >]/g)||[]).length,1,`${url}: one h1`);
    const title=html.match(/<title>(.*?)<\/title>/)[1];
    assert(!titles.has(title),`${url}: distinct localized title`);titles.add(title);
    assert(sitemap.includes(`${url}</loc>`),`${url}: sitemap entry`);
    const json=html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1];
    const structured=JSON.parse(json);
    assert(headers.includes(`'sha256-${createHash('sha256').update(json).digest('base64')}'`),`${url}: CSP hash`);
    const service=content[lang].services.find(s=>s.page===p);
    if(service)assert.equal(structured['@graph'].find(x=>x['@type']==='Service').name,service.title,`${url}: service structured data`);
    if(p==='contacts')assert(html.includes('action="/api/enquiries" method="post"'),`${url}: server enquiry form`);
    assert(html.includes('href="tel:+359888710053"'),`${url}: telephone`);
    assert(html.includes('office@transcommunitylogistic.com'),`${url}: email`);
    for(const l of Object.keys(languages)) assert(html.includes(`hreflang="${l}" href="`),`${url}: alternate ${l}`);
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size,`${url}: unique ids`);
    for(const m of html.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
      const link=m[1].split('?')[0];
      if(!link.startsWith('/'))continue;
      const target=resolve(root,`.${link.endsWith('/')?link+'index.html':link}`);
      assert((await stat(target)).isFile(),`${url}: missing ${link}`);
      refs++;
    }
    for(const m of html.matchAll(/<label for="([^"]+)"/g)) assert(ids.includes(m[1]),`${url}: label ${m[1]}`);
  }
}
const source=await readFile('src/main.js','utf8');
assert(!/innerHTML|eval\(/.test(source),'No dynamic HTML injection');
console.log(`Checked ${pages.length*Object.keys(languages).length} localized pages, ${refs} local references, source contacts, language alternatives, unique IDs and form labels.`);
