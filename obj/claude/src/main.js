import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import * as T from './textures.js';
import { initMaterials, M } from './materials.js';
import { buildCabinet, lights } from './cabinet.js';
import { buildDrinks, productText } from './drinks.js';
import { buildSelection, buildControlPanel, selection, panelParts } from './panel.js';
import { buildDispenser, updateDispenser, bay } from './dispenser.js';
import { buildDetails, moving } from './details.js';

const container = document.getElementById('app');
const loader = document.getElementById('loader');
const params = new URLSearchParams(location.search);
const still = params.has('still');   // ?still&cam=x,y,z,tx,ty,tz — fixed view for screenshots
const lowPower = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;

// ---------------------------------------------------------------- fonts first (labels are painted from them)

async function loadFonts() {
  const text = T.PRELOAD_TEXT + productText() + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789¥%.,!&·—';
  const faces = ['900 32px "Noto Sans JP"', '700 32px "Noto Sans JP"', '400 32px "Noto Sans JP"',
    '400 32px "Dela Gothic One"', '800 32px "M PLUS Rounded 1c"', '500 32px "M PLUS Rounded 1c"'];
  const all = Promise.all(faces.map((f) => document.fonts.load(f, text).catch(() => null)));
  await Promise.race([all, new Promise((r) => setTimeout(r, 4000))]);
}

// ---------------------------------------------------------------- stage

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
const dpr = Math.min(devicePixelRatio, lowPower ? 1.75 : 2);
renderer.setPixelRatio(dpr);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);
T.setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
scene.background = T.backgroundTexture();
scene.fog = new THREE.Fog(0x0b0c0e, 7, 16);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.42;

const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.02, 60);
const HOME = { pos: new THREE.Vector3(2.35, 1.45, 3.6), target: new THREE.Vector3(0, 0.92, 0) };
camera.position.copy(HOME.pos);
if (params.get('cam')) {
  const c = params.get('cam').split(',').map(Number);
  HOME.pos.set(c[0], c[1], c[2]);
  HOME.target.set(c[3], c[4], c[5]);
  camera.position.copy(HOME.pos);
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.minDistance = 0.55;
controls.maxDistance = 7;
controls.maxPolarAngle = Math.PI * 0.5 - 0.01;
controls.screenSpacePanning = true;
controls.autoRotate = !still;
controls.autoRotateSpeed = 0.55;
controls.addEventListener('start', () => { controls.autoRotate = false; hint.classList.add('fade'); });

// studio lighting
scene.add(new THREE.HemisphereLight(0x9aa3b5, 0x151518, 0.35));
const key = new THREE.DirectionalLight(0xfff0e0, 1.5);
key.position.set(2.8, 4.8, 3.6);
key.target.position.set(0, 0.8, 0);
key.castShadow = true;
key.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 1.6, bottom: -1.6, near: 1, far: 12 });
key.shadow.camera.updateProjectionMatrix();
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
key.shadow.radius = 4;
scene.add(key, key.target);
const fill = new THREE.DirectionalLight(0xc9d6ff, 0.45);
fill.position.set(-4, 2.2, 2.5);
const rim = new THREE.DirectionalLight(0xa9bcff, 1.1);
rim.position.set(-2.5, 3.2, -4);
const back = new THREE.DirectionalLight(0xfff4ea, 0.5);
back.position.set(3, 1.4, -4);
scene.add(fill, rim, back);

// glow spilling from the window onto the floor
const spill = new THREE.SpotLight(0xdfeaff, 2.2, 4, 1.05, 1, 1.6);
spill.position.set(-0.12, 1.15, 0.37);
spill.target.position.set(-0.12, 0, 1.4);
scene.add(spill, spill.target);

// ---------------------------------------------------------------- model

