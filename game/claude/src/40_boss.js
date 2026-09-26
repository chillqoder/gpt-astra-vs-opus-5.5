// =====================================================================
//  BOSS: "IRON SCORPION" — multi-part armored war machine
// =====================================================================
// stepped hull silhouette: front armor, cab, rear deck (local coords, y up = negative)
const BOSS_HULL = [[-4, -86, 40, 0], [40, -112, 180, 0], [180, -84, 208, 0]];
const TAIL_BASE = { x: 175, y: -96 }, TAIL_REST = { x: 130, y: -166 };
function makeBoss() {
  const cx = G.cam.x;
  return {
    x: cx + W + 40, home: cx + 262, y: GY, state: 'intro', t: 0, atk: null, atkT: 0, cd: 80, rot: 0, idx: 0, phase: 1,
    tread: 0, turA: PI + 0.35, vx: 0, targetable: false, tailLift: 0, shutter: 0, flameReach: 0, glow: 0, stingX: 0,
    parts: {
      upper: { name: 'upper', hp: 40, max: 40, alive: true, flash: 0, ax: -6, ay: -95, hb: [-22, -9, 10, 9], score: 3000 },
      lower: { name: 'lower', hp: 40, max: 40, alive: true, flash: 0, ax: -6, ay: -17, hb: [-22, -9, 10, 9], score: 3000 },
      turret: { name: 'turret', hp: 70, max: 70, alive: true, flash: 0, ax: 78, ay: -130, hb: [-42, -22, 32, 22], score: 4000 },
      tail: { name: 'tail', hp: 55, max: 55, alive: true, flash: 0, ax: TAIL_REST.x, ay: TAIL_REST.y, hb: [-20, -14, 20, 14], score: 4000 },
      core: { name: 'core', hp: 110, max: 110, alive: true, flash: 0, ax: 10, ay: -58, r: 12, score: 20000 }
    }
  };
}
function bossTotalHp(b) { let h = 0, m = 0; for (const k in b.parts) { h += Math.max(0, b.parts[k].hp); m += b.parts[k].max; } return [h, m]; }
function partRect(b, p) { return [b.x + p.ax + p.hb[0], GY + p.ay + p.hb[1], b.x + p.ax + p.hb[2], GY + p.ay + p.hb[3]]; }
function inRect(x, y, r, pad) { pad = pad || 0; return x >= r[0] - pad && x <= r[2] + pad && y >= r[1] - pad && y <= r[3] + pad; }
function coreHit(b, x, y, pad) { const c = b.parts.core; return c.alive && b.shutter >= 1 && Math.hypot(x - (b.x + c.ax), y - (GY + c.ay)) < c.r + (pad || 0); }
function inHull(b, x, y) {
  const lx = x - b.x, ly = y - GY;
  for (const r of BOSS_HULL) if (lx >= r[0] && lx <= r[2] && ly >= r[1] && ly <= r[3]) return true;
  return false;
}
function damagePart(b, p, dmg) {
  if (!p.alive || !b.targetable) return;
  if (p.name === 'core' && b.shutter < 1) return;
  p.hp -= dmg; p.flash = 3;
  if (G.t % 3 === 0) Snd.play('hit');
  if (p.hp <= 0) destroyPart(b, p);
}
function destroyPart(b, p) {
  p.alive = false; p.hp = 0;
  const x = b.x + p.ax, y = GY + p.ay;
  addScore(p.score, x, y - 20, '#ffe040');
  if (p.name === 'core') { startBossDeath(b); return; }
  explodeAt(x, y, 40, 0, 'p');
  hitStop(8); shake(12); screenFlash(3, '#fff4c0');
  G.fx.push({ kind: 'custom', part: p.name, x, y, vx: rnd(0.5, 2), vy: -4, rot: 0, t: 0, max: 999, update: updateFallingPart, draw: drawFallingPart });
  showMsg(p.name === 'turret' ? 'CANNON DESTROYED!' : p.name === 'tail' ? 'STINGER DESTROYED!' : 'GUN POD DESTROYED!', { scale: 2, life: 70, y: 150, color: GRAD_GOLD });
  Snd.play('roar');
  if (b.atk && ((b.atk === 'cannon' && p.name === 'turret') || ((b.atk === 'missiles' || b.atk === 'sting') && p.name === 'tail'))) endAttack(b);
  const P = b.parts;
  if (!P.upper.alive && !P.lower.alive && !P.turret.alive && !P.tail.alive) {
    b.phase = 3; b.atk = null; b.state = 'rage'; b.t = 0; b.targetable = false;
  } else if (destroyedCount(b) >= 2) b.phase = 2;
}
function destroyedCount(b) { let n = 0; for (const k of ['upper', 'lower', 'turret', 'tail']) if (!b.parts[k].alive) n++; return n; }
function updateFallingPart(f) {
  f.t++; f.vy += 0.3; f.x += f.vx; f.y += f.vy;
  if (f.t % 5 === 0) f.rot = (f.rot + 1) % 4;
  if (f.t % 2 === 0) smoke(f.x, f.y, 1, 1);
  if (f.y > GY - 6) { f.remove = true; explodeAt(f.x, GY - 10, 30, 0, 'p'); debris(f.x, GY - 10, 12, ['#5a5e6a', '#7a2e2a', '#3a3640'], 1.4); }
}
function drawFallingPart(f) { drawBossPart(f.part, f.x, f.y, f.rot, '#3a2a28'); }

