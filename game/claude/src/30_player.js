// =====================================================================
//  PLAYER, WEAPONS, PROJECTILES, TANK
// =====================================================================
const WEAPONS = {
  P: { name: 'PISTOL', full: 'PISTOL', gun: 'pistol', ammo: Infinity },
  H: { name: 'H.M.G.', full: 'HEAVY MACHINE GUN', gun: 'hmg', ammo: 150 },
  S: { name: 'SPREAD', full: 'SPREAD SHOT', gun: 'spread', ammo: 40 },
  F: { name: 'FLAME', full: 'FLAMETHROWER', gun: 'flame', ammo: 120 },
  R: { name: 'ROCKET', full: 'ROCKET LAUNCHER', gun: 'rocket', ammo: 20 },
  L: { name: 'LASER', full: 'LASER CANNON', gun: 'laser', ammo: 220 }
};
const P_STAND_H = 25, P_CROUCH_H = 16;

function makePlayer(x, y) {
  return {
    kind: 'player', x, y, w: 12, h: P_STAND_H, vx: 0, vy: 0, face: 1, onGround: false,
    hp: 3, maxHp: 3, weapon: 'P', ammo: Infinity, bombs: 10, cd: 0, coyote: 0, jbuf: 0,
    crouch: false, aim: 0, state: 'normal', inv: 0, shield: 0, t: 0, runPh: 0,
    throwT: 0, knifeT: 0, hurtT: 0, climb: false, dropT: 0, jumping: false, idleT: 0,
    deadT: 0, stepT: 0, rot: 0, laserT: 0, shots: 0, hits: 0, fidget: 0
  };
}
function pTarget() { const t = G.tank; return t && t.occupied ? t : G.player; }
function targetAlive() { const p = G.player; return p && (p.state === 'normal' || p.state === 'tank'); }

function playerPose(p) {
  const pose = { leg: 'stand', ph: p.runPh, aim: p.aim, gun: WEAPONS[p.weapon].gun, arm: 'gun', face: 'n', bob: 0, wind: false };
  if (p.climb) { pose.leg = 'climb'; pose.ph = p.y / 20; }
  else if (!p.onGround) { pose.leg = p.vy < 0 ? 'jump' : 'fall'; pose.wind = true; }
  else if (p.crouch) pose.leg = Math.abs(p.vx) > 0.2 ? 'cwalk' : 'crouch';
  else if (Math.abs(p.vx) > 0.3) { pose.leg = 'run'; pose.bob = Math.cos(p.runPh * TAU * 2) > 0.3 ? -1 : 0; pose.wind = true; }
  else if (p.fidget > 0) { pose.bob = (p.fidget >> 3) % 2 ? -1 : 0; pose.hbob = p.fidget % 40 < 20 ? 0 : 1; pose.face = 'grin'; }
  if (p.throwT > 0) { pose.arm = 'throw'; pose.at = 1 - p.throwT / 14; }
  if (p.knifeT > 0) { pose.arm = 'knife'; pose.at = 1 - p.knifeT / 14; pose.face = 'shout'; }
  if (p.hurtT > 0) pose.face = 'hurt';
  if (p.cd > 2 && pose.arm === 'gun') pose.face = 'shout';
  return pose;
}
function muzzlePos(p) {
  const g = armGeom(ST.player, playerPose(p));
  return { x: p.x + g.mx * p.face, y: p.y + g.my, dx: g.dx * p.face, dy: g.dy };
}

