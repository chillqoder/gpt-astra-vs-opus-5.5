// =====================================================================
//  GAME STATE + EFFECTS: particles, explosions, floating text, shake
// =====================================================================
const G = {
  scene: 'title', t: 0, frame: 0,
  player: null, tank: null, boss: null,
  enemies: [], pShots: [], eShots: [], pickups: [], props: [], fx: [], texts: [],
  cam: { x: 0, lock: null, shake: 0, sx: 0, sy: 0 },
  score: 0, lives: 3, rescued: 0, secrets: 0, livesLost: 0, continues: 0, kills: 0,
  hitStop: 0, flash: 0, flashColor: '#fff', msgs: [], goArrow: 0,
  events: [], wave: null, checkpoint: null, rockfall: 0, bossActive: false,
  totalCaptives: 0, totalSecrets: 0, levelW: 0, zone: 0, missionT: 0, endSeq: null
};
const PARTS = [], PPOOL = [];
function part(type, x, y, vx, vy, life, size, color) {
  if (PARTS.length > 1100) return DUMMY_PART;
  const p = PPOOL.pop() || {};
  p.type = type; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life;
  p.size = size; p.color = color; p.g = 0; p.drag = 1; p.grow = 0; p.bounce = 0; p.rot = 0; p.alpha = 1;
  PARTS.push(p);
  return p;
}
const DUMMY_PART = {};
function updateParts() {
  for (let i = PARTS.length - 1; i >= 0; i--) {
    const p = PARTS[i];
    if (--p.life <= 0) { PARTS[i] = PARTS[PARTS.length - 1]; PARTS.pop(); PPOOL.push(p); continue; }
    p.vx *= p.drag; p.vy *= p.drag; p.vy += p.g;
    p.x += p.vx; p.y += p.vy;
    if (p.grow) p.size = Math.max(0, p.size + p.grow);
    if (p.type === 'confetti') p.vx += Math.sin((G.t + p.max) * 0.2) * 0.08;
    if (p.bounce && p.vy > 0 && solidAt(p.x, p.y)) {
      p.y = Math.floor(p.y / TS) * TS - 0.5;
      p.vy *= -p.bounce; p.vx *= 0.6;
      if (Math.abs(p.vy) < 0.6) { p.vy = 0; p.g = 0; p.vx *= 0.5; }
    }
  }
}
const FIRE_COLS = ['#fffbe0', '#ffe45a', '#ffa828', '#f06018', '#b83010', '#4a2426'];
function drawParts(x0, x1) {
  for (let i = 0; i < PARTS.length; i++) {
    const p = PARTS[i];
    if (p.x < x0 - 40 || p.x > x1 + 40) continue;
    const k = p.life / p.max;
    switch (p.type) {
      case 'dust': case 'smoke':
        ctx.globalAlpha = Math.min(1, k * 1.6) * p.alpha;
        dcirc(p.x, p.y, p.size, p.color);
        break;
      case 'fire': {
        const ci = Math.min(5, Math.floor((1 - k) * 6));
        ctx.globalAlpha = ci === 5 ? k * 2 : 1;
        dcirc(p.x, p.y, p.size * (0.4 + k * 0.8), FIRE_COLS[ci]);
        break;
      }
      case 'spark':
        ctx.fillStyle = k > 0.5 ? '#fffbe0' : p.color || '#ffc830';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        ctx.fillRect(Math.round(p.x - p.vx), Math.round(p.y - p.vy), 1, 1);
        break;
      case 'debris': {
        const s = p.size;
        ctx.globalAlpha = Math.min(1, k * 4);
        ctx.fillStyle = OUTLINE; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, s + 2, s + 2);
        ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
        break;
      }
      case 'plank':
        ctx.globalAlpha = Math.min(1, k * 4);
        ctx.fillStyle = OUTLINE;
        if ((G.t >> 2) % 2) ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 3, 3, 7); else ctx.fillRect(Math.round(p.x) - 3, Math.round(p.y) - 1, 7, 3);
        ctx.fillStyle = p.color;
        if ((G.t >> 2) % 2) ctx.fillRect(Math.round(p.x), Math.round(p.y) - 2, 1, 5); else ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y), 5, 1);
        break;
      case 'shell':
        ctx.globalAlpha = Math.min(1, k * 3);
        ctx.fillStyle = '#f0c850'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
        ctx.fillStyle = '#a07020'; ctx.fillRect(Math.round(p.x), Math.round(p.y) + 1, 2, 1);
        break;
      case 'star': {
        ctx.fillStyle = p.color || '#fff';
        const s = Math.ceil(p.size * k);
        ctx.fillRect(Math.round(p.x) - s, Math.round(p.y), s * 2 + 1, 1);
        ctx.fillRect(Math.round(p.x), Math.round(p.y) - s, 1, s * 2 + 1);
        break;
      }
      case 'sweat':
        ctx.fillStyle = '#bfefff'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 2);
        break;
      case 'confetti':
        ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), (G.t + i) % 8 < 4 ? 2 : 1, 2);
        break;
      case 'ember': case 'ash':
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        break;
      case 'ring':
        ctx.globalAlpha = k;
        ring(p.x, p.y, p.size, p.color, Math.max(1, Math.round(3 * k)));
        break;
      case 'flash':
        ctx.globalAlpha = k;
        dcirc(p.x, p.y, p.size, p.color);
        break;
      case 'drop':
        ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 3);
        break;
    }
    ctx.globalAlpha = 1;
  }
}

