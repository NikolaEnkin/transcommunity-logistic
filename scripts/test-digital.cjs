const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {once}=require('node:events');
(async()=>{
 const {createApp}=await import('../server/app.mjs');const {digitalContent}=await import('../src/digital-content.mjs');
 const inboxDir=await fs.mkdtemp(path.join(os.tmpdir(),'trcl-digital-')),server=createApp({inboxDir,maxRequests:100});server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  await fs.mkdir('qa-artifacts',{recursive:true});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.addInitScript(()=>sessionStorage.setItem('trcl.intro.seen','1'));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  for(const [lang,d] of Object.entries(digitalContent)){
   const prefix=lang==='bg'?'':`/${lang}`;await page.goto(origin+prefix+'/digital-solutions.html');await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('[data-digital-tab]').count(),6);assert.equal(await page.locator('[data-digital-panel]:visible').count(),1);
   assert.equal(await page.locator('.desktop-nav a[aria-current]').textContent(),d.nav);
   assert.equal(await page.locator('[data-network-link]').count(),6);
   await page.waitForFunction(()=>document.querySelector('.network-map').dataset.layoutReady==='true');
   assert.equal(await page.locator('.network-brand-mark img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
   const mapHeight=await page.locator('.digital-network-wrap').evaluate(e=>e.getBoundingClientRect().height);
   for(const s of d.solutions){
    await page.evaluate(()=>scrollTo(0,0));const link=page.locator(`[data-network-link="${s.id}"]`);await link.hover();
    assert.equal(await page.locator('[data-network-description][data-visible]').textContent(),s.intro);
    assert.equal(await page.locator(`[data-network-path="${s.id}"]`).getAttribute('data-active'),'');
    assert.equal(await page.locator('.network-wires').evaluate(e=>e.getAnimations({subtree:true}).length),0,'Reduced-motion signals stay static');
    assert.equal(await page.locator('.digital-network-wrap').evaluate(e=>e.getBoundingClientRect().height),mapHeight,'Descriptions must not shift the network');
    await link.click();assert.equal(await page.locator('[role="tab"][aria-selected="true"]').getAttribute('data-digital-tab'),s.id);assert.equal(await page.locator(':focus').getAttribute('data-digital-tab'),s.id);
   }
   await page.evaluate(()=>scrollTo(0,0));await page.locator('[data-network-link="chat"]').focus();
   assert.equal(await page.locator('[data-network-description][data-visible]').textContent(),d.solutions.find(s=>s.id==='chat').intro);
   await page.keyboard.press('Enter');assert.equal(await page.locator('[aria-selected="true"]').getAttribute('data-digital-tab'),'chat');
   for(const s of d.solutions){
    await page.locator(`[data-digital-tab="${s.id}"]`).click();assert.equal(await page.locator('[role="tab"][aria-selected="true"]').getAttribute('data-digital-tab'),s.id);assert.equal(await page.locator('[data-digital-panel]:visible').count(),1);
    const panel=page.locator(`[data-digital-panel="${s.id}"]`);await panel.locator('.demo-run').click();assert.equal(await panel.locator('[data-state="done"]').count(),3);assert.equal(await panel.locator('.demo-status').textContent(),d.done);
    const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice']).analyze();assert.deepEqual(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],`${lang}/${s.id}: axe`);
   }
   await page.locator('[data-digital-tab="web"]').click();await page.keyboard.press('End');assert.equal(await page.locator(':focus').getAttribute('data-digital-tab'),'workflows');await page.keyboard.press('Home');assert.equal(await page.locator(':focus').getAttribute('data-digital-tab'),'web');await page.keyboard.press('ArrowRight');assert.equal(await page.locator(':focus').getAttribute('data-digital-tab'),'voice');
   await page.goto(origin+prefix+'/digital-solutions.html#solution-crm');assert.equal(await page.locator('[aria-selected="true"]').getAttribute('data-digital-tab'),'crm');
   for(const id of ['web','crm','workflows'])await page.locator(`.digital-project input[value="${id}"]`).check();
   const scope=d.solutions.filter(s=>['web','crm','workflows'].includes(s.id)).map(s=>s.name).join(', ');assert((await page.locator('[data-project-summary]').textContent()).includes(d.solutions[0].name));
   if(lang==='bg'){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'qa-artifacts/digital-desktop.png',fullPage:true});}
   await page.locator('.digital-project button').click();await page.waitForURL('**/contacts.html?**');await page.waitForFunction(()=>!document.querySelector('#enquiry-form [type="submit"]').disabled);
   assert.equal(await page.locator('#service').inputValue(),'digital');assert.equal(await page.locator('#goal').inputValue(),scope);assert(await page.locator('#goal').isVisible());assert.equal(await page.locator('#goal').getAttribute('required'),'');
   await page.locator('#name').fill('Digital QA');await page.locator('#email').fill('digital@example.test');await page.locator('#message').fill('Local digital project test.');await page.locator('#enquiry-form [type="submit"]').click();await page.waitForFunction(()=>document.querySelector('#form-status').dataset.state==='success');
  }
  const records=await Promise.all((await fs.readdir(inboxDir)).map(async f=>JSON.parse(await fs.readFile(path.join(inboxDir,f),'utf8'))));assert.equal(records.length,4);assert(records.every(r=>r.service==='digital'&&r.details.goal));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(origin+'/digital-solutions.html');
  await page.locator('[data-network-link="voice"]').hover();
  assert((await page.locator('[data-network-signal="voice"]').evaluate(e=>e.getAnimations().length))>0,'Hover sends one signal');
  await page.waitForTimeout(1200);assert.equal(await page.locator('[data-network-signal="voice"]').evaluate(e=>e.getAnimations().length),0,'Signal does not loop');
  await page.locator('[data-digital-panel="web"] .demo-run').click();await page.waitForFunction(()=>document.querySelector('#solution-web .demo-flow li').dataset.state==='active');
  await page.waitForFunction(()=>document.querySelector('#solution-web .demo-status').textContent.length>0);assert.equal(await page.locator('#solution-web [data-state="done"]').count(),3);
  await page.locator('#solution-web .demo-run').click();await page.locator('[data-digital-tab="voice"]').click();await page.waitForTimeout(2200);assert.equal(await page.locator('#solution-web .demo-status').textContent(),'');assert.equal(await page.locator('#solution-web .demo-run').isDisabled(),false);
  await page.setViewportSize({width:390,height:844});await page.goto(origin+'/digital-solutions.html');await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'qa-artifacts/digital-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await touch.addInitScript(()=>sessionStorage.setItem('trcl.intro.seen','1'));const tp=await touch.newPage();await tp.goto(origin+'/digital-solutions.html');await tp.locator('[data-network-link="erp"]').tap();assert.equal(await tp.locator('[aria-selected="true"]').getAttribute('data-digital-tab'),'erp');await touch.close();
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),np=await nojs.newPage();await np.goto(origin+'/digital-solutions.html');assert.equal(await np.locator('[data-digital-panel]:visible').count(),6);assert.equal(await np.locator('.demo-run:visible').count(),0);await np.locator('[data-network-link="voice"]').click();assert.equal(new URL(np.url()).hash,'#solution-voice');assert(await np.locator('#solution-voice').isVisible());
  await np.locator('.digital-project input[value="erp"]').check();await np.locator('.digital-project input[value="crm"]').check();await np.locator('.digital-project button').click();await np.waitForURL('**/contacts.html?**');assert.equal(await np.locator('#service').inputValue(),'digital');assert.equal(await np.locator('#goal').inputValue(),'ERP системи, CRM системи');await np.locator('#name').fill('No JS digital');await np.locator('#email').fill('nojs-digital@example.test');await np.locator('#message').fill('No JavaScript digital enquiry.');await np.locator('#enquiry-form [type="submit"]').click();await np.waitForURL('**/api/enquiries');assert((await np.locator('h1').textContent()).includes('локално'));await nojs.close();
  assert.deepEqual(errors,[]);console.log('PASS: six network links, focus/touch/keyboard navigation, stable descriptions, one-shot signals and reduced motion, six interactive services, 24 accessibility scans, keyboard and shared hashes, normal/reduced-motion demo runs and cancellation, project selection, four localized enquiries, no-JavaScript selection/prefill/submission and mobile layout.');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(inboxDir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