function updatePlayer(p) {
  p.t++;
  if (p.inv > 0) p.inv--;
  if (p.shield > 0) { p.shield--; if (p.shield === 120) floatText(p.x, p.y - 34, 'SHIELD LOW', '#80c8ff'); }
  if (p.hurtT > 0) p.hurtT--;
  if (p.state === 'dead') return updateDeadPlayer(p);
  if (p.hidden) return;
  if (p.state === 'tank' || p.state === 'victory' || p.state === 'intro') {
    if (p.state === 'victory' || p.state === 'intro') { p.vy = Math.min(p.vy + 0.35, 6.5); p.vx = approach(p.vx, 0, 0.3); moveBody(p, false); }
    return;
  }
  const I = Input;
  const mx = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0);
  const up = I.down('up'), dn = I.down('down');
  const wasGround = p.onGround, prevVy = p.vy;

  // ---- ladders ----
  const tx = Math.floor(p.x / TS);
  if (!p.climb) {
    const midT = tileAt(tx, Math.floor((p.y - 12) / TS)), footT = tileAt(tx, Math.floor((p.y + 1) / TS));
    if ((up && isLadderT(midT) && (p.onGround || p.vy > -1)) || (dn && p.onGround && footT === T_LADTOP)) {
      p.climb = true; p.x = tx * TS + 8; p.vx = 0; p.vy = 0; p.crouch = false; p.h = P_STAND_H;
      if (dn) p.y += 2;
    }
  }
  if (p.climb) {
    p.vy = (dn ? 1.3 : 0) - (up ? 1.3 : 0);
    p.vx = 0;
    if (mx) p.face = mx;
    if (p.vy) p.runPh += 0.04;
    moveBody(p, true);
    const feetT = tileAt(tx, Math.floor((p.y - 1) / TS));
    if (!isLadderT(feetT) && !isLadderT(tileAt(tx, Math.floor((p.y - 12) / TS)))) {
      p.climb = false;
      if (up) { p.y = Math.ceil(p.y / TS) * TS; p.onGround = true; }
    }
    if (p.onGround && dn) p.climb = false;
    if (I.pressed('jump')) { p.climb = false; p.vy = -4.2; p.vx = mx * 1.6; p.jumping = true; }
    p.aim = 0;
  } else {
    // ---- run / crouch ----
    const wantCrouch = dn && p.onGround;
    if (wantCrouch !== p.crouch) {
      if (wantCrouch) { p.crouch = true; p.h = P_CROUCH_H; }
      else if (!solidAt(p.x, p.y - P_STAND_H - 1)) { p.crouch = false; p.h = P_STAND_H; }
    }
    const maxv = p.crouch ? 0.85 : 1.75;
    if (mx) { p.vx = approach(p.vx, mx * maxv, p.onGround ? 0.45 : 0.32); if (p.knifeT <= 0) p.face = mx; }
    else p.vx = approach(p.vx, 0, p.onGround ? 0.55 : 0.12);
    // ---- jump (coyote time + buffering) ----
    if (I.pressed('jump')) p.jbuf = 8; else if (p.jbuf > 0) p.jbuf--;
    if (p.onGround) p.coyote = 7; else if (p.coyote > 0) p.coyote--;
    if (p.jbuf > 0 && p.coyote > 0) {
      const under = tileAt(tx, Math.floor((p.y + 1) / TS));
      if (dn && isOnewayT(under) && p.onGround) { p.dropT = 10; p.crouch = false; p.h = P_STAND_H; }
      else { p.vy = -6.0; p.jumping = true; Snd.play('jump'); dust(p.x, p.y, 3); p.crouch = false; p.h = P_STAND_H; }
      p.jbuf = 0; p.coyote = 0;
    }
    if (p.jumping && !I.down('jump') && p.vy < -2.4) p.vy = -2.4;
    p.vy = Math.min(p.vy + 0.35, 6.5);
    if (p.dropT > 0) p.dropT--;
    moveBody(p, p.dropT > 0);
    if (p.onGround) p.jumping = false;
    if (!wasGround && p.onGround && prevVy > 2.5) { dust(p.x, p.y, 5); Snd.play('land'); }
    // ---- aim ----
    if (up && mx) p.aim = -PI / 4;
    else if (up) p.aim = -PI / 2;
    else if (dn && !p.onGround) p.aim = mx ? PI / 4 : PI / 2;
    else p.aim = 0;
    if (p.crouch) p.aim = 0;
  }
  // camera bounds
  const lo = G.cam.x + 8, hi = G.cam.x + W - 8;
  if (p.x < lo) { p.x = lo; if (p.vx < 0) p.vx = 0; }
  if (p.x > hi) { p.x = hi; if (p.vx > 0) p.vx = 0; }
  // animation / ambience
  if (p.onGround && Math.abs(p.vx) > 0.3) {
    p.runPh = (p.runPh + Math.abs(p.vx) * 0.055) % 1;
    if (++p.stepT % 12 === 0) { dust(p.x - p.face * 3, p.y, 1); Snd.play('step'); }
  }
  if (p.onGround && Math.abs(p.vx) < 0.1 && p.cd <= 0 && !p.crouch) {
    if (++p.idleT > 240 && p.fidget <= 0 && chance(0.01)) p.fidget = 80;
  } else p.idleT = 0;
  if (p.fidget > 0) p.fidget--;
  if (p.throwT > 0) p.throwT--;
  if (p.knifeT > 0) p.knifeT--;

  // ---- attacks ----
  p.cd = Math.max(-30, p.cd - 1);
  const fire = I.down('fire'), fireP = I.pressed('fire');
  if ((fireP || fire) && p.knifeT <= 0) {
    const victim = fireP ? knifeTarget(p) : null;
    if (victim) doKnife(p, victim);
    else if (p.weapon === 'L') { if (fire) fireLaser(p); }
    else if (p.weapon === 'P') { if ((fireP && p.cd <= 0) || (fire && p.cd <= -7)) firePlayerWeapon(p); }
    else if (p.cd <= 0) firePlayerWeapon(p);
  }
  if (p.weapon === 'L' && !fire) p.laserT = 0;
  if (I.pressed('bomb') && p.throwT <= 0) {
    if (p.bombs > 0) {
      p.bombs--; p.throwT = 14;
      const m = muzzlePos(p);
      const upAim = p.aim < -0.3;
      G.pShots.push({ kind: 'gren', x: p.x + p.face * 4, y: p.y - 20, vx: p.face * (upAim ? 1.6 : 2.7) + p.vx * 0.5, vy: upAim ? -5 : -3.6, life: 70, r: 3, bounces: 0, rot: 0 });
      Snd.play('throw'); void m;
    } else floatText(p.x, p.y - 34, 'NO BOMBS', '#ff8080', 1, 30);
  }
  // tank entry
  const tk = G.tank;
  if (tk && !tk.occupied && !tk.destroyed && tk.enterCd <= 0 && bodiesHit(p, tk) && (I.pressed('down') || (p.vy > 0.5 && p.y < tk.y - 14))) enterTank(tk);
}
function updateDeadPlayer(p) {
  p.deadT++;
  p.vy = Math.min(p.vy + 0.3, 6);
  moveBody(p, false);
  if (!p.onGround) { if (p.deadT % 5 === 0) p.rot = (p.rot + (p.face > 0 ? -1 : 1) + 4) % 4; p.vx *= 0.99; }
  else { p.vx *= 0.8; if (p.rot % 2 === 0) p.rot = p.face > 0 ? 3 : 1; }
  if (p.deadT === 50) { G.texts.push({ x: p.x, y: p.y - 10, str: '', ghost: true, life: 90, max: 90, vy: -0.6 }); }
  if (p.deadT > 120) {
    G.lives--;
    if (G.lives <= 0) { startGameOver(); return; }
    respawnPlayer(p);
  }
}
function respawnPlayer(p, atX) {
  const x = atX || G.cam.x + 70;
  let row = 0;
  while (row < GROUND && isSolidT(tileAt(Math.floor(x / TS), row))) row++;
  Object.assign(p, { state: 'normal', x, y: row * TS + 30, vx: 0, vy: 1, hp: p.maxHp, weapon: 'P', ammo: Infinity, inv: 160, rot: 0, deadT: 0, crouch: false, h: P_STAND_H, climb: false, face: 1, knifeT: 0, throwT: 0, hurtT: 0 });
  p.bombs = Math.max(p.bombs, 10);
  for (const s of G.eShots) { sparks(s.x, s.y, 2); s.remove = true; }
  sweep(G.eShots);
  screenFlash(6, '#ffffff');
  floatText(p.x, p.y - 20, 'GO!', '#ffe040', 2, 60);
}
function hurtPlayer(src, dmg) {
  const p = G.player;
  const tk = G.tank;
  if (tk && tk.occupied) { tankHurt(tk, (dmg || 1) * 5); return true; }
  if (p.state !== 'normal' || p.inv > 0 || G.endSeq) return false;
  if (p.shield > 0) { sparks(p.x, p.y - 14, 6, '#80c8ff'); Snd.play('clank'); return true; }
  p.hp -= 1;
  p.hurtT = 18; p.inv = 100;
  const dir = src && src.x !== undefined ? sgn(p.x - src.x) : -p.face;
  p.vx = dir * 1.8; p.vy = -2.8; p.climb = false; p.onGround = false;
  stars(p.x, p.y - 16, 6, '#ffe040');
  Snd.play('hurt'); shake(5); hitStop(3);
  if (p.hp <= 0) {
    p.state = 'dead'; p.deadT = 0; p.vy = -5.5; p.vx = dir * 1.6; p.rot = 0;
    G.livesLost++;
    Snd.play('pdie');
    bubble(p, pick(['NOOOO!', 'ARGH!', 'NOT AGAIN!']), 50);
    screenFlash(4, '#ff4040');
  }
  return true;
}

