// =====================================================================
//  SPRITES: procedural pixel-art characters, vehicles, items
// =====================================================================
const ST = {
  player: { skin: '#f2b27c', skinD: '#c47a4e', shirt: '#4f8a3a', shirtD: '#35622a', pants: '#4a5670', pantsD: '#343d52', boots: '#2a2228', hat: 'bandana', hatC: '#ec2e2a', hatD: '#a01818', hair: '#3a2216', belt: '#6a4524', deco: 'bandolier' },
  soldier: { skin: '#eaa878', skinD: '#b87850', shirt: '#cfae6c', shirtD: '#a48652', arm: '#cfae6c', armD: '#a48652', pants: '#7a6646', pantsD: '#5a4a32', boots: '#3a2c24', hat: 'helmet', hatC: '#8f8a3c', hatD: '#5e5a26', hair: '#3a2a1a', belt: '#4a3a28', deco: 'armband' },
  rusher: { skin: '#e0a070', skinD: '#a86e46', shirt: '#e0a070', shirtD: '#a86e46', arm: '#e0a070', armD: '#a86e46', pants: '#6a4a8a', pantsD: '#4a3266', boots: '#2a2030', hat: 'mask', hatC: '#2c2a38', hatD: '#c02020', hair: '#222', belt: '#302030', deco: 'abs' },
  sniper: { skin: '#e0a070', skinD: '#b07850', shirt: '#6e7c3c', shirtD: '#4e5a2a', arm: '#6e7c3c', armD: '#4e5a2a', pants: '#5e6a34', pantsD: '#444e24', boots: '#2a2a1e', hat: 'hood', hatC: '#5c6a2e', hatD: '#3e4a1e', hair: '#222', belt: '#3a3a22', deco: 'ghillie' },
  heavy: { bulky: 1, skin: '#e8a070', skinD: '#b07048', shirt: '#6c737e', shirtD: '#4c525c', arm: '#7a828e', armD: '#555c66', pants: '#4a4e5a', pantsD: '#363a44', boots: '#202024', hat: 'heavy', hatC: '#565e68', hatD: '#3a4048', hair: '#2a1a10', belt: '#2e2e34', deco: 'armor' },
  bomber: { skin: '#eab080', skinD: '#b87850', shirt: '#b8a074', shirtD: '#907850', arm: '#b8a074', armD: '#907850', pants: '#6a5a3e', pantsD: '#4e422c', boots: '#3a2c24', hat: 'wild', hatC: '#2a1a12', hatD: '#1a100a', hair: '#2a1a12', belt: '#4a3a28', deco: 'dynamite' },
  carrier: { skin: '#e8a878', skinD: '#b87850', shirt: '#b99c64', shirtD: '#94784a', arm: '#b99c64', armD: '#94784a', pants: '#6e5c40', pantsD: '#54462e', boots: '#3a2c24', hat: 'cap', hatC: '#9a3a2a', hatD: '#6a2418', hair: '#3a2a1a', belt: '#4a3a28', deco: 'armband' },
  captive: { skin: '#f4c496', skinD: '#c8906a', shirt: '#f4f2e8', shirtD: '#d4d0c0', pants: '#f0eee6', pantsD: '#d8d4c8', boots: '#f4c496', hat: 'bald', beard: '#8a5a36', hair: '#8a5a36', belt: '#d8d4c8', deco: 'captive' }
};
const GUNLEN = { pistol: 6, rifle: 11, hmg: 12, spread: 10, flame: 11, rocket: 10, laser: 11, mg: 14, sniper: 15, knife: 6 };
const TWOHAND = { rifle: 1, hmg: 1, spread: 1, flame: 1, rocket: 1, laser: 1, mg: 1, sniper: 1 };
const INK = '#1e1020';

