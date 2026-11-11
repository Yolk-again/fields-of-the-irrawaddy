REQUEST BOARD BUILD FIX

Fixed TypeScript TS6133 in src/game/systems/VillageBoardSystem.ts by removing the unused `index` callback parameter from REQUEST_ROW_CENTERS.map. The row positions and request-board behavior are unchanged.

Run `npm.cmd run build` to verify locally.
