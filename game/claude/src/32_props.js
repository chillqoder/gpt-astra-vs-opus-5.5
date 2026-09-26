// =====================================================================
//  PROPS, CAPTIVES, PICKUPS, HAZARDS
// =====================================================================
function regTiles(p, tx, ty, w, h) {
  p.tiles = [];
  for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) {
    setTile(x, y, T_BREAK); BRK[y * LW + x] = p; p.tiles.push(y * LW + x);
  }
}
function clearTiles(p) {
  if (!p.tiles) return;
  for (const i of p.tiles) { if (tiles[i] === T_BREAK) tiles[i] = T_EMPTY; BRK[i] = null; }
  p.tiles = null;
}
function mkProp(type, x, y, o) {
  const p = Object.assign({ kind: 'prop', type, x, y, w: 16, h: 16, hp: 3, flash: 0, t: 0, shootable: false, blastable: false }, o || {});
  delete p.k;
  const tx = Math.floor(x / TS), ty = Math.round(y / TS);
  switch (type) {
    case 'crate': p.hp = 3; regTiles(p, tx, ty, 1, 1); p.y = (ty + 1) * TS; break;
    case 'sandbag': p.hp = 10; p.w = 32; regTiles(p, tx, ty, 2, 1); p.x = tx * TS + 16; p.y = (ty + 1) * TS; break;
    case 'crackwall': p.hp = 6; p.h = (o.h || 2) * TS; regTiles(p, tx, ty, 1, o.h || 2); p.y = (ty + (o.h || 2)) * TS; break;
    case 'crackfloor': p.hp = 5; p.w = (o.w || 2) * TS; regTiles(p, tx, ty, o.w || 2, 1); p.x = tx * TS + p.w / 2; p.y = (ty + 1) * TS; break;
    case 'bwall': p.hp = 999; p.invuln = true; p.h = o.h * TS; regTiles(p, tx, ty, 1, o.h); p.y = (ty + o.h) * TS; p.tx = tx; break;
    case 'barrel': p.hp = 3; p.w = 12; p.h = 16; p.shootable = true; p.blastable = true; p.vx = 0; p.vy = 0; break;
    case 'captive': p.w = 12; p.h = 20; p.shootable = true; p.blastable = true; p.state = 'tied'; p.vx = 0; p.vy = 0; p.face = 1; p.t = rndi(0, 150); break;
    case 'stalactite': p.anchor = y; p.y = y + 16; p.w = 10; p.h = 16; p.hp = 1; p.shootable = true; p.state = 'hang'; p.vy = 0; break;
    case 'rock': p.anchor = y; p.y = y + 12; p.w = 12; p.h = 12; p.hp = 1; p.state = 'shake'; p.vy = 0; break;
    case 'fakewall': p.x0 = tx * TS; p.y0 = ty * TS; p.pw = o.w * TS; p.ph = o.h * TS; p.alpha = 1; p.cv = makeFakeWallCanvas(p.pw, p.ph, o.style || 'rock'); break;
    case 'secret': p.x0 = tx * TS; p.pw = o.w; break;
    case 'checkpoint': p.raised = false; p.flag = 0; break;
    case 'car': break;
  }
  return p;
}
function hitProp(p, dmg, src) {
  if (p.remove) return;
  if (p.type === 'captive') { if (p.state === 'tied') freeCaptive(p); return; }
  if (p.type === 'stalactite') { if (p.state === 'hang') { p.state = 'shake'; p.t = 25; } return; }
  if (p.invuln) { if (src.kind !== 'blast' && G.t % 3 === 0) sparks(src.x || p.x, src.y || p.y - 8, 1); return; }
  if (p.type === 'crackfloor' && src.kind !== 'blast' && src.kind !== 'rocket' && !(src.y !== undefined && src.y > p.y - TS - 2)) dmg *= 0.5;
  p.hp -= dmg; p.flash = 3;
  if (p.type === 'crate' && G.t % 2 === 0) Snd.play('wood');
  if (p.hp <= 0) destroyProp(p, src);
}
function destroyProp(p, src) {
  if (p.remove || p.dying) return;
  switch (p.type) {
    case 'crate':
      clearTiles(p); p.remove = true;
      planks(p.x, p.y - 8, 10); Snd.play('wood'); dust(p.x, p.y, 4);
      addScore(50, p.x, p.y - 16);
      if (p.item) spawnPickup(p.item, p.x, p.y - 4, 0, -3);
      break;
    case 'sandbag':
      clearTiles(p); p.remove = true;
      dust(p.x, p.y - 8, 10, '#d8c090', 2); debris(p.x, p.y - 8, 10, ['#c8b080', '#a89060', '#e0d0a0']); Snd.play('crumble');
      break;
    case 'crackwall': case 'bwall': case 'crackfloor': {
      clearTiles(p); p.remove = true;
      const z = zoneAt(p.x), P = ZPAL[z];
      const cx = p.x, cy = p.y - p.h / 2;
      for (let i = 0; i < p.h / 4; i++) debris(cx + rnd(-p.w / 2, p.w / 2), p.y - rnd(0, p.h), 1, [P.base, P.dark, P.light], 1.3);
      dust(cx, p.y, 10, zoneDustColor(p.x), 2); smoke(cx, cy, 3, 1.2);
      Snd.play('crumble'); shake(5);
      if (p.type === 'bwall') spawnBoom(cx, cy, 26, { cols: [P.base, P.dark] });
      if (p.type === 'crackwall') floatText(p.x, p.y - p.h - 4, '?!', '#80ff80', 2, 50);
      break;
    }
    case 'barrel':
      if (p.fuse === undefined) { p.fuse = 6; p.shootable = false; p.blastable = false; }
      break;
  }
}
function drawBarrelSpr(x, y, flash) {
  fr(-6, -16, 12, 16, '#c82a20'); fr(-6, -16, 12, 2, '#e85040'); fr(-6, -2, 12, 2, '#8a1a14');
  fr(-6, -11, 12, 2, '#ffd030'); fr(-6, -6, 12, 1, '#8a1a14'); fr(-4, -15, 2, 12, '#f07060');
  fr(-2, -10, 4, 3, '#1e1020'); fr(-1, -9, 2, 1, '#ffd030');
  fdraw(x, y, false, flash);
}
// opaque overlays that hide secret rooms until the player steps inside
function makeFakeWallCanvas(w, h, style) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  if (style === 'bunker') {
    g.fillStyle = '#b89464'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9a7a50';
    for (let y = 0; y < h; y += 8) for (let x = ((y / 8) % 2) * 8; x < w; x += 16) g.fillRect(x, y, 1, 8);
    for (let y = 7; y < h; y += 8) g.fillRect(0, y, w, 1);
    g.fillStyle = '#d8b884'; g.fillRect(0, 0, w, 2);
    g.fillStyle = OUTLINE; g.fillRect(w / 2 - 14, 9, 28, 5);
    g.fillStyle = '#2a1e1a'; g.fillRect(w / 2 - 13, 10, 26, 3);
    g.fillStyle = '#e8c040'; for (let x = 4; x < w - 4; x += 10) g.fillRect(x, h - 5, 5, 3);
    return c;
  }
  const z = style === 'ground' ? 1 : 2;
  for (let ty = 0; ty < h; ty += TS) for (let tx = 0; tx < w; tx += TS) drawSolidTex(g, tx, ty, z, hash1(tx * 7 + ty * 13), ty / TS);
  if (style === 'rock') {
    g.fillStyle = OUTLINE; g.fillRect(0, 0, 1, h);
    g.fillStyle = ZPAL[2].light; g.fillRect(1, 0, 1, h);
    // a barely visible hint crack
    g.fillStyle = ZPAL[2].dark; g.fillRect(6, 10, 1, 6); g.fillRect(7, 16, 1, 4); g.fillRect(8, 20, 1, 5);
  }
  return c;
}

