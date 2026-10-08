const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {once}=require('node:events');
(async()=>{
 const {createApp}=await import('../server/app.mjs');
 const {content}=await import('../src/upgrades.mjs');
 const server=createApp();server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  await fs.mkdir('qa-artifacts',{recursive:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>sessionStorage.setItem('trcl.intro.seen','1'));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/');await page.waitForFunction(()=>document.querySelector('[data-hero-carousel]').dataset.ready==='true');
  await page.waitForFunction(()=>[...document.querySelectorAll('.hero-slide img')].every(i=>i.complete&&i.naturalWidth>0));
  const hero=page.locator('[data-hero-carousel]');assert.equal(await hero.getAttribute('data-interval'),'4000');
  assert.equal(await page.locator('.hero-slide').count(),3);
  assert.equal(await hero.locator('button, .carousel-controls, .hero-caption, [data-carousel-select]').count(),0,'No controls or floating caption in hero');
  assert.equal(await page.locator('.brand-slogan').textContent(),content.bg.hero.caption);
  assert.equal(await page.locator('.brand-slogan').evaluate(e=>e.previousElementSibling.matches('[data-hero-carousel]')&&e.nextElementSibling.id==='services'),true);
  await page.locator('.hero-inner').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));
  const bounds=await page.locator('.hero-copy').boundingBox();
  // Hover/focus no longer permanently stop an automatic-only background.
  await page.mouse.move(400,300);await page.locator('.hero-actions a').first().focus();
  for(const index of [1,2,0]){
   await page.waitForFunction(i=>document.querySelector('[data-hero-carousel]').dataset.index===String(i),index,{timeout:5500});
   assert.equal(await page.locator('.hero-slide[data-active]').count(),1);
   await page.waitForTimeout(1250);
   await page.screenshot({path:`qa-artifacts/carousel-slide-${index+1}.png`});
   assert.deepEqual(await page.locator('.hero-copy').boundingBox(),bounds,'Stable text while backgrounds rotate');
  }
  console.log('PASS: automatic 4-second 1 → 2 → 3 → 1 loop, soft transition, no controls/caption and separate complete slogan.');
  await page.evaluate(()=>scrollTo(0,1400));await page.waitForFunction(()=>document.querySelector('[data-hero-carousel]').dataset.running==='false');
  await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>document.querySelector('[data-hero-carousel]').dataset.running==='true');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await hero.getAttribute('data-running'),'false');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await hero.getAttribute('data-running'),'true');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('[data-hero-carousel]').dataset.rotation==='paused');
  for(const lang of ['bg','en','fr','de']){
   await page.goto(origin+(lang==='bg'?'/':`/${lang}/`));await page.waitForFunction(()=>document.querySelector('[data-hero-carousel]').dataset.ready==='true');
   assert.equal(await hero.getAttribute('data-rotation'),'paused');assert.equal(await page.locator('.brand-slogan').textContent(),content[lang].hero.caption);
   assert.equal(await hero.locator('button, .hero-caption').count(),0);
   const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze();assert.deepEqual(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`${lang}: axe`);
  }
  await page.waitForTimeout(4300);assert.equal(await hero.getAttribute('data-index'),'0','Reduced motion remains static beyond an interval');
  await page.setViewportSize({width:390,height:844});await page.goto(origin+'/');await page.screenshot({path:'qa-artifacts/carousel-mobile-final.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const nojs=await browser.newContext({javaScriptEnabled:false});const np=await nojs.newPage();await np.goto(origin+'/');assert(await np.locator('.hero-copy').isVisible());assert(await np.locator('.brand-slogan').isVisible());assert.equal(await np.locator('.hero-slide[data-active] img').evaluate(i=>i.naturalWidth>0),true);await nojs.close();
  for(const stalled of [false,true]){
   const broken=await browser.newContext();await broken.addInitScript(()=>sessionStorage.setItem('trcl.intro.seen','1'));
   const bp=await broken.newPage();await bp.route('**/hero-innovation.webp',stalled?()=>{}:r=>r.abort());await bp.goto(origin+'/',{waitUntil:'domcontentloaded'});
   await bp.waitForFunction(()=>document.querySelector('[data-carousel-slide="1"]').dataset.failed==='true',null,{timeout:10000});
   await bp.waitForFunction(()=>document.querySelector('[data-hero-carousel]').dataset.index==='2',null,{timeout:10000});assert(await bp.locator('.hero-copy').isVisible());await broken.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS: offscreen/hidden suspension, four locales, reduced motion, no JavaScript and failed/stalled image recovery.');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
