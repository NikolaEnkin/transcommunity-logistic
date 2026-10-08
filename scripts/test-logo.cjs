const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const assert=require('node:assert/strict');
const {once}=require('node:events');
const fs=require('node:fs/promises');
(async()=>{
 const {createApp}=await import('../server/app.mjs');
 const {logoContent}=await import('../src/logo-content.mjs');
 const server=createApp();server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  await fs.mkdir('qa-artifacts',{recursive:true});
  const context=await browser.newContext();await context.addInitScript(()=>sessionStorage.setItem('trcl.intro.seen','1'));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  for(const width of [390,1440])for(const lang of Object.keys(logoContent)){
   await page.setViewportSize({width,height:960});await page.goto(base+(lang==='bg'?'':`/${lang}`)+'/contacts.html');await page.evaluate(()=>document.fonts.ready);
   const control=page.locator('.brand-controller'),object=page.locator('.brand-object');await control.waitFor({state:'visible'});
   assert.equal(await control.getAttribute('aria-label'),logoContent[lang].label);
   const image=page.locator('.brand-face');assert.equal(await image.evaluate(i=>i.complete&&i.naturalWidth>0),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('.contact-hero-copy').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{}))));
   const copy=await page.locator('.contact-hero-copy').boundingBox(),logo=await control.boundingBox();
   assert(width>=800?logo.x>=copy.x+copy.width:logo.y>=copy.y+copy.height,'Logo beside text on desktop and below on mobile');
   await page.waitForTimeout(700);const rest=await object.evaluate(e=>getComputedStyle(e).transform);
   if(lang==='bg')await page.screenshot({path:`qa-artifacts/contact-logo-${width}.png`});
   await page.mouse.move(logo.x+logo.width*.85,logo.y+logo.height*.2);await page.waitForTimeout(250);
   const tilted=await object.evaluate(e=>getComputedStyle(e).transform);assert.notEqual(tilted,rest,'Pointer changes perspective');
   assert.deepEqual(await page.locator('.contact-hero-copy').boundingBox(),copy,'Interaction must not move text');
   if(lang==='bg'&&width===1440)await page.screenshot({path:'qa-artifacts/contact-logo-interactive.png'});
   await page.mouse.move(4,940);await page.waitForTimeout(700);assert.equal(await object.evaluate(e=>getComputedStyle(e).transform),rest,'Pointer exit resets');
   await control.evaluate(e=>e.focus({preventScroll:true}));await page.keyboard.press('ArrowRight');await page.waitForTimeout(250);assert.notEqual(await object.evaluate(e=>getComputedStyle(e).transform),rest);
   await page.keyboard.press('Home');await page.waitForTimeout(250);assert.equal(await object.evaluate(e=>getComputedStyle(e).transform),rest);
   await page.keyboard.press('Enter');await page.waitForTimeout(250);assert.notEqual(await object.evaluate(e=>getComputedStyle(e).transform),rest);
   await page.keyboard.press('Escape');await page.waitForTimeout(250);assert.equal(await object.evaluate(e=>getComputedStyle(e).transform),rest);
   const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice']).analyze();assert.deepEqual(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`${lang}/${width}: axe`);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.brand-static').waitFor({state:'visible'});assert(await page.locator('.brand-static').isVisible());assert(await page.locator('.brand-controller').isHidden());
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.brand-controller').waitFor({state:'visible'});assert(await page.locator('.brand-controller').isVisible());
  const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await touch.addInitScript(()=>sessionStorage.setItem('trcl.intro.seen','1'));
  const tp=await touch.newPage();await tp.goto(base+'/contacts.html');await tp.locator('.brand-controller').waitFor({state:'visible'});await tp.waitForTimeout(700);
  const client=await touch.newCDPSession(tp),box=await tp.locator('.brand-controller').boundingBox();const x=box.x+box.width*.4,y=box.y+box.height*.5;
  const send=(type,points)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y])=>({x,y,id:1}))});
  const rest=await tp.locator('.brand-object').evaluate(e=>getComputedStyle(e).transform);
  await send('touchStart',[[x,y]]);await send('touchMove',[[x+70,y]]);await tp.waitForTimeout(250);assert.notEqual(await tp.locator('.brand-object').evaluate(e=>getComputedStyle(e).transform),rest,'Horizontal touch rotates');
  await send('touchEnd',[]);await tp.waitForTimeout(700);assert.equal(await tp.locator('.brand-object').evaluate(e=>getComputedStyle(e).transform),rest);
  await send('touchStart',[[x,y]]);for(const offset of [25,50,100]){await send('touchMove',[[x,y-offset]]);await tp.waitForTimeout(30);}await send('touchEnd',[]);await tp.waitForTimeout(200);assert((await tp.evaluate(()=>scrollY))>0,'Vertical touch still scrolls');await touch.close();
  const nojs=await browser.newContext({javaScriptEnabled:false}),np=await nojs.newPage();await np.goto(base+'/contacts.html');assert(await np.locator('.brand-static img').isVisible());assert(await np.locator('.brand-controller').isHidden());await nojs.close();
  assert.deepEqual(errors,[]);console.log('PASS: logo perspective, pointer/touch/keyboard/reset, vertical touch scrolling, stable text, four locales, mobile/desktop accessibility, reduced motion and no JavaScript.');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
