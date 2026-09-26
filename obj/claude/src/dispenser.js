// Pickup bay: recessed chamber, spring-loaded smoked flap, inner light and label.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { M } from './materials.js';
import * as T from './textures.js';
import { frameGeometry, grow, plane, box } from './shapes.js';
import { buildProduct } from './drinks.js';
import { BAY, FRONT_Z } from './layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CHAMBER_BACK = 0.13;

export const bay = { flap: null, light: null, item: null, drop: null };

export function buildDispenser() {
  const g = new THREE.Group();
  g.name = 'dispenser';
  const I = grow(BAY, -0.011);
  const bw = I.x1 - I.x0, bh = I.y1 - I.y0, cx = (I.x0 + I.x1) / 2;

  // reflective inner chamber (inside faces only)
  const chamberMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: 0.85, roughness: 0.28, side: THREE.BackSide });
  const chamber = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, FRONT_Z - CHAMBER_BACK), chamberMat);
  chamber.position.set(cx, (I.y0 + I.y1) / 2, (FRONT_Z + CHAMBER_BACK) / 2);
  g.add(chamber);
  // sloped chute at the back that drinks roll down
  const chute = box(bw - 0.004, 0.004, 0.09, M.steelDark, cx, I.y0 + 0.04, CHAMBER_BACK + 0.04);
  chute.rotation.x = 0.55;
  g.add(chute);
  // soft light inside
  const strip = box(bw - 0.04, 0.006, 0.01, M.bayLight, cx, I.y1 - 0.006, CHAMBER_BACK + 0.03);
  g.add(strip);
  const light = new THREE.PointLight(0xfff0d8, 0.02, 0.45, 2);
  light.position.set(cx, I.y1 - 0.03, CHAMBER_BACK + 0.08);
  g.add(light);
  bay.light = light;

  // slightly worn rubber edge
  const edge = new THREE.Mesh(frameGeometry(grow(BAY, 0.02), grow(BAY, -0.013), 0.01, { rOut: 0.022, rIn: 0.012, bevel: 0.004 }), M.rubberWorn);
  edge.position.z = FRONT_Z;
  edge.castShadow = true;
  g.add(edge);

  // spring-loaded flap, hinged along its top edge and resting slightly pushed in
  const pivot = new THREE.Group();
  pivot.position.set(cx, I.y1 - 0.01, FRONT_Z - 0.016);
  const fw = bw - 0.012, fh = bh - 0.018;
  const flap = new THREE.Mesh(new RoundedBoxGeometry(fw, fh, 0.004, 2, 0.0018), M.smoked);
  flap.position.y = -fh / 2 - 0.004;
  flap.renderOrder = 5;
  pivot.add(flap);
  const push = plane(0.07, 0.02, new THREE.MeshBasicMaterial({ map: T.smallLabelTexture('押す', 'PUSH', { bg: 'rgba(0,0,0,0)', color: '#e8e8e8', accent: '#bbbbbb' }), transparent: true, opacity: 0.8, depthWrite: false }), V(0, -fh * 0.72, 0.0022));
  push.renderOrder = 6;
  pivot.add(push);
  pivot.rotation.x = 0.09;
  g.add(pivot);
  bay.flap = pivot;

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, bw - 0.004, 12).rotateZ(Math.PI / 2), M.steelPolished);
  rod.position.copy(pivot.position);
  g.add(rod);
  for (const sx of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 12;
      pts.push(V(sx * (fw / 2 - 0.004) - sx * (i / 120) * 0.018, Math.sin(a) * 0.0055, Math.cos(a) * 0.0055));
    }
    const spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.0009, 5), M.steelPolished);
    spring.position.copy(pivot.position);
    g.add(spring);
  }

  // label above the opening
  g.add(plane(0.17, 0.034, M.sticker(T.pickupLabelTexture(), { rough: 0.6 }), V((BAY.x0 + BAY.x1) / 2, BAY.y1 + 0.045, FRONT_Z + 0.0005)));

  // a drink that falls into the tray when a button is pressed
  const protos = new Map();
  bay.drop = (product) => {
    if (bay.item) g.remove(bay.item);
    if (!protos.has(product.id)) protos.set(product.id, buildProduct(product));
    const item = protos.get(product.id).clone();
    item.rotation.set(0, 0, Math.PI / 2);
    item.rotation.y = (Math.random() - 0.5) * 0.3;
    const x = cx + 0.06 + (Math.random() - 0.5) * 0.08;
    item.userData = { t: 0, x, floor: I.y0 + 0.034, startY: I.y1 - 0.045 };
    item.position.set(x, item.userData.startY, CHAMBER_BACK + 0.09);
    g.add(item);
    bay.item = item;
  };
  return g;
}

// Falls with a small bounce, nudging the flap as it lands
export function updateDispenser(dt) {
  const it = bay.item;
  if (!it) return;
  const u = it.userData;
  u.t += dt;
  const fall = Math.min(1, u.t / 0.32);
  let y = u.startY + (u.floor - u.startY) * fall * fall;
  if (u.t > 0.32) y = u.floor + Math.abs(Math.sin((u.t - 0.32) * 14)) * 0.012 * Math.exp(-(u.t - 0.32) * 8);
  it.position.y = y;
  it.position.z = CHAMBER_BACK + 0.09 + Math.min(1, u.t / 0.45) * 0.05;
  bay.flap.rotation.x = 0.09 + (u.t > 0.3 ? Math.sin((u.t - 0.3) * 18) * 0.12 * Math.exp(-(u.t - 0.3) * 5) : 0);
}
