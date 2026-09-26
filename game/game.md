Create a complete, playable, single-level 2D side-scrolling run-and-gun action game that runs in a web browser. The player controls a lone commando fighting through a hostile war zone from the left edge of the level to a huge boss at the end. Everything must be built from scratch in code: all graphics, animations and sound effects are generated procedurally, with no imported images, no downloaded audio and no external asset files. The result should feel like a polished arcade cabinet game, not a tech demo.

VISUAL STYLE
Chunky, hand-drawn-looking pixel-art style with bold outlines, saturated colors, expressive cartoonish characters and lots of small animated details. Humor and exaggeration are part of the charm: enemies panic, wobble and flail when hit, and explosions are big, bright and satisfying. The world is layered with several parallax backgrounds (distant sky and mountains, mid-range ruins, foreground props) so the scene feels deep. Include small ambient touches such as drifting smoke, flying birds, swaying flags and dust kicked up by running.

SETTING AND LEVEL STRUCTURE
One long, continuous level with a clear beginning, middle and end, split into distinct zones that flow into each other without loading screens:
1. A sun-scorched desert outpost with sandbags, wrecked cars and crumbling walls, used as a gentle introduction.
2. A bombed-out village with broken buildings, rooftops, balconies and ladders, where the player fights on multiple height levels.
3. A dark, cramped canyon or tunnel section with tighter combat and hazards such as falling rocks and explosive barrels.
4. A wide open arena in front of the enemy fortress for the final boss fight.
The camera scrolls smoothly to the right as the player advances. At certain points the screen locks and enemy waves must be cleared before the player can continue. Include a couple of hidden secret areas that reward exploration.

PLAYER CHARACTER
An original, charismatic commando with a distinctive outfit and a bandana or cap. Smooth, responsive controls: run, jump, crouch, aim up, aim down while jumping, shoot, throw grenades, and melee with a knife when an enemy is very close. Animations are rich: idle with small fidgets, run, jump, fall, crouch-walk, shooting in every direction, throwing, knife slash, taking damage, a funny death animation, and a victory pose. The player has a limited number of lives and can take a hit before dying, or has a small health bar.

WEAPONS AND PICKUPS
- The default pistol has unlimited ammo and a moderate fire rate.
- Weapon pickups dropped by crates and rescued captives: a rapid-fire machine gun, a spread-shot weapon, a flamethrower, a rocket launcher and a laser weapon, each with a different look, sound, projectile effect and limited ammo.
- Grenades with a satisfying arc, bounce and explosion, plus a separate grenade counter.
- Bonus items: medals, fruit, gold bars and other score collectibles, a health kit, an ammo refill and a temporary shield.
- Every pickup is clearly readable, gently bobbing or glowing.

ENEMIES
A varied cast of original enemy types, each with its own behavior and personality:
- Basic foot soldiers who run, shoot, hide behind cover, throw grenades and sometimes panic.
- Knife-wielding rushers who charge at close range.
- Snipers on rooftops who telegraph their shot with a visible laser line.
- Heavy gunners with armor who need many hits.
- Small drones or helicopters that strafe and drop bombs.
- Stationary turrets and mounted guns.
- Explosive-barrel carriers and suicide runners.
- Enemy vehicles such as a light armored jeep that charges through the level.
Enemies enter the screen in interesting ways: dropping from above, jumping from windows, bursting through walls, or arriving in trucks. Every enemy has clear hit reactions and a funny, exaggerated death.

RESCUE MECHANIC
Tied-up captives are hidden throughout the level, some in plain sight and some in secret places. Freeing one by touching or shooting the rope makes them cheerfully salute or dance, then give the player a reward such as a weapon, ammo or bonus points. A counter shows how many captives have been rescued, and a bonus at the end of the level depends on that number.

DRIVABLE VEHICLE
Midway through the level the player can jump into a small, heavily armed tracked combat vehicle. It has its own health bar, a powerful cannon, a rapid-fire machine gun, the ability to crush weak enemies, a jump-hop, and rugged, bouncy suspension animations. When its health is depleted it explodes and the player jumps out safely. The vehicle should feel powerful, fun and slightly ridiculous.

