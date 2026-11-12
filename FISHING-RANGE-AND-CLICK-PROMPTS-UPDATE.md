# Fishing Range and Click-Friendly Prompts

## Changes

- Reduced the fishing interaction radius from 74 to 30 world pixels so fishing can only begin close to the designated riverbank markers, not from the nearby farm plots.
- Made the fishing prompt clickable: click/tap to cast and click/tap again when a bite appears to reel in.
- Kept the existing F and Space keyboard shortcuts for desktop players.
- Changed dialogue continuation text to `CLICK / TAP TO CONTINUE`; the dialogue panel already has a clickable continue area.
- Made villager talk, home entrance, market, and request-board prompts clickable on desktop. Touch devices continue to use the existing contextual action button.
- Replaced key-specific interaction prompt text for fishing, house, market, request board, cooking, village talk, and general interaction hints with click/tap wording.
- Removed numbered keyboard-shortcut prefixes from market menu labels while retaining the existing keyboard shortcuts internally.
- Updated English and Burmese prompt text.

## Validation

- 27 TypeScript files transpiled with zero syntax diagnostics.
- Static checks passed for fishing range, click-to-cast/reel, dialogue continuation, villager talk, home entrance, market, and request-board prompt interactions.
- A complete Vite production build was not available in this environment because `npm ci` timed out and left `vite/client` types unavailable. Run `npm.cmd ci` and `npm.cmd run build` locally before deploying.
