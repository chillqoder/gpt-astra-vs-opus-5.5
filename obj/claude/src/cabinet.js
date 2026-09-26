// Cabinet shell, door, header lightbox, display window, interior and plinth.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { M, glow } from './materials.js';
import * as T from './textures.js';
import { rectShape, rectHole, frameGeometry, grow, plane, box } from './shapes.js';
import { HOT_COLS } from './drinks.js';
import {
  W, D, BASE_Y, TOP_Y, FRONT_Z, BACK_Z, SPLIT_Z, DOOR, WIN, HEADER, BAY, ROWS, ROW_H,
  GLASS_H, STRIP_H, COL_W, CAVITY_BACK_Z, GLASS_Z, STRIP_FRONT_Z, rowTop, shelfY, colX,
  SEAM_X, SEAM_Y, STRIPE_Y, PANEL,
} from './layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const WIN_INNER = grow(WIN, -0.011);   // visible opening inside the frame
export const lights = { rows: [], warm: null };

export function buildCabinet() {
  const g = new THREE.Group();
  g.name = 'cabinet';

  // ---- rear shell (holds the refrigeration unit)
  const shellD = SPLIT_Z - BACK_Z;
  const shell = new THREE.Mesh(new RoundedBoxGeometry(W, TOP_Y - BASE_Y, shellD, 3, 0.02), M.paint);
  shell.position.set(0, (TOP_Y + BASE_Y) / 2, (SPLIT_Z + BACK_Z) / 2);
  shell.castShadow = shell.receiveShadow = true;
  g.add(shell);

  // rubber gasket visible in the door seam
  g.add(box(W - 0.02, TOP_Y - BASE_Y - 0.02, 0.012, M.rubber, 0, (TOP_Y + BASE_Y) / 2, SPLIT_Z + 0.002));

  // ---- door: one extrusion with the header, window and pickup openings cut out
  const s = rectShape(DOOR.x0, DOOR.y0, DOOR.x1, DOOR.y1, DOOR.corner);
  for (const o of [HEADER, WIN, BAY]) s.holes.push(rectHole(o.x0, o.y0, o.x1, o.y1, 0.008));
  const depth = FRONT_Z - DOOR.zBack - 2 * DOOR.bevel;
  const doorGeo = new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: true, bevelThickness: DOOR.bevel, bevelSize: DOOR.bevel,
    bevelSegments: 4, curveSegments: 8,
  });
  const door = new THREE.Mesh(doorGeo, [M.paintWorn, M.paint]);
  door.position.z = DOOR.zBack + DOOR.bevel;
  door.castShadow = door.receiveShadow = true;
  g.add(door);

  // ---- seams: vertical door line & horizontal split
  const seamV = box(0.003, 1.49, 0.002, M.seam, SEAM_X, 0.09 + 1.49 / 2, FRONT_Z);
  const seamH = box(SEAM_X - DOOR.x0 - 0.002, 0.003, 0.002, M.seam, (SEAM_X + DOOR.x0 + 0.002) / 2, SEAM_Y, FRONT_Z);
  g.add(seamV, seamH);

  // ---- decorative stripe around the body (white band + thin grey pinstripe)
  const stripeMat = M.paintWhite.clone();
  Object.assign(stripeMat, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const pinMat = M.plasticGrey.clone();
  Object.assign(pinMat, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  for (const [h, dy, mat] of [[0.016, 0, stripeMat], [0.004, -0.016, pinMat]]) {
    const y = STRIPE_Y + dy;
    g.add(plane(W - 0.03, h, mat, V(0, y, FRONT_Z + 0.0004)));
    g.add(plane(W - 0.04, h, mat, V(0, y, BACK_Z - 0.0004), '-z'));
    for (const sx of [1, -1]) {
      const dir = sx > 0 ? '+x' : '-x';
      g.add(plane(0.33, h, mat, V(sx * (W / 2 + 0.0004), y, -0.155), dir));
      g.add(plane(0.29, h, mat, V(sx * (W / 2 + 0.0004), y, 0.19), dir));
    }
  }

  buildHeader(g);
  buildWindow(g);
  buildPlinth(g);
  return g;
}

// ---------------------------------------------------------------- header

function buildHeader(g) {
  const w = HEADER.x1 - HEADER.x0 - 0.022, h = HEADER.y1 - HEADER.y0 - 0.022;
  const cy = (HEADER.y0 + HEADER.y1) / 2;
  const sign = plane(w, h, M.lightPanel(T.headerSignTexture(), 1.25), V(0, cy, FRONT_Z - 0.012));
  sign.name = 'headerSign';
  g.add(sign);
  // white light-box walls between sign and frame
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.014), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4f0, emissiveIntensity: 0.6, side: THREE.BackSide }));
  walls.position.set(0, cy, FRONT_Z - 0.005);
  g.add(walls);
  // translucent cover
  g.add(plane(w, h, M.coverClear, V(0, cy, FRONT_Z + 0.004)));
  const frame = new THREE.Mesh(frameGeometry({ x0: -0.47, y0: 1.588, x1: 0.47, y1: 1.782 }, grow(HEADER, -0.004), 0.02, { rOut: 0.018, rIn: 0.008, bevel: 0.005 }), M.frameWhite);
  frame.position.z = FRONT_Z;
  frame.castShadow = true;
  g.add(frame);
  // header top light-leak strip & glow on the sign lip
  const lip = box(w - 0.02, 0.004, 0.004, M.steelPolished, 0, HEADER.y0 - 0.001, FRONT_Z + 0.02);
  g.add(lip);
}

