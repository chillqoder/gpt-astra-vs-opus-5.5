// =====================================================================
//  WORLD: tiles, collision, level layout, backgrounds, prerendering
// =====================================================================
const LW = 430, LH = 17, GROUND = 13, GY = GROUND * TS;
const ZONE_X = [0, 130 * TS, 270 * TS, 400 * TS];
const ZONE_NAMES = ['DESERT OUTPOST', 'RUINED VILLAGE', 'SCORPION CANYON', 'FORTRESS GATE'];
let tiles = new Uint8Array(LW * LH);
let BRK = new Array(LW * LH);   // breakable tile -> owning prop
let LEVEL = null;               // { specs, events, decor, dyn, fgSil, windows }
const T_EMPTY = 0, T_SOLID = 1, T_ONEWAY = 2, T_LADDER = 3, T_LADTOP = 4, T_INVIS = 5, T_BREAK = 6, T_INVOW = 7;

function tileAt(tx, ty) {
  if (tx < 0 || tx >= LW) return T_SOLID;
  if (ty < 0) return T_EMPTY;
  if (ty >= LH) return T_SOLID;
  return tiles[ty * LW + tx];
}
const isSolidT = t => t === 1 || t === 5 || t === 6;
const isOnewayT = t => t === 2 || t === 4 || t === 7;
const isLadderT = t => t === 3 || t === 4;
function solidAt(px, py) { return isSolidT(tileAt(Math.floor(px / TS), Math.floor(py / TS))); }
function groundBelow(px, py) { const t = tileAt(Math.floor(px / TS), Math.floor(py / TS)); return isSolidT(t) || isOnewayT(t); }
function setTile(tx, ty, v) { if (tx >= 0 && tx < LW && ty >= 0 && ty < LH) tiles[ty * LW + tx] = v; }
function zoneAt(px) { return px < ZONE_X[1] ? 0 : px < ZONE_X[2] ? 1 : px < ZONE_X[3] ? 2 : 3; }

function moveBody(e, drop) {
  e.hitWall = 0; e.hitCeil = 0;
  if (e.vx !== 0) {
    e.x += e.vx;
    const ty0 = Math.floor((e.y - e.h + 2) / TS), ty1 = Math.floor((e.y - 2) / TS);
    if (e.vx > 0) {
      const tx = Math.floor((e.x + e.w / 2) / TS);
      for (let ty = ty0; ty <= ty1; ty++) if (isSolidT(tileAt(tx, ty))) { e.x = tx * TS - e.w / 2 - 0.001; e.hitWall = 1; break; }
    } else {
      const tx = Math.floor((e.x - e.w / 2) / TS);
      for (let ty = ty0; ty <= ty1; ty++) if (isSolidT(tileAt(tx, ty))) { e.x = (tx + 1) * TS + e.w / 2 + 0.001; e.hitWall = -1; break; }
    }
  }
  e.onGround = false;
  const py = e.y;
  e.y += e.vy;
  const l = Math.floor((e.x - e.w / 2 + 1) / TS), r = Math.floor((e.x + e.w / 2 - 1) / TS);
  if (e.vy >= 0) {
    const ty = Math.floor(e.y / TS), surf = ty * TS;
    for (let tx = l; tx <= r; tx++) {
      const t = tileAt(tx, ty);
      if (isSolidT(t) || (isOnewayT(t) && !drop && py <= surf + 0.01)) { e.y = surf; e.vy = 0; e.onGround = true; break; }
    }
  } else {
    const ty = Math.floor((e.y - e.h) / TS);
    for (let tx = l; tx <= r; tx++) if (isSolidT(tileAt(tx, ty))) { e.y = (ty + 1) * TS + e.h + 0.01; e.vy = 0; e.hitCeil = 1; break; }
  }
}
// true if a body standing at x would have floor under its leading edge
function floorAhead(e, dir) {
  const fx = e.x + dir * (e.w / 2 + 3);
  return groundBelow(fx, e.y + 2);
}