// ---- knife ----
function knifeTarget(p) {
  let best = null, bd = 99;
  for (const e of G.enemies) {
    if (e.dead || !e.active || !e.human) continue;
    const dx = e.x - p.x;
    if (Math.abs(dx) < 20 + e.w / 2 && e.y - e.h < p.y && p.y - p.h < e.y && Math.abs(dx) < bd) { best = e; bd = Math.abs(dx); }
  }
  return best;
}
function doKnife(p, e) {
  p.face = sgn(e.x - p.x) || p.face;
  p.knifeT = 14; p.cd = 8;
  G.fx.push({ kind: 'slash', x: p.x + p.face * 6, y: p.y - 15, dir: p.face, t: 0, max: 10 });
  Snd.play('knife');
  const killed = damageEnemy(e, 5, { kind: 'knife', x: p.x, vx: p.face });
  stars(e.x, e.y - e.h * 0.6, 5);
  if (killed) { hitStop(5); shake(3); addScore(50, e.x, e.y - e.h - 14, '#80ff80'); }
}

// ---- guns ----
function firePlayerWeapon(p) {
  const m = muzzlePos(p), a = Math.atan2(m.dy, m.dx), wpn = p.weapon;
  const shot = (ang, spd, kind, dmg, extra) => {
    const s = Object.assign({ kind, x: m.x, y: m.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, life: 90, r: 2 }, extra || {});
    G.pShots.push(s); return s;
  };
  switch (wpn) {
    case 'P': shot(a, 7.5, 'pb', 1); p.cd = 6; muzzle(m.x, m.y, a, 4); Snd.play('pistol'); break;
    case 'H': shot(a + rnd(-0.05, 0.05), 9, 'hb', 1); p.cd = 4; muzzle(m.x, m.y, a, 6); Snd.play('mg'); shellCasing(p.x, p.y - 17, p.face); break;
    case 'S': for (let i = -2; i <= 2; i++) shot(a + i * 0.14, 6, 'sb', 1.2, { life: 70, r: 3 }); p.cd = 14; muzzle(m.x, m.y, a, 7, '#ffd0ff', '#d050f0'); Snd.play('spread'); break;
    case 'F': {
      const s = shot(a + rnd(-0.08, 0.08), 4.3 + rnd(0.6), 'flame', 0.5, { life: 26, r: 5, pierce: true, hit: [] });
      s.vx += p.vx * 0.5;
      p.cd = 3; Snd.play('flame'); break;
    }
    case 'R': shot(a, 2, 'rocket', 5, { life: 110, r: 3, ang: a }); p.cd = 22; muzzle(m.x, m.y, a, 6); Snd.play('rocket'); smoke(m.x - m.dx * 8, m.y, 2, 0.8); break;
  }
  p.ammo--;
  if (p.ammo <= 0 && wpn !== 'P') { p.weapon = 'P'; p.ammo = Infinity; floatText(p.x, p.y - 36, 'OUT OF AMMO', '#ff9090', 1, 60); }
}
function fireLaser(p) {
  const m = muzzlePos(p);
  p.laserT++;
  if (p.laserT % 2 === 0) p.ammo--;
  Snd.play('laser');
  // march the beam until a wall
  let x = m.x, y = m.y, len = 0;
  const step = 4;
  while (len < 360) {
    x += m.dx * step; y += m.dy * step; len += step;
    if (solidAt(x, y)) { hitBreakableAt(x, y, 0.4); break; }
    if (bossBeamStop(x, y)) break;
    if (y < -20 || y > H + 20) break;
  }
  const x1 = x, y1 = y;
  // damage everything along the beam
  for (const e of G.enemies) {
    if (e.dead || !e.active) continue;
    if (segHitsBody(m.x, m.y, x1, y1, e)) { damageEnemy(e, 0.34, { kind: 'laser', x: m.x, vx: m.dx }); if (G.t % 3 === 0) sparks(e.x, e.y - e.h / 2, 1, '#a0f8ff'); }
  }
  for (const pr of G.props) if (pr.shootable && !pr.remove && segHitsBody(m.x, m.y, x1, y1, pr)) hitProp(pr, 0.34, { kind: 'laser' });
  if (G.boss) bossBeamHit(m.x, m.y, x1, y1, 0.34);
  G.fx.push({ kind: 'beam', x0: m.x, y0: m.y, x1, y1, w: 3 + Math.sin(G.t * 0.8), t: 0, max: 1, c1: '#40c8ff', c2: '#ffffff' });
  if (G.t % 2 === 0) { const pp = part('spark', x1, y1, rnd(-1.5, 1.5), rnd(-2, 0), 10, 1, '#a0f8ff'); pp.g = 0.1; }
  if (p.ammo <= 0) { p.weapon = 'P'; p.ammo = Infinity; floatText(p.x, p.y - 36, 'OUT OF AMMO', '#ff9090', 1, 60); }
}
function segHitsBody(x0, y0, x1, y1, e) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4);
  for (let i = 0; i <= n; i++) { const k = i / n; if (pointInBody(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, e, 2)) return true; }
  return false;
}