function hipOf(pose) {
  let h = -10;
  if (pose.leg === 'crouch' || pose.leg === 'cwalk') h = -6;
  else if (pose.leg === 'sit') h = -3;
  else if (pose.leg === 'jump') h = -11;
  return h + (pose.bob || 0);
}
function armGeom(st, pose) {
  const B = st.bulky ? 1 : 0, hip = hipOf(pose), top = hip - (9 + B);
  const a = pose.aim || 0, dx = Math.cos(a), dy = Math.sin(a);
  const sx = 1 + B * 2 + (dy < -0.8 ? 1 : 0), sy = top + 3;
  const hx = sx + dx * 5, hy = sy + dy * 5, gl = GUNLEN[pose.gun] || 8;
  return { sx, sy, hx, hy, dx, dy, mx: hx + dx * gl, my: hy + dy * gl, top };
}
function leg(hx, hy, fx, fy, kx, ky, c, bc) {
  if (kx === undefined) { kx = (hx + fx) / 2; ky = (hy + fy - 2) / 2; }
  fline(hx, hy, kx, ky, 3, c);
  fline(kx, ky, fx, fy - 2, 3, c);
  fr(fx - 1, fy - 3, 5, 3, bc);
}
function drawLegs(pose, hip, st) {
  const pc = st.pants, pd = st.pantsD, bc = st.boots;
  switch (pose.leg) {
    case 'run': {
      const th = pose.ph * TAU;
      const la = Math.max(0, Math.cos(th)) * 4, lb = Math.max(0, Math.cos(th + PI)) * 4;
      const fa = Math.sin(th) * 5 + 1, fb = Math.sin(th + PI) * 5 + 1;
      leg(-1, hip, fb, -lb, (fb - 1) / 2 + 2 + lb * 0.5, (hip - lb) / 2 - 1, pd, bc);
      leg(2, hip, fa, -la, (fa + 2) / 2 + 2 + la * 0.5, (hip - la) / 2 - 1, pc, bc);
      break;
    }
    case 'jump': leg(-1, hip, -3, -2, -3, hip + 4, pd, bc); leg(2, hip, 4, -5, 6, hip + 2, pc, bc); break;
    case 'fall': leg(-1, hip, -3, -1, undefined, undefined, pd, bc); leg(2, hip, 3, 0, 4, hip / 2 - 1, pc, bc); break;
    case 'crouch': case 'cwalk': {
      const s = pose.leg === 'cwalk' ? Math.sin(pose.ph * TAU) * 2 : 0;
      fline(-2, hip, 0, -2, 3, pd); fline(0, -2, -5 - s, -2, 3, pd); fr(-8 - s, -4, 4, 3, bc);
      leg(2, hip, 5 + s, 0, 7 + s, hip, pc, bc);
      break;
    }
    case 'climb': {
      const s = Math.sin(pose.ph * TAU) * 3;
      leg(-2, hip, -2, -2 + s, 1, hip / 2 + s / 2, pd, bc); leg(2, hip, 2, -2 - s, 4, hip / 2 - s / 2, pc, bc);
      break;
    }
    case 'sit': leg(-1, hip, 6, 0, 3, -5, pd, bc); leg(2, hip, 9, 0, 6, -5, pc, bc); break;
    case 'dance': {
      const s = Math.sin(pose.ph * TAU);
      leg(-1, hip, -3 + s * 2, s > 0 ? -3 : 0, undefined, undefined, pd, bc); leg(2, hip, 4 + s * 2, s < 0 ? -3 : 0, undefined, undefined, pc, bc);
      break;
    }
    default: leg(-1, hip, -2, 0, undefined, undefined, pd, bc); leg(2, hip, 3, 0, undefined, undefined, pc, bc);
  }
}
function drawGun(g, gun, flash) {
  const { hx, hy, dx, dy } = g;
  const P = (k) => [hx + dx * k, hy + dy * k];
  let a, b;
  switch (gun) {
    case 'pistol': a = P(-1); b = P(6); fline(a[0], a[1], b[0], b[1], 2, '#3a3a46'); fr(hx - 1, hy, 2, 3, '#2a2a30'); break;
    case 'rifle': a = P(-4); b = P(11); fline(a[0], a[1], b[0], b[1], 2, '#3c3228'); a = P(-5); b = P(0); fline(a[0], a[1], b[0], b[1], 3, '#7a4a28'); break;
    case 'hmg': a = P(-5); b = P(9); fline(a[0], a[1], b[0], b[1], 3, '#52586a'); a = P(8); b = P(13); fline(a[0], a[1], b[0], b[1], 2, '#2c2c34'); a = P(2); fr(a[0] - 1, a[1] + 1, 3, 3, '#6a5a2a'); break;
    case 'spread': a = P(-4); b = P(8); fline(a[0], a[1], b[0], b[1], 3, '#8a3aa0'); b = P(10); fr(b[0] - 2, b[1] - 2, 4, 4, '#ff70d0'); break;
    case 'flame': a = P(-4); b = P(9); fline(a[0], a[1], b[0], b[1], 3, '#b05a22'); b = P(11); fr(b[0] - 1, b[1] - 1, 3, 3, '#e8e0d0'); break;
    case 'rocket': a = P(-8); b = P(10); fline(a[0], a[1], b[0], b[1], 4, '#4a6e3a'); b = P(10); fr(b[0] - 2, b[1] - 2, 4, 4, '#2e4424'); a = P(-8); fr(a[0] - 2, a[1] - 2, 4, 4, '#2e4424'); break;
    case 'laser': a = P(-4); b = P(9); fline(a[0], a[1], b[0], b[1], 3, '#3a7ab0'); b = P(11); fr(b[0] - 1, b[1] - 1, 3, 3, '#a8f4ff'); break;
    case 'mg': a = P(-6); b = P(12); fline(a[0], a[1], b[0], b[1], 4, '#4a4a54'); a = P(10); b = P(15); fline(a[0], a[1], b[0], b[1], 2, '#2a2a30'); a = P(0); fr(a[0] - 2, a[1] + 1, 4, 4, '#8a7a30'); break;
    case 'sniper': a = P(-5); b = P(15); fline(a[0], a[1], b[0], b[1], 2, '#2e3a2a'); a = P(3); fr(a[0] - 1, a[1] - 3, 5, 2, '#1a1a1a'); break;
    case 'knife': a = P(0); b = P(6); fline(a[0], a[1], b[0], b[1], 1, '#e8f0ff'); break;
  }
}
// main humanoid renderer. pose: {leg, ph, aim, gun, arm, at, face, bob, noHat}
function drawHuman(x, y, face, st, pose, flash, rot, alpha) {
  const B = st.bulky ? 1 : 0, T = G.t;
  const hip = hipOf(pose), tw = 8 + B * 5, th = 9 + B, top = hip - th;
  const arm = st.arm || st.skin, armD = st.armD || st.skinD;
  const sx = 1 + B * 2, sy = top + 3;
  const ph = pose.ph || 0;
  let g = null;
  // --- back arm ---
  switch (pose.arm) {
    case 'gun':
      g = armGeom(st, pose);
      if (TWOHAND[pose.gun]) {
        const tx = g.hx + g.dx * 4, ty = g.hy + g.dy * 4 + 1;
        fline(-2, sy, (tx - 2) / 2 - 1, (sy + ty) / 2 + 2, 3, armD);
        fline((tx - 2) / 2 - 1, (sy + ty) / 2 + 2, tx, ty, 3, armD);
      } else fline(-2, sy, -3, sy + 6, 3, armD);
      break;
    case 'panic': case 'dance': {
      const a = -1.7 + Math.sin(T * 0.55 + 2) * 0.8;
      fline(-2, sy, -2 + Math.cos(a) * 7, sy + Math.sin(a) * 7, 3, armD);
      break;
    }
    case 'carry': fline(-2, sy, -3, top - 6, 3, armD); break;
    case 'tied': break;
    default: {
      const sw = pose.leg === 'run' ? Math.sin(ph * TAU) * 3 : 0;
      fline(-2, sy, -2 - sw, sy + 6, 3, armD);
    }
  }
  // --- legs ---
  drawLegs(pose, hip, st);
  // --- torso ---
  fr(-tw / 2, top, tw, th, st.shirt);
  fr(-tw / 2, top + th - 4, tw, 2, st.shirtD);
  fr(-tw / 2, hip - 2, tw, 2, st.belt);
  switch (st.deco) {
    case 'bandolier': for (let i = 0; i < 4; i++) fr(-3 + i * 2, top + 1 + i * 2, 2, 1, '#e8c048'); fr(1, top + 1, 1, 2, '#c0c8d0'); break;
    case 'armband': fr(1, top + 2, 2, 2, st.shirtD); break;
    case 'abs': fr(-1, top + 3, 1, 4, st.skinD); fr(1, top + 3, 1, 4, st.skinD); fr(-3, top + 1, 6, 1, st.skinD); break;
    case 'armor': fr(-tw / 2 - 1, top - 1, tw + 2, 5, '#8a929c'); fr(-tw / 2, top, tw, 1, '#b8c0c8'); fr(-tw / 2 - 2, top - 1, 4, 4, '#9aa2ac'); break;
    case 'ghillie': fr(-5, top + 2, 2, 3, '#7a8a44'); fr(3, top + 4, 2, 3, '#4a5a22'); fr(-2, top - 1, 3, 2, '#7a8a44'); break;
    case 'dynamite':
      for (let i = 0; i < 3; i++) fr(-4 + i * 3, top + 2, 2, 5, '#d83424');
      fr(-4, top + 4, 8, 1, '#3a3a3a');
      if ((T >> 2) % 2) fr(3, top - 1, 2, 2, '#ffe040', 1);
      break;
    case 'captive': fr(-tw / 2, hip - 2, tw, 2, '#f0eee6'); fr(-tw / 2 + 1, hip - 1, 2, 1, '#e04040'); fr(1, hip - 1, 2, 1, '#e04040'); break;
  }
  // --- head ---
  const hx = -3 + B, hy = top - 7 + (pose.hbob || 0);
  const noHat = pose.noHat;
  fr(hx, hy, 7, 7, st.skin);
  fr(hx + 7, hy + 3, 1, 2, st.skinD);
  fr(hx + 1, hy + 3, 1, 2, st.skinD);
  const ex = hx + 4, ey = hy + 2;
  switch (pose.face) {
    case 'panic':
      fr(ex - 1, ey - 1, 3, 3, '#ffffff'); fr(ex + 1, ey, 1, 1, INK);
      fr(ex, ey + 3, 3, 3, INK); fr(ex + 1, ey + 5, 1, 1, '#e05070');
      break;
    case 'dead':
      fr(ex, ey, 1, 1, INK); fr(ex + 2, ey, 1, 1, INK); fr(ex + 1, ey + 1, 1, 1, INK); fr(ex, ey + 2, 1, 1, INK); fr(ex + 2, ey + 2, 1, 1, INK);
      fr(ex + 1, ey + 4, 2, 1, '#e05070');
      break;
    case 'happy':
      fr(ex, ey, 2, 1, INK); fr(ex - 1, ey + 1, 1, 1, INK);
      fr(ex, ey + 3, 3, 1, INK); fr(ex + 1, ey + 4, 2, 1, '#e05070');
      break;
    case 'hurt':
      fr(ex - 1, ey + 1, 3, 1, INK); fr(ex, ey + 3, 2, 2, INK);
      break;
    case 'shout':
      fr(ex, ey, 1, 2, INK); fr(ex - 1, ey - 1, 3, 1, st.hair || INK); fr(ex, ey + 3, 3, 2, INK);
      break;
    default:
      fr(ex, ey, 1, 2, INK); fr(ex - 1, ey - 1, 3, 1, st.hair || INK);
      if (pose.face === 'grin') fr(ex, ey + 3, 3, 1, '#ffffff');
  }
  if (!noHat) switch (st.hat) {
    case 'bandana': {
      const wv = pose.wind ? 2 : 0.5, s1 = Math.sin(T * 0.35) * wv, s2 = Math.sin(T * 0.35 + 1.4) * wv;
      fr(hx - 1, hy - 1, 7, 3, st.hair); fr(hx + 1, hy - 2, 2, 1, st.hair); fr(hx + 4, hy - 2, 2, 1, st.hair);
      fr(hx - 1, hy + 1, 8, 2, st.hatC); fr(hx + 1, hy + 1, 2, 1, '#ff7060');
      fr(hx - 4 - (pose.wind ? 1 : 0), hy + 1 + Math.round(s1), 3 + (pose.wind ? 1 : 0), 1, st.hatC);
      fr(hx - 5 - (pose.wind ? 2 : 0), hy + 2 + Math.round(s2), 3 + (pose.wind ? 1 : 0), 1, st.hatD);
      break;
    }
    case 'helmet':
      fr(hx - 1, hy - 2, 9, 4, st.hatC); fr(hx - 2, hy + 1, 11, 1, st.hatD); fr(hx + 1, hy - 1, 3, 1, '#b8b060');
      fr(hx + 2, hy + 2, 1, 4, st.hatD);
      break;
    case 'mask':
      fr(hx, hy - 1, 7, 8, st.hatC); fr(hx + 3, hy + 2, 4, 2, st.skin); fr(ex, ey, 1, 2, INK);
      fr(hx - 1, hy, 8, 1, st.hatD); fr(hx - 3, hy + Math.round(Math.sin(T * 0.4)), 2, 1, st.hatD);
      break;
    case 'hood':
      fr(hx - 1, hy - 2, 8, 5, st.hatC); fr(hx - 2, hy + 2, 3, 5, st.hatC); fr(hx + 2, hy - 3, 2, 1, '#7a8a44');
      fr(hx + 3, hy + 1, 4, 2, '#202830'); fr(hx + 5, hy + 1, 2, 1, '#80e0ff');
      break;
    case 'heavy':
      fr(hx - 1, hy - 2, 9, 9, st.hatC); fr(hx + 3, hy + 2, 6, 2, '#16161c'); fr(hx + 5, hy + 2, 3, 1, (T >> 3) % 2 ? '#ff5030' : '#ff9060');
      fr(hx, hy - 1, 2, 1, '#8a929c'); fr(hx - 1, hy + 5, 9, 2, st.hatD);
      break;
    case 'cap':
      fr(hx, hy - 1, 7, 2, st.hatC); fr(hx + 5, hy, 4, 1, st.hatD);
      break;
    case 'wild':
      fr(hx - 1, hy - 2, 2, 3, st.hair); fr(hx + 2, hy - 3, 2, 3, st.hair); fr(hx + 5, hy - 2, 2, 2, st.hair); fr(hx - 2, hy, 2, 3, st.hair);
      fr(ex - 1, ey - 1, 3, 3, '#ffffff'); fr(ex, ey, 1, 1, INK);
      break;
    case 'bald':
      fr(hx + 1, hy - 1, 5, 1, st.skin); fr(hx + 2, hy + 4, 6, 4, st.beard); fr(hx + 4, hy + 5, 3, 1, INK);
      fr(hx + 3, hy + 1, 4, 1, st.beard);
      break;
  }
  else if (st.hat === 'heavy') { fr(hx, hy - 1, 7, 1, '#3a2418'); fr(ex - 1, ey - 1, 3, 1, INK); }
  // --- front arm ---
  switch (pose.arm) {
    case 'gun':
      fline(g.sx, g.sy, g.hx, g.hy, 3, arm);
      drawGun(g, pose.gun, flash);
      fr(g.hx - 1, g.hy - 1, 3, 3, st.skin);
      break;
    case 'throw': {
      const a = lerp(-2.7, -0.3, pose.at || 0), hx2 = sx + Math.cos(a) * 7, hy2 = sy + Math.sin(a) * 7;
      fline(sx, sy, hx2, hy2, 3, arm);
      if ((pose.at || 0) < 0.55) fr(hx2 - 2, hy2 - 2, 4, 4, '#3e6a2a');
      fr(hx2 - 1, hy2 - 1, 3, 3, st.skin);
      break;
    }
    case 'knife': {
      const a = lerp(-2.1, 0.9, pose.at || 0), dx = Math.cos(a), dy = Math.sin(a);
      const hx2 = sx + dx * 6, hy2 = sy + dy * 6;
      fline(sx, sy, hx2, hy2, 3, arm);
      fline(hx2, hy2, hx2 + dx * 8, hy2 + dy * 8, 2, '#e8f4ff');
      fr(hx2 - 1, hy2 - 1, 3, 3, '#5a3a22');
      break;
    }
    case 'panic': case 'dance': {
      const a = -1.5 + Math.sin(T * 0.55) * 0.9;
      const hx2 = sx + Math.cos(a) * 7, hy2 = sy + Math.sin(a) * 7;
      fline(sx, sy, hx2, hy2, 3, arm); fr(hx2 - 1, hy2 - 1, 3, 3, st.skin);
      break;
    }
    case 'salute':
      fline(sx, sy, sx + 4, sy + 1, 3, arm); fline(sx + 4, sy + 1, hx + 6, hy + 1, 3, arm); fr(hx + 5, hy, 3, 2, st.skin);
      break;
    case 'wave': {
      const a = -1.9 + Math.sin(T * 0.45) * 0.5;
      const hx2 = sx + Math.cos(a) * 8, hy2 = sy + Math.sin(a) * 8;
      fline(sx, sy, hx2, hy2, 3, arm); fr(hx2 - 1, hy2 - 2, 3, 3, st.skin);
      break;
    }
    case 'fist':
      fline(sx, sy, sx + 2, sy - 9, 3, arm); fr(sx, sy - 13, 4, 4, st.skin);
      break;
    case 'carry': fline(sx, sy, sx + 1, top - 6, 3, arm); fr(sx - 1, top - 8, 3, 3, st.skin); break;
    case 'tied': fr(-tw / 2 - 1, top + 3, tw + 2, 1, '#c8a060'); fr(-tw / 2 - 1, top + 6, tw + 2, 1, '#c8a060'); break;
    case 'hold': fline(sx, sy, sx + 5, sy + 3, 3, arm); fr(sx + 4, sy + 2, 3, 3, st.skin); break;
    default: {
      const sw = pose.leg === 'run' ? -Math.sin(ph * TAU) * 3 : 0;
      fline(sx, sy, sx + 1 + sw, sy + 6, 3, arm); fr(sx + sw, sy + 6, 3, 2, st.skin);
    }
  }
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  fdraw(x, y, face < 0, flash, rot, -12);
  ctx.globalAlpha = 1;
  return g;
}

