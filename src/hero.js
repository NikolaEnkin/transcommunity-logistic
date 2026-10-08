/* Enable only the introductory copy reveal; navigation remains entirely native. */
(() => {
  const root = document.documentElement;
  root.classList.add('hero-entrance');
  addEventListener('pageshow', event => {
    if (!event.persisted) return;
    root.classList.remove('hero-entrance');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('hero-entrance')));
  });
})();
