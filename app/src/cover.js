// Draws the Vice Cover: a multi-panel poster, a sunset grade over every panel, and a bold
// outlined caption along the foot. Pure canvas 2D, no libraries. `state` is:
//   { layout: 'hero' | 'trio' | 'duo', caption, sub, color,
//     panels: [{ img, zoom, ox, oy, flip }, ...] }

const LAYOUTS = {
  hero: (w, h, g) => [
    { x: 0, y: 0, w: w * 0.66 - g / 2, h },
    { x: w * 0.66 + g / 2, y: 0, w: w * 0.34 - g / 2, h: h / 2 - g / 2 },
    { x: w * 0.66 + g / 2, y: h / 2 + g / 2, w: w * 0.34 - g / 2, h: h / 2 - g / 2 },
  ],
  trio: (w, h, g) => {
    const pw = (w - 2 * g) / 3;
    return [0, 1, 2].map((i) => ({ x: i * (pw + g), y: 0, w: pw, h }));
  },
  duo: (w, h, g) => {
    const pw = (w - g) / 2;
    return [0, 1].map((i) => ({ x: i * (pw + g), y: 0, w: pw, h }));
  },
};

/** How many panels a layout shows. */
export function panelCount(layout) {
  return layout === 'duo' ? 2 : 3;
}

function gutter(w, h) {
  return Math.max(4, Math.round(Math.min(w, h) * 0.008));
}

/** The panel rectangles for a layout at a canvas size. */
export function coverPanels(layout, w, h) {
  return LAYOUTS[layout](w, h, gutter(w, h));
}

/** Draws the whole cover onto the canvas at its own size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const g = gutter(w, h);
  ctx.fillStyle = '#160a20';
  ctx.fillRect(0, 0, w, h);
  const rects = coverPanels(state.layout, w, h);
  const n = panelCount(state.layout);
  for (let i = 0; i < n; i++) {
    drawPanel(ctx, rects[i], state.panels[i]);
  }
  // Thin white frame around each panel, poster style.
  ctx.lineWidth = Math.max(2, Math.round(g * 0.45));
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  for (let i = 0; i < n; i++) {
    const r = rects[i];
    ctx.strokeRect(r.x + ctx.lineWidth / 2, r.y + ctx.lineWidth / 2, r.w - ctx.lineWidth, r.h - ctx.lineWidth);
  }
  drawCaption(ctx, w, h, state);
}

function drawPanel(ctx, r, panel) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.fillStyle = '#2b1838';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const img = panel && panel.img;
  if (img) {
    const zoom = panel.zoom || 1;
    const base = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight);
    const sw = img.naturalWidth * base * zoom;
    const sh = img.naturalHeight * base * zoom;
    const maxOx = Math.max(0, (sw - r.w) / 2);
    const maxOy = Math.max(0, (sh - r.h) / 2);
    const ox = clamp(panel.ox || 0, -maxOx, maxOx);
    const oy = clamp(panel.oy || 0, -maxOy, maxOy);
    const cx = r.x + r.w / 2 + ox;
    const cy = r.y + r.h / 2 + oy;
    ctx.save();
    ctx.filter = 'saturate(1.25) contrast(1.08)';
    if (panel.flip) {
      ctx.translate(cx, cy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
    } else {
      ctx.drawImage(img, cx - sw / 2, cy - sh / 2, sw, sh);
    }
    ctx.restore();
  }
  // Sunset grade: warm orange at the top fading to magenta and purple at the bottom.
  const grade = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  grade.addColorStop(0, 'rgba(255, 150, 60, 0.14)');
  grade.addColorStop(0.55, 'rgba(230, 60, 120, 0.16)');
  grade.addColorStop(1, 'rgba(80, 25, 140, 0.30)');
  ctx.fillStyle = grade;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // Subtle vignette so the panel edges fall away.
  const vig = ctx.createRadialGradient(
    r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.35,
    r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(10, 0, 20, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

function drawCaption(ctx, w, h, state) {
  const text = (state.caption || '').trim().toUpperCase();
  const sub = (state.sub || '').trim().toUpperCase();
  // Scrim so the lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, h * 0.68, 0, h);
  scrim.addColorStop(0, 'rgba(15, 4, 26, 0)');
  scrim.addColorStop(1, 'rgba(15, 4, 26, 0.62)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (sub) {
    let subSize = Math.round(h * 0.032);
    ctx.font = `700 ${subSize}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.22)}px`; } catch { /* older canvas */ }
    while (ctx.measureText(sub).width > w * 0.86 && subSize > 10) {
      subSize -= 1;
      ctx.font = `700 ${subSize}px system-ui, sans-serif`;
    }
    ctx.fillStyle = '#ffd34d';
    ctx.fillText(sub, w / 2, h - h * 0.155);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  if (!text) return;
  let size = Math.round(h * 0.105);
  const font = (s) => `900 ${s}px "Arial Black", "Helvetica Neue", system-ui, sans-serif`;
  ctx.font = font(size);
  while (ctx.measureText(text).width > w * 0.92 && size > 16) {
    size -= 2;
    ctx.font = font(size);
  }
  const y = h - h * 0.045;
  const x = w / 2;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.16);
  ctx.strokeStyle = '#0d0512';
  // Offset drop shadow, then the heavy outline, then the fill.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillText(text, x + size * 0.035, y + size * 0.045);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = state.color || '#ffffff';
  ctx.fillText(text, x, y);
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
