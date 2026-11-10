# Naming and New-Game Cancel Update

- Added a Cancel button to the first-time character setup. It returns to the title/save-slot screen without saving an incomplete world.
- Existing save data is no longer deleted when an overwrite is confirmed. The previous save is retained until the player confirms the new character and farm names and the new profile is saved.
- Added a farm-name field alongside the character-name field in the custom character setup screen.
- Saved the farm name as part of the player profile data. Existing saves without a farm name load with the default `My Farm` name.
- Added character and farm renaming controls to the in-game Profile panel.
- Replaced the browser-native save-slot rename prompt with a custom in-game-style dialog, including validation and Cancel/Save controls.
- Save-slot cards now display the farmer name, farm name, and current day when available.
- Increased the save data version to 14 while retaining support for previous save versions.
