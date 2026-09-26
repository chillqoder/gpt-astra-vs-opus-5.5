// Manufactured details: screws, rivets, vents, lock, hinges, stickers, plates, cable.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { M } from './materials.js';
import * as T from './textures.js';
import { frameGeometry, slottedPlate, plane, box, facing, NORMALS } from './shapes.js';
import { W, FRONT_Z, BACK_Z, SPLIT_Z, PANEL, PANEL_FRONT, PANEL_CX, BAY } from './layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SIDE = W / 2;

export const moving = { fan: null };

export function buildDetails() {
  const g = new THREE.Group();
  g.name = 'details';
  const screws = [];   // [position, dir]
  const rivets = [];

  // ---- screws around the window frame, header frame and control column
  const fz = FRONT_Z + 0.022, hz = FRONT_Z + 0.02;
  for (const y of [0.7275, 0.95, 1.15, 1.35, 1.56]) { screws.push([V(-0.455, y, fz), '+z'], [V(0.215, y, fz), '+z']); }
  for (const x of [-0.3, -0.12, 0.06]) { screws.push([V(x, 1.56, fz), '+z'], [V(x, 0.7275, fz), '+z']); }
  for (const x of [-0.458, -0.36, -0.12, 0.12, 0.36, 0.458]) { screws.push([V(x, 1.5985, hz), '+z'], [V(x, 1.7715, hz), '+z']); }
  for (const y of [1.645, 1.685, 1.725]) { rivets.push([V(-0.458, y, hz), '+z'], [V(0.458, y, hz), '+z']); }
  for (const x of [-0.39, -0.21, -0.03, 0.15]) rivets.push([V(x, 0.7275, fz), '+z']);
  const pz = PANEL_FRONT;
  for (const y of [0.79, 0.93, 1.17, 1.43]) { screws.push([V(PANEL.x0 + 0.009, y, pz), '+z'], [V(PANEL.x1 - 0.009, y, pz), '+z']); }
  screws.push([V(PANEL.x0 + 0.009, 1.535, pz), '+z']);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    screws.push([V(PANEL_CX + sx * 0.052, 1.365 + sy * 0.037, pz + 0.006), '+z']);
    screws.push([V(PANEL_CX + sx * 0.071, 1.235 + sy * 0.039, pz + 0.02), '+z']);
  }
  // rivet rows along the rear shell, just behind the door seam
  for (const sx of [-1, 1]) for (let y = 0.2; y < 1.75; y += 0.155) rivets.push([V(sx * SIDE, y, SPLIT_Z - 0.03), sx > 0 ? '+x' : '-x']);

  // ---- keyhole lock with escutcheon
  const lx = 0.37, ly = 0.46;
  const esc = new THREE.Mesh(new RoundedBoxGeometry(0.046, 0.078, 0.005, 2, 0.006), M.steelPolished);
  esc.position.set(lx, ly, FRONT_Z + 0.0025);
  esc.castShadow = true;
  g.add(esc);
  const keyMat = new THREE.MeshStandardMaterial({ map: T.keyholeTexture(), metalness: 1, roughness: 0.2 });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.0125, 0.007, 32).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), [M.steelPolished, keyMat, M.steelPolished]);
  cyl.position.set(lx, ly + 0.01, FRONT_Z + 0.0085);
  g.add(cyl);
  screws.push([V(lx, ly - 0.027, FRONT_Z + 0.005), '+z'], [V(lx, ly + 0.032, FRONT_Z + 0.005), '+z']);

  // ---- hinges on the left edge of the door
  for (const y of [0.24, 0.95, 1.64]) {
    const leaf = box(0.002, 0.06, 0.05, M.steelBrushed, -SIDE - 0.001, y, SPLIT_Z + 0.003);
    const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.07, 18), M.steelPolished);
    knuckle.position.set(-SIDE - 0.005, y, SPLIT_Z + 0.003);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.steelPolished);
    cap.position.set(-SIDE - 0.005, y + 0.035, SPLIT_Z + 0.003);
    g.add(leaf, knuckle, cap);
    screws.push([V(-SIDE - 0.002, y + 0.018, SPLIT_Z - 0.013), '-x'], [V(-SIDE - 0.002, y - 0.018, SPLIT_Z + 0.019), '-x']);
  }

  // ---- side ventilation grilles (fine slots over a black backing)
  const sideGrille = slottedPlate(0.3, 0.26, { slotW: 0.05, slotH: 0.0055, cols: 5, rows: 14, gapX: 0.008, gapY: 0.0105, depth: 0.002 });
  for (const sx of [-1, 1]) {
    const dir = sx > 0 ? '+x' : '-x';
    const grp = facing(new THREE.Group(), dir);
    grp.position.set(sx * SIDE, 0.29, -0.17);
    grp.add(Object.assign(new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.25), M.ventBack), { renderOrder: 0 }));
    grp.children[0].position.z = 0.0004;
    const plate = new THREE.Mesh(sideGrille, M.paint);
    plate.position.z = 0.0008;
    grp.add(plate);
    g.add(grp);
    grp.updateMatrixWorld(true);
    for (const [a, b] of [[-0.14, -0.12], [0.14, -0.12], [-0.14, 0.12], [0.14, 0.12]]) {
      screws.push([grp.localToWorld(V(a, b, 0.0028)).clone(), dir]);
    }
  }

  // ---- back: upper vent, compressor housing with fan & condenser coil
  const upper = new THREE.Group();
  facing(upper, '-z');
  upper.position.set(0, 1.56, BACK_Z);
  upper.add(new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.08), M.ventBack));
  upper.children[0].position.z = 0.0004;
  const up = new THREE.Mesh(slottedPlate(0.5, 0.09, { slotW: 0.006, slotH: 0.06, cols: 30, rows: 1, gapX: 0.009, gapY: 0 }), M.paint);
  up.position.z = 0.0008;
  upper.add(up);
  g.add(upper);

  const housing = new THREE.Group();
  facing(housing, '-z');
  housing.position.set(0, 0.29, BACK_Z);
  const hw = 0.8, hh = 0.34, hd = 0.045, iw = 0.72, ih = 0.28;
  const shell = new THREE.Mesh(frameGeometry({ x0: -hw / 2, y0: -hh / 2, x1: hw / 2, y1: hh / 2 }, { x0: -iw / 2, y0: -ih / 2, x1: iw / 2, y1: ih / 2 }, hd, { rOut: 0.014, rIn: 0.006, bevel: 0.005 }), M.paint);
  shell.castShadow = true;
  housing.add(shell);
  const inside = new THREE.Mesh(new THREE.BoxGeometry(iw - 0.011, ih - 0.011, hd), new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.9, side: THREE.BackSide }));
  inside.position.z = hd / 2 + 0.0015;
  housing.add(inside);
  // fan
  const fan = new THREE.Group();
  fan.position.set(-0.17, 0, 0.02);
  fan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 24).rotateX(Math.PI / 2), M.fan));
  for (let i = 0; i < 5; i++) {
    const blade = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.1, 0.003, 1, 0.0014), M.fan);
    blade.geometry.translate(0, 0.075, 0);
    blade.rotation.z = (i * Math.PI * 2) / 5;
    blade.rotateY(0.45);
    fan.add(blade);
  }
  housing.add(fan);
  moving.fan = fan;
  const shroud = new THREE.Mesh(new THREE.TorusGeometry(0.132, 0.006, 8, 48), M.fan);
  shroud.position.set(-0.17, 0, 0.022);
  housing.add(shroud);
  // condenser coil (serpentine copper tube)
  const pts = [];
  for (let i = 0; i < 9; i++) {
    const x = 0.02 + i * 0.037;
    const ys = i % 2 ? [0.115, -0.115] : [-0.115, 0.115];
    pts.push(V(x, ys[0], 0.012), V(x, ys[1], 0.012));
  }
  const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), 300, 0.0045, 8), M.copper);
  housing.add(coil);
  const grille = new THREE.Mesh(slottedPlate(0.76, 0.32, { slotW: 0.08, slotH: 0.009, cols: 8, rows: 14, gapX: 0.008, gapY: 0.0105, depth: 0.003 }), M.plasticDark);
  grille.position.z = hd;
  housing.add(grille);
  g.add(housing);
  housing.updateMatrixWorld(true);
  for (const [a, b] of [[-0.37, -0.15], [0, -0.15], [0.37, -0.15], [-0.37, 0.15], [0, 0.15], [0.37, 0.15]]) {
    screws.push([housing.localToWorld(V(a, b, hd + 0.003)).clone(), '-z']);
  }

  // service hatch outline on the back + screws
  const hatch = { x0: -0.36, x1: 0.36, y0: 0.62, y1: 1.44 };
  const sm = M.seam;
  g.add(box(hatch.x1 - hatch.x0, 0.003, 0.002, sm, 0, hatch.y0, BACK_Z));
  g.add(box(hatch.x1 - hatch.x0, 0.003, 0.002, sm, 0, hatch.y1, BACK_Z));
  g.add(box(0.003, hatch.y1 - hatch.y0, 0.002, sm, hatch.x0, (hatch.y0 + hatch.y1) / 2, BACK_Z));
  g.add(box(0.003, hatch.y1 - hatch.y0, 0.002, sm, hatch.x1, (hatch.y0 + hatch.y1) / 2, BACK_Z));
  for (const x of [-0.34, -0.12, 0.12, 0.34]) for (const y of [hatch.y0 + 0.02, hatch.y1 - 0.02]) screws.push([V(x, y, BACK_Z), '-z']);
  for (const y of [0.83, 1.03, 1.23]) for (const x of [-0.34, 0.34]) screws.push([V(x, y, BACK_Z), '-z']);

  // rubber wall-spacer bumpers on the back corners
  const bumperGeo = new THREE.CylinderGeometry(0.017, 0.019, 0.02, 20).rotateX(Math.PI / 2);
  for (const x of [-0.42, 0.42]) for (const y of [0.55, 1.68]) {
    const b = new THREE.Mesh(bumperGeo, M.rubber);
    b.position.set(x, y, BACK_Z - 0.01);
    b.castShadow = true;
    g.add(b);
  }

  // ---- stickers, labels & plates
  const stick = (w, h, tex, pos, dir, rot = 0, geo = null) => {
    const m = new THREE.Mesh(geo || new THREE.PlaneGeometry(w, h), M.sticker(tex));
    m.position.copy(pos);
    facing(m, dir);
    m.rotateZ(rot);
    g.add(m);
    return m;
  };
  stick(0, 0, T.mascotStickerTexture(), V(-0.37, 0.525, FRONT_Z + 0.0005), '+z', 0.12, new THREE.CircleGeometry(0.05, 48));
  stick(0.18, 0.08, T.recycleTexture(), V(-0.14, 0.525, FRONT_Z + 0.0005), '+z', -0.01);
  stick(0.15, 0.1, T.cautionTexture('注意', '高電圧・修理は販売店へ', 'Service by authorised staff only'), V(0.2, 1.2, BACK_Z - 0.0005), '-z');
  stick(0.15, 0.1, T.cautionTexture('転倒注意', 'ゆらさないでください', 'Do not rock or tilt the machine'), V(-SIDE - 0.0005, 1.12, -0.17), '-x', 0.015);
  stick(0.1, 0.14, T.energyLabelTexture(), V(SIDE + 0.0005, 1.2, -0.17), '+x');

  const serial = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.0667), M.metalPrint(T.serialPlateTexture(), { rough: 0.35 }));
  serial.position.set(SIDE + 0.0008, 0.8, -0.17);
  facing(serial, '+x');
  g.add(serial);
  for (const [a, b] of [[-0.054, -0.028], [0.054, -0.028], [-0.054, 0.028], [0.054, 0.028]]) {
    rivets.push([V(SIDE + 0.0008, 0.8 + b, -0.17 - a), '+x']);
  }

  // ---- power cable into the back, with gland and a tiny power LED
  const entry = V(0.3, 0.2, BACK_Z);
  const gland = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.014, 24).rotateX(Math.PI / 2), M.rubber);
  gland.position.copy(entry).add(V(0, 0, -0.007));
  const relief = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.013, 0.035, 16).rotateX(Math.PI / 2), M.rubber);
  relief.position.copy(entry).add(V(0, 0, -0.03));
  g.add(gland, relief);
  const curve = new THREE.CatmullRomCurve3([
    V(0.3, 0.2, BACK_Z - 0.03), V(0.3, 0.195, BACK_Z - 0.08), V(0.31, 0.12, BACK_Z - 0.13), V(0.33, 0.009, BACK_Z - 0.2),
    V(0.4, 0.008, BACK_Z - 0.45), V(0.62, 0.008, BACK_Z - 0.7), V(0.7, 0.008, BACK_Z - 1.1), V(0.55, 0.008, BACK_Z - 1.8),
    V(0.6, 0.008, BACK_Z - 3.2), V(0.9, 0.008, BACK_Z - 6), V(1.2, 0.008, BACK_Z - 14),
  ]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 260, 0.0075, 10), M.cable);
  cable.castShadow = true;
  g.add(cable);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 12, 8), M.ledGreen);
  led.position.set(0.36, 0.2, BACK_Z - 0.001);
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.0045, 0.001, 6, 20), M.steelPolished);
  ledRing.position.copy(led.position);
  g.add(led, ledRing);
  stick(0.06, 0.017, T.smallLabelTexture('電源', 'POWER'), V(0.36, 0.222, BACK_Z - 0.0005), '-z');

  // ---- instanced screw heads & rivets
  const q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1), Z = new THREE.Vector3(0, 0, 1);
  const place = (list, geo, mat, lift) => {
    const inst = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach(([p, dir], i) => {
      const n = NORMALS[dir];
      q.setFromUnitVectors(Z, n);
      const spin = new THREE.Quaternion().setFromAxisAngle(Z, (i * 1.7) % Math.PI);
      m4.compose(p.clone().addScaledVector(n, lift), q.clone().multiply(spin), one);
      inst.setMatrixAt(i, m4);
    });
    inst.instanceMatrix.needsUpdate = true;
    return inst;
  };
  const screwGeo = new THREE.CylinderGeometry(0.0042, 0.0046, 0.0018, 16).rotateX(Math.PI / 2).rotateZ(Math.PI / 2);
  g.add(place(screws, screwGeo, [M.steelPolished, M.screwCap, M.steelPolished], 0.0009));
  const rivetGeo = new THREE.SphereGeometry(0.0034, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.55);
  g.add(place(rivets, rivetGeo, M.steelBrushed, 0));

  return g;
}

export { BAY };
