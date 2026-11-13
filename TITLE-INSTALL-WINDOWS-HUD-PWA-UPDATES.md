# Title Install Placement, Windows HUD Cleanup, and PWA Updates

## Title screen
- Moved the install action below all save-slot cards.
- Kept the action centered in a dedicated lower-middle section.
- Restyled the button with a green/gold farming-game finish and clear installed/disabled state.

## Windows HUD
- Removed the Phaser-drawn top-right inventory, profile, language, and help icon buttons.
- Removed the separate top-right audio-note icon.
- Hid the entire mobile-only icon rail on Windows.
- Kept fullscreen and Menu controls grouped at the lower-left.
- Added Windows shortcuts: `I` inventory, `P` profile, `L` language, `H` help, `M` audio settings. The Help panel subtitle lists these shortcuts.
- Mobile keeps its touch HUD and its own touch-first controls.

## Installed-app updates
- Installed copies do not need to be uninstalled or reinstalled after a new deployment.
- The service worker activates updates promptly, uses network-first loading for app/game assets, and keeps cached offline fallbacks.
- The running app checks the deployed `foi-build` marker and Vite bundle paths periodically, and checks again when the app becomes visible.
- If a new build is found during gameplay, the refresh waits until the player returns to the title screen to avoid interrupting an active game session. At the title screen, the new version reloads automatically.
- When launched as an installed PWA, the title screen displays `ALREADY INSTALLED` and explains that updates arrive automatically.
