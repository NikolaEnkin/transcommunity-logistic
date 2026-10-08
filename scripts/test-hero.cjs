const assert = require('node:assert/strict');
const {once} = require('node:events');
const {mkdir} = require('node:fs/promises');
const {chromium} = require('playwright');

(async () => {
  const {createApp} = await import('../server/app.mjs');
  const {allPages} = await import('../src/upgrades.mjs');
  const server = createApp(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true});
  try {
    await mkdir('qa-artifacts', {recursive: true});
    const context = await browser.newContext({viewport: {width: 1440, height: 960}});
    await context.addInitScript(() => {
      sessionStorage.setItem('trcl.intro.seen', '1');
      // Freeze the actual entrance mid-flight to inspect its scope and appearance.
      document.addEventListener('animationstart', event => {
        if (!event.target.matches('[data-hero-introduction]')) return;
        const animation = event.target.getAnimations().find(a => a.animationName === 'hero-flow-in');
        if (animation) { animation.pause(); animation.currentTime = 200; }
      });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const lang of ['', '/en', '/fr', '/de']) {
      for (const name of allPages.filter(name => name !== 'index')) {
        await page.goto(`${origin}${lang}/${name}.html`);
        const copy = page.locator('[data-hero-introduction]');
        await page.waitForFunction(() => document.querySelector('[data-hero-introduction]').getAnimations().some(a => a.playState === 'paused'));
        const state = await copy.evaluate(e => {
          const a = e.getAnimations()[0];
          return {name: a.animationName, duration: a.effect.getTiming().duration, opacity: Number(getComputedStyle(e).opacity), first: a.effect.getKeyframes()[0].transform};
        });
        assert.equal(state.name, 'hero-flow-in'); assert.equal(state.duration, 950);
        assert.equal(state.first, 'translateY(10px)'); assert(state.opacity > 0 && state.opacity < 1);
        assert.equal(await copy.locator('h1').count(), 1);
        for (const selector of ['#site-content', '.site-header', 'main', 'main>section:first-child', '.breadcrumbs', '.digital-network-wrap', '.brand-stage']) {
          const element = page.locator(selector);
          if (await element.count()) assert.equal(await element.first().evaluate(e => getComputedStyle(e).opacity), '1', `${lang}/${name}: ${selector} remains opaque`);
        }
        assert.equal(await page.locator('#site-content').evaluate(e => e.getAnimations().length), 0);
        if (!lang && ['about', 'contacts', 'digital-solutions'].includes(name)) {
          await page.screenshot({path: `qa-artifacts/hero-copy-${name}-1440.png`});
          await page.setViewportSize({width: 390, height: 844});
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          await page.screenshot({path: `qa-artifacts/hero-copy-${name}-390.png`});
          await page.setViewportSize({width: 1440, height: 960});
        }
        await copy.evaluate(e => e.getAnimations().forEach(a => a.finish()));
        assert.equal(await copy.evaluate(e => getComputedStyle(e).opacity), '1');
      }
    }
    await page.goto(origin + '/digital-solutions.html');
    await page.locator('[data-hero-introduction]').evaluate(e => e.getAnimations().forEach(a => a.finish()));
    await page.route('**/about.html', async route => { await new Promise(resolve => setTimeout(resolve, 700)); await route.continue(); });
    await page.evaluate(() => {
      addEventListener('click', event => {
        sessionStorage.setItem('hero.navigationPrevented', String(event.defaultPrevented));
        setTimeout(() => sessionStorage.setItem('hero.outgoingOpacity', getComputedStyle(document.getElementById('site-content')).opacity), 300);
      }, {once: true});
    });
    await page.locator('.desktop-nav a[href="/about.html"]').click(); await page.waitForURL('**/about.html');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('hero.navigationPrevented')), 'false', 'Navigation is native');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('hero.outgoingOpacity')), '1', 'The outgoing page never fades');
    await page.unroute('**/about.html');
    await page.goBack(); assert.equal(await page.locator('#site-content').evaluate(e => getComputedStyle(e).opacity), '1');

    const first = await browser.newContext(); const fp = await first.newPage();
    await fp.goto(origin + '/contacts.html', {waitUntil: 'domcontentloaded'});
    assert.equal(await fp.locator('html').getAttribute('data-intro-state'), 'loading');
    assert.equal(await fp.locator('[data-hero-introduction]').evaluate(e => e.getAnimations().length), 0, 'Text entrance waits for logo intro');
    await fp.waitForFunction(() => document.documentElement.dataset.introState === 'done');
    await fp.waitForFunction(() => document.querySelector('[data-hero-introduction]').getAnimations().some(a => a.animationName === 'hero-flow-in'));
    await fp.waitForFunction(() => getComputedStyle(document.querySelector('[data-hero-introduction]')).opacity === '1'); await first.close();

    const reduce = await browser.newContext({reducedMotion: 'reduce'}); await reduce.addInitScript(() => sessionStorage.setItem('trcl.intro.seen', '1'));
    const rp = await reduce.newPage();
    for (const name of ['about', 'contacts', 'digital-solutions']) {
      await rp.goto(`${origin}/${name}.html`);
      assert.equal(await rp.locator('[data-hero-introduction]').evaluate(e => e.getAnimations().length), 0);
      assert.equal(await rp.locator('[data-hero-introduction]').evaluate(e => getComputedStyle(e).opacity), '1');
    }
    await reduce.close();
    const nojs = await browser.newContext({javaScriptEnabled: false}); const np = await nojs.newPage();
    for (const name of ['about', 'contacts', 'digital-solutions']) {
      await np.goto(`${origin}/${name}.html`); assert(await np.locator('h1').isVisible());
      assert.equal(await np.locator('[data-hero-introduction]').evaluate(e => getComputedStyle(e).opacity), '1');
    }
    await nojs.close();
    assert.deepEqual(errors, []);
    console.log('PASS: introductory copy reveal on 36 localized inner pages, homepage timing/keyframes, full-opacity navigation/header/background/imagery, native navigation, history, intro coordination, reduced motion and no JavaScript.');
  } finally {
    await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
