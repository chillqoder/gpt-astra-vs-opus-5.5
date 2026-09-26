'use strict';
// =====================================================================
//  BANDANA BLITZ — core: constants, utils, input, audio, font, drawing
// =====================================================================
const W = 480, H = 270, TS = 16;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

const PI = Math.PI, TAU = PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[(Math.random() * a.length) | 0];
const chance = p => Math.random() < p;
const approach = (v, t, s) => v < t ? Math.min(v + s, t) : Math.max(v - s, t);
const sgn = v => v < 0 ? -1 : 1;

function hexRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  const r = Math.round(lerp(A[0], B[0], t)), g = Math.round(lerp(A[1], B[1], t)), bl = Math.round(lerp(A[2], B[2], t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
// in-place compaction of arrays of objects flagged .remove
function sweep(arr) {
  let j = 0;
  for (let i = 0; i < arr.length; i++) { const e = arr[i]; if (!e.remove) arr[j++] = e; }
  arr.length = j;
}
// body convention: x = horizontal centre, y = feet (bottom), w/h = hitbox size
function bodiesHit(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && a.y - a.h < b.y && b.y - b.h < a.y;
}
function pointInBody(px, py, e, pad) {
  pad = pad || 0;
  return Math.abs(px - e.x) < e.w / 2 + pad && py > e.y - e.h - pad && py < e.y + pad;
}
function circleBody(cx, cy, r, e) {
  const nx = clamp(cx, e.x - e.w / 2, e.x + e.w / 2), ny = clamp(cy, e.y - e.h, e.y);
  return (nx - cx) * (nx - cx) + (ny - cy) * (ny - cy) < r * r;
}

const store = {
  get(k, d) { try { const v = localStorage.getItem('bblitz_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('bblitz_' + k, JSON.stringify(v)); } catch (e) { } }
};

// ---------------------------------------------------------------------
//  INPUT: keyboard + gamepad + touch, merged into logical buttons
// ---------------------------------------------------------------------
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'jump', KeyK: 'jump', Space: 'jump',
  KeyX: 'fire', KeyJ: 'fire', KeyC: 'bomb', KeyL: 'bomb',
  Enter: 'start', NumpadEnter: 'start', KeyP: 'pause', Escape: 'pause', KeyM: 'mute'
};
const BTNS = ['left', 'right', 'up', 'down', 'jump', 'fire', 'bomb', 'start', 'pause', 'mute'];
const TOUCH_BTNS = [
  { b: 'fire', x: 404, y: 238, r: 21, label: 'FIRE' },
  { b: 'jump', x: 452, y: 216, r: 21, label: 'JUMP' },
  { b: 'bomb', x: 452, y: 168, r: 15, label: 'BOMB' },
  { b: 'pause', x: 462, y: 38, r: 11, label: 'II' },
  { b: 'mute', x: 434, y: 38, r: 11, label: 'M' }
];
const DPAD = { x: 58, y: 214, r: 44 };
const Input = {
  held: {}, latch: {}, cur: {}, prev: {}, touches: [], taps: [], touchMode: false, padActive: false,
  poll() {
    for (const b of BTNS) { this.prev[b] = this.cur[b]; this.cur[b] = false; }
    for (const k in this.held) if (this.held[k]) this.cur[KEYMAP[k]] = true;
    for (const b in this.latch) { if (this.latch[b]) this.cur[b] = true; this.latch[b] = false; }
    let pads = [];
    try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { }
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const bt = i => p.buttons[i] && p.buttons[i].pressed;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      const c = this.cur;
      if (ax < -0.4 || bt(14)) c.left = true;
      if (ax > 0.4 || bt(15)) c.right = true;
      if (ay < -0.5 || bt(12)) c.up = true;
      if (ay > 0.5 || bt(13)) c.down = true;
      if (bt(0)) c.jump = true;
      if (bt(2) || bt(7) || bt(5)) c.fire = true;
      if (bt(1) || bt(3) || bt(6) || bt(4)) c.bomb = true;
      if (bt(9)) c.start = true;
      if (bt(8)) c.mute = true;
      for (let i = 0; i < p.buttons.length; i++) if (bt(i)) { this.padActive = true; this.touchMode = false; }
    }
    if (this.touchMode) {
      for (const t of this.touches) {
        const dx = t.x - DPAD.x, dy = t.y - DPAD.y, d = Math.hypot(dx, dy);
        if (d < DPAD.r * 1.5 && t.x < 200) {
          if (d > 7) {
            const cx = dx / d, cy = dy / d;
            if (cx > 0.38) this.cur.right = true;
            if (cx < -0.38) this.cur.left = true;
            if (cy < -0.38) this.cur.up = true;
            if (cy > 0.38) this.cur.down = true;
          }
          continue;
        }
        for (const b of TOUCH_BTNS) {
          if (Math.hypot(t.x - b.x, t.y - b.y) < b.r * 1.35) { this.cur[b.b] = true; break; }
        }
      }
    }
  },
  pressed(b) { return !!this.cur[b] && !this.prev[b]; },
  down(b) { return !!this.cur[b]; },
  anyPressed() { for (const b of ['jump', 'fire', 'bomb', 'start']) if (this.pressed(b)) return true; return false; },
  clear() { this.held = {}; this.latch = {}; for (const b of BTNS) { this.cur[b] = false; this.prev[b] = false; } }
};
addEventListener('keydown', e => {
  const b = KEYMAP[e.code];
  Snd.unlock();
  Input.touchMode = false;
  if (b) {
    e.preventDefault();
    if (!Input.held[e.code]) Input.latch[b] = true;
    Input.held[e.code] = true;
  }
});
addEventListener('keyup', e => { if (KEYMAP[e.code]) { e.preventDefault(); Input.held[e.code] = false; } });
addEventListener('blur', () => { Input.held = {}; });
function touchPoint(t) {
  const r = cv.getBoundingClientRect();
  return { x: (t.clientX - r.left) / r.width * W, y: (t.clientY - r.top) / r.height * H, id: t.identifier };
}
function onTouch(e) {
  e.preventDefault();
  Snd.unlock();
  Input.touchMode = true;
  Input.touches = Array.from(e.touches).map(touchPoint);
  if (e.type === 'touchstart') for (const t of e.changedTouches) Input.taps.push(touchPoint(t));
}
for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) cv.addEventListener(ev, onTouch, { passive: false });
cv.addEventListener('mousedown', e => {
  Snd.unlock();
  const r = cv.getBoundingClientRect();
  Input.taps.push({ x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H, mouse: true });
});

// ---------------------------------------------------------------------
//  AUDIO: everything synthesised with WebAudio
// ---------------------------------------------------------------------
const Snd = {
  ctx: null, master: null, sfx: null, mus: null, noiseBuf: null, pulse: null, distCurve: null,
  muted: store.get('muted', false), last: {},
  unlock() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const c = this.ctx = new AC();
        this.master = c.createGain();
        this.master.gain.value = this.muted ? 0 : 0.85;
        const comp = c.createDynamicsCompressor();
        comp.threshold.value = -14; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
        this.master.connect(comp); comp.connect(c.destination);
        this.sfx = c.createGain(); this.sfx.gain.value = 0.75; this.sfx.connect(this.master);
        this.mus = c.createGain(); this.mus.gain.value = 0.32; this.mus.connect(this.master);
        const len = c.sampleRate;
        this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const n = 32, re = new Float32Array(n), im = new Float32Array(n);
        for (let i = 1; i < n; i++) im[i] = (2 / (i * PI)) * Math.sin(i * PI * 0.25);
        this.pulse = c.createPeriodicWave(re, im);
        this.distCurve = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; this.distCurve[i] = Math.tanh(x * 4); }
        if (Music.pending) { const p = Music.pending; Music.pending = null; Music.play(p); }
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  setMute(m) {
    this.muted = m; store.set('muted', m);
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.02);
  },
  ok(name, gap) {
    if (!this.ctx || this.muted) return false;
    const now = this.ctx.currentTime;
    if (gap && this.last[name] && now - this.last[name] < gap) return false;
    this.last[name] = now;
    return true;
  },
  env(g, t, vol, dur, attack) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + (attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  },
  tone(type, f0, f1, dur, vol, delay, dest) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator();
    if (type === 'pulse') o.setPeriodicWave(this.pulse); else o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = c.createGain(); this.env(g, t, vol, dur);
    o.connect(g); g.connect(dest || this.sfx);
    o.start(t); o.stop(t + dur + 0.03);
  },
  noise(dur, vol, ftype, f0, f1, q, delay, dest) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (delay || 0);
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = ftype; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); this.env(g, t, vol, dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
  },
  // cheap formant "voice" for grunts / screams / cheers
  voice(f0, f1, dur, vol, fm, delay) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f1, t + dur);
    const lfo = c.createOscillator(); lfo.frequency.value = 7 + Math.random() * 4;
    const lg = c.createGain(); lg.gain.value = f0 * 0.05; lfo.connect(lg); lg.connect(o.frequency);
    const out = c.createGain(); this.env(out, t, vol, dur, 0.02);
    for (const f of fm) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 7;
      o.connect(bp); bp.connect(out);
    }
    out.connect(this.sfx);
    o.start(t); o.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05);
  },
  play(name, a) {
    const S = SFX[name];
    if (!S) return;
    if (!this.ok(name, S.gap)) return;
    try { S.f(this, a); } catch (e) { }
  }
};
const SFX = {
  pistol: { gap: 0.03, f: s => { s.tone('square', 900, 180, 0.08, 0.14); s.noise(0.05, 0.12, 'highpass', 3000, 1500); } },
  mg: { gap: 0.035, f: s => { s.noise(0.07, 0.22, 'bandpass', 2200, 500, 1.2); s.tone('square', 320, 70, 0.06, 0.11); } },
  spread: { gap: 0.05, f: s => { s.tone('triangle', 1300, 260, 0.14, 0.18); s.tone('sine', 640, 140, 0.12, 0.12); } },
  flame: { gap: 0.07, f: s => { s.noise(0.14, 0.14, 'lowpass', 1100, 350, 0.8); } },
  rocket: { gap: 0.05, f: s => { s.noise(0.4, 0.2, 'bandpass', 400, 2400, 2); s.tone('sawtooth', 140, 60, 0.25, 0.1); } },
  laser: { gap: 0.09, f: s => { s.tone('sawtooth', 1900, 1500, 0.1, 0.05); s.tone('square', 950, 1150, 0.1, 0.035); } },
  tankmg: { gap: 0.04, f: s => { s.noise(0.06, 0.2, 'bandpass', 1500, 400, 1.2); s.tone('square', 220, 60, 0.05, 0.1); } },
  cannon: { gap: 0.1, f: s => { s.noise(0.5, 0.45, 'lowpass', 1600, 90); s.tone('sine', 160, 35, 0.4, 0.55); } },
  enemyshot: { gap: 0.05, f: s => { s.tone('square', 520, 140, 0.09, 0.07); s.noise(0.05, 0.06, 'bandpass', 1800, 900); } },
  snipershot: { gap: 0.05, f: s => { s.noise(0.25, 0.3, 'highpass', 2500, 400); s.tone('square', 1400, 90, 0.2, 0.12); } },
  explosion: { gap: 0.05, f: (s, a) => {
    const k = a || 1;
    s.noise(0.5 + 0.35 * k, 0.42 + 0.12 * k, 'lowpass', 1400, 70, 0.7);
    s.tone('sine', 130, 28, 0.45 + 0.2 * k, 0.55);
    s.noise(0.15, 0.2, 'highpass', 2000, 800, 1);
  } },
  smallboom: { gap: 0.05, f: s => { s.noise(0.3, 0.3, 'lowpass', 1800, 150); s.tone('sine', 180, 50, 0.2, 0.3); } },
  throw: { gap: 0.05, f: s => s.tone('triangle', 380, 760, 0.1, 0.1) },
  bounce: { gap: 0.04, f: s => s.tone('square', 240, 170, 0.04, 0.06) },
  knife: { gap: 0.05, f: s => { s.noise(0.09, 0.22, 'highpass', 2500, 7000, 1); s.tone('triangle', 1600, 3400, 0.06, 0.07); } },
  hit: { gap: 0.03, f: s => s.tone('square', 240, 110, 0.05, 0.09) },
  clank: { gap: 0.04, f: s => { s.tone('triangle', 2400, 1900, 0.07, 0.1); s.tone('square', 3100, 2800, 0.03, 0.04); } },
  jump: { gap: 0.05, f: s => s.tone('square', 210, 540, 0.1, 0.08) },
  land: { gap: 0.06, f: s => s.noise(0.06, 0.12, 'lowpass', 500, 150) },
  step: { gap: 0.06, f: s => s.noise(0.03, 0.05, 'lowpass', 700, 200) },
  pickup: { gap: 0.05, f: s => { [660, 880, 1320].forEach((f, i) => s.tone('square', f, f, 0.06, 0.08, i * 0.05)); } },
  coin: { gap: 0.04, f: s => { s.tone('square', 990, 990, 0.05, 0.07); s.tone('square', 1480, 1480, 0.12, 0.07, 0.05); } },
  weaponget: { gap: 0.2, f: s => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => s.tone('pulse', f, f, 0.09, 0.12, i * 0.06)); } },
  heal: { gap: 0.2, f: s => { [523, 784, 1047, 1568].forEach((f, i) => s.tone('triangle', f, f, 0.12, 0.14, i * 0.07)); } },
  shield: { gap: 0.2, f: s => { s.tone('sine', 300, 1600, 0.5, 0.15); s.tone('triangle', 600, 2400, 0.4, 0.06, 0.1); } },
  hurt: { gap: 0.1, f: s => { s.tone('sawtooth', 420, 90, 0.25, 0.16); s.voice(260, 170, 0.25, 0.5, [700, 1150]); } },
  pdie: { gap: 0.3, f: s => { s.voice(330, 110, 0.9, 0.7, [750, 1200]); s.tone('square', 600, 60, 0.8, 0.08); } },
  grunt: { gap: 0.06, f: s => s.voice(rnd(120, 170), rnd(90, 110), 0.14, 0.5, [600, 1000]) },
  scream: { gap: 0.08, f: s => { const p = rnd(230, 330); s.voice(p, p * rnd(0.45, 0.7), rnd(0.45, 0.7), 0.6, [780, 1250]); } },
  yell: { gap: 0.1, f: s => { const p = rnd(170, 220); s.voice(p, p * 1.25, 0.35, 0.55, [720, 1100]); } },
  cheer: { gap: 0.2, f: s => { s.voice(260, 420, 0.22, 0.5, [500, 1700]); s.voice(330, 520, 0.25, 0.45, [500, 1800], 0.24); } },
  alert: { gap: 0.2, f: s => { s.voice(180, 290, 0.16, 0.4, [650, 1150]); } },
  roar: { gap: 1, f: s => {
    const c = s.ctx, t = c.currentTime;
    const ws = c.createWaveShaper(); ws.curve = s.distCurve;
    const g = c.createGain(); s.env(g, t, 0.55, 1.8, 0.1); ws.connect(g); g.connect(s.sfx);
    for (const f of [58, 61, 88]) {
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 1.3, t + 0.4); o.frequency.linearRampToValueAtTime(f * 0.7, t + 1.8);
      o.connect(ws); o.start(t); o.stop(t + 1.9);
    }
    s.noise(1.6, 0.3, 'lowpass', 600, 120, 1);
  } },
  alarm: { gap: 0.5, f: s => { for (let i = 0; i < 6; i++) s.tone('square', i % 2 ? 620 : 830, i % 2 ? 620 : 830, 0.22, 0.09, i * 0.25); } },
  select: { gap: 0.04, f: s => { s.tone('square', 880, 880, 0.04, 0.08); s.tone('square', 1320, 1320, 0.06, 0.08, 0.04); } },
  move: { gap: 0.03, f: s => s.tone('square', 660, 660, 0.03, 0.06) },
  tally: { gap: 0.03, f: s => s.tone('square', 1200, 1200, 0.025, 0.05) },
  stamp: { gap: 0.1, f: s => { s.noise(0.3, 0.4, 'lowpass', 900, 100); s.tone('sine', 110, 40, 0.3, 0.5); } },
  crumble: { gap: 0.08, f: s => { s.noise(0.45, 0.28, 'lowpass', 500, 90, 0.8); } },
  wood: { gap: 0.05, f: s => { s.noise(0.12, 0.25, 'bandpass', 700, 300, 2); s.tone('triangle', 200, 120, 0.08, 0.1); } },
  hop: { gap: 0.1, f: s => { s.tone('square', 150, 380, 0.14, 0.1); s.noise(0.12, 0.1, 'lowpass', 800, 200); } },
  crush: { gap: 0.06, f: s => { s.noise(0.12, 0.25, 'lowpass', 900, 200); s.tone('square', 90, 50, 0.1, 0.12); } },
  engine: { gap: 0.3, f: s => { s.tone('sawtooth', 60, 110, 0.35, 0.08); s.noise(0.35, 0.08, 'lowpass', 300, 500); } },
  spin: { gap: 0.3, f: s => { s.tone('sawtooth', 120, 600, 0.45, 0.06); } },
  fuse: { gap: 0.25, f: s => s.noise(0.2, 0.05, 'highpass', 5000, 7000) },
  beep: { gap: 0.1, f: s => s.tone('square', 1760, 1760, 0.05, 0.05) },
  checkpoint: { gap: 0.5, f: s => { [784, 988, 1175, 1568].forEach((f, i) => s.tone('pulse', f, f, 0.12, 0.11, i * 0.08)); } },
  secret: { gap: 0.5, f: s => { [1047, 1319, 1568, 2093, 1568, 2093].forEach((f, i) => s.tone('triangle', f, f, 0.1, 0.12, i * 0.07)); } },
  go: { gap: 0.4, f: s => { s.tone('pulse', 784, 784, 0.08, 0.1); s.tone('pulse', 1175, 1175, 0.18, 0.1, 0.09); } },
  helicopter: { gap: 0.08, f: s => s.noise(0.07, 0.12, 'lowpass', 400, 200, 2) }
};

