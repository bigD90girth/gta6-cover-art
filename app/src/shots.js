// Fixed scenes for screenshots: ?shot=cover shows the cover alone, ?shot=editor shows the
// editor with a photo loaded. The query may set size, layout, photos (comma list of sample
// names), caption, sub and color. window.__shotReady is set once the scene is painted.
import { panelCount } from './cover.js';

export async function runShot(shot, query, api) {
  api.setSize(query.get('size') || '1920x1080');
  api.setLayout(query.get('layout') || 'hero');
  const photos = (query.get('photos') || 'pier,boulevard,pier').split(',');
  const n = panelCount(api.state.layout);
  for (let i = 0; i < n; i++) {
    await api.loadSampleInto(i, photos[i] || 'pier');
  }
  api.setCaption(query.get('caption') ?? 'Sunset Heist');
  api.setSub(query.get('sub') ?? 'Vice City • 2026');
  const color = query.get('color');
  if (color) api.setColor(color);
  if (shot === 'cover') document.body.classList.add('shot-cover');
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
