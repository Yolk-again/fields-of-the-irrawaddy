# Market, Chest and Mobile Performance Update

- The produce market shows the normal wheat price (including the rice-mill bonus) and golden wheat price instead of the generic OPEN badge, in English and Burmese.
- Removed the redundant clickable Close Market row from the market landing page. The keyboard close shortcut and red close button remain available. Submenu Back rows are unchanged.
- The fishing rod status now reports how many more Kyat are needed when the player cannot afford it, in English and Burmese.
- Tightened the market item-label and price-badge widths so long text wraps inside its row instead of overflowing into adjacent controls.
- Kept the established shared readable text styling from PixelUI unchanged.
- Removed the chest UI's full refresh from the per-frame game update. It now refreshes on actual chest interactions, opening, language changes, and save loading.
- Optimized chest hover highlighting so styles update only when the pointer enters a different control, reducing work on touch devices.
- Incremented the service-worker cache version to v10 and updated the deployment version string.
