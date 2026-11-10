# Audio defaults and save-slot cleanup

- Every new world (including overwriting a slot) initializes background music and sound effects to 30%.
- Audio slider changes are stored per save slot, so changing one world does not change the defaults or settings of another world.
- Continuing an older world migrates its previously stored global audio settings into that slot the first time it is loaded.
- Every active audio buffer source is tracked, including one-shot SFX and tracks fading during crossfades.
- Returning to the title screen immediately mutes the master bus, stops and disconnects all sources, clears pending SFX, and closes the slot's AudioContext before the next world is launched.