// --- particle recipes ---
function dust(x, y, n, col, spread) {
  col = col || zoneDustColor(x);
  for (let i = 0; i < n; i++) {
    const p = part('dust', x + rnd(-3, 3), y - rnd(0, 3), rnd(-1, 1) * (spread || 1), rnd(-0.7, -0.1), rndi(16, 30), rnd(1.5, 3.5), col);
    p.drag = 0.92; p.grow = 0.08; p.alpha = 0.8;
  }
}
function smoke(x, y, n, size, col) {
  for (let i = 0; i < n; i++) {
    const p = part('smoke', x + rnd(-4, 4), y + rnd(-4, 4), rnd(-0.3, 0.3), rnd(-0.9, -0.3), rndi(40, 70), rnd(2, 4) * (size || 1), col || pick(['#4a4048', '#5c5258', '#3c343c']));
    p.drag = 0.98; p.grow = 0.07; p.alpha = 0.75;
  }
}
function sparks(x, y, n, col, speed) {
  for (let i = 0; i < n; i++) {
    const a = rnd(TAU), s = rnd(1, 3.5) * (speed || 1);
    const p = part('spark', x, y, Math.cos(a) * s, Math.sin(a) * s - 1, rndi(8, 18), 1, col);
    p.g = 0.15; p.drag = 0.95;
  }
}
function debris(x, y, n, cols, force) {
  for (let i = 0; i < n; i++) {
    const f = force || 1;
    const p = part('debris', x + rnd(-4, 4), y + rnd(-4, 4), rnd(-2.5, 2.5) * f, rnd(-5, -1.5) * f, rndi(50, 90), rndi(1, 3), pick(cols));
    p.g = 0.22; p.bounce = 0.4;
  }
}
function planks(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const p = part('plank', x + rnd(-6, 6), y + rnd(-6, 6), rnd(-2.2, 2.2), rnd(-4.5, -1.5), rndi(50, 80), 1, col || pick(['#c08040', '#a06030', '#d89850']));
    p.g = 0.22; p.bounce = 0.35;
  }
}
function fireBurst(x, y, n, spread, up) {
  for (let i = 0; i < n; i++) {
    const p = part('fire', x + rnd(-spread, spread), y + rnd(-spread, spread) * 0.7, rnd(-1, 1), rnd(-1.6, -0.3) * (up || 1), rndi(14, 30), rnd(2, 5), null);
    p.drag = 0.94;
  }
}
function stars(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const a = rnd(TAU);
    part('star', x + rnd(-3, 3), y + rnd(-3, 3), Math.cos(a) * 0.8, Math.sin(a) * 0.8, rndi(6, 12), rndi(2, 3), col || '#fff');
  }
}
function confetti(x, y, n) {
  for (let i = 0; i < n; i++) {
    const p = part('confetti', x + rnd(-8, 8), y + rnd(-8, 8), rnd(-2, 2), rnd(-4, -1), rndi(60, 110), 2, pick(['#ff5050', '#50d0ff', '#ffe040', '#70f070', '#ff80e0', '#ffffff']));
    p.g = 0.08; p.drag = 0.97;
  }
}
function shellCasing(x, y, dir) {
  const p = part('shell', x, y, -dir * rnd(0.8, 1.8), rnd(-2.8, -1.6), rndi(40, 60), 1, null);
  p.g = 0.2; p.bounce = 0.45;
}

