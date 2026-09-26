// The 18 invented drinks: containers are lathed / extruded from real-world
// profiles and wrapped in canvas-painted labels.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M } from './materials.js';
import { drinkLabelTexture } from './textures.js';
import { ROWS, COLS, colX, shelfY } from './layout.js';

export const HOT_COLS = 5; // bottom row: first five slots are hot

// row-major: 3 rows × 6 columns
export const PRODUCTS = [
  // --- top row: cold PET bottles
  { type: 'pet500', price: 150, vol: '500ml', kind: '緑茶', cap: 0x2f7d32, liquid: 0xb4ad3a,
    label: { layout: 'vertical', bg: ['#ffffff', '#e9f4df'], ink: '#1f5a2a', jp: '緑の杜', name: 'MIDORI', sub: '緑茶', graphic: 'leaf', gcol: ['#4f9a3c', '#d9edc8'], bands: [[0, 0.07, '#2f7d32'], [0.93, 1, '#2f7d32']] } },
  { type: 'pet500', price: 140, vol: '500ml', kind: '麦茶', cap: 0x8a5a2b, liquid: 0x8a4516,
    label: { layout: 'vertical', bg: ['#fff4d6', '#f1d49a'], ink: '#6b3a12', jp: 'むぎかぜ', name: 'MUGI', sub: '麦茶', graphic: 'barley', gcol: ['#d4a24c', '#8a5a20'], bands: [[0, 0.07, '#8a5a2b'], [0.93, 1, '#8a5a2b']] } },
  { type: 'pet500', price: 160, vol: '500ml', kind: 'スポーツドリンク', cap: 0x1a5fd0, liquid: 0xe3edf2,
    label: { bg: ['#1f7ae8', '#0b4fb3'], ink: '#ffffff', jpCol: '#bfe3ff', name: 'AQUA BURST', jp: 'アクアバースト', sub: 'ION SUPPLY', graphic: 'drop', gcol: ['#ffffff', '#9fd3ff'], pattern: 'waves', patternCol: 'rgba(255,255,255,0.1)', brand: 'NIKONIKO', brandCol: '#bfe3ff' } },
  { type: 'pet500', price: 150, vol: '500ml', kind: '乳酸菌飲料', cap: 0x1d4f9c, liquid: 0xf7f5ee, soldOut: true,
    label: { bg: '#ffffff', ink: '#1d4f9c', name: 'MILKY MOO', jp: 'ミルキーモー', sub: '乳酸菌 YOGURT', graphic: 'cow', gcol: ['#ffb7c5', '#1b1b1b'], pattern: 'dots', patternCol: '#d6e9ff' } },
  { type: 'pet500', price: 150, vol: '500ml', kind: '紅茶飲料', cap: 0xf2c200, liquid: 0xc3701f,
    label: { bg: ['#fff27a', '#f7c948'], ink: '#7a3d00', name: 'LEMON TEA', jp: 'レモンティー', sub: 'TEA TIME', graphic: 'lemon', gcol: ['#f5b800', '#fff6a8'], bands: [[0.9, 1, '#7a3d00']] } },
  { type: 'pet500', price: 130, vol: '500ml', kind: '炭酸水', cap: 0x8fd0e4, liquid: 0xeaf6fa, clear: true,
    label: { bg: ['#f2fbfd', '#bfe3ee'], ink: '#0b5a73', name: 'SUI', jp: '炭酸水', sub: '強炭酸 STRONG', graphic: 'bubbles', gcol: ['#0b8fb3', '#ffffff'], pattern: 'bubbles', patternCol: 'rgba(11,143,179,0.14)', brand: 'SPARKLE' } },

  // --- middle row: cold cans & a marble soda
  { type: 'can350', price: 130, vol: '350ml', kind: '炭酸飲料',
    label: { bg: ['#f9ea4a', '#d3de45'], ink: '#1f5a2a', name: 'YUZU FIZZ', jp: 'ゆずフィズ', sub: 'SPARKLING YUZU', graphic: 'citrus', gcol: ['#f6c800', '#4c9a3a'], pattern: 'bubbles', patternCol: 'rgba(255,255,255,0.35)', bands: [[0.93, 1, '#1f5a2a']], brand: 'NIKONIKO' } },
  { type: 'can350', price: 140, vol: '350ml', kind: '炭酸飲料',
    label: { bg: ['#23143a', '#0b0614'], ink: '#ffffff', jpCol: '#ff4d6d', name: 'COSMO COLA', jp: 'コスモコーラ', sub: 'ZERO GRAVITY TASTE', subCol: '#ffd24a', graphic: 'star', gcol: ['#ff3b5c', '#ffd24a'], pattern: 'stars', patternCol: 'rgba(255,255,255,0.08)', bands: [[0.03, 0.06, '#ff3b5c'], [0.94, 0.97, '#ff3b5c']], brand: 'COSMO', brandCol: '#ffd24a' } },
  { type: 'can350', price: 130, vol: '350ml', kind: '果汁飲料',
    label: { bg: ['#ffe8ee', '#ffb3c6'], ink: '#b0284f', name: 'MOMO', jp: '白桃ネクター', sub: '果汁30% PEACH', graphic: 'peach', gcol: ['#ff8fae', '#ffe9ee'], pattern: 'dots', patternCol: 'rgba(255,255,255,0.35)', brand: 'NECTAR' } },
  { type: 'ramune', price: 180, vol: '200ml', kind: '炭酸飲料', liquid: 0xb8e6fa, clear: true, soldOut: true,
    label: { bg: ['#eaf7ff', '#8fcaf2'], ink: '#1b5fa8', name: 'RAMUNE', jp: 'ラムネ', sub: 'ビー玉入り', graphic: 'marble', gcol: ['#9fe0ff', '#1b5fa8'], pattern: 'waves', patternCol: 'rgba(27,95,168,0.12)' } },
  { type: 'slim', price: 180, vol: '250ml', kind: 'エナジードリンク',
    label: { bg: ['#1a1c1e', '#07080a'], ink: '#c8ff1a', jpCol: '#ffffff', name: 'VOLT', jp: 'ボルトドラゴン', sub: 'ENERGY DRINK', subCol: '#ffffff', graphic: 'bolt', gcol: ['#c8ff1a', '#07080a'], pattern: 'stripes', patternCol: 'rgba(200,255,26,0.07)', brand: 'DRAGON', bands: [[0.02, 0.04, '#c8ff1a']] } },
  { type: 'can350', price: 160, vol: '350ml', kind: '炭酸飲料',
    label: { bg: ['#fff3f7', '#ffc2d8'], ink: '#c2185b', name: 'SAKURA', jp: 'さくらソーダ', sub: 'SPRING LIMITED', graphic: 'sakura', gcol: ['#ff8fb8', '#ffe36e'], pattern: 'petals', patternCol: 'rgba(255,143,184,0.35)', badge: '春限定' } },

  // --- bottom row: hot drinks (first five) + a cold bottle-can
  { type: 'can190', price: 130, vol: '185g', kind: 'コーヒー', hot: true,
    label: { bg: ['#1d1d1d', '#050505'], ink: '#e9c46a', jpCol: '#ffffff', name: 'KURO TORA', jp: '黒虎ブラック', sub: '無糖 BLACK', subCol: '#e9c46a', graphic: 'tiger', gcol: ['#e9c46a', '#111111'], bands: [[0.02, 0.045, '#e9c46a'], [0.955, 0.98, '#e9c46a']], brand: 'COFFEE', panel: 'rgba(233,196,106,0.85)' } },
  { type: 'can190', price: 130, vol: '185g', kind: 'コーヒー', hot: true,
    label: { bg: ['#fff8e8', '#ecd5b5'], ink: '#5a3418', name: 'MORNING', jp: '朝のミルク珈琲', sub: 'CAFÉ AU LAIT', graphic: 'cup', gcol: ['#7a4a26', '#c9a27a'], bands: [[0, 0.05, '#5a3418'], [0.95, 1, '#5a3418']], brand: 'NIKONIKO' } },
  { type: 'can190', price: 130, vol: '190g', kind: 'ココア', hot: true,
    label: { bg: ['#6b3a22', '#43200f'], ink: '#ffffff', jpCol: '#ffc2d1', name: 'COCOA HUG', jp: 'ココアのきもち', sub: 'RICH & CREAMY', subCol: '#ffc2d1', graphic: 'heart', gcol: ['#ff8fb0', '#ffffff'], pattern: 'dots', patternCol: 'rgba(255,255,255,0.07)' } },
  { type: 'pet350', price: 150, vol: '350ml', kind: '清涼飲料水', hot: true, cap: 0xff7a00, liquid: 0xf2d046,
    label: { bg: ['#ffe54a', '#ffc400'], ink: '#c43a00', name: 'HOT LEMON', jp: 'ホットレモン', sub: 'ビタミンC 1000mg', graphic: 'lemon', gcol: ['#f5b800', '#fff6a8'], bands: [[0, 0.08, '#ff7a00'], [0.92, 1, '#ff7a00']] } },
  { type: 'can190', price: 130, vol: '185g', kind: 'スープ', hot: true, soldOut: true,
    label: { bg: ['#fff3b0', '#ffd84a'], ink: '#7a4a00', name: 'CORN', jp: 'コーンポタージュ', sub: 'WINTER LIMITED', graphic: 'corn', gcol: ['#ffcf2e', '#e0a800'], badge: '冬限定', badgeCol: '#1f6fe0' } },
  { type: 'bottlecan', price: 160, vol: '285ml', kind: 'コーヒー', shoulder: 0x1b3552,
    label: { bg: ['#2b4a6b', '#152a42'], ink: '#f3e6c8', name: 'AROMA CRAFT', jp: 'アロマクラフト', sub: 'PREMIUM 微糖', graphic: 'aroma', gcol: ['#c89a62', '#f3e6c8'], bands: [[0.04, 0.06, '#c89a62'], [0.94, 0.96, '#c89a62']], brand: 'CRAFT', brandCol: '#c89a62' } },
];

