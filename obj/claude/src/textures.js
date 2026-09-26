// Every texture in the scene is painted here at runtime with the 2D canvas API.
// No image files are loaded.
import * as THREE from 'three';

export const FONT_JP = '"Noto Sans JP","Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,sans-serif';
export const FONT_ROUND = '"M PLUS Rounded 1c","Hiragino Maru Gothic ProN",' + FONT_JP;
export const FONT_DISPLAY = '"Dela Gothic One",' + FONT_JP;

let maxAniso = 4;
export function setMaxAnisotropy(n) { maxAniso = Math.min(n, 8); }

// ---------------------------------------------------------------- helpers

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function toTexture(canvas, { srgb = true, repeat = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function txt(ctx, s, x, y, size, o = {}) {
  const { font = FONT_JP, weight = 900, color = '#000', align = 'center', maxW = Infinity,
    stroke = null, strokeW = 0, spacing = 0, baseline = 'middle', alpha = 1 } = o;
  const hasLS = 'letterSpacing' in ctx;
  if (hasLS) ctx.letterSpacing = spacing + 'px';
  let sz = size;
  ctx.font = `${weight} ${sz}px ${font}`;
  const w = ctx.measureText(s).width;
  if (w > maxW) { sz *= maxW / w; ctx.font = `${weight} ${sz}px ${font}`; }
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.globalAlpha = alpha;
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = stroke;
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.globalAlpha = 1;
  if (hasLS) ctx.letterSpacing = '0px';
}

// Vertical Japanese text (tategaki); long-vowel marks are rotated.
function vtxt(ctx, s, x, y0, size, o = {}) {
  const chars = [...s];
  chars.forEach((ch, i) => {
    const y = y0 + size * 0.5 + i * size * 1.02;
    if ('ー〜～'.includes(ch)) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 2);
      txt(ctx, ch, 0, 0, size, o);
      ctx.restore();
    } else txt(ctx, ch, x, y, size, o);
  });
}

function vgrad(ctx, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach((c, i) => g.addColorStop(i / Math.max(1, stops.length - 1), c));
  return g;
}

function rand(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Draws with a blurred shadow but keeps the shape itself off-canvas, which gives
// a soft blob in every browser (ctx.filter is not universally supported).
function softShape(ctx, blur, color, draw) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 10000;
  ctx.translate(-10000, 0);
  ctx.fillStyle = '#000';
  draw();
  ctx.restore();
}

// Faded / sun-bleached overlay used on older stickers
function fade(ctx, w, h, amount) {
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = `rgba(255,250,240,${amount})`;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- stage

export function backgroundTexture() {
  const [c, x] = makeCanvas(1024, 1024);
  const g = x.createRadialGradient(512, 430, 40, 512, 560, 760);
  g.addColorStop(0, '#2b2d33');
  g.addColorStop(0.45, '#17181c');
  g.addColorStop(1, '#08090b');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 1024);
  return toTexture(c);
}

export function floorAlphaTexture() {
  const [c, x] = makeCanvas(512, 512);
  const g = x.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.22, '#e6e6e6');
  g.addColorStop(0.5, '#555');
  g.addColorStop(0.8, '#0d0d0d');
  g.addColorStop(1, '#000');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  return toTexture(c, { srgb: false });
}

export function contactShadowTexture() {
  const [c, x] = makeCanvas(512, 512);
  // wide, soft outer shadow
  softShape(x, 60, 'rgba(0,0,0,0.55)', () => { rrect(x, 106, 136, 300, 240, 20); x.fill(); });
  // tight, dark core right under the plinth
  softShape(x, 14, 'rgba(0,0,0,0.9)', () => { rrect(x, 124, 158, 264, 196, 8); x.fill(); });
  return toTexture(c);
}

// ---------------------------------------------------------------- body wear

// Maps the door's front cap (x -0.5..0.5, y 0.08..1.80) onto the canvas.
export function bodyWearTextures() {
  const Wp = 512, Hp = 880;
  const px = (x) => (x + 0.5) * Wp;
  const py = (y) => (1 - (y - 0.08) / 1.72) * Hp;
  const [cc, c] = makeCanvas(Wp, Hp);
  const [rc, r] = makeCanvas(Wp, Hp);
  const rnd = rand(7);

  c.fillStyle = vgrad(c, Hp, ['#d0142a', '#c8102a', '#b80e24']);
  c.fillRect(0, 0, Wp, Hp);
  r.fillStyle = 'rgb(70,70,70)';
  r.fillRect(0, 0, Wp, Hp);

  // very fine orange-peel in the paint
  for (let i = 0; i < 9000; i++) {
    const a = rnd() * 0.035;
    c.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    c.fillRect(rnd() * Wp, rnd() * Hp, 1.5, 1.5);
  }

  const scratch = (x0, y0, x1, y1, n, len, col, rough) => {
    for (let i = 0; i < n; i++) {
      const x = px(x0 + rnd() * (x1 - x0)), y = py(y0 + rnd() * (y1 - y0));
      const ang = (rnd() - 0.5) * 1.2 + (rnd() > 0.5 ? 0 : Math.PI / 2);
      const l = len * (0.3 + rnd());
      c.strokeStyle = col(rnd()); c.lineWidth = 0.6 + rnd() * 0.8;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l); c.stroke();
      r.strokeStyle = rough; r.lineWidth = 1.5;
      r.beginPath(); r.moveTo(x, y); r.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l); r.stroke();
    }
  };
  const smudge = (x, y, rx, ry, col, rough) => {
    const g = c.createRadialGradient(px(x), py(y), 0, px(x), py(y), rx * Wp);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save(); c.translate(px(x), py(y)); c.scale(1, ry / rx); c.translate(-px(x), -py(y));
    c.fillStyle = g; c.fillRect(0, 0, Wp, Hp); c.restore();
    const gr = r.createRadialGradient(px(x), py(y), 0, px(x), py(y), rx * Wp);
    gr.addColorStop(0, rough); gr.addColorStop(1, 'rgba(70,70,70,0)');
    r.save(); r.translate(px(x), py(y)); r.scale(1, ry / rx); r.translate(-px(x), -py(y));
    r.fillStyle = gr; r.fillRect(0, 0, Wp, Hp); r.restore();
  };

  // shoe scuffs along the bottom edge
  for (let i = 0; i < 9; i++) smudge(-0.42 + rnd() * 0.8, 0.10 + rnd() * 0.04, 0.02 + rnd() * 0.04, 0.008 + rnd() * 0.01, 'rgba(40,20,20,0.22)', 'rgba(150,150,150,0.8)');
  scratch(-0.45, 0.09, 0.4, 0.16, 45, 8, (a) => `rgba(255,220,220,${0.05 + a * 0.1})`, 'rgb(130,130,130)');
  // hands reaching into the pickup bay
  scratch(-0.42, 0.13, 0.15, 0.44, 40, 6, (a) => `rgba(255,230,230,${0.04 + a * 0.1})`, 'rgb(120,120,120)');
  smudge(-0.14, 0.42, 0.2, 0.03, 'rgba(255,255,255,0.05)', 'rgba(130,130,130,0.8)');
  // fingers around the control column
  scratch(0.20, 0.8, 0.26, 1.45, 50, 6, (a) => `rgba(255,230,230,${0.1 + a * 0.15})`, 'rgb(125,125,125)');
  smudge(0.235, 1.2, 0.03, 0.18, 'rgba(255,255,255,0.05)', 'rgba(125,125,125,0.9)');
  // a couple of tiny paint chips
  for (let i = 0; i < 6; i++) {
    const x = px(-0.45 + rnd() * 0.9), y = py(0.1 + rnd() * 0.5);
    c.fillStyle = 'rgba(210,205,200,0.55)';
    c.beginPath(); c.ellipse(x, y, 1 + rnd() * 1.6, 0.8 + rnd(), rnd() * 3, 0, 7); c.fill();
    r.fillStyle = 'rgb(200,200,200)'; r.fillRect(x - 2, y - 2, 4, 4);
  }

  const map = toTexture(cc);
  const roughnessMap = toTexture(rc, { srgb: false });
  for (const t of [map, roughnessMap]) {
    t.repeat.set(1, 1 / 1.72);
    t.offset.set(0.5, -0.08 / 1.72);
  }
  return { map, roughnessMap };
}

