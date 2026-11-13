# Crop Pricing and Windows HUD Settings Update

- Added a clear crop-value ladder: normal wheat starts at 6 Kyat (plus the rice-mill bonus), green beans sell for 10 Kyat, tomatoes sell for 14 Kyat, and rare golden wheat sells for 24 Kyat.
- Seed packet prices now scale with the produce value: rice 25 Kyat, green beans 35 Kyat, tomatoes 45 Kyat per five-seed pack.
- Updated both the inspect descriptions and the actual sale calculation so displayed prices always match earned Kyat.
- Restored the full top-right HUD icon row on Windows, matching the shared mobile control layout.
- Replaced the music-note icon with a pixel-art Settings gear. The button opens the existing settings panel with audio and graphics controls.
- Enabled HUD button actions on desktop as well as touch devices. Windows keyboard shortcuts remain available.
- Kept the separate desktop fullscreen button hidden to avoid duplicate fullscreen controls; the shared top-right fullscreen icon handles it.
- Removed the unused `pixelPanel` import from `MusicSystem.ts`, fixing the reported TS6133 build error.
