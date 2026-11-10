FIELDS OF THE IRRAWADDY — MOBILE + UI REFRESH

WHAT CHANGED
- Added a bilingual in-game Help screen, opened from the Help icon in the top-right.
- Added a first-step hint to the farming status panel.
- Reworked the market into separate buy and sell action cards.
- Replaced the unused workshop with a daily Village Request Board. Deliver rice to earn coins and extra seeds.
- Added the monk’s timed morning alms round: villagers leave their homes, offer rice, and pay homage before returning indoors.
- Added short random speech bubbles only while the player is close to villagers, plus clearer dialogue and interface fonts.
- Added child-sized character scaling, evening/night shading, and warm road lanterns. Butterflies now stay behind interface layers.
- NPCs use collision-aware pathfinding to walk around props and obstacles when returning home.
- Crops grow automatically after each 24-hour in-game day when watered; they mature after four watered days and can wilt or die if neglected. Dead crops can be cleared but do not produce sellable rice.
- Village requests refresh with a new random rice amount each in-game day. Added original procedural sound effects for farming, trading, dialogue and request rewards.
- Simplified the backpack to rice seeds, harvested rice, and farming tools; removed unused wood, bamboo, herb, and coconut pickup items.
- Added consistent top-right access to Inventory, Profile, Help, and Language, plus matching modal close controls.
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
- Talk to villagers: E when nearby.
- Open the market: E when nearby.
- Open the backpack: click the bag icon in the top-right (no keyboard shortcut).
- Open the Village Request Board: R when nearby.
- Open the farmer profile: click the person icon in the top-right.
- Open the Help screen: click the Help icon in the top-right.
- Inside the market, click the Buy / Sell card or press 1 to buy seeds / 2 to sell rice.
- Inside the request board, click the green delivery button or press 1 to deliver rice.

MOBILE CONTROLS
- Rotate the phone to landscape.
- Use the left virtual joystick to move around the village and farm.
- Tap one of the four tool slots along the bottom to select the hoe, seeds, watering can, or sickle.
- Tap USE on the right to apply the selected farming tool. At a fishing spot, the same button casts the line and reels in a catch when the fish bites.
- When near a villager, the right-side action prompt says CLICK TO TALK. Tap it to start or continue the conversation.
- When near the market, village request board, or home entrance, the right-side prompt says CLICK TO OPEN. Tap it to open the matching screen or enter the house.
- Inside the house, tap the bed, storage chest, cooker, or exit door to select it. The matching CLICK TO... prompt appears on the right; tap that prompt to sleep, open storage, cook, or leave the house.
- Use the close control shown on each open panel to return to the game.

TESTING NOTE
The TypeScript source was syntax-checked after the UI changes. A full production build could not be run in this workspace because the project dependencies were not available here. Run the build command above on your computer before pushing the changes to GitHub or deploying them.
LATEST UPDATE NOTES
- Villagers now walk to their home doorway before going indoors at the end of their schedules.
- In-game text uses Noto Sans for English and Noto Sans Myanmar for Burmese, with system-font fallbacks.
- The canvas uses smooth browser scaling and display-density rendering for clearer text while retaining the pixel-art textures.

LATEST GAMEPLAY UPDATE
- NPC walk-home routes are found on a collision-aware navigation grid and recalculated if an NPC stops moving.
- Ambient remarks last about 0.9 seconds, appear only when the player enters proximity range, and do not repeat until the player leaves and approaches again.
- The village clock advances farming and daily requests automatically every 24 in-game hours; there is no manual DAY skip.
- Crops need four successful daily watering cycles to mature. Two consecutive missed waterings kill a crop; dead crops can be cleared without adding rice to inventory.
- Daily rice request amounts are random and avoid repeating the previous day's amount.
- Original Web Audio sound effects play for hoeing, planting, watering, harvesting, dialogue, purchases, sales and completed requests. The music icon mutes both music and effects.

LATEST UI INTERACTION UPDATE
- Replaced the long Help paragraphs with three compact illustrated cards for movement, village actions and crop care. Removed mobile and obsolete pickup instructions; the tab now shows only a red-cross exit hint.
- Added a top-right backpack icon for opening Inventory; removed the I-key toggle. Help, Profile and Inventory panels now share the same red-cross exit instruction.
- Made the full Market buy/sell cards and the Request Board delivery button explicit mouse/touch targets while preserving their number-key shortcuts.
- Isolated the rename text field from Phaser keyboard controls so normal letters and punctuation can be typed without moving the farmer or triggering game actions.

LATEST INVENTORY CLEANUP
- Removed unused wood, bamboo, herbs and coconut pickup items, their inventory counters, and their unused icon assets. The backpack now displays only rice seeds, harvested rice, and the four farming tools.
- Removed the obsolete PICK control because there are no longer loose resource pickups.

LATEST MOBILE INPUT UPDATE
- Kept the mobile HUD to the movement joystick, the existing USE action, and one contextual prompt instead of separate BAG / BOARD / TALK buttons.
- Enlarged the invisible touch target for the right-side action and contextual prompt without adding extra icons.
- The contextual prompt now identifies whether the nearby action is talking or opening a location.
- Indoor furniture taps select the bed, chest, cooker, or door; the matching right-side prompt performs the action.
- The USE action button routes to fishing while at a fishing spot and to the selected farming tool everywhere else.
- Restored the Inventory, Profile, Language, Help, Audio, and Fullscreen icons across the top-right on mobile, with larger touch targets.
- Enlarged USE and moved it to the right side directly opposite the joystick; removed the MOVE label.
- Header icons, USE, and contextual prompts respond on touch-down, so a second finger can operate a button while the other holds the joystick.
