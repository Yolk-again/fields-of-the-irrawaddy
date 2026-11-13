# Windows and Mobile Fullscreen Update

- Restored a visible fullscreen button for Windows desktop play.
- The same fullscreen button is available during the opening story/cutscene on Windows and mobile.
- During desktop play, only the fullscreen button from the DOM HUD is shown; the existing Phaser desktop HUD remains unchanged.
- Fullscreen requests use the browser Fullscreen API on Windows. Unsupported or rejected desktop requests show the existing warning state rather than activating the mobile CSS fallback.
- Mobile keeps its native Fullscreen API path and CSS fallback where needed.
- The fullscreen HUD button is exposed to assistive technology on desktop and mobile while the game is active.
- Other DOM HUD actions remain mobile-only.

- Windows fullscreen control is positioned at the upper-right HUD, with only the fullscreen button visible from the shared DOM control rail.


## Installed app updates

Installed copies do not need to be reinstalled for new deployments. The service worker checks for updates, refreshes app assets from the network, and the app checks the published `foi-build` marker. Updates reload automatically on the title screen; while gameplay is active, applying a build is deferred until the player returns to the title screen to avoid interrupting a session. The install button shows `ALREADY INSTALLED` when the page is running as an installed PWA.
