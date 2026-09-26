// =====================================================================
//  ENEMIES
// =====================================================================
const ETYPES = {};
function onScreen(e, pad) { pad = pad || 0; return e.x > G.cam.x - pad && e.x < G.cam.x + W + pad; }
function groundYAt(x) {
  const tx = Math.floor(x / TS);
  let r = GROUND;
  while (r > 0 && isSolidT(tileAt(tx, r - 1))) r--;
  return r * TS;
}
function ceilBottom(x) {
  const tx = Math.floor(x / TS);
  let r = 0;
  while (r < GROUND && isSolidT(tileAt(tx, r))) r++;
  return r * TS;
}
function mkEnemy(type, x, y, o) {
  const T = ETYPES[type];
  const e = Object.assign({
    kind: 'enemy', type, x, y, vx: 0, vy: 0, w: 12, h: 24, hp: 2, face: -1, state: 'idle', t: 0, flash: 0, hurtT: 0,
    onGround: false, active: false, dead: false, score: 100, human: true, rot: 0, cd: rndi(30, 80), dropT: 0, aimA: 0, st: 'soldier'
  }, T.init ? T.init() : {}, o || {});
  e.maxHp = e.hp;
  return e;
}
function humanPhys(e) {
  e.vy = Math.min(e.vy + 0.3, 6);
  moveBody(e, e.dropT > 0);
  if (e.dropT > 0) e.dropT--;
  if (e.x < 8) e.x = 8;
}
function humanMuzzle(e, gun) {
  const g = armGeom(ST[e.st], { leg: e.kneel ? 'crouch' : 'stand', aim: e.aimA, gun: gun || 'rifle' });
  return { x: e.x + g.mx * e.face, y: e.y + g.my };
}
function aimAt(e, p, lim) {
  const m = { x: e.x, y: e.y - (e.kneel ? 12 : 17) };
  const a = Math.atan2((p.y - p.h * 0.55) - m.y, Math.abs(p.x - e.x));
  e.aimA = clamp(a, -(lim || 0.9), lim || 0.9);
}
function eShoot(x, y, tx, ty, spd, kind, r) {
  const a = Math.atan2(ty - y, tx - x);
  G.eShots.push({ kind: kind || 'eb', x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 300, r: r || 2.5 });
  muzzle(x, y, a, 3, '#ffe0a0', '#ff6020');
  Snd.play('enemyshot');
}
function enemyGrenade(e, p) {
  const dx = p.x - e.x;
  G.eShots.push({ kind: 'egren', x: e.x + e.face * 4, y: e.y - 22, vx: clamp(dx / 46, -3.2, 3.2), vy: -4.6, life: 95, r: 3, rot: 0 });
  Snd.play('throw');
}

