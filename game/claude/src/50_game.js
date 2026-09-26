// =====================================================================
//  GAME FLOW: level setup, camera, events & waves, scenes, HUD, loop
// =====================================================================
const DIFF = [0.8, 1.0, 1.15, 1.25], CDMUL = [1.35, 1.1, 0.95, 0.85], BSPD = [2.1, 2.4, 2.7, 2.9];
G.spawnQ = [];
G.foundSecrets = [];
G.hi = store.get('hi', 0);
G.heli = null;
G.menu = 0;
let titleCam = 0;

function newGame() {
  Object.assign(G, { nextLife: 25000, score: 0, lives: 3, rescued: 0, secrets: 0, foundSecrets: [], livesLost: 0, continues: 0, kills: 0, checkpoint: null, missionT: 0 });
  startLevel(null);
}
function startLevel(cp) {
  buildLevel();
  G.enemies = []; G.pShots = []; G.eShots = []; G.pickups = []; G.props = []; G.fx = []; G.texts = []; G.msgs = []; G.spawnQ = [];
  PARTS.length = 0; BIRDS.length = 0;
  Object.assign(G, { boss: null, tank: null, bossActive: false, wave: null, rockfall: 0, endSeq: null, hitStop: 0, flash: 0, goArrow: 0, heli: null, dropship: null });
  G.levelW = LW * TS;
  G.cam.x = cp ? clamp(cp.x - 120, 0, G.levelW - W) : 0;
  G.cam.lock = null; G.cam.shake = 0;
  G.totalCaptives = LEVEL.specs.filter(s => s.k === 'captive').length;
  G.totalSecrets = 3;
  const enemyKinds = { soldier: 1, rusher: 1, sniper: 1, heavy: 1, gunner: 1, bomber: 1, carrier: 1, drone: 1, turret: 1 };
  for (const s of LEVEL.specs) {
    if (cp) {
      if (enemyKinds[s.k] && s.x < G.cam.x + W + 8) continue;
      if ((s.k === 'captive' || s.k === 'item' || s.k === 'tank' || s.k === 'stalactite') && s.x < cp.x - 8) continue;
      if (s.k === 'secret' && G.foundSecrets.indexOf(s.id) >= 0) continue;
    }
    spawnSpec(s, cp);
  }
  G.events = LEVEL.events.slice().sort((a, b) => a.cx - b.cx).map(e => Object.assign({}, e, { done: !!cp && e.cx < G.cam.x + 4 }));
  prerenderLevel();
  const p = G.player = makePlayer(cp ? cp.x : 60, 0);
  if (cp) {
    Object.assign(G, { score: cp.score, rescued: cp.rescued, secrets: cp.secrets, foundSecrets: cp.found.slice(), lives: 3, nextLife: (Math.floor(cp.score / 25000) + 1) * 25000 });
    G.checkpoint = cp;
    respawnPlayer(p, cp.x);
    showMsg('CONTINUE!', { scale: 3, life: 90, y: 90 });
    Music.play('stage');
  } else {
    p.state = 'intro'; p.hidden = true; p.x = -50; p.y = 40;
    G.heli = { x: -70, y: 46, t: 0, dropped: false };
    Music.play('stage');
  }
  G.scene = 'play';
}
function spawnSpec(s, cp) {
  switch (s.k) {
    case 'soldier': case 'rusher': case 'sniper': case 'heavy': case 'gunner': case 'bomber': case 'carrier':
      G.enemies.push(mkEnemy(s.k, s.x, s.y, { idle: s.idle, face: s.face || -1, state: 'idle' })); break;
    case 'drone': G.enemies.push(mkEnemy('drone', s.x, s.y, { state: 'hover', seed: rnd(TAU) })); break;
    case 'turret': G.enemies.push(mkEnemy('turret', s.x, s.ceiling ? s.y + 12 : s.y, { ceiling: !!s.ceiling, ang: s.ceiling ? PI / 2 : PI })); break;
    case 'tank': G.tank = makeTank(s.x, s.y); break;
    case 'item': spawnPickup(s.item, s.x, s.y); break;
    case 'checkpoint': {
      const pr = mkProp('checkpoint', s.x, s.y, s);
      if (cp && s.id <= cp.id) { pr.raised = true; pr.flag = 1; }
      G.props.push(pr); break;
    }
    default: G.props.push(mkProp(s.k, s.x, s.y, s));
  }
}
function saveCheckpoint(pr) {
  const p = G.player;
  if (p.hp < p.maxHp) { p.hp = p.maxHp; floatText(p.x, p.y - 44, 'HEALTH FULL!', '#ff8080', 1, 60); }
  G.checkpoint = { id: pr.id, x: pr.x, score: G.score, rescued: G.rescued, secrets: G.secrets, found: G.foundSecrets.slice() };
}

