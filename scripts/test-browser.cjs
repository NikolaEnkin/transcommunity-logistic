const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {once}=require('node:events');
(async()=>{
 const {createApp}=await import('../server/app.mjs');
 const {allPages,content}=await import('../src/upgrades.mjs');
 const {languages,href}=await import('../src/content.mjs');
 const inboxDir=await fs.mkdtemp(path.join(os.tmpdir(),'trcl-browser-'));
 const server=createApp({inboxDir,maxRequests:100});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const issues=[],errors=[],results=[];
 await fs.mkdir('qa-artifacts',{recursive:true});
 try{
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(m.text());});
  for(const width of [390,1440]){
   await page.setViewportSize({width,height:960});
   for(const lang of Object.keys(languages))for(const p of allPages){
    const route=href(lang,p);const response=await page.goto(base+route);assert.equal(response.status(),200);
    await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.documentElement.dataset.introState!=='loading');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    if(overflow)issues.push({route,width,overflow});
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    for(const l of Object.keys(languages))assert.equal(await page.locator(`.language-options a[lang="${l}"]`).getAttribute('href'),href(l,p));
    if(width===390){const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze();if(scan.violations.length)issues.push({route,width,axe:scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});}
    if(lang==='bg'&&['index','warehousing','contacts','digital-solutions'].includes(p)) { await page.screenshot({path:`qa-artifacts/${p}-${width}.png`,fullPage:true}); if(p==='index')await page.screenshot({path:`qa-artifacts/home-fold-${width}.png`}); }
    results.push({route,width});
   }
   console.log(`Checked all ${allPages.length*Object.keys(languages).length} pages at ${width}px`);
  }
  for(const width of [320,768]){
   await page.setViewportSize({width,height:960});
   for(const lang of Object.keys(languages))for(const p of allPages){
    await page.goto(base+href(lang,p));await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>document.documentElement.style.fontSize=`${parseFloat(getComputedStyle(document.documentElement).fontSize)*2}px`);
    const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='absolute').slice(0,8).map(e=>[e.tagName,e.className,e.getBoundingClientRect().right])}));
    if(overflow.scroll>width+1)issues.push({route:href(lang,p),width,textZoom:overflow});
   }
   console.log(`Checked 200% text on all ${allPages.length*Object.keys(languages).length} pages at ${width}px`);
  }
  // Sticky navigation changes at the actual reading-surface boundary in both directions.
  // Locator.click's scrollIntoView can scroll sticky descendants to their original
  // layout position. Click the already-visible summary as a visitor would.
  async function clickStickySummary(selector){
   const box=await page.locator(selector).boundingBox();assert(box);
   await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  }
  for(const width of [390,1440])for(const lang of Object.keys(languages)){
   await page.setViewportSize({width,height:960});await page.goto(base+href(lang,'index'));await page.evaluate(()=>document.fonts.ready);
   const header=page.locator('.site-header');await page.waitForFunction(()=>document.querySelector('.site-header').dataset.tone==='light');
   const height=await header.evaluate(e=>e.getBoundingClientRect().height);
   const boundary=await page.locator('.brand-slogan').evaluate(e=>e.getBoundingClientRect().top+scrollY);
   await page.evaluate(y=>scrollTo(0,y),boundary-height-4);await page.waitForTimeout(60);assert.equal(await header.getAttribute('data-tone'),'light');
   await page.evaluate(y=>scrollTo(0,y),boundary-height+4);await page.waitForFunction(()=>document.querySelector('.site-header').dataset.tone==='dark');
   assert.equal(await header.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(11, 32, 52)');
   assert.equal(await header.evaluate(e=>e.getBoundingClientRect().height),height,'Theme must not change header geometry');
   const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze();assert.deepEqual(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],`${lang}/${width}: dark header axe`);
   await clickStickySummary('.language-picker summary');assert(await page.locator('.language-options').isVisible());assert.equal(await header.getAttribute('data-tone'),'dark');await page.keyboard.press('Escape');
   const picker=width===390?'.mobile-menu':'.services-picker';await clickStickySummary(`${picker} summary`);assert.equal(await header.getAttribute('data-tone'),'dark');
   const menuScan=await new AxeBuilder({page}).include('.site-header').withTags(['wcag2a','wcag2aa','wcag21aa','best-practice']).analyze();assert.deepEqual(menuScan.violations.map(v=>v.id),[],`${lang}/${width}: open menu contrast`);await page.keyboard.press('Escape');
   if(lang==='bg')await page.screenshot({path:`qa-artifacts/header-dark-${width}.png`});
   await page.reload();await page.waitForFunction(()=>document.querySelector('.site-header').dataset.tone==='dark');
   await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>document.querySelector('.site-header').dataset.tone==='light');
   // A middle dark section can reach the header on tall screens; the short
   // home contact banner near the footer cannot always reach it at max scroll.
   await page.goto(base+href(lang,'about'));
   await page.locator('.mission-section').evaluate(e=>scrollTo(0,e.getBoundingClientRect().top+scrollY));await page.waitForFunction(()=>document.querySelector('.site-header').dataset.tone==='light');
  }
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(base+'/');
  assert((await page.locator('.site-header').evaluate(e=>getComputedStyle(e).transitionDuration)).includes('0.45s'));
  await page.locator('.brand-slogan').evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:'instant'}));await page.waitForTimeout(600);
  assert.equal(await page.locator('.site-header').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(11, 32, 52)');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.site-header').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  console.log('Checked adaptive header boundaries, reverse scrolling, restored scroll, menus, contrast and motion preferences in four languages.');
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/en/');
  await page.locator('[data-service-tab="trade"]').click();assert(await page.locator('#service-trade').isVisible());await page.keyboard.press('ArrowRight');assert(await page.locator('#service-partners').isVisible());
  await page.locator('.mobile-menu summary').click();assert(await page.locator('.mobile-nav').isVisible());await page.keyboard.press('Escape');assert(!(await page.locator('.mobile-nav').isVisible()));
  await page.locator('.language-picker summary').click();await page.locator('.language-options a[lang="fr"]').click();assert.equal(await page.locator('html').getAttribute('lang'),'fr');
  await page.setViewportSize({width:1440,height:960});await page.locator('.services-picker summary').click();await page.keyboard.press('Escape');assert(!(await page.locator('.services-options').isVisible()));
  for(const lang of Object.keys(languages)){
   await page.goto(base+href(lang,'contacts')+'?service=trade');await page.waitForFunction(()=>!document.querySelector('[type="submit"]').disabled);
   assert.equal(await page.locator('#service').inputValue(),'trade');assert(await page.locator('#origin').isVisible());assert(!(await page.locator('#volume').isVisible()));
   await page.locator('[type="submit"]').click();assert.equal(await page.locator('[aria-invalid="true"]').count(),6);assert.equal(await page.locator(':focus').getAttribute('id'),'name');
   await page.locator('#name').fill('QA Test');await page.locator('#email').fill('invalid');await page.locator('#message').fill('Test enquiry');
   for(const id of ['goods','origin','destination'])await page.locator('#'+id).fill('QA detail');
   await page.locator('[type="submit"]').click();assert.equal(await page.locator(':focus').getAttribute('id'),'email');
   await page.locator('#email').fill('qa@example.test');
   if(lang==='bg'){
    await page.route('**/api/enquiries',r=>r.abort('failed'));await page.locator('[type="submit"]').click();await page.waitForFunction(()=>document.querySelector('#form-status').dataset.state==='error');assert.equal(await page.locator('#message').inputValue(),'Test enquiry');await page.unroute('**/api/enquiries');
    await page.route('**/api/enquiries',r=>r.fulfill({status:502,contentType:'application/json',body:JSON.stringify({ok:false,error:'delivery-unconfirmed'})}));await page.locator('[type="submit"]').click();await page.waitForFunction(()=>document.querySelector('#form-status').dataset.state==='error');assert.equal(await page.locator('#message').inputValue(),'Test enquiry');await page.unroute('**/api/enquiries');
   }
   await page.locator('[type="submit"]').click();await page.waitForFunction(()=>document.querySelector('#form-status').dataset.state==='success');assert((await page.locator('#form-status').textContent()).includes(content[lang].upgrade.form.localSuccess));assert.equal(await page.locator('#message').inputValue(),'');
   await page.locator('#service').selectOption('consulting');assert(await page.locator('#topic').isVisible());assert(!(await page.locator('#origin').isVisible()));assert.equal(await page.locator('#origin').isDisabled(),true);
  }
  assert.equal((await fs.readdir(inboxDir)).filter(n=>n.endsWith('.json')).length,4);
  const nojs=await browser.newContext({javaScriptEnabled:false});const np=await nojs.newPage();await np.goto(base+'/en/');assert.equal(await np.locator('[data-service-panel]:visible').count(),4);assert(await np.locator('main').isVisible());await np.goto(base+'/en/contacts.html');await np.locator('#name').fill('No JS');await np.locator('#email').fill('nojs@example.test');await np.locator('#message').fill('No JS test');await np.locator('[type="submit"]').click();await np.waitForURL('**/api/enquiries');assert((await np.locator('h1').textContent()).includes('saved locally'));await nojs.close();
  assert.deepEqual(errors,[]);assert.deepEqual(issues,[]);
  console.log('PASS: 80 layouts, 40 axe scans, 80 enlarged-text layouts, keyboard navigation, 4 localized forms, network recovery, conditional fields and no-JavaScript submission.');
 }finally{
  await fs.writeFile('qa-artifacts/browser-results.json',JSON.stringify({results,issues,errors},null,2));await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(inboxDir,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