BOSS FIGHT
The level ends with a huge multi-part boss, a giant armored war machine that fills a large part of the screen. It has several distinct attack phases, weak points that break off visibly, smoke and sparks as it takes damage, a dramatic entrance and a spectacular chain-reaction explosion when defeated. The fight should be readable, fair and challenging, with attack patterns the player can learn and a boss health indicator.

HUD AND SCREENS
- A clean retro-style heads-up display showing score, lives, ammo, grenades, rescued captives and the current weapon.
- A title screen with an animated logo, a "press start" prompt and a short controls guide.
- A pause menu, a game-over screen with a countdown to continue, and a level-complete screen with a score tally, bonus breakdown and rank.
- Short on-screen messages such as "GO!" with a pointing arrow when the player may advance, and "WEAPON GET!" when picking something up.

GAME FEEL
Responsive, tight controls with slight coyote time and jump buffering. Strong feedback on every action: muzzle flashes, shell casings, screen shake on big explosions, brief hit-stop on strong hits, flashing enemies when damaged, floating score numbers, debris, smoke trails and sparks. Difficulty rises gradually through the level, with a mid-level checkpoint so the player does not have to restart from the beginning after dying.

AUDIO
Fully synthesized sound: distinct shot sounds per weapon, explosions, pickups, jumps, footsteps, enemy voice-like grunts and screams, a boss roar, and a menu jingle. Add a driving, upbeat, looping action soundtrack generated in real time, with a different, more intense track for the boss fight. Include a mute toggle.

CONTROLS
Keyboard controls with clearly displayed key bindings, plus optional gamepad support and simple on-screen touch controls for phones and tablets.

TECHNICAL QUALITY
Stable frame rate independent of screen refresh, efficient handling of many bullets, enemies and particles at once, correct resizing to any window while preserving the pixel-art look, and no crashes or stuck states. The game is delivered as a single self-contained file that works when opened directly in a modern browser.

GOAL
The finished game should be a complete, replayable arcade experience: instantly fun in the first ten seconds, full of variety and surprises, packed with humor and visual polish, and ending with a memorable, explosive boss victory.

BUILD PLAN (follow these steps in order)

1. Set up the foundation: create the game loop with stable timing, a fixed internal resolution scaled cleanly to any window, keyboard input handling, and a simple scene manager for title, gameplay, pause, game over and level complete screens.

2. Build the player: make the commando move, jump and crouch with tight, responsive controls (coyote time, jump buffering), then add aiming in all directions, shooting, grenades and the knife attack, along with all core animations.

3. Build the world: create the level layout with ground, platforms, ladders and cover, add tile-based collision, a smooth scrolling camera, parallax background layers and the screen-lock points that trigger enemy waves.

4. Add the weapon system: implement the default pistol and each special weapon with its own projectile, fire rate, ammo and effects, then add the pickup crates and item drops.

5. Add enemies: start with basic soldiers and their behavior, then add the other types one by one (rushers, snipers, heavies, drones, turrets, barrel carriers, jeep), each with its own entrance style, hit reaction and funny death.

6. Add the rescue mechanic and secrets: place captives throughout the level, connect them to rewards and the counter, and hide a couple of secret areas with bonus items.

7. Build the drivable vehicle: add entering and exiting, its own health, cannon, machine gun, crushing and hop, then place it at the midpoint of the level.

8. Build the boss: create the multi-part war machine with its entrance, attack phases, breakable weak points, damage states and the final chain-reaction explosion.

9. Add the HUD, screens and feedback: build the score, lives, ammo and captive display, all menus and on-screen messages, then layer on the game-feel effects such as muzzle flashes, shell casings, screen shake, hit-stop, particles and floating score numbers.

10. Add audio: synthesize the sound effects for every action, then the looping action music, the separate boss track and the mute toggle.

11. Add extra controls and checkpoint: support gamepad and touch controls, then implement the mid-level checkpoint and the continue countdown.

12. Balance and polish: play through the whole level, tune the difficulty curve, fix collision bugs, stuck states and performance drops, and confirm the game runs as one self-contained file with no crashes.