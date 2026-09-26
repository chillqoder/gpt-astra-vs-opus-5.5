# Jidōhanbaiki — Japanese vending machine in Three.js

A single, showpiece-quality 3D model of a classic Japanese street vending machine,
built entirely in code: no imported models, no image files. All labels, stickers,
signs and wear are painted at runtime with the 2D canvas API.

## Run

- **Just open `index.html`** (double-click). It is a self-contained build, and only
  Three.js (and the Google Fonts) load from a CDN, so it needs an internet connection.
- **Developing:** edit `src/`, then either
  - serve the folder (`python3 -m http.server` → http://localhost:8000/dev.html), which loads the
    modules directly (ES modules can't be loaded over `file://`), or
  - run `node build.mjs` to regenerate `index.html` from `src/`.

## Controls

Drag to orbit (inertial) · scroll / pinch to zoom · right-drag / two-finger drag to pan ·
click a lit selection button to buy a drink · double-click to reset the view.
The model slowly auto-rotates until you touch it.

Debug URL params: `?still` (no auto-rotate / overlays), `?cam=x,y,z,tx,ty,tz`, `?stats`, `?press=<0-17>`.

## Layout

| File | Contents |
|---|---|
| `src/layout.js` | Real-world dimensions (1.80 × 1.00 × 0.70 m) and the window grid |
| `src/textures.js` | Every canvas-painted texture: labels, header sign, LED display, stickers, wear |
| `src/materials.js` | Paint, steel, plastic, rubber, glass and glow materials |
| `src/cabinet.js` | Shell, door with openings, header lightbox, window, shelves, plinth & feet |
| `src/drinks.js` | 18 invented drinks (lathed cans / PET / marble-soda bottles), 3 deep per slot |
| `src/panel.js` | Price tags, selection buttons, LED display, coin slot, bill acceptor, change cup, contactless pad |
| `src/dispenser.js` | Pickup bay, spring-loaded flap and the drop animation |
| `src/details.js` | Screws, rivets, vents, compressor fan & coil, lock, hinges, plates, stickers, power cable |
| `src/main.js` | Stage, lighting, bloom, orbit controls & camera limits, animation and interaction |
