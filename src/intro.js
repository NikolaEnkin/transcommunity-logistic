/* Early, independent bootstrap: the intro never depends on the main application. */
(() => {
  const root = document.documentElement;
  const navigation = performance.getEntriesByType('navigation')[0];
  const hint = document.querySelector('meta[name="trcl-refresh"]')?.content;
  let seen = false;
  try { seen = sessionStorage.getItem('trcl.intro.seen') === '1'; } catch { /* Storage may be unavailable. */ }
  const reload = navigation?.type === 'reload';
  const hardReload = reload && hint === 'bypass';
  const show = navigation?.type !== 'back_forward' && (hardReload || (!seen && !reload));
  if (!show) { root.dataset.introState = 'skipped'; return; }
  try { sessionStorage.setItem('trcl.intro.seen', '1'); } catch { /* The site remains usable. */ }

  root.classList.add('intro-loading');
  root.dataset.introState = 'loading';
  performance.mark('trcl:intro:start');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let finished = false;
  let frame = 0;
  let timer;
  function release() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    root.classList.remove('intro-loading');
    const shell = document.getElementById('site-content');
    if (shell) { shell.inert = false; shell.removeAttribute('aria-hidden'); }
    const intro = document.getElementById('site-intro');
    if (intro) { intro.hidden = true; intro.removeAttribute('data-leaving'); }
    root.dataset.introState = 'done';
    performance.mark('trcl:intro:end');
    performance.measure('trcl:intro', 'trcl:intro:start', 'trcl:intro:end');
  }
  // A failed font, asset or later script must never trap visitors behind a loader.
  timer = setTimeout(release, 4500);
  addEventListener('pageshow', event => { if (event.persisted) release(); });

  function begin() {
    if (finished) return;
    const intro = document.getElementById('site-intro');
    const progress = document.getElementById('intro-progress');
    const percent = document.getElementById('intro-percent');
    const shell = document.getElementById('site-content');
    if (!intro || !progress || !percent || !shell) { release(); return; }
    intro.hidden = false;
    shell.inert = true;
    shell.setAttribute('aria-hidden', 'true');
    const started = performance.now();
    const minimum = reduced ? 0 : 800;
    let ready = false;
    let displayed = 0;
    const imageReady = image => image.complete ? Promise.resolve() : new Promise(resolve => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    });
    const criticalImages = [...document.images].filter(image => image.loading !== 'lazy');
    Promise.all([document.fonts?.ready, ...criticalImages.map(imageReady)]).then(() => { ready = true; });
    function update(now) {
      if (finished) return;
      const elapsed = now - started;
      const phase = minimum ? Math.min(elapsed / minimum, 1) : 1;
      const value = ready && phase === 1 ? 100 : Math.min(94, Math.round(phase * 92));
      displayed = Math.max(displayed, value);
      progress.value = displayed;
      percent.value = `${displayed}%`;
      percent.textContent = `${displayed}%`;
      if (displayed === 100) {
        setTimeout(() => {
          if (finished) return;
          intro.dataset.leaving = 'true';
          setTimeout(release, reduced ? 0 : 220);
        }, reduced ? 0 : 160);
      } else frame = requestAnimationFrame(update);
    }
    frame = requestAnimationFrame(update);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin, { once: true });
  else begin();
})();
