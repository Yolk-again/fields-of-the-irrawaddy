import Phaser from "phaser";
import "./style.css";
import "./game/assets.css";
import { FarmScene } from "./game/scenes/FarmScene";

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  fullscreenTarget: "game-container",

  width: 640,
  height: 360,

  backgroundColor: "#68ad45",

  input: {
    activePointers: 3
  },

  // Smooth-pixel-art mode keeps the game's retro art style while allowing
  // anti-aliased text and softer browser scaling for English and Burmese UI.
  render: {
    smoothPixelArt: true,
    roundPixels: true
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  scene: [FarmScene]
};

// Load the Myanmar text font before Phaser renders its first Text objects.
async function boot(): Promise<void> {
  try {
    const wait = new Promise<void>(resolve => window.setTimeout(resolve, 2500));
    await Promise.race([
      Promise.all([
        document.fonts.load('12px "Noto Sans"'),
        document.fonts.load('12px "Noto Sans Myanmar"')
      ]),
      wait
    ]);
  } catch {
    // fall back to the system sans-serif stack silently
  }
  new Phaser.Game(gameConfig);
}

void boot();