// deterministic helpers for level art
function hash1(i) {
  let h = Math.imul(i ^ 0x27d4eb2d, 0x9e3779b1); h ^= h >>> 15; h = Math.imul(h, 0x85ebca77); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
function vnoise(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash1(i), hash1(i + 1), u); }
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------------
//  LEVEL LAYOUT
// ---------------------------------------------------------------------
function buildLevel() {
  tiles = new Uint8Array(LW * LH);
  BRK = new Array(LW * LH);
  const specs = [], events = [], decor = [], dyn = [], windows = [];
  const fill = (x0, x1, y0, y1, v) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setTile(x, y, v); };
  const X = tx => tx * TS + 8, Y = row => row * TS;
  const sp = (k, tx, row, o) => specs.push(Object.assign({ k, x: X(tx), y: Y(row) }, o || {}));
  const ev = (ctx, o) => events.push(Object.assign({ cx: ctx * TS }, o));
  const ladder = (tx, top, bot) => { setTile(tx, top, T_LADTOP); for (let y = top + 1; y <= bot; y++) setTile(tx, y, T_LADDER); };
  const building = (x0, x1, floors, roof, style, wins) => {
    decor.push({ k: 'bld', x0, x1, roof, style, floors });
    for (const f of floors) fill(x0, x1, f, f, T_ONEWAY);
    fill(x0 + 1, x1 - 1, roof, roof, T_ONEWAY);
    for (const w of wins || []) windows.push({ x: X(w[0]), y: Y(w[1]) });
  };
  fill(0, LW - 1, GROUND, LH - 1, T_SOLID);

  // ============ ZONE 1: DESERT OUTPOST (0-129) ============
  decor.push({ k: 'palm', tx: 2 }, { k: 'palm', tx: 9 }, { k: 'sign', tx: 5, text: 'KEEP OUT' }, { k: 'palm', tx: 30 }, { k: 'pole', tx: 47 }, { k: 'palm', tx: 88 }, { k: 'pole', tx: 94 }, { k: 'palm', tx: 108 });
  sp('checkpoint', 43, 9, { id: 1 });
  sp('sandbag', 12, 12); sp('soldier', 15, 13, { idle: 'sleep' }); sp('soldier', 19, 13, { idle: 'chat' });
  sp('crate', 22, 12, { item: 'H' });
  fill(26, 28, 12, 12, T_INVIS); sp('car', 27, 13);
  sp('captive', 32, 13, { item: 'B' });
  fill(36, 39, 11, 12, T_SOLID); fill(40, 43, 9, 12, T_SOLID); fill(44, 45, 12, 12, T_SOLID);
  sp('soldier', 38, 11); sp('soldier', 41, 9, { idle: 'sleep' });
  ev(48, { lock: true, waves: [
    [{ t: 'soldier', from: 'R', d: 0 }, { t: 'soldier', from: 'R', d: 35 }, { t: 'soldier', from: 'R', d: 70 }],
    [{ t: 'soldier', from: 'P', ox: 300, d: 0 }, { t: 'soldier', from: 'P', ox: 390, d: 25 }, { t: 'soldier', from: 'R', d: 50 }],
    [{ t: 'rusher', from: 'R', d: 0 }, { t: 'soldier', from: 'R', d: 50 }, { t: 'soldier', from: 'L', d: 90 }]
  ] });
  // bunker with secret room behind a cracked wall
  sp('crate', 50, 12, { item: 'coin' });
  fill(52, 58, 10, 10, T_SOLID); fill(58, 58, 11, 12, T_SOLID); fill(59, 59, 11, 12, T_SOLID); fill(60, 60, 12, 12, T_SOLID);
  sp('crackwall', 52, 11, { h: 2 });
  decor.push({ k: 'bunker', x0: 52, x1: 58 });
  sp('captive', 55, 13, { item: 'S', secret: 0 }); sp('item', 54, 13, { item: 'gold' }); sp('item', 56, 13, { item: 'medal' });
  sp('secret', 53, 13, { w: 5 * TS, id: 0 });
  sp('fakewall', 53, 11, { w: 5, h: 2, style: 'bunker' });
  fill(64, 64, 10, 12, T_SOLID); sp('turret', 64, 10);
  sp('barrel', 69, 13); sp('barrel', 70, 13); sp('soldier', 72, 13); sp('soldier', 74, 13, { idle: 'chat' });
  sp('crate', 77, 12, { item: 'apple' });
  sp('sandbag', 80, 12); sp('soldier', 83, 13);
  ev(84, { lock: true, waves: [
    [{ t: 'truck', from: 'R', n: 4, d: 0 }],
    [{ t: 'soldier', from: 'P', ox: 260, d: 0 }, { t: 'soldier', from: 'P', ox: 360, d: 30 }, { t: 'bomber', from: 'R', d: 60 }]
  ] });
  ev(92, { spawn: [{ t: 'rusher', from: 'R', d: 0 }, { t: 'rusher', from: 'R', d: 45 }] });
  sp('captive', 98, 13, { item: 'medal' });
  sp('crate', 101, 12, { item: 'A' });
  ev(104, { lock: true, waves: [
    [{ t: 'jeep', from: 'R', d: 0 }],
    [{ t: 'soldier', from: 'R', d: 0 }, { t: 'soldier', from: 'P', ox: 320, d: 20 }, { t: 'carrier', from: 'R', d: 60 }]
  ] });
  fill(112, 114, 12, 12, T_SOLID); fill(116, 121, 9, 9, T_ONEWAY);
  decor.push({ k: 'ruin', x0: 116, x1: 121, top: 9 });
  sp('captive', 119, 9, { item: 'hp' }); sp('soldier', 117, 9);
  ev(112, { spawn: [{ t: 'drone', from: 'R', d: 0 }, { t: 'drone', from: 'R', d: 60 }] });
  fill(124, 125, 12, 12, T_SOLID);
  ev(120, { msg: 'ZONE 2', sub: 'RUINED VILLAGE' });

  // ============ ZONE 2: RUINED VILLAGE (130-269) ============
  fill(132, 133, 12, 12, T_SOLID); sp('sandbag', 136, 12); sp('soldier', 139, 13, { idle: 'chat' });
  sp('checkpoint', 133, 12, { id: 2 });
  building(142, 152, [10, 7], 4, 0, [[147, 7], [150, 10]]);
  ladder(143, 10, 12); ladder(151, 7, 9); ladder(144, 4, 6);
  sp('soldier', 148, 10); sp('sniper', 150, 4);
  fill(153, 156, 8, 8, T_ONEWAY); decor.push({ k: 'balcony', x0: 153, x1: 156, y: 8 });
  building(157, 168, [10, 7], 4, 1, [[160, 7], [165, 10]]);
  ladder(158, 10, 12); ladder(167, 7, 9); ladder(159, 4, 6);
  sp('gunner', 165, 10, { face: -1 });
  ev(140, { lock: true, waves: [
    [{ t: 'soldier', from: 'W', wx: X(147), wy: Y(7), d: 0 }, { t: 'soldier', from: 'W', wx: X(150), wy: Y(10), d: 30 }, { t: 'soldier', from: 'R', d: 60 }],
    [{ t: 'drone', from: 'R', d: 0 }, { t: 'drone', from: 'R', d: 40 }, { t: 'rusher', from: 'R', d: 70 }],
    [{ t: 'soldier', from: 'W', wx: X(160), wy: Y(7), d: 0 }, { t: 'soldier', from: 'P', ox: 330, d: 20 }, { t: 'rusher', from: 'L', d: 60 }]
  ] });
  // secret cellar under building B
  fill(160, 166, 14, 15, T_EMPTY); ladder(166, 13, 15);
  sp('crackfloor', 161, 13, { w: 2 });
  sp('captive', 164, 16, { item: 'shield', secret: 1 }); sp('item', 162, 16, { item: 'gold' }); sp('item', 163, 16, { item: 'medal' }); sp('item', 165, 16, { item: 'gem' });
  sp('secret', 160, 16, { w: 7 * TS, id: 1 });
  decor.push({ k: 'cellar', x0: 160, x1: 166 });
  sp('fakewall', 160, 14, { w: 7, h: 2, style: 'ground' });
  decor.push({ k: 'fountain', tx: 175 });
  sp('crate', 176, 12, { item: 'F' }); sp('barrel', 179, 13);
  ev(168, { spawn: [{ t: 'carrier', from: 'R', d: 0 }, { t: 'bomber', from: 'R', d: 80 }, { t: 'soldier', from: 'R', d: 110 }] });
  building(182, 194, [10, 7], 4, 2, [[186, 10], [191, 7]]);
  ladder(183, 10, 12); ladder(193, 7, 9); ladder(184, 4, 6);
  sp('captive', 190, 4, { item: 'R' }); sp('soldier', 188, 7);
  sp('checkpoint', 192, 4, { id: 3 });
  building(198, 209, [10, 7], 4, 0, [[203, 10], [206, 7]]);
  ladder(199, 10, 12); ladder(208, 7, 9); ladder(200, 4, 6);
  sp('sniper', 206, 4);
  sp('bwall', 216, 9, { h: 4 });
  ev(196, { lock: true, waves: [
    [{ t: 'soldier', from: 'W', wx: X(203), wy: Y(10), d: 0 }, { t: 'soldier', from: 'W', wx: X(206), wy: Y(7), d: 30 }, { t: 'soldier', from: 'R', d: 50 }],
    [{ t: 'heavy', from: 'X', x: X(217), y: Y(13), d: 0, burst: 216 }, { t: 'rusher', from: 'R', d: 70 }],
    [{ t: 'drone', from: 'R', d: 0 }, { t: 'soldier', from: 'P', ox: 250, d: 20 }, { t: 'soldier', from: 'P', ox: 350, d: 40 }, { t: 'drone', from: 'R', d: 70 }]
  ] });
  building(226, 238, [10, 7], 4, 1, [[230, 10], [235, 7]]);
  ladder(227, 10, 12); ladder(237, 7, 9);
  sp('crate', 232, 6, { item: 'R' }); sp('captive', 236, 13, { item: 'A' }); sp('soldier', 233, 10);
  ev(240, { spawn: [{ t: 'truck', from: 'R', n: 3, d: 0 }] });
  sp('barrel', 247, 13); sp('barrel', 248, 13); sp('barrel', 248, 12, { stack: true });
  ev(244, { spawn: [{ t: 'bomber', from: 'R', d: 40 }, { t: 'bomber', from: 'R', d: 100 }] });
  sp('sandbag', 251, 12); sp('gunner', 253, 13, { face: -1 });
  sp('captive', 258, 13, { item: 'medal' });
  sp('checkpoint', 262, 13, { id: 4 });
  sp('tank', 267, 13);
  decor.push({ k: 'sign', tx: 264, text: 'MOTOR POOL' });
  ev(258, { msg: 'ZONE 3', sub: 'SCORPION CANYON' });

  // ============ ZONE 3: SCORPION CANYON (270-399) ============
  const ceil = [];
  for (let tx = 270; tx < 400; tx++) {
    let c = 3 + Math.round(vnoise(tx * 0.35) * 2);
    if (tx >= 330 && tx <= 352) c = 5;
    if (tx < 274) c = Math.max(-1, c - (274 - tx));
    if (tx > 390) c = Math.max(-1, c - (tx - 390));
    ceil[tx] = c;
    if (c >= 0) fill(tx, tx, 0, c, T_SOLID);
  }
  const cy = tx => (ceil[tx] + 1) * TS;
  fill(276, 277, 12, 12, T_SOLID); fill(286, 286, 12, 12, T_SOLID);
  ev(271, { spawn: [{ t: 'drone', from: 'R', d: 0 }, { t: 'drone', from: 'R', d: 50 }] });
  sp('soldier', 281, 13); sp('soldier', 284, 13, { idle: 'sleep' });
  for (const tx of [279, 288, 293]) specs.push({ k: 'stalactite', x: X(tx), y: cy(tx) });
  sp('barrel', 289, 13); sp('barrel', 290, 13); sp('barrel', 291, 13); sp('soldier', 292, 13); sp('soldier', 295, 13, { idle: 'chat' });
  specs.push({ k: 'turret', x: X(298), y: cy(298), ceiling: true });
  // secret cave pocket behind fake rock
  fill(301, 301, 12, 12, T_SOLID); fill(302, 302, 11, 12, T_SOLID); fill(303, 305, 9, 12, T_SOLID);
  fill(303, 312, 0, 3, T_SOLID); fill(303, 305, 4, 8, T_EMPTY);
  fill(306, 312, 7, 7, T_SOLID); fill(312, 312, 4, 6, T_SOLID); fill(306, 311, 4, 6, T_EMPTY);
  for (let tx = 303; tx <= 312; tx++) ceil[tx] = 3;
  sp('fakewall', 306, 4, { w: 6, h: 3 });
  sp('captive', 309, 7, { item: 'L', secret: 2 }); sp('item', 308, 7, { item: 'gem' }); sp('item', 310, 7, { item: 'gold' });
  sp('secret', 307, 7, { w: 5 * TS, id: 2 });
  sp('soldier', 304, 9);
  dyn.push({ k: 'torch', x: X(300), y: Y(10) }, { k: 'torch', x: X(318), y: Y(10) }, { k: 'torch', x: X(338), y: Y(10) }, { k: 'torch', x: X(360), y: Y(10) }, { k: 'torch', x: X(384), y: Y(10) });
  sp('bwall', 340, ceil[340] + 1, { h: 12 - ceil[340], rock: true });
  ev(316, { lock: true, waves: [
    [{ t: 'rusher', from: 'L', d: 0 }, { t: 'drone', from: 'R', d: 30 }, { t: 'rusher', from: 'L', d: 60 }, { t: 'soldier', from: 'L', d: 90 }],
    [{ t: 'heavy', from: 'X', x: X(342), y: Y(13), d: 0, burst: 340 }, { t: 'soldier', from: 'X', x: X(344), y: Y(13), d: 30 }, { t: 'soldier', from: 'X', x: X(345), y: Y(13), d: 55 }],
    [{ t: 'bomber', from: 'R', d: 0 }, { t: 'drone', from: 'R', d: 40 }, { t: 'bomber', from: 'R', d: 80 }]
  ] });
  ev(334, { rockfall: 520 });
  sp('barrel', 346, 13); sp('soldier', 350, 13); sp('carrier', 352, 13);
  sp('checkpoint', 348, 13, { id: 5 });
  ev(354, { lock: true, waves: [
    [{ t: 'jeep', from: 'R', d: 0 }, { t: 'drone', from: 'R', d: 90 }],
    [{ t: 'soldier', from: 'R', d: 0 }, { t: 'rusher', from: 'R', d: 30 }, { t: 'soldier', from: 'L', d: 50 }, { t: 'drone', from: 'R', d: 80 }]
  ] });
  fill(366, 368, 10, 12, T_SOLID); sp('gunner', 367, 10, { face: -1 });
  fill(372, 374, 11, 12, T_SOLID); sp('captive', 373, 11, { item: 'hp' });
  sp('stalactite', 370, 0); specs[specs.length - 1].y = cy(370);
  sp('soldier', 377, 13);
  sp('crate', 379, 12, { item: 'B' });
  ev(380, { lock: true, waves: [
    [{ t: 'heavy', from: 'R', d: 0 }, { t: 'soldier', from: 'R', d: 40 }, { t: 'soldier', from: 'L', d: 70 }],
    [{ t: 'drone', from: 'R', d: 0 }, { t: 'drone', from: 'R', d: 30 }, { t: 'bomber', from: 'R', d: 60 }, { t: 'rusher', from: 'L', d: 90 }],
    [{ t: 'heavy', from: 'R', d: 0 }, { t: 'rusher', from: 'L', d: 40 }, { t: 'carrier', from: 'R', d: 80 }]
  ] });
  sp('crate', 393, 12, { item: 'hp' });
  sp('checkpoint', 396, 13, { id: 6 });
  ev(392, { msg: 'WARNING', sub: 'ENEMY FORTRESS AHEAD', col: GRAD_RED });

  // ============ ZONE 4: FORTRESS GATE ARENA (400-429) ============
  ev(400, { boss: true });

  // foreground silhouettes & ambient
  const fgSil = [];
  const rng = mulberry(77);
  for (let x = 0; x < LW * TS * 1.3; x += 90 + rng() * 160) fgSil.push({ x, v: rng(), s: rng() });
  LEVEL = { specs, events, decor, dyn, fgSil, windows, ceil };
  return LEVEL;
}

