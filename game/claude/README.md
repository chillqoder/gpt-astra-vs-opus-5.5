# Bandana Blitz — Operation: Sandstorm

A single-level 2D run-and-gun arcade game built from `../game.md`. All graphics, animation, sound effects and music are generated procedurally in code, with no asset files.

## Play
Open `index.html` in a modern browser. It is one self-contained file.

| Action | Keyboard | Gamepad |
|---|---|---|
| Move / aim (up, diagonal, down in the air) / crouch | Arrows or WASD | D-pad / left stick |
| Jump | Z, K, Space | A |
| Fire (knife when an enemy is close) | X, J | X / RT |
| Grenade (tank: cannon) | C, L | B / Y |
| Drop through a platform / exit the tank | Down + Jump | |
| Pause / Mute | P or Esc / M | Start / Select |

On phones and tablets, on-screen touch controls appear automatically.

## Structure
- `src/*.js`: the game modules (core, fx, sprites, world, player, enemies, props, boss, game flow)
- `src/shell.html`: the HTML page template the build inlines the modules into
- `build.sh`: inlines all modules into `index.html`. Run it after editing anything in `src/`.
