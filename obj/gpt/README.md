# Hiru — An everyday icon

An interactive, entirely procedural Three.js study of a classic Japanese vending machine, built from `../obj.md`.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To create and serve a production build:

```sh
npm run build
npm run preview
```

## Explore

- Drag with a mouse or finger to orbit around the entire cabinet. Automatic rotation stops when you interact.
- Scroll or pinch to zoom. The toolbar also provides zoom buttons, a front view, and automatic rotation.
- Switch between studio and midnight lighting with the moon button.
- Click an available drink's square selection button: the payment display updates and a drink appears in the pickup bay.
- Click the pickup flap to open it and collect the drink. Two products display a sold-out response.
- Open **About the object** for the story, specifications, and palette.

## Construction

The 100 × 180 × 70 cm cabinet includes 20 original drinks, stocked three units deep, with four illuminated shelves. Can and bottle shapes, Japanese/English labels, signs, stickers, and reflections are generated in code. No imported models, downloaded images, or external font services are used.

The cabinet includes a segmented amount display, coin and bill slots, contactless pad, change cup, lock, hinges, individual screws, rubber seals, side and rear ventilation, service plates, adjustable feet, and a power cable. Labels use canvas textures; studio reflections use Three.js's procedural RoomEnvironment.

Static geometry is batched by material, drink textures and geometry are reused, and pixel density is capped at 1.7 for a balanced rendering workload. The idle scene uses approximately 116–126 draw calls depending on the current interaction. WebGL is required.

## Files

- `src/main.js` — stage, procedural model, materials, textures, animation, and interactions, organized in the brief's build order.
- `src/style.css` — responsive showroom layout.
- `index.html` — accessible viewer controls and object information dialog.

## Validation

Production build passed. Browser checks covered desktop (1440 × 1000) and mobile (390 × 844), front and rear appearance, drink selection, sold-out feedback, lighting changes, orbit, zoom, dialog opening/closing, and horizontal overflow. No browser JavaScript errors were observed.
