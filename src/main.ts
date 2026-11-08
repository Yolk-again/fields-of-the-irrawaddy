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

  // Crisp pixel art: nearest-neighbour sampling, no smoothing, whole-pixel positions.
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  scene: [FarmScene]
};

// Make sure the pixel font is ready before Phaser renders its first Text objects.
async function boot(): Promise<void> {
  try {
    const wait = new Promise<void>(resolve => window.setTimeout(resolve, 2500));
    await Promise.race([
      Promise.all([
        document.fonts.load('12px "Pixelify Sans"'),
        document.fonts.load('12px "Noto Sans Myanmar"')
      ]),
      wait
    ]);
  } catch {
    // fall back to the monospace stack silently
  }
  new Phaser.Game(gameConfig);
}

void boot();