// ---------------------------------------------------------------------
//  Camera, events, waves
// ---------------------------------------------------------------------
function updateCamera() {
  const c = G.cam, t = pTarget();
  const maxX = G.levelW - W;
  if (c.lock !== null) {
    if (c.x < c.lock) c.x = Math.min(c.lock, c.x + 3); else c.x = c.lock;
  } else if (G.player.state !== 'dead') {
    const target = t.x - W * 0.4;
    if (target > c.x) c.x += Math.min((target - c.x) * 0.14, 6);
  }
  c.x = clamp(c.x, 0, maxX);
}
function updateShake() {
  const c = G.cam;
  c.shake *= 0.86; if (c.shake < 0.3) c.shake = 0;
  c.sx = c.shake ? rnd(-1, 1) * c.shake : 0; c.sy = c.shake ? rnd(-1, 1) * c.shake * 0.7 : 0;
}
function updateEvents() {
  for (const ev of G.events) {
    if (ev.done) continue;
    if (G.cam.x < ev.cx) break;
    if (G.cam.lock !== null && !ev.boss) break;
    ev.done = true;
    if (ev.lock) {
      G.cam.lock = ev.cx; G.wave = { ev, idx: 0, t: 0 };
      startWave();
      break;
    } else if (ev.spawn) {
      for (const s of ev.spawn) G.spawnQ.push(Object.assign({}, s, { at: G.t + (s.d || 0) }));
    } else if (ev.msg) {
      showMsg(ev.msg, { sub: ev.sub, color: ev.col || GRAD_GOLD, scale: 3, life: 140, y: 70, subColor: '#ffffff' });
      if (ev.col) Snd.play('alarm');
    } else if (ev.rockfall) {
      G.rockfall = ev.rockfall;
      showMsg('ROCKSLIDE!', { color: GRAD_RED, scale: 2, life: 80, y: 90 });
    } else if (ev.boss) startBossFight();
  }
}
function startWave() {
  const w = G.wave, list = w.ev.waves[w.idx];
  w.t = 0;
  for (const s of list) G.spawnQ.push(Object.assign({}, s, { at: G.t + (s.d || 0) + 25, wave: true }));
}
function updateWave() {
  const w = G.wave;
  if (!w) return;
  w.t++;
  for (const e of G.enemies) {
    if (!e.wave || e.dead) continue;
    if (!onScreen(e, 50) && e.state !== 'enter') { e.offT = (e.offT || 0) + 1; if (e.offT > 300) e.remove = true; } else e.offT = 0;
  }
  const pending = G.spawnQ.some(s => s.wave);
  const alive = G.enemies.some(e => e.wave && !e.dead && !e.remove);
  if (w.t > 2700) for (const e of G.enemies) if (e.wave && !e.dead) { e.wave = false; if (!onScreen(e)) e.remove = true; }
  if (!pending && !alive && w.t > 30) {
    w.idx++;
    if (w.idx >= w.ev.waves.length) {
      G.wave = null; G.cam.lock = null; G.goArrow = 200;
      Snd.play('go');
      addScore(1000);
      floatText(G.player.x, G.player.y - 44, 'AREA CLEAR +1000', '#80ff80', 1, 70);
    } else startWave();
  }
}
function updateSpawnQ() {
  for (const s of G.spawnQ) {
    if (G.t < s.at) continue;
    if (s.from === 'P') {
      // paratroopers are carried in by a transport helicopter and jump when it is overhead
      const d = G.dropship || (G.dropship = { x: G.cam.x + W + 70, y: 54, t: 0 });
      if (d.x > G.cam.x + s.ox) continue;
      s.dropY = d.y + 6;
    }
    spawnFromEvent(s); s.remove = true;
  }
  sweep(G.spawnQ);
}
function updateDropship() {
  const d = G.dropship;
  if (!d) return;
  d.t++; d.x -= 3.2; d.y = 54 + Math.sin(d.t * 0.08) * 2;
  if (G.t % 5 === 0) Snd.play('helicopter');
  if (d.x < G.cam.x - 90 && !G.spawnQ.some(s => s.from === 'P')) G.dropship = null;
}
function spawnFromEvent(s) {
  const cx = G.cam.x;
  let e;
  if (s.t === 'truck') e = mkEnemy('truck', cx + W + 50, groundYAt(cx + W + 50), { n: s.n || 3 });
  else if (s.t === 'jeep') e = mkEnemy('jeep', cx + W + 40, groundYAt(cx + W + 40));
  else if (s.t === 'drone') {
    const ty = rnd(50, 100);
    e = mkEnemy('drone', cx + W + 16, ty, { state: 'enter', tx: cx + rnd(180, 400), ty, seed: rnd(TAU) });
  } else {
    let x, y, state = 'runin';
    const o = {};
    if (s.from === 'R') { x = cx + W + 14; y = groundYAt(x); o.tx = cx + W - rnd(50, 170); }
    else if (s.from === 'L') { x = cx - 14; y = groundYAt(x); o.tx = cx + rnd(40, 150); o.face = 1; }
    else if (s.from === 'P') { x = cx + s.ox; y = s.dropY || 48; state = 'para'; }
    else if (s.from === 'W') { x = s.wx; y = s.wy; state = 'window'; o.face = -1; }
    else { x = s.x; y = s.y; o.tx = x - rnd(50, 90); }
    o.state = state;
    e = mkEnemy(s.t, x, y, o);
    if (s.burst) burstWall(s.burst, e);
  }
  e.active = true; e.wave = !!s.wave;
  G.enemies.push(e);
}
function burstWall(tx, e) {
  for (const pr of G.props) if (pr.type === 'bwall' && pr.tx === tx && !pr.remove) { pr.invuln = false; destroyProp(pr, { kind: 'blast' }); }
  bubble(e, pick(['SURPRISE!', 'KNOCK KNOCK!', 'HERE\'S JOHNNY!']), 50);
  hitStop(4);
}
function updateRockfall() {
  if (G.rockfall <= 0) return;
  G.rockfall--;
  if (G.rockfall % 34 === 0) {
    const t = pTarget();
    const x = clamp(t.x + rnd(-50, 120), G.cam.x + 20, G.cam.x + W - 20);
    G.props.push(mkProp('rock', x, ceilBottom(x)));
  }
}

