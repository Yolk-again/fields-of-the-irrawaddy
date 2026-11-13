# Comprehensive UI, Inventory, Market, Audio, and Install Update

## Interface consistency and readability
- Added a shared Phaser UI font scale and description-text style helper.
- Applied the shared sizing helper across gameplay scenes and systems so equivalent components use consistent text sizing on Windows and mobile.
- Kept input instructions device-specific: desktop keeps keyboard shortcuts; mobile keeps tap/drag wording.
- Refined responsive text wrapping, title/save dialogs, help cards, modal panels, buttons, and inventory/chest rows to reduce clipping and overlapping.
- Shortened mobile help descriptions while retaining the same purpose and category structure as desktop help.
- Uses a clear Noto Sans / Noto Sans Myanmar font stack for readable Latin and Burmese text.

## Inventory
- Consumable items with a count below one are hidden from backpack and hotbar slots.
- Empty consumable slots are cleared; items reappear when the player obtains them again.
- Permanent tools remain visible without a consumable count.
- Fish remain separate item types.

## Market and inspect-first interactions
- Market categories show concise item cards, then open an item detail panel on selection.
- Detail panels show item description, price, owned amount, affordability/availability, quantity selection where appropriate, and the matching Buy or Sell action.
- Silver Barb, River Catfish, and Golden Carp have separate sell panels and prices.
- Permanent upgrades and the one-time fishing rod use a single purchase action rather than a quantity selector.
- Upgrade details show their effect and next cost before purchase.
- Empty or unaffordable actions remain disabled without blocking Back/Cancel.

## Cooking
- The hearth main page now lists recipes in a compact inspect-first layout.
- Selecting a recipe opens its description, ingredient requirements, amounts owned, sale value, and Cook action.
- Recipe selling values match the market meal prices.
- Keyboard and touch actions are supported; desktop instructions remain keyboard-specific and mobile instructions are tap-specific.

## Audio
- Reduced the overall output of sound effects and limited their playback duration.
- Each action retains its own recognizable effect; short fades prevent abrupt endings.
- Player volume preferences remain supported.

## Installable web app
- Added/retained the title-screen Install Game button with browser installation prompt handling.
- Includes instructions for browsers without the native install prompt and iOS Add to Home Screen.
- Added/retained Web App Manifest, 192px and 512px app icons, and a service worker.
- Vercel response headers keep the app shell and service worker refreshable.

## Validation notes
- TypeScript transpile/syntax check: 28 source files, zero syntax diagnostics.
- Static duplicate object-key scan: no duplicates found.
- PWA manifest JSON parses; both referenced app icons exist at their declared dimensions.
- Fixed-pixel-font audit: no remaining `fontSize: "Npx"` styles in `src/game` TypeScript files; game interfaces use the shared sizing helper.
- Full `npm run build` and live browser/mobile play tests have not been completed in the packaging environment because the project dependencies were unavailable/incomplete. Run `npm.cmd ci` and `npm.cmd run build` locally before pushing.
