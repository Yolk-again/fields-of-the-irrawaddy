FIELDS OF THE IRRAWADDY — MOBILE + UI REFRESH

WHAT CHANGED
- Added a bilingual in-game Help screen. Open it with H on desktop or the HELP button on mobile.
- Added a first-step hint to the farming status panel.
- Reworked the market into separate buy and sell action cards.
- Reworked the workbench into three clear, tappable recipe cards with current material counts.
- Improved inventory item cards and tool-selection/collection instructions.
- Restored the profile language switch, top-right close button, and in-game rename form.
- Kept the existing farm systems, assets, save data, and mobile joystick.

INSTALL
1. Close the Vite development server if it is running.
2. Extract this ZIP into your existing fields-of-the-irrawaddy project folder.
3. Allow Windows to overwrite the existing files when asked.
4. Keep your .git folder and .gitignore file. Do not delete them.
5. Open PowerShell in the project folder and run:

   npm.cmd run build

6. If the build succeeds, run:

   npm.cmd run dev

DESKTOP CONTROLS
- Move: WASD or arrow keys.
- Select farming tool: 1–4.
- Use the selected tool: SPACE.
- Advance to the next day: N.
- Talk to villagers or open the market: E when nearby.
- Open the backpack: I.
- Collect a nearby resource: F.
- Use the workbench: C when nearby.
- Open the farmer profile: P.
- Open the Help screen: H.
- Inside the market, press 1 to buy seeds or 2 to sell rice.
- Inside the workbench, press 1, 2, or 3 to craft a recipe.

MOBILE CONTROLS
- Rotate the phone to landscape.
- Use the left virtual joystick to move.
- BAG opens the inventory.
- CRAFT opens the workbench when nearby.
- HELP opens the bilingual game guide.
- PICK collects nearby resources.
- TALK interacts with nearby villagers or the market.
- PROFILE opens the farmer profile.
- USE applies the currently selected farming tool.
- DAY advances the farming day.
- Tap one of the four tool slots along the bottom to select the hoe, seeds, watering can, or sickle.
- Inventory, market, recipe cards, and dialogue can be operated by tapping.

TESTING NOTE
The TypeScript source was syntax-checked after the UI changes. A full production build could not be run in this workspace because the project dependencies were not available here. Run the build command above on your computer before pushing the changes to GitHub or deploying them.
