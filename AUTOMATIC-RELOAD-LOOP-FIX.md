# Automatic Reload Loop Fix — 2026-11-13

- Removed the published-build polling that compared the loaded page against a fresh HTML response and automatically called `window.location.reload()`.
- Removed the service-worker `controllerchange` handler that also forced a page reload.
- Kept service-worker registration and offline app-shell support.
- App updates are now picked up on a normal user refresh or when the app is reopened; they will not interrupt play or create an automatic reload loop.

The title screen, save slots, gameplay systems, pricing, and HUD behavior are otherwise unchanged.
