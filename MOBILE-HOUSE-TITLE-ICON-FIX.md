# Mobile House Actions, Title Scroll, and Desktop Icon Styling

## Changes

- Reused the native `#mobile-context-action` button for indoor mobile interactions. The same dedicated green button now handles the current room target: sleep, chest, cook, or exit.
- The indoor button is enabled only while the house is the active panel and a valid room target is selected. It is hidden while the chest or cooking sub-panel is open, or while the player is sleeping.
- Removed the unused Phaser room-prompt hit target from touch interaction so mobile actions no longer depend on canvas hit-testing.
- Stabilized the portrait title/save-slot scroll area by using a normal scroll container instead of vertically centering overflowing grid content. Disabled save-card entrance transforms in that scroll layout to prevent visual jumping while swiping.
- Updated desktop Phaser icon frames to match the mobile icon tiles (dark teak border, brown face, inset highlights/shadows), while retaining desktop icon positions, images, labels, and actions.

## Validation

- All TypeScript source files transpile with no syntax diagnostics.
- CSS brace balance and HTML references checked.
- A full Vite build and live device interaction test still require the project's installed dependencies and a browser/device runtime.