// ---------------------------------------------------------------------
//  PRERENDER: level tiles + static decor into one big canvas
// ---------------------------------------------------------------------
const ZPAL = [
  { base: '#d6a45e', dark: '#b8864a', light: '#f2cc80', top: '#fbe0a0', speck: '#a87a40' },
  { base: '#8a7466', dark: '#6a5648', light: '#a8927e', top: '#b8a488', speck: '#5a4638' },
  { base: '#5a3c48', dark: '#3a2432', light: '#7a5664', top: '#8a6a58', speck: '#2a1824' },
  { base: '#5c5c68', dark: '#40404a', light: '#7c7c88', top: '#8a8a96', speck: '#34343c' }
];
function zoneDustColor(x) { return ['#e8c890', '#b8a894', '#8a6a70', '#9a9aa4'][zoneAt(x)]; }
let fgCanvas = null;
function prerenderLevel() {
  const Wp = LW * TS, Hp = LH * TS;
  if (!fgCanvas) fgCanvas = makeCanvas(Wp, Hp);
  const g = fgCanvas.getContext('2d');
  g.clearRect(0, 0, Wp, Hp);
  const rng = mulberry(1234);
  for (const d of LEVEL.decor) drawDecor(g, d, rng);
  for (let ty = 0; ty < LH; ty++) for (let tx = 0; tx < LW; tx++) drawTile(g, tx, ty, rng);
  for (const d of LEVEL.decor) if (d.k === 'bunker') drawBunkerFront(g, d);
}
function drawTile(g, tx, ty, rng) {
  const t = tiles[ty * LW + tx];
  const x = tx * TS, y = ty * TS;
  const z = zoneAt(x), P = ZPAL[z];
  const r = hash1(tx * 131 + ty * 977);
  if (t === T_SOLID) {
    const up = tileAt(tx, ty - 1), dn = tileAt(tx, ty + 1), lf = tileAt(tx - 1, ty), rt = tileAt(tx + 1, ty);
    const openTop = !isSolidT(up) && ty > 0, openBot = !isSolidT(dn) && ty < LH - 1;
    drawSolidTex(g, x, y, z, r, ty);
    if (openTop) {
      g.fillStyle = OUTLINE; g.fillRect(x, y, TS, 1);
      g.fillStyle = P.top; g.fillRect(x, y + 1, TS, 3);
      g.fillStyle = P.light; g.fillRect(x, y + 4, TS, 1);
      if (z === 0) { g.fillStyle = P.light; for (let i = 0; i < 3; i++) g.fillRect(x + ((r * 50 + i * 5) % 15), y + 1, 2, 1); }
      if (z === 1 && r > 0.6) { g.fillStyle = '#6a8a3a'; g.fillRect(x + 3, y - 2, 1, 2); g.fillRect(x + 5, y - 3, 1, 3); }
      if (z === 2) { g.fillStyle = '#6a7a4a'; g.fillRect(x, y + 1, TS, 1); if (r > 0.5) { g.fillStyle = '#7a8a50'; g.fillRect(x + 6, y - 1, 2, 2); } }
      if (z === 3) { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#222' : '#e8c030'; g.fillRect(x + i * 4, y + 1, 4, 3); } }
    }
    if (openBot) {
      g.fillStyle = P.dark; g.fillRect(x, y + TS - 3, TS, 3);
      g.fillStyle = OUTLINE; g.fillRect(x, y + TS - 1, TS, 1);
      if (z === 2) {
        g.fillStyle = P.dark;
        const n = (r * 3) | 0;
        g.fillRect(x + 4 + n, y + TS, 4, 3); g.fillRect(x + 5 + n, y + TS + 3, 2, 3);
        g.fillStyle = OUTLINE; g.fillRect(x + 5 + n, y + TS + 6, 2, 1);
      }
    }
    if (!isSolidT(lf) && tx > 0) { g.fillStyle = OUTLINE; g.fillRect(x, y, 1, TS); g.fillStyle = P.light; g.fillRect(x + 1, y + 1, 1, TS - 2); }
    if (!isSolidT(rt) && tx < LW - 1) { g.fillStyle = OUTLINE; g.fillRect(x + TS - 1, y, 1, TS); g.fillStyle = P.dark; g.fillRect(x + TS - 2, y + 1, 1, TS - 2); }
  } else if (t === T_ONEWAY || t === T_LADTOP) {
    if (z === 0) {
      g.fillStyle = OUTLINE; g.fillRect(x, y, TS, 6);
      g.fillStyle = '#c89a60'; g.fillRect(x, y + 1, TS, 4); g.fillStyle = '#e8c088'; g.fillRect(x, y + 1, TS, 1);
    } else if (z === 1) {
      g.fillStyle = OUTLINE; g.fillRect(x, y, TS, 6);
      g.fillStyle = '#8a5a32'; g.fillRect(x, y + 1, TS, 4);
      g.fillStyle = '#b07a44'; g.fillRect(x, y + 1, TS, 1);
      g.fillStyle = '#5a3a1e'; g.fillRect(x + (tx % 2 ? 7 : 12), y + 1, 1, 4);
      if (tileAt(tx - 1, ty) === T_EMPTY || tileAt(tx + 1, ty) === T_EMPTY) { g.fillStyle = '#5a3a1e'; g.fillRect(x + 6, y + 6, 3, 4); }
    } else if (z === 2) {
      g.fillStyle = OUTLINE; g.fillRect(x, y, TS, 5);
      g.fillStyle = '#7a5a3a'; g.fillRect(x, y + 1, TS, 3); g.fillStyle = '#5a3a24'; g.fillRect(x + 3, y + 5, 2, 6); g.fillRect(x + 11, y + 5, 2, 6);
    } else {
      g.fillStyle = OUTLINE; g.fillRect(x, y, TS, 5);
      g.fillStyle = '#7a7a86'; g.fillRect(x, y + 1, TS, 3);
      g.fillStyle = '#3a3a44'; for (let i = 0; i < 4; i++) g.fillRect(x + i * 4 + 1, y + 2, 2, 1);
    }
    if (t === T_LADTOP) drawLadder(g, x, y + 6, TS - 6);
  } else if (t === T_LADDER) {
    drawLadder(g, x, y, TS);
  }
}
function drawSolidTex(g, x, y, z, r, ty) {
  const P = ZPAL[z];
  g.fillStyle = P.base; g.fillRect(x, y, TS, TS);
  if (z === 0) {
    for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? P.speck : P.dark; g.fillRect(x + ((r * 97 + i * 37) % 14), y + ((r * 53 + i * 23) % 14), 2, 1); }
    if (r > 0.7) { g.fillStyle = P.dark; g.fillRect(x + 4, y + 8, 5, 3); g.fillStyle = P.light; g.fillRect(x + 4, y + 8, 4, 1); }
  } else if (z === 1) {
    g.fillStyle = P.dark;
    const off = (ty % 2) * 4;
    g.fillRect(x, y + 7, TS, 1); g.fillRect(x, y + 15, TS, 1);
    g.fillRect(x + off + 3, y, 1, 7); g.fillRect(x + ((off + 11) % 16), y + 8, 1, 7);
    g.fillStyle = P.light; g.fillRect(x + off + 4, y + 1, 5, 1);
  } else if (z === 2) {
    g.fillStyle = P.dark;
    g.fillRect(x + (r * 10 | 0), y + 3, 5, 1); g.fillRect(x + ((r * 7 | 0) + 4) % 12, y + 10, 4, 1); g.fillRect(x + 2, y + ((r * 13) | 0), 1, 3);
    g.fillStyle = P.light; g.fillRect(x + ((r * 17 | 0) % 12), y + 6, 3, 1);
  } else {
    g.fillStyle = P.dark; g.fillRect(x, y, TS, 1); g.fillRect(x, y, 1, TS);
    g.fillStyle = P.light; g.fillRect(x + 2, y + 2, 1, 1); g.fillRect(x + 13, y + 2, 1, 1); g.fillRect(x + 2, y + 13, 1, 1); g.fillRect(x + 13, y + 13, 1, 1);
  }
}
function drawLadder(g, x, y, h) {
  g.fillStyle = OUTLINE; g.fillRect(x + 2, y, 3, h); g.fillRect(x + 11, y, 3, h);
  g.fillStyle = '#9a6a3a'; g.fillRect(x + 3, y, 1, h); g.fillRect(x + 12, y, 1, h);
  for (let yy = 2; yy < h; yy += 4) { g.fillStyle = OUTLINE; g.fillRect(x + 3, y + yy - 1, 10, 3); g.fillStyle = '#b8844a'; g.fillRect(x + 4, y + yy, 8, 1); }
}
function drawDecor(g, d, rng) {
  switch (d.k) {
    case 'bld': drawBuilding(g, d, rng); break;
    case 'palm': drawPalm(g, d.tx * TS + 8, GY, rng); break;
    case 'pole': {
      const x = d.tx * TS + 8;
      g.fillStyle = OUTLINE; g.fillRect(x - 2, GY - 90, 5, 90); g.fillRect(x - 12, GY - 86, 25, 4);
      g.fillStyle = '#7a5434'; g.fillRect(x - 1, GY - 90, 3, 90); g.fillStyle = '#9a7048'; g.fillRect(x - 11, GY - 85, 23, 2);
      g.strokeStyle = '#2a2020'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 10, GY - 86); g.quadraticCurveTo(x - 60, GY - 70, x - 110, GY - 86); g.stroke();
      break;
    }
    case 'sign': {
      const x = d.tx * TS;
      g.fillStyle = OUTLINE; g.fillRect(x + 6, GY - 26, 4, 26); g.fillRect(x - 6, GY - 32, 30, 14);
      g.fillStyle = '#8a5a30'; g.fillRect(x + 7, GY - 26, 2, 26); g.fillStyle = '#d8b070'; g.fillRect(x - 5, GY - 31, 28, 12);
      g.fillStyle = '#c03020';
      const s = d.text, cw = Math.min(28 / s.length, 4);
      for (let i = 0; i < s.length; i++) if (s[i] !== ' ') g.fillRect(x - 3 + i * cw, GY - 27, Math.max(1, cw - 1), 4);
      break;
    }
    case 'bunker': {
      const x0 = d.x0 * TS, x1 = (d.x1 + 1) * TS;
      g.fillStyle = '#6a5a44'; g.fillRect(x0, 11 * TS, x1 - x0, 2 * TS);
      g.fillStyle = '#4a3e30'; for (let x = x0; x < x1; x += 8) g.fillRect(x, 11 * TS, 1, 2 * TS);
      g.fillStyle = '#e8c040'; g.fillRect(x0 + 40, 11 * TS + 6, 20, 3);
      break;
    }
    case 'cellar': {
      const x0 = d.x0 * TS, x1 = (d.x1 + 1) * TS;
      g.fillStyle = '#3a2a24'; g.fillRect(x0, 14 * TS, x1 - x0, 2 * TS);
      g.fillStyle = '#4a382e'; for (let x = x0; x < x1; x += 16) for (let y = 14 * TS; y < 16 * TS; y += 8) g.fillRect(x + ((y / 8) % 2) * 8, y, 7, 7);
      g.fillStyle = '#ffd060'; g.fillRect(x0 + 40, 14 * TS + 4, 3, 3);
      break;
    }
    case 'fountain': {
      const x = d.tx * TS;
      g.fillStyle = OUTLINE; g.fillRect(x - 18, GY - 14, 52, 14); g.fillRect(x + 4, GY - 34, 8, 22);
      g.fillStyle = '#b0a494'; g.fillRect(x - 17, GY - 13, 50, 13); g.fillStyle = '#d0c4b4'; g.fillRect(x - 17, GY - 13, 50, 2);
      g.fillStyle = '#a09484'; g.fillRect(x + 5, GY - 33, 6, 21); g.fillStyle = '#7a6e60'; g.fillRect(x - 10, GY - 8, 8, 5); g.fillRect(x + 18, GY - 9, 7, 6);
      break;
    }
    case 'balcony': {
      const x0 = d.x0 * TS, y = d.y * TS;
      g.fillStyle = OUTLINE; for (let x = x0 + 2; x < (d.x1 + 1) * TS; x += 6) g.fillRect(x, y - 10, 2, 10);
      g.fillRect(x0, y - 11, (d.x1 - d.x0 + 1) * TS, 2);
      break;
    }
    case 'ruin': {
      const x0 = d.x0 * TS, x1 = (d.x1 + 1) * TS, y = d.top * TS;
      g.fillStyle = '#b89468'; g.fillRect(x0 + 4, y + 5, 10, GY - y - 5); g.fillRect(x1 - 14, y + 5, 10, GY - y - 5);
      g.fillStyle = '#9a7a54'; g.fillRect(x0 + 4, y + 5, 3, GY - y - 5); g.fillRect(x1 - 14, y + 5, 3, GY - y - 5);
      g.fillStyle = OUTLINE; g.fillRect(x0 + 3, y + 5, 1, GY - y - 5); g.fillRect(x0 + 14, y + 5, 1, GY - y - 5); g.fillRect(x1 - 15, y + 5, 1, GY - y - 5); g.fillRect(x1 - 4, y + 5, 1, GY - y - 5);
      break;
    }
  }
}
const BLD_STYLES = [
  { wall: '#c8a884', wallD: '#a8886a', inner: '#6a4e44', innerD: '#543c34', trim: '#e8d0a8' },
  { wall: '#b4b09a', wallD: '#8e8a76', inner: '#4e5048', innerD: '#3c3e38', trim: '#d8d4bc' },
  { wall: '#c89a78', wallD: '#a0765a', inner: '#5e4238', innerD: '#48302a', trim: '#ecc0a0' }
];
function drawBuilding(g, d, rng) {
  const S = BLD_STYLES[d.style];
  const x0 = d.x0 * TS, x1 = (d.x1 + 1) * TS, top = d.roof * TS - 6;
  // back wall (cutaway interior)
  g.fillStyle = S.inner; g.fillRect(x0, top, x1 - x0, GY - top);
  g.fillStyle = S.innerD;
  for (let x = x0 + 6; x < x1 - 6; x += 10) g.fillRect(x, top + 8, 2, GY - top - 8);
  // windows on each storey
  const levels = [d.roof].concat(d.floors).concat([GROUND]).sort((a, b) => a - b);
  for (let i = 0; i < levels.length - 1; i++) {
    const yA = levels[i] * TS + 6, yB = levels[i + 1] * TS;
    for (let x = x0 + 22; x < x1 - 30; x += 40) {
      const wy = yA + 8, wh = Math.min(22, yB - yA - 14);
      g.fillStyle = OUTLINE; g.fillRect(x - 1, wy - 1, 20, wh + 2);
      g.fillStyle = '#e8b890'; g.fillRect(x, wy, 18, wh);
      g.fillStyle = '#f8d8b0'; g.fillRect(x, wy, 18, 3);
      g.fillStyle = OUTLINE; g.fillRect(x + 8, wy, 2, wh); g.fillRect(x, wy + (wh >> 1), 18, 1);
      if (rng() > 0.5) { g.fillStyle = S.innerD; g.fillRect(x + 11, wy + 2, 6, 5); }
    }
    // lamp / picture props
    if (rng() > 0.4) { const px = x0 + 40 + rng() * (x1 - x0 - 80); g.fillStyle = OUTLINE; g.fillRect(px - 1, yA + 5, 12, 10); g.fillStyle = pick(['#a04040', '#406090', '#5a8a3a']); g.fillRect(px, yA + 6, 10, 8); }
  }
  // side pillars and top wall with jagged damage
  g.fillStyle = S.wall; g.fillRect(x0, top, 8, GY - top); g.fillRect(x1 - 8, top, 8, GY - top);
  g.fillStyle = S.wallD; g.fillRect(x0 + 6, top, 2, GY - top); g.fillRect(x1 - 8, top, 2, GY - top);
  g.fillStyle = OUTLINE; g.fillRect(x0 - 1, top, 1, GY - top); g.fillRect(x1, top, 1, GY - top);
  g.fillStyle = S.wall;
  for (let x = x0; x < x1; x += 4) {
    const h = 6 + Math.floor(vnoise(x * 0.07 + d.x0) * 14);
    g.fillStyle = OUTLINE; g.fillRect(x, top - h - 1, 4, h + 1);
    g.fillStyle = S.wall; g.fillRect(x, top - h, 4, h + 6);
  }
  g.fillStyle = S.trim; g.fillRect(x0, top + 4, x1 - x0, 2);
  // damage holes
  for (let i = 0; i < 3; i++) {
    const hx = x0 + 12 + rng() * (x1 - x0 - 30), hy = top + 20 + rng() * (GY - top - 50), r = 4 + rng() * 6;
    g.fillStyle = OUTLINE; g.beginPath(); g.arc(hx, hy, r + 1, 0, TAU); g.fill();
    g.fillStyle = '#2a1e1a'; g.beginPath(); g.arc(hx, hy, r, 0, TAU); g.fill();
  }
}
function drawBunkerFront(g, d) { }
function drawPalm(g, x, y, rng) {
  const h = 60 + rng() * 30, lean = (rng() - 0.5) * 20;
  for (let i = 0; i < h; i += 2) {
    const k = i / h, px = x + lean * k * k;
    g.fillStyle = OUTLINE; g.fillRect(px - 3, y - i - 2, 7, 3);
    g.fillStyle = i % 6 < 3 ? '#8a6a3a' : '#a07a44'; g.fillRect(px - 2, y - i - 2, 5, 2);
  }
  const tx = x + lean, ty = y - h;
  for (let f = 0; f < 6; f++) {
    const a = -PI / 2 + (f - 2.5) * 0.55, len = 22 + rng() * 8;
    for (let i = 0; i < len; i++) {
      const k = i / len, fx = tx + Math.cos(a) * i * 1.1, fy = ty + Math.sin(a) * i * 0.6 + k * k * 18;
      g.fillStyle = OUTLINE; g.fillRect(fx - 1, fy - 1, 4, 4);
    }
    for (let i = 0; i < len; i++) {
      const k = i / len, fx = tx + Math.cos(a) * i * 1.1, fy = ty + Math.sin(a) * i * 0.6 + k * k * 18;
      g.fillStyle = k < 0.5 ? '#4a9a3a' : '#3a7a2a'; g.fillRect(fx, fy, 2, 2);
    }
  }
  g.fillStyle = '#6a4a22'; g.fillRect(tx - 3, ty, 3, 3); g.fillRect(tx + 1, ty + 1, 3, 3);
}