// ---- captives ----
function freeCaptive(c) {
  c.state = 'free'; c.t = 0; c.vy = -3.6; c.shootable = false; c.blastable = false;
  G.rescued++;
  addScore(500, c.x, c.y - 30, '#80ff80');
  for (let i = 0; i < 6; i++) { const p = part('plank', c.x + rnd(-6, 6), c.y - 12, rnd(-2, 2), rnd(-3, -1), 40, 1, '#c8a060'); p.g = 0.2; p.bounce = 0.3; }
  confetti(c.x, c.y - 20, 14);
  Snd.play('cheer');
  bubble(c, pick(['THANK YOU!', 'FREEDOM!', 'MY HERO!', 'YAHOO!']), 50);
}
function updateCaptive(c) {
  c.t++;
  const p = G.player, tgt = pTarget();
  switch (c.state) {
    case 'tied':
      if (c.t % 220 === 110 && onScreen(c, -20)) bubble(c, pick(['HELP!', 'OVER HERE!', 'UNTIE ME!', 'PSST!']), 50);
      if (targetAlive() && bodiesHit(tgt, c)) freeCaptive(c);
      break;
    case 'free':
      c.vy = Math.min(c.vy + 0.3, 6); c.vx = 0; moveBody(c, false);
      c.face = sgn(p.x - c.x) || 1;
      if (c.onGround && c.t > 10) { c.state = 'salute'; c.t = 0; }
      break;
    case 'salute':
      c.vy = Math.min(c.vy + 0.3, 6); moveBody(c, false);
      if (c.t > 36) { c.state = 'give'; c.t = 0; }
      break;
    case 'give':
      c.vy = Math.min(c.vy + 0.3, 6); moveBody(c, false);
      if (c.t === 16 && c.item) { spawnPickup(c.item, c.x + c.face * 10, c.y - 14, c.face * 1.2, -3); Snd.play('pickup'); }
      if (c.t > 34) { c.state = chance(0.5) ? 'dance' : 'run'; c.t = 0; }
      break;
    case 'dance':
      c.vy = Math.min(c.vy + 0.3, 6); moveBody(c, false);
      if (c.t % 20 === 0) { c.vy = -2; c.face = -c.face; }
      if (c.t > 70) { c.state = 'run'; c.t = 0; }
      break;
    case 'run':
      c.face = -1; c.vx = -1.9;
      c.vy = Math.min(c.vy + 0.3, 6); moveBody(c, false);
      if (c.hitWall && c.onGround) c.vy = -5;
      if (c.x < G.cam.x - 30 || c.t > 400) c.remove = true;
      break;
  }
}
function drawCaptive(c) {
  const S = ST.captive;
  if (c.state === 'tied') {
    const wig = c.t % 220 > 200 ? ((c.t >> 1) % 2 ? 1 : -1) : 0;
    fr(-9, -26, 4, 26, '#8a5a30'); fr(-9, -26, 4, 2, '#a87444'); fr(-10, -8, 6, 2, '#6a4020');
    fdraw(c.x, c.y);
    drawHuman(c.x + wig, c.y, 1, S, { leg: 'sit', arm: 'tied', face: c.t % 220 > 180 ? 'shout' : 'hurt' }, null);
    return;
  }
  const pose = { leg: 'stand', arm: 'down', face: 'happy', ph: (c.t * 0.07) % 1 };
  if (!c.onGround) { pose.leg = 'jump'; pose.arm = 'panic'; }
  else if (c.state === 'salute') pose.arm = 'salute';
  else if (c.state === 'give') { pose.arm = c.t < 16 ? 'hold' : 'wave'; pose.face = 'grin'; }
  else if (c.state === 'dance') { pose.leg = 'dance'; pose.arm = 'dance'; pose.ph = (c.t * 0.05) % 1; }
  else if (c.state === 'run') { pose.leg = 'run'; pose.arm = 'wave'; }
  drawHuman(c.x, c.y, c.face, S, pose, null);
}