PRODUCTS.forEach((p, i) => {
  p.id = i;
  p.row = Math.floor(i / COLS);
  p.col = i % COLS;
  p.hot = !!p.hot;
  p.soldOut = !!p.soldOut;
});

export function productText() {
  return PRODUCTS.map((p) => [p.label.jp, p.label.sub, p.label.badge, p.kind].join('')).join('');
}

// ---------------------------------------------------------------- geometry

const V2 = (r, y) => new THREE.Vector2(r, y);
const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => V2(r, y)), seg);

// printed wall; thetaStart = π puts the centre of the canvas facing +Z
function wall(r, y0, y1, seg = 48) {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, true, Math.PI, Math.PI * 2);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}

function pullTab() {
  const s = new THREE.Shape();
  s.absarc(0, 0.004, 0.0055, 0, Math.PI, false);
  s.absarc(0, -0.006, 0.0055, Math.PI, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absellipse(0, 0.0045, 0.0035, 0.0025, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.0006, bevelEnabled: false, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  return g;
}

// Beverage can: domed base, printed wall, necked shoulder, lid with ring-pull.
function canGeo(r, h, neck = 0.8, neckH = 0.013, baseH = 0.01) {
  const top = h - neckH, rn = r * neck;
  return {
    wallH: top - baseH, r,
    base: lathe([[0, 0.005], [r * 0.62, 0.0015], [r * 0.78, 0], [r * 0.9, 0.0015], [r * 0.99, baseH * 0.6], [r, baseH]]),
    wall: wall(r, baseH, top),
    top: lathe([[r, top], [r * 0.985, top + neckH * 0.35], [rn + 0.0005, h - 0.0024], [rn + 0.0009, h - 0.0005], [rn + 0.0003, h], [rn - 0.0009, h - 0.0003], [rn - 0.0013, h - 0.0034], [0, h - 0.0034]]),
    tab: pullTab(), tabY: h - 0.0028, tabZ: rn * 0.35,
  };
}

function smooth(t) { return (1 - Math.cos(Math.PI * t)) / 2; }

// PET bottle profile: petaloid-ish base, grip ribs, straight label zone, shoulder, neck ring
function petProfile(R, { labelTop, shoulderTop, neckR, neckTop, ribs = 3 }) {
  const pts = [[0, 0.0035], [R * 0.35, 0.0015], [R * 0.7, 0], [R * 0.92, 0.002], [R * 0.985, 0.007], [R, 0.014]];
  for (let k = 0; k < ribs; k++) {
    const y = 0.02 + k * 0.013;
    pts.push([R, y], [R * 0.955, y + 0.0045], [R, y + 0.009]);
  }
  pts.push([R, labelTop]);
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    pts.push([neckR + (R - neckR) * (1 - smooth(t)), labelTop + (shoulderTop - labelTop) * t]);
  }
  pts.push([neckR, shoulderTop + 0.004], [neckR + 0.0042, shoulderTop + 0.0045], [neckR + 0.0042, shoulderTop + 0.0065], [neckR, shoulderTop + 0.007], [neckR, neckTop]);
  return pts;
}

function liquidFrom(profile, fill, inset = 0.0014) {
  const pts = [[0, 0.004]];
  let lastR = 0;
  for (const [r, y] of profile) {
    if (y <= 0.004) continue;
    if (y > fill) break;
    pts.push([Math.max(0.001, r - inset), y]);
    lastR = r;
  }
  pts.push([Math.max(0.001, lastR - inset), fill], [0, fill]);
  return lathe(pts, 32);
}

function capGeo(r, h, y0) {
  const g = new THREE.CylinderGeometry(r, r, h, 36, 1);
  g.translate(0, y0 + h / 2, 0);
  return g;
}

const cache = new Map();
function geoFor(type) {
  if (cache.has(type)) return cache.get(type);
  let g;
  switch (type) {
    case 'can350': g = canGeo(0.033, 0.122); break;
    case 'can190': g = canGeo(0.0265, 0.105, 0.9, 0.009, 0.008); break;
    case 'slim': g = canGeo(0.0265, 0.134, 0.83, 0.012, 0.009); break;
    case 'pet500': {
      const R = 0.034;
      const prof = petProfile(R, { labelTop: 0.14, shoulderTop: 0.18, neckR: 0.0135, neckTop: 0.19 });
      g = { r: R, prof, body: lathe(prof), liquid: liquidFrom(prof, 0.172), sleeveY: [0.066, 0.138], sleeve: wall(R + 0.0006, 0.066, 0.138), cap: capGeo(0.0152, 0.017, 0.19) };
      break;
    }
    case 'pet350': {
      const R = 0.031;
      const prof = petProfile(R, { labelTop: 0.105, shoulderTop: 0.145, neckR: 0.0135, neckTop: 0.152, ribs: 2 });
      g = { r: R, prof, body: lathe(prof), liquid: liquidFrom(prof, 0.138), sleeveY: [0.05, 0.103], sleeve: wall(R + 0.0006, 0.05, 0.103), cap: capGeo(0.0152, 0.016, 0.152) };
      break;
    }
    case 'ramune': {
      const prof = [[0, 0.004], [0.02, 0], [0.028, 0.003], [0.029, 0.012], [0.029, 0.085], [0.0265, 0.097], [0.019, 0.107], [0.0128, 0.113],
        [0.0138, 0.118], [0.0172, 0.126], [0.0162, 0.134], [0.0122, 0.142], [0.0115, 0.158], [0.0122, 0.161]];
      g = { r: 0.029, prof, body: lathe(prof), liquid: liquidFrom(prof, 0.1, 0.002), sleeveY: [0.016, 0.082], sleeve: wall(0.0296, 0.016, 0.082), cap: capGeo(0.0135, 0.015, 0.16), marble: new THREE.SphereGeometry(0.0118, 20, 14) };
      break;
    }
    case 'bottlecan': {
      const r = 0.033;
      g = {
        r, wallH: 0.098,
        base: lathe([[0, 0.005], [r * 0.62, 0.0015], [r * 0.78, 0], [r * 0.9, 0.0015], [r, 0.01]]),
        wall: wall(r, 0.01, 0.108),
        shoulder: lathe([[r, 0.108], [r * 0.97, 0.118], [0.024, 0.133], [0.0165, 0.146], [0.0148, 0.15], [0.0148, 0.155]]),
        cap: capGeo(0.0153, 0.018, 0.154),
        capRing: new THREE.TorusGeometry(0.0154, 0.0007, 6, 36).rotateX(Math.PI / 2).translate(0, 0.158, 0),
      };
      break;
    }
  }
  cache.set(type, g);
  return g;
}

// ---------------------------------------------------------------- materials

function labelCanvasSize(r, h) {
  const W = 1024;
  return [W, Math.round((W * h) / (2 * Math.PI * r))];
}

function productMaterials(p, g) {
  const isCan = p.type.startsWith('can') || p.type === 'slim' || p.type === 'bottlecan';
  const labelH = isCan ? g.wallH : g.sleeveY[1] - g.sleeveY[0];
  const [W, H] = labelCanvasSize(g.r, labelH);
  const map = drinkLabelTexture(p, W, H);
  const warm = p.hot ? { emissive: new THREE.Color(0xff6a20), emissiveIntensity: 0.05 } : {};
  const mats = {};
  mats.label = isCan
    ? new THREE.MeshStandardMaterial({ map, metalness: 0.45, roughness: 0.27, ...warm })
    : new THREE.MeshPhysicalMaterial({ map, metalness: 0, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.1, ...warm });
  if (p.cap != null) mats.cap = new THREE.MeshStandardMaterial({ color: p.cap, roughness: 0.42 });
  if (p.liquid != null) {
    mats.liquid = new THREE.MeshStandardMaterial({
      color: p.liquid, roughness: 0.12,
      transparent: !!p.clear, opacity: p.clear ? 0.35 : 1, depthWrite: !p.clear,
    });
  }
  if (p.shoulder != null) mats.shoulder = new THREE.MeshStandardMaterial({ color: p.shoulder, metalness: 0.7, roughness: 0.3 });
  return mats;
}

const PET = () => new THREE.MeshPhysicalMaterial({
  color: 0xf6fafc, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false,
  clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.4,
});
let petMat, glassBottleMat, marbleMat;

export function buildProduct(p) {
  const g = geoFor(p.type);
  const m = productMaterials(p, g);
  const grp = new THREE.Group();
  const add = (geo, mat, order) => { const mesh = new THREE.Mesh(geo, mat); if (order) mesh.renderOrder = order; grp.add(mesh); return mesh; };

  if (g.wall && g.base) {
    add(g.base, M.aluminumDark);
    add(g.wall, m.label);
    if (g.top) {
      add(g.top, M.aluminum);
      const tab = add(g.tab, M.aluminum);
      tab.position.set(0, g.tabY, g.tabZ);
    }
    if (g.shoulder) {
      add(g.shoulder, m.shoulder);
      add(g.cap, M.aluminum);
      add(g.capRing, M.aluminumDark);
    }
  } else {
    petMat ||= PET();
    glassBottleMat ||= new THREE.MeshPhysicalMaterial({
      color: 0x9fdcf5, roughness: 0.03, transparent: true, opacity: 0.3, depthWrite: false,
      clearcoat: 1, envMapIntensity: 1.6,
    });
    const bodyMat = p.type === 'ramune' ? glassBottleMat : petMat;
    add(g.liquid, m.liquid);
    add(g.sleeve, m.label);
    add(g.body, bodyMat, 1);
    if (g.marble) {
      marbleMat ||= new THREE.MeshPhysicalMaterial({ color: 0x9fe3c8, roughness: 0.02, transparent: true, opacity: 0.8, clearcoat: 1 });
      add(g.marble, marbleMat).position.y = 0.129;
      add(g.cap, new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.35 }));
    } else add(g.cap, m.cap);
  }
  return grp;
}

// Front item plus two stock copies behind it in each slot. The three copies are
// merged into one mesh per material to keep draw calls low.
export function buildDrinks() {
  const root = new THREE.Group();
  root.name = 'drinks';
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const place = new THREE.Object3D();
  for (const p of PRODUCTS) {
    const proto = buildProduct(p);
    proto.updateMatrixWorld(true);
    const parts = proto.children.map(() => []);
    for (let k = 0; k < 3; k++) {
      place.position.set(colX(p.col) + (rnd() - 0.5) * 0.006, shelfY(p.row) + 0.0005, 0.283 - k * 0.083);
      place.rotation.y = (rnd() - 0.5) * (k === 0 ? 0.12 : 0.5);
      place.updateMatrix();
      proto.children.forEach((child, i) => {
        const geo = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
        geo.clearGroups();
        parts[i].push(geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(place.matrix, child.matrix)));
      });
    }
    proto.children.forEach((child, i) => {
      const mesh = new THREE.Mesh(mergeGeometries(parts[i]), child.material);
      mesh.renderOrder = child.renderOrder;
      root.add(mesh);
    });
  }
  return root;
}

export { ROWS };
