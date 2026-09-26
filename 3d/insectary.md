# Prompt: Interactive 3D Glass Insectarium with Butterflies, Stick Insects & Praying Mantis

## Task

Create a single-file HTML page featuring a realistic interactive 3D glass insectarium (terrarium) with live insects inside: **three butterflies**, **two stick insects**, and **one praying mantis**. Use **Three.js** (import from CDN) for all 3D rendering. Everything — geometry, materials, animation, lighting, controls, collision logic — must be contained in one self-sufficient `.html` file with no external assets (no image textures, no model files). All insects, plants, branches, and the terrarium itself must be built procedurally using Three.js geometry and shaders.

---

## Scene Composition

### Background
- Deep forest-green gradient background (`#0a1a10` → `#1a3a24`) filling the entire viewport behind the insectarium.
- Optional: subtle animated dappled-light pattern on the background to simulate filtered sunlight through a canopy.

### Glass Insectarium (rectangular tank)
- Dimensions approximately 6 × 3 × 4 (width × depth × height) world units.
- **Glass material**: use `MeshPhysicalMaterial` with `transmission: 0.95`, `roughness: 0.05`, `thickness: 0.15`, `ior: 1.5`, `transparent: true`, `opacity: 0.18`, slight green tint (`#e8f5e9`). The insectarium must look like real glass — you should see reflections, refractions, and the objects inside through it.
- Render the tank as 5 separate glass panels (4 walls + bottom). The top is **closed with a fine mesh lid** (thin grid of `LineSegments` or a semi-transparent `PlaneGeometry` with a grid shader) to prevent insects from escaping — visually suggests a real terrarium screen top.
- Add a subtle dark wooden or matte-black frame/rim along all edges of the tank for realism.

### Substrate & Interior Environment
- **Soil / substrate floor**: a slightly irregular brown plane (`#3E2723`, `#4E342E`) with subtle noise displacement on top for realism, plus a light scattering of leaf litter.
- **Leaf litter**: 30–50 small flattened shapes (`CircleGeometry` or `ShapeGeometry`) in autumn tones (`#8D6E63`, `#A1887F`, `#6D4C41`, `#BF360C`) scattered across the floor.
- No water volume. This is a **dry / semi-humid terrarium**.

---

## Insects

Each insect must be a detailed **multi-part 3D model built from Three.js geometries**, NOT a flat sprite or a simple sphere.

### 1. Butterflies (×3) — *Morpho / Monarch style*

| Part | Geometry approach | Details |
|---|---|---|
| **Body** | Thin elongated capsule (`CapsuleGeometry`) | Dark brown/black (`#1A1A1A`) with subtle segment rings |
| **Head** | Small sphere with two tiny antennae (`CylinderGeometry` tapered, curved via segments) | Antennae with tiny knobs at tips |
| **Wings (×4)** | Flat `ShapeGeometry` with a wing profile curve (forewing larger, hindwing smaller and rounded) | Orange with black veins and white spots (shader or layered geometry); translucent (`opacity 0.85`) |
| **Legs (×6)** | Thin `CylinderGeometry` segments with joint spheres | Dark, articulated, mostly tucked under the body |
| **Proboscis** | Thin curled `TubeGeometry` at the head | Optional, adds realism |

