// Price tags, selection buttons and the right-hand control column.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { M, glow } from './materials.js';
import * as T from './textures.js';
import { frameGeometry, plane, box } from './shapes.js';
import { PRODUCTS } from './drinks.js';
import {
  PANEL, PANEL_FRONT, PANEL_CX, GLASS_Z, STRIP_FRONT_Z, STRIP_H, colX, shelfY,
} from './layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const selection = { buttons: [], glowAvail: null, glowSold: null };
export const panelParts = {};

// ---------------------------------------------------------------- selection buttons

export function buildSelection() {
  const g = new THREE.Group();
  g.name = 'selection';
  selection.glowAvail = glow(0x6dffa0, 1.7);
  selection.glowSold = glow(0xff2a1a, 1.9);
  const soldTex = T.soldOutTexture();
  const lampOn = new THREE.MeshBasicMaterial({ map: soldTex, color: new THREE.Color(1, 0.12, 0.08).multiplyScalar(2.6) });
  lampOn.userData.base = lampOn.color.clone();
  const lampOff = new THREE.MeshBasicMaterial({ map: soldTex, color: 0x2a1212 });
  const faceAvail = new THREE.MeshStandardMaterial({ color: 0xf6f7f4, roughness: 0.5, emissive: 0xe8fff0, emissiveIntensity: 0.28 });
  const faceSold = new THREE.MeshStandardMaterial({ color: 0xb9bcbf, roughness: 0.6 });

  const bezelGeo = frameGeometry({ x0: -0.018, y0: -0.018, x1: 0.018, y1: 0.018 }, { x0: -0.0135, y0: -0.0135, x1: 0.0135, y1: 0.0135 }, 0.003, { rOut: 0.004, rIn: 0.003, bevel: 0.0008 });
  const glowGeo = new THREE.PlaneGeometry(0.027, 0.027);
  const btnGeo = new RoundedBoxGeometry(0.0225, 0.0225, 0.008, 2, 0.0022);
  const lampGeo = new THREE.PlaneGeometry(0.026, 0.013);
  const lampBezelGeo = new RoundedBoxGeometry(0.031, 0.018, 0.002, 1, 0.002);

  for (const p of PRODUCTS) {
    const x = colX(p.col), sY = shelfY(p.row);

    // price tag on the shelf lip behind the glass
    const tag = plane(0.082, 0.023, M.sticker(T.priceTagTexture(p.price, p.hot), { rough: 0.5, transparent: true }), V(x, sY + 0.012, GLASS_Z - 0.0065));
    g.add(tag);

    const y = sY - STRIP_H / 2 - 0.001;
    const bezel = new THREE.Mesh(bezelGeo, M.plasticDark);
    bezel.position.set(x, y, STRIP_FRONT_Z);
    g.add(bezel);
    g.add(plane(0.027, 0.027, p.soldOut ? selection.glowSold : selection.glowAvail, V(x, y, STRIP_FRONT_Z + 0.0004)));
    const btn = new THREE.Mesh(btnGeo, p.soldOut ? faceSold : faceAvail);
    btn.position.set(x, y, STRIP_FRONT_Z + 0.0035);
    btn.userData = { product: p, restZ: btn.position.z, press: 0 };
    g.add(btn);
    selection.buttons.push(btn);

    const lx = x + 0.036;
    const lb = new THREE.Mesh(lampBezelGeo, M.plasticBlack);
    lb.position.set(lx, y, STRIP_FRONT_Z + 0.001);
    g.add(lb);
    const lamp = new THREE.Mesh(lampGeo, p.soldOut ? lampOn : lampOff);
    lamp.position.set(lx, y, STRIP_FRONT_Z + 0.0022);
    g.add(lamp);
  }
  selection.lampOn = lampOn;
  return g;
}

// ---------------------------------------------------------------- control column