// Pale-grey control panel with fingerprint grime near the slots
export function panelGrimeTexture() {
  const [c, x] = makeCanvas(256, 1024);
  x.fillStyle = '#e4e7ea'; x.fillRect(0, 0, 256, 1024);
  const rnd = rand(3);
  for (let i = 0; i < 4000; i++) {
    x.fillStyle = `rgba(0,0,0,${rnd() * 0.03})`;
    x.fillRect(rnd() * 256, rnd() * 1024, 2, 2);
  }
  const spot = (cx, cy, rr, a) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
    g.addColorStop(0, `rgba(90,80,70,${a})`); g.addColorStop(1, 'rgba(90,80,70,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 1024);
  };
  spot(150, 205, 70, 0.10); spot(128, 340, 90, 0.08); spot(100, 468, 50, 0.08);
  spot(128, 700, 80, 0.06); spot(128, 1000, 120, 0.05);
  return toTexture(c);
}

export function screwHeadTexture() {
  const [c, x] = makeCanvas(64, 64);
  const g = x.createRadialGradient(26, 24, 2, 32, 32, 34);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#9ea3a8');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  x.strokeStyle = '#2b2d30'; x.lineWidth = 7; x.lineCap = 'round';
  x.beginPath(); x.moveTo(18, 32); x.lineTo(46, 32); x.moveTo(32, 18); x.lineTo(32, 46); x.stroke();
  return toTexture(c);
}

export function keyholeTexture() {
  const [c, x] = makeCanvas(128, 128);
  const g = x.createRadialGradient(50, 44, 4, 64, 64, 70);
  g.addColorStop(0, '#fffaf0'); g.addColorStop(0.6, '#c9c1a8'); g.addColorStop(1, '#8a826b');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 3;
  x.beginPath(); x.arc(64, 64, 44, 0, 7); x.stroke();
  x.fillStyle = '#111';
  x.beginPath(); x.arc(64, 54, 11, 0, 7); x.fill();
  x.beginPath(); x.moveTo(58, 58); x.lineTo(70, 58); x.lineTo(74, 88); x.lineTo(54, 88); x.fill();
  return toTexture(c);
}

// ---------------------------------------------------------------- header sign

