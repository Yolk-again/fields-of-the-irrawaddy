# Install Placement, Windows HUD, and Installed-App Updates

- Moved the install action below the save-slot cards and centered it in a dedicated title-screen section.
- Restyled the install action as a prominent green-and-gold control with a clear installed/disabled state.
- The install action reads `ALREADY INSTALLED` and explains that future builds update automatically when opened from the installed app.
- Removed the entire mobile icon rail from Windows. Windows retains a dedicated fullscreen button and the Menu action at the lower-left; mobile retains its touch HUD.
- Added a dedicated Windows fullscreen button so desktop behavior does not depend on showing the mobile icon rail.
- The service worker uses network-first navigation and app-asset requests, keeps offline fallbacks, and activates updated workers immediately.
- The app checks the published `foi-build` marker periodically. When a new build is found during gameplay, reload is deferred until returning to the title screen to avoid interrupting a session. At the title screen, the update is applied automatically.
- Existing installations do not need to be removed or reinstalled after a deployment.
