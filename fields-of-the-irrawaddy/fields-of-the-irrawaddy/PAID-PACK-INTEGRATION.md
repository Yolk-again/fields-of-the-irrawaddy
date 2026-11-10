# Paid Pack integration

## What was compatible

All eleven PNGs are transparent pixel-art sheets that fit the Phaser 2D game. Their sizes reveal three native grids rather than one universal tile size:

- 16×16 frames: Character, Fens, Fire, Plants, Sheep, Sheep with shadow, Tile Map
- 48×48 frames: Trees and Water
- 96×112 frames: House
- 36×48 frames: Toilet

## Where they appear

- Character: animated background traveller near the market path
- Sheep and Sheep with shadow: wandering sheep in a new fenced paddock
- Fens: the paddock fence
- Fire: animated cooking fire by the field shed
- House: small field shed with chimney-smoke animation
- Toilet: rural outhouse beside the harvest yard
- Trees: fruit-tree additions to the village orchard
- Water: small pond with a looping water shimmer
- Plants: small garden accents
- Tile Map: stones/log details near the harvest yard plus a small dirt patch inside the sheep enclosure; the full atlas remains loaded for tile-map expansion

The existing Burmese rice plots, stilt houses, main characters, monastery, fishing, cooking, inventory, market, save system and bilingual UI are retained.

## Run

```powershell
npm install
npm run build
npm run dev
```

The supplied archive did not include a licence/terms file. Keep the original purchase documentation and check the licence before distributing raw source assets or a public game build.