function damageEnemy(e, dmg, src) {
  if (e.dead || e.invuln) return false;
  const T = ETYPES[e.type];
  const heavyHit = src.kind === 'blast' || src.kind === 'rocket' || src.kind === 'knife' || src.kind === 'crush';
  if (e.armor && !heavyHit) {
    dmg *= e.armor;
    if (G.t % 3 === 0) { Snd.play('clank'); sparks(e.x - sgn(src.vx || 1) * 6, e.y - e.h * 0.6, 2); }
  } else if (src.kind === 'bullet' && G.t % 2 === 0) Snd.play('hit');
  e.hp -= dmg; e.flash = 4;
  if (T.onHurt) T.onHurt(e, src, dmg);
  if (e.dead) return true;
  if (e.hp <= 0) { killEnemy(e, src); return true; }
  if (e.human) {
    e.hurtT = 10;
    if (chance(0.25) && src.kind !== 'flame' && src.kind !== 'laser') Snd.play('grunt');
    if (e.type !== 'heavy' && src.kind !== 'laser' && src.kind !== 'flame') e.vx += sgn(src.vx || (e.x - (src.x || e.x)) || 1) * 0.5;
    if (e.state === 'idle') { e.state = 'alert'; e.t = 0; }
  }
  return false;
}
function killEnemy(e, src) {
  if (e.dead) return;
  e.dead = true; e.t = 0; e.rot = 0; e.lie = 0;
  G.kills++;
  addScore(e.score, e.x, e.y - e.h - 8);
  const T = ETYPES[e.type];
  const k = src.kind;
  if (e.drop) spawnPickup(e.drop, e.x, e.y - 12, 0, -3);
  else if (e.human && chance(0.07)) spawnPickup(pick(['coin', 'apple', 'banana', 'coin', 'chicken']), e.x, e.y - 12, 0, -3);
  if (T.onDie && T.onDie(e, src) === 'custom') return;
  const dir = sgn(src.vx || (e.x - (src.x !== undefined ? src.x : e.x - e.face)) || -e.face);
  e.death = k === 'flame' ? 'burn' : (k === 'blast' || k === 'rocket') ? 'blast' : k === 'knife' ? 'knife' : k === 'crush' ? 'squish' : k === 'laser' ? 'fry' : 'fly';
  e.hurtT = 0;
  switch (e.death) {
    case 'fly': e.vy = -3.2; e.vx = dir * 1.5; Snd.play('scream'); if (chance(0.3)) bubble(e, pick(['ARGH!', 'OOF!', 'MAMA!', 'NOO!', 'UGH!']), 30); break;
    case 'blast': e.vy = -6; e.vx = dir * rnd(2, 3.4); Snd.play('scream'); break;
    case 'knife': e.vy = -1.5; e.vx = dir * 0.6; Snd.play('grunt'); break;
    case 'burn': e.bdir = chance(0.5) ? 1 : -1; Snd.play('scream'); bubble(e, pick(['HOT HOT HOT!', 'AAAH!', 'FIRE!']), 40); break;
    case 'fry': e.vx = 0; Snd.play('scream'); break;
    case 'squish': e.vx = 0; e.vy = 0; dust(e.x, e.y, 6); stars(e.x, e.y - 4, 5); break;
  }
}
function updateHumanDeath(e) {
  e.t++;
  switch (e.death) {
    case 'fly': case 'blast': case 'knife':
      e.vy = Math.min(e.vy + 0.3, 6);
      e.vx *= e.onGround ? 0.75 : 0.99;
      moveBody(e, false);
      if (!e.onGround) {
        if (e.death === 'blast') { if (e.t % 4 === 0) e.rot = (e.rot + 1) % 4; if (e.t % 3 === 0) smoke(e.x, e.y - 12, 1, 0.5); }
        else if (e.t > 5) e.rot = e.face > 0 ? 3 : 1;
      } else {
        if (e.rot % 2 === 0 && e.t > 3) e.rot = e.face > 0 ? 3 : 1;
        if (e.rot % 2 === 1) { if (++e.lie === 1) { dust(e.x, e.y, 4); Snd.play('land'); } }
      }
      if (e.lie > 55 || e.t > 240) e.remove = true;
      break;
    case 'burn':
      if (e.t < 50) {
        e.vx = e.bdir * 1.2; humanPhys(e);
        if (e.hitWall) e.bdir *= -1;
        if (e.t % 2 === 0) fireBurst(e.x + rnd(-4, 4), e.y - rnd(4, 24), 1, 2, 1.2);
      } else {
        for (let i = 0; i < 10; i++) { const p = part('ash', e.x + rnd(-6, 6), e.y - rnd(0, 20), rnd(-0.6, 0.6), rnd(-0.5, 0.5), rndi(30, 60), 2, pick(['#3a3036', '#222', '#5a5058'])); p.g = 0.1; p.bounce = 0.2; }
        smoke(e.x, e.y - 8, 3, 0.8);
        e.remove = true;
      }
      break;
    case 'fry':
      if (e.t > 36) {
        for (let i = 0; i < 8; i++) { const p = part('ash', e.x + rnd(-5, 5), e.y - rnd(0, 22), rnd(-0.4, 0.4), rnd(-1, 0), rndi(30, 50), 2, pick(['#a0f8ff', '#ffffff', '#40c8ff'])); p.g = 0.05; }
        e.remove = true;
      }
      break;
    case 'squish':
      if (e.t > 70) e.remove = true;
      break;
    default: e.remove = true;
  }
}
function drawHumanDeath(e, st, gun) {
  if (e.death === 'squish') {
    const S = ST[st];
    fr(-10, -3, 20, 3, S.shirt); fr(-12, -2, 6, 2, S.pants); fr(6, -4, 7, 3, S.hatC || S.skin); fr(8, -3, 1, 1, INK); fr(10, -3, 1, 1, INK);
    fdraw(e.x, e.y, e.face < 0);
    if (e.t > 50 && (e.t & 1)) return;
    return;
  }
  if (e.lie > 30 && (e.t & 2)) return;
  const pose = { leg: 'fall', face: 'dead', arm: 'panic', ph: 0 };
  let flash = null;
  if (e.death === 'burn') { pose.leg = 'run'; pose.ph = (e.t * 0.08) % 1; pose.arm = 'panic'; pose.face = 'panic'; flash = e.t < 20 && (e.t & 2) ? '#ff8040' : '#2a1e22'; }
  if (e.death === 'fry') { flash = (e.t >> 1) % 2 ? '#ffffff' : '#40c8ff'; pose.leg = 'stand'; pose.arm = 'panic'; }
  if (e.death === 'knife' && e.t < 10) { pose.leg = 'stand'; pose.face = 'hurt'; pose.arm = 'down'; }
  const lying = e.rot % 2 === 1;
  drawHuman(e.x, e.y + (lying ? 8 : 0), e.face, ST[st], pose, flash, e.rot);
  if (e.death === 'fry' && (e.t >> 1) % 2 === 0) drawSkeleton(e.x, e.y, e.face);
}
function drawSkeleton(x, y, face) {
  const c = '#1a3040';
  fr(-1, -18, 3, 9, c); fr(-4, -16, 8, 1, c); fr(-4, -13, 8, 1, c); fr(-3, -25, 7, 6, c); fr(-2, -23, 1, 1, '#fff', 1); fr(1, -23, 1, 1, '#fff', 1);
  fr(-3, -9, 2, 9, c); fr(2, -9, 2, 9, c); fr(-6, -17, 2, 7, c); fr(5, -17, 2, 7, c);
  fdraw(x, y, face < 0, null, 0, 0, null);
}
// generic entry behaviours shared by foot soldiers
function entryUpdate(e) {
  switch (e.state) {
    case 'para':
      e.t++; e.vy = e.t < 20 ? 2 : 1.25; e.vx = Math.sin(e.t * 0.05) * 0.45;
      moveBody(e, false);
      if (e.t % 70 === 35 && targetAlive() && e.y > 50) {
        const p = pTarget(); e.face = sgn(p.x - e.x) || e.face;
        eShoot(e.x + e.face * 8, e.y - 14, p.x, p.y - p.h * 0.5, G.bulletSpd || 2.2);
      }
      if (e.onGround) { e.state = 'act'; e.t = 0; e.vx = 0; for (let i = 0; i < 6; i++) { const p = part('debris', e.x + rnd(-10, 10), e.y - 36, rnd(-1, 1), rnd(-1, 0.5), 30, 2, '#e8e0c8'); p.g = 0.05; } }
      return true;
    case 'runin':
      e.t++; e.face = sgn(e.tx - e.x);
      e.vx = e.face * (e.runSpd || 1.5);
      humanPhys(e);
      if (e.hitWall && e.onGround) e.vy = -4.5;
      if (Math.abs(e.x - e.tx) < 4 || e.t > 240) { e.state = 'act'; e.t = 0; e.vx = 0; }
      return true;
    case 'window':
      e.t++; e.vx = 0; humanPhys(e);
      if (e.t === 2) { bubble(e, pick(['HEY YOU!', 'THERE!', 'INTRUDER!']), 30); Snd.play('alert'); }
      if (e.t > 30) { e.state = 'jumpout'; e.vy = -3.4; e.vx = e.face * 1.1; e.dropT = 20; e.t = 0; }
      return true;
    case 'jumpout':
      e.t++; humanPhys(e);
      if (e.onGround && e.t > 5) { e.state = 'act'; e.t = 0; e.vx = 0; dust(e.x, e.y, 3); }
      return true;
  }
  return false;
}
function humanPose(e, gun) {
  const pose = { leg: 'stand', ph: e.ph || 0, aim: e.aimA, gun: gun || 'rifle', arm: 'gun', face: 'n', bob: 0 };
  if (!e.onGround && e.state !== 'para') pose.leg = e.vy < 0 ? 'jump' : 'fall';
  else if (Math.abs(e.vx) > 0.25) { pose.leg = 'run'; e.ph = ((e.ph || 0) + Math.abs(e.vx) * 0.05) % 1; pose.ph = e.ph; pose.aim = 0.15; }
  if (e.kneel && e.state === 'shoot') pose.leg = 'crouch';
  if (e.hurtT > 0) pose.face = 'hurt';
  return pose;
}
function drawParachute(e) {
  const x = Math.round(e.x), y = Math.round(e.y) - 40, sw = Math.round(Math.sin(e.t * 0.05) * 2);
  ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 13 + sw, y + 2); ctx.lineTo(x - 2, y + 20); ctx.moveTo(x + 13 + sw, y + 2); ctx.lineTo(x + 2, y + 20); ctx.stroke();
  fr(-15, -6, 30, 5, '#e8e0c8'); fr(-12, -9, 24, 3, '#e8e0c8'); fr(-7, -11, 14, 2, '#e8e0c8');
  fr(-15, -2, 30, 2, '#b8a888'); fr(-5, -9, 10, 7, '#c83028');
  fdraw(x + sw, y + 3);
}

