const assert = require('node:assert/strict');
const {once} = require('node:events');
const {chromium} = require('playwright');

(async () => {
  const {createApp} = await import('../server/app.mjs');
  const server = process.env.TEST_ORIGIN ? null : createApp();
  if (server) { server.listen(0,'127.0.0.1'); await once(server,'listening'); }
  const browser = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try {
  const context = await browser.newContext({viewport:{width:390,height:844}});
  const page = await context.newPage();
  const failures=[];
  page.on('pageerror',e=>failures.push(e.message));
  const base=process.env.TEST_ORIGIN || `http://127.0.0.1:${server.address().port}`;
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('html').getAttribute('data-intro-state'),'loading','First visit shows intro');
  assert(await page.locator('#site-intro').isVisible());
  assert.equal(await page.locator('#site-content').getAttribute('aria-hidden'),'true');
  await page.screenshot({path:'/private/tmp/transcommunity-intro-mobile.png'});
  await page.waitForFunction(()=>document.getElementById('intro-progress').value===100);
  assert.equal(await page.locator('#intro-percent').textContent(),'100%');
  await page.waitForFunction(()=>document.documentElement.dataset.introState==='done');
  assert(await page.locator('main').isVisible());
  assert.equal(await page.locator('#site-content').getAttribute('aria-hidden'),null);

  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('html').getAttribute('data-intro-state'),'skipped','Normal refresh skips intro');
  const cdp=await context.newCDPSession(page);
  await cdp.send('Page.enable');
  await Promise.all([page.waitForEvent('domcontentloaded'),cdp.send('Page.reload',{ignoreCache:true})]);
  const hint=await page.locator('meta[name="trcl-refresh"]').getAttribute('content');
  assert.equal(hint,'bypass','Actual cache-bypassing reload reaches server hint');
  assert.equal(await page.locator('html').getAttribute('data-intro-state'),'loading','Hard refresh shows intro');
  await page.waitForFunction(()=>document.documentElement.dataset.introState==='done');
  await page.goto(base+'/en/about.html',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('html').getAttribute('data-intro-state'),'skipped','Internal page navigation skips intro');
  await page.goBack({waitUntil:'domcontentloaded'});
  assert.notEqual(await page.locator('html').getAttribute('data-intro-state'),'loading','History does not replay intro');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('html').getAttribute('data-intro-state'),'skipped');

  const reduced=await browser.newContext({reducedMotion:'reduce'});
  const rp=await reduced.newPage();await rp.goto(base+'/de/',{waitUntil:'domcontentloaded'});
  await rp.waitForFunction(()=>document.documentElement.dataset.introState==='done');
  assert((await rp.evaluate(()=>performance.getEntriesByName('trcl:intro')[0].duration))<800,'Reduced motion avoids minimum animation delay');
  await reduced.close();

  const nojs=await browser.newContext({javaScriptEnabled:false});
  const np=await nojs.newPage();await np.goto(base+'/');assert(await np.locator('main').isVisible());assert(!(await np.locator('#site-intro').isVisible()));await nojs.close();

  const broken=await browser.newContext();const bp=await broken.newPage();
  await bp.route('**/*.woff2',()=>{});
  await bp.goto(base+'/',{waitUntil:'domcontentloaded'});
  await bp.waitForFunction(()=>document.documentElement.dataset.introState==='done',{},{timeout:6500});
  assert(await bp.locator('main').isVisible(),'Stalled resources do not trap the site');await broken.close();
  assert.deepEqual(failures,[]);
  console.log('PASS: first visit, 100%, normal reload, actual hard reload, internal navigation, history, reduced motion, no JavaScript and timeout recovery.');
  } finally {
    await browser.close();
    if (server) { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