// ---------------------------------------------------------------------
//  MUSIC: tiny real-time step sequencer
// ---------------------------------------------------------------------
function noteNum(n) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  return base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function parseMelody(bars) {
  const ev = {}; let last = null, i = 0;
  for (const bar of bars) for (const tok of bar.trim().split(/\s+/)) {
    if (tok === '-') { if (last) last.len++; }
    else if (tok === '.') last = null;
    else { last = { n: noteNum(tok), len: 1 }; ev[i] = last; }
    i++;
  }
  return ev;
}
const TRACKS = {
  title: {
    bpm: 118, bars: 4, loop: true, roots: [45, 41, 43, 40], quals: 'mMMM',
    bass: [0, null, null, 12, null, null, 0, null, 0, null, null, 12, null, 7, null, null],
    lead: parseMelody([
      'A4 - C5 - E5 - A5 - G5 - E5 - D5 - E5 -',
      'C5 - A4 - F4 - A4 - C5 - F5 - E5 - C5 -',
      'D5 - - - B4 - G4 - B4 - D5 - G5 - - -',
      'G#5 - - - E5 - B4 - G#4 - B4 - E5 - - -']),
    drums: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' }, arp: 0.03
  },
  stage: {
    bpm: 152, bars: 8, loop: true, roots: [45, 45, 41, 43, 45, 48, 43, 40], quals: 'mmMMmMMM',
    bass: [0, null, 0, 12, 0, null, 0, 12, 0, null, 0, 12, 0, 7, 10, 12],
    lead: parseMelody([
      'A4 - C5 - E5 - A5 - G5 - E5 - D5 - E5 -',
      'C5 - - - B4 - A4 - B4 - C5 - D5 - - -',
      'C5 - A4 - F4 - A4 - C5 - F5 - E5 - C5 -',
      'D5 - - - B4 - G4 - B4 - D5 - G5 - - -',
      'A5 - - - G5 - E5 - C5 - E5 - A5 - C6 -',
      'G5 - - - E5 - C5 - E5 - G5 - C6 - B5 -',
      'B5 - A5 - G5 - D5 - B4 - D5 - G5 - A5 -',
      'G#5 - - - E5 - B4 - G#4 - B4 - E5 - - -']),
    drums: { k: 'x...x...x...x.x.', s: '....x.......x..x', h: 'x.x.x.x.x.x.x.xx' }, arp: 0.028
  },
  boss: {
    bpm: 172, bars: 8, loop: true, roots: [40, 40, 41, 40, 40, 41, 43, 41], quals: 'mmMmmMMM',
    bass: [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 1, 0, 12, 1],
    lead: parseMelody([
      'E5 . E5 . F5 . E5 . B4 - - - . . . .',
      'E5 . E5 . G5 . F5 . E5 - D5 - C5 - B4 -',
      'F5 . F5 . G#5 . F5 . C5 - - - . . . .',
      'E5 . E5 . B5 . A5 . G5 - F5 - E5 - F5 -',
      'E6 - B5 - G5 - E5 - E6 - B5 - G5 - E5 -',
      'F6 - C6 - A5 - F5 - F6 - C6 - A5 - F5 -',
      'G6 - D6 - B5 - G5 - G6 - D6 - B5 - G5 -',
      'F6 - E6 - D6 - C6 - B5 - A5 - G#5 - B5 -']),
    drums: { k: 'x...x...x...x...', s: '....x.......x.xx', h: 'xxxxxxxxxxxxxxxx', k2: '..x.......x.....' }, arp: 0.03
  },
  victory: {
    bpm: 140, bars: 3, loop: false, roots: [48, 43, 48], quals: 'MMM',
    bass: [0, null, null, null, 0, null, null, null, 7, null, null, null, 12, null, null, null],
    lead: parseMelody(['G4 . C5 . E5 . G5 - - . E5 . G5 - - -', 'F5 . A5 . G5 - F5 - D5 - B4 - G4 - - -', 'C5 . E5 . G5 . C6 - - - - - - - . .']),
    drums: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' }, arp: 0
  },
  gameover: {
    bpm: 90, bars: 2, loop: false, roots: [45, 40], quals: 'mM',
    bass: [0, null, null, null, null, null, null, null, 0, null, null, null, null, null, null, null],
    lead: parseMelody(['E5 - D5 - C5 - B4 - A4 - - - G#4 - - -', 'A4 - - - - - - - . . . . . . . .']),
    drums: { k: 'x...............', s: '................', h: '................' }, arp: 0
  },
  jingle: {
    bpm: 160, bars: 1, loop: false, roots: [48], quals: 'M',
    bass: [0, null, null, null, 7, null, null, null, 12, null, null, null, null, null, null, null],
    lead: parseMelody(['C5 . E5 . G5 . C6 - - - G5 . C6 - - -']),
    drums: { k: 'x.......x.......', s: '............x...', h: '..x...x...x.....' }, arp: 0
  }
};
const Music = {
  cur: null, tr: null, step: 0, next: 0, timer: null, pending: null,
  play(name) {
    if (!Snd.ctx) { this.pending = name; return; }
    if (this.cur === name) return;
    this.stop();
    this.cur = name; this.tr = TRACKS[name]; this.step = 0;
    this.next = Snd.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 25);
    this.tick();
  },
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; this.cur = null; this.pending = null; },
  duck(on) { if (Snd.mus) Snd.mus.gain.setTargetAtTime(on ? 0.08 : 0.32, Snd.ctx.currentTime, 0.05); },
  tick() {
    const c = Snd.ctx, tr = this.tr;
    if (!c || !tr) return;
    const spb = 60 / tr.bpm / 4, total = tr.bars * 16;
    if (this.next < c.currentTime - 0.3) this.next = c.currentTime + 0.05; // tab was suspended
    while (this.next < c.currentTime + 0.15) {
      if (!tr.loop && this.step >= total) { this.stop(); return; }
      this.sched(this.step % total, this.next, spb);
      this.next += spb; this.step++;
    }
  },
  sched(i, t, spb) {
    if (Snd.muted) return;
    const tr = this.tr, bar = (i / 16) | 0, s = i % 16, root = tr.roots[bar], q = tr.quals[bar];
    const d = tr.drums;
    if (d.k[s] === 'x' || (d.k2 && d.k2[s] === 'x')) this.kick(t);
    if (d.s[s] === 'x') this.snare(t);
    if (d.h[s] === 'x') this.hat(t, s % 4 === 2 ? 0.06 : 0.035);
    const b = tr.bass[s];
    if (b !== null && b !== undefined) this.inst('sawtooth', mtof(root - 12 + b), t, spb * 0.9, 0.17, 700);
    if (tr.arp) {
      const ch = [0, q === 'm' ? 3 : 4, 7, 12][s % 4];
      this.inst('triangle', mtof(root + 24 + ch), t, spb * 0.7, tr.arp);
    }
    const n = tr.lead[i];
    if (n) {
      this.inst('pulse', mtof(n.n), t, spb * n.len * 0.92, 0.075);
      this.inst('square', mtof(n.n) * 1.005, t, spb * n.len * 0.8, 0.02);
    }
  },
  inst(type, f, t, dur, vol, lp) {
    const c = Snd.ctx, o = c.createOscillator();
    if (type === 'pulse') o.setPeriodicWave(Snd.pulse); else o.type = type;
    o.frequency.setValueAtTime(f, t);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.03));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.04);
    if (lp) {
      const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp; f2.Q.value = 3;
      o.connect(f2); f2.connect(g);
    } else o.connect(g);
    g.connect(Snd.mus); o.start(t); o.stop(t + dur + 0.06);
  },
  kick(t) {
    const c = Snd.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.13);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(Snd.mus); o.start(t); o.stop(t + 0.25);
  },
  snare(t) {
    const c = Snd.ctx, s = c.createBufferSource(); s.buffer = Snd.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1100;
    const g = c.createGain(); g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    s.connect(f); f.connect(g); g.connect(Snd.mus); s.start(t, Math.random() * 0.5); s.stop(t + 0.18);
    const o = c.createOscillator(), g2 = c.createGain(); o.type = 'triangle';
    o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    g2.gain.setValueAtTime(0.3, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g2); g2.connect(Snd.mus); o.start(t); o.stop(t + 0.12);
  },
  hat(t, v) {
    const c = Snd.ctx, s = c.createBufferSource(); s.buffer = Snd.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    s.connect(f); f.connect(g); g.connect(Snd.mus); s.start(t, Math.random() * 0.5); s.stop(t + 0.06);
  }
};