let model;
function buildModel() {
  initMaterials();
  model = new THREE.Group();
  model.name = 'jidohanbaiki';
  model.add(buildCabinet(), buildDrinks(), buildSelection(), buildControlPanel(), buildDispenser(), buildDetails());
  scene.add(model);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64).rotateX(-Math.PI / 2), M.floor);
  floor.receiveShadow = true;
  floor.renderOrder = -2;
  scene.add(floor);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.9).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: T.contactShadowTexture(), transparent: true, depthWrite: false }),
  );
  contact.position.y = 0.0015;
  contact.renderOrder = -1;
  scene.add(contact);
}

// ---------------------------------------------------------------- post-processing

const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: lowPower ? 2 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.38, 0.4, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h;
  // keep the whole machine in frame on tall phone screens
  camera.fov = w / h < 0.8 ? 50 : 35;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setPixelRatio(dpr);
  composer.setSize(w, h);
  bloom.setSize(w * (lowPower ? 0.5 : 1), h * (lowPower ? 0.5 : 1));
}
addEventListener('resize', resize);

// ---------------------------------------------------------------- camera limits

const TARGET_MIN = new THREE.Vector3(-0.7, 0.1, -0.6), TARGET_MAX = new THREE.Vector3(0.7, 1.8, 0.6);
const BODY = { min: new THREE.Vector3(-0.58, -1, -0.5), max: new THREE.Vector3(0.58, 1.9, 0.48) };

function clampCamera() {
  controls.target.clamp(TARGET_MIN, TARGET_MAX);
  const p = camera.position;
  if (p.y < 0.04) p.y = 0.04;
  // never let the camera slip inside the cabinet: push it out through the nearest face
  if (p.x > BODY.min.x && p.x < BODY.max.x && p.y < BODY.max.y && p.z > BODY.min.z && p.z < BODY.max.z) {
    const d = [
      [p.x - BODY.min.x, 'x', BODY.min.x], [BODY.max.x - p.x, 'x', BODY.max.x],
      [BODY.max.y - p.y, 'y', BODY.max.y],
      [p.z - BODY.min.z, 'z', BODY.min.z], [BODY.max.z - p.z, 'z', BODY.max.z],
    ].sort((a, b) => a[0] - b[0])[0];
    p[d[1]] = d[2];
  }
}

// ---------------------------------------------------------------- interaction: press the selection buttons

const hint = document.getElementById('hint');
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downAt = null;
let msgTimer = 0;

function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(selection.buttons, false)[0];
  return hit ? hit.object : null;
}

renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  const btn = pick(e);
  if (btn) press(btn);
});

function press(btn) {
  const p = btn.userData.product;
  btn.userData.press = 1;
  const d = panelParts.display;
  if (p.soldOut) {
    d.message = '売切 SOLD OUT';
    btn.userData.blink = 1.2;
  } else {
    d.amount = p.price;
    d.message = 'ありがとうございました';
    bay.drop(p);
  }
  d.scroll = 0;
  msgTimer = 5;
}
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.buttons) return;
  renderer.domElement.style.cursor = pick(e) ? 'pointer' : '';
});
renderer.domElement.addEventListener('dblclick', () => {
  resetFrom = { pos: camera.position.clone(), target: controls.target.clone(), t: 0 };
});
let resetFrom = null;

// ---------------------------------------------------------------- animation

