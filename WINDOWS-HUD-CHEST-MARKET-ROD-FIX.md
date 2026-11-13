# Windows HUD, chest header, and fishing rod name fix

- Moved the chest title, subtitle, column labels, and item rows down to create clear vertical separation.
- Tightened row spacing and aligned pointer hit-testing with the new row positions; transfer controls are slightly shorter to avoid row collisions.
- Replaced the missing `market.buyRodShort` translation key with the existing `market.rodShort` key for English and Burmese.
- Restored the full clickable top-right HUD icon row on Windows: inventory, profile, language, help, settings, and fullscreen, with Menu beneath it.
- Removed the I/P/L/H/M shortcuts that opened those HUD panels. Movement, farming tool, fishing, and market interaction keys remain unchanged.
- Updated the help subtitle so it points Windows players to the top-right buttons.
- Bumped the service-worker shell cache to v6 to avoid reusing the prior cached app bundle; the service worker does not force a page reload.