// ---- player projectiles ----
function updatePShots() {
  const cx = G.cam.x;
  for (const s of G.pShots) {
    s.life--;
    if (s.kind === 'gren') { updateGrenade(s); continue; }
    if (s.kind === 'rocket') {
      const spd = Math.min(7.5, Math.hypot(s.vx, s.vy) + 0.35);
      const tgt = nearestEnemy(s.x, s.y, 220, s.ang);
      if (tgt) {
        const want = Math.atan2(tgt.y - tgt.h / 2 - s.y, tgt.x - s.x);
        let d = want - s.ang; while (d > PI) d -= TAU; while (d < -PI) d += TAU;
        s.ang += clamp(d, -0.07, 0.07);
      }
      s.vx = Math.cos(s.ang) * spd; s.vy = Math.sin(s.ang) * spd;
      if (G.t % 2 === 0) { const p = part('smoke', s.x - s.vx, s.y - s.vy, rnd(-0.2, 0.2), rnd(-0.3, 0), 30, 2, '#9a9098'); p.grow = 0.1; p.alpha = 0.6; }
    }
    if (s.kind === 'cshell') s.vy += 0.09;
    if (s.kind === 'flame') { s.vx *= 0.96; s.vy = s.vy * 0.96 - 0.04; s.r += 0.25; }
    s.x += s.vx; s.y += s.vy;
    if (s.life <= 0 || s.x < cx - 30 || s.x > cx + W + 30 || s.y < -40 || s.y > H + 20) { s.remove = true; continue; }
    // walls
    if (solidAt(s.x, s.y)) {
      if (s.kind === 'rocket' || s.kind === 'cshell') { explodeAt(s.x - s.vx, s.y - s.vy, s.kind === 'cshell' ? 36 : 28, s.kind === 'cshell' ? 10 : 6, 'p'); }
      else if (s.kind !== 'flame') { sparks(s.x, s.y, 3); hitBreakableAt(s.x, s.y, s.dmg); }
      else { hitBreakableAt(s.x, s.y, 0.1); }
      s.remove = true; continue;
    }
    // enemies
    let hitSomething = false;
    for (const e of G.enemies) {
      if (e.dead || !e.active || e.ghost) continue;
      if (!pointInBody(s.x, s.y, e, s.r)) continue;
      if (s.pierce) {
        if (s.hit.indexOf(e) >= 0) continue;
        s.hit.push(e);
      }
      if (s.kind === 'rocket' || s.kind === 'cshell') {
        damageEnemy(e, s.kind === 'cshell' ? 8 : 4, { kind: 'rocket', x: s.x, vx: s.vx });
        explodeAt(s.x, s.y, s.kind === 'cshell' ? 36 : 28, s.kind === 'cshell' ? 8 : 5, 'p');
      } else {
        damageEnemy(e, s.dmg, { kind: s.kind === 'flame' ? 'flame' : 'bullet', x: s.x, vx: s.vx });
        if (s.kind !== 'flame') { const p = part('star', s.x, s.y, 0, 0, 6, 3, '#fff'); void p; }
      }
      G.player.hits++;
      hitSomething = true;
      if (!s.pierce) break;
    }
    if (hitSomething && !s.pierce) { s.remove = true; continue; }
    if (G.boss && bossShotHit(s)) { s.remove = true; continue; }
    for (const pr of G.props) {
      if (!pr.shootable || pr.remove) continue;
      if (pointInBody(s.x, s.y, pr, s.r)) {
        if (s.pierce) { if (s.hit.indexOf(pr) >= 0) continue; s.hit.push(pr); }
        if (s.kind === 'rocket' || s.kind === 'cshell') explodeAt(s.x, s.y, 30, 6, 'p');
        else hitProp(pr, s.dmg, { kind: s.kind, x: s.x, vx: s.vx });
        if (!s.pierce) { s.remove = true; break; }
      }
    }
  }
  sweep(G.pShots);
}
function nearestEnemy(x, y, range, ang) {
  let best = null, bd = range;
  for (const e of G.enemies) {
    if (e.dead || !e.active) continue;
    const dx = e.x - x, dy = e.y - e.h / 2 - y, d = Math.hypot(dx, dy);
    if (d < bd && (dx * Math.cos(ang) + dy * Math.sin(ang)) > 0) { bd = d; best = e; }
  }
  if (G.boss && G.boss.targetable) {
    const bp = bossAimPoint();
    if (bp) { const d = Math.hypot(bp.x - x, bp.y - y); if (d < bd + 60) return { x: bp.x, y: bp.y + 4, h: 8 }; }
  }
  return best;
}
function updateGrenade(s) {
  s.vy += 0.22; s.rot++;
  s.x += s.vx;
  if (solidAt(s.x, s.y)) { s.x -= s.vx; s.vx *= -0.5; }
  s.y += s.vy;
  if (solidAt(s.x, s.y) || (s.vy > 0 && isOnewayT(tileAt(Math.floor(s.x / TS), Math.floor(s.y / TS))) && (s.y - s.vy) <= Math.floor(s.y / TS) * TS)) {
    s.y = s.vy > 0 ? Math.floor(s.y / TS) * TS - 0.5 : s.y - s.vy;
    if (s.vy > 0) { s.vy *= -0.45; s.vx *= 0.7; s.bounces++; if (Math.abs(s.vy) > 0.6) Snd.play('bounce'); if (Math.abs(s.vy) < 0.5) s.vy = 0; }
    else s.vy = 0;
  }
  let boom = s.life <= 0;
  if (!boom) for (const e of G.enemies) if (!e.dead && e.active && pointInBody(s.x, s.y, e, 3)) { boom = true; break; }
  if (!boom && G.boss && bossPointHit(s.x, s.y)) boom = true;
  if (boom) { explodeAt(s.x, s.y - 4, 30, 7, 'p'); s.remove = true; }
  if (s.y > H + 10) s.remove = true;
}
function drawPShots() {
  for (const s of G.pShots) {
    const x = Math.round(s.x), y = Math.round(s.y);
    switch (s.kind) {
      case 'pb': dcirc(x, y, 2, '#ff9a20'); ctx.fillStyle = '#fffbe0'; ctx.fillRect(x - 1, y - 1, 2, 2); break;
      case 'hb':
        ctx.strokeStyle = '#ffb030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s.vx * 1.1, y - s.vy * 1.1); ctx.stroke();
        ctx.fillStyle = '#fffbe0'; ctx.fillRect(x - 1, y - 1, 2, 2); break;
      case 'sb': dcirc(x, y, 3 + ((G.t >> 1) % 2), '#d050f0'); dcirc(x, y, 2, '#ffc0ff'); ctx.fillStyle = '#fff'; ctx.fillRect(x, y - 1, 1, 1); break;
      case 'flame': {
        const k = s.life / 26, ci = k > 0.8 ? 1 : k > 0.55 ? 2 : k > 0.3 ? 3 : 4;
        ctx.globalAlpha = Math.min(1, k * 2.5);
        dcirc(x, y, s.r, FIRE_COLS[ci]); dcirc(x, y, s.r * 0.55, FIRE_COLS[Math.max(0, ci - 1)]);
        ctx.globalAlpha = 1; break;
      }
      case 'rocket': {
        const dx = Math.cos(s.ang), dy = Math.sin(s.ang);
        dcirc(x - dx * 5, y - dy * 5, 2 + (G.t % 2), '#ffb030');
        for (let i = 0; i < 4; i++) dcirc(x - dx * i * 1.5, y - dy * i * 1.5, 2, i === 0 ? '#e03020' : '#5a8a3a');
        break;
      }
      case 'cshell': dcirc(x, y, 3, OUTLINE); dcirc(x, y, 2, '#e8d070'); break;
      case 'gren': {
        ctx.fillStyle = OUTLINE; ctx.fillRect(x - 3, y - 3, 6, 6);
        ctx.fillStyle = '#4a7a30'; ctx.fillRect(x - 2, y - 2, 4, 4);
        ctx.fillStyle = '#9ad060'; ctx.fillRect(x - 2, y - 2, 1, 1);
        ctx.fillStyle = (s.life >> 2) % 2 ? '#ff3030' : '#ffe040'; ctx.fillRect(x + ((s.rot >> 2) % 2 ? 1 : -2), y - 4, 1, 1);
        break;
      }
    }
  }
}

