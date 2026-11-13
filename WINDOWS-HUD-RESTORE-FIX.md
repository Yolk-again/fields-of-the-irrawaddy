# Windows HUD Restore Fix

- Added a dedicated Windows toolbar with Inventory, Profile, Language, Help, Settings, and Fullscreen buttons.
- Kept the existing mobile toolbar separate so desktop-only CSS overrides cannot hide its controls.
- Routed both toolbars through the same click action events.
- Removed the duplicate standalone desktop fullscreen button.
- Kept panel-opening keyboard shortcuts disabled; the on-screen controls are click-only.
- Bumped the service-worker app-shell cache to v7.