// --- explosions (visual + gameplay) ---
function spawnBoom(x, y, r, opts) {
  opts = opts || {};
  const blobs = [];
  const nb = r > 20 ? 6 : 4;
  for (let i = 0; i < nb; i++) blobs.push({ dx: rnd(-r, r) * 0.5, dy: rnd(-r, r * 0.3) * 0.5, s: rnd(0.45, 0.8), d: rndi(0, 4) });
  blobs.push({ dx: 0, dy: 0, s: 0.85, d: 0 });
  const max = Math.round(24 + r * 0.5);
  G.fx.push({ kind: 'boom', x, y, r, t: 0, max, blobs });
  part('flash', x, y, 0, 0, 5, r * 1.3, '#fffbe8');
  const rg = part('ring', x, y, 0, 0, 14, r * 0.5, '#fff6c0'); rg.grow = r * 0.09;
  sparks(x, y, Math.round(r * 0.4), null, r / 18);
  debris(x, y, Math.round(r * 0.25), opts.cols || ['#4a3a30', '#6a5040', '#2a2020', '#806050'], r / 26);
  for (let i = 0; i < r / 5; i++) {
    const p = part('ember', x + rnd(-r, r) * 0.4, y + rnd(-r, r) * 0.4, rnd(-2, 2), rnd(-3, -0.5), rndi(20, 50), 1, pick(['#ffd040', '#ff8020']));
    p.g = 0.06;
  }
  if (!opts.silent) Snd.play(r > 30 ? 'explosion' : 'smallboom', r / 30);
  shake(Math.min(14, r * 0.22));
  if (r >= 34) { hitStop(3); }
}
function updateFx() {
  for (const f of G.fx) {
    f.t++;
    if (f.kind === 'boom') {
      if (f.t === Math.round(f.max * 0.55)) smoke(f.x, f.y - f.r * 0.3, Math.max(2, Math.round(f.r / 7)), f.r / 16);
      if (f.t >= f.max) f.remove = true;
    } else if (f.kind === 'muzzle' || f.kind === 'slash') {
      if (f.t >= f.max) f.remove = true;
    } else if (f.kind === 'beam') {
      if (f.t >= f.max) f.remove = true;
    } else if (f.kind === 'custom') {
      f.update(f);
    }
  }
  sweep(G.fx);
}
function drawFx() {
  for (const f of G.fx) {
    if (f.kind === 'boom') {
      const p = f.t / f.max;
      for (const b of f.blobs) {
        const q = clamp((f.t - b.d) / (f.max - b.d), 0, 1);
        if (f.t < b.d) continue;
        const grow = q < 0.18 ? q / 0.18 : 1 + (q - 0.18) * 0.35;
        const rr = f.r * b.s * grow * (q > 0.6 ? 1 - (q - 0.6) * 1.8 : 1);
        if (rr < 1) continue;
        const x = f.x + b.dx * (0.6 + q), y = f.y + b.dy * (0.6 + q) - q * f.r * 0.35;
        if (q >= 0.6) {
          // fireball cools into a puff of dark smoke
          ctx.globalAlpha = clamp(1 - (q - 0.6) / 0.4, 0, 1) * 0.9;
          dcirc(x, y, rr + 1, '#2a2026'); dcirc(x, y, rr, '#5a4c54'); dcirc(x - rr * 0.25, y - rr * 0.3, rr * 0.45, '#6e6068');
          ctx.globalAlpha = 1;
          continue;
        }
        const ci = q < 0.1 ? 0 : q < 0.26 ? 1 : q < 0.44 ? 2 : 3;
        dcirc(x, y, rr + 1.5, ci === 0 ? '#ffd040' : '#a0300c');
        dcirc(x, y, rr, FIRE_COLS[ci]);
        dcirc(x - rr * 0.2, y - rr * 0.25, rr * 0.5, FIRE_COLS[Math.max(0, ci - 1)]);
      }
      if (p < 0.12) { ctx.globalAlpha = 0.6; dcirc(f.x, f.y, f.r * 1.2, '#ffffff'); ctx.globalAlpha = 1; }
    } else if (f.kind === 'muzzle') {
      drawMuzzle(f);
    } else if (f.kind === 'slash') {
      drawSlash(f);
    } else if (f.kind === 'beam') {
      drawBeam(f);
    } else if (f.kind === 'custom') {
      f.draw(f);
    }
  }
}
function drawMuzzle(f) {
  const s = f.size * (1 - f.t / (f.max + 1));
  const cx = Math.round(f.x), cy = Math.round(f.y);
  const dx = Math.cos(f.a), dy = Math.sin(f.a);
  dcirc(cx + dx * s * 0.6, cy + dy * s * 0.6, s * 0.75 + 1, f.col2 || '#ff9a20');
  dcirc(cx + dx * s * 0.5, cy + dy * s * 0.5, s * 0.5, f.col || '#fff6b0');
  ctx.fillStyle = f.col || '#fff6b0';
  for (let i = 0; i < 3; i++) {
    const a = f.a + (i - 1) * 0.6;
    ctx.fillRect(Math.round(cx + Math.cos(a) * s * 1.4) - 1, Math.round(cy + Math.sin(a) * s * 1.4) - 1, 2, 2);
  }
}
function drawSlash(f) {
  const k = f.t / f.max;
  ctx.strokeStyle = k < 0.4 ? '#ffffff' : '#bfe8ff';
  ctx.lineWidth = 3 - k * 2;
  ctx.beginPath();
  const a0 = f.dir > 0 ? -1.4 : PI + 1.4, a1 = f.dir > 0 ? 1.0 : PI - 1.0;
  const a = lerp(a0, a1, Math.min(1, k * 1.8));
  ctx.arc(Math.round(f.x), Math.round(f.y), 14, Math.min(a0, a), Math.max(a0, a));
  ctx.stroke();
}
function drawBeam(f) {
  const w = f.w * (1 - f.t / (f.max + 1));
  ctx.lineCap = 'round';
  ctx.strokeStyle = f.c1; ctx.lineWidth = w + 3;
  ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(f.x1, f.y1); ctx.stroke();
  ctx.strokeStyle = f.c2; ctx.lineWidth = Math.max(1, w);
  ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(f.x1, f.y1); ctx.stroke();
  ctx.lineCap = 'butt';
}
function muzzle(x, y, a, size, col, col2) {
  G.fx.push({ kind: 'muzzle', x, y, a, size: size || 5, t: 0, max: 3, col, col2 });
}