// ---------------------------------------------------------------- display window

function buildWindow(g) {
  const I = WIN_INNER;
  const iw = I.x1 - I.x0, cx = (I.x0 + I.x1) / 2;

  // thick glossy frame
  const frame = new THREE.Mesh(frameGeometry({ x0: -0.47, y0: 0.715, x1: 0.23, y1: 1.575 }, { ...grow(WIN, -0.01), y0: WIN.y0 }, 0.022, { rOut: 0.022, rIn: 0.006, bevel: 0.006 }), M.frameWhite);
  frame.position.z = FRONT_Z;
  frame.castShadow = true;
  g.add(frame);

  // cavity liner (BackSide box: only the inner faces render)
  const cavD = FRONT_Z - CAVITY_BACK_Z;
  const liner = new THREE.Mesh(new THREE.BoxGeometry(iw, I.y1 - I.y0, cavD), M.interior);
  liner.position.set(cx, (I.y0 + I.y1) / 2, CAVITY_BACK_Z + cavD / 2);
  g.add(liner);
  // back wall with a printed backdrop (hot zone warm)
  const back = plane(iw, WIN.y1 - WIN.y0, new THREE.MeshStandardMaterial({ map: T.cavityBackTexture(HOT_COLS), roughness: 0.8 }), V(cx, (WIN.y0 + WIN.y1) / 2, CAVITY_BACK_Z + 0.002));
  g.add(back);

  // vertical fluorescent tubes on both inner sides
  for (const x of [I.x0 + 0.009, I.x1 - 0.009]) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, I.y1 - I.y0 - 0.03, 12), M.tube);
    tube.position.set(x, (I.y0 + I.y1) / 2, FRONT_Z - 0.03);
    g.add(tube);
    const holder = box(0.012, I.y1 - I.y0 - 0.01, 0.01, M.plasticGrey, x + Math.sign(x - cx) * 0.004, (I.y0 + I.y1) / 2, FRONT_Z - 0.042);
    g.add(holder);
  }

  for (let r = 0; r < ROWS; r++) {
    const top = rowTop(r), sY = shelfY(r), bottom = top - ROW_H;

    // glass pane per row
    for (const [mat, dz] of [[M.glassTint, 0], [M.glass, 0.0005]]) {
      const glass = plane(iw + 0.01, GLASS_H + 0.004, mat, V(cx, (top + sY) / 2, GLASS_Z + dz));
      glass.renderOrder = 10;
      g.add(glass);
    }

    // shelf, price lip and the button strip below it
    g.add(box(iw, 0.006, GLASS_Z - CAVITY_BACK_Z - 0.03, M.shelf, cx, sY - 0.003, (GLASS_Z + CAVITY_BACK_Z - 0.03) / 2));
    const lip = box(iw, 0.03, 0.01, M.plasticGrey, cx, sY + 0.012, GLASS_Z - 0.012);
    g.add(lip);
    const stripD = STRIP_FRONT_Z - (GLASS_Z - 0.03);
    const strip = new THREE.Mesh(new RoundedBoxGeometry(iw, STRIP_H, stripD, 2, 0.003), M.plasticGrey);
    strip.position.set(cx, (sY + bottom) / 2, STRIP_FRONT_Z - stripD / 2);
    strip.receiveShadow = true;
    g.add(strip);
    g.add(box(iw, 0.0025, 0.003, M.steelPolished, cx, sY - 0.0012, STRIP_FRONT_Z - 0.001));

    // LED bar lighting the row from above (hidden behind the frame / strip)
    for (let c = 0; c < 6; c++) {
      const warm = r === ROWS - 1 && c < HOT_COLS;
      const bar = box(COL_W - 0.002, 0.005, 0.008, warm ? M.tubeWarm : M.tube, colX(c), top - 0.006, GLASS_Z - 0.02);
      g.add(bar);
    }
    const pl = new THREE.PointLight(0xeef5ff, 0.06, 0.36, 2);
    pl.position.set(cx, top - 0.05, CAVITY_BACK_Z + 0.13);
    g.add(pl);
    lights.rows.push(pl);
  }
  const warm = new THREE.PointLight(0xffa25a, 0.045, 0.6, 2);
  warm.position.set(colX(2), rowTop(ROWS - 1) - 0.05, GLASS_Z - 0.06);
  g.add(warm);
  lights.warm = warm;
}