// ---------------------------------------------------------------------
//  Intro / ending / game over
// ---------------------------------------------------------------------
function updateIntro() {
  const h = G.heli, p = G.player;
  if (!h) return;
  h.t++; h.x += h.dropped ? 2.4 : 2.2; h.y = 46 + Math.sin(h.t * 0.06) * 3 - (h.dropped ? h.t * 0.1 : 0);
  if (G.t % 5 === 0) Snd.play('helicopter');
  if (!h.dropped && h.x >= 100) {
    h.dropped = true; h.t = 0;
    p.hidden = false; p.x = h.x; p.y = h.y + 8; p.vy = 0; p.vx = 0.6;
    bubble(p, 'GERONIMO!', 40);
  }
  if (h.dropped && p.state === 'intro' && p.onGround) {
    p.state = 'normal'; dust(p.x, p.y, 8); Snd.play('land'); shake(2);
    showMsg('MISSION START!', { sub: 'RESCUE THE CAPTIVES - DESTROY THE IRON SCORPION', scale: 3, life: 150, y: 70, subColor: '#ffe080' });
    G.goArrow = 160;
  }
  if (h.x > G.cam.x + W + 100) G.heli = null;
}
function startEndSequence() {
  const p = G.player;
  if (G.tank && G.tank.occupied) exitTank(G.tank, false);
  G.endSeq = { t: 0 };
  for (const e of G.enemies) if (!e.dead) killEnemy(e, { kind: 'blast', x: e.x });
  G.eShots.length = 0;
  p.state = 'victory'; p.inv = 0; p.vx = 0;
  Music.play('victory');
  showMsg('MISSION COMPLETE!', { scale: 3, life: 300, y: 70, color: GRAD_GOLD, sub: 'THE IRON SCORPION IS SCRAP METAL!' });
}
function updateEndSequence() {
  const s = G.endSeq, p = G.player;
  s.t++;
  if (s.t % 45 === 0) confetti(G.cam.x + rnd(40, W - 40), rnd(20, 80), 16);
  if (p.onGround && s.t % 50 === 10) { p.vy = -3.5; Snd.play('jump'); }
  if (s.t === 60) bubble(p, pick(['PIECE OF CAKE!', 'WHO\'S NEXT?!', 'BANDANA POWER!']), 80);
  if (s.t > 330) toComplete();
}
function startGameOver() {
  G.scene = 'gameover'; G.goT = 0; G.contT = 10 * 60 - 1;
  Music.play('gameover');
  saveHi();
}
function saveHi() { if (G.score > G.hi) { G.hi = G.score; store.set('hi', G.hi); } }
function toComplete() {
  const rows = [
    ['MISSION SCORE', '', G.score],
    ['CAPTIVES RESCUED', G.rescued + '/' + G.totalCaptives, G.rescued * 1000],
    ['SECRETS FOUND', G.secrets + '/' + G.totalSecrets, G.secrets * 2000],
    ['LIVES REMAINING', '' + G.lives, G.lives * 3000],
    ['NO-CONTINUE BONUS', G.continues ? 'NO' : 'YES', G.continues ? 0 : 10000]
  ];
  const total = rows.reduce((a, r) => a + r[2], 0);
  const pts = (G.rescued / G.totalCaptives) * 40 + (G.secrets / G.totalSecrets) * 20 + Math.max(0, 25 - G.livesLost * 7) + (G.continues ? 0 : 15);
  const rank = pts >= 88 ? 'S' : pts >= 70 ? 'A' : pts >= 50 ? 'B' : pts >= 30 ? 'C' : 'D';
  G.tally = { rows, total, rank, t: 0, shown: 0, counts: rows.map(() => 0), totalShown: 0 };
  G.score = total;
  saveHi();
  G.scene = 'complete';
}

