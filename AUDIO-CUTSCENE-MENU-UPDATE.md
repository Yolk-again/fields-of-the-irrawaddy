# Menu, roaming NPCs, opening sequence, and sound update

## HUD Menu
- The Menu control is now a 42px pixel-art icon tile, styled like the other HUD icons.
- On touch layouts it is a separate row below the six-icon rail with consistent spacing.
- On desktop it sits below the Phaser-drawn top-right icon row; the same offset is applied in fullscreen.

## NPC movement
- Chickens now share a village-wide walkable area and use obstacle-aware grid paths around buildings, fences, props, and the canal boundary.
- The chicken path grid uses a coarser 12px cell and a linear nearest-node scan to keep full-village path requests affordable.
- The child can chase and wander across the village floor; stale chase routes are discarded and replanned after a stuck interval.

## Opening story
- Reworked as an original top-down pixel-RPG dialogue overlay while leaving the Phaser village visible underneath.
- Adds speaker portrait/name, chapter marker, typewriter dialogue, step progress, continue/skip actions, and keyboard controls.
- Camera pans between the player's home, monastery, and market. The first portrait follows the player's selected gender and outfit.

## Original sound effects
The following short procedural foley sounds are original assets made for Fields of the Irrawaddy. They are not copied from other games or recordings.
- `water.ogg`: flowing pour texture, layered splashes, and droplets.
- `hoe.ogg`: muted earth impact, dirt crumble, and grassy scrape.
- `harvest.ogg`: fast airy cutting swoosh, sharp cut tick, and leaf rustle.
- `buy.ogg` / `sell.ogg`: original register clack, bright till chime, and coin-like tinkles.

Existing sound-effect event names and the audio volume controls are preserved.

## Opening cutscene audio and player volume preferences
- Added `public/audio/music/cutscene.ogg`, an original 25-second pastoral intro theme with plucked-string-like notes, a soft flute-like melody, and a warm sustained bed. It loops only during the opening story and fades back into the current day-phase theme when the story ends.
- The dialogue typewriter plays a restrained, short `talk.ogg` blip every few visible characters. It uses the existing Sound Effects bus, so players can lower or mute dialogue blips independently of the cutscene music.
- New installations start with Background Music at 30% and Sound Effects at 30%.
- Slider adjustments remain fully available and are saved to the existing localStorage preferences. A saved player value always takes priority over the 30% first-run defaults; this update does not reset existing choices.