// ----------------------------------------------------------------- SOLDIER
ETYPES.soldier = {
  init: () => ({ score: 100, hp: 2 }),
  update(e) {
    if (entryUpdate(e)) return;
    const p = pTarget(), dx = p.x - e.x, adx = Math.abs(dx), alive = targetAlive();
    e.t++;
    switch (e.state) {
      case 'idle':
        humanPhys(e); e.vx = 0;
        if (e.idle === 'sleep' && e.t % 60 === 0 && onScreen(e)) floatText(e.x + 6, e.y - 22, 'z', '#ffffff', 1, 40);
        if (e.idle === 'chat' && e.t % 150 === 30 && onScreen(e)) bubble(e, pick(['...SO BORED', 'NICE DAY', 'HEH HEH', 'LUNCH?']), 60);
        if (onScreen(e, 10) && (adx < 250 || e.hurtT > 0)) {
          e.state = 'alert'; e.t = 0; e.vy = -2.6; bubble(e, '!', 28); Snd.play('alert');
        }
        break;
      case 'alert':
        humanPhys(e); e.face = sgn(dx); if (e.t > 24) { e.state = 'act'; e.t = 0; }
        break;
      case 'act': {
        e.face = sgn(dx) || e.face;
        let want = 0;
        if (adx > 190) want = sgn(dx) * 0.75; else if (adx < 70) want = -sgn(dx) * 0.6;
        if (want && !floorAhead(e, sgn(want))) want = 0;
        e.vx = approach(e.vx, want, 0.1);
        humanPhys(e);
        if (e.hitWall && e.onGround && want) e.vy = -4.5;
        e.cd--;
        if (alive && adx < 40 && chance(0.015)) {
          e.state = 'panic'; e.t = 0; e.pdir = -sgn(dx); bubble(e, pick(['AIEEE!', 'YIKES!', 'MOMMY!', 'NOPE!']), 40); Snd.play('scream');
        } else if (alive && e.cd <= 0 && onScreen(e, -8)) {
          if (adx > 70 && adx < 210 && chance(0.26 * G.diff)) { e.state = 'throw'; e.t = 0; }
          else { e.state = 'shoot'; e.t = 0; e.kneel = chance(0.4); }
          e.cd = Math.round(rndi(80, 140) * G.cdMul);
        }
        break;
      }
      case 'shoot':
        e.vx = approach(e.vx, 0, 0.2); humanPhys(e); e.face = sgn(dx) || e.face; aimAt(e, p);
        if (alive && (e.t === 18 || (e.t === 28 && G.zone >= 1) || (e.t === 38 && G.zone >= 2))) { const m = humanMuzzle(e); eShoot(m.x, m.y, p.x, p.y - p.h * 0.55, G.bulletSpd); }
        if (e.t > 46) { e.state = 'act'; e.t = 0; e.kneel = false; }
        break;
      case 'throw':
        e.vx = 0; humanPhys(e);
        if (e.t === 10 && alive) enemyGrenade(e, p);
        if (e.t > 22) { e.state = 'act'; e.t = 0; }
        break;
      case 'panic':
        e.vx = e.pdir * 1.7; humanPhys(e);
        if (e.hitWall || !floorAhead(e, e.pdir)) e.pdir *= -1;
        if (e.t % 5 === 0) { const s = part('sweat', e.x + rnd(-4, 4), e.y - 26, rnd(-1, 1), -1.5, 20, 1); s.g = 0.15; }
        if (e.t > 70) { e.state = 'act'; e.t = 0; }
        break;
    }
  },
  draw(e) {
    const st = e.st;
    if (e.dead) return drawHumanDeath(e, st);
    const pose = humanPose(e);
    switch (e.state) {
      case 'idle':
        if (e.idle === 'sleep') { pose.leg = 'sit'; pose.arm = 'down'; pose.face = 'happy'; }
        else { pose.arm = e.carry ? 'carry' : 'down'; pose.bob = (e.t >> 5) % 2 ? -1 : 0; }
        break;
      case 'alert': pose.face = 'panic'; pose.arm = 'panic'; break;
      case 'throw': pose.arm = 'throw'; pose.at = Math.min(1, e.t / 14); break;
      case 'panic': pose.arm = 'panic'; pose.face = 'panic'; break;
      case 'window': pose.face = 'shout'; pose.arm = 'wave'; break;
      case 'shoot': pose.face = e.t > 14 ? 'shout' : 'n'; break;
      case 'para': pose.leg = 'fall'; pose.arm = 'down'; drawParachute(e); break;
    }
    if (e.carry) { pose.arm = 'carry'; drawBarrelSpr(e.x, e.y - 28, null); }
    drawHuman(e.x, e.y, e.face, ST[st], pose, e.flash > 0 ? '#ffffff' : null);
  },
  dieUpdate: updateHumanDeath
};

