# Fields of the Irrawaddy — Progression & Economy Update

This update gives the player a longer farming loop and permanent goals to work toward while keeping the existing village, inventory, audio, cooking, fishing, and save systems.

## Starting resources and economy

- New farms start with **5 rice seeds** and **15 coins**.
- A seed pack contains 5 seeds and costs **25 coins**.
- Rice sells for **4 coins each** before upgrades.
- The fishing rod costs **120 coins**.
- Fish values remain differentiated: silver barb 3, catfish 8, golden carp 15.
- Golden wheat can be sold for **20 coins each**.
- Cooked meal sale prices are fish-and-rice bowl 18, mohinga 32, and golden carp curry 36 coins.

Existing saves keep the player's current coins, seeds, inventory, crops, and progress. The new prices apply immediately; the reduced starting resources apply to new farms.

## Permanent farm upgrades

Open the village market and select **Farm Upgrades** (market option 7). Upgrades are saved with the farm.

| Upgrade | Cost | Effect |
|---|---:|---|
| Iron hoe I | 220 | Prepare 3 adjacent plots in one use |
| Iron hoe II | 520 | Prepare a 3 × 3 area |
| Watering can I | 260 | Water up to 3 adjacent crops |
| Watering can II | 580 | Water crops in a 3 × 3 area |
| Reinforced sickle | 450 | +1 rice from each healthy harvest |
| Farm expansion | 700 | Unlock 6 more plots (15 → 21) |
| Village rice mill | 1,000 | +2 coins per rice sold |

## Daily village requests

The village request board remains limited to one delivery per day, but the required rice gradually increases:

- Days 1–3: 5–7 rice
- Days 4–7: 7–10 rice
- Days 8–15: 9–13 rice
- Day 16 onward: 10–15 rice

Rewards scale with the request: `3 × rice required + 5` coins, plus at least one seed (two seeds for requests of 14–15 rice). This makes the board a useful reinvestment route without making it a substitute for farming.

## Crop growth

The ordinary crop timer is unchanged: each watered growth stage still requires **24 in-game hours from that plot's watering timestamp**. The existing meal blessing remains the only temporary growth-speed exception and still lasts two in-game days.

## Save compatibility

Save format version is now 13. Existing saves from earlier versions are accepted. Farm upgrades default to level 0 when loading an older save, and already-earned resources and farm state are preserved.