export function buildControlPanel() {
  const g = new THREE.Group();
  g.name = 'controlPanel';
  const z0 = PANEL_FRONT, cx = PANEL_CX;
  const pw = PANEL.x1 - PANEL.x0, ph = PANEL.y1 - PANEL.y0;

  const base = new THREE.Mesh(new RoundedBoxGeometry(pw, ph, 0.024, 3, 0.007), M.panelGrey);
  base.position.set(cx, (PANEL.y0 + PANEL.y1) / 2, z0 - 0.012);
  base.castShadow = base.receiveShadow = true;
  g.add(base);

  // --- 1. LED display
  const dy = 1.49;
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(0.175, 0.085, 0.012, 2, 0.004), M.plasticBlack);
  bezel.position.set(cx, dy, z0 + 0.002);
  g.add(bezel);
  const display = new T.LedDisplay();
  const screenMat = new THREE.MeshBasicMaterial({ map: display.texture, color: new THREE.Color(2.4, 2.4, 2.4) });
  screenMat.userData.base = screenMat.color.clone();
  g.add(plane(0.155, 0.063, screenMat, V(cx, dy, z0 + 0.0082)));
  g.add(plane(0.16, 0.068, M.coverClear, V(cx, dy, z0 + 0.0088)));
  panelParts.display = display;
  panelParts.screenMat = screenMat;
  // power indicator
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 12, 8), M.ledGreen);
  led.position.set(PANEL.x1 - 0.016, PANEL.y1 - 0.012, z0 + 0.0005);
  g.add(led);
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.0038, 0.0009, 6, 20), M.steelPolished);
  ledRing.position.copy(led.position);
  g.add(ledRing);

  // --- 2. coin slot with bright rim and return lever
  const cy = 1.365;
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.09, 0.006, 2, 0.003), M.metalPrint(T.coinPlateTexture(), { rough: 0.32 }));
  plate.position.set(cx, cy, z0 + 0.003);
  g.add(plate);
  const pz = z0 + 0.006;
  const slotX = cx + 0.014;
  const rim = new THREE.Mesh(frameGeometry({ x0: -0.009, y0: -0.026, x1: 0.009, y1: 0.026 }, { x0: -0.0045, y0: -0.021, x1: 0.0045, y1: 0.021 }, 0.003, { rOut: 0.004, rIn: 0.002, bevel: 0.0008 }), M.rimOrange);
  rim.position.set(slotX, cy + 0.006, pz);
  g.add(rim);
  g.add(box(0.009, 0.042, 0.002, M.ventBack, slotX, cy + 0.006, pz + 0.0005));
  // return lever
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.005, 20).rotateX(Math.PI / 2), M.steelPolished);
  pivot.position.set(cx + 0.042, cy + 0.024, pz + 0.0025);
  g.add(pivot);
  const lever = new THREE.Group();
  lever.position.copy(pivot.position).add(V(0, 0, 0.003));
  lever.rotation.z = 0.28;
  const arm = box(0.007, 0.036, 0.004, M.steelBrushed, 0, -0.018, 0);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 16, 10), M.plasticBlack);
  knob.position.set(0, -0.036, 0.001);
  lever.add(arm, knob);
  g.add(lever);

  // --- 3. bill acceptor
  const by = 1.235;
  const billFace = M.metalPrint(T.billFaceTexture(), { rough: 0.45 });
  const billMats = [M.steelBrushed, M.steelBrushed, M.steelBrushed, M.steelBrushed, billFace, M.steelBrushed];
  const bill = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.095, 0.02, 2, 0.005), billMats);
  bill.position.set(cx, by, z0 + 0.01);
  bill.castShadow = true;
  g.add(bill);
  const bz = z0 + 0.02;
  const mouthLip = new THREE.Mesh(new RoundedBoxGeometry(0.124, 0.024, 0.008, 2, 0.004), M.plasticBlack);
  mouthLip.position.set(cx, by + 0.004, bz + 0.002);
  g.add(mouthLip);
  g.add(box(0.106, 0.0045, 0.002, M.ventBack, cx, by + 0.004, bz + 0.0052));
  const arrowTex = T.arrowTexture();
  const arrowMat = new THREE.MeshBasicMaterial({ map: arrowTex, color: new THREE.Color(0.3, 1, 0.45).multiplyScalar(2.2), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  arrowMat.userData.base = arrowMat.color.clone();
  g.add(plane(0.034, 0.024, arrowMat, V(cx, by + 0.031, bz + 0.0004)));
  panelParts.arrowTex = arrowTex;
  panelParts.arrowMat = arrowMat;

  // --- 4. coin return button + "no change" lamp
  const ry = 1.11, rx = cx - 0.04;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.022, 0.006, 40).rotateX(Math.PI / 2), M.steelPolished);
  ring.position.set(rx, ry, z0 + 0.003);
  g.add(ring);
  const rbMat = new THREE.MeshStandardMaterial({ map: T.returnButtonTexture(), roughness: 0.45 });
  const rbtn = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.0165, 0.006, 40).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), [M.plasticDark, rbMat, M.plasticDark]);
  rbtn.position.set(rx, ry, z0 + 0.006);
  g.add(rbtn);
  const noChange = new THREE.MeshBasicMaterial({ map: T.smallLabelTexture('つり銭切れ', 'NO CHANGE', { bg: '#140606', color: '#ffffff', accent: '#ff8a70' }), color: 0x5a3a3a });
  g.add(plane(0.07, 0.02, noChange, V(cx + 0.045, ry, z0 + 0.0006)));

  // --- 5. change-return cup (with two forgotten coins)
  const cupY = 0.99;
  const cupDepth = 0.032;
  const cup = new THREE.Mesh(frameGeometry({ x0: -0.05, y0: -0.035, x1: 0.05, y1: 0.035 }, { x0: -0.04, y0: -0.025, x1: 0.04, y1: 0.025 }, cupDepth, { rOut: 0.012, rIn: 0.009, bevel: 0.003 }), M.steelPolished);
  cup.position.set(cx, cupY, z0);
  cup.castShadow = true;
  g.add(cup);
  g.add(box(0.084, 0.054, 0.001, M.steelDark, cx, cupY, z0 + 0.0008));
  const coinGeo = new THREE.CylinderGeometry(0.0113, 0.0113, 0.0016, 28);
  const c1 = new THREE.Mesh(coinGeo, M.aluminum);
  c1.position.set(cx - 0.012, cupY - 0.024, z0 + 0.016);
  c1.rotation.set(0.1, 0, 0.05);
  const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0118, 0.0118, 0.0015, 28), M.copper);
  c2.position.set(cx + 0.013, cupY - 0.0235, z0 + 0.012);
  c2.rotation.set(-0.05, 0, -0.08);
  g.add(c1, c2);
  g.add(plane(0.07, 0.02, M.sticker(T.smallLabelTexture('おつり', 'CHANGE')), V(cx, cupY + 0.048, z0 + 0.0006)));

  // --- 6. contactless payment pad
  const ny = 0.852;
  const pad = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.102, 0.008, 2, 0.01), M.plasticBlack);
  pad.position.set(cx, ny, z0 + 0.003);
  g.add(pad);
  const waveMat = new THREE.MeshBasicMaterial({ map: T.contactlessTexture(), color: new THREE.Color(0.3, 0.85, 1).multiplyScalar(1.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  waveMat.userData.base = waveMat.color.clone();
  g.add(plane(0.115, 0.093, waveMat, V(cx, ny, z0 + 0.0072)));
  g.add(plane(0.126, 0.098, M.coverClear, V(cx, ny, z0 + 0.0076)));
  panelParts.waveMat = waveMat;

  // --- 7. instruction sticker
  g.add(plane(0.18, 0.148, M.sticker(T.instructionTexture()), V(cx, 0.645, z0 + 0.0004)));

  return g;
}