// ---------------------------------------------------------------------
//  PIXEL FONT (5x7) with cached, outlined text rendering
// ---------------------------------------------------------------------
const GLYPHS = {
  'A': [14, 17, 17, 17, 31, 17, 17], 'B': [30, 17, 17, 30, 17, 17, 30], 'C': [14, 17, 16, 16, 16, 17, 14],
  'D': [28, 18, 17, 17, 17, 18, 28], 'E': [31, 16, 16, 30, 16, 16, 31], 'F': [31, 16, 16, 30, 16, 16, 16],
  'G': [14, 17, 16, 23, 17, 17, 15], 'H': [17, 17, 17, 31, 17, 17, 17], 'I': [14, 4, 4, 4, 4, 4, 14],
  'J': [7, 2, 2, 2, 2, 18, 12], 'K': [17, 18, 20, 24, 20, 18, 17], 'L': [16, 16, 16, 16, 16, 16, 31],
  'M': [17, 27, 21, 21, 17, 17, 17], 'N': [17, 17, 25, 21, 19, 17, 17], 'O': [14, 17, 17, 17, 17, 17, 14],
  'P': [30, 17, 17, 30, 16, 16, 16], 'Q': [14, 17, 17, 17, 21, 18, 13], 'R': [30, 17, 17, 30, 20, 18, 17],
  'S': [15, 16, 16, 14, 1, 1, 30], 'T': [31, 4, 4, 4, 4, 4, 4], 'U': [17, 17, 17, 17, 17, 17, 14],
  'V': [17, 17, 17, 17, 17, 10, 4], 'W': [17, 17, 17, 21, 21, 21, 10], 'X': [17, 17, 10, 4, 10, 17, 17],
  'Y': [17, 17, 17, 10, 4, 4, 4], 'Z': [31, 1, 2, 4, 8, 16, 31],
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [31, 2, 4, 2, 1, 17, 14], '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8], '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],
  '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '.': [0, 0, 0, 0, 0, 12, 12],
  ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0], '-': [0, 0, 0, 31, 0, 0, 0],
  '+': [0, 4, 4, 31, 4, 4, 0], '/': [0, 1, 2, 4, 8, 16, 0], '%': [24, 25, 2, 4, 8, 19, 3],
  '\'': [12, 4, 8, 0, 0, 0, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8],
  '=': [0, 0, 31, 0, 31, 0, 0], '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2],
  '#': [10, 10, 31, 10, 31, 10, 10], '"': [10, 10, 10, 0, 0, 0, 0], '*': [0, 4, 21, 14, 21, 4, 0],
  'x': [0, 0, 17, 10, 4, 10, 17], '^': [4, 14, 21, 4, 4, 4, 4], 'v': [4, 4, 4, 4, 21, 14, 4],
  '[': [4, 8, 31, 8, 4, 0, 0], ']': [4, 2, 31, 2, 4, 0, 0], '_': [0, 0, 0, 0, 0, 0, 31],
  '@': [14, 17, 23, 21, 23, 16, 14], '&': [12, 18, 20, 8, 21, 18, 13], ' ': [0, 0, 0, 0, 0, 0, 0]
};
// '[' and ']' are repurposed as left / right arrows, '^' / 'v' as up / down arrows, 'x' as a times sign
const textCache = new Map();
function textCanvas(str, color, outline) {
  const key = str + '\u0001' + color + '\u0001' + outline;
  let c = textCache.get(key);
  if (c) return c;
  if (textCache.size > 600) textCache.clear();
  c = document.createElement('canvas');
  c.width = str.length * 6 + 2; c.height = 10;
  const g = c.getContext('2d');
  const rows = Array.isArray(color) ? color : null;
  const draw = (ox, oy, col) => {
    for (let i = 0; i < str.length; i++) {
      const gl = GLYPHS[str[i]] || GLYPHS[str[i].toUpperCase()] || GLYPHS['?'];
      for (let r = 0; r < 7; r++) {
        const bits = gl[r];
        if (!bits) continue;
        g.fillStyle = col || rows[r];
        for (let b = 0; b < 5; b++) if (bits & (16 >> b)) g.fillRect(1 + i * 6 + b + ox, 1 + r + oy, 1, 1);
      }
    }
  };
  if (outline) {
    const oc = '#140a18';
    draw(0, 2, oc); draw(1, 2, oc); draw(-1, 2, oc);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) draw(dx, dy, oc);
  }
  draw(0, 0, rows ? null : color);
  textCache.set(key, c);
  return c;
}
function textWidth(str, scale) { return (str.length * 6 - 1) * (scale || 1); }
// align: 0 left, 1 centre, 2 right
function drawText(str, x, y, color, scale, align, outline) {
  str = String(str);
  scale = scale || 1;
  const c = textCanvas(str, color || '#fff', outline !== false);
  let dx = Math.round(x) - scale;
  if (align === 1) dx = Math.round(x - textWidth(str, scale) / 2) - scale;
  else if (align === 2) dx = Math.round(x - textWidth(str, scale)) - scale;
  ctx.drawImage(c, dx, Math.round(y) - scale, c.width * scale, c.height * scale);
}
const GRAD_GOLD = ['#fffbd0', '#ffec6a', '#ffd23a', '#ffae1a', '#ff8a10', '#e8580c', '#b8300a'];
const GRAD_RED = ['#ffe0d0', '#ff9a80', '#ff5a40', '#f03020', '#c81818', '#a01010', '#700808'];
const GRAD_STEEL = ['#ffffff', '#e8f0ff', '#c8d8f0', '#a0b8d8', '#8098c0', '#6078a0', '#405878'];
const GRAD_GREEN = ['#f0ffd0', '#c8f080', '#98e050', '#70c830', '#50a820', '#388018', '#206010'];