// ---- props update / draw ----
function updateProps() {
  const p = G.player;
  for (const pr of G.props) {
    if (pr.flash > 0) pr.flash--;
    switch (pr.type) {
      case 'captive': updateCaptive(pr); break;
      case 'barrel':
        if (pr.fuse !== undefined) {
          pr.fuse--; pr.flash = pr.fuse & 1 ? 2 : 0;
          if (pr.fuse <= 0) { pr.remove = true; explodeAt(pr.x, pr.y - 8, 36, 8, 'n'); }
          break;
        }
        if (pr.rolling) {
          pr.rollT++;
          pr.vy = Math.min(pr.vy + 0.3, 6);
          moveBody(pr, false);
          if (pr.hitWall) pr.vx *= -0.6;
          const t = pTarget();
          if ((targetAlive() && bodiesHit(pr, t)) || pr.rollT > 160) destroyProp(pr, { kind: 'blast' });
        } else {
          // fall if support vanished
          let supported = groundBelow(pr.x, pr.y + 1);
          if (!supported) for (const o of G.props) if (o !== pr && o.type === 'barrel' && !o.remove && Math.abs(o.x - pr.x) < 8 && Math.abs(o.y - o.h - pr.y) < 2) { supported = true; break; }
          if (!supported) { pr.vx = 0; pr.vy = Math.min((pr.vy || 0) + 0.3, 6); moveBody(pr, false); }
          else pr.vy = 0;
        }
        break;
      case 'stalactite': case 'rock': updateFalling(pr); break;
      case 'fakewall': {
        const inside = p.x > pr.x0 - 4 && p.x < pr.x0 + pr.pw + 4 && p.y - 10 > pr.y0 && p.y - 10 < pr.y0 + pr.ph + 16;
        pr.alpha = approach(pr.alpha, inside ? 0.18 : 1, 0.06);
        break;
      }
      case 'secret':
        if (p.state === 'normal' && p.x > pr.x0 && p.x < pr.x0 + pr.pw && p.y > pr.y - 40 && p.y <= pr.y + 1) {
          pr.remove = true;
          G.secrets++; G.foundSecrets.push(pr.id);
          showMsg('SECRET FOUND!', { sub: '+2000 BONUS', color: GRAD_GREEN, scale: 2, life: 110, y: 80 });
          addScore(2000); Snd.play('secret'); confetti(p.x, p.y - 20, 20);
        }
        break;
      case 'checkpoint':
        if (!pr.raised && p.x > pr.x - 4 && (p.state === 'normal' || p.state === 'tank')) {
          pr.raised = true;
          saveCheckpoint(pr);
          showMsg('CHECKPOINT!', { color: GRAD_GREEN, scale: 2, life: 90, y: 80 });
          Snd.play('checkpoint'); confetti(pr.x, pr.y - 40, 16);
        }
        if (pr.raised) pr.flag = Math.min(1, pr.flag + 0.03);
        break;
      case 'car':
        if (G.t % 9 === 0 && onScreen(pr, 40)) smoke(pr.x + 10, pr.y - 16, 1, 0.8);
        if (G.t % 5 === 0 && onScreen(pr, 40)) fireBurst(pr.x + 10 + rnd(-4, 4), pr.y - 14, 1, 2, 0.8);
        break;
    }
    if (pr.x < G.cam.x - 200 && pr.type !== 'fakewall') pr.remove = pr.remove || pr.type === 'captive' || pr.type === 'barrel' || pr.type === 'rock';
  }
  sweep(G.props);
}
function updateFalling(pr) {
  const t = pTarget();
  pr.t++;
  if (pr.state === 'hang') {
    if (targetAlive() && Math.abs(t.x - pr.x) < 44 && t.y > pr.y) { pr.state = 'shake'; pr.t = 0; }
    return;
  }
  if (pr.state === 'shake') {
    if (pr.t === 1) Snd.play('crumble');
    if (pr.t % 4 === 0) { const d = part('debris', pr.x + rnd(-5, 5), pr.anchor + 2, rnd(-0.3, 0.3), 0.5, 40, 1, ZPAL[2].light); d.g = 0.2; }
    if (pr.t > 42) { pr.state = 'fall'; pr.t = 0; }
    return;
  }
  pr.vy = Math.min(pr.vy + 0.35, 7);
  pr.y += pr.vy;
  if (targetAlive() && bodiesHit(pr, t)) {
    if (G.tank && G.tank.occupied) tankHurt(G.tank, 15); else hurtPlayer(pr, 1);
    shatter(pr); return;
  }
  for (const e of G.enemies) if (!e.dead && e.active && bodiesHit(pr, e)) { damageEnemy(e, 6, { kind: 'blast', x: pr.x }); shatter(pr); return; }
  if (groundBelow(pr.x, pr.y) || pr.y > H) shatter(pr);
}
function shatter(pr) {
  pr.remove = true;
  const P = ZPAL[2];
  debris(pr.x, pr.y - 6, 10, [P.base, P.dark, P.light], 1);
  dust(pr.x, pr.y, 6, '#8a6a70', 1.5);
  Snd.play('crumble'); shake(3);
}
function drawProps(x0, x1, layer) {
  for (const pr of G.props) {
    if (layer === 'front' ? pr.type !== 'fakewall' : pr.type === 'fakewall') continue;
    const px = pr.x0 !== undefined ? pr.x0 : pr.x;
    if (px < x0 - 100 || px > x1 + 100) continue;
    const fl = pr.flash > 0 ? '#ffffff' : null;
    switch (pr.type) {
      case 'crate':
        fr(-8, -16, 16, 16, '#a86a30'); fr(-8, -16, 16, 2, '#d09050'); fr(-8, -2, 16, 2, '#7a4a20');
        fr(-8, -16, 2, 16, '#c08040'); fr(6, -16, 2, 16, '#7a4a20');
        fline(-5, -13, 4, -4, 2, '#7a4a20');
        if (pr.hp < 3) fr(-2, -9, 3, 1, '#3a2010');
        if (pr.item && pr.item.length === 1) fr(-3, -12, 6, 5, '#e8c070');
        fdraw(pr.x, pr.y, false, fl);
        break;
      case 'sandbag':
        for (let i = 0; i < 3; i++) { fr(-16 + i * 10, -8, 11, 8, '#c8b080'); fr(-15 + i * 10, -8, 9, 2, '#e0d0a0'); }
        for (let i = 0; i < 2; i++) { fr(-11 + i * 10, -16, 11, 8, '#baa070'); fr(-10 + i * 10, -16, 9, 2, '#d8c898'); }
        if (pr.hp < 6) fr(-4, -12, 3, 2, '#8a7040');
        fdraw(pr.x, pr.y, false, fl);
        break;
      case 'crackwall': case 'bwall': case 'crackfloor': drawBreakTiles(pr, fl); break;
      case 'barrel': drawBarrelSpr(pr.x, pr.y, fl); break;
      case 'captive': drawCaptive(pr); break;
      case 'stalactite': case 'rock': {
        const wob = pr.state === 'shake' ? ((pr.t >> 1) % 2 ? 1 : -1) : 0;
        const P = ZPAL[2];
        if (pr.type === 'stalactite') { fr(-5, -16, 10, 4, P.base); fr(-4, -12, 8, 4, P.base); fr(-3, -8, 6, 4, P.dark); fr(-2, -4, 4, 3, P.dark); fr(-1, -1, 2, 1, P.dark); fr(-3, -15, 2, 8, P.light); }
        else { fwheel(0, -6, 6, P.base); fr(-3, -10, 3, 2, P.light); fr(1, -4, 4, 2, P.dark); }
        fdraw(pr.x + wob, pr.y, false, fl);
        if (pr.type === 'rock' && pr.state !== 'fall' || (pr.type === 'rock' && pr.state === 'fall')) {
          const gy = findFloorY(pr.x, pr.y);
          if ((G.t >> 2) % 2) { ctx.fillStyle = '#ff3030'; ctx.fillRect(Math.round(pr.x) - 7, gy - 2, 14, 2); ctx.fillRect(Math.round(pr.x) - 1, gy - 7, 2, 4); }
        }
        break;
      }
      case 'fakewall':
        ctx.globalAlpha = pr.alpha; ctx.drawImage(pr.cv, pr.x0, pr.y0); ctx.globalAlpha = 1;
        break;
      case 'checkpoint': {
        const x = Math.round(pr.x), y = Math.round(pr.y);
        ctx.fillStyle = OUTLINE; ctx.fillRect(x - 2, y - 52, 5, 52); ctx.fillRect(x - 5, y - 4, 11, 4);
        ctx.fillStyle = '#d8d8e0'; ctx.fillRect(x - 1, y - 52, 3, 50); ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 2, y - 55, 5, 4);
        const fy = Math.round(lerp(y - 18, y - 50, pr.flag));
        for (let i = 0; i < 16; i++) {
          const o = Math.round(Math.sin(G.t * 0.2 - i * 0.5) * (pr.raised ? 1.2 : 0.3));
          ctx.fillStyle = OUTLINE; ctx.fillRect(x + 2 + i, fy + o - 1, 1, 12);
          ctx.fillStyle = pr.raised ? (i % 5 < 3 ? '#ec2e2a' : '#c01818') : '#6a6a6a'; ctx.fillRect(x + 2 + i, fy + o, 1, 10);
        }
        if (pr.raised) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 7, fy + 3, 5, 2); }
        break;
      }
      case 'car':
        fr(-24, -12, 48, 10, '#8a4a2a'); fr(-16, -18, 26, 7, '#7a3e22'); fr(-13, -17, 9, 5, '#2a2a34'); fr(-2, -17, 9, 5, '#3a3a44');
        fr(-24, -12, 48, 2, '#a8643a'); fr(-20, -8, 6, 2, '#5a2a18'); fr(8, -9, 10, 3, '#5a2a18');
        fwheel(-14, -3, 4, '#222228'); fwheel(14, -2, 3, '#222228');
        fdraw(pr.x, pr.y);
        break;
    }
  }
}
function drawBreakTiles(pr, fl) {
  const z = zoneAt(pr.x), P = ZPAL[z];
  const x0 = Math.round(pr.x - pr.w / 2), y0 = Math.round(pr.y - pr.h);
  ctx.fillStyle = fl || P.base; ctx.fillRect(x0, y0, pr.w, pr.h);
  ctx.fillStyle = P.dark;
  for (let y = 0; y < pr.h; y += 8) for (let x = ((y / 8) % 2) * 4; x < pr.w; x += 8) ctx.fillRect(x0 + x, y0 + y, 1, 7);
  for (let y = 7; y < pr.h; y += 8) ctx.fillRect(x0, y0 + y, pr.w, 1);
  ctx.fillStyle = P.light; ctx.fillRect(x0 + 1, y0 + 1, pr.w - 2, 1);
  // cracks: bigger when damaged
  const dmg = pr.type === 'bwall' ? 0.3 : 1 - pr.hp / (pr.type === 'crackfloor' ? 5 : 6);
  ctx.fillStyle = OUTLINE;
  const cx = x0 + (pr.w >> 1), cy = y0 + (pr.h >> 1);
  const L = 4 + dmg * 8;
  for (let i = 0; i < L; i++) { ctx.fillRect(cx + Math.round(Math.sin(i * 1.7) * 2) + (i >> 1), cy - (pr.type === 'crackfloor' ? 0 : i), 1, 1); ctx.fillRect(cx - (i >> 1), cy + Math.round(Math.cos(i * 1.3) * 2) + (pr.type === 'crackfloor' ? 0 : i >> 1), 1, 1); }
  if (pr.type === 'bwall') { ctx.fillStyle = '#e8c030'; ctx.fillRect(x0 + 3, y0 + (pr.h >> 1) - 2, pr.w - 6, 3); }
  ctx.fillStyle = OUTLINE; ctx.fillRect(x0, y0, pr.w, 1); ctx.fillRect(x0, y0, 1, pr.h); ctx.fillRect(x0 + pr.w - 1, y0, 1, pr.h);
}
function findFloorY(x, fromY) {
  const tx = Math.floor(x / TS);
  for (let ty = Math.floor(fromY / TS); ty < LH; ty++) { const t = tileAt(tx, ty); if (isSolidT(t) || isOnewayT(t)) return ty * TS; }
  return GY;
}