// ----------------------------------------------------------------- RUSHER
ETYPES.rusher = {
  init: () => ({ score: 150, hp: 2, st: 'rusher', runSpd: 2.2 }),
  update(e) {
    if (e.state === 'runin') { e.state = 'act'; bubble(e, pick(['YAAAAH!', 'CHAAARGE!', 'HIYAAA!']), 40); Snd.play('yell'); }
    if (entryUpdate(e)) return;
    const p = pTarget(), dx = p.x - e.x, adx = Math.abs(dx), alive = targetAlive();
    e.t++;
    switch (e.state) {
      case 'idle':
        humanPhys(e);
        if (onScreen(e, 10) && adx < 260) { e.state = 'act'; e.t = 0; bubble(e, 'YAAAH!', 36); Snd.play('yell'); }
        break;
      case 'act':
        e.face = sgn(dx) || e.face;
        e.vx = approach(e.vx, adx > 14 ? e.face * 2.3 : 0, 0.25);
        humanPhys(e);
        if (e.hitWall && e.onGround) e.vy = -5.2;
        if (G.t % 9 === 0 && e.onGround) dust(e.x, e.y, 1);
        if (alive && adx < 24 && e.y - e.h < p.y && p.y - p.h < e.y) { e.state = 'slash'; e.t = 0; e.vx = 0; }
        break;
      case 'slash':
        e.vx = 0; humanPhys(e);
        if (e.t === 10) Snd.play('knife');
        if (e.t === 12 && alive && adx < 28 && e.y - e.h < p.y && p.y - p.h < e.y) hurtPlayer(e, 1);
        if (e.t > 32) { e.state = 'retreat'; e.t = 0; }
        break;
      case 'retreat':
        e.vx = -e.face * 1.6; humanPhys(e);
        if (e.t > 22 || e.hitWall) { e.state = 'act'; e.t = 0; }
        break;
    }
  },
  draw(e) {
    if (e.dead) return drawHumanDeath(e, 'rusher');
    const pose = humanPose(e, 'knife');
    pose.arm = 'knife'; pose.at = 0.05; pose.face = 'shout';
    if (e.state === 'slash') pose.at = e.t < 10 ? 0 : Math.min(1, (e.t - 10) / 5);
    if (e.state === 'idle') { pose.face = 'n'; pose.at = 0.2; }
    drawHuman(e.x, e.y, e.face, ST.rusher, pose, e.flash > 0 ? '#ffffff' : null);
  },
  dieUpdate: updateHumanDeath
};

// ----------------------------------------------------------------- SNIPER
ETYPES.sniper = {
  init: () => ({ score: 300, hp: 2, h: 18, st: 'sniper', lx: 0, ly: 0 }),
  update(e) {
    const p = pTarget(), alive = targetAlive();
    humanPhys(e); e.vx = 0;
    e.t++;
    e.face = sgn(p.x - e.x) || e.face;
    const visible = e.x > G.cam.x + 14 && e.x < G.cam.x + W - 14;
    if (!visible || !alive) { if (e.state !== 'idle') { e.state = 'idle'; e.t = 0; } return; }
    switch (e.state) {
      case 'idle': e.state = 'aim'; e.t = 0; e.lx = p.x - e.face * 60; e.ly = p.y - 40; break;
      case 'aim':
        e.lx = lerp(e.lx, p.x, 0.07); e.ly = lerp(e.ly, p.y - p.h * 0.6, 0.07);
        if (e.t >= 80) { e.state = 'lock'; e.t = 0; Snd.play('beep'); }
        break;
      case 'lock':
        if (e.t === 20) {
          const m = this.muzzle(e);
          eShoot(m.x, m.y, e.lx, e.ly, 6.2, 'snipe', 2.5);
          Snd.play('snipershot'); shake(2);
        }
        if (e.t > 30) { e.state = 'cool'; e.t = 0; }
        break;
      case 'cool': if (e.t > 90 * G.cdMul) { e.state = 'aim'; e.t = 0; } break;
    }
    const m = this.muzzle(e);
    e.aimA = clamp(Math.atan2(e.ly - m.y, Math.abs(e.lx - e.x)), -1.2, 1.2);
  },
  muzzle(e) { const g = armGeom(ST.sniper, { leg: 'crouch', aim: e.aimA, gun: 'sniper' }); return { x: e.x + g.mx * e.face, y: e.y + g.my }; },
  draw(e) {
    if (e.dead) return drawHumanDeath(e, 'sniper');
    if (e.state === 'aim' || e.state === 'lock') {
      const m = this.muzzle(e);
      const a = Math.atan2(e.ly - m.y, e.lx - m.x);
      const blink = e.state === 'lock' && (e.t >> 1) % 2;
      ctx.globalAlpha = e.state === 'lock' ? 0.9 : 0.35 + (e.t / 80) * 0.4;
      ctx.strokeStyle = blink ? '#ffffff' : '#ff2020'; ctx.lineWidth = e.state === 'lock' ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + Math.cos(a) * 420, m.y + Math.sin(a) * 420); ctx.stroke();
      ctx.globalAlpha = 1;
      dcirc(e.lx, e.ly, blink ? 3 : 2, '#ff3030');
    }
    const pose = { leg: 'crouch', aim: e.aimA, gun: 'sniper', arm: 'gun', face: e.state === 'lock' ? 'shout' : 'n' };
    if (e.hurtT > 0) pose.face = 'hurt';
    drawHuman(e.x, e.y, e.face, ST.sniper, pose, e.flash > 0 ? '#ffffff' : null);
  },
  onDie(e) { bubble(e, 'WAAAAH!', 40); },
  dieUpdate: updateHumanDeath
};

