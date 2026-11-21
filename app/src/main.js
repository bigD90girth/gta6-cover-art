// Wires the Vice Cover editor: layouts, sizes, one photo per panel, caption, export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, panelCount, coverPanels } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subInput = document.getElementById('subcaption');
const status = document.getElementById('status');
const panelsBox = document.getElementById('panels');

const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };

function blankPanel() {
  return { img: null, sample: '', zoom: 1, ox: 0, oy: 0, flip: false };
}

const state = {
  layout: 'hero',
  size: '1920x1080',
  caption: 'Sunset Heist',
  sub: 'Vice City • 2026',
  color: '#ffffff',
  panels: [blankPanel(), blankPanel(), blankPanel()],
  selected: 0,
};

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  drawCover(canvas, state);
}

async function loadSampleInto(i, name) {
  if (!name) {
    state.panels[i].img = null;
    state.panels[i].sample = '';
  } else {
    state.panels[i].img = await loadImage(`samples/${name}.jpg`);
    state.panels[i].sample = name;
  }
  syncPanelCard(i);
  redraw();
}

function setSize(key) {
  state.size = key;
  const [w, h] = SIZES[key];
  canvas.width = w;
  canvas.height = h;
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === key));
  redraw();
}

function setLayout(layout) {
  state.layout = layout;
  if (state.selected >= panelCount(layout)) state.selected = 0;
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === layout));
  buildPanelCards();
  redraw();
}

function setCaption(text) {
  state.caption = text;
  captionInput.value = text;
  redraw();
}

function setSub(text) {
  state.sub = text;
  subInput.value = text;
  redraw();
}

function setColor(color) {
  state.color = color;
  document.querySelectorAll('[data-color]').forEach((b) => b.classList.toggle('active', b.dataset.color === color));
  redraw();
}

function selectPanel(i) {
  state.selected = i;
  document.querySelectorAll('.panel-card').forEach((c) => c.classList.toggle('selected', Number(c.dataset.panel) === i));
}

function syncPanelCard(i) {
  const card = panelsBox.querySelector(`.panel-card[data-panel="${i}"]`);
  if (!card) return;
  card.querySelector('[data-sample]').value = state.panels[i].sample;
  card.querySelector('[data-zoom]').value = state.panels[i].zoom;
  card.querySelector('[data-flip]').classList.toggle('active', state.panels[i].flip);
}

function buildPanelCards() {
  panelsBox.querySelectorAll('.panel-card').forEach((c) => c.remove());
  const n = panelCount(state.layout);
  for (let i = 0; i < n; i++) {
    const card = document.createElement('div');
    card.className = 'panel-card';
    card.dataset.panel = i;
    card.innerHTML = `
      <strong>Panel ${i + 1}</strong>
      <label>Sample photo
        <select data-sample>
          <option value="">Empty</option>
          <option value="pier">Pier at dusk</option>
          <option value="boulevard">Boulevard</option>
        </select>
      </label>
      <label>Or upload your own <input type="file" accept="image/*" data-upload></label>
      <label>Zoom <input type="range" min="1" max="2.5" step="0.05" value="1" data-zoom></label>
      <button type="button" data-flip>Flip photo</button>`;
    card.addEventListener('click', () => selectPanel(i));
    card.querySelector('[data-sample]').addEventListener('change', async (e) => {
      await loadSampleInto(i, e.target.value);
    });
    card.querySelector('[data-upload]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      state.panels[i].img = await loadImage(URL.createObjectURL(file));
      state.panels[i].sample = '';
      syncPanelCard(i);
      redraw();
    });
    card.querySelector('[data-zoom]').addEventListener('input', (e) => {
      state.panels[i].zoom = Number(e.target.value);
      redraw();
    });
    card.querySelector('[data-flip]').addEventListener('click', (e) => {
      e.stopPropagation();
      state.panels[i].flip = !state.panels[i].flip;
      syncPanelCard(i);
      redraw();
    });
    panelsBox.appendChild(card);
    syncPanelCard(i);
  }
  selectPanel(state.selected);
}

// Canvas position in canvas pixels, for hit-testing and dragging.
function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * canvas.width / r.width,
    y: (e.clientY - r.top) * canvas.height / r.height,
  };
}

function hitPanel(p) {
  const rects = coverPanels(state.layout, canvas.width, canvas.height);
  for (let i = 0; i < panelCount(state.layout); i++) {
    const r = rects[i];
    if (p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = toCanvas(e);
  const i = hitPanel(p);
  if (i < 0) return;
  selectPanel(i);
  drag = { i, x: p.x, y: p.y };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = toCanvas(e);
  state.panels[drag.i].ox += p.x - drag.x;
  state.panels[drag.i].oy += p.y - drag.y;
  drag.x = p.x;
  drag.y = p.y;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

document.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => setLayout(b.dataset.layout)));
document.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => setSize(b.dataset.size)));
document.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => setColor(b.dataset.color)));
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subInput.addEventListener('input', () => { state.sub = subInput.value; redraw(); });
document.getElementById('export').addEventListener('click', () => {
  const [w, h] = SIZES[state.size];
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    status.textContent = `Saved cover-${w}x${h}.png`;
  }, 'image/png');
});

const api = { state, setSize, setLayout, loadSampleInto, setCaption, setSub, setColor, redraw };
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), api);
} else {
  buildPanelCards();
  setSize(state.size);
  await loadSampleInto(0, 'pier');
  await loadSampleInto(1, 'boulevard');
  await loadSampleInto(2, 'pier');
}
