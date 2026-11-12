# Chicken Navigation, Market Consistency, Upgrade and UI Polish

- Chickens now use a chicken-footprint-aware walkability callback in the shared orthogonal path planner, so selected paths are checked against the chicken's actual collision footprint before movement.
- Seed market rows consistently show owned counts for rice, tomato and green-bean seed packets; produce, meals, fish and bait rows retain visible bag counts.
- The fishing rod is a one-time purchase and is bought directly rather than opening the quantity selector. Farm upgrades remain one-click purchases; one-time upgrades are labelled as such.
- Added a new 16x16 golden wheat seed packet sprite and reused it for seed inventory, chest and market representations.
- The mobile intro cutscene keeps only the fullscreen button above the story overlay. Desktop/windowed mode no longer receives the touch HUD or a fullscreen button, including Windows touchscreen laptops.
- Added shared focus, hover and press feedback for pixel UI controls and refined the common modal panel frame.
- The shared modal frame now has consistent inset highlights and lower bevels; close controls have a matching drop shadow/highlight; market, inventory and chest cards use the same warm outline palette.
- Mobile detection now uses the shared `isMobilePlatform()` helper so a Windows touchscreen laptop remains in the desktop/window layout and does not display the mobile fullscreen control.
- The market's rod purchase is direct and cannot open the quantity selector. One-level farm upgrades are explicitly marked as one-time purchases and continue to purchase with one click.
- The production build could not be run in this workspace because `npm ci` timed out and the cached Vite package was unavailable. All TypeScript files were syntax-transpiled, translation object keys were checked for duplicates, asset references and manifest metadata were verified, and the final ZIP passed integrity checks.
