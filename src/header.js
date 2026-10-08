// Match the sticky navigation to the reading surface reaching its lower edge.
const header = document.querySelector('.site-header');
if (header) {
  const surfaces = [...document.querySelectorAll('main > *, .site-footer')];
  let scheduled = false;

  function isLight(surface) {
    // Transparent sections use their ancestor's reading surface (usually white).
    for (let element = surface; element; element = element.parentElement) {
      const channels = getComputedStyle(element).backgroundColor.match(/[\d.]+/g)?.map(Number);
      if (!channels || (channels.length === 4 && channels[3] === 0)) continue;
      const [r, g, b] = channels;
      return (r * .2126 + g * .7152 + b * .0722) > 170;
    }
    return true;
  }

  function update() {
    scheduled = false;
    const edge = header.getBoundingClientRect().bottom + 1;
    const surface = surfaces.find(element => {
      const rect = element.getBoundingClientRect();
      return rect.top <= edge && rect.bottom > edge;
    });
    const tone = scrollY > 1 && surface && isLight(surface) ? 'dark' : 'light';
    if (header.dataset.tone !== tone) header.dataset.tone = tone;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule, {passive: true});
  addEventListener('pageshow', schedule);
  addEventListener('load', schedule);
  // Intro release, fonts, text zoom and service selection may change boundaries.
  const observer = new ResizeObserver(schedule);
  observer.observe(header);
  for (const surface of surfaces) observer.observe(surface);
  schedule();
}