// ----------------------------------------------------------------- HEAVY GUNNER
ETYPES.heavy = {
  init: () => ({ score: 800, hp: 18, w: 18, h: 28, armor: 0.55, st: 'heavy', runSpd: 0.8 }),
  update(e) {
    if (entryUpdate(e)) return;
    const p = pTarget(), dx = p.x - e.x, adx = Math.abs(dx), alive = targetAlive();
    e.t++;
    switch (e.state) {
      case 'idle':
        humanPhys(e);
        if (onScreen(e, 0) && adx < 280) { e.state = 'act'; e.t = 0; bubble(e, pick(['HRRRM.', 'SMASH!', 'MY GUN IS HUNGRY']), 50); }
        break;
      case 'act': {
        e.face = sgn(dx) || e.face;
        let want = 0;
        if (adx > 170) want = sgn(dx) * 0.45; else if (adx < 90) want = -sgn(dx) * 0.35;
        if (want && !floorAhead(e, sgn(want))) want = 0;
        e.vx = approach(e.vx, want, 0.05);
        humanPhys(e);
        if (e.onGround && Math.abs(e.vx) > 0.2 && G.t % 20 === 0) { dust(e.x, e.y, 2); shake(1); }
        e.cd--;
        if (alive && e.cd <= 0 && onScreen(e, -10)) { e.state = 'spin'; e.t = 0; Snd.play('spin'); }
        break;
      }
      case 'spin':
        e.vx = 0; humanPhys(e); aimAt(e, p, 0.5);
        if (e.t > 30) { e.state = 'fire'; e.t = 0; }
        break;
      case 'fire':
        e.vx = 0; humanPhys(e); aimAt(e, p, 0.5);
        if (e.t % 4 === 0 && alive) {
          const m = humanMuzzle(e, 'mg');
          const a = Math.atan2(Math.sin(e.aimA), Math.cos(e.aimA) * e.face) + rnd(-0.07, 0.07);
          G.eShots.push({ kind: 'eb', x: m.x, y: m.y, vx: Math.cos(a) * 2.8, vy: Math.sin(a) * 2.8, life: 260, r: 2.5 });
          muzzle(m.x, m.y, a, 4); Snd.play('mg'); shellCasing(e.x, e.y - 18, e.face);
        }
        if (e.t > 44) { e.state = 'act'; e.t = 0; e.cd = Math.round(110 * G.cdMul); }
        break;
    }
  },
  onHurt(e) {
    if (!e.helmetOff && e.hp < e.maxHp / 2) {
      e.helmetOff = true;
      debris(e.x, e.y - 30, 6, ['#565e68', '#3a4048', '#8a929c'], 1.2);
      bubble(e, pick(['MY HELMET!', 'YOU\'LL PAY!']), 50);
      Snd.play('clank');
    }
  },
  onDie(e) {
    e.death = 'topple'; Snd.play('scream'); bubble(e, 'OOOF...', 40);
    return 'custom';
  },
  dieUpdate(e) {
    e.t++; humanPhys(e); e.vx *= 0.9;
    if (e.t === 14) { e.rot = e.face > 0 ? 3 : 1; dust(e.x, e.y, 8); shake(4); Snd.play('land'); }
    if (e.t === 40) { spawnBoom(e.x, e.y - 8, 18); }
    if (e.t > 90) e.remove = true;
  },
  draw(e) {
    const pose = humanPose(e, 'mg');
    pose.noHat = e.helmetOff;
    pose.face = 'shout';
    if (e.dead) {
      pose.face = 'dead'; pose.arm = 'down'; pose.leg = 'stand';
      if (e.t > 70 && (e.t & 2)) return;
      drawHuman(e.x, e.y + (e.rot % 2 ? 8 : 0), e.face, ST.heavy, pose, null, e.rot);
      return;
    }
    if (e.state === 'spin' || e.state === 'fire') pose.bob = (G.t >> 1) % 2 ? -1 : 0;
    drawHuman(e.x, e.y, e.face, ST.heavy, pose, e.flash > 0 ? '#ffffff' : null);
    if (e.state === 'spin' && (G.t >> 1) % 2) { const m = humanMuzzle(e, 'mg'); sparks(m.x, m.y, 1, '#ffe040', 0.3); }
  }
};

// ----------------------------------------------------------------- MG NEST GUNNER
ETYPES.gunner = {
  init: () => ({ score: 300, hp: 3, w: 14, h: 20, st: 'soldier' }),
  update(e) {
    const p = pTarget(), dx = p.x - e.x, alive = targetAlive();
    humanPhys(e); e.vx = 0; e.t++;
    switch (e.state) {
      case 'idle':
        if (onScreen(e, -20) && Math.abs(dx) < 330) { e.state = 'burst'; e.t = 0; bubble(e, 'OPEN FIRE!', 36); Snd.play('alert'); }
        break;
      case 'burst':
        if (e.t % 5 === 0 && alive) {
          const y = e.y - 19 + Math.sin(e.t * 0.3) * 1.2, x = e.x + e.face * 18;
          G.eShots.push({ kind: 'eb', x, y, vx: e.face * 3.2, vy: 0, life: 200, r: 2.5 });
          muzzle(x, y, e.face > 0 ? 0 : PI, 5); Snd.play('mg'); shellCasing(e.x + e.face * 6, e.y - 18, e.face);
        }
        if (e.t > 55) { e.state = 'pause'; e.t = 0; }
        break;
      case 'pause':
        if (Math.abs(dx) > 10 && sgn(dx) !== e.face && e.t > 20) { e.face = sgn(dx); bubble(e, 'HUH?', 24); }
        if (e.t > 75 * G.cdMul) { e.state = 'burst'; e.t = 0; }
        break;
    }
  },
  draw(e) {
    if (e.dead) return drawHumanDeath(e, 'soldier');
    const pose = { leg: 'crouch', arm: 'hold', face: e.state === 'burst' ? 'shout' : 'n', bob: e.state === 'burst' && (G.t & 2) ? -1 : 0 };
    if (e.hurtT > 0) pose.face = 'hurt';
    drawHuman(e.x - e.face * 2, e.y, e.face, ST.soldier, pose, e.flash > 0 ? '#ffffff' : null);
    // mounted gun + tripod + sandbags
    fline(8, -1, 11, -12, 2, '#3a3a40'); fline(14, -1, 11, -12, 2, '#3a3a40');
    fr(4, -22, 14, 5, '#4a4e58'); fr(17, -21, 8, 2, '#2a2a30'); fr(6, -24, 5, 2, '#6a5a2a');
    fr(9, -9, 12, 5, '#c8b080'); fr(8, -4, 14, 4, '#b8a070'); fr(10, -8, 4, 1, '#e0d0a0'); fr(15, -3, 5, 1, '#e0d0a0');
    fdraw(e.x, e.y, e.face < 0, e.flash > 0 ? '#ffffff' : null);
  },
  dieUpdate: updateHumanDeath
};

// ----------------------------------------------------------------- SUICIDE BOMBER
ETYPES.bomber = {
  init: () => ({ score: 200, hp: 1, st: 'bomber', runSpd: 2.0 }),
  update(e) {
    if (e.state === 'runin' && e.t === 0) { bubble(e, pick(['KABOOM TIME!', 'FOR THE BOSS!', 'HUG ME!']), 50); Snd.play('yell'); }
    if (e.state === 'runin' || e.state === 'idle') { e.state = 'act'; }
    if (entryUpdate(e)) return;
    const p = pTarget(), dx = p.x - e.x, alive = targetAlive();
    e.t++;
    e.face = sgn(dx) || e.face;
    e.vx = approach(e.vx, e.face * 2.0, 0.2);
    humanPhys(e);
    if (e.hitWall && e.onGround) e.vy = -5;
    if (e.t % 3 === 0) { const s = part('spark', e.x + e.face * 3, e.y - 22, rnd(-1, 1), rnd(-2, -0.5), 8, 1, '#ffe040'); s.g = 0.1; }
    if (e.t % 20 === 0) Snd.play('fuse');
    if (alive && bodiesHit(e, p)) {
      e.dead = true; e.remove = true;
      explodeAt(e.x, e.y - 12, 32, 4, 'n');
    }
  },
  onDie(e) { e.death = 'fuse'; bubble(e, 'UH OH...', 30); return 'custom'; },
  dieUpdate(e) {
    e.t++; e.vx *= 0.9; humanPhys(e);
    if (e.t > 16) { e.remove = true; explodeAt(e.x, e.y - 12, 32, 5, 'n'); }
  },
  draw(e) {
    const pose = humanPose(e);
    pose.arm = 'panic'; pose.face = 'shout';
    const fl = e.dead ? ((e.t >> 1) % 2 ? '#ffffff' : '#ff4040') : (e.flash > 0 ? '#ffffff' : null);
    drawHuman(e.x, e.y, e.face, ST.bomber, pose, fl);
  }
};

