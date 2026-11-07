
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

  backgroundColor: "#78a85f",

  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: false
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  scene: [FarmScene]
};

new Phaser.Game(gameConfig);