// shared queries used by player projectiles
function bossShotHit(s) {
  const b = G.boss;
  if (!b || b.state === 'dead' || b.gone) return false;
  for (const k in b.parts) {
    const p = b.parts[k];
    if (!p.alive || k === 'core') continue;
    if (inRect(s.x, s.y, partRect(b, p), s.r)) {
      if (s.kind === 'rocket' || s.kind === 'cshell') { damagePart(b, p, s.kind === 'cshell' ? 8 : 5); explodeAt(s.x, s.y, 26, 0, 'p'); }
      else damagePart(b, p, s.dmg);
      if (s.kind !== 'flame') part('star', s.x, s.y, 0, 0, 6, 3, '#fff');
      if (s.pierce) return false;
      return true;
    }
  }
  if (coreHit(b, s.x, s.y, s.r)) {
    damagePart(b, b.parts.core, s.kind === 'rocket' ? 5 : s.kind === 'cshell' ? 8 : s.dmg);
    if (s.kind === 'rocket' || s.kind === 'cshell') explodeAt(s.x, s.y, 26, 0, 'p');
    return !s.pierce;
  }
  if (inHull(b, s.x, s.y)) {
    if (s.kind === 'rocket' || s.kind === 'cshell') explodeAt(s.x, s.y, 26, 0, 'p');
    else if (s.kind !== 'flame') { sparks(s.x, s.y, 2, '#ffe0a0'); if (G.t % 4 === 0) Snd.play('clank'); }
    return !s.pierce;
  }
  return false;
}
function bossPointHit(x, y) { const b = G.boss; return b && !b.gone && b.state !== 'dead' && inHull(b, x, y + 2); }
function bossBlastHit(x, y, r, dmg) {
  const b = G.boss;
  if (!b || b.gone || !dmg) return;
  for (const k in b.parts) {
    const p = b.parts[k];
    if (!p.alive) continue;
    if (k === 'core') { if (Math.hypot(x - (b.x + p.ax), y - (GY + p.ay)) < r + p.r) damagePart(b, p, dmg); continue; }
    const R = partRect(b, p);
    const nx = clamp(x, R[0], R[2]), ny = clamp(y, R[1], R[3]);
    if (Math.hypot(nx - x, ny - y) < r) damagePart(b, p, dmg);
  }
}
function bossBeamHit(x0, y0, x1, y1, dmg) {
  const b = G.boss;
  if (!b || b.gone) return;
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4);
  const hit = {};
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    for (const k in b.parts) {
      const p = b.parts[k];
      if (!p.alive || hit[k]) continue;
      if (k === 'core' ? coreHit(b, x, y, 2) : inRect(x, y, partRect(b, p), 2)) { hit[k] = 1; damagePart(b, p, dmg); }
    }
  }
}
// the laser stops at the hull
function bossBeamStop(x, y) { const b = G.boss; return b && !b.gone && b.state !== 'dead' && inHull(b, x, y); }
function bossAimPoint() {
  const b = G.boss;
  if (!b) return null;
  let best = null;
  for (const k of ['lower', 'upper', 'turret', 'tail', 'core']) {
    const p = b.parts[k];
    if (!p.alive || (k === 'core' && b.shutter < 1)) continue;
    best = { x: b.x + p.ax, y: GY + p.ay }; break;
  }
  return best;
}

function startBossFight() {
  G.boss = makeBoss();
  G.bossActive = true;
  G.cam.lock = ZONE_X[3];
  Music.stop();
  Snd.play('alarm');
  showMsg('WARNING!!', { sub: 'IRON SCORPION APPROACHING', color: GRAD_RED, scale: 4, life: 200, y: 80, subColor: '#ff8080' });
}
function startBossDeath(b) {
  b.state = 'dying'; b.t = 0; b.atk = null; b.targetable = false;
  G.eShots.length = 0;
  for (const e of G.enemies) if (!e.dead && e.type === 'drone') killEnemy(e, { kind: 'blast', x: e.x });
  Music.stop();
  hitStop(20); screenFlash(8, '#ffffff'); shake(16);
  Snd.play('roar');
}
function endAttack(b) { b.atk = null; b.atkT = 0; b.cd = Math.round((b.phase === 1 ? 70 : b.phase === 2 ? 55 : 45) * (G.cdMul || 1)); }

