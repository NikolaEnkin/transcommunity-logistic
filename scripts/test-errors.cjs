const assert = require('node:assert/strict');
const {once} = require('node:events');
const {mkdir} = require('node:fs/promises');
const {chromium} = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

(async () => {
 const {createApp} = await import('../server/app.mjs');
 const {errorContent} = await import('../src/error-view.mjs');
 const server=createApp();server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try {
  await mkdir('qa-artifacts',{recursive:true});
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const width of [390,1440])for(const [lang,t] of Object.entries(errorContent))for(const status of [400,404,500]){
   const prefix=lang==='bg'?'':`/${lang}`;await page.setViewportSize({width,height:960});
   const response=await page.goto(`${origin}${prefix}/${status}.html`);assert.equal(response.status(),status);
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('h1').textContent(),t[status][0]);
   assert.equal(await page.locator('.recovery-action .button').textContent(),t.home);
   assert.equal(await page.locator('.recovery-action .button').getAttribute('href'),prefix+'/');
   assert.equal(await page.locator('.recovery-languages a').count(),4);
   assert.equal(await page.locator('.brand-static img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
   assert.equal(await page.locator('.brand-controller').isVisible(),false);
   assert.equal(await page.locator('#site-intro').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const main=await page.locator('main').boundingBox(),logo=await page.locator('.brand-stage').boundingBox();
   assert(Math.abs(logo.x+logo.width/2-(main.x+main.width/2))<2,'Logo remains centered');
   const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice']).analyze();
   assert.deepEqual(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],`${lang}/${status}/${width}: accessibility`);
   if(lang==='bg')await page.screenshot({path:`qa-artifacts/error-${status}-${width}.png`,fullPage:true});
   await page.setViewportSize({width:320,height:844});
   await page.evaluate(()=>document.documentElement.style.fontSize=`${parseFloat(getComputedStyle(document.documentElement).fontSize)*2}px`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Enlarged text wraps on a small screen');
  }
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:960});await page.goto(origin+'/500.html');
  const controller=page.locator('.brand-controller'),object=page.locator('.brand-object');assert(await controller.isVisible());
  await controller.focus();const rest=await object.getAttribute('style');await page.keyboard.press('ArrowRight');await page.waitForTimeout(40);
  assert.notEqual(await object.getAttribute('style'),rest);await page.keyboard.press('Home');await page.waitForTimeout(40);assert.equal(await object.getAttribute('style'),rest);
  const bounds=await controller.boundingBox();await page.mouse.move(bounds.x+bounds.width*.8,bounds.y+bounds.height*.3);await page.waitForTimeout(40);assert.notEqual(await object.getAttribute('style'),rest);
  await page.mouse.move(1,1);await page.waitForTimeout(40);assert.equal(await object.getAttribute('style'),rest);
  await page.locator('[data-hero-introduction]').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{}))));
  const interactiveScan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice']).analyze();assert.deepEqual(interactiveScan.violations.map(v=>v.id),[]);
  await page.goto(origin+'/en/400.html');await page.locator('.recovery-action .button').click();await page.waitForURL(origin+'/en/');assert.equal(await page.locator('html').getAttribute('lang'),'en');
  const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const tp=await touch.newPage();await tp.goto(origin+'/400.html');
  const logo=tp.locator('.brand-controller'),box=await logo.boundingBox(),client=await touch.newCDPSession(tp);
  const x=box.x+box.width*.3,y=box.y+box.height*.5;
  const send=(type,points)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y])=>({x,y,id:1}))});
  const touchRest=await tp.locator('.brand-object').getAttribute('style');
  await send('touchStart',[[x,y]]);await send('touchMove',[[x+70,y]]);await tp.waitForTimeout(50);
  assert.notEqual(await tp.locator('.brand-object').getAttribute('style'),touchRest,'Touch rotates the logo');
  await send('touchEnd',[]);await tp.locator('.recovery-action .button').tap();await tp.waitForURL(origin+'/');await touch.close();
  const nojs=await browser.newContext({javaScriptEnabled:false}),np=await nojs.newPage();await np.goto(origin+'/fr/500.html');assert(await np.locator('.brand-static').isVisible());assert(!(await np.locator('.brand-controller').isVisible()));await np.locator('.recovery-action .button').click();await np.waitForURL(origin+'/fr/');await nojs.close();
  assert.deepEqual(errors,[]);
  console.log('PASS: 12 localized error pages, correct status codes, 24 responsive accessibility scans, enlarged text, centered logo, pointer/keyboard/touch, reduced motion, no JavaScript and localized home recovery.');
 } finally {await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
