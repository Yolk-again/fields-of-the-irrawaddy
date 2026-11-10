# Mobile UX and tab clarity update

This update is based on the previous mobile/profile/photo edition.

## Included changes

- The mobile contextual action is a native HTML button. Touch and pen taps use captured pointer events, and keyboard/screen-reader activation remains supported.
- The game container no longer applies `touch-action: none` to its HTML controls; only the Phaser canvas is gesture-locked for movement.
- The in-game MENU button returns to the save-slot title screen after requesting a save. It is available on desktop and touch layouts.
- The title screen keeps its scroll-to-see-save-slots cue, now with English and Burmese copy. The cue updates after image load, resize, scrolling, and returning to the title screen.
- Noto Sans and Noto Sans Myanmar remain the shared font stack for English and Burmese. Phaser waits for both font faces before creating the game.
- The market shows the KYAT balance with a coin icon, owned item counts, and colored CAN BUY / CAN SELL / NEED / NOT IN BAG status badges. Market and upgrade prices use KYAT wording.
- The request board shows rice progress and coin/seed reward icons, and changes its delivery button state when more rice is needed.
- Cooking recipes show a CAN COOK / NEED RICE / NEED FISH status based on current ingredients.
- The house chest hides zero-quantity items and compacts visible rows. An empty-state message appears when nothing is available in the backpack or chest.

## Build and run

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run dev
```

## Validation performed in the packaging environment

- All 25 TypeScript source files passed the TypeScript transpile/syntax pass.
- HTML parser and CSS parser checks passed.
- Static translation-key checks passed.
- All 97 explicitly referenced public asset paths were found.
- Dependency installation timed out in the packaging environment, so a full `tsc && vite build` and live phone testing were not completed here.