// ---- explosions affecting gameplay ----
function explodeAt(x, y, r, dmg, owner, opts) {
  spawnBoom(x, y, r, opts);
  if (owner !== 'e') {
    for (const e of G.enemies) {
      if (e.dead || !e.active) continue;
      if (circleBody(x, y, r, e)) damageEnemy(e, dmg, { kind: 'blast', x, vx: e.x - x });
    }
    for (const pr of G.props) if (!pr.remove && (pr.shootable || pr.blastable) && circleBody(x, y, r, pr)) hitProp(pr, dmg, { kind: 'blast', x, y });
    // breakable tiles in radius
    for (let ty = Math.floor((y - r) / TS); ty <= Math.floor((y + r) / TS); ty++)
      for (let tx = Math.floor((x - r) / TS); tx <= Math.floor((x + r) / TS); tx++) {
        const pr = BRK[ty * LW + tx];
        if (pr && !pr.remove && tx >= 0 && tx < LW && ty >= 0 && ty < LH) hitProp(pr, dmg, { kind: 'blast', x, y });
      }
    if (G.boss) bossBlastHit(x, y, r, dmg);
  }
  if (owner !== 'p') {
    const t = pTarget();
    if (circleBody(x, y, r * 0.85, t)) hurtPlayer({ x, y }, 3);
  }
}
function hitBreakableAt(x, y, dmg) {
  const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
  if (tx < 0 || tx >= LW || ty < 0 || ty >= LH) return;
  const pr = BRK[ty * LW + tx];
  if (pr && !pr.remove) hitProp(pr, dmg, { kind: 'bullet', x, y });
}

