# Insectary

A procedural, interactive glass insectarium built from the `insectary.md` brief.

## Run

From this folder:

```sh
python3 -m http.server 8080
```

Open http://localhost:8080. Everything is in `index.html`; no build step or packages are required. An internet connection is needed for the pinned Three.js 0.160.0 and OrbitControls CDN imports. All geometry, colors, lighting, and insect animations are generated in the page, with no model, texture, or font assets.

## Explore

- Drag to orbit, scroll or pinch to zoom, right-drag to pan.
- Select an inhabitant icon for a closer look and field notes.
- Pause the habitat, change daylight to evening, or enable auto-orbit.
- Reset returns to the full habitat. The final control toggles fullscreen.

The habitat contains three butterflies, two branch-walking stick insects, and one head-tracking mantis. Butterflies alternate between flight and resting on branches. Sampled branch and foliage capsules, boundary limits, and insect separation guide their movement.
