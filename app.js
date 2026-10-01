import { initDemoGallery } from './assets/scripts/demo-gallery.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let previewsPaused = reducedMotion.matches;
const ambient = $$('.ambient-video');
const visibleAmbient = new Set();

function loadVideo(video) {
  const source = video.querySelector('source[data-src]');
  if (source) { source.src = source.dataset.src; source.removeAttribute('data-src'); video.load(); }
}
function playPreview(video) { loadVideo(video); video.play().catch(() => {}); }
function syncMotionButton() {
  $('#motion-toggle').textContent = previewsPaused ? 'Play previews ▷' : 'Pause previews Ⅱ';
  $('#motion-toggle').setAttribute('aria-pressed', String(previewsPaused));
}
$('#motion-toggle').addEventListener('click', () => {
  previewsPaused = !previewsPaused;
  syncMotionButton();
  ambient.forEach(v => previewsPaused ? v.pause() : visibleAmbient.has(v) && playPreview(v));
});
reducedMotion.addEventListener('change', e => {
  previewsPaused = e.matches; syncMotionButton();
  ambient.forEach(v => previewsPaused ? v.pause() : visibleAmbient.has(v) && playPreview(v));
});
syncMotionButton();
const previewObserver = new IntersectionObserver(entries => {
  entries.forEach(({target,isIntersecting}) => {
    if (isIntersecting) { visibleAmbient.add(target); if (!previewsPaused && !document.hidden) playPreview(target); }
    else { visibleAmbient.delete(target); target.pause(); }
  });
}, {threshold:0.1});
ambient.forEach(v => previewObserver.observe(v));
document.addEventListener('visibilitychange', () => ambient.forEach(v => {
  if (document.hidden) v.pause(); else if (!previewsPaused && visibleAmbient.has(v)) playPreview(v);
}));
const lazyObserver = new IntersectionObserver(entries => entries.forEach(({target,isIntersecting}) => {
  if (isIntersecting) { loadVideo(target); lazyObserver.unobserve(target); }
}), {rootMargin:'250px'});
$$('.lazy-video').forEach(v => {
  lazyObserver.observe(v);
  // A fast anchor jump can reach native controls before the observer callback.
  v.addEventListener('pointerdown', () => loadVideo(v), {once:true, capture:true});
});
initDemoGallery($('#live-demo'), loadVideo);

// Seek within the original Usagi recording; no replacement or reordered footage.
const usagiVideo = $('#usagi-demo');
$$('[data-usagi-seek]').forEach(button => button.addEventListener('click', () => {
  loadVideo(usagiVideo);
  const seek = () => { usagiVideo.currentTime = Number(button.dataset.usagiSeek); usagiVideo.play().catch(() => {}); };
  if (usagiVideo.readyState >= 1) seek();
  else usagiVideo.addEventListener('loadedmetadata', seek, {once:true});
}));
usagiVideo.addEventListener('timeupdate', () => {
  // Empty transition frames between objects are retained in the full recording.
  const t = usagiVideo.currentTime;
  const active = t < 15 ? '2' : t >= 17 && t < 32 ? '18' : t >= 34 ? '34' : null;
  $$('[data-usagi-seek]').forEach(b => {
    if (b.dataset.usagiSeek === active) b.setAttribute('aria-current','true');
    else b.removeAttribute('aria-current');
  });
});

const sequences = {
  REAL275: [['scene_2','Scene 2'],['scene_5','Scene 5'],['scene_6','Scene 6']],
  HouseCat6D: [['test_scene1','Test scene 1'],['test_scene3','Test scene 3'],['test_scene5','Test scene 5']]
};
let galleryDataset = 'REAL275';
function updateSequence() {
  const [id,label] = sequences[galleryDataset].find(s => s[0] === $('#sequence-select').value);
  const stem = `${galleryDataset.toLowerCase()}-${id}`;
  const video = $('#comparison-video');
  video.pause();
  const source = video.querySelector('source');
  source.removeAttribute('data-src');
  source.src = `assets/videos/${stem}.mp4`;
  video.poster = `assets/images/${stem}.jpg`;
  video.setAttribute('aria-label', `Four-method comparison on ${galleryDataset}, ${label}`);
  video.load();
}
$$('[data-gallery-dataset]').forEach(button => button.addEventListener('click', () => {
  galleryDataset = button.dataset.galleryDataset;
  $$('[data-gallery-dataset]').forEach(b => { const on = b === button; b.classList.toggle('active',on); b.setAttribute('aria-pressed',String(on)); });
  $('#sequence-select').replaceChildren(...sequences[galleryDataset].map(([id,label]) => new Option(label,id)));
  updateSequence();
}));
$('#sequence-select').addEventListener('change', updateSequence);

const resultData = fetch('data/results.json').then(r => { if (!r.ok) throw Error('Could not load results'); return r.json(); });
// Leave the complete server-rendered REAL275 table available if loading fails.
resultData.catch(() => {});
let requestedDataset = 'REAL275';
async function selectMetric(button) {
  requestedDataset = button.dataset.metricDataset;
  const requested = requestedDataset;
  try {
    const data = (await resultData)[requested];
    if (requested !== requestedDataset) return;
    $$('[data-metric-dataset]').forEach(b => { const on = b === button; b.classList.toggle('active',on); b.setAttribute('aria-selected',String(on)); b.tabIndex = on ? 0 : -1; });
    $('#metric-panel').setAttribute('aria-labelledby',button.id);
    $('#accuracy-table caption').textContent = `${requested} all-object accuracy. Higher is better.`;
    const best = [1,2,3,4].map(i => Math.max(...data.rows.map(r => r[i])));
    const rows = data.rows.map(row => {
      const tr = document.createElement('tr');
      if (row[0] === 'RYOPO') tr.className = 'ours';
      if (row[0] === 'RYOPO, mask-free') tr.className = 'maskfree-row';
      row.forEach((value,i) => {
        const cell = document.createElement(i ? 'td' : 'th');
        if (!i) { cell.scope = 'row'; cell.textContent = value; }
        else if (value === best[i-1]) { const strong = document.createElement('strong'); strong.textContent = value.toFixed(1); cell.append(strong); }
        else cell.textContent = value.toFixed(1);
        tr.append(cell);
      });
      return tr;
    });
    $('#accuracy-table tbody').replaceChildren(...rows);
    $('#metric-protocol').textContent = data.protocol;
  } catch { $('#metric-protocol').textContent = 'Unable to load additional benchmarks. The REAL275 table is retained; please reload to try again.'; }
}
const tabs = $$('[data-metric-dataset]');
tabs.forEach((b,i) => {
  b.addEventListener('click', () => selectMetric(b));
  b.addEventListener('keydown', e => {
    let next;
    if(e.key === 'ArrowRight') next=(i+1)%tabs.length;
    if(e.key === 'ArrowLeft') next=(i+tabs.length-1)%tabs.length;
    if(e.key === 'Home') next=0;
    if(e.key === 'End') next=tabs.length-1;
    if(next !== undefined) {e.preventDefault();tabs[next].focus();selectMetric(tabs[next]);}
  });
});
const dialog = $('#figure-dialog');
$$('[data-zoom]').forEach(b => b.addEventListener('click', () => {
  $('#dialog-title').textContent = b.dataset.title;
  $('#dialog-image').src = b.dataset.zoom;
  $('#dialog-image').alt = b.querySelector('img').alt;
  dialog.showModal();
}));
$('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if(e.target === dialog) { const r=dialog.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) dialog.close(); } });