// =====================================================================
//  TANK ("THE BULLDOG")
// =====================================================================
function makeTank(x, y) {
  return { kind: 'tank', x, y, w: 34, h: 28, vx: 0, vy: 0, hp: 100, max: 100, occupied: false, face: 1, susp: 0, suspV: 0, tread: 0, recoil: 0, mgAngle: 0, mgCd: 0, canCd: 0, destroyed: false, dT: 0, onGround: false, flash: 0, enterCd: 0 };
}
function enterTank(tk) {
  const p = G.player;
  tk.occupied = true; p.state = 'tank'; p.climb = false; tk.face = p.face;
  tk.suspV = 3; Snd.play('engine'); Snd.play('select');
  floatText(tk.x, tk.y - 44, 'BULLDOG GO!', '#ffe040', 1, 70);
  dust(tk.x, tk.y, 8);
}
function exitTank(tk, forced) {
  const p = G.player;
  tk.occupied = false; tk.enterCd = 40;
  Object.assign(p, { state: 'normal', x: tk.x, y: tk.y - tk.h - 2, vy: -5.5, vx: 0, inv: forced ? 120 : 30, crouch: false, h: P_STAND_H, jumping: false });
  Snd.play('jump');
}
function tankHurt(tk, dmg) {
  if (tk.destroyed) return;
  tk.hp -= dmg; tk.flash = 4;
  sparks(tk.x + rnd(-12, 12), tk.y - 18, 4);
  Snd.play('clank'); shake(3);
  if (tk.hp <= 0) {
    tk.hp = 0; tk.destroyed = true; tk.dT = 0;
    if (tk.occupied) exitTank(tk, true);
    showMsg('BULLDOG DOWN!', { color: GRAD_RED, scale: 2, life: 90 });
    Snd.play('alarm');
  }
}
function updateTank(tk) {
  if (tk.flash > 0) tk.flash--;
  if (tk.enterCd > 0) tk.enterCd--;
  if (tk.destroyed) {
    tk.dT++;
    if (tk.dT % 4 === 0) { sparks(tk.x + rnd(-14, 14), tk.y - rnd(8, 24), 2); smoke(tk.x, tk.y - 20, 1); }
    tk.susp = Math.sin(tk.dT * 1.3) * 2;
    if (tk.dT === 50) {
      explodeAt(tk.x, tk.y - 14, 44, 10, 'p');
      debris(tk.x, tk.y - 14, 18, ['#6d8c38', '#4a6424', '#403a40', '#f0c030'], 1.5);
      tk.remove = true; G.tank = null;
    }
    return;
  }
  const I = Input, wasGround = tk.onGround, prevVy = tk.vy;
  tk.vy = Math.min(tk.vy + 0.35, 7);
  if (tk.occupied) {
    const p = G.player;
    const mx = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0);
    tk.vx = approach(tk.vx, mx * 1.9, 0.16);
    if (mx) tk.face = mx;
    if (I.pressed('jump') && I.down('down')) { exitTank(tk, false); return; }
    if (I.pressed('jump') && tk.onGround) { tk.vy = -5.4; tk.suspV = -3; Snd.play('hop'); dust(tk.x, tk.y, 6); }
    const up = I.down('up');
    const want = up ? (mx ? -PI / 4 : -PI / 2) : 0;
    tk.mgAngle = approach(tk.mgAngle, want, 0.14);
    if (tk.mgCd > 0) tk.mgCd--;
    if (tk.canCd > 0) tk.canCd--;
    if (I.down('fire') && tk.mgCd <= 0) {
      const bx = tk.x + 3 * tk.face, by = tk.y - 31 + Math.round(tk.susp);
      const a = tk.mgAngle, dx = Math.cos(a) * tk.face, dy = Math.sin(a);
      const mx2 = bx + dx * 11, my2 = by + dy * 11;
      const ang = Math.atan2(dy, dx) + rnd(-0.04, 0.04);
      G.pShots.push({ kind: 'hb', x: mx2, y: my2, vx: Math.cos(ang) * 9, vy: Math.sin(ang) * 9, dmg: 1.2, life: 80, r: 2 });
      muzzle(mx2, my2, ang, 5); Snd.play('tankmg'); shellCasing(bx, by, tk.face);
      tk.mgCd = 5;
    }
    if (I.pressed('bomb') && tk.canCd <= 0) {
      const cx = tk.x + tk.face * 27, cy = tk.y - 25 + Math.round(tk.susp);
      G.pShots.push({ kind: 'cshell', x: cx, y: cy, vx: tk.face * 6.5 + tk.vx * 0.5, vy: -0.9, dmg: 10, life: 120, r: 3 });
      muzzle(cx, cy, tk.face > 0 ? 0 : PI, 10); Snd.play('cannon'); shake(4);
      tk.recoil = 5; tk.vx -= tk.face * 0.8; tk.suspV += 1.5; tk.canCd = 38;
      smoke(cx, cy, 3, 1);
    }
    p.x = tk.x; p.y = tk.y; p.face = tk.face;
  } else tk.vx = approach(tk.vx, 0, 0.2);
  moveBody(tk, false);
  // keep inside the camera while driven
  if (tk.occupied) {
    const lo = G.cam.x + 20, hi = G.cam.x + W - 20;
    if (tk.x < lo) { tk.x = lo; tk.vx = Math.max(0, tk.vx); }
    if (tk.x > hi) { tk.x = hi; tk.vx = Math.min(0, tk.vx); }
  }
  if (!wasGround && tk.onGround && prevVy > 2) {
    tk.suspV += prevVy * 0.7; dust(tk.x - 12, tk.y, 5); dust(tk.x + 12, tk.y, 5); Snd.play('land'); shake(3);
    // stomp breaks cracked floors
    for (let dx = -16; dx <= 16; dx += 8) { const pr = BRK[Math.floor((tk.y + 2) / TS) * LW + Math.floor((tk.x + dx) / TS)]; if (pr && pr.type === 'crackfloor') hitProp(pr, 99, { kind: 'blast' }); }
  }
  tk.suspV += -tk.susp * 0.28 - tk.suspV * 0.22;
  if (tk.onGround && Math.abs(tk.vx) > 0.6 && G.t % 6 === 0) tk.suspV += rnd(-0.6, 0.6);
  tk.susp = clamp(tk.susp + tk.suspV, -4, 5);
  tk.tread += tk.vx * 1.2;
  tk.recoil = approach(tk.recoil, 0, 0.5);
  if (tk.onGround && Math.abs(tk.vx) > 0.8 && G.t % 5 === 0) dust(tk.x - tk.face * 16, tk.y, 1);
  if (tk.occupied && tk.hp < 35 && G.t % 7 === 0) smoke(tk.x - tk.face * 6, tk.y - 26, 1, 0.8);
  // crush
  if (tk.occupied && (Math.abs(tk.vx) > 0.4 || tk.vy > 1)) {
    for (const e of G.enemies) {
      if (e.dead || !e.active || !e.human) continue;
      if (!bodiesHit(tk, e)) continue;
      if (e.type === 'heavy') { damageEnemy(e, 0.3, { kind: 'bump' }); e.x += sgn(e.x - tk.x) * 1.5; }
      else { damageEnemy(e, 99, { kind: 'crush', x: tk.x }); Snd.play('crush'); addScore(100, e.x, e.y - 30, '#80ff80'); shake(2); }
    }
  }
}
function drawTank(tk) {
  drawTankSpr(tk.x, tk.y, tk.face, tk, tk.flash > 0 ? '#ffffff' : (tk.destroyed && (tk.dT >> 2) % 2 ? '#ff6040' : null));
  if (!tk.occupied && !tk.destroyed) {
    const p = G.player;
    if (p.state === 'normal' && Math.abs(p.x - tk.x) < 80 && (G.t >> 4) % 2) drawText('v', tk.x, tk.y - 52 + Math.sin(G.t * 0.2) * 2, '#ffe040', 2, 1);
  }
}