const IDLE_MESSAGES = ['いらっしゃいませ', 'つめた〜い あったか〜い', 'WELCOME!', 'にこにこドリンク'];
let idleIdx = 0;
let flickerUntil = 0, nextFlicker = 3;
const clock = new THREE.Clock();
const breatheMats = () => [M.tube, M.tubeWarm, M.bayLight, panelParts.screenMat, model.getObjectByName('headerSign').material];
let glowMats, rowBase, warmBase, bayBase;

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // slow "breathing" plus an occasional fluorescent flutter
  const breath = 1 + 0.035 * Math.sin(t * 1.1) + 0.015 * Math.sin(t * 2.7 + 1.3);
  if (t > nextFlicker) { flickerUntil = t + 0.06 + Math.random() * 0.14; nextFlicker = t + 5 + Math.random() * 11; }
  const flick = t < flickerUntil ? 0.8 + Math.random() * 0.2 : 1;
  for (const m of glowMats) m.color.copy(m.userData.base).multiplyScalar(breath * (m === M.tube ? flick : 1));
  lights.rows.forEach((l, i) => { l.intensity = rowBase[i] * breath * flick; });
  lights.warm.intensity = warmBase * breath;
  bay.light.intensity = bayBase * breath;
  spill.intensity = 2.2 * breath * flick;

  selection.glowAvail.color.copy(selection.glowAvail.userData.base).multiplyScalar(0.88 + 0.12 * Math.sin(t * 1.6));
  selection.glowSold.color.copy(selection.glowSold.userData.base).multiplyScalar(0.85 + 0.15 * Math.sin(t * 3.1));
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
  panelParts.waveMat.color.copy(panelParts.waveMat.userData.base).multiplyScalar(0.35 + 0.65 * pulse * pulse);
  panelParts.arrowTex.offset.y = (panelParts.arrowTex.offset.y + dt * 0.9) % 1;
  panelParts.arrowMat.color.copy(panelParts.arrowMat.userData.base).multiplyScalar(0.7 + 0.3 * Math.sin(t * 5));
  moving.fan.rotation.z -= dt * 9;

  for (const b of selection.buttons) {
    const u = b.userData;
    if (u.press > 0) { u.press = Math.max(0, u.press - dt * 5); b.position.z = u.restZ - 0.003 * Math.sin(u.press * Math.PI); }
  }
  if (selection.buttons.some((b) => b.userData.blink > 0)) {
    let any = false;
    for (const b of selection.buttons) if (b.userData.blink > 0) { b.userData.blink -= dt; any = true; }
    selection.lampOn.color.copy(selection.lampOn.userData.base).multiplyScalar(any && Math.sin(t * 30) > 0 ? 1.6 : 1);
  }

  // display: idle greetings, or feedback after a purchase
  const d = panelParts.display;
  msgTimer -= dt;
  if (msgTimer <= 0) {
    d.amount = 0;
    d.message = IDLE_MESSAGES[idleIdx++ % IDLE_MESSAGES.length];
    d.scroll = 0;
    msgTimer = 7;
  }
  d.update(dt);
  updateDispenser(dt);

  if (resetFrom) {
    resetFrom.t = Math.min(1, resetFrom.t + dt * 1.4);
    const k = 1 - Math.pow(1 - resetFrom.t, 3);
    camera.position.lerpVectors(resetFrom.pos, HOME.pos, k);
    controls.target.lerpVectors(resetFrom.target, HOME.target, k);
    if (resetFrom.t >= 1) resetFrom = null;
  }
  controls.update(dt);
  clampCamera();
  composer.render(dt);
}

// ---------------------------------------------------------------- boot

(async () => {
  await loadFonts();
  buildModel();
  glowMats = breatheMats();
  rowBase = lights.rows.map((l) => l.intensity);
  warmBase = lights.warm.intensity;
  bayBase = bay.light.intensity;
  resize();
  renderer.setAnimationLoop(animate);
  requestAnimationFrame(() => loader.classList.add('done'));
  if (still) { loader.remove(); hint.remove(); }
  if (params.has('press')) setTimeout(() => press(selection.buttons[+params.get('press')]), 300);
  if (params.has('stats')) {
    const el = Object.assign(document.createElement('pre'), { style: 'position:fixed;top:8px;left:8px;margin:0;color:#9f9;font:12px monospace;z-index:9' });
    document.body.appendChild(el);
    let frames = 0, last = performance.now();
    setInterval(() => {
      const now = performance.now();
      el.textContent = `fps ${(frames * 1000 / (now - last)).toFixed(0)}  calls ${renderer.info.render.calls}  tris ${(renderer.info.render.triangles / 1000).toFixed(0)}k  geo ${renderer.info.memory.geometries}  tex ${renderer.info.memory.textures}`;
      frames = 0; last = now;
    }, 1000);
    renderer.info.autoReset = false;
    const r = composer.render.bind(composer);
    composer.render = (dt) => { renderer.info.reset(); frames++; r(dt); };
  }
  window.__vm = { scene, camera, controls, renderer };
})();