// ----------------------------------------------------------------- BARREL CARRIER
ETYPES.carrier = {
  init: () => ({ score: 200, hp: 2, st: 'carrier', carry: true, runSpd: 1.2 }),
  update(e) {
    if (entryUpdate(e)) return;
    const p = pTarget(), dx = p.x - e.x, adx = Math.abs(dx), alive = targetAlive();
    e.t++;
    switch (e.state) {
      case 'idle':
        humanPhys(e);
        if (onScreen(e, 0) && adx < 260) { e.state = 'act'; e.t = 0; bubble(e, 'SPECIAL DELIVERY!', 50); }
        break;
      case 'act':
        e.face = sgn(dx) || e.face;
        e.vx = approach(e.vx, adx > 130 ? e.face * 0.8 : 0, 0.1);
        humanPhys(e);
        if (alive && adx < 180 && onScreen(e, -10) && e.t > 20) { e.state = 'throwb'; e.t = 0; }
        break;
      case 'throwb':
        e.vx = 0; humanPhys(e);
        if (e.t === 14) {
          e.carry = false;
          const b = mkProp('barrel', e.x + e.face * 6, e.y - 22);
          b.rolling = true; b.vx = e.face * 2.3; b.vy = -2.5; b.rollT = 0;
          G.props.push(b);
          bubble(e, 'CATCH!', 30); Snd.play('throw');
        }
        if (e.t > 28) { e.type = 'soldier'; e.state = 'act'; e.t = 0; e.cd = 60; }
        break;
    }
  },
  onHurt(e) {
    if (e.carry) {
      e.carry = false; e.hp = 0;
      explodeAt(e.x, e.y - 30, 32, 6, 'n');
    }
  },
  draw(e) {
    if (e.dead) return drawHumanDeath(e, 'carrier');
    const pose = humanPose(e);
    pose.arm = e.carry ? 'carry' : 'throw'; pose.face = 'shout';
    if (e.state === 'throwb') pose.at = Math.min(1, e.t / 14);
    if (e.carry) {
      const by = e.state === 'throwb' ? e.y - 30 + e.t * 0.2 : e.y - 29 + (Math.abs(e.vx) > 0.2 && (G.t >> 3) % 2 ? 1 : 0);
      drawBarrelSpr(e.x + (e.state === 'throwb' ? e.face * e.t * 0.3 : 0), by, null);
    }
    drawHuman(e.x, e.y, e.face, ST.carrier, pose, e.flash > 0 ? '#ffffff' : null);
  },
  dieUpdate: updateHumanDeath
};

// ----------------------------------------------------------------- DRONE
ETYPES.drone = {
  init: () => ({ score: 200, hp: 3, w: 18, h: 10, human: false, state: 'enter', bombCd: 60, fireCd: 90 }),
  update(e) {
    const p = pTarget(), alive = targetAlive();
    e.t++;
    const minY = ceilBottom(e.x) + 16;
    if (e.state === 'enter') {
      e.x += -1.7; e.y += (Math.max(minY, e.ty) - e.y) * 0.05;
      if (e.x < e.tx) e.state = 'hover';
      return;
    }
    const tx = p.x + Math.sin(e.t * 0.02 + e.seed) * 70;
    const ty = clamp(p.y - 88 + Math.sin(e.t * 0.05) * 8, minY, 150);
    e.vx = approach(e.vx, clamp((tx - e.x) * 0.03, -1.8, 1.8), 0.07);
    e.vy = approach(e.vy, clamp((ty - e.y) * 0.04, -1.2, 1.2), 0.06);
    e.x += e.vx; e.y += e.vy;
    e.x = clamp(e.x, G.cam.x + 10, G.cam.x + W - 10);
    e.bombCd--; e.fireCd--;
    e.bombReady = e.bombCd <= 0;
    if (alive && e.bombCd <= 0 && Math.abs(p.x - e.x) < 18) {
      G.eShots.push({ kind: 'bomb', x: e.x, y: e.y + 4, vx: e.vx * 0.4, vy: 0.4, life: 220, r: 3 });
      e.bombCd = Math.round(100 * G.cdMul); Snd.play('beep');
    }
    if (alive && e.fireCd <= 0) { eShoot(e.x, e.y + 2, p.x, p.y - 12, 2.2); e.fireCd = Math.round(170 * G.cdMul); }
    if (G.t % 6 === 0) Snd.play('helicopter');
  },
  onDie(e) { e.vy = -1; e.vx = e.vx || rnd(-1, 1); Snd.play('smallboom'); sparks(e.x, e.y - 5, 8); return 'custom'; },
  dieUpdate(e) {
    e.t++; e.vy += 0.18; e.x += e.vx; e.y += e.vy;
    if (e.t % 4 === 0) e.rot = (e.rot + 1) % 4;
    if (e.t % 2 === 0) smoke(e.x, e.y - 4, 1, 0.6);
    if (solidAt(e.x, e.y) || e.y > H) { explodeAt(e.x, e.y - 4, 22, 4, 'p'); e.remove = true; }
  },
  draw(e) { drawDroneSpr(e.x, e.y - 5, e, e.flash > 0 ? '#ffffff' : null); }
};