// ---------------------------------------------------------------------
//  PARALLAX BACKGROUNDS
// ---------------------------------------------------------------------
const SKY = [['#3f8fd8', '#9fd0f0', '#ffe2a0'], ['#4a5688', '#b07a90', '#f0a870'], ['#150c1c', '#2a1830', '#3e2436'], ['#240814', '#6a1a28', '#d8502a']];
const BG_LAYERS = [];
function zoneBlend(cx) {
  // returns [zoneA, zoneB, t]
  for (let i = 1; i < 4; i++) {
    const b = ZONE_X[i];
    if (cx < b - 200) return [i - 1, i - 1, 0];
    if (cx < b + 200) return [i - 1, i, clamp((cx - (b - 200)) / 400, 0, 1)];
  }
  return [3, 3, 0];
}
function buildBackgrounds() {
  const levelW = LW * TS;
  BG_LAYERS.length = 0;
  const specs = [{ f: 0.1, fn: bgFar }, { f: 0.3, fn: bgMid }, { f: 0.55, fn: bgNear }];
  for (const s of specs) {
    const w = Math.ceil((levelW - W) * s.f) + W + 2;
    const c = makeCanvas(w, H);
    s.fn(c.getContext('2d'), w, s.f);
    BG_LAYERS.push({ c, f: s.f });
  }
}
function stripZone(sx, f) { return zoneAt(sx / f); }
function bgFar(g, w, f) {
  const cols = ['#d8a888', '#9a7aa0', '#2c1c30', '#6a2434'], cols2 = ['#c89478', '#7a6490', '#221426', '#4e1a28'];
  for (let sx = 0; sx < w; sx++) {
    const wx = sx / f, [a, b, t] = zoneBlend(wx);
    const h = 55 + vnoise(sx * 0.02) * 50 + vnoise(sx * 0.07) * 14;
    const h2 = 30 + vnoise(sx * 0.03 + 50) * 40;
    g.fillStyle = mixHex(cols[a], cols[b], t); g.fillRect(sx, 200 - h, 1, h + 70);
    g.fillStyle = mixHex(cols2[a], cols2[b], t); g.fillRect(sx, 215 - h2, 1, h2 + 60);
  }
}
function bgMid(g, w, f) {
  const rng = mulberry(99);
  let sx = 0;
  while (sx < w) {
    const z = stripZone(sx, f);
    if (z === 0) { // mesas
      const mw = 60 + rng() * 90, mh = 40 + rng() * 50;
      g.fillStyle = '#b8805a'; g.fillRect(sx, 210 - mh, mw, mh + 60);
      g.fillStyle = '#d8a070'; g.fillRect(sx, 210 - mh, mw, 4);
      g.fillStyle = '#9a6848'; for (let y = 210 - mh + 10; y < 210; y += 9) g.fillRect(sx, y, mw, 2);
      g.fillStyle = '#a07050'; g.fillRect(sx - 8, 210 - mh * 0.4, 8, mh); g.fillRect(sx + mw, 210 - mh * 0.5, 10, mh);
      sx += mw + 30 + rng() * 80;
    } else if (z === 1) { // skyline
      const bw = 24 + rng() * 40, bh = 40 + rng() * 70;
      g.fillStyle = '#7a5a6a'; g.fillRect(sx, 215 - bh, bw, bh + 60);
      if (rng() > 0.6) { g.beginPath(); g.fillStyle = '#7a5a6a'; g.arc(sx + bw / 2, 215 - bh, bw / 2.4, PI, 0); g.fill(); }
      if (rng() > 0.8) { g.fillRect(sx + bw / 2 - 3, 215 - bh - 40, 6, 40); g.fillRect(sx + bw / 2 - 5, 215 - bh - 44, 10, 5); }
      g.fillStyle = '#5a3e4e';
      for (let y = 215 - bh + 8; y < 205; y += 12) for (let x = sx + 4; x < sx + bw - 6; x += 9) if (rng() > 0.3) g.fillRect(x, y, 4, 6);
      g.fillStyle = '#6a4a5a';
      const nb = (rng() * 4) | 0;
      for (let i = 0; i < nb; i++) g.fillRect(sx + rng() * bw, 215 - bh - 6 + rng() * 6, 6, 6);
      sx += bw + rng() * 12;
    } else if (z === 2) { // crags
      const cw = 20 + rng() * 40, ch = 60 + rng() * 120;
      g.fillStyle = '#2a1a2a';
      for (let i = 0; i < cw; i++) { const k = Math.abs(i / cw - 0.5) * 2; g.fillRect(sx + i, 230 - ch * (1 - k * k), 1, ch); }
      for (let i = 0; i < cw; i++) { const k = Math.abs(i / cw - 0.5) * 2; g.fillRect(sx + i, 0, 1, 40 + ch * 0.4 * (1 - k)); }
      sx += cw * 0.7 + rng() * 20;
    } else { // fortress towers
      const tw = 40 + rng() * 30, th = 80 + rng() * 60;
      g.fillStyle = '#3a1a24'; g.fillRect(sx, 220 - th, tw, th + 50);
      for (let i = 0; i < tw; i += 8) g.fillRect(sx + i, 214 - th, 5, 6);
      g.fillStyle = '#ff6030';
      for (let y = 230 - th; y < 200; y += 18) if (rng() > 0.4) g.fillRect(sx + tw / 2 - 2, y, 4, 6);
      sx += tw + 20 + rng() * 40;
    }
  }
  // distant smoke columns
  for (let i = 0; i < 14; i++) {
    const x = rng() * w;
    if (stripZone(x, f) === 2) continue;
    for (let k = 0; k < 12; k++) { g.fillStyle = `rgba(70,58,68,${0.1 - k * 0.007})`; g.beginPath(); g.arc(x + k * 5, 185 - k * 9, 5 + k * 1.3, 0, TAU); g.fill(); }
  }
}
function bgNear(g, w, f) {
  const rng = mulberry(4242);
  let sx = 0;
  while (sx < w) {
    const z = stripZone(sx, f);
    if (z === 0) {
      const dw = 120 + rng() * 120, dh = 18 + rng() * 22;
      g.fillStyle = '#c8945c';
      for (let i = 0; i < dw; i++) { const k = Math.sin(i / dw * PI); g.fillRect(sx + i, 225 - dh * k, 1, dh * k + 50); }
      g.fillStyle = '#e0b078';
      for (let i = 0; i < dw; i++) { const k = Math.sin(i / dw * PI); if (i < dw * 0.5) g.fillRect(sx + i, 225 - dh * k, 1, 2); }
      if (rng() > 0.55) { // wrecked tank silhouette
        const tx = sx + dw * 0.4, ty = 222 - dh * 0.8;
        g.fillStyle = '#6a4a3a'; g.fillRect(tx, ty, 44, 12); g.fillRect(tx + 8, ty - 9, 22, 9); g.fillRect(tx + 28, ty - 6, 26, 3);
        g.fillStyle = '#4a3228'; g.fillRect(tx - 2, ty + 10, 48, 6);
      }
      sx += dw * 0.8;
    } else if (z === 1) {
      const bw = 50 + rng() * 60, bh = 50 + rng() * 60;
      g.fillStyle = '#8a6a64'; g.fillRect(sx, 225 - bh, bw, bh + 50);
      g.fillStyle = '#6a4e4c';
      for (let x = sx; x < sx + bw; x += 3) { const hh = vnoise(x * 0.1) * 16; g.fillRect(x, 225 - bh - 1, 3, hh); }
      g.fillStyle = '#3a2a30';
      for (let y = 225 - bh + 14; y < 210; y += 22) for (let x = sx + 8; x < sx + bw - 14; x += 18) g.fillRect(x, y, 9, 12);
      g.fillStyle = '#a07a70'; g.fillRect(sx, 225 - bh + 4, 2, bh);
      sx += bw + 20 + rng() * 60;
    } else if (z === 2) {
      const cw = 30 + rng() * 30;
      g.fillStyle = '#3e2634';
      for (let i = 0; i < cw; i++) { const k = Math.abs(i / cw - 0.5) * 2; g.fillRect(sx + i, 0, 1, 70 + 40 * (1 - k * k) + vnoise(sx + i) * 20); g.fillRect(sx + i, 150 + 50 * k * k, 1, 120); }
      g.fillStyle = '#4e3242'; g.fillRect(sx + cw * 0.3, 0, 3, 90);
      sx += cw + 10 + rng() * 50;
    } else {
      const ww = 200;
      g.fillStyle = '#4a2a32'; g.fillRect(sx, 110, ww, 160);
      g.fillStyle = '#3a1e26'; for (let y = 118; y < 270; y += 12) g.fillRect(sx, y, ww, 2);
      for (let x = sx; x < sx + ww; x += 14) { g.fillStyle = '#4a2a32'; g.fillRect(x, 100, 9, 10); }
      g.fillStyle = '#6a3a3a'; g.fillRect(sx + 60, 130, 80, 100);
      g.fillStyle = '#2a1016'; g.fillRect(sx + 66, 136, 68, 94);
      g.fillStyle = '#8a4a3a'; for (let x = sx + 70; x < sx + 132; x += 10) g.fillRect(x, 136, 3, 94);
      g.fillStyle = '#e8c030'; g.fillRect(sx + 88, 116, 24, 10); g.fillStyle = '#2a1016'; g.fillRect(sx + 96, 118, 8, 6);
      sx += ww + 40;
    }
  }
}
function drawSky(camx) {
  const [a, b, t] = zoneBlend(camx + W / 2);
  const bands = 18;
  for (let i = 0; i < bands; i++) {
    const k = i / (bands - 1);
    const A = SKY[a], B = SKY[b];
    const ca = k < 0.5 ? mixHex(A[0], A[1], k * 2) : mixHex(A[1], A[2], (k - 0.5) * 2);
    const cb = k < 0.5 ? mixHex(B[0], B[1], k * 2) : mixHex(B[1], B[2], (k - 0.5) * 2);
    ctx.fillStyle = t > 0 ? mixHex(ca, cb, t) : ca;
    ctx.fillRect(0, Math.floor(i * H / bands), W, Math.ceil(H / bands) + 1);
  }
  // sun / moon
  const sunA = a === 0 ? 1 - t : a === 3 || b === 3 ? (a === 3 ? 1 : t) : 0;
  if (a === 0 || b === 0) {
    ctx.globalAlpha = a === 0 ? 1 - t : t;
    const sx = 380 - camx * 0.02;
    dcirc(sx, 60, 30, '#fff4c0'); dcirc(sx, 60, 24, '#fffbe8');
    ctx.globalAlpha = 1;
  }
  if (a === 3 || b === 3) {
    ctx.globalAlpha = a === 3 ? 1 : t;
    dcirc(360, 70, 34, '#ff7040'); dcirc(360, 70, 28, '#ffa050');
    ctx.globalAlpha = 1;
  }
  if (a === 1 || b === 1) {
    ctx.globalAlpha = (a === 1 ? 1 - t : t) * 0.9;
    dcirc(120 - (camx % 2000) * 0.01, 150, 22, '#ffc080');
    ctx.globalAlpha = 1;
  }
  void sunA;
}
function drawBackgrounds(camx) {
  drawSky(camx);
  drawBirds(camx);
  for (const L of BG_LAYERS) {
    const sx = Math.round(camx * L.f);
    ctx.drawImage(L.c, sx, 0, W, H, 0, 0, W, H);
  }
}
// ambient birds (sky) and bats (canyon)
const BIRDS = [];
function updateBirds(camx) {
  const z = zoneAt(camx + W / 2);
  if (BIRDS.length < 6 && chance(z === 2 ? 0.01 : 0.006)) {
    const n = rndi(2, 5), y = rnd(30, 110), dir = chance(0.7) ? -1 : 1;
    for (let i = 0; i < n; i++) BIRDS.push({ x: dir < 0 ? W + 20 + i * 14 : -20 - i * 14, y: y + rnd(-10, 10) + i * 4, vx: dir * rnd(0.8, 1.4), ph: rnd(TAU), bat: z === 2 });
  }
  for (const b of BIRDS) {
    b.x += b.vx; b.ph += b.bat ? 0.5 : 0.25; b.y += Math.sin(b.ph * 0.3) * (b.bat ? 0.8 : 0.2);
    if (b.x < -40 || b.x > W + 60) b.remove = true;
  }
  sweep(BIRDS);
}
function drawBirds() {
  for (const b of BIRDS) {
    const up = Math.sin(b.ph) > 0, x = Math.round(b.x), y = Math.round(b.y);
    ctx.fillStyle = b.bat ? '#120a14' : '#2a2030';
    ctx.fillRect(x - 1, y, 3, 2);
    if (up) { ctx.fillRect(x - 4, y - 2, 3, 1); ctx.fillRect(x + 2, y - 2, 3, 1); ctx.fillRect(x - 2, y - 1, 1, 1); ctx.fillRect(x + 2, y - 1, 1, 1); }
    else { ctx.fillRect(x - 4, y + 1, 3, 1); ctx.fillRect(x + 2, y + 1, 3, 1); }
  }
}
function drawFgSilhouettes(camx) {
  const f = 1.3;
  for (const s of LEVEL.fgSil) {
    const x = Math.round(s.x - camx * f);
    if (x < -60 || x > W + 60) continue;
    const z = zoneAt(s.x / f);
    ctx.fillStyle = ['#3a2616', '#2a1e1c', '#140a12', '#1a1216'][z];
    if (z === 0) { // grass tufts & rocks
      for (let i = 0; i < 7; i++) ctx.fillRect(x + i * 3, H - 8 - ((i * 7 + s.v * 10) % 9), 2, 12);
      ctx.fillRect(x - 6, H - 5, 34, 5);
    } else if (z === 1) { // rubble and rebar
      ctx.fillRect(x, H - 10, 40, 10); ctx.fillRect(x + 8, H - 16, 18, 6);
      ctx.fillRect(x + 12, H - 30, 2, 16); ctx.fillRect(x + 20, H - 26, 2, 12); ctx.fillRect(x + 12, H - 30, 6, 2);
    } else if (z === 2) {
      for (let i = 0; i < 16; i++) { const hh = (1 - Math.abs(i - 8) / 8) * (22 + s.v * 20); ctx.fillRect(x + i * 2, H - hh, 2, hh); }
    } else {
      ctx.fillRect(x, H - 14, 36, 14); ctx.fillStyle = '#3a2a1a';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 2 + i * 9, H - 12, 4, 10);
    }
  }
}
// dynamic decor (flags / torches)
function drawDynDecor(x0, x1) {
  for (const d of LEVEL.dyn) {
    if (d.x < x0 - 60 || d.x > x1 + 60) continue;
    if (d.k === 'flag') {
      const x = Math.round(d.x), y = Math.round(d.y);
      ctx.fillStyle = OUTLINE; ctx.fillRect(x - 1, y - 44, 3, 44);
      ctx.fillStyle = '#c8c8c8'; ctx.fillRect(x, y - 44, 1, 44);
      for (let i = 0; i < 18; i++) {
        const o = Math.round(Math.sin(G.t * 0.15 - i * 0.45) * (1 + i * 0.12));
        ctx.fillStyle = OUTLINE; ctx.fillRect(x + 1 + i, y - 44 + o - 1, 1, 13);
        ctx.fillStyle = i % 6 < 3 ? d.col : mixHex(d.col, '#000000', 0.2); ctx.fillRect(x + 1 + i, y - 44 + o, 1, 11);
      }
    } else if (d.k === 'torch') {
      const x = Math.round(d.x), y = Math.round(d.y);
      ctx.globalAlpha = 0.12 + Math.sin(G.t * 0.3) * 0.03;
      dcirc(x, y - 18, 34, '#ff9a40');
      ctx.globalAlpha = 1;
      ctx.fillStyle = OUTLINE; ctx.fillRect(x - 2, y - 14, 5, 14);
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x - 1, y - 14, 3, 14);
      const fl = (G.t >> 2) % 3;
      dcirc(x, y - 18 - fl, 4, '#ff7020'); dcirc(x, y - 17, 2 + (fl % 2), '#ffe070');
      if (G.t % 8 === 0) { const p = part('ember', x + rnd(-2, 2), y - 20, rnd(-0.3, 0.3), rnd(-1, -0.4), 30, 1, '#ffb040'); p.drag = 0.98; }
    }
  }
}