export function mascotFace(x, cx, cy, r, { wave = false } = {}) {
  // Niko-chan: a round, red, smiling drop with a white highlight
  x.save();
  x.fillStyle = '#e3162f';
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  x.lineWidth = r * 0.08; x.strokeStyle = '#fff'; x.stroke();
  x.fillStyle = 'rgba(255,255,255,0.35)';
  x.beginPath(); x.ellipse(cx - r * 0.42, cy - r * 0.45, r * 0.22, r * 0.12, -0.6, 0, 7); x.fill();
  x.strokeStyle = '#fff'; x.lineCap = 'round'; x.lineWidth = r * 0.11;
  x.beginPath(); x.arc(cx - r * 0.34, cy - r * 0.02, r * 0.16, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
  x.beginPath(); x.arc(cx + r * 0.34, cy - r * 0.02, r * 0.16, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
  x.beginPath(); x.arc(cx, cy + r * 0.18, r * 0.38, Math.PI * 0.15, Math.PI * 0.85); x.stroke();
  x.fillStyle = '#ff9aa8';
  x.beginPath(); x.ellipse(cx - r * 0.6, cy + r * 0.28, r * 0.13, r * 0.08, 0, 0, 7); x.fill();
  x.beginPath(); x.ellipse(cx + r * 0.6, cy + r * 0.28, r * 0.13, r * 0.08, 0, 0, 7); x.fill();
  if (wave) {
    x.fillStyle = '#e3162f'; x.strokeStyle = '#fff'; x.lineWidth = r * 0.06;
    x.beginPath(); x.ellipse(cx + r * 1.05, cy - r * 0.55, r * 0.2, r * 0.28, 0.5, 0, 7); x.fill(); x.stroke();
  }
  x.restore();
}

export function headerSignTexture() {
  const Wp = 2048, Hp = 364;
  const [c, x] = makeCanvas(Wp, Hp);
  x.fillStyle = vgrad(x, Hp, ['#ffffff', '#fff6f4', '#ffe9e6']);
  x.fillRect(0, 0, Wp, Hp);
  // soft diagonal light streaks
  x.save(); x.globalAlpha = 0.18;
  for (let i = 0; i < 14; i++) {
    x.fillStyle = i % 2 ? '#ffd6d6' : '#fff';
    x.beginPath(); x.moveTo(i * 180 - 200, Hp); x.lineTo(i * 180 - 110, Hp); x.lineTo(i * 180 + 60, 0); x.lineTo(i * 180 - 30, 0); x.fill();
  }
  x.restore();
  x.fillStyle = '#d6102a'; x.fillRect(0, 0, Wp, 22); x.fillRect(0, Hp - 22, Wp, 22);
  x.fillStyle = '#ffffff'; x.fillRect(0, 22, Wp, 5); x.fillRect(0, Hp - 27, Wp, 5);

  mascotFace(x, 200, Hp / 2, 118, { wave: true });

  txt(x, 'にこにこドリンク', 820, 150, 170, { font: FONT_DISPLAY, weight: 400, color: '#d6102a', stroke: '#fff', strokeW: 18, maxW: 1000 });
  txt(x, 'NIKONIKO DRINKS', 820, 280, 70, { font: FONT_ROUND, weight: 800, color: '#7a0a18', spacing: 16 });

  // slogan block
  x.fillStyle = '#d6102a';
  rrect(x, 1400, 60, 590, 244, 30); x.fill();
  txt(x, '毎日、ほっと一息。', 1695, 125, 72, { font: FONT_ROUND, weight: 800, color: '#fff', maxW: 540 });
  x.fillStyle = '#2a7de1'; rrect(x, 1440, 185, 240, 64, 32); x.fill();
  x.fillStyle = '#ffffff'; rrect(x, 1710, 185, 240, 64, 32); x.fill();
  txt(x, 'つめた〜い', 1560, 218, 40, { font: FONT_ROUND, weight: 800, color: '#fff' });
  txt(x, 'あったか〜い', 1830, 218, 40, { font: FONT_ROUND, weight: 800, color: '#d6102a' });
  txt(x, 'Every sip, a little smile.', 1695, 278, 30, { font: FONT_ROUND, weight: 500, color: '#ffe3e6' });
  return toTexture(c);
}

// ---------------------------------------------------------------- drink labels

const GFX = {
  bean(x, col) {
    for (const [ox, oy, rot] of [[-0.35, 0.1, -0.5], [0.35, -0.1, 0.6]]) {
      x.save(); x.translate(ox, oy); x.rotate(rot);
      x.fillStyle = col[0]; x.beginPath(); x.ellipse(0, 0, 0.42, 0.6, 0, 0, 7); x.fill();
      x.strokeStyle = col[1]; x.lineWidth = 0.08;
      x.beginPath(); x.moveTo(0, -0.5); x.bezierCurveTo(0.2, -0.15, -0.2, 0.15, 0, 0.5); x.stroke();
      x.restore();
    }
  },
  tiger(x, col) {
    x.fillStyle = col[0]; x.beginPath(); x.arc(0, 0, 0.9, 0, 7); x.fill();
    x.fillStyle = col[1];
    for (let i = -2; i <= 2; i++) {
      x.beginPath(); x.moveTo(i * 0.32 - 0.08, -0.85 + Math.abs(i) * 0.12);
      x.quadraticCurveTo(i * 0.32 + 0.2, -0.1, i * 0.32, 0.2);
      x.quadraticCurveTo(i * 0.32 + 0.06, -0.2, i * 0.32 + 0.1, -0.85 + Math.abs(i) * 0.12); x.fill();
    }
    x.fillStyle = col[1]; x.beginPath(); x.arc(-0.3, 0.35, 0.09, 0, 7); x.arc(0.3, 0.35, 0.09, 0, 7); x.fill();
  },
  cup(x, col) {
    x.fillStyle = col[0];
    x.beginPath(); x.moveTo(-0.6, -0.1); x.lineTo(0.5, -0.1); x.quadraticCurveTo(0.45, 0.75, -0.05, 0.75); x.quadraticCurveTo(-0.55, 0.75, -0.6, -0.1); x.fill();
    x.strokeStyle = col[0]; x.lineWidth = 0.12; x.beginPath(); x.arc(0.52, 0.2, 0.2, -1.4, 1.4); x.stroke();
    x.strokeStyle = col[1]; x.lineWidth = 0.09; x.lineCap = 'round';
    for (const o of [-0.3, 0, 0.3]) { x.beginPath(); x.moveTo(o, -0.25); x.bezierCurveTo(o + 0.2, -0.45, o - 0.2, -0.6, o, -0.85); x.stroke(); }
  },
  heart(x, col) {
    x.fillStyle = col[0];
    x.beginPath(); x.moveTo(0, 0.8);
    x.bezierCurveTo(-1.1, 0, -0.6, -0.95, 0, -0.35);
    x.bezierCurveTo(0.6, -0.95, 1.1, 0, 0, 0.8); x.fill();
    x.fillStyle = col[1]; x.beginPath(); x.ellipse(-0.32, -0.25, 0.15, 0.09, -0.6, 0, 7); x.fill();
  },
  leaf(x, col) {
    for (const [rot, s] of [[-0.5, 1], [0.6, 0.75]]) {
      x.save(); x.rotate(rot); x.scale(s, s);
      x.fillStyle = col[0];
      x.beginPath(); x.moveTo(0, 0.9); x.quadraticCurveTo(0.7, 0, 0, -0.9); x.quadraticCurveTo(-0.7, 0, 0, 0.9); x.fill();
      x.strokeStyle = col[1]; x.lineWidth = 0.06; x.beginPath(); x.moveTo(0, 0.85); x.lineTo(0, -0.8); x.stroke();
      x.restore();
    }
  },
  barley(x, col) {
    x.strokeStyle = col[1]; x.lineWidth = 0.07; x.beginPath(); x.moveTo(0, 1); x.quadraticCurveTo(0.1, 0, 0, -0.95); x.stroke();
    x.fillStyle = col[0];
    for (let i = 0; i < 6; i++) {
      const y = -0.8 + i * 0.25;
      for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * 0.16, y, 0.12, 0.2, s * 0.5, 0, 7); x.fill(); }
    }
  },
  drop(x, col) {
    x.fillStyle = col[0];
    x.beginPath(); x.moveTo(0, -0.95); x.bezierCurveTo(0.35, -0.4, 0.7, 0, 0.7, 0.3); x.arc(0, 0.3, 0.7, 0, Math.PI); x.bezierCurveTo(-0.7, 0, -0.35, -0.4, 0, -0.95); x.fill();
    x.fillStyle = col[1]; x.beginPath(); x.ellipse(-0.28, 0.25, 0.12, 0.25, 0.3, 0, 7); x.fill();
  },
  cow(x, col) {
    x.fillStyle = '#fff'; x.strokeStyle = col[1]; x.lineWidth = 0.07;
    x.beginPath(); x.ellipse(-0.75, -0.45, 0.25, 0.14, -0.4, 0, 7); x.fill(); x.stroke();
    x.beginPath(); x.ellipse(0.75, -0.45, 0.25, 0.14, 0.4, 0, 7); x.fill(); x.stroke();
    x.beginPath(); x.arc(0, 0, 0.75, 0, 7); x.fill(); x.stroke();
    x.fillStyle = col[1]; x.beginPath(); x.ellipse(-0.35, -0.35, 0.22, 0.17, 0.4, 0, 7); x.fill();
    x.beginPath(); x.arc(-0.25, -0.05, 0.07, 0, 7); x.arc(0.25, -0.05, 0.07, 0, 7); x.fill();
    x.fillStyle = col[0]; x.beginPath(); x.ellipse(0, 0.35, 0.42, 0.26, 0, 0, 7); x.fill();
    x.fillStyle = col[1]; x.beginPath(); x.arc(-0.14, 0.35, 0.05, 0, 7); x.arc(0.14, 0.35, 0.05, 0, 7); x.fill();
  },
  lemon(x, col) {
    x.fillStyle = col[0]; x.beginPath(); x.arc(0, 0, 0.85, 0, 7); x.fill();
    x.fillStyle = col[1]; x.beginPath(); x.arc(0, 0, 0.72, 0, 7); x.fill();
    x.strokeStyle = col[0]; x.lineWidth = 0.07;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * 0.72, Math.sin(a) * 0.72); x.stroke(); }
    x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, 0.1, 0, 7); x.fill();
  },
  bubbles(x, col) {
    x.strokeStyle = col[0]; x.lineWidth = 0.07;
    for (const [bx, by, r] of [[0, 0, 0.45], [0.5, -0.55, 0.22], [-0.55, -0.4, 0.28], [-0.35, 0.6, 0.18], [0.55, 0.45, 0.3], [0.1, -0.85, 0.12]]) {
      x.beginPath(); x.arc(bx, by, r, 0, 7); x.stroke();
      x.fillStyle = col[1]; x.beginPath(); x.arc(bx - r * 0.35, by - r * 0.35, r * 0.18, 0, 7); x.fill();
    }
  },
  citrus(x, col) {
    x.fillStyle = col[0]; x.beginPath(); x.arc(0, 0.1, 0.78, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.ellipse(-0.3, -0.2, 0.2, 0.12, -0.6, 0, 7); x.fill();
    x.fillStyle = col[1]; x.beginPath(); x.moveTo(0.05, -0.65); x.quadraticCurveTo(0.7, -1.1, 0.9, -0.7); x.quadraticCurveTo(0.5, -0.4, 0.05, -0.65); x.fill();
    for (let i = 0; i < 18; i++) { x.fillStyle = 'rgba(0,0,0,0.08)'; x.beginPath(); x.arc(Math.sin(i * 2.3) * 0.55, 0.1 + Math.cos(i * 1.7) * 0.55, 0.03, 0, 7); x.fill(); }
  },
  star(x, col) {
    x.fillStyle = col[0]; x.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.42 : 0.95; const a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    x.fill();
    x.fillStyle = col[1]; x.beginPath(); x.arc(0, 0, 0.25, 0, 7); x.fill();
  },
  peach(x, col) {
    const g = x.createRadialGradient(-0.2, -0.1, 0.1, 0, 0.1, 0.9);
    g.addColorStop(0, col[1]); g.addColorStop(1, col[0]);
    x.fillStyle = g;
    x.beginPath(); x.moveTo(0, -0.55);
    x.bezierCurveTo(-0.9, -0.95, -1.05, 0.55, 0, 0.85);
    x.bezierCurveTo(1.05, 0.55, 0.9, -0.95, 0, -0.55); x.fill();
    x.strokeStyle = 'rgba(160,40,60,0.35)'; x.lineWidth = 0.05; x.beginPath(); x.moveTo(0, -0.5); x.quadraticCurveTo(0.15, 0.1, 0, 0.8); x.stroke();
    x.fillStyle = '#4c9a3a'; x.beginPath(); x.moveTo(0, -0.58); x.quadraticCurveTo(0.45, -1.05, 0.75, -0.8); x.quadraticCurveTo(0.4, -0.55, 0, -0.58); x.fill();
  },
  marble(x, col) {
    x.strokeStyle = col[1]; x.lineWidth = 0.08;
    for (let k = 0; k < 3; k++) { x.beginPath(); for (let i = -10; i <= 10; i++) { const px = i * 0.1; x.lineTo(px, 0.45 + k * 0.22 + Math.sin(i * 0.9) * 0.05); } x.stroke(); }
    const g = x.createRadialGradient(-0.12, -0.35, 0.03, 0, -0.2, 0.5);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, col[0]); g.addColorStop(1, '#2a6db0');
    x.fillStyle = g; x.beginPath(); x.arc(0, -0.2, 0.45, 0, 7); x.fill();
  },
  bolt(x, col) {
    x.fillStyle = col[0]; x.strokeStyle = col[1]; x.lineWidth = 0.08;
    x.beginPath(); x.moveTo(0.2, -1); x.lineTo(-0.55, 0.12); x.lineTo(-0.05, 0.12); x.lineTo(-0.25, 1); x.lineTo(0.55, -0.18); x.lineTo(0.05, -0.18); x.closePath(); x.fill(); x.stroke();
  },
  sakura(x, col) {
    for (const [ox, oy, s] of [[0, 0, 1], [0.8, -0.7, 0.4], [-0.85, 0.6, 0.35]]) {
      x.save(); x.translate(ox, oy); x.scale(s, s);
      x.fillStyle = col[0];
      for (let i = 0; i < 5; i++) {
        x.save(); x.rotate(i * Math.PI * 2 / 5);
        x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-0.45, -0.3, -0.35, -0.85, -0.08, -0.85); x.lineTo(0, -0.72); x.lineTo(0.08, -0.85); x.bezierCurveTo(0.35, -0.85, 0.45, -0.3, 0, 0); x.fill();
        x.restore();
      }
      x.fillStyle = col[1]; x.beginPath(); x.arc(0, 0, 0.15, 0, 7); x.fill();
      x.restore();
    }
  },
  corn(x, col) {
    x.fillStyle = '#6ba53a';
    x.beginPath(); x.moveTo(0, 0.95); x.quadraticCurveTo(-0.75, 0.3, -0.35, -0.5); x.quadraticCurveTo(-0.3, 0.3, 0, 0.95); x.fill();
    x.beginPath(); x.moveTo(0, 0.95); x.quadraticCurveTo(0.75, 0.3, 0.35, -0.5); x.quadraticCurveTo(0.3, 0.3, 0, 0.95); x.fill();
    x.fillStyle = col[0]; x.beginPath(); x.ellipse(0, -0.05, 0.3, 0.85, 0, 0, 7); x.fill();
    x.fillStyle = col[1];
    for (let j = -6; j <= 6; j++) for (let i = -1; i <= 1; i++) { x.beginPath(); x.arc(i * 0.16, j * 0.12 - 0.05, 0.05, 0, 7); x.fill(); }
  },
  aroma(x, col) {
    GFX.bean(x, col);
    x.strokeStyle = col[1]; x.lineWidth = 0.06;
    x.beginPath(); for (let a = 0; a < 12; a += 0.2) x.lineTo(Math.cos(a) * a * 0.08, -0.9 + Math.sin(a) * a * 0.03 - a * 0.02); x.stroke();
  },
};

