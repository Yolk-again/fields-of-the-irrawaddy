# Village layout and interface revision

## What changed

- Removed `village_paths_overlay.png` from the scene and asset build. All roads now come exclusively from the original dirt-road artwork baked into `public/assets/terrain/village_ground_base.png`.
- Kept the original map dimensions because the current ground already has enough usable space; the new layout uses the grass plots and the stone courtyard as separate village zones.
- Reorganized the player homestead, granary, market and workshop along the original main dirt road. Ko Aung's and Ma Thiri's homes now face the same road.
- Moved the player's 5x3 field to a clear grass area, moved the decorative rice paddy beside it, and reserved the original tiled ground patch for the monastery courtyard, rice drying and lotus pond.
- Grouped the chicken coop and chickens into one compact fenced yard. Canal washing and clothes drying sit in their own separate strip above the original canal.
- Removed permanent floating world-location captions. Only one nearby NPC label, one nearest-home label, or one nearby service prompt is shown at a time; the activity/talk stack is no longer drawn over villagers.
- Removed extra decorative clutter around the homestead well. The secondary irrigation-channel texture remains available for generator compatibility but is not placed in the village.
- Tightened the chicken-yard and player-field fence spacing, opened the actual gates, and aligned collision boundaries with the visible fence layout.
- Reduced HUD height and put Save/Load, Music, Help and Fullscreen into a single top utility row. The bottom bar is reserved for tool slots and short control hints. Touch controls use the coarse-pointer test and are separated from tool slots.

## Files changed

- `src/game/scenes/FarmScene.ts`
- `src/game/systems/FarmingSystem.ts`
- `src/game/systems/VillageSystem.ts`
- `src/game/systems/MarketSystem.ts`
- `src/game/systems/CraftingSystem.ts`
- `src/game/systems/SaveSystem.ts`
- `src/game/systems/MusicSystem.ts`
- `tools/pixel_art/build_village_decorations.py`
- `public/assets/asset-manifest.json`

## Run

```cmd
npm.cmd run build
npm.cmd run dev
```

No road overlay, secondary track, or road-like irrigation strip is generated or loaded. The original `village_ground_base.png` remains byte-for-byte unchanged and is the single source of truth for the existing dirt road and canal. All new path-looking overlays have been removed.

The map remains 1440 x 640 world pixels. It was not enlarged because the original ground has sufficient space; using the larger canvas would not improve readability without also reworking the base tile art.
