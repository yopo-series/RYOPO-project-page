// User-controlled video gallery. No timers, automatic slide changes, or dependencies.
export function initDemoGallery(root, loadVideo) {
  const tabs = [...root.querySelectorAll('[data-bolt-tab]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  let current = 0;
  function show(index, focusTab = false) {
    current = (index + tabs.length) % tabs.length;
    panels.forEach((panel, i) => {
      const active = i === current;
      if (!active) panel.querySelectorAll('video').forEach(video => video.pause());
      panel.hidden = !active;
      tabs[i].setAttribute('aria-selected', String(active));
      tabs[i].tabIndex = active ? 0 : -1;
    });
    root.querySelector('#bolt-counter').textContent = `${current + 1} / ${tabs.length}`;
    loadVideo(panels[current].querySelector('video'));
    if (focusTab) tabs[current].focus();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => show(i));
    tab.addEventListener('keydown', event => {
      const target = {ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: tabs.length - 1}[event.key];
      if (target !== undefined) { event.preventDefault(); show(target, true); }
    });
  });
  root.querySelectorAll('[data-bolt-step]').forEach(button => {
    button.addEventListener('click', () => show(current + Number(button.dataset.boltStep)));
  });
  // Swipe on the description area; native video seeking/fullscreen stays untouched.
  root.querySelectorAll('.demo-description').forEach(area => {
    let start = null;
    area.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') start = {x: event.clientX, y: event.clientY, id: event.pointerId};
    });
    area.addEventListener('pointerup', event => {
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
    });
    area.addEventListener('pointercancel', () => { start = null; });
  });
}