// ---------------------------------------------------------------------
//  FIGURE RENDERER: rect lists drawn with a unified bold outline
// ---------------------------------------------------------------------
const OUTLINE = '#1b0f1e';
const FIG = { r: [], n: 0 };
function fr(x, y, w, h, c, noOutline) {
  let o = FIG.r[FIG.n];
  if (!o) o = FIG.r[FIG.n] = {};
  o.x = Math.round(x); o.y = Math.round(y); o.w = Math.round(w); o.h = Math.round(h); o.c = c; o.no = noOutline ? 1 : 0;
  FIG.n++;
}
function fline(x0, y0, x1, y1, t, c) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  const h = t / 2;
  for (let i = 0; i <= n; i++) fr(Math.round(x0 + dx * i / n - h), Math.round(y0 + dy * i / n - h), t, t, c);
}
// draws queued rects at (ox,oy); flip mirrors horizontally around ox; rot = quarter turns around (ox, oy+pivot)
function fdraw(ox, oy, flip, flash, rot, pivot, outline) {
  ox = Math.round(ox); oy = Math.round(oy);
  let saved = false;
  if (rot) {
    saved = true; ctx.save();
    ctx.translate(ox, oy + (pivot || 0)); ctx.rotate(rot * PI / 2);
    ox = 0; oy = -(pivot || 0);
  }
  const R = FIG.r, n = FIG.n;
  if (outline !== null) {
    ctx.fillStyle = outline || OUTLINE;
    for (let i = 0; i < n; i++) {
      const r = R[i]; if (r.no) continue;
      const x = flip ? ox - r.x - r.w : ox + r.x;
      ctx.fillRect(x - 1, oy + r.y - 1, r.w + 2, r.h + 2);
    }
  }
  let last = null;
  for (let i = 0; i < n; i++) {
    const r = R[i];
    const c = flash && !r.no ? flash : r.c;
    if (c !== last) { ctx.fillStyle = c; last = c; }
    const x = flip ? ox - r.x - r.w : ox + r.x;
    ctx.fillRect(x, oy + r.y, r.w, r.h);
  }
  if (saved) ctx.restore();
  FIG.n = 0;
}

// cached pixel circles
const circCache = new Map();
function circleSpr(r, color) {
  r = Math.max(1, Math.round(r));
  const key = r + color;
  let c = circCache.get(key);
  if (c) return c;
  if (circCache.size > 1500) circCache.clear();
  c = document.createElement('canvas'); c.width = c.height = r * 2 + 1;
  const g = c.getContext('2d'); g.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
    g.fillRect(r - w, r + dy, w * 2 + 1, 1);
  }
  c.r = r;
  circCache.set(key, c);
  return c;
}
function dcirc(x, y, r, color) {
  if (r < 0.6) return;
  const c = circleSpr(r, color);
  ctx.drawImage(c, Math.round(x) - c.r, Math.round(y) - c.r);
}
function ring(x, y, r, color, w) {
  ctx.strokeStyle = color; ctx.lineWidth = w || 2;
  ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), r, 0, TAU); ctx.stroke();
}
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
