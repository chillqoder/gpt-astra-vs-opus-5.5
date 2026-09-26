Create a single-file HTML page using Three.js (import from CDN) that procedurally generates a highly detailed 3D model of the character shown in the attached reference image. The character is a stylized chibi skeleton warrior/samurai. Recreate it as faithfully as possible using only Three.js geometry and materials — no external textures, no model files, no images. Everything must be built from primitives (BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, LatheGeometry, ExtrudeGeometry, ShapeGeometry, TubeGeometry, etc.) and custom shaders if needed.

Character details:
- Head: large white skull, rounded cranium, prominent deep black eye sockets, small nasal cavity, subtle jaw line. Off-white/bone color with soft shading.
- Hat: wide conical black Asian straw hat (kasa) sitting on top of the skull. Slightly glossy black material. On top of the hat are two black curved horns/antlers pointing upward and slightly outward, like a demon or samurai helmet crest.
- Body: short, stocky, chibi proportions. Torso covered in black tactical armor/vest with many pouches, straps, buckles, and small rectangular details. Some orange/brown accent strips and edges. The vest has a high collar or neck guard. A katana handle is visible protruding over the right shoulder (from behind).
- Arms: short, covered in black armor sleeves with segmented plates. Hands are black gloves or gauntlets. Fingers are stubby.
- Legs: short, wearing dark brown/gray pants with some folds. White socks visible above the ankles.
- Feet: black sandals (flip-flops) with white toe separation and black straps. Toes are white.

Materials: Use MeshStandardMaterial or MeshPhysicalMaterial with appropriate roughness, metalness, and colors. White skull: off-white (#f0f0f0) with slight roughness. Black armor: dark gray/black (#1a1a1a) with varied roughness, some parts glossy. Orange/brown accents: (#cc7a00, #8b4513). Pants: dark gray/brown (#3e3e3e). Socks: white. Sandals: black with white soles.

Lighting: soft ambient, key directional light, fill light, rim light, and shadows. Enable shadow maps. Use ACESFilmic tone mapping.

Camera: perspective camera, 3/4 front view, orbit controls (rotate, zoom, pan). Target center of character. Limit zoom.

Animation: subtle idle animation — gentle breathing (scale torso), slight head bob, maybe arms sway. Keep it alive but calm.

Technical requirements:
- Single HTML file, no external dependencies except Three.js and OrbitControls from CDN (unpkg or cdnjs).
- All code in <script type="module">.
- Responsive full viewport.
- No console errors.
- Clean, organized code with comments.
- Use groups and hierarchies for body parts to allow easy transformation.
- Maximize detail: add small pouches, straps, buckles, seams, horn ridges, hat texture (procedural bumps), skull cracks, etc.
- The final result should look like a polished interactive 3D demo, recognizable as the reference character, with a high level of detail.

Attach the reference image and use it as the primary guide for proportions, colors, and silhouette.