function pattern(x, W, H, kind, col) {
  const rnd = rand(kind.length * 97 + W);
  x.save();
  x.fillStyle = col; x.strokeStyle = col;
  if (kind === 'dots') for (let i = 0; i < W / 26; i++) for (let j = 0; j < H / 26; j++) { x.beginPath(); x.arc(i * 26 + (j % 2) * 13, j * 26, 5, 0, 7); x.fill(); }
  if (kind === 'stripes') { x.lineWidth = 10; for (let i = -H; i < W; i += 36) { x.beginPath(); x.moveTo(i, H); x.lineTo(i + H, 0); x.stroke(); } }
  if (kind === 'bubbles') { x.lineWidth = 2.5; for (let i = 0; i < 70; i++) { x.beginPath(); x.arc(rnd() * W, rnd() * H, 3 + rnd() * 12, 0, 7); x.stroke(); } }
  if (kind === 'stars') for (let i = 0; i < 40; i++) { x.save(); x.translate(rnd() * W, rnd() * H); x.scale(8, 8); GFX.star(x, [col, col]); x.restore(); }
  if (kind === 'petals') for (let i = 0; i < 40; i++) { x.save(); x.translate(rnd() * W, rnd() * H); x.rotate(rnd() * 6); x.beginPath(); x.ellipse(0, 0, 9, 5, 0, 0, 7); x.fill(); x.restore(); }
  if (kind === 'waves') { x.lineWidth = 5; for (let j = 0; j < H; j += 30) { x.beginPath(); for (let i = 0; i <= W; i += 8) x.lineTo(i, j + Math.sin(i * 0.05) * 6); x.stroke(); } }
  if (kind === 'spots') for (let i = 0; i < 26; i++) { x.beginPath(); x.ellipse(rnd() * W, rnd() * H, 12 + rnd() * 18, 8 + rnd() * 12, rnd() * 3, 0, 7); x.fill(); }
  x.restore();
}

