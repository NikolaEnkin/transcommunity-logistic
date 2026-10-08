const digitalPage = document.querySelector('[data-digital-page]');
if (digitalPage) {
  const tabs = [...document.querySelectorAll('[data-digital-tab]')];
  const panels = [...document.querySelectorAll('[data-digital-panel]')];
  const selector = document.querySelector('.digital-selector');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const layout = matchMedia('(min-width: 1000px)');
  let timers = [], runningDemo = null;
  function stop() {
    timers.forEach(clearTimeout); timers = [];
    if (!runningDemo) return;
    const button = runningDemo.querySelector('.demo-run');
    button.disabled = false; button.textContent = button.dataset.runLabel;
    runningDemo.removeAttribute('aria-busy');
    runningDemo.querySelector('.demo-status').textContent = '';
    runningDemo.querySelectorAll('.demo-flow li').forEach(step => delete step.dataset.state);
    runningDemo = null;
  }
  function select(id, focus = false) {
    stop();
    tabs.forEach(tab => {
      const active = tab.dataset.digitalTab === id;
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus({preventScroll: true});
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.digitalPanel !== id; });
  }
  selector.setAttribute('role', 'tablist');
  function orientation() { selector.setAttribute('aria-orientation', layout.matches ? 'vertical' : 'horizontal'); }
  orientation(); layout.addEventListener('change', orientation);
  tabs.forEach((tab, i) => {
    tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', `solution-${tab.dataset.digitalTab}`);
    tab.addEventListener('click', event => {
      event.preventDefault(); select(tab.dataset.digitalTab);
      history.replaceState(null, '', `#solution-${tab.dataset.digitalTab}`);
    });
    tab.addEventListener('keydown', event => {
      let target;
      if (['ArrowRight','ArrowDown'].includes(event.key)) target = tabs[(i+1)%tabs.length];
      if (['ArrowLeft','ArrowUp'].includes(event.key)) target = tabs[(i-1+tabs.length)%tabs.length];
      if (event.key === 'Home') target = tabs[0];
      if (event.key === 'End') target = tabs.at(-1);
      if (event.key === ' ') target = tab;
      if (target) {
        event.preventDefault(); select(target.dataset.digitalTab, true);
        history.replaceState(null, '', `#solution-${target.dataset.digitalTab}`);
      }
    });
  });
  panels.forEach(panel => {
    panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', `digital-tab-${panel.dataset.digitalPanel}`); panel.tabIndex = 0;
    const demo = panel.querySelector('[data-digital-demo]'), button = demo.querySelector('.demo-run');
    button.hidden = false;
    button.addEventListener('click', () => {
      stop(); runningDemo = demo;
      const steps = [...demo.querySelectorAll('.demo-flow li')];
      steps.forEach(step => delete step.dataset.state);
      demo.querySelector('.demo-status').textContent = '';
      demo.setAttribute('aria-busy', 'true'); button.disabled = true; button.textContent = button.dataset.runningLabel;
      const finish = () => {
        timers.forEach(clearTimeout); timers = [];
        steps.forEach(step => { step.dataset.state = 'done'; });
        demo.removeAttribute('aria-busy'); button.disabled = false; button.textContent = button.dataset.runLabel;
        demo.querySelector('.demo-status').textContent = button.dataset.doneLabel;
        runningDemo = null;
      };
      if (motion.matches) { finish(); return; }
      steps.forEach((step,i) => timers.push(setTimeout(() => {
        steps.forEach((item,j) => { item.dataset.state = j<i ? 'done' : j===i ? 'active' : 'pending'; });
      }, i*650)));
      timers.push(setTimeout(finish, 2000));
    });
  });
  function hash() {
    const id = location.hash.replace('#solution-', '');
    select(tabs.some(t => t.dataset.digitalTab === id) ? id : 'web');
  }
  hash(); addEventListener('hashchange', hash);
  const network = document.querySelector('.network-map');
  const networkLinks = [...network.querySelectorAll('[data-network-link]')];
  const descriptions = [...document.querySelectorAll('[data-network-description]')];
  let activeLink = null, hoveredLink = null, pulse = null, layoutFrame = 0;
  function highlight(link) {
    if (activeLink === link) return;
    activeLink = link;
    pulse?.cancel(); pulse = null;
    networkLinks.forEach(item => {
      const active = item === link, id = item.dataset.networkLink;
      for (const element of [item, network.querySelector(`[data-network-path="${id}"]`)]) {
        element.toggleAttribute('data-active', active);
      }
    });
    descriptions.forEach(item => item.toggleAttribute('data-visible', item.dataset.networkDescription === (link?.dataset.networkLink || 'default')));
    if (link && !motion.matches) {
      const signal = network.querySelector(`[data-network-signal="${link.dataset.networkLink}"]`);
      pulse = signal.animate([
        {strokeDashoffset:'1',opacity:0},
        {strokeDashoffset:'.85',opacity:1,offset:.15},
        {strokeDashoffset:'0',opacity:0},
      ], {duration:1100,easing:'ease-in-out'});
    }
  }
  function focusedNetworkLink() {
    const link = document.activeElement?.closest('[data-network-link]');
    return link && network.contains(link) ? link : null;
  }
  networkLinks.forEach(link => {
    link.addEventListener('pointerenter', () => { hoveredLink = link; highlight(link); });
    link.addEventListener('pointerleave', () => { hoveredLink = null; highlight(focusedNetworkLink()); });
    link.addEventListener('focus', () => highlight(link));
    link.addEventListener('blur', () => queueMicrotask(() => highlight(focusedNetworkLink() || hoveredLink)));
    link.addEventListener('keydown', event => {
      if (event.key === 'Escape') { hoveredLink = null; highlight(null); }
    });
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const id = link.dataset.networkLink;
      select(id); history.replaceState(null, '', `#solution-${id}`);
      tabs.find(tab => tab.dataset.digitalTab === id).focus({preventScroll:true});
      document.querySelector('.digital-workbench').scrollIntoView({block:'start',behavior:motion.matches?'auto':'smooth'});
    });
  });
  function drawNetwork() {
    layoutFrame = 0;
    const bounds = network.getBoundingClientRect(), hub = network.querySelector('.network-brand-mark').getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    network.querySelector('.network-wires').setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    const center = {x:hub.left+hub.width/2-bounds.left,y:hub.top+hub.height/2-bounds.top};
    networkLinks.forEach(link => {
      const icon = link.querySelector('.network-icon').getBoundingClientRect();
      const target = {x:icon.left+icon.width/2-bounds.left,y:icon.top+icon.height/2-bounds.top};
      const side = target.x < center.x ? -1 : 1;
      const startX = center.x+side*(hub.width/2+6), endX = target.x-side*(icon.width/2+7);
      const bend = Math.max(16,Math.abs(endX-startX)*.6);
      const path = `M${startX} ${center.y}C${startX+side*bend} ${center.y} ${endX-side*bend} ${target.y} ${endX} ${target.y}`;
      network.querySelector(`[data-network-path="${link.dataset.networkLink}"]`).setAttribute('d',path);
      network.querySelector(`[data-network-signal="${link.dataset.networkLink}"]`).setAttribute('d',path);
    });
    network.dataset.layoutReady = 'true';
  }
  function scheduleNetwork() {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(drawNetwork);
  }
  const networkObserver = new ResizeObserver(scheduleNetwork);
  networkObserver.observe(network);
  networkObserver.observe(network.querySelector('.network-brand-mark'));
  addEventListener('resize', scheduleNetwork, {passive:true});
  document.fonts.ready.then(scheduleNetwork);
  motion.addEventListener('change', () => { pulse?.cancel(); pulse = null; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pulse?.cancel(); pulse = null; } });
  scheduleNetwork();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  addEventListener('pagehide', stop);
  motion.addEventListener('change', stop);
  const project = document.querySelector('.digital-project'), summary = project.querySelector('[data-project-summary]');
  function projectSummary() {
    const selected = [...project.querySelectorAll('[name="solutions"]:checked')].map(input => input.dataset.solutionName);
    summary.textContent = selected.length ? `${summary.dataset.chosen} ${selected.join(' + ')}` : summary.dataset.empty;
  }
  project.addEventListener('change', projectSummary);
  addEventListener('pageshow', projectSummary);
  projectSummary();
  function reveal() {
    if (document.documentElement.dataset.introState === 'loading') return;
    digitalPage.dataset.ready = 'true'; observer.disconnect();
  }
  const observer = new MutationObserver(reveal);
  observer.observe(document.documentElement, {attributes: true, attributeFilter: ['data-intro-state']});
  reveal();
}