// approximated filled circle for figure lists
function fwheel(cx, cy, r, c) {
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.4);
    fr(cx - w, cy + dy, w * 2 + 1, 1, c);
  }
}

// ---------------------------------------------------------------------
//  Vehicles & machines
// ---------------------------------------------------------------------
function drawTankSpr(x, y, face, t, flash) {
  const s = Math.round(t.susp), tp = t.tread;
  // tracks
  fr(-19, -11, 38, 11, '#2a262a');
  fr(-18, -10, 36, 9, '#403a40');
  for (let i = 0; i < 5; i++) { fr(-16 + i * 7, -8, 5, 5, '#6c6c74'); fr(-15 + i * 7, -7, 3, 3, '#a0a0a8'); }
  for (let k = 0; k < 10; k++) {
    const xx = -19 + Math.floor(((k * 4 + tp) % 38 + 38) % 38);
    fr(Math.min(xx, 17), -11, 2, 1, '#7a7478'); fr(Math.min(-xx - 1, 17), -1, 2, 1, '#7a7478');
  }
  // hull
  fr(-17, -21 + s, 34, 10, '#6d8c38');
  fr(-17, -13 + s, 34, 2, '#4a6424');
  fr(-20, -19 + s, 5, 7, '#5a7a2c');
  fr(15, -19 + s, 4, 7, '#5a7a2c');
  fr(-12, -18 + s, 22, 2, '#f0c030');
  fr(-12, -16 + s, 22, 1, '#b08020');
  fr(6, -15 + s, 3, 3, '#ffffff');
  fr(-15, -21 + s, 30, 1, '#90b050');
  // cannon
  const rc = Math.round(t.recoil || 0);
  fr(8 - rc, -27 + s, 17, 4, '#50603a'); fr(23 - rc, -28 + s, 4, 6, '#3a4628');
  // turret
  fr(-9, -29 + s, 18, 9, '#7a9a42'); fr(-9, -22 + s, 18, 2, '#58762e'); fr(-7, -29 + s, 12, 1, '#a0c060');
  // driver
  if (t.occupied) {
    fr(-4, -35 + s, 7, 6, '#f2b27c'); fr(-5, -35 + s, 9, 2, '#ec2e2a'); fr(1, -33 + s, 1, 2, INK);
    fr(-8 + Math.round(Math.sin(G.t * 0.4)), -34 + s, 3, 1, '#ec2e2a');
  } else fr(-5, -31 + s, 9, 2, '#3a4a24');
  // machine gun
  const a = t.mgAngle, bx = 3, by = -31 + s;
  fr(bx - 2, by - 1, 4, 3, '#3a3a42');
  fline(bx, by, bx + Math.cos(a) * 10, by + Math.sin(a) * 10, 2, '#2e2e36');
  fdraw(x, y, face < 0, flash);
}
function drawJeepSpr(x, y, face, j, flash) {
  const b = Math.round(Math.sin(G.t * 0.5) * (Math.abs(j.vx) > 0.5 ? 1 : 0.3));
  fwheel(-13, -5, 5, '#26222a'); fwheel(13, -5, 5, '#26222a');
  fr(-14, -6, 3, 3, '#8a8a90'); fr(12, -6, 3, 3, '#8a8a90');
  fr(-22, -17 + b, 44, 9, '#a88a4c');
  fr(-22, -10 + b, 44, 2, '#7a6232');
  fr(10, -24 + b, 3, 8, '#3a3a40');
  fr(12, -23 + b, 6, 6, '#6ab0d0');
  fr(-22, -20 + b, 20, 3, '#8a7038');
  fr(-20, -15 + b, 6, 3, '#ffe070');
  fr(16, -15 + b, 5, 2, '#ff5040');
  // skull emblem
  fr(-2, -15 + b, 4, 3, '#f0e8d8'); fr(-1, -14 + b, 1, 1, INK); fr(1, -14 + b, 1, 1, INK);
  fdraw(x, y, face < 0, flash);
}
function drawTruckSpr(x, y, face, tr, flash) {
  const b = Math.round(Math.sin(G.t * 0.4) * (Math.abs(tr.vx) > 0.3 ? 1 : 0));
  fwheel(-24, -6, 6, '#26222a'); fwheel(-8, -6, 6, '#26222a'); fwheel(22, -6, 6, '#26222a');
  fr(-25, -7, 3, 3, '#8a8a90'); fr(-9, -7, 3, 3, '#8a8a90'); fr(21, -7, 3, 3, '#8a8a90');
  // cab (front = +x before mirroring)
  fr(14, -30 + b, 18, 20, '#7c8a4a'); fr(20, -28 + b, 10, 7, '#6ab0d0'); fr(30, -14 + b, 4, 4, '#ffe070');
  fr(14, -12 + b, 18, 2, '#5a6634');
  // cargo bed with canvas
  fr(-34, -16 + b, 46, 6, '#6a7640');
  fr(-34, -38 + b, 46, 22, '#a89a68');
  for (let i = 0; i < 4; i++) fr(-32 + i * 12, -38 + b, 2, 22, '#887a4c');
  fr(-34, -40 + b, 46, 3, '#c0b080');
  if (tr.open) fr(-35, -34 + b, 3, 18, '#1a1418');
  fdraw(x, y, face < 0, flash);
}
function drawDroneSpr(x, y, d, flash) {
  const T = G.t, bl = (T >> 1) % 2;
  fr(-7, -3, 14, 6, '#4a4e5a'); fr(-5, -5, 10, 2, '#5e6472'); fr(-6, 1, 12, 1, '#2e3038');
  fr(-2, -1, 4, 3, '#1a1a20'); fr(-1, 0, 2, 1, (T >> 2) % 2 ? '#ff3030' : '#ff9090');
  fr(-12, -5, 6, 1, '#3a3a44'); fr(6, -5, 6, 1, '#3a3a44');
  fr(-14, -7, bl ? 10 : 6, 1, '#c8d0e0', 1); fr(bl ? 4 : 6, -7, bl ? 10 : 6, 1, '#c8d0e0', 1);
  fr(-3, 3, 1, 2, '#3a3a44'); fr(2, 3, 1, 2, '#3a3a44');
  if (d.bombReady) fr(-2, 4, 4, 4, '#2a2a2a');
  fdraw(x, y, false, flash, d.rot || 0, 0);
}
// y = anchor: ground surface for floor turrets, ceiling surface for hanging ones
function drawTurretSpr(x, y, tu, flash) {
  const light = tu.charge > 0 && (G.t >> 1) % 2 ? '#ff3030' : '#b02020';
  if (!tu.ceiling) { fr(-9, -4, 18, 4, '#3e4048'); fr(-7, -12, 14, 8, '#6a707c'); fr(-6, -12, 12, 2, '#8a929e'); fr(-2, -10, 4, 3, light); }
  else { fr(-9, 0, 18, 4, '#3e4048'); fr(-7, 4, 14, 8, '#6a707c'); fr(-6, 10, 12, 2, '#8a929e'); fr(-2, 7, 4, 3, light); }
  const cx = 0, cy = tu.ceiling ? 8 : -8, a = tu.ang;
  fline(cx, cy, cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, 3, '#2e3038');
  fr(Math.round(cx + Math.cos(a) * 12) - 1, Math.round(cy + Math.sin(a) * 12) - 1, 3, 3, '#1a1a1e');
  fdraw(x, y, false, flash);
}
function drawHeliSpr(x, y, face) {
  const T = G.t, bl = (T >> 1) % 2;
  fr(-26, -18, 40, 16, '#5a6a3a'); fr(-22, -16, 10, 7, '#8ad0f0'); fr(-26, -4, 40, 2, '#3e4a28');
  fr(14, -14, 34, 5, '#5a6a3a'); fr(44, -22, 4, 12, '#4a5a2e');
  fr(-10, -22, 16, 4, '#4a5a2e');
  fr(-40 + (bl ? 4 : 0), -24, bl ? 72 : 64, 1, '#d0d8e0', 1);
  fr(42, -26 + (bl ? 2 : 0), 1, 10, '#d0d8e0', 1);
  fr(-20, 0, 30, 2, '#2a2a30'); fr(-16, -2, 2, 2, '#2a2a30'); fr(4, -2, 2, 2, '#2a2a30');
  fr(0, -12, 6, 5, '#f0c030');
  fdraw(x, y, face < 0);
}

