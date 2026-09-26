import * as THREE from 'three';
import * as T from './textures.js';

// Shared material library. Created once after the fonts/textures are ready.
export const M = {};

// Emissive "light" materials render brighter than 1.0 so the bloom pass picks them up.
export function glow(hex, strength = 1) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(strength) });
  m.userData.base = m.color.clone();
  return m;
}

export function initMaterials() {
  const wear = T.bodyWearTextures();
  const brushed = T.brushedTexture();

  Object.assign(M, {
    // glossy candy-red paint with a clear coat
    paint: new THREE.MeshPhysicalMaterial({
      color: 0xc8102a, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06,
    }),
    paintWorn: new THREE.MeshPhysicalMaterial({
      color: 0xffffff, map: wear.map, roughnessMap: wear.roughnessMap, roughness: 1.0,
      metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.3, clearcoatRoughnessMap: wear.roughnessMap,
    }),
    paintWhite: new THREE.MeshPhysicalMaterial({
      color: 0xf4f4f2, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08,
    }),
    frameWhite: new THREE.MeshPhysicalMaterial({
      color: 0xeceef0, roughness: 0.22, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.04,
    }),
    plasticGrey: new THREE.MeshStandardMaterial({ color: 0xd4d8dc, roughness: 0.62 }),
    panelGrey: new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.panelGrimeTexture(), roughness: 0.55 }),
    plasticDark: new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.55 }),
    plasticBlack: new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.35 }),
    plinth: new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.75, metalness: 0.3 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x111112, roughness: 0.92 }),
    rubberWorn: new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.85 }),
    seam: new THREE.MeshStandardMaterial({ color: 0x160406, roughness: 0.9 }),
    steelBrushed: new THREE.MeshPhysicalMaterial({
      color: 0xd4d7da, map: brushed, metalness: 1, roughness: 0.42, anisotropy: 0.45, envMapIntensity: 0.7,
    }),
    steelPolished: new THREE.MeshStandardMaterial({ color: 0xf2f4f6, metalness: 1, roughness: 0.1 }),
    steelDark: new THREE.MeshStandardMaterial({ color: 0x6c7076, metalness: 1, roughness: 0.4 }),
    chromeInner: new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 1, roughness: 0.18, side: THREE.BackSide }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd9c28a, metalness: 1, roughness: 0.25 }),
    aluminum: new THREE.MeshStandardMaterial({ color: 0xe3e6ea, metalness: 1, roughness: 0.22 }),
    aluminumDark: new THREE.MeshStandardMaterial({ color: 0xa9aeb5, metalness: 1, roughness: 0.3 }),
    interior: new THREE.MeshStandardMaterial({ color: 0xf1f4f7, roughness: 0.7, side: THREE.BackSide }),
    shelf: new THREE.MeshStandardMaterial({ color: 0xf3f5f7, roughness: 0.45 }),
    // glass = faint blue-green tint layer + an additive layer that only carries reflections
    glassTint: new THREE.MeshBasicMaterial({ color: 0x0f3a44, transparent: true, opacity: 0.08, depthWrite: false }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x000000, metalness: 0, roughness: 0.015, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, envMapIntensity: 2.2, specularIntensity: 1, ior: 1.52,
    }),
    coverClear: new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.08, transparent: true, opacity: 0.12, depthWrite: false, clearcoat: 1,
    }),
    smoked: new THREE.MeshPhysicalMaterial({
      color: 0x2a2d33, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.72, clearcoat: 1,
      side: THREE.DoubleSide,
    }),
    ventBack: new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 1 }),
    fan: new THREE.MeshStandardMaterial({ color: 0x2c2e31, roughness: 0.6, metalness: 0.4 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xb8734a, metalness: 1, roughness: 0.35 }),
    floor: new THREE.MeshStandardMaterial({
      color: 0x121315, roughness: 0.5, metalness: 0.0, transparent: true, alphaMap: T.floorAlphaTexture(),
      depthWrite: false,
    }),
    cable: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 }),
    screwCap: new THREE.MeshStandardMaterial({ map: T.screwHeadTexture(), metalness: 1, roughness: 0.25 }),

    // light-emitting parts (animated in main.js)
    tube: glow(0xeef6ff, 1.5),
    tubeWarm: glow(0xffc98a, 1.4),
    bayLight: glow(0xfff1d6, 1.6),
    rimOrange: glow(0xff9a2a, 2.2),
    ledGreen: glow(0x3dff6e, 2.5),
    ledRed: glow(0xff2a1a, 2.5),
    ledOff: new THREE.MeshStandardMaterial({ color: 0x3a1010, roughness: 0.3 }),
  });

  // stickers & printed labels: paper-like, slightly lifted with polygon offset
  M.sticker = (map, { rough = 0.75, transparent = true } = {}) => new THREE.MeshStandardMaterial({
    map, roughness: rough, transparent, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  M.metalPrint = (map, { rough = 0.3 } = {}) => new THREE.MeshStandardMaterial({
    map, metalness: 0.85, roughness: rough, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  M.lightPanel = (map, strength = 1.2) => {
    const m = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(1, 1, 1).multiplyScalar(strength), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    m.userData.base = m.color.clone();
    return m;
  };
  return M;
}