function barcode(x, cx, cy, w, h, seed) {
  const rnd = rand(seed);
  x.fillStyle = '#fff'; x.fillRect(cx - w / 2 - 6, cy - h / 2 - 6, w + 12, h + 22);
  x.fillStyle = '#111';
  let px = cx - w / 2;
  while (px < cx + w / 2 - 3) { const bw = 1 + Math.floor(rnd() * 3.5); if (rnd() > 0.45) x.fillRect(px, cy - h / 2, bw, h); px += bw + 1; }
  txt(x, '4 901234 ' + (10000 + Math.floor(rnd() * 89999)), cx, cy + h / 2 + 8, 12, { weight: 400, color: '#111' });
}

// p: product definition, W/H: canvas size (width = circumference)
export function drinkLabelTexture(p, W, H) {
  const [c, x] = makeCanvas(W, H);
  const L = p.label;
  x.fillStyle = Array.isArray(L.bg) ? vgrad(x, H, L.bg) : L.bg;
  x.fillRect(0, 0, W, H);
  if (L.pattern) pattern(x, W, H, L.pattern, L.patternCol || 'rgba(255,255,255,0.18)');
  for (const [a, b, col] of L.bands || []) { x.fillStyle = col; x.fillRect(0, a * H, W, (b - a) * H); }

  const cx = W / 2;
  const ink = L.ink || '#111';
  const tall = H / W > 0.4;

  // side & back: ingredients block + barcode (wraps round the back)
  x.save(); x.globalAlpha = 0.9;
  x.fillStyle = L.panel || 'rgba(255,255,255,0.85)';
  rrect(x, W * 0.07, H * 0.2, W * 0.16, H * 0.6, 8); x.fill();
  x.fillStyle = '#333';
  for (let i = 0; i < 7; i++) x.fillRect(W * 0.085, H * 0.26 + i * H * 0.07, W * (0.09 + ((i * 37) % 5) * 0.012), Math.max(2, H * 0.018));
  x.restore();
  txt(x, '名称：' + (p.kind || '清涼飲料水'), W * 0.15, H * 0.14, H * 0.05, { weight: 700, color: ink, maxW: W * 0.16 });
  barcode(x, W * 0.86, H * 0.5, W * 0.1, H * 0.28, p.id * 131 + 5);
  if (L.brand) txt(x, L.brand, W * 0.33, H * 0.5, H * 0.07, { font: FONT_ROUND, weight: 800, color: ink, alpha: 0.7, maxW: W * 0.12 });

  // front design
  const gfx = GFX[L.graphic];
  if (L.layout === 'vertical') {
    if (gfx) { x.save(); x.translate(cx - W * 0.1, H * 0.5); x.scale(H * 0.3, H * 0.3); gfx(x, L.gcol); x.restore(); }
    const n = [...L.jp].length;
    const size = Math.min(H * 0.34, (H * 0.84) / n);
    const top = (H - n * size * 1.02) / 2;
    vtxt(x, L.jp, cx, top, size, { font: L.font || FONT_JP, weight: 900, color: ink, stroke: L.stroke, strokeW: L.stroke ? size * 0.1 : 0 });
    txt(x, L.name, cx + W * 0.1, H * 0.35, H * 0.1, { font: FONT_ROUND, weight: 800, color: ink, maxW: W * 0.1 });
    if (L.sub) txt(x, L.sub, cx + W * 0.1, H * 0.55, H * 0.08, { weight: 700, color: L.subCol || ink, maxW: W * 0.1 });
    if (p.vol) txt(x, p.vol, cx + W * 0.1, H * 0.78, H * 0.07, { weight: 700, color: ink });
  } else if (tall) {
    if (L.brand) txt(x, L.brand, cx, H * 0.1, H * 0.055, { font: FONT_ROUND, weight: 800, color: L.brandCol || ink, spacing: 3 });
    if (gfx) { x.save(); x.translate(cx, H * 0.37); x.scale(H * 0.15, H * 0.15); gfx(x, L.gcol); x.restore(); }
    txt(x, L.name, cx, H * 0.62, H * 0.13, { font: L.font || FONT_DISPLAY, weight: L.font ? 900 : 400, color: ink, maxW: W * 0.3, stroke: L.stroke, strokeW: L.stroke ? H * 0.02 : 0 });
    txt(x, L.jp, cx, H * 0.76, H * 0.085, { font: FONT_ROUND, weight: 800, color: L.jpCol || ink, maxW: W * 0.3 });
    if (L.sub) txt(x, L.sub, cx, H * 0.87, H * 0.05, { weight: 700, color: L.subCol || ink, maxW: W * 0.28, spacing: 2 });
    if (p.vol) txt(x, p.vol, cx + W * 0.2, H * 0.93, H * 0.045, { weight: 700, color: ink });
  } else {
    // short and wide (sleeve labels on bottles)
    if (gfx) {
      x.save(); x.translate(cx - W * 0.19, H * 0.52); x.scale(H * 0.3, H * 0.3); gfx(x, L.gcol); x.restore();
      x.save(); x.translate(cx + W * 0.19, H * 0.52); x.scale(H * 0.22, H * 0.22); gfx(x, L.gcol); x.restore();
    }
    if (L.brand) txt(x, L.brand, cx, H * 0.14, H * 0.1, { font: FONT_ROUND, weight: 800, color: L.brandCol || ink, spacing: 3 });
    txt(x, L.name, cx, H * 0.42, H * 0.25, { font: L.font || FONT_DISPLAY, weight: L.font ? 900 : 400, color: ink, maxW: W * 0.28, stroke: L.stroke, strokeW: L.stroke ? H * 0.03 : 0 });
    txt(x, L.jp, cx, H * 0.7, H * 0.16, { font: FONT_ROUND, weight: 800, color: L.jpCol || ink, maxW: W * 0.28 });
    if (L.sub) txt(x, L.sub, cx, H * 0.88, H * 0.08, { weight: 700, color: L.subCol || ink, maxW: W * 0.28, spacing: 2 });
    if (p.vol) txt(x, p.vol, cx + W * 0.155, H * 0.88, H * 0.07, { weight: 700, color: ink });
  }

  if (L.badge) {
    const bx = cx - W * 0.11, by = H * (tall ? 0.2 : 0.22), r = H * (tall ? 0.085 : 0.16);
    x.save(); x.translate(bx, by); x.rotate(-0.2);
    x.fillStyle = L.badgeCol || '#e8132c';
    x.beginPath();
    for (let i = 0; i < 24; i++) { const rr = i % 2 ? r * 0.82 : r; const a = i * Math.PI / 12; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    x.fill();
    txt(x, L.badge, 0, -r * 0.18, r * 0.42, { color: '#fff', maxW: r * 1.5 });
    txt(x, 'LIMITED', 0, r * 0.32, r * 0.24, { font: FONT_ROUND, weight: 800, color: '#fff' });
    x.restore();
  }
  if (p.hot) {
    const bx = cx + W * 0.12, by = H * (tall ? 0.16 : 0.2), r = H * (tall ? 0.06 : 0.12);
    x.fillStyle = '#f05a1a'; x.beginPath(); x.arc(bx, by, r, 0, 7); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = r * 0.12; x.stroke();
    txt(x, 'HOT', bx, by + r * 0.05, r * 0.72, { font: FONT_ROUND, weight: 800, color: '#fff' });
  }
  return toTexture(c);
}

// ---------------------------------------------------------------- window & buttons

export function priceTagTexture(price, hot) {
  const [c, x] = makeCanvas(512, 144);
  x.fillStyle = '#fbfbf7'; rrect(x, 0, 0, 512, 144, 16); x.fill();
  x.fillStyle = hot ? '#e0262d' : '#1f6fe0';
  rrect(x, 0, 0, 250, 144, [16, 0, 0, 16]); x.fill();
  txt(x, hot ? 'あったか〜い' : 'つめた〜い', 125, 62, 50, { font: FONT_ROUND, weight: 800, color: '#fff', maxW: 226 });
  txt(x, hot ? 'HOT' : 'COLD', 125, 112, 26, { font: FONT_ROUND, weight: 800, color: 'rgba(255,255,255,0.8)', spacing: 6 });
  txt(x, '¥', 290, 80, 50, { weight: 700, color: '#222' });
  txt(x, String(price), 405, 78, 96, { font: FONT_ROUND, weight: 800, color: '#111' });
  return toTexture(c);
}

export function soldOutTexture() {
  const [c, x] = makeCanvas(128, 64);
  x.fillStyle = '#000'; x.fillRect(0, 0, 128, 64);
  txt(x, '売切', 64, 34, 46, { weight: 900, color: '#fff' });
  return toTexture(c);
}

export function cavityBackTexture(hotCols) {
  const [c, x] = makeCanvas(512, 632);
  const rowH = 632 / 3;
  for (let r = 0; r < 3; r++) {
    x.fillStyle = vgrad(x, rowH, ['#ffffff', '#e5f1fb', '#cfe3f5']);
    x.save(); x.translate(0, r * rowH); x.fillRect(0, 0, 512, rowH); x.restore();
  }
  // hot columns in the bottom row get a warm backdrop
  const colW = 512 / 6;
  x.save(); x.translate(0, 2 * rowH);
  const g = x.createLinearGradient(0, 0, 0, rowH);
  g.addColorStop(0, '#fff3e6'); g.addColorStop(1, '#ffd2b0');
  x.fillStyle = g; x.fillRect(0, 0, colW * hotCols, rowH);
  x.restore();
  x.globalAlpha = 0.12;
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
    const hot = r === 2 && i < hotCols;
    txt(x, hot ? 'あったか〜い' : 'つめた〜い', colW * (i + 0.5), r * rowH + rowH * 0.2, 16, { font: FONT_ROUND, weight: 800, color: hot ? '#d0301a' : '#1f6fe0' });
  }
  x.globalAlpha = 1;
  x.strokeStyle = 'rgba(120,140,160,0.25)'; x.lineWidth = 2;
  for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(colW * i, 0); x.lineTo(colW * i, 632); x.stroke(); }
  return toTexture(c);
}