// ---- pickups ----
const SCORE_ITEMS = { medal: 500, apple: 100, banana: 200, chicken: 300, gold: 1000, gem: 1500, coin: 50 };
function spawnPickup(item, x, y, vx, vy) {
  G.pickups.push({ kind: 'pickup', item, x, y, w: 14, h: 14, vx: vx || 0, vy: vy || 0, onGround: false, t: rndi(0, 60) });
}
function updatePickups() {
  const tgt = pTarget(), alive = targetAlive();
  for (const pk of G.pickups) {
    pk.t++;
    pk.vy = Math.min(pk.vy + 0.25, 5);
    pk.vx *= 0.95;
    moveBody(pk, false);
    if (alive && pk.t > 8 && Math.abs(pk.x - tgt.x) < (pk.w + tgt.w) / 2 + 2 && pk.y - pk.h < tgt.y + 2 && tgt.y - tgt.h < pk.y + 2) collectPickup(pk);
    if (pk.x < G.cam.x - 60) pk.remove = true;
  }
  sweep(G.pickups);
}
function collectPickup(pk) {
  const p = G.player, it = pk.item, tk = G.tank && G.tank.occupied ? G.tank : null;
  pk.remove = true;
  stars(pk.x, pk.y - 8, 6, '#fff6a0');
  if (WEAPONS[it] && it !== 'P') {
    if (p.weapon === it) p.ammo = Math.min(999, p.ammo + WEAPONS[it].ammo);
    else { p.weapon = it; p.ammo = WEAPONS[it].ammo; }
    showMsg('WEAPON GET!', { sub: WEAPONS[it].full, scale: 2, life: 90, y: 70, subColor: WEAPON_COL[it] });
    Snd.play('weaponget');
    if (!tk) bubble(p, pick(['OH YEAH!', 'LOCKED & LOADED!', 'NICE!', 'NOW WE\'RE TALKING!']), 50);
    return;
  }
  switch (it) {
    case 'B': p.bombs = Math.min(99, p.bombs + 10); floatText(pk.x, pk.y - 16, 'BOMBS +10', '#a0ff80'); Snd.play('pickup'); break;
    case 'A':
      if (p.weapon !== 'P') p.ammo = Math.min(999, p.ammo + WEAPONS[p.weapon].ammo);
      p.bombs = Math.min(99, p.bombs + 5);
      if (tk) tk.hp = Math.min(tk.max, tk.hp + 25);
      floatText(pk.x, pk.y - 16, 'AMMO UP!', '#ffe060'); Snd.play('pickup'); break;
    case 'hp':
      p.hp = p.maxHp; if (tk) tk.hp = Math.min(tk.max, tk.hp + 45);
      floatText(pk.x, pk.y - 16, 'HEALTH FULL!', '#ff8080'); Snd.play('heal'); break;
    case 'shield':
      p.shield = 600; floatText(pk.x, pk.y - 16, 'SHIELD!', '#80c8ff'); Snd.play('shield'); break;
    default: {
      const v = SCORE_ITEMS[it] || 100;
      addScore(v, pk.x, pk.y - 16, '#ffe860'); Snd.play('coin');
    }
  }
}
function drawPickups(x0, x1) {
  for (const pk of G.pickups) {
    if (pk.x < x0 - 20 || pk.x > x1 + 20) continue;
    const bob = pk.onGround ? Math.round(Math.sin(pk.t * 0.08) * 2) - 2 : 0;
    const glow = 0.18 + Math.sin(pk.t * 0.12) * 0.1;
    ctx.globalAlpha = glow;
    dcirc(pk.x, pk.y - 7 + bob, 10, WEAPON_COL[pk.item] || (pk.item === 'hp' ? '#ff6060' : pk.item === 'shield' ? '#60a0ff' : '#fff0a0'));
    ctx.globalAlpha = 1;
    drawPickupSpr(pk.x, pk.y + bob, pk.item);
    if (pk.t % 40 === 0) part('star', pk.x + rnd(-7, 7), pk.y - rnd(4, 14) + bob, 0, -0.2, 10, 2, '#ffffff');
  }
}
