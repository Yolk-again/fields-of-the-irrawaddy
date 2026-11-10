# Fields of the Irrawaddy — Village UI & Environment Update

## What changed

### Interface
- Added opaque screen-fixed top and bottom HUD bands so the scrolling village cannot draw over interface controls.
- Consolidated the game title, Burmese subtitle and in-game clock into one title panel.
- Grouped day, seed and rice information in a compact status panel with simple visual indicators.
- Kept the farming hotbar in a dedicated footer area and fixed tool-icon positioning on touch devices.
- Moved the music control into the top HUD row beside Help and Fullscreen.
- Added responsive web-page instruction cards with movement, village-action and farming controls.

### Village layout
- Kept the existing main road, canal, farm plot and NPC home positions.
- Added footpaths connecting the homestead, granary, market, chicken yard, home plots, rice paddy, monastery, lotus pond and canal crossing.
- Grouped village props into recognizable working areas rather than scattering them across the map.
- Moved the perimeter trees down so their canopies are not clipped by the world boundary.
- Added bilingual zone labels for the chicken yard, home garden, rice fields, canal washing area and rice drying area.

### New / clearer pixel-art assets
- Stone community well.
- Woven rice-drying mat with visible rice grains.
- Irrigation channel.
- Canal washing platform with a folded longyi and wash bowl.
- Bamboo clothesline with recognizable village clothing.
- Village sign with a pagoda emblem.
- Bamboo chicken coop.
- Transparent village footpath overlay.

## Files updated for this pass

- `index.html`
- `src/style.css`
- `src/game/scenes/FarmScene.ts`
- `src/game/systems/FarmingSystem.ts`
- `src/game/systems/LanguageSystem.ts`
- `src/game/systems/MarketSystem.ts`
- `src/game/systems/ModalUIManager.ts`
- `src/game/systems/MusicSystem.ts`
- `src/game/systems/VillageSystem.ts`
- `tools/pixel_art/build_village_decorations.py`
- `public/assets/asset-manifest.json` and the generated assets under `public/assets/`

The ZIP also preserves the other files and existing changes in the uploaded project. No `node_modules`, `.git`, Python cache or stale `dist` output is included.

## Run on Windows

From the project folder:

```cmd
npm.cmd install
npm.cmd run dev
```

Build check:

```cmd
npm.cmd run build
```

Regenerate only the new village props and path overlay (does not run the full asset builder):

```cmd
python tools\pixel_art\build_village_decorations.py
```

## Verification performed in the working copy

- `tsc --noEmit` passed using the available TypeScript 5.8.3 compiler.
- `tools/pixel_art/build_village_decorations.py` ran successfully and regenerated all 8 listed assets.
- All direct `/assets/...` references found in the TypeScript, HTML and CSS sources resolve to files in `public/assets/`.
- Full Vite bundling was not verified in this Linux test environment because the uploaded `node_modules` contains the Windows-only Rolldown native binding. On the Windows development machine, run `npm.cmd run build` to verify the Vite bundle using the platform-matching dependencies.

## Visual previews

See `irrawaddy_map_layout_preview_final.jpg` and `irrawaddy_village_assets_preview.jpg` supplied alongside the project ZIP.