// ---------------------------------------------------------------- LED display

const SEGS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '' };

function sevenSeg(x, ch, px, py, w, h, on, off) {
  const t = w * 0.2, sk = w * 0.12, m = h / 2;
  const segs = {
    a: [[t * 0.6, 0], [w - t * 0.6, 0], [w - t * 1.4, t], [t * 1.4, t]],
    b: [[w, t * 0.6], [w, m - t * 0.4], [w - t, m - t * 0.2 - t * 0.5], [w - t, t * 1.3]],
    c: [[w, m + t * 0.4], [w, h - t * 0.6], [w - t, h - t * 1.3], [w - t, m + t * 0.7]],
    d: [[t * 0.6, h], [w - t * 0.6, h], [w - t * 1.4, h - t], [t * 1.4, h - t]],
    e: [[0, m + t * 0.4], [0, h - t * 0.6], [t, h - t * 1.3], [t, m + t * 0.7]],
    f: [[0, t * 0.6], [0, m - t * 0.4], [t, m - t * 0.7], [t, t * 1.3]],
    g: [[t * 0.5, m], [t * 1.2, m - t / 2], [w - t * 1.2, m - t / 2], [w - t * 0.5, m], [w - t * 1.2, m + t / 2], [t * 1.2, m + t / 2]],
  };
  const lit = SEGS[ch] ?? '';
  for (const k of 'abcdefg') {
    x.fillStyle = lit.includes(k) ? on : off;
    x.beginPath();
    for (const [sx, sy] of segs[k]) x.lineTo(px + sx + sk * (1 - sy / h), py + sy);
    x.fill();
  }
}