function updateBoss(b) {
  b.t++;
  for (const k in b.parts) if (b.parts[k].flash > 0) b.parts[k].flash--;
  const p = G.player, tgt = pTarget(), alive = targetAlive();
  const P = b.parts;
  switch (b.state) {
    case 'intro':
      b.x = approach(b.x, b.home, 1.1);
      b.tread -= 1.1;
      shake(2);
      if (G.t % 3 === 0) dust(b.x + rnd(10, 200), GY, 2, '#9a9aa4', 1.5);
      if (G.t % 18 === 0) Snd.play('engine');
      if (b.x <= b.home) { b.state = 'roar'; b.t = 0; Snd.play('roar'); shake(14); screenFlash(4, '#ff6040'); }
      break;
    case 'roar':
      b.glow = Math.sin(b.t * 0.3) * 0.5 + 0.5;
      if (b.t % 4 === 0) smoke(b.x + 155, GY - 146, 1, 1.2);
      if (b.t > 80) { b.state = 'fight'; b.t = 0; b.targetable = true; Music.play('boss'); showMsg('DESTROY IT!', { sub: 'AIM UP AT ITS WEAPONS - JUMP THE LOW FIRE', scale: 3, life: 110, y: 110 }); }
      break;
    case 'rage':
      b.shutter = Math.min(1, b.t / 60);
      if (b.t === 1) { Snd.play('roar'); screenFlash(6, '#ff3020'); shake(14); showMsg('CORE EXPOSED!', { sub: 'AIM FOR THE REACTOR!', color: GRAD_RED, scale: 3, life: 110, y: 90 }); }
      if (b.t % 5 === 0) sparks(b.x + rnd(0, 200), GY - rnd(20, 120), 3);
      if (b.t > 100) { b.state = 'fight'; b.t = 0; b.targetable = true; b.cd = 30; }
      break;
    case 'fight': {
      if (!b.atk || b.atk === 'guns' || b.atk === 'cannon' || b.atk === 'missiles' || b.atk === 'drones' || b.atk === 'burst') {
        if (!b.atk && P.tail.alive) { P.tail.ax = approach(P.tail.ax, TAIL_REST.x, 3); P.tail.ay = approach(P.tail.ay, TAIL_REST.y - b.tailLift * 10, 3); }
        const want = b.home + Math.sin(b.t * 0.012) * 26;
        const nx = approach(b.x, want, 0.35);
        b.tread += (nx - b.x) * 1.2; b.x = nx;
      }
      if (!b.atk) { if (--b.cd <= 0) chooseBossAttack(b); }
      else runBossAttack(b, tgt, alive);
      break;
    }
    case 'dying':
      if (b.t % 6 === 0 && b.t < 190) {
        spawnBoom(b.x + rnd(0, 200), GY - rnd(10, 150), rnd(16, 34));
        if (chance(0.3)) debris(b.x + rnd(0, 200), GY - rnd(20, 120), 5, ['#7a2e2a', '#5a5e6a', '#3a3640'], 1.5);
      }
      if (b.t % 3 === 0) sparks(b.x + rnd(0, 200), GY - rnd(10, 150), 3);
      shake(5);
      if (b.t === 190) {
        spawnBoom(b.x + 100, GY - 70, 80); spawnBoom(b.x + 40, GY - 40, 50); spawnBoom(b.x + 160, GY - 100, 50);
        screenFlash(14, '#ffffff'); shake(18); hitStop(10);
        debris(b.x + 100, GY - 70, 40, ['#7a2e2a', '#5a5e6a', '#3a3640', '#e8c030'], 2.2);
        b.gone = true;
      }
      if (b.gone && b.t % 4 === 0) { fireBurst(b.x + rnd(10, 200), GY - rnd(0, 30), 1, 6); smoke(b.x + rnd(10, 200), GY - rnd(10, 40), 1, 1.5); }
      if (b.t === 260) startEndSequence();
      break;
  }
  // damage smoke & sparks from broken sockets
  if (b.state !== 'intro' && !b.gone) {
    for (const k of ['upper', 'lower', 'turret', 'tail']) {
      const q = P[k];
      if (!q.alive) { if (G.t % 9 === 0) smoke(b.x + q.ax, GY + q.ay, 1, 1); if (G.t % 13 === 0) sparks(b.x + q.ax, GY + q.ay, 2); }
      else if (q.hp < q.max * 0.5 && G.t % 14 === 0) smoke(b.x + q.ax, GY + q.ay - 4, 1, 0.7);
    }
    if (G.t % 30 === 0) smoke(b.x + 155, GY - 148, 1, 1);
  }
  // keep player and tank in front of the machine
  if (!b.gone) {
    const wall = b.x - 10;
    const t = G.tank;
    if (t && t.x > wall - 18) { t.x = wall - 18; t.vx = Math.min(t.vx, 0); }
    if (p.state !== 'tank' && p.x > wall - 4) { p.x = wall - 4; p.vx = Math.min(p.vx, 0); }
    if (b.atk === 'ram' && b.vx < -1 && alive && tgt.x > b.x - tgt.w / 2 - 16) hurtPlayer({ x: b.x + 40 }, 1);
  }
}
function chooseBossAttack(b) {
  const P = b.parts;
  let pool;
  if (b.phase === 3) pool = ['burst', 'ram', 'flame'];
  else {
    pool = [];
    if (P.lower.alive || P.upper.alive) pool.push('guns');
    if (P.turret.alive) pool.push('cannon');
    if (P.tail.alive) pool.push('sting', 'missiles');
    if (b.phase === 2 && G.enemies.filter(e => e.type === 'drone' && !e.dead).length < 2) pool.push('drones');
    if (!pool.length) pool.push('guns');
  }
  b.atk = pool[b.idx++ % pool.length];
  b.atkT = 0;
}
function runBossAttack(b, tgt, alive) {
  const P = b.parts, t = ++b.atkT, fast = b.phase >= 2 ? 0.8 : 1;
  switch (b.atk) {
    case 'guns': {
      // low stream (jump over) then aimed spread from the upper pod (dodge)
      if (P.lower.alive && t >= 30 && t < 90 && t % 6 === 0) {
        const x = b.x - 24, y = GY - 16;
        G.eShots.push({ kind: 'eb', x, y, vx: -3.4, vy: 0, life: 200, r: 3 });
        muzzle(x, y, PI, 6); Snd.play('mg');
      }
      if (P.upper.alive && t >= 110 && t <= 170 && t % Math.round(20 * fast) === 0 && alive) {
        const x = b.x - 24, y = GY - 95;
        const a = Math.atan2(tgt.y - tgt.h / 2 - y, tgt.x - x);
        for (let i = -1; i <= 1; i++) G.eShots.push({ kind: 'ebb', x, y, vx: Math.cos(a + i * 0.22) * 2.3, vy: Math.sin(a + i * 0.22) * 2.3, life: 300, r: 4 });
        muzzle(x, y, a, 7, '#ffc0e0', '#ff40a0'); Snd.play('spread');
      }
      if (!P.lower.alive && t > 30 && t < 100) b.atkT = 100;
      if (t > 185 || (!P.upper.alive && t > 95)) endAttack(b);
      break;
    }
    case 'cannon': {
      const pv = { x: b.x + 54, y: GY - 136 };
      const want = Math.atan2(tgt.y - 40 - pv.y, tgt.x - pv.x);
      b.turA = approach(b.turA, clamp(want, PI * 0.75, PI * 1.25), 0.03);
      for (let i = 0; i < 3; i++) {
        if (t === 40 + i * Math.round(22 * fast) && alive) {
          const mx = pv.x + Math.cos(b.turA) * 44, my = pv.y + Math.sin(b.turA) * 44;
          const tx = clamp(tgt.x + (i - 1) * 46, G.cam.x + 12, b.x - 30), T = 58, g = 0.15;
          const ty = findFloorY(tx, 40) - 2;
          G.eShots.push({ kind: 'bshell', x: mx, y: my, vx: (tx - mx) / T, vy: (ty - my - 0.5 * g * T * T) / T, g, tx, ty, life: 200, r: 4 });
          muzzle(mx, my, b.turA, 10); Snd.play('cannon'); shake(5); smoke(mx, my, 3, 1.2);
        }
      }
      if (t > 150) endAttack(b);
      break;
    }
    case 'missiles':
      b.tailLift = Math.min(1, t / 20);
      if (t >= 24 && t <= 24 + 4 * 9 && (t - 24) % 9 === 0 && alive) {
        const i = (t - 24) / 9;
        const tx = i === 0 ? tgt.x : clamp(G.cam.x + 30 + rnd(0, b.x - G.cam.x - 70), G.cam.x + 16, b.x - 30);
        const hx = b.x + P.tail.ax, hy = GY + P.tail.ay - 12;
        G.eShots.push({ kind: 'missile', x: hx, y: hy, vx: 0, vy: -5, phase: 'up', tx, delay: 26 + i * 16, t: 0, life: 400, r: 4 });
        Snd.play('rocket'); smoke(hx, hy, 2);
      }
      if (t > 160) { b.tailLift = 0; endAttack(b); }
      break;
    case 'sting': {
      // scorpion strike: raise + telegraph, slam the stinger down, get stuck (vulnerable), retract
      const q = P.tail;
      if (t === 1) { b.stingX = clamp(tgt.x, G.cam.x + 30, b.x - 50) - b.x; Snd.play('alert'); }
      if (t < 42) {
        q.ax = approach(q.ax, 150, 2); q.ay = approach(q.ay, -196, 2);
        q.ax += (t >> 1) % 2 ? 1 : -1;
        if (t === 20) floatText(b.x + b.stingX, GY - 40, '!!', '#ff4040', 2, 24);
      } else if (t < 52) {
        const k = (t - 41) / 10;
        q.ax = lerp(150, b.stingX, k * k); q.ay = lerp(-196, -14, k * k);
        if (alive && Math.abs(tgt.x - (b.x + q.ax)) < 18 && Math.abs((tgt.y - tgt.h / 2) - (GY + q.ay)) < 22) hurtPlayer({ x: b.x + q.ax }, 1);
      } else if (t === 52) {
        q.ax = b.stingX; q.ay = -14;
        shake(9); Snd.play('explosion', 0.4); dust(b.x + q.ax, GY, 12, '#9a9aa4', 2.5); debris(b.x + q.ax, GY - 4, 6, ['#5a5e6a', '#40404a'], 1);
        if (alive && Math.abs(tgt.x - (b.x + q.ax)) < 26 && tgt.y > GY - 44) hurtPlayer({ x: b.x + q.ax }, 1);
        floatText(b.x + q.ax, GY - 50, 'STUCK!', '#80ff80', 1, 60);
      } else if (t < 140) {
        if (t % 6 === 0) sparks(b.x + q.ax, GY + q.ay - 6, 2);
        q.ax += (t >> 2) % 2 ? 0.5 : -0.5;
      } else if (t < 175) {
        q.ax = approach(q.ax, TAIL_REST.x, 7); q.ay = approach(q.ay, TAIL_REST.y, 6);
      } else endAttack(b);
      break;
    }
    case 'drones':
      if (t === 10 || t === 40) {
        const d = mkEnemy('drone', b.x + 100, GY - 130, { active: true, state: 'hover', seed: rnd(TAU), score: 100 });
        d.vy = -2; G.enemies.push(d); Snd.play('beep');
      }
      if (t > 70) endAttack(b);
      break;
    case 'burst':
      if (t < 40) b.glow = t / 40;
      if ((t === 40 || t === 72 || t === 104) && alive) {
        const cx = b.x + P.core.ax, cy = GY + P.core.ay, off = t * 0.05;
        for (let i = 0; i < 12; i++) {
          const a = PI * 0.5 + (i / 12) * PI + off;
          G.eShots.push({ kind: 'ebb', x: cx, y: cy, vx: Math.cos(a) * 1.9, vy: Math.sin(a) * 1.9, life: 300, r: 4 });
        }
        Snd.play('spread'); screenFlash(2, '#ff8060');
      }
      if (t > 130) { b.glow = 0; endAttack(b); }
      break;
    case 'ram':
      if (t < 50) {
        b.tread -= 3; if (t % 3 === 0) smoke(b.x + 190, GY - 20, 1, 1); if (t % 10 === 0) Snd.play('engine');
        shake(1.5);
        if (t === 1) floatText(b.x + 60, GY - 150, 'RRRRRR!', '#ff6040', 2, 50);
      } else if (!b.rammed) {
        b.vx = approach(b.vx, -3.6, 0.2); b.x += b.vx; b.tread += b.vx * 1.2;
        if (G.t % 3 === 0) dust(b.x + 20, GY, 3, '#9a9aa4', 2);
        if (b.x <= G.cam.x + 125) { b.rammed = true; b.vx = 0; shake(10); Snd.play('explosion', 0.5); dust(b.x, GY, 12, '#9a9aa4', 2.5); b.holdT = 0; }
      } else {
        if (++b.holdT > 34) {
          b.x = approach(b.x, b.home, 1.6); b.tread += 1.6;
          if (b.x >= b.home) { b.rammed = false; endAttack(b); }
        }
      }
      break;
    case 'flame': {
      if (t < 34) { b.glow = t / 34; if (t % 4 === 0) sparks(b.x - 4, GY - 20, 1, '#ffb040'); }
      else if (t < 120) {
        b.flameReach = Math.min(170, (t - 34) * 7);
        if (t % 12 === 0) Snd.play('flame');
        for (let i = 0; i < 3; i++) {
          const f = part('fire', b.x - 6 - rnd(0, b.flameReach), GY - rnd(2, 22), rnd(-1.5, 0), rnd(-1.4, -0.2), rndi(12, 24), rnd(3, 6), null); f.drag = 0.95;
        }
        if (alive && tgt.x > b.x - b.flameReach - tgt.w / 2 && tgt.y > GY - 30) hurtPlayer({ x: b.x }, 1);
      } else { b.flameReach = 0; b.glow = 0; endAttack(b); }
      break;
    }
  }
}
function updateBossProjectile(s) {
  const tgt = pTarget(), alive = targetAlive();
  if (s.kind === 'bshell') {
    s.vy += s.g; s.x += s.vx; s.y += s.vy;
    if (G.t % 2 === 0) { const p = part('smoke', s.x, s.y, 0, -0.2, 20, 2, '#7a7078'); p.grow = 0.1; p.alpha = 0.5; }
    if (s.y >= s.ty || (alive && pointInBody(s.x, s.y, tgt, 4)) || s.life-- <= 0) { explodeAt(s.x, Math.min(s.y, s.ty) - 4, 28, 3, 'e'); s.remove = true; }
    return;
  }
  if (s.kind === 'missile') {
    if (s.phase === 'up') { s.y += s.vy; if (G.t % 2 === 0) smoke(s.x, s.y + 6, 1, 0.6); if (s.y < -30) { s.phase = 'wait'; s.t = 0; } }
    else if (s.phase === 'wait') { if (++s.t > s.delay) { s.phase = 'down'; s.x = s.tx; s.y = -20; Snd.play('rocket'); } }
    else {
      s.y += 5.2;
      if (G.t % 2 === 0) { const p = part('fire', s.x, s.y - 8, rnd(-0.3, 0.3), -0.5, 10, 2, null); void p; }
      const fy = findFloorY(s.x, Math.max(0, s.y - 10));
      if (s.y >= fy - 2 || (alive && pointInBody(s.x, s.y, tgt, 4))) { explodeAt(s.x, s.y - 6, 30, 3, 'e'); s.remove = true; }
    }
  }
}
function drawBossProjectile(s) {
  const x = Math.round(s.x), y = Math.round(s.y);
  if (s.kind === 'bshell') {
    dcirc(x, y, 4, OUTLINE); dcirc(x, y, 3, '#5a5a64'); ctx.fillStyle = '#c0c0c8'; ctx.fillRect(x - 1, y - 2, 2, 1);
    drawMarker(s.tx, s.ty + 2, 0.6 + 0.4 * Math.sin(G.t * 0.5));
  } else if (s.kind === 'missile') {
    if (s.phase !== 'wait') {
      const dn = s.phase === 'down' ? 1 : -1;
      ctx.fillStyle = OUTLINE; ctx.fillRect(x - 3, y - 8, 7, 17);
      ctx.fillStyle = '#d8d8e0'; ctx.fillRect(x - 2, y - 7, 5, 15);
      ctx.fillStyle = '#e03020'; ctx.fillRect(x - 2, dn > 0 ? y + 4 : y - 7, 5, 4);
      ctx.fillStyle = '#5a5e6a'; ctx.fillRect(x - 3, dn > 0 ? y - 8 : y + 5, 7, 3);
      dcirc(x, y - dn * 11, 2 + (G.t % 2), '#ffc040');
    }
    if (s.phase !== 'up') drawMarker(s.tx, findFloorY(s.tx, 20), (G.t >> 2) % 2 ? 1 : 0.5);
  }
}
function drawMarker(x, y, a) {
  ctx.globalAlpha = a;
  x = Math.round(x); y = Math.round(y);
  ctx.strokeStyle = '#ff2020'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(x, y - 1, 11, 3, 0, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 14, y - 2, 5, 1); ctx.fillRect(x + 10, y - 2, 5, 1); ctx.fillRect(x, y - 8, 1, 5);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------
//  Boss rendering
// ---------------------------------------------------------------------
function drawBossPart(name, ox, oy, rot, flash) {
  switch (name) {
    case 'upper': case 'lower':
      fr(-10, -8, 20, 16, '#5a5e6a'); fr(-10, -8, 20, 3, '#7a808c'); fr(-10, 5, 20, 3, '#3a3e48');
      fr(-26, -5, 17, 3, '#2a2a30'); fr(-26, 2, 17, 3, '#2a2a30'); fr(-28, -6, 4, 5, '#3a3a40'); fr(-28, 1, 4, 5, '#3a3a40');
      fr(2, -4, 5, 8, '#e8c030');
      break;
    case 'turret':
      fr(-32, -14, 64, 22, '#8a3630'); fr(-32, -14, 64, 4, '#b0503e'); fr(-26, -20, 40, 6, '#6a2824');
      fr(-12, -24, 14, 5, '#5a5e6a'); fr(18, -8, 10, 10, '#e8c030'); fr(20, -6, 6, 6, '#2a2020');
      break;
    case 'tail':
      fr(-18, -12, 36, 24, '#5a5e6a'); fr(-18, -12, 36, 4, '#7a808c');
      for (let i = 0; i < 4; i++) { fr(-15 + i * 8, -6, 6, 6, '#1a1016'); fr(-14 + i * 8, -5, 4, 2, '#e03020'); }
      fr(-18, 8, 36, 4, '#e8c030');
      break;
  }
  fdraw(ox, oy, false, flash, rot, 0);
}
function drawBoss(b) {
  if (b.gone) { drawBossWreck(b); return; }
  const x = Math.round(b.x), y = GY, P = b.parts, T = G.t;
  const dyingFlash = b.state === 'dying' && (T >> 2) % 3 === 0 ? '#ffffff' : null;
  const shk = b.state === 'dying' ? rndi(-1, 1) : 0;
  // tail (behind hull)
  if (P.tail.alive) {
    const hx = P.tail.ax, hy = P.tail.ay + 10;
    const cxp = Math.min(215, (TAIL_BASE.x + hx) / 2 + 40), cyp = Math.min(-190, hy - 80);
    for (let i = 0; i <= 9; i++) {
      const k = i / 9, it = 1 - k;
      const sx = it * it * TAIL_BASE.x + 2 * it * k * cxp + k * k * hx, sy = it * it * TAIL_BASE.y + 2 * it * k * cyp + k * k * hy;
      const s = Math.round(16 - k * 6);
      fr(sx - s / 2, sy - s / 2, s, s, i % 2 ? '#6a2824' : '#8a3630'); fr(sx - s / 2, sy - s / 2, s, 2, '#b0503e');
    }
    fdraw(x + shk, y, false, dyingFlash || (P.tail.flash > 0 ? '#ffffff' : null));
    const fl = dyingFlash || (P.tail.flash > 0 ? '#ffffff' : (b.atk === 'sting' && b.atkT > 52 && b.atkT < 140 && (G.t >> 3) % 2 ? '#ffb0a0' : null));
    drawBossPart('tail', x + P.tail.ax + shk, y + P.tail.ay, b.atk === 'sting' && b.atkT >= 46 && b.atkT < 140 ? 2 : 0, fl);
  }
  // treads
  fr(8, -36, 198, 36, '#262228'); fr(10, -34, 194, 32, '#3a3640');
  for (let i = 0; i < 8; i++) { fwheel(24 + i * 25, -17, 10, '#5c5c66'); fwheel(24 + i * 25, -17, 4, '#8a8a94'); }
  for (let k = 0; k < 17; k++) {
    const lx = 8 + (((k * 12 + b.tread) % 198) + 198) % 198;
    fr(Math.min(lx, 200), -38, 5, 3, '#4a4650'); fr(Math.min(206 - lx + 8, 200), -2, 5, 2, '#4a4650');
  }
  // lower hull
  fr(0, -82, 208, 48, '#7a2e2a'); fr(0, -82, 208, 4, '#a8463a'); fr(0, -38, 208, 4, '#4e1c1a');
  for (let i = 0; i < 16; i++) fr(12 + i * 12, -47, 6, 6, i % 2 ? '#e8c030' : '#2a2020');
  for (let i = 0; i < 12; i++) fr(30 + i * 15, -74, 2, 2, '#c86a4a');
  fr(-4, -86, 28, 52, '#5a1e1c'); fr(-4, -86, 28, 3, '#8a3630');
  // cab
  fr(28, -124, 152, 44, '#8a3630'); fr(28, -124, 152, 4, '#b0503e'); fr(28, -84, 152, 3, '#5a1e1c');
  fr(40, -114, 54, 8, '#1a1016');
  const eye = b.state === 'roar' || b.state === 'rage' ? ((T >> 2) % 2 ? '#ffffff' : '#ff3020') : '#ff3020';
  fr(44, -113, 12, 5, eye); fr(70, -113, 12, 5, eye); fr(44, -113, 12, 1, '#1a1016'); fr(70, -109, 12, 1, '#1a1016');
  fr(116, -114, 16, 12, '#e8e0d0'); fr(118, -111, 4, 4, '#1a1016'); fr(126, -111, 4, 4, '#1a1016'); fr(118, -104, 12, 4, '#e8e0d0'); fr(120, -103, 1, 3, '#1a1016'); fr(124, -103, 1, 3, '#1a1016'); fr(128, -103, 1, 3, '#1a1016');
  fr(150, -148, 11, 28, '#3a3036'); fr(148, -150, 15, 4, '#5a5058'); fr(166, -140, 9, 20, '#3a3036'); fr(164, -142, 13, 4, '#5a5058');
  // front vent (flame thrower) glow
  fr(-6, -28, 8, 12, '#3a3a40');
  // scorch marks as it gets damaged
  const dc = destroyedCount(b);
  if (dc >= 1) { fr(60, -70, 12, 6, '#3a1614'); fr(140, -60, 16, 5, '#3a1614'); }
  if (dc >= 3) { fr(96, -96, 18, 8, '#3a1614'); fr(30, -60, 10, 10, '#3a1614'); }
  // core shutter
  const sh = b.shutter;
  const shOpen = Math.round(sh * 12);
  fr(-2, -72, 24, 14 - shOpen, '#5a5e6a'); fr(-2, -58 + shOpen, 24, 14 - shOpen, '#5a5e6a');
  if (sh < 1) fr(-2, -59, 24, 2, (T >> 3) % 2 ? '#ff4020' : '#a02010');
  fdraw(x + shk, y, false, dyingFlash);
  // core
  if (sh > 0 && P.core.alive) {
    const cx = x + P.core.ax, cy = y + P.core.ay, pulse = Math.sin(T * 0.3) * 1.5;
    ctx.globalAlpha = 0.35; dcirc(cx, cy, 16 + pulse + b.glow * 6, '#ff5020'); ctx.globalAlpha = 1;
    dcirc(cx, cy, 10 * sh, P.core.flash > 0 ? '#ffffff' : '#ff4020');
    dcirc(cx, cy, 7 * sh, '#ffb040'); dcirc(cx - 2, cy - 2, 3 * sh, '#fffbe0');
  }
  // turret with twin cannons
  if (P.turret.alive) {
    const pvx = P.turret.ax - 24, pvy = P.turret.ay - 6;
    const dx = Math.cos(b.turA), dy = Math.sin(b.turA), nx = -dy * 4, ny = dx * 4;
    fline(pvx + nx, pvy + ny, pvx + nx + dx * 44, pvy + ny + dy * 44, 4, '#3a3a42');
    fline(pvx - nx, pvy - ny, pvx - nx + dx * 44, pvy - ny + dy * 44, 4, '#3a3a42');
    fr(Math.round(pvx + nx + dx * 44) - 3, Math.round(pvy + ny + dy * 44) - 3, 6, 6, '#2a2a30');
    fr(Math.round(pvx - nx + dx * 44) - 3, Math.round(pvy - ny + dy * 44) - 3, 6, 6, '#2a2a30');
    fdraw(x + shk, y, false, dyingFlash || (P.turret.flash > 0 ? '#ffffff' : null));
    drawBossPart('turret', x + P.turret.ax + shk, y + P.turret.ay, 0, dyingFlash || (P.turret.flash > 0 ? '#ffffff' : null));
  }
  for (const k of ['upper', 'lower']) {
    const q = P[k];
    if (!q.alive) continue;
    let fl = dyingFlash || (q.flash > 0 ? '#ffffff' : null);
    const tele = b.atk === 'guns' && ((k === 'lower' && b.atkT < 30) || (k === 'upper' && b.atkT > 85 && b.atkT < 110));
    if (!fl && tele && (T >> 2) % 2) fl = '#ff6040';
    drawBossPart(k, x + q.ax + shk, y + q.ay, 0, fl);
  }
  if (b.atk === 'flame' && b.atkT < 34 && (T >> 1) % 2) { dcirc(x - 2, y - 22, 5, '#ffb040'); }
}
function drawBossWreck(b) {
  const x = Math.round(b.x);
  fr(8, -30, 198, 30, '#262024'); fr(0, -60, 200, 32, '#3a2422'); fr(30, -80, 120, 22, '#2e1c1a'); fr(150, -96, 11, 20, '#1e1618');
  fdraw(x, GY);
}
function drawBossBar(b) {
  const [h, m] = bossTotalHp(b);
  const fill = b.state === 'intro' || b.state === 'roar' ? Math.min(1, b.t / 80) * (b.state === 'roar' ? 1 : 0.5) : h / m;
  const x = 120, y = 252, w = 240;
  ctx.fillStyle = OUTLINE; ctx.fillRect(x - 2, y - 2, w + 4, 10);
  ctx.fillStyle = '#3a1418'; ctx.fillRect(x, y, w, 6);
  const fw = Math.round(w * fill);
  ctx.fillStyle = '#e82828'; ctx.fillRect(x, y, fw, 6);
  ctx.fillStyle = '#ff8060'; ctx.fillRect(x, y, fw, 2);
  drawText('IRON SCORPION', 240, y - 11, '#ffffff', 1, 1);
}
