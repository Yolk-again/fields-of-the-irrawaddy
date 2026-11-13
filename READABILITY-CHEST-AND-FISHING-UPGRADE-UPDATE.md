# Readability, Chest Layout, and Permanent Fishing Upgrade Update

- Raised the shared minimum Phaser UI font size so small English and Burmese labels are easier to read across all panels.
- Strengthened shared description contrast with a subtle dark outline and brighter cream text.
- Rendered the game canvas with crisp pixel scaling so high-resolution UI glyphs are not softened by fractional browser smoothing.
- Expanded the chest column headings to support two lines in both English and Burmese, with improved contrast and spacing.
- Moved chest feedback and exit hints farther from the bottom frame to prevent clipping and overlap.
- Kept the chest row layout and pointer hit positions aligned.
- Added the fishing rod to the Permanent Upgrades panel as a one-time purchase, with an explicit English/Burmese hint; its owned state, Kyat price, and save data continue to use the existing FishingSystem behavior.
- Bumped the service-worker cache and deployment version.