// --- floating text & speech bubbles ---
function floatText(x, y, str, color, scale, life) {
  G.texts.push({ x, y, str: String(str), color: color || '#fff', scale: scale || 1, life: life || 50, max: life || 50, vy: -1.1 });
}
function bubble(ent, str, life, dy) {
  for (const t of G.texts) if (t.follow === ent && t.bubble) t.life = 0;
  G.texts.push({ follow: ent, bubble: true, str, life: life || 60, max: life || 60, dy: dy || 0, x: ent.x, y: ent.y });
}
function updateTexts() {
  for (const t of G.texts) {
    t.life--;
    if (t.follow) { t.x = t.follow.x; t.y = t.follow.y - t.follow.h - 6 + (t.dy || 0); if (t.follow.remove) t.life = 0; }
    else if (t.ghost) { t.y -= 0.7; t.x += Math.sin(t.life * 0.15) * 0.5; }
    else { t.y += t.vy; t.vy *= 0.94; }
    if (t.life <= 0) t.remove = true;
  }
  sweep(G.texts);
}
function drawTexts() {
  for (const t of G.texts) {
    if (t.ghost) {
      // a little cartoon spirit floating away from the fallen hero
      ctx.globalAlpha = Math.min(1, t.life / 30) * 0.8;
      const x = t.x, y = t.y;
      fr(-4, -10, 8, 9, '#f0f8ff'); fr(-5, -4, 10, 5, '#f0f8ff'); fr(-5, 1, 3, 2, '#f0f8ff'); fr(2, 1, 3, 2, '#f0f8ff');
      fr(-2, -8, 1, 2, INK); fr(1, -8, 1, 2, INK); fr(-1, -5, 2, 1, INK);
      fr(-6 - ((G.t >> 3) % 2), -6, 2, 3, '#ffffff'); fr(4 + ((G.t >> 3) % 2), -6, 2, 3, '#ffffff');
      fr(-3, -14, 6, 1, '#ffe040', 1);
      fdraw(x, y, false, null, 0, 0, '#7a90b0');
      ctx.globalAlpha = 1;
      continue;
    }
    if (t.bubble) {
      const w = textWidth(t.str) + 6, x = Math.round(t.x - w / 2), y = Math.round(t.y - 12);
      const pop = t.max - t.life < 4 ? 0.5 : 1;
      if (pop < 1) continue;
      ctx.fillStyle = OUTLINE; ctx.fillRect(x - 1, y - 1, w + 2, 12);
      ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, 10);
      ctx.fillStyle = OUTLINE; ctx.fillRect(Math.round(t.x) - 1, y + 10, 3, 2); ctx.fillRect(Math.round(t.x), y + 12, 1, 1);
      ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(t.x), y + 10, 1, 1);
      drawText(t.str, x + 3, y + 2, '#201020', 1, 0, false);
    } else {
      if (t.life < 12 && (t.life & 1)) continue;
      drawText(t.str, t.x, t.y, t.color, t.scale, 1, true);
    }
  }
}

function shake(v) { G.cam.shake = Math.min(18, Math.max(G.cam.shake, v)); }
function hitStop(n) { G.hitStop = Math.max(G.hitStop, n); }
function screenFlash(n, col) { G.flash = n; G.flashColor = col || '#fff'; }
function showMsg(text, opts) {
  opts = opts || {};
  const y = opts.y || 96;
  G.msgs = G.msgs.filter(m => Math.abs(m.y - y) > 24);
  G.msgs.push({ text, t: 0, life: opts.life || 120, color: opts.color || GRAD_GOLD, scale: opts.scale || 3, y: opts.y || 96, sub: opts.sub, subColor: opts.subColor || '#fff' });
}
function addScore(n, x, y, color) {
  G.score += n;
  if (x !== undefined) floatText(x, y, n, color || '#ffe860');
}
