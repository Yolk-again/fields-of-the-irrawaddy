# Graphics Quality Settings

Players can open the existing Game Settings panel from the note icon in the game HUD and select High, Balanced, or Low. The preference is stored in browser local storage and is shared across save slots on the same site origin.

- **High** keeps the smooth pixel-art renderer, full butterfly movement, full lantern glow, and the most detailed chicken escape-path search.
- **Balanced** keeps the smooth pixel-art renderer while reducing butterfly update frequency, lantern-glow intensity, and some repeated HUD refresh work.
- **Low** hides decorative butterflies and animal shadows, reduces lantern glow and chicken escape-path search work, and switches to crisp nearest-neighbor pixel rendering at the next full page load.

The game loop is configured for a 60 FPS target with no artificial frame cap. Actual frame rate depends on the player's browser, display, and device. The quality setting cannot guarantee a fixed frame rate; it reduces optional work on weaker devices while keeping player movement and core NPC/animal motion updates responsive.

The setting is saved immediately. The renderer mode is applied when the game page is fully reloaded. Players should save their current game before reloading.
