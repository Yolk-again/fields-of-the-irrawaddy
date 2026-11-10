# Fields of the Irrawaddy — Gameplay Polish Update

## Changes in this update

- Added distance-aware sound effects. World sounds carry source coordinates, fade with player distance, and pan left/right. Footsteps, farm actions, market sounds, fishing sounds, NPC farm sounds, village board sounds, and villager conversations use positional playback.
- Removed the old selected-tool status toast. The active quick-slot item name remains in the existing hotbar name display.
- Reworked chicken movement around a yard-local pathfinder. Chickens plan escape directions away from the child/player, follow waypoint routes, and re-plan when blocked or stuck. The child's chase route tries nearby reachable target positions and discards stale blocked routes.
- Replaced the older resource/equipment inventory layout with a Minecraft-inspired quick bar + backpack. Items can be dragged between either area; dropping onto an occupied slot swaps the items. The 4 quick-bar slots and 15 backpack slots are saved and restored.
- Removed the duplicate fish-total component. The remaining fish-variety item shows the counts for silver barb, catfish, and golden carp.
- Repositioned the cooking recipe rows, status/message line, eat button and corresponding pointer hitboxes to avoid bottom text overlap.
- Eating a meal now applies the farm blessing: crops can become golden wheat and grow on a shorter 18 in-game-hour watering cycle for the blessing duration. The previous well-fed fishing-luck bonus was removed.
- Added the rice-grain image preload used by the golden-wheat inventory item.

## Inventory controls

- Drag an item from the backpack to a quick-bar slot to place it there.
- Drag a quick-bar item into the backpack to move it out of the toolbar.
- Drop an item onto another occupied slot to swap the two items.
- Click a quick-bar item to select it; keys 1–4 also select quick-bar slots.
- The layout is saved with the existing game save.

## Validation

- All 23 TypeScript source files passed TypeScript transpilation/syntax diagnostics.
- Asset preload references, inventory layout save fields, positional audio events, chicken route functions, cooking hitboxes, and meal-buff wiring passed source checks.
- Full `npm run build` was not completed in this environment: `npm install` timed out before dependencies were installed. Run `npm.cmd install` and `npm.cmd run build` locally to verify against the project's installed Phaser/Vite versions.


Build fix: Removed the unused FarmingSystem.toolDefinitions declaration that triggered TS6133 with noUnusedLocals enabled.
