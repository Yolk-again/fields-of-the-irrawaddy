# Wheat Produce Unification & Market UI Polish

## What changed

- Replaced the old standalone golden-wheat market entry with one **Wheat** produce entry.
- Removed the separate rice-selling action from the main market menu. Players now open **Sell Farm Produce** and select Wheat, Tomatoes, or Green Beans there.
- Wheat stock is shown as one total across regular harvest and the golden-harvest bonus.
- Selling wheat uses regular harvest first, then golden harvest. Regular wheat keeps its existing base price and rice-mill bonus; golden wheat keeps its existing premium value.
- Replaced the old tiny grain placeholder with `public/assets/agriculture/wheat_basket.png`, a 36×30 transparent pixel-art basket icon matching the tomato and green-bean produce assets.
- Reused the wheat artwork and label consistently in the market, backpack, home chest, and village request board.
- Normalized market action icon display sizes and chest row icon sizing, and aligned the main-market keyboard numbering with the visible action rows.
- Updated English and Burmese text for wheat naming, sale details, pricing, and the market controls.

## Save compatibility

- Farming save data still stores regular harvest and golden-wheat bonus quantities separately, so existing saves retain their values and price behavior.
- Older backpack slots named `goldenWheat` are migrated to the unified Wheat backpack slot.
- The home chest displays one Wheat row while retaining a regular/golden breakdown internally. Older chest saves with separate `rice` and `goldenWheat` values are read and combined without losing the distinction.
- Village requests labelled as Wheat can be fulfilled using regular or golden wheat stock.

## Test notes

- Static checks confirmed the single market Wheat sale route, combined stock count, regular-first/golden-second sale calculation, inventory migration, chest migration, request-board totals, bilingual labels, and wheat asset registration.
- TypeScript transpilation passed for all source files with zero syntax diagnostics.
- A full Vite production build could not be completed in this environment because the dependency installation timed out and `vite/client` types were unavailable. Run `npm.cmd ci` and `npm.cmd run build` locally before deploying.
