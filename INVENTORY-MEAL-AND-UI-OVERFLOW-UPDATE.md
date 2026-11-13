# Inventory, Meal Sales, and UI Overflow Update

## UI readability

- Backpack item labels now use compact English and Burmese names for narrow slots.
- Backpack headings, seed summary, instructions, and exit hint are constrained to predictable line counts.
- Profile names and labels use smaller wrapping areas and explicit line limits to prevent overlap with rename, outfit, and save controls.
- Chest item labels may wrap to two lines inside their fixed-height rows; counts and action controls remain on a single line.
- Help cards use compact desktop and mobile instructions with advanced wrapping and bounded line counts.
- Market titles, action rows, status badges, sale detail descriptions, upgrade details, and buttons have explicit wrapping and line limits.

## Meal sales

- The market's Cooked Meals section now lists Fish & Rice Bowl, Mohinga, and Golden Carp Curry separately.
- Each dish displays its own quantity in the bag and its own sell price.
- Selecting a dish opens its quantity selector and confirms the sale for that dish only.
- Prices match the existing cooking recipe values: 18, 32, and 36 KYAT respectively.

## Meal effect and golden rice

- The existing meal effect is preserved: crop growth cycles remain 18 in-game hours while the two-day meal boost is active.
- Golden rice is now a rare 3% roll when planting rice during the active meal boost.
- Eating a meal no longer turns rice that was planted earlier into golden rice; new planting receives the rare roll instead.
- No save-data format change was introduced.