// ---------------------------------------------------------------------
//  UPDATE per scene
// ---------------------------------------------------------------------
function tick() {
  Input.poll();
  if (Input.pressed('mute')) { Snd.setMute(!Snd.muted); G.toast = { text: Snd.muted ? 'SOUND OFF' : 'SOUND ON', t: 70 }; }
  if (G.toast && --G.toast.t <= 0) G.toast = null;
  switch (G.scene) {
    case 'title': tickTitle(); break;
    case 'starting': if (++G.startT > 50) newGame(); break;
    case 'play': tickPlay(); break;
    case 'pause': tickPause(); break;
    case 'gameover': tickGameOver(); break;
    case 'complete': tickComplete(); break;
  }
  Input.taps.length = 0;
  G.frame++;
}
function tickTitle() {
  titleCam += 0.5;
  if (titleCam > 1500) titleCam = 0;
  updateBirds(titleCam);
  if (Snd.ctx && !Music.cur && !G.titleMusicDone) { Music.play('title'); G.titleMusicDone = true; }
  G.t++;
  updateParts(); updateFx();
  if (G.frame % 90 === 0) spawnBoom(titleCam + rnd(30, 450), rnd(150, 200), rnd(14, 26), { silent: true });
  if (Input.pressed('start') || Input.pressed('jump') || Input.pressed('fire') || Input.taps.length) {
    Snd.unlock();
    Music.stop(); Music.play('jingle');
    Snd.play('select');
    G.scene = 'starting'; G.startT = 0;
  }
}
function tickPlay() {
  if ((Input.pressed('pause') || Input.pressed('start')) && !G.endSeq) { G.scene = 'pause'; G.menu = 0; Music.duck(true); Snd.play('select'); return; }
  if (G.flash > 0) G.flash--;
  updateShake();
  if (G.hitStop > 0) { G.hitStop--; return; }
  G.t++; G.missionT++;
  const z = zoneAt(G.cam.x + W / 2);
  G.zone = z; G.diff = DIFF[z]; G.cdMul = CDMUL[z]; G.bulletSpd = BSPD[z];
  updateSpawnQ(); updateEvents(); updateWave(); updateRockfall();
  updatePlayer(G.player);
  if (G.tank) updateTank(G.tank);
  updateEnemies();
  if (G.boss) updateBoss(G.boss);
  updatePShots(); updateEShots();
  updateProps(); updatePickups();
  updateParts(); updateFx(); updateTexts(); updateMsgs();
  updateBirds(G.cam.x);
  updateIntro();
  updateDropship();
  if (G.score >= G.nextLife) { G.nextLife += 25000; G.lives = Math.min(9, G.lives + 1); floatText(G.player.x, G.player.y - 44, '1UP!', '#80ff80', 2, 80); Snd.play('checkpoint'); }
  if (G.endSeq) updateEndSequence();
  updateCamera();
  if (G.goArrow > 0) G.goArrow--;
}
const PAUSE_ITEMS = ['RESUME', 'RESTART CHECKPOINT', 'SOUND', 'QUIT TO TITLE'];
function tickPause() {
  G.t2 = (G.t2 || 0) + 1;
  let choose = -1;
  if (Input.pressed('up')) { G.menu = (G.menu + 3) % 4; Snd.play('move'); }
  if (Input.pressed('down')) { G.menu = (G.menu + 1) % 4; Snd.play('move'); }
  if (Input.pressed('jump') || Input.pressed('fire') || Input.pressed('start')) choose = G.menu;
  if (Input.pressed('pause')) choose = 0;
  for (const t of Input.taps) {
    for (let i = 0; i < 4; i++) if (Math.abs(t.y - (118 + i * 18)) < 9 && Math.abs(t.x - W / 2) < 110) choose = i;
    if (t.x > 440 && t.y < 60) choose = 0;
  }
  if (choose < 0) return;
  Snd.play('select');
  switch (choose) {
    case 0: G.scene = 'play'; Music.duck(false); Input.clear(); break;
    case 1: Music.duck(false); G.continues++; startLevel(G.checkpoint); if (!G.checkpoint) { G.score = 0; G.rescued = 0; G.secrets = 0; G.foundSecrets = []; } break;
    case 2: Snd.setMute(!Snd.muted); break;
    case 3: Music.duck(false); Music.stop(); saveHi(); G.scene = 'title'; G.titleMusicDone = false; break;
  }
}
function tickGameOver() {
  G.goT++;
  G.t++;
  updateParts(); updateFx();
  if (G.contT > 0) {
    G.contT--;
    if (G.goT > 30 && (Input.pressed('fire') || Input.pressed('jump'))) { G.contT = Math.max(0, G.contT - 60); Snd.play('move'); }
    if (G.goT > 20 && (Input.pressed('start') || Input.taps.length)) {
      G.continues++;
      Snd.play('select');
      startLevel(G.checkpoint);
      if (!G.checkpoint) { G.score = 0; G.rescued = 0; G.secrets = 0; G.foundSecrets = []; }
      return;
    }
    if (G.contT % 60 === 59) Snd.play('beep');
  } else {
    if (++G.goFinal > 200 || (G.goFinal > 40 && Input.anyPressed())) { G.scene = 'title'; G.titleMusicDone = false; Music.stop(); }
    return;
  }
  G.goFinal = 0;
}
function tickComplete() {
  const T = G.tally;
  T.t++;
  G.t++;
  updateParts();
  if (T.t % 50 === 0) confetti(rnd(40, W - 40), -5, 12);
  const step = 45;
  const idx = Math.floor((T.t - 30) / step);
  if (idx >= 0 && idx < T.rows.length) {
    T.shown = idx + 1;
    const r = T.rows[idx], k = Math.min(1, ((T.t - 30) % step) / 30);
    T.counts[idx] = Math.round(r[2] * k);
    if (T.t % 3 === 0 && k < 1) Snd.play('tally');
  }
  if (idx >= T.rows.length) {
    for (let i = 0; i < T.rows.length; i++) T.counts[i] = T.rows[i][2];
    T.totalShown = Math.min(T.total, T.totalShown + Math.ceil(T.total / 40));
    if (T.totalShown < T.total && T.t % 3 === 0) Snd.play('tally');
  }
  const rankT = 30 + T.rows.length * step + 60;
  if (T.t === rankT) { Snd.play('stamp'); shake(10); G.cam.shake = 10; }
  updateShake();
  if (T.t > rankT + 40 && (Input.anyPressed() || Input.taps.length)) { G.scene = 'title'; G.titleMusicDone = false; Music.stop(); Snd.play('select'); }
}