// ----------------------------------------------------------------- TURRET
ETYPES.turret = {
  init: () => ({ score: 500, hp: 10, w: 16, h: 12, human: false, ang: PI, charge: 0, cd: 60 }),
  update(e) {
    const p = pTarget(), alive = targetAlive();
    if (!onScreen(e, -6)) return;
    const py = e.ceiling ? e.y - 4 : e.y - 8;
    let want = Math.atan2(p.y - p.h / 2 - py, p.x - e.x);
    if (!e.ceiling) { if (want > 0) want = want > PI / 2 ? -PI : 0; }
    else { if (want < 0) want = want < -PI / 2 ? PI : 0; }
    let d = want - e.ang; while (d > PI) d -= TAU; while (d < -PI) d += TAU;
    e.ang += clamp(d, -0.035, 0.035);
    e.cd--;
    if (e.charge > 0) {
      e.charge--;
      if (e.charge % 7 === 3 && alive) {
        const mx = e.x + Math.cos(e.ang) * 13, my = py + Math.sin(e.ang) * 13;
        G.eShots.push({ kind: 'eb', x: mx, y: my, vx: Math.cos(e.ang) * 2.6, vy: Math.sin(e.ang) * 2.6, life: 260, r: 2.5 });
        muzzle(mx, my, e.ang, 4); Snd.play('enemyshot');
      }
      if (e.charge === 0) e.cd = Math.round(120 * G.cdMul);
    } else if (alive && e.cd <= 0 && Math.abs(d) < 0.15) e.charge = 24;
  },
  onDie(e) { explodeAt(e.x, e.y - 6, 26, 4, 'p'); e.remove = true; debris(e.x, e.y - 6, 8, ['#6a707c', '#3e4048', '#8a929e'], 1.2); return 'custom'; },
  dieUpdate(e) { e.remove = true; },
  draw(e) {
    const anchorY = e.ceiling ? e.y - 12 : e.y;
    drawTurretSpr(e.x, anchorY, e, e.flash > 0 ? '#ffffff' : null);
  }
};

// ----------------------------------------------------------------- JEEP
ETYPES.jeep = {
  init: () => ({ score: 2000, hp: 30, w: 44, h: 20, human: false, state: 'enter', face: -1, gunA: PI }),
  update(e) {
    const p = pTarget(), alive = targetAlive();
    e.t++;
    e.vy = Math.min(e.vy + 0.35, 7);
    const home = G.cam.x + W - 70;
    switch (e.state) {
      case 'enter':
        e.vx = -3;
        if (e.x < home) { e.state = 'hold'; e.t = 0; dust(e.x - 14, e.y, 6); }
        break;
      case 'hold':
        e.vx = approach(e.vx, 0, 0.15);
        if (alive && e.t % 70 < 36 && e.t % 7 === 0) {
          const gx = e.x + 8, gy = e.y - 30;
          const a = Math.atan2(p.y - p.h * 0.5 - gy, p.x - gx);
          e.gunA = a;
          G.eShots.push({ kind: 'eb', x: gx + Math.cos(a) * 8, y: gy + Math.sin(a) * 8, vx: Math.cos(a) * 2.7, vy: Math.sin(a) * 2.7, life: 260, r: 2.5 });
          Snd.play('mg');
        }
        if (e.t > 170) { e.state = 'rev'; e.t = 0; bubble(e, 'VROOOM!', 40); }
        break;
      case 'rev':
        e.vx = Math.sin(e.t * 1.3) * 0.4;
        if (e.t % 4 === 0) smoke(e.x + 22, e.y - 6, 1, 0.8);
        if (e.t % 12 === 0) Snd.play('engine');
        if (e.t > 45) { e.state = 'charge'; e.t = 0; }
        break;
      case 'charge':
        e.vx = approach(e.vx, -4.3, 0.2);
        if (G.t % 3 === 0) dust(e.x + 20, e.y, 2);
        if (e.x < G.cam.x + 40) { e.state = 'back'; e.t = 0; shake(3); }
        break;
      case 'back':
        e.vx = approach(e.vx, 1.8, 0.1);
        if (e.x > home) { e.state = 'hold'; e.t = 0; }
        break;
    }
    moveBody(e, false);
    if (e.hitWall && e.onGround) e.vy = -5;   // hop over low steps instead of jamming against them
    if (alive && Math.abs(e.vx) > 1.5 && bodiesHit(e, p)) {
      if (G.tank && G.tank.occupied) { tankHurt(G.tank, 10); e.vx = 2; e.state = 'back'; damageEnemy(e, 4, { kind: 'blast', x: p.x }); }
      else hurtPlayer(e, 1);
    }
    if (e.hp < e.maxHp * 0.4 && G.t % 6 === 0) smoke(e.x, e.y - 14, 1, 0.7);
  },
  onDie(e) {
    explodeAt(e.x, e.y - 10, 44, 8, 'p');
    e.vy = -5; e.vx = 1; e.death = 'wreck';
    const s = mkEnemy('soldier', e.x + 8, e.y - 26, { active: true });
    s.dead = true; s.death = 'blast'; s.vy = -7; s.vx = 2.2; s.face = -1; s.t = 0; s.lie = 0;
    G.enemies.push(s); Snd.play('scream');
    return 'custom';
  },
  dieUpdate(e) {
    e.t++; e.vy = Math.min(e.vy + 0.35, 7); e.vx *= 0.97;
    moveBody(e, false);
    if (!e.onGround && e.t % 6 === 0) e.rot = Math.min(2, e.rot + 1);
    if (e.t % 5 === 0) { fireBurst(e.x + rnd(-14, 14), e.y - 10, 1, 4); smoke(e.x, e.y - 14, 1); }
    if (e.t === 30 || e.t === 60) spawnBoom(e.x + rnd(-10, 10), e.y - 10, 20);
    if (e.t > 260 || e.x < G.cam.x - 60) e.remove = true;
  },
  draw(e) {
    if (e.dead) { drawJeepSpr(e.x, e.y, e.face, e, '#3a2a28'); return; }
    drawJeepSpr(e.x, e.y, e.face, e, e.flash > 0 ? '#ffffff' : null);
    // gunner standing in the back
    const pose = { leg: 'stand', aim: 0, gun: 'hmg', arm: 'gun', face: 'shout' };
    const a = e.gunA; pose.aim = clamp(Math.atan2(Math.sin(a), -Math.cos(a)), -1, 1);
    drawHuman(e.x + 8, e.y - 14, -1, ST.soldier, pose, e.flash > 0 ? '#ffffff' : null);
  }
};

