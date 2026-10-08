const hero = document.querySelector('[data-hero-carousel]');
if (hero) {
  const slides = [...hero.querySelectorAll('[data-carousel-slide]')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const interval = Number(hero.dataset.interval) || 4000;
  let current = 0, timer, ready = false, onScreen = true, version = 0;
  const loaded = new Map();
  function load(index) {
    if (loaded.has(index)) return loaded.get(index);
    const image = slides[index].querySelector('img');
    const result = new Promise(resolve => {
      let timeout;
      const finish = ok => {
        clearTimeout(timeout);
        image.removeEventListener('load', success); image.removeEventListener('error', failure);
        if (!ok) slides[index].dataset.failed = 'true';
        resolve(ok);
      };
      const success = () => finish(true), failure = () => finish(false);
      timeout = setTimeout(failure, 8000);
      image.addEventListener('load', success, {once:true}); image.addEventListener('error', failure, {once:true});
      if (image.dataset.src) {
        image.loading = 'eager'; image.src = image.dataset.src; delete image.dataset.src;
      }
      if (image.complete) finish(image.naturalWidth > 0);
    });
    loaded.set(index, result); return result;
  }
  function running() { return ready && !motion.matches && !document.hidden && onScreen && slides.filter(slide => slide.dataset.failed !== 'true').length > 1; }
  function sync() {
    clearTimeout(timer); version++;
    const active = running();
    hero.dataset.rotation = active ? 'playing' : 'paused';
    hero.dataset.running = String(active);
    if (active) timer = setTimeout(advance, interval);
  }
  function setActive(index) {
    current = index;
    for (let i = 0; i < slides.length; i++) {
      if (i === current) slides[i].dataset.active = 'true';
      else delete slides[i].dataset.active;
    }
    hero.dataset.index = String(current);
  }
  async function advance() {
    const ticket = ++version;
    for (let step = 1; step < slides.length; step++) {
      if (!running() || ticket !== version) return;
      const index = (current + step) % slides.length;
      if (slides[index].dataset.failed === 'true') continue;
      const available = await load(index);
      if (!running() || ticket !== version) return;
      if (available) { setActive(index); break; }
    }
    sync();
  }
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  addEventListener('pagehide', () => { clearTimeout(timer); version++; });
  addEventListener('pageshow', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); }, {threshold:0}).observe(hero);
  }
  function start() {
    if (ready || document.documentElement.dataset.introState === 'loading') return;
    ready = true; hero.dataset.ready = 'true'; hero.dataset.index = '0'; sync();
    // Prepare later images after the independent intro releases the content.
    const prepare = () => Promise.all(slides.map((_,i) => load(i))).then(results => {
      if (!results[0] && current === 0) {
        const replacement = results.findIndex(Boolean);
        if (replacement >= 0) setActive(replacement);
      }
      if (results.filter(Boolean).length < 2) sync();
    });
    if ('requestIdleCallback' in window) requestIdleCallback(prepare,{timeout:1000}); else setTimeout(prepare,0);
  }
  const introObserver = new MutationObserver(() => { start(); if (ready) introObserver.disconnect(); });
  introObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-intro-state']});
  start(); if (ready) introObserver.disconnect();
}
