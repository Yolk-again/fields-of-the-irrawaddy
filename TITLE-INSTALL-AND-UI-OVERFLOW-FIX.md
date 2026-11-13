# Title Install Layout and UI Overflow Fix

- Moved the Install Game control into the centered title-screen row between the hero artwork and save slots.
- Changed the desktop scroll cue to `SCROLL DOWN TO INSTALL`; mobile uses `SWIPE UP TO INSTALL` with matching Burmese copy.
- The cue now appears only while the install row is below the visible title-screen viewport.
- Moved Windows fullscreen and menu controls away from the upper-right corner to the lower-left HUD area; touch devices retain their existing mobile HUD placement.
- Added responsive wrapping, sizing, and overflow protection for title/save/character dialogs and long canvas UI labels in inventory, storage, profile, market, fishing, house, and help screens.
- Kept Windows keyboard prompts and mobile touch prompts device-specific.

Validation in this environment: all 28 TypeScript files transpile without syntax diagnostics; the stylesheet parses without CSS errors; ZIP structure and integrity verified. A complete Vite production build and in-browser gameplay pass were not available because npm dependency installation timed out.