**Wing flapping animation**: The two wings per side oscillate around the Z-axis (the body's forward axis) at ~8–12 Hz. Amplitude ~±70°. When the butterfly lands, wings slowly fold upward and stop flapping, occasionally opening/closing gently.

### 2. Stick Insects (×2) — *Carausius / Phasmatodea*

| Part | Geometry approach | Details |
|---|---|---|
| **Body** | Long segmented `CylinderGeometry` pieces or a `TubeGeometry` along a slight S-curve | Brown/green (`#5D4037`, `#33691E`) with bark-like noise texture via shader |
| **Head** | Small elongated sphere at the front | Two thin antennae, small dark eyes |
| **Legs (×6)** | Long thin cylinders with joint spheres; front pair held forward, middle and back pairs angled outward | Articulated so insect can slowly move them one at a time (classic phasmid walk) |
| **Abdomen tip** | Tapered small cylinder | Slight upward curve |

**Behavior**: Stick insects **crawl slowly on branches and walls** of the terrarium. They perform a subtle rhythmic "swaying" motion (rocks side to side like a twig in the wind) when stationary — a signature phasmid behavior.

### 3. Praying Mantis (×1) — *Mantodea*

| Part | Geometry approach | Details |
|---|---|---|
| **Body** | Elongated tapered thorax + abdomen (`CylinderGeometry` or `LatheGeometry`) | Bright green (`#4CAF50`) with lighter belly (`#A5D6A7`) |
| **Head** | Triangular `ConeGeometry` or custom polyhedron, very mobile | Two large compound eyes (`SphereGeometry`, dark with specular highlight), two antennae |
| **Raptorial front legs (×2)** | Multi-jointed cylinders with a spine/tooth detail (`ConeGeometry` spikes along the inner edge) | Held in classic "praying" pose in front of the head |
| **Walking legs (×4)** | Thin jointed cylinders | Green, articulated |
| **Wings** | Two folded flat shapes along the back (`ShapeGeometry`) | Green, slightly translucent |

**Behavior**: The mantis stays mostly **stationary on a branch**, slowly rotating its head to "track" one of the butterflies or stick insects with its eyes — a signature and mesmerizing behavior. Occasionally it slowly shifts a leg or sways its body. Very rarely, it does a slow "arm raise" of the raptorial legs.

---

## Insect Behavior & Collision System

### General Collision Rules
- Every insect is treated as having a **bounding sphere** or **axis-aligned ellipsoid** collider matching its approximate body size.
- Insects must **never clip through the glass walls, the floor, the ceiling mesh, branches, or plants**. Enforce a margin of **0.3 world units** from all terrarium boundaries.
- Implement a **collision resolution function** that, on each frame, checks each insect's next position against:
  1. **Tank walls** (4 vertical planes) — clamp and reverse direction component.
  2. **Floor plane** — insects that crawl (stick insects, mantis) stick to it or to branches; flying insects (butterflies) bounce upward if they hit the floor.
  3. **Ceiling mesh** — butterflies bounce down if they approach the top.
  4. **Branches & plants** — approximate each with one or more capsule colliders; on collision, steer the insect around.
- Use **soft steering**: instead of hard bouncing, compute a repulsion vector and blend it with the desired velocity so motion looks organic, not robotic.
- Between insects: keep a small **personal-space radius** (0.4 units). If two insects come closer, both steer apart with a small push vector.

### Butterfly Behavior
- **Flight**: Random smooth waypoint navigation inside the upper 60% of the tank volume. Pick a target, smoothly turn (slerp) toward it, fly with slight bob (sine on Y), then pick a new target.
- **Landing**: Occasionally (every 8–15 s), pick a random branch or plant leaf as a target, descend, and land. Stay landed for 3–8 s with slow wing folds, then take off again.
- **Speed**: base speed 0.01–0.02 units/frame per butterfly, slightly different for each.
- **Banking**: tilt slightly on roll axis when turning.
- **Wing flap frequency** scales with speed.

### Stick Insect Behavior
- **Crawling**: Pathfinding along branch surfaces and tank walls only. They pick a target point that lies on a valid walkable surface (branch, wall, floor), then walk toward it with a **slow** base speed (0.002–0.004 units/frame).
- **Phasmid sway**: Always apply a small sinusoidal body rotation (rock ±5°) at ~0.5 Hz, even when walking.
- **Leg gait**: Animate the 6 legs in a **tripod gait** — front-left, middle-right, back-left move together; then the other three.
- If a target is unreachable due to a gap, pick a new target after 3 s.
- Never fly; never leave the surfaces.

### Mantis Behavior
- Stays anchored to **one chosen branch** for the entire scene (or moves very rarely to an adjacent branch).
- **Head tracking**: The head (and slightly the thorax) yaw and pitch to look at the nearest moving insect, using slerp for smoothness.
- **Idle motion**: Very slow body sway (±2°) at 0.2 Hz, occasional slow leg shifts, rare slow "arm raise" of the raptorial legs (every 20–40 s).
- Collision: treated as a static collider on the branch; other insects steer around it via personal space.

---

## Terrarium Interior Details

### Branches & Twigs
- 4–6 **curved branches** built from `TubeGeometry` along a Catmull-Rom curve, with varying thickness (`radius 0.03–0.08`), brown bark coloring (`#5D4037`, `#6D4C41`).
- Arrange them as a natural climbing structure: one main diagonal branch from lower-left to upper-right, a few smaller offshoots, one horizontal branch for the mantis.
- Each branch is a **walkable surface** and a **capsule collider**.

### Plants / Foliage (×4–6 clusters)
- Mix of:
  - **Broad leaves** (fern-like): `ShapeGeometry` with a simple leaf outline, double-sided, rich green (`#2E7D32`, `#388E3C`, `#1B5E20`).
  - **Grass blades**: thin `PlaneGeometry` clusters.
  - **Moss patches**: small clustered `SphereGeometry` mounds in dark green (`#1B5E20`).
- **Sway animation**: gentle sine-based sway with per-blade phase offset (simulating air currents).
- Place plant clusters in the corners and back of the tank, leaving open floor for insects.

### Small Details
- A few **small stones / pebbles** (`DodecahedronGeometry`, squashed on Y) in grays and tans scattered on the floor.
- Optional: a **tiny water dish** (`CylinderGeometry` hollow, shallow) with a translucent blue disc (`#1e88e5`, opacity 0.5) — purely decorative.

---

## Lighting

- **Ambient light**: soft warm-green (`#c8e6c9`, intensity 0.35) for overall fill.
- **Directional light** (simulating sunlight from above): warm white (`#fff8e1`, intensity 1.2), casting soft shadows.
- **Point light** inside the terrarium (simulating a heat lamp / terrarium bulb): positioned at the top-center of the tank, warm orange (`#ffcc80`, intensity 0.9), with distance falloff.
- Optional: subtle **dappled light** caustics projected onto the floor and branches (animate via shader or vertex-displaced projected pattern).

---

## Camera & Controls

- Use `OrbitControls` from Three.js addons (import from CDN: `three/addons/controls/OrbitControls.js`).
- **Default camera position**: slightly above and in front of the insectarium, angled to show a nice 3/4 perspective.
- The user can:
  - **Rotate** the scene (left-click drag) — orbit around the terrarium.
  - **Zoom** (scroll wheel) — get close to see insect details or zoom out to see the full scene.
  - **Pan** (right-click drag) — shift the view.
- Set `minDistance` and `maxDistance` on controls to prevent zooming too far in/out.
- Set the orbit target to the center of the terrarium.

---

## Animation & Performance

- Use `requestAnimationFrame` loop for smooth 60fps rendering.
- Animate per frame:
  - Insect movement, wing flapping, leg gait, head tracking, sway
  - Plant blade swaying
  - Optional dappled light pattern
- Use `renderer.setPixelRatio(window.devicePixelRatio)` and handle `window.resize` events.
- Enable `renderer.shadowMap` for soft shadows.
- Use `toneMapping: THREE.ACESFilmicToneMapping` and `toneMappingExposure: 1.2` for cinematic look.

---

## Technical Requirements

- **Single HTML file**, no external dependencies except CDN imports.
- Import Three.js and OrbitControls via ES module imports from `https://unpkg.com/three@0.160.0/build/three.module.js` (and corresponding addons path `https://unpkg.com/three@0.160.0/examples/jsm/`).
- All code in `<script type="module">`.
- Responsive: fill the full browser viewport (`width: 100vw; height: 100vh; margin: 0; overflow: hidden`).
- No console errors, no missing textures, no broken imports.

---

## Quality Bar

The final result should look like a **polished interactive 3D demo** — something impressive enough to screenshot and share. The butterflies should be clearly recognizable (wing pattern, flapping), the stick insects should look like twigs (elongated, camouflaged, swaying), and the mantis should be clearly a mantis (triangular head, raptorial pose, head-tracking eyes). Insects must **never clip through walls, floor, ceiling, branches or each other** — collisions must be resolved smoothly and invisibly. The terrarium should have a realistic transparent glass look. The overall scene should feel alive and calming, like watching a real terrarium.