// ---------------------------------------------------------------- plinth & feet

function buildPlinth(g) {
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(W - 0.04, BASE_Y - 0.03 + 0.005, D - 0.06, 2, 0.006), M.plinth);
  plinth.position.set(0, (BASE_Y + 0.03) / 2 + 0.0025, 0);
  plinth.castShadow = plinth.receiveShadow = true;
  g.add(plinth);
  // kick plate slots
  const slotGeo = new THREE.BoxGeometry(0.05, 0.006, 0.002);
  const slots = new THREE.InstancedMesh(slotGeo, M.ventBack, 12);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 12; i++) {
    m4.makeTranslation(-0.33 + i * 0.06, 0.055, (D - 0.06) / 2 + 0.0005);
    slots.setMatrixAt(i, m4);
  }
  g.add(slots);

  // adjustable feet: rubber pad, threaded stem, hex lock-nut
  const pad = new THREE.CylinderGeometry(0.022, 0.024, 0.01, 24);
  const stem = new THREE.CylinderGeometry(0.0075, 0.0075, 0.022, 12);
  const nut = new THREE.CylinderGeometry(0.014, 0.014, 0.007, 6);
  const disc = new THREE.CylinderGeometry(0.019, 0.02, 0.004, 24);
  for (const x of [-0.42, 0.42]) {
    for (const z of [-0.27, 0.27]) {
      const f = new THREE.Group();
      for (const [geo, mat, y] of [[pad, M.rubber, 0.005], [disc, M.steelDark, 0.012], [stem, M.steelBrushed, 0.022], [nut, M.steelPolished, 0.024]]) {
        const m = new THREE.Mesh(geo, mat);
        m.position.y = y;
        f.add(m);
      }
      f.position.set(x, 0, z);
      f.traverse((o) => { o.castShadow = true; });
      g.add(f);
    }
  }
}

export { PANEL };