// ---------------------------------------------------------------------
//  RENDER
// ---------------------------------------------------------------------
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  switch (G.scene) {
    case 'title': case 'starting': renderTitle(); break;
    case 'play': renderWorld(); renderHUD(); break;
    case 'pause': renderWorld(); renderHUD(); renderPause(); break;
    case 'gameover': renderWorld(); renderGameOver(); break;
    case 'complete': renderComplete(); break;
  }
  if (G.toast) drawText(G.toast.text, W - 6, H - 14, '#ffffff', 1, 2);
  drawTouch();
}
function renderWorld() {
  const cx = Math.round(G.cam.x), sx = Math.round(G.cam.sx), sy = Math.round(G.cam.sy);
  drawBackgrounds(cx);
  ctx.setTransform(1, 0, 0, 1, -cx + sx, sy);
  ctx.drawImage(fgCanvas, cx - 2, 0, W + 4, LH * TS, cx - 2, 0, W + 4, LH * TS);
  const x0 = cx, x1 = cx + W;
  drawDynDecor(x0, x1);
  drawProps(x0, x1, 'back');
  if (G.boss) drawBoss(G.boss);
  drawPickups(x0, x1);
  drawEnemies(x0, x1);
  if (G.tank) drawTank(G.tank);
  if (G.heli) drawHeliSpr(G.heli.x, G.heli.y, 1);
  if (G.dropship) drawHeliSpr(G.dropship.x, G.dropship.y, -1);
  drawPlayer(G.player);
  drawPShots();
  drawEShots();
  drawFx();
  drawParts(x0, x1);
  drawProps(x0, x1, 'front');
  drawTexts();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawFgSilhouettes(cx);
  if (G.flash > 0) { ctx.globalAlpha = Math.min(0.85, G.flash / 8); ctx.fillStyle = G.flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
function drawPlayer(p) {
  if (!p || p.state === 'tank' || p.hidden) return;
  if (p.state === 'dead') {
    const lying = p.rot % 2 === 1;
    drawHuman(p.x, p.y + (lying && p.onGround ? 8 : 0), p.face, ST.player, { leg: 'fall', arm: 'panic', face: 'dead' }, null, p.rot);
    return;
  }
  if (p.inv > 0 && p.state === 'normal' && (G.t >> 2) % 2 && p.hurtT <= 0) return;
  let pose;
  if (p.state === 'victory') {
    pose = { leg: p.onGround ? 'stand' : 'jump', arm: 'fist', face: 'grin', wind: true };
    if (G.endSeq && G.endSeq.t % 100 > 70) pose.arm = 'salute';
  } else if (p.state === 'intro') pose = { leg: 'fall', arm: 'panic', face: 'shout', wind: true };
  else pose = playerPose(p);
  drawHuman(p.x, p.y, p.face, ST.player, pose, p.hurtT > 12 ? '#ffffff' : null);
  if (p.shield > 0 && (p.shield > 120 || (G.t >> 2) % 2)) {
    ctx.globalAlpha = 0.25 + Math.sin(G.t * 0.2) * 0.08;
    dcirc(p.x, p.y - p.h / 2 - 1, 18, '#60b0ff');
    ctx.globalAlpha = 0.8;
    ring(p.x, p.y - p.h / 2 - 1, 18, '#b0e0ff', 1);
    ctx.globalAlpha = 1;
  }
}
function updateMsgs() { for (const m of G.msgs) { m.t++; if (m.t > m.life) m.remove = true; } sweep(G.msgs); }
function drawMsgs() {
  for (const m of G.msgs) {
    const k = Math.min(1, m.t / 10), off = Math.round((1 - k) * (1 - k) * W * 0.8);
    if (m.life - m.t < 20 && (m.t >> 1) % 2) continue;
    drawText(m.text, W / 2 + off, m.y + Math.round(Math.sin(m.t * 0.15) * 1.5), m.color, m.scale, 1);
    if (m.sub) drawText(m.sub, W / 2 - off, m.y + 8 * m.scale + 5, m.subColor, 1, 1);
  }
}
function renderHUD() {
  const p = G.player;
  ctx.fillStyle = 'rgba(12,6,14,0.55)'; ctx.fillRect(0, 0, W, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 23, W, 1);
  // score + lives + health
  drawText('1UP', 6, 3, GRAD_GOLD, 1, 0);
  drawText(String(G.score).padStart(8, '0'), 28, 3, '#ffffff', 1, 0);
  for (let i = 0; i < Math.max(0, G.lives); i++) drawLifeIcon(10 + i * 11, 21);
  for (let i = 0; i < p.maxHp; i++) {
    const x = 50 + i * 11, y = 14;
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 1, y - 1, 10, 7);
    ctx.fillStyle = i < p.hp ? '#ff3a3a' : '#40202a'; ctx.fillRect(x, y, 8, 5);
    if (i < p.hp) { ctx.fillStyle = '#ffa0a0'; ctx.fillRect(x, y, 8, 1); }
  }
  if (p.shield > 0) drawText('SHIELD', 88, 13, '#80c8ff', 1, 0);
  // arms
  const wpn = WEAPONS[p.weapon];
  ctx.fillStyle = OUTLINE; ctx.fillRect(163, 2, 118, 20);
  ctx.fillStyle = '#2a1e30'; ctx.fillRect(164, 3, 116, 18);
  drawText('ARMS', 168, 5, '#a090b0', 1, 0, false);
  drawText(p.weapon === 'P' ? 'INF' : String(p.ammo), 196, 5, '#ffffff', 1, 0, false);
  drawText(wpn.name, 168, 13, WEAPON_COL[p.weapon] || '#e0e0e0', 1, 0, false);
  drawText('BOMB', 234, 5, '#a090b0', 1, 0, false);
  drawText(String(p.bombs), 262, 5, p.bombs ? '#a0ff80' : '#ff6060', 1, 0, false);
  ctx.fillStyle = '#4a7a30'; ctx.fillRect(236, 14, 5, 5); ctx.fillStyle = '#9ad060'; ctx.fillRect(236, 14, 2, 2);
  // tank health
  const tk = G.tank;
  if (tk && tk.occupied) {
    drawText('BULLDOG', 246, 13, '#ffe040', 1, 0, false);
    ctx.fillStyle = OUTLINE; ctx.fillRect(163, 25, 118, 7);
    ctx.fillStyle = '#302030'; ctx.fillRect(164, 26, 116, 5);
    ctx.fillStyle = tk.hp > 35 ? '#70d040' : (G.t >> 3) % 2 ? '#ff4040' : '#a02020'; ctx.fillRect(164, 26, Math.round(116 * tk.hp / tk.max), 5);
  }
  // captives
  drawCaptiveIcon(W - 64, 20);
  drawText('x' + G.rescued, W - 54, 7, '#ffffff', 1, 0);
  drawText('/' + G.totalCaptives, W - 36, 7, '#a090b0', 1, 0);
  drawText(ZONE_NAMES[G.zone], W - 6, 15, '#c0b0c8', 1, 2);
  if (Snd.muted) drawText('MUTE', W - 6, 28, '#ff8080', 1, 2);
  // boss
  if (G.boss && !G.boss.gone && G.boss.state !== 'dying') drawBossBar(G.boss);
  // GO arrow
  if (G.goArrow > 0 && G.cam.lock === null && (G.goArrow >> 4) % 2 === 0) {
    drawText('GO!', W - 58, 104, GRAD_GOLD, 3, 1);
    const ax = W - 22 + ((G.t >> 2) % 3);
    drawText(']', ax, 106, '#ffe040', 3, 1);
  }
  drawMsgs();
}
function drawLifeIcon(x, y) {
  fr(-3, -7, 7, 7, '#f2b27c'); fr(-4, -6, 8, 2, '#ec2e2a'); fr(-6, -5, 2, 1, '#ec2e2a'); fr(1, -3, 1, 1, INK);
  fdraw(x, y);
}
function drawCaptiveIcon(x, y) {
  fr(-3, -8, 7, 7, '#f4c496'); fr(-2, -4, 6, 4, '#8a5a36'); fr(1, -6, 1, 1, INK); fr(-3, -1, 7, 1, '#c8a060');
  fdraw(x, y);
}
function renderPause() {
  ctx.fillStyle = 'rgba(10,4,16,0.7)'; ctx.fillRect(0, 0, W, H);
  drawText('PAUSED', W / 2, 62, GRAD_STEEL, 4, 1);
  for (let i = 0; i < PAUSE_ITEMS.length; i++) {
    let s = PAUSE_ITEMS[i];
    if (i === 2) s += Snd.muted ? ': OFF' : ': ON';
    if (i === 1 && !G.checkpoint) s = 'RESTART MISSION';
    const sel = i === G.menu;
    drawText((sel ? '> ' : '  ') + s + (sel ? ' <' : '  '), W / 2, 114 + i * 18, sel ? GRAD_GOLD : '#b0a0c0', 1, 1);
  }
  drawControlsBox(196);
}
function drawControlsBox(y) {
  const lines = Input.touchMode ? ['D-PAD: MOVE / AIM / CROUCH', 'JUMP  FIRE  BOMB BUTTONS', 'DOWN+JUMP: DROP / EXIT TANK'] :
    ['MOVE / AIM: ARROWS OR WASD', 'JUMP: Z K SPACE   FIRE: X J   BOMB: C L', 'PAUSE: P ESC   MUTE: M   KNIFE: FIRE UP CLOSE', 'DOWN+JUMP: DROP DOWN / EXIT TANK', 'GAMEPAD: A JUMP  X FIRE  B BOMB  START PAUSE'];
  const cx = G.scene === 'pause' ? W / 2 : 292, bw = 300;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(cx - bw / 2, y - 4, bw, lines.length * 11 + 6);
  for (let i = 0; i < lines.length; i++) drawText(lines[i], cx, y + i * 11, '#d0c8e0', 1, 1, false);
}
function renderGameOver() {
  ctx.fillStyle = 'rgba(20,0,8,0.65)'; ctx.fillRect(0, 0, W, H);
  if (G.contT > 0) {
    drawText('GAME OVER', W / 2, 60, GRAD_RED, 4, 1);
    drawText('CONTINUE?', W / 2, 108, '#ffffff', 2, 1);
    const n = Math.floor(G.contT / 60);
    const pulse = G.contT % 60 > 50 ? 6 : 5;
    drawText(String(n), W / 2, 130, GRAD_GOLD, pulse, 1);
    if ((G.goT >> 4) % 2) drawText(Input.touchMode ? 'TAP TO CONTINUE' : 'PRESS START (ENTER) TO CONTINUE', W / 2, 186, '#ffe080', 1, 1);
    drawText(G.checkpoint ? 'RESUME FROM CHECKPOINT ' + G.checkpoint.id : 'RESTART FROM MISSION START', W / 2, 200, '#b0a0c0', 1, 1);
    drawText('FIRE: COUNT DOWN FASTER', W / 2, 214, '#806890', 1, 1);
  } else {
    drawText('GAME OVER', W / 2, 100, GRAD_RED, 5, 1);
    drawText('FINAL SCORE ' + G.score, W / 2, 150, '#ffffff', 1, 1);
  }
}
function renderComplete() {
  const T = G.tally;
  drawSky(ZONE_X[3] + 100);
  for (const L of BG_LAYERS) ctx.drawImage(L.c, Math.round(ZONE_X[3] * L.f), 0, W, H, 0, 0, W, H);
  ctx.fillStyle = 'rgba(10,4,16,0.72)'; ctx.fillRect(0, 0, W, H);
  const sx = Math.round(G.cam.sx), sy = Math.round(G.cam.sy);
  ctx.setTransform(1, 0, 0, 1, sx, sy);
  drawText('MISSION COMPLETE', W / 2, 16, GRAD_GOLD, 3, 1);
  for (let i = 0; i < T.shown; i++) {
    const r = T.rows[i], y = 64 + i * 22;
    drawText(r[0], 60, y, '#e0d0f0', 1, 0);
    if (r[1]) drawText(r[1], 250, y, '#a0ff80', 1, 1);
    drawText(String(T.counts[i]).padStart(7, ' '), 330, y, '#ffffff', 2, 0);
  }
  if (T.shown >= T.rows.length && T.t > 30 + T.rows.length * 45) {
    ctx.fillStyle = '#ffe040'; ctx.fillRect(60, 176, 360, 1);
    drawText('TOTAL', 60, 186, GRAD_GOLD, 2, 0);
    drawText(String(T.totalShown).padStart(7, ' '), 330, 186, GRAD_GOLD, 2, 0);
  }
  const rankT = 30 + T.rows.length * 45 + 60;
  if (T.t >= rankT) {
    const k = Math.min(1, (T.t - rankT) / 8);
    const sc = Math.round(lerp(12, 6, k));
    drawText('RANK', 110, 222, '#e0d0f0', 2, 1);
    const col = { S: GRAD_GOLD, A: GRAD_GREEN, B: GRAD_STEEL, C: '#d0a080', D: '#a08080' }[T.rank];
    drawText(T.rank, 180, 240 - sc * 4, col, sc, 1);
    if (G.score >= G.hi && T.t > rankT + 20 && (T.t >> 3) % 2) drawText('NEW HIGH SCORE!', 330, 222, '#ff80c0', 1, 1);
    if (T.t > rankT + 40 && (T.t >> 4) % 2) drawText(Input.touchMode ? 'TAP TO CONTINUE' : 'PRESS START', 330, 240, '#ffffff', 1, 1);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.save(); ctx.translate(0, 0); drawParts(0, W); ctx.restore();
}
function renderTitle() {
  const cx = Math.round(titleCam);
  drawBackgrounds(cx);
  ctx.setTransform(1, 0, 0, 1, -cx, 0);
  ctx.drawImage(fgCanvas, cx, 0, W, LH * TS, cx, 0, W, LH * TS);
  drawDynDecor(cx, cx + W);
  drawFx(); drawParts(cx, cx + W);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawFgSilhouettes(cx);
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, 'rgba(10,4,20,0.55)'); grd.addColorStop(0.5, 'rgba(10,4,20,0.15)'); grd.addColorStop(1, 'rgba(10,4,20,0.75)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  // animated logo: letters drop in and bob
  const T = G.frame;
  const word1 = 'BANDANA', word2 = 'BLITZ!';
  const drawWord = (w, y, sc, col, delay) => {
    const tw = w.length * 6 * sc;
    for (let i = 0; i < w.length; i++) {
      const lt = T - delay - i * 5;
      if (lt < 0) continue;
      const drop = lt < 20 ? (1 - lt / 20) * (1 - lt / 20) * -120 : 0;
      const bob = Math.round(Math.sin(T * 0.06 + i * 0.7) * 2);
      drawText(w[i], W / 2 - tw / 2 + i * 6 * sc, y + drop + bob, col, sc, 0);
    }
  };
  drawWord(word1, 26, 6, GRAD_GOLD, 0);
  drawWord(word2, 76, 6, GRAD_RED, 40);
  // shine sweep
  const sh = (T * 4) % 900 - 200;
  if (sh > 60 && sh < 420) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff'; ctx.save(); ctx.beginPath(); ctx.rect(60, 26, 360, 100); ctx.clip(); ctx.translate(sh, 0); ctx.rotate(0.35); ctx.fillRect(0, -40, 10, 220); ctx.restore(); ctx.globalAlpha = 1; }
  if (T > 80) drawText('OPERATION: SANDSTORM', W / 2, 128, '#ffe8c0', 1, 1);
  // hero posing
  const hx = 50, hy = 262;
  ctx.save(); ctx.translate(hx, hy); ctx.scale(3, 3);
  const firing = T % 120 < 24;
  drawHuman(0, 0, 1, ST.player, { leg: 'stand', arm: 'gun', gun: 'hmg', aim: firing ? -0.2 : -0.35, face: firing ? 'shout' : 'grin', wind: true, bob: (T >> 4) % 2 ? -1 : 0 }, null);
  if (firing && T % 4 < 2) { const g = armGeom(ST.player, { leg: 'stand', aim: -0.2, gun: 'hmg' }); dcirc(g.mx + 2, g.my, 3, '#ffe060'); dcirc(g.mx + 2, g.my, 1.5, '#ffffff'); }
  ctx.restore();
  // soldier running scared on the right
  const rx = 520 - (T * 1.3) % 640;
  ctx.save(); ctx.translate(rx, 266); ctx.scale(2, 2);
  drawHuman(0, 0, -1, ST.soldier, { leg: 'run', ph: (T * 0.07) % 1, arm: 'panic', face: 'panic' }, null);
  ctx.restore();
  if ((T >> 5) % 2 === 0 || G.scene === 'starting') drawText(Input.touchMode ? 'TAP TO START' : 'PRESS START', W / 2, 146, G.scene === 'starting' && (T >> 1) % 2 ? '#ffffff' : GRAD_GOLD, 2, 1);
  drawControlsBox(176);
  drawText('HI ' + String(G.hi).padStart(8, '0'), W - 8, 4, '#ffe080', 1, 2);
  drawText('100% PROCEDURAL - NO ASSETS', 8, 4, '#a898b8', 1, 0);
  if (G.scene === 'starting') { ctx.globalAlpha = Math.min(1, G.startT / 50); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
function drawTouch() {
  if (!Input.touchMode) return;
  if (G.scene !== 'play') {
    return;
  }
  ctx.globalAlpha = 0.3;
  dcirc(DPAD.x, DPAD.y, DPAD.r, '#ffffff');
  ctx.globalAlpha = 0.5;
  dcirc(DPAD.x, DPAD.y, 12, '#20182a');
  const dirs = [['left', -1, 0, '['], ['right', 1, 0, ']'], ['up', 0, -1, '^'], ['down', 0, 1, 'v']];
  for (const [b, dx, dy, ch] of dirs) {
    ctx.globalAlpha = Input.down(b) ? 0.9 : 0.5;
    drawText(ch, DPAD.x + dx * 28, DPAD.y + dy * 28 - 5, '#ffffff', 2, 1);
  }
  for (const b of TOUCH_BTNS) {
    ctx.globalAlpha = Input.down(b.b) ? 0.7 : 0.35;
    dcirc(b.x, b.y, b.r, b.b === 'fire' ? '#ff6040' : b.b === 'jump' ? '#40a0ff' : b.b === 'bomb' ? '#70d040' : '#ffffff');
    ctx.globalAlpha = 0.9;
    drawText(b.label, b.x, b.y - 3, '#ffffff', 1, 1);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------
//  BOOT + MAIN LOOP
// ---------------------------------------------------------------------
function resize() {
  const ww = window.innerWidth, wh = window.innerHeight;
  let s = Math.min(ww / W, wh / H);
  if (s >= 1) { const si = Math.floor(s); if (si / s > 0.86) s = si; }
  const cw = Math.floor(W * s), ch = Math.floor(H * s);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  cv.style.left = Math.floor((ww - cw) / 2) + 'px'; cv.style.top = Math.floor((wh - ch) / 2) + 'px';
}
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.scene === 'play' && !G.endSeq) { G.scene = 'pause'; G.menu = 0; Music.duck(true); }
});
function boot() {
  resize();
  buildLevel();
  prerenderLevel();
  buildBackgrounds();
  G.player = makePlayer(60, GY);
  G.scene = 'title';
  let last = performance.now(), acc = 0;
  const STEP = 1000 / 60;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = now - last; last = now;
    if (dt > 250) dt = 250;
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) {
      try { tick(); } catch (err) { reportError(err); }
      acc -= STEP; n++;
    }
    if (n >= 5) acc = 0;
    try { render(); } catch (err) { reportError(err); }
  }
  requestAnimationFrame(frame);
}
let lastErr = 0;
function reportError(err) {
  if (typeof console !== 'undefined') console.error(err);
  window.__gameErrors = (window.__gameErrors || 0) + 1;
  lastErr = err;
}
window.__G = G;
window.__dbg = { groundYAt, exitTank, startBossFight, spawnFromEvent, startLevel };
boot();
