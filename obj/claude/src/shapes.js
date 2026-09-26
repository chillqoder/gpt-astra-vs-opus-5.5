import * as THREE from 'three';

// Rounded rectangle traced into a Shape or Path (counter-clockwise).
export function roundRectPath(p, x0, y0, x1, y1, r) {
  r = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  p.moveTo(x0 + r, y0);
  p.lineTo(x1 - r, y0);
  p.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  p.lineTo(x1, y1 - r);
  p.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  p.lineTo(x0 + r, y1);
  p.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  p.lineTo(x0, y0 + r);
  p.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return p;
}

export const rectShape = (x0, y0, x1, y1, r) => roundRectPath(new THREE.Shape(), x0, y0, x1, y1, r);
export const rectHole = (x0, y0, x1, y1, r) => roundRectPath(new THREE.Path(), x0, y0, x1, y1, r);

// Rectangle {x0,y0,x1,y1} grown (or shrunk with negative d) on every side
export const grow = (b, d) => ({ x0: b.x0 - d, y0: b.y0 - d, x1: b.x1 + d, y1: b.y1 + d });

// Flat frame (outer rounded rect minus inner rounded rect) extruded towards +Z
// from z = 0 to z = depth, bevelled on both faces.
export function frameGeometry(outer, inner, depth, { rOut = 0.01, rIn = 0.005, bevel = 0.003, segs = 6 } = {}) {
  const s = rectShape(outer.x0, outer.y0, outer.x1, outer.y1, rOut);
  s.holes.push(rectHole(inner.x0, inner.y0, inner.x1, inner.y1, rIn));
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.0001, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel,
    bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: segs,
  });
  g.translate(0, 0, bevel);
  return g;
}

// Plate with a grid of rounded slots punched through it
export function slottedPlate(w, h, { slotW, slotH, cols, rows, gapX, gapY, depth = 0.002, r = 0.004, bevel = 0.0008 }) {
  const s = rectShape(-w / 2, -h / 2, w / 2, h / 2, r);
  const totW = cols * slotW + (cols - 1) * gapX;
  const totH = rows * slotH + (rows - 1) * gapY;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x0 = -totW / 2 + i * (slotW + gapX);
      const y0 = -totH / 2 + j * (slotH + gapY);
      s.holes.push(rectHole(x0, y0, x0 + slotW, y0 + slotH, Math.min(slotW, slotH) / 2 - 0.0001));
    }
  }
  const g = new THREE.ExtrudeGeometry(s, {
    depth: depth - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.6,
    bevelSegments: 1, curveSegments: 4,
  });
  g.translate(0, 0, bevel);
  return g;
}

// A plane sitting on a surface that faces `normal` ('+z', '-z', '+x', '-x').
const FACING = {
  '+z': new THREE.Euler(0, 0, 0),
  '-z': new THREE.Euler(0, Math.PI, 0),
  '+x': new THREE.Euler(0, Math.PI / 2, 0),
  '-x': new THREE.Euler(0, -Math.PI / 2, 0),
};
export function facing(obj, dir) {
  obj.rotation.copy(FACING[dir]);
  return obj;
}
export const NORMALS = {
  '+z': new THREE.Vector3(0, 0, 1), '-z': new THREE.Vector3(0, 0, -1),
  '+x': new THREE.Vector3(1, 0, 0), '-x': new THREE.Vector3(-1, 0, 0),
};

export function plane(w, h, mat, pos, dir = '+z') {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.copy(pos);
  facing(m, dir);
  return m;
}

export function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
