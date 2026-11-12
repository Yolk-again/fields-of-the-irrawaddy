# Device-Specific UI and Request Button Fix

## Windows and mobile instructions
- Added a shared platform detector so Windows desktop keeps keyboard/mouse hints even on touch-capable Windows laptops or narrow browser windows.
- Mobile devices use tap-focused prompts, subtitles, and help text.
- Windows keeps E/R/F/Space and number-key instructions where applicable.
- Villager, market, dialogue, house, inventory, chest, cooking, fishing, and request-board instructions now select the appropriate device copy.
- Fixed the Help panel's mobile card mapping so its fishing, village, cooking, and home cards describe the correct topics.
- The Help panel's Windows close hint now explicitly refers to clicking the close control.

## Request-board button state
- Touch pointer movement no longer applies hover colors to request delivery buttons.
- Request buttons are colored from the actual owned-item requirement: green only when the request can be fulfilled, muted when insufficient, and dark when completed.
- A failed delivery attempt leaves the button in the muted state and displays the missing-quantity message.

## Compatibility
- No save-data schema changes.
- Existing keyboard controls and game actions remain available on Windows.
- English and Burmese copy updated for the device-specific prompts.