// Dot-matrix + 7-segment display, redrawn only when its content changes
export class LedDisplay {
  constructor() {
    [this.canvas, this.ctx] = makeCanvas(512, 208);
    this.texture = toTexture(this.canvas);
    this.cols = 60; this.rows = 16;
    this.msgCache = new Map();
    this.scroll = 0;
    this.amount = 0;
    this.message = 'いらっしゃいませ';
    this.lastKey = '';
  }
  bitmap(msg) {
    if (this.msgCache.has(msg)) return this.msgCache.get(msg);
    const [c, x] = makeCanvas(16 * msg.length + 60, 16);
    x.fillStyle = '#000'; x.fillRect(0, 0, c.width, 16);
    x.font = `700 15px ${FONT_JP}`;
    const w = Math.ceil(x.measureText(msg).width) + 2;
    x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.fillText(msg, 1, 8.5);
    const d = x.getImageData(0, 0, w, 16).data;
    const cols = [];
    for (let i = 0; i < w; i++) {
      const col = [];
      for (let j = 0; j < 16; j++) col.push(d[(j * w + i) * 4] > 110);
      cols.push(col);
    }
    this.msgCache.set(msg, cols);
    return cols;
  }
  update(dt) {
    const bmp = this.bitmap(this.message);
    const fits = bmp.length <= this.cols;
    if (!fits) this.scroll = (this.scroll + dt * 22) % (bmp.length + this.cols);
    const off = fits ? -Math.floor((this.cols - bmp.length) / 2) : Math.floor(this.scroll) - this.cols;
    const key = this.message + '|' + off + '|' + this.amount;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const x = this.ctx;
    x.fillStyle = '#0b0303'; x.fillRect(0, 0, 512, 208);
    const pitch = 7.8, ox = 22, oy = 10;
    for (let i = 0; i < this.cols; i++) {
      const col = bmp[i + off];
      for (let j = 0; j < this.rows; j++) {
        x.fillStyle = col && col[j] ? '#ff6a2a' : '#2a0c07';
        x.beginPath(); x.arc(ox + i * pitch, oy + j * pitch + 3, 2.8, 0, 7); x.fill();
      }
    }
    // amount
    x.fillStyle = '#ff6a2a';
    txt(x, '¥', 60, 168, 44, { weight: 900, color: '#ff6a2a' });
    txt(x, '投入金額', 150, 168, 22, { weight: 700, color: '#a8381a' });
    const s = String(this.amount).padStart(4, ' ');
    [...s].forEach((ch, i) => sevenSeg(x, ch, 250 + i * 60, 138, 42, 62, '#ff5a1f', '#2a0c07'));
    this.texture.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- control panel parts

function brushed(x, w, h, base, seed, alpha = 0.08) {
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  const rnd = rand(seed);
  for (let i = 0; i < h * 1.5; i++) {
    x.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${rnd() * alpha})` : `rgba(0,0,0,${rnd() * alpha})`;
    x.fillRect(0, rnd() * h, w, 1);
  }
}

export function brushedTexture() {
  const [c, x] = makeCanvas(256, 256);
  brushed(x, 256, 256, '#c9ccd0', 11, 0.12);
  return toTexture(c, { repeat: true });
}

export function coinPlateTexture() {
  const [c, x] = makeCanvas(256, 192);
  brushed(x, 256, 192, '#d6d9dc', 5);
  txt(x, '硬貨投入口', 70, 26, 22, { weight: 900, color: '#333' });
  txt(x, 'COIN', 70, 50, 16, { font: FONT_ROUND, weight: 800, color: '#555', spacing: 4 });
  const coins = [['10', '#b87333'], ['50', '#cfd2d6'], ['100', '#cfd2d6'], ['500', '#d4b25a']];
  coins.forEach(([v, col], i) => {
    const cx = 34 + (i % 2) * 58, cy = 100 + Math.floor(i / 2) * 50;
    x.fillStyle = col; x.beginPath(); x.arc(cx, cy, 20, 0, 7); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 2; x.stroke();
    txt(x, v, cx, cy + 1, 15, { weight: 900, color: '#333' });
  });
  txt(x, '返却レバー', 205, 170, 16, { weight: 700, color: '#444' });
  return toTexture(c);
}

export function billFaceTexture() {
  const [c, x] = makeCanvas(384, 224);
  brushed(x, 384, 224, '#3a3d42', 9, 0.06);
  txt(x, '千円札', 110, 180, 30, { weight: 900, color: '#f2f2f2' });
  txt(x, '¥1000 BILL ONLY', 265, 182, 20, { font: FONT_ROUND, weight: 800, color: '#bfc4ca' });
  x.strokeStyle = '#888'; x.lineWidth = 2;
  rrect(x, 10, 10, 364, 204, 16); x.stroke();
  return toTexture(c);
}

export function arrowTexture() {
  const [c, x] = makeCanvas(64, 64);
  x.fillStyle = '#000'; x.fillRect(0, 0, 64, 64);
  x.strokeStyle = '#fff'; x.lineWidth = 7; x.lineJoin = 'round'; x.lineCap = 'round';
  x.beginPath(); x.moveTo(16, 18); x.lineTo(32, 36); x.lineTo(48, 18); x.stroke();
  const t = toTexture(c, { repeat: true });
  t.repeat.set(1, 2);
  return t;
}

export function returnButtonTexture() {
  const [c, x] = makeCanvas(128, 128);
  const g = x.createRadialGradient(54, 50, 6, 64, 64, 64);
  g.addColorStop(0, '#ff5a64'); g.addColorStop(1, '#b50d1f');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  txt(x, '返却', 64, 58, 42, { weight: 900, color: '#fff' });
  txt(x, 'RETURN', 64, 94, 16, { font: FONT_ROUND, weight: 800, color: '#ffd9dc', spacing: 2 });
  return toTexture(c);
}

export function contactlessTexture() {
  const [c, x] = makeCanvas(256, 208);
  x.fillStyle = '#000'; x.fillRect(0, 0, 256, 208);
  x.strokeStyle = '#fff'; x.lineCap = 'round'; x.lineWidth = 9;
  for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(92, 88, 18 + i * 20, -0.75, 0.75); x.stroke(); }
  x.fillStyle = '#fff'; x.beginPath(); x.arc(92, 88, 8, 0, 7); x.fill();
  txt(x, 'タッチ決済', 128, 170, 30, { weight: 900, color: '#fff' });
  txt(x, 'IC · QR', 200, 60, 20, { font: FONT_ROUND, weight: 800, color: '#fff' });
  return toTexture(c);
}

export function makeLabelTexture(w, h, { bg = '#fff', border = null, radius = 12, lines = [], faded = 0, draw = null }) {
  const [c, x] = makeCanvas(w, h);
  x.fillStyle = bg; rrect(x, 0, 0, w, h, radius); x.fill();
  if (border) { x.strokeStyle = border; x.lineWidth = 4; rrect(x, 4, 4, w - 8, h - 8, radius * 0.7); x.stroke(); }
  if (draw) draw(x, w, h);
  for (const l of lines) txt(x, l.t, l.x ?? w / 2, l.y, l.size, { maxW: w * 0.92, ...l });
  if (faded) fade(x, w, h, faded);
  return toTexture(c);
}

export function instructionTexture() {
  return makeLabelTexture(512, 420, {
    bg: '#fbf8ef', border: '#d6102a', radius: 18, faded: 0.12,
    lines: [
      { t: 'ご利用方法', y: 40, size: 40, color: '#d6102a' },
      { t: 'HOW TO BUY', y: 76, size: 20, font: FONT_ROUND, weight: 800, color: '#7a0a18', spacing: 6 },
    ],
    draw(x) {
      const steps = [
        ['お金を入れてください', 'Insert coins, bill or touch card'],
        ['ランプの点いたボタンを押す', 'Press a lit button'],
        ['商品をお取りください', 'Take your drink below'],
      ];
      steps.forEach(([jp, en], i) => {
        const y = 138 + i * 96;
        x.fillStyle = '#d6102a'; x.beginPath(); x.arc(40, y, 22, 0, 7); x.fill();
        txt(x, String(i + 1), 40, y + 1, 28, { color: '#fff', font: FONT_ROUND, weight: 800 });
        // pictograms
        x.save(); x.translate(108, y); x.strokeStyle = '#333'; x.fillStyle = '#333'; x.lineWidth = 5; x.lineCap = 'round';
        if (i === 0) { x.beginPath(); x.arc(-8, 0, 20, 0, 7); x.stroke(); txt(x, '¥', -8, 1, 22, { color: '#333' }); x.fillRect(22, -24, 7, 48); }
        if (i === 1) { x.strokeRect(-26, -22, 28, 28); x.beginPath(); x.moveTo(18, 30); x.lineTo(2, 0); x.stroke(); x.beginPath(); x.arc(22, 30, 9, 0, 7); x.fill(); }
        if (i === 2) { x.strokeRect(-28, -6, 56, 26); x.beginPath(); x.roundRect(-10, -28, 18, 30, 4); x.fill(); x.beginPath(); x.moveTo(-6, 34); x.lineTo(14, 34); x.stroke(); }
        x.restore();
        txt(x, jp, 160, y - 14, 28, { align: 'left', color: '#222', maxW: 330 });
        txt(x, en, 160, y + 20, 18, { align: 'left', weight: 500, font: FONT_ROUND, color: '#666', maxW: 330 });
      });
      // a faint crease across the old sticker
      x.strokeStyle = 'rgba(0,0,0,0.06)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 260); x.lineTo(512, 240); x.stroke();
    },
  });
}

// ---------------------------------------------------------------- stickers & plates

export function mascotStickerTexture() {
  const [c, x] = makeCanvas(256, 256);
  x.fillStyle = '#fff'; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill();
  x.fillStyle = '#ffe9a8'; x.beginPath(); x.arc(128, 128, 114, 0, 7); x.fill();
  mascotFace(x, 128, 112, 66, { wave: true });
  txt(x, 'いつもありがとう！', 128, 208, 26, { font: FONT_ROUND, weight: 800, color: '#d6102a', maxW: 190 });
  fade(x, 256, 256, 0.22);
  return toTexture(c);
}

export function recycleTexture() {
  return makeLabelTexture(360, 160, {
    bg: '#2e8b4e', radius: 14, faded: 0.25,
    draw(x) {
      x.save(); x.translate(64, 80); x.strokeStyle = '#fff'; x.lineWidth = 9; x.lineJoin = 'round';
      for (let i = 0; i < 3; i++) {
        x.save(); x.rotate(i * Math.PI * 2 / 3);
        x.beginPath(); x.moveTo(-18, -34); x.lineTo(18, -34); x.stroke();
        x.fillStyle = '#fff'; x.beginPath(); x.moveTo(18, -46); x.lineTo(34, -34); x.lineTo(18, -22); x.fill();
        x.restore();
      }
      x.restore();
    },
    lines: [
      { t: '空き缶・ペットボトルは', x: 232, y: 48, size: 26, color: '#fff', maxW: 240 },
      { t: 'リサイクルボックスへ', x: 232, y: 88, size: 28, color: '#fff', maxW: 240 },
      { t: 'Please recycle — thank you!', x: 232, y: 128, size: 17, weight: 700, font: FONT_ROUND, color: '#d8f5e2', maxW: 240 },
    ],
  });
}

export function pickupLabelTexture() {
  return makeLabelTexture(420, 84, {
    bg: '#f4f4f1', radius: 10,
    lines: [
      { t: '取り出し口', x: 138, y: 44, size: 44, color: '#222', maxW: 240 },
      { t: 'TAKE OUT', x: 338, y: 45, size: 24, font: FONT_ROUND, weight: 800, color: '#d6102a', maxW: 130 },
    ],
  });
}

export function smallLabelTexture(jp, en, { bg = '#f4f4f1', color = '#222', accent = '#d6102a' } = {}) {
  return makeLabelTexture(256, 72, {
    bg, radius: 10,
    lines: [
      { t: jp, x: 78, y: 38, size: 30, color, maxW: 136 },
      { t: en, x: 204, y: 39, size: 17, font: FONT_ROUND, weight: 800, color: accent, maxW: 88 },
    ],
  });
}

export function cautionTexture(title, l1, l2) {
  return makeLabelTexture(300, 200, {
    bg: '#ffd21f', radius: 12, faded: 0.18,
    draw(x) {
      x.fillStyle = '#111'; x.fillRect(0, 150, 300, 50);
      x.beginPath(); x.moveTo(52, 22); x.lineTo(92, 92); x.lineTo(12, 92); x.closePath(); x.fill();
      x.fillStyle = '#ffd21f'; x.fillRect(48, 42, 8, 30); x.fillRect(48, 78, 8, 8);
    },
    lines: [
      { t: title, x: 196, y: 44, size: 44, color: '#111' },
      { t: 'CAUTION', x: 196, y: 90, size: 24, font: FONT_ROUND, weight: 800, color: '#111', spacing: 4 },
      { t: l1, y: 122, size: 20, weight: 700, color: '#111' },
      { t: l2, y: 175, size: 18, weight: 700, color: '#ffd21f' },
    ],
  });
}

export function energyLabelTexture() {
  return makeLabelTexture(256, 360, {
    bg: '#ffffff', border: '#1f8a4c', radius: 10, faded: 0.2,
    draw(x) {
      x.fillStyle = '#1f8a4c'; x.fillRect(8, 8, 240, 64);
      txt(x, '省エネ性能', 128, 40, 32, { color: '#fff' });
      txt(x, '★★★★☆', 128, 110, 40, { color: '#f0a400' });
      const bars = ['#1f8a4c', '#5aab3c', '#b5cf2e', '#f2c21b', '#ee7d1f'];
      bars.forEach((col, i) => { x.fillStyle = col; x.fillRect(24, 146 + i * 20, 90 + i * 22, 16); });
      x.fillStyle = '#111'; x.beginPath(); x.moveTo(230, 170); x.lineTo(214, 162); x.lineTo(214, 178); x.fill();
      txt(x, '112%', 200, 204, 30, { color: '#1f8a4c' });
    },
    lines: [
      { t: '年間消費電力量', y: 268, size: 22, weight: 700, color: '#333' },
      { t: '1,020 kWh/年', y: 302, size: 30, color: '#111' },
      { t: '目標年度 2025年度', y: 336, size: 16, weight: 700, color: '#555' },
    ],
  });
}

export function serialPlateTexture() {
  const [c, x] = makeCanvas(360, 200);
  brushed(x, 360, 200, '#cfd3d7', 21, 0.1);
  x.strokeStyle = '#555'; x.lineWidth = 3; rrect(x, 8, 8, 344, 184, 10); x.stroke();
  const lines = [
    ['NIKONIKO VENDING CO., LTD.', 22, 800],
    ['自動販売機  MODEL NV-1800R', 18, 700],
    ['SERIAL No. 2609-17-00428', 18, 700],
    ['AC100V  50/60Hz  320W', 16, 700],
    ['冷媒 R-600a  110g', 16, 700],
    ['MADE IN JAPAN', 16, 800],
  ];
  lines.forEach(([t, s, w], i) => txt(x, t, 180, 34 + i * 27, s, { weight: w, color: '#222', font: i === 0 ? FONT_ROUND : FONT_JP }));
  return toTexture(c);
}

// every Japanese string used above, so web fonts load their glyph subsets up front
export const PRELOAD_TEXT =
  'にこにこドリンク毎日、ほっと一息。つめた〜いあったか〜い売切投入金額硬貨投入口返却レバー千円札タッチ決済' +
  'ご利用方法お金を入れてくださいランプの点いたボタンを押す商品をお取りください' +
  'いつもありがとう！空き缶・ペットボトルはリサイクルボックスへ取り出し口おつり注意高電圧修理は販売店へ転倒注意揺らさないで' +
  '省エネ性能★☆年間消費電力量目標年度自動販売機冷媒名称：清涼飲料水コーヒー珈琲' +
  'いらっしゃいませありがとうございましたお待ちください¥';