// ---------------------------------------------------------------------
//  Pickups
// ---------------------------------------------------------------------
const WEAPON_COL = { H: '#ffb020', S: '#d050f0', F: '#ff5a20', R: '#50c040', L: '#40d8ff' };
function drawPickupSpr(x, y, kind) {
  const T = G.t;
  switch (kind) {
    case 'H': case 'S': case 'F': case 'R': case 'L': case 'B': case 'A': {
      const col = kind === 'B' ? '#6a9a40' : kind === 'A' ? '#e8d040' : WEAPON_COL[kind];
      fr(-7, -13, 14, 13, col);
      fr(-7, -13, 14, 2, '#ffffff'); fr(-7, -2, 14, 2, mixHex(col, '#000000', 0.35));
      fr(-6, -11, 12, 9, mixHex(col, '#000000', 0.15));
      fdraw(x, y);
      drawText(kind === 'A' ? 'A' : kind, x, y - 11, '#ffffff', 1, 1, true);
      return;
    }
    case 'hp':
      fr(-7, -12, 14, 12, '#f4f4f4'); fr(-7, -12, 14, 2, '#ffffff'); fr(-7, -2, 14, 2, '#c8c8c8');
      fr(-2, -10, 4, 8, '#e02828'); fr(-5, -8, 10, 4, '#e02828');
      break;
    case 'shield': {
      fwheel(0, -7, 7, '#3a8ae8'); fwheel(-1, -8, 4, '#80c8ff'); fr(-3, -10, 2, 2, '#ffffff');
      break;
    }
    case 'medal':
      fr(-3, -14, 2, 6, '#2a60d0'); fr(1, -14, 2, 6, '#e02828');
      fwheel(0, -5, 4, '#ffcc30'); fr(-1, -6, 2, 2, '#fff4a0');
      break;
    case 'apple':
      fwheel(0, -5, 4, '#e02828'); fr(-2, -7, 2, 2, '#ff9090'); fr(0, -11, 1, 3, '#5a3a1a'); fr(1, -11, 3, 2, '#40b030');
      break;
    case 'banana':
      fr(-5, -6, 3, 3, '#ffe040'); fr(-3, -4, 6, 3, '#ffe040'); fr(3, -7, 3, 4, '#ffe040'); fr(5, -9, 1, 2, '#5a3a1a'); fr(-2, -4, 5, 1, '#fff6a0');
      break;
    case 'gold':
      fr(-7, -6, 14, 6, '#e8a820'); fr(-5, -9, 10, 3, '#ffd040'); fr(-4, -9, 3, 1, '#fffbe0'); fr(-7, -1, 14, 1, '#a07010');
      break;
    case 'gem':
      fr(-4, -9, 8, 3, '#60f0ff'); fr(-3, -6, 6, 2, '#30c0e0'); fr(-2, -4, 4, 2, '#2090c0'); fr(-1, -2, 2, 1, '#1070a0'); fr(-3, -9, 2, 1, '#ffffff');
      break;
    case 'chicken':
      fwheel(-1, -5, 4, '#c87830'); fr(3, -4, 4, 2, '#f0e8d8'); fr(6, -5, 2, 4, '#f0e8d8'); fr(-3, -8, 3, 2, '#e8a050');
      break;
    case 'coin':
      fr(-3, -8, 6, 8, '#ffcc30'); fr(-1, -6, 2, 4, '#e0a010'); fr(-2, -8, 1, 2, '#fff4a0');
      break;
  }
  fdraw(x, y);
}