// ----------------------------------------------------------------- TRUCK
ETYPES.truck = {
  init: () => ({ score: 1500, hp: 35, w: 66, h: 40, human: false, state: 'enter', face: -1, n: 3, open: false }),
  update(e) {
    e.t++;
    e.vy = Math.min(e.vy + 0.35, 7);
    switch (e.state) {
      case 'enter':
        e.vx = approach(e.vx, -2.6, 0.2);
        if (e.x < G.cam.x + W - 90) { e.state = 'unload'; e.t = 0; e.vx = 0; dust(e.x - 30, e.y, 6); Snd.play('land'); }
        break;
      case 'unload':
        e.vx = approach(e.vx, 0, 0.3);
        e.open = true;
        if (e.t % 32 === 16 && e.n > 0) {
          const s = mkEnemy('soldier', e.x + 34, e.y - 4, { active: true, state: 'jumpout', vy: -3.6, vx: 1.2, face: 1, wave: e.wave });
          s.t = 0; G.enemies.push(s); e.n--;
          if (chance(0.5)) bubble(s, pick(['GO GO GO!', 'MOVE IT!', 'HUT HUT!']), 30);
        }
        if (e.n <= 0 && e.t > 40) { e.state = 'leave'; e.t = 0; e.wave = false; }
        break;
      case 'leave':
        e.open = false;
        e.vx = approach(e.vx, 2.6, 0.06);
        if (e.x > G.cam.x + W + 90) e.remove = true;
        break;
    }
    moveBody(e, false);
    if (e.hitWall && e.onGround) e.vy = -5;   // hop over low steps instead of jamming against them
    if (G.t % 8 === 0 && Math.abs(e.vx) > 0.5) dust(e.x + 30, e.y, 1);
  },
  onDie(e) {
    explodeAt(e.x, e.y - 20, 48, 8, 'p');
    e.death = 'wreck'; e.wave = false;
    return 'custom';
  },
  dieUpdate(e) {
    e.t++;
    if (e.t === 12 || e.t === 26) spawnBoom(e.x + rnd(-25, 25), e.y - rnd(10, 30), 26);
    if (e.t % 5 === 0) { fireBurst(e.x + rnd(-25, 25), e.y - 20, 1, 6); smoke(e.x, e.y - 30, 1, 1.2); }
    if (e.t > 300 || e.x < G.cam.x - 80) e.remove = true;
  },
  draw(e) { drawTruckSpr(e.x, e.y, e.face, e, e.dead ? '#3a2a28' : e.flash > 0 ? '#ffffff' : null); }
};

// ----------------------------------------------------------------- update / draw all
function updateEnemies() {
  const cx = G.cam.x;
  for (let i = 0; i < G.enemies.length; i++) {
    const e = G.enemies[i];
    if (!e.active) {
      if (e.x < cx + W + 24 && e.x > cx - 80) e.active = true;
      else continue;
    }
    if (e.flash > 0) e.flash--;
    if (e.hurtT > 0) e.hurtT--;
    const T = ETYPES[e.type];
    if (e.dead) { (T.dieUpdate || updateHumanDeath)(e); continue; }
    T.update(e);
    if (G.cam.lock !== null && e.wave && e.human) e.x = clamp(e.x, cx - 30, cx + W + 30);
    if (!e.wave && e.x < cx - 100) e.remove = true;
    if (e.y > H + 40) e.remove = true;
  }
  sweep(G.enemies);
}
function drawEnemies(x0, x1) {
  for (const e of G.enemies) {
    if (!e.active || e.x < x0 - 60 || e.x > x1 + 60) continue;
    ETYPES[e.type].draw(e);
  }
}

// ----------------------------------------------------------------- enemy projectiles
function updateEShots() {
  const cx = G.cam.x, t = pTarget(), alive = targetAlive();
  for (const s of G.eShots) {
    s.life--;
    if (s.kind === 'egren') {
      s.vy += 0.2; s.rot++;
      s.x += s.vx; if (solidAt(s.x, s.y)) { s.x -= s.vx; s.vx *= -0.4; }
      s.y += s.vy;
      if (s.vy > 0 && groundBelow(s.x, s.y) && (s.y - s.vy) <= Math.floor(s.y / TS) * TS + 0.5) { s.y = Math.floor(s.y / TS) * TS - 0.5; s.vy *= -0.4; s.vx *= 0.6; if (Math.abs(s.vy) < 0.6) s.vy = 0; else Snd.play('bounce'); }
      else if (solidAt(s.x, s.y)) { s.y -= s.vy; s.vy = 0; }
      if (s.life <= 0 || (alive && pointInBody(s.x, s.y, t, 2))) { explodeAt(s.x, s.y - 4, 26, 3, 'e'); s.remove = true; }
      continue;
    }
    if (s.kind === 'bomb') {
      s.vy = Math.min(s.vy + 0.16, 5); s.x += s.vx; s.y += s.vy;
      if (groundBelow(s.x, s.y) || (alive && pointInBody(s.x, s.y, t, 3)) || s.life <= 0) { explodeAt(s.x, s.y - 4, 22, 3, 'e'); s.remove = true; }
      continue;
    }
    if (s.kind === 'bshell' || s.kind === 'missile') { updateBossProjectile(s); continue; }
    if (s.g) s.vy += s.g;
    s.x += s.vx; s.y += s.vy;
    if (s.life <= 0 || s.x < cx - 40 || s.x > cx + W + 40 || s.y < -60 || s.y > H + 20) { s.remove = true; continue; }
    if (solidAt(s.x, s.y)) { sparks(s.x, s.y, 2, '#ff8040'); s.remove = true; continue; }
    if (alive && pointInBody(s.x, s.y, t, s.r)) {
      if (hurtPlayer(s, s.kind === 'ebb' ? 1 : 1)) { sparks(s.x, s.y, 4, '#ffb040'); s.remove = true; }
    }
  }
  sweep(G.eShots);
}
function drawEShots() {
  for (const s of G.eShots) {
    const x = Math.round(s.x), y = Math.round(s.y);
    switch (s.kind) {
      case 'eb': case 'snipe':
        dcirc(x, y, 3, OUTLINE); dcirc(x, y, 2, s.kind === 'snipe' ? '#ff3030' : '#ff7a20'); ctx.fillStyle = '#fff4c0'; ctx.fillRect(x - 1, y - 1, 2, 2);
        break;
      case 'ebb':
        dcirc(x, y, 5, OUTLINE); dcirc(x, y, 4, (G.t >> 2) % 2 ? '#ff40a0' : '#ff80c0'); dcirc(x, y, 2, '#ffffff');
        break;
      case 'egren': case 'bomb':
        ctx.fillStyle = OUTLINE; ctx.fillRect(x - 3, y - 3, 6, 7);
        ctx.fillStyle = s.kind === 'bomb' ? '#3a3a42' : '#6a5a3a'; ctx.fillRect(x - 2, y - 2, 4, 5);
        ctx.fillStyle = (s.life >> 2) % 2 ? '#ff3030' : '#ffe040'; ctx.fillRect(x, y - 3, 1, 1);
        break;
      default: drawBossProjectile(s);
    }
  }
}
