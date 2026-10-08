const stage = document.querySelector('[data-brand-logo]');
if (stage) {
  const controller = stage.querySelector('.brand-controller');
  const object = stage.querySelector('.brand-object');
  const fallback = stage.querySelector('.brand-static');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const rest = {x: 6, y: -10};
  let angle = {...rest};
  let frame = 0;
  let touchId = null;

  function render() {
    frame = 0;
    object.style.transform = `rotateX(${angle.x}deg) rotateY(${angle.y}deg)`;
  }
  function rotate(x, y) {
    if (motion.matches) return;
    angle = {x: Math.max(-16, Math.min(16, x)), y: Math.max(-20, Math.min(20, y))};
    if (!frame) frame = requestAnimationFrame(render);
  }
  function reset() {
    rotate(rest.x, rest.y);
    delete stage.dataset.dragging;
  }
  function point(event) {
    const box = controller.getBoundingClientRect();
    rotate(-((event.clientY - box.top) / box.height - .5) * 24,
      ((event.clientX - box.left) / box.width - .5) * 36);
  }

  controller.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' || event.pointerId === touchId) point(event);
  });
  controller.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || motion.matches) return;
    touchId = event.pointerId;
    controller.setPointerCapture(event.pointerId);
    stage.dataset.dragging = 'true';
    point(event);
  });
  function release(event) {
    if (event.pointerId !== touchId) return;
    touchId = null;
    if (controller.hasPointerCapture(event.pointerId)) controller.releasePointerCapture(event.pointerId);
    reset();
  }
  controller.addEventListener('pointerup', release);
  controller.addEventListener('pointercancel', release);
  controller.addEventListener('lostpointercapture', release);
  controller.addEventListener('pointerleave', () => { if (touchId === null) reset(); });
  controller.addEventListener('blur', reset);
  controller.addEventListener('keydown', event => {
    const moves = {ArrowLeft: [0,-4], ArrowRight: [0,4], ArrowUp: [4,0], ArrowDown: [-4,0]};
    if (moves[event.key]) {
      event.preventDefault();
      const [x,y] = moves[event.key];
      rotate(angle.x + x, angle.y + y);
    } else if (event.key === 'Home' || event.key === 'Escape') {
      event.preventDefault();
      reset();
    }
  });
  controller.addEventListener('click', event => {
    // Pointer movement already supplies the mouse/touch interaction.
    if (event.detail === 0) rotate(6, angle.y < 0 ? 14 : -14);
  });
  function preference() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    touchId = null;
    angle = {...rest};
    render();
    controller.hidden = motion.matches;
    fallback.hidden = !motion.matches;
    delete stage.dataset.dragging;
    stage.dataset.interactive = String(!motion.matches);
  }
  motion.addEventListener('change', preference);
  preference();
}
