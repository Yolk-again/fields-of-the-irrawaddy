# Seeds, Market Produce, and Mobile Fullscreen Update

## Planting tomato and green-bean seeds

- Open the backpack.
- Tap a tomato or green-bean seed packet in the backpack to equip it into the currently selected hotbar slot.
- Close the backpack, stand beside a prepared empty soil tile, and use the seed tool.
- Seed packet counts are reduced when planted. Existing rice planting remains unchanged.

## Selling crops

- Open the market and choose **SELL FARM PRODUCE**.
- Choose golden wheat, tomatoes, or green beans.
- Select the quantity and confirm.
- Tomato sale price: 8 kyat each. Green-bean sale price: 7 kyat each. Golden wheat remains 20 kyat each.

## Mobile fullscreen

- The fullscreen button first requests native browser fullscreen when available.
- If the browser does not support or rejects native fullscreen, a CSS viewport fullscreen mode is used instead.
- Tap the fullscreen button again to exit the fallback mode, or press Escape where a keyboard is available.

## Files changed

- `src/game/systems/InventorySystem.ts`
- `src/game/systems/MarketSystem.ts`
- `src/game/systems/LanguageSystem.ts`
- `src/game/scenes/FarmScene.ts`
- `src/main.ts`
- `src/style.css`

The existing save schema and crop save data are unchanged.
