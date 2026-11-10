# Profile and Opening Audio Gate Update

- New-game character/farm profile setup is silent for background music, even after the browser unlocks the Web Audio context.
- The opening cinematic switches the audio system to its dedicated cutscene music mode and plays the intro theme only.
- Once the intro finishes or is skipped, the system switches to world mode and starts the current time-of-day soundtrack.
- Existing saves still use world mode immediately and do not need to replay the intro.
- The music settings slider remains available; volume changes during profile setup are retained and applied when the cutscene/world music is allowed to play.
- Sound effects continue to use the separate SFX bus.

Validation performed: TypeScript transpilation/syntax checks and source-level audio lifecycle assertions. Full Vite build was not run because dependencies are not installed in this workspace.
