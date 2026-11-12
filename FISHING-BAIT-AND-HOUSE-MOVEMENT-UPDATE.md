# Fishing Bait and House Movement Update

## Fishing bait

The market now sells three bait types:

- Earthworm Bait — 10 KYAT. Gives a small increase in Catfish and Golden Carp catch chances.
- River Shrimp Bait — 25 KYAT. Gives a stronger, balanced increase in Catfish and Golden Carp chances.
- Golden Cricket Bait — 50 KYAT. Gives the largest increase in Golden Carp chances.

One bait is consumed for each cast when a bait type is selected and available. Bait improves the chance of catching more valuable fish; it does not guarantee a rare catch. Casting without bait remains possible.

### How to use bait

1. Buy bait at the market under Fishing Bait.
2. Open the backpack.
3. Tap a bait item to equip it in the currently selected hotbar slot, or drag it into a hotbar slot and select that slot.
4. Fish at a marked riverbank spot. The cast prompt displays the selected bait and remaining quantity.

## Indoor movement

House movement now uses fixed 120 Hz substeps with eased acceleration and deceleration. This makes movement more consistent across uneven browser frame times, keeps diagonal motion normalized, and uses small collision steps around furniture and room boundaries. Movement timing is reset when entering, leaving, or starting sleep so a room transition cannot cause a movement burst.

## Save compatibility

Bait quantities are optional in saved fishing data. Older saves load with zero of each bait type. The selected hotbar index is stored optionally, so older inventory saves continue to load using the first hotbar slot by default.
