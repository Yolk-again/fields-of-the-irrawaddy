import Phaser from "phaser";
import { isMobilePlatform } from "../utils/DeviceMode";

export const PALETTE = {
  outline: 0x2a1a14,
  woodDark: 0x5e3b22,
  wood: 0x8a5a34,
  woodLight: 0xb88450,
  gold: 0xc9993f,
  goldBright: 0xe6b84a,
  panel: 0x3a281c,
  panelGreen: 0x2d3829,
  cream: 0xfff1cf
};

/** Shared readable type scale for canvas-based game interfaces. */
export function uiFontSize(size: number, mobileScale = 1.1): string {
  const scaled = isMobilePlatform() ? Math.max(size + 1, size * mobileScale) : size;
  return `${Math.round(scaled * 10) / 10}px`;
}

/** Consistent word wrapping for compact descriptions and labels. */
export function uiDescriptionStyle(languageFont: string, width: number, size = 10): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: languageFont,
    fontSize: uiFontSize(size),
    color: "#eadfca",
    lineSpacing: 1,
    wordWrap: { width, useAdvancedWrap: true }
  };
}

export interface PixelPanelOptions {
  fill?: number;
  alpha?: number;
  shadow?: boolean;
}

/** Shared body color and frame for every modal tab. */
export function modalPanel(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  w: number,
  h: number
): Phaser.GameObjects.Graphics {
  return pixelPanel(scene, cx, cy, w, h, {
    fill: PALETTE.panelGreen,
    alpha: 1
  });
}

/** Place the close control just inside the actual top-right panel corner. */
export function modalClosePosition(
  cx: number,
  cy: number,
  w: number,
  h: number
): { x: number; y: number } {
  const inset = 17;
  return {
    x: Math.round(cx + w / 2 - inset),
    y: Math.round(cy - h / 2 + inset)
  };
}

/**
 * Draws a Stardew-style wooden frame with a gold inlay and corner rivets.
 * Coordinates are absolute (use it where a Rectangle background used to be).
 */
export function pixelPanel(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  w: number,
  h: number,
  options: PixelPanelOptions = {}
): Phaser.GameObjects.Graphics {
  const fill = options.fill ?? PALETTE.panel;
  const alpha = options.alpha ?? 0.98;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - h / 2);
  const g = scene.add.graphics();
  g.setScrollFactor(0);

  if (options.shadow !== false) {
    g.fillStyle(0x000000, 0.28).fillRect(x + 3, y + 3, w, h);
  }

  // outline with notched corners
  g.fillStyle(PALETTE.outline, 1);
  g.fillRect(x + 1, y, w - 2, h);
  g.fillRect(x, y + 1, w, h - 2);

  // wood frame
  g.fillStyle(PALETTE.wood, 1);
  g.fillRect(x + 2, y + 1, w - 4, h - 2);
  g.fillRect(x + 1, y + 2, w - 2, h - 4);

  // bevel
  g.fillStyle(PALETTE.woodLight, 1);
  g.fillRect(x + 2, y + 1, w - 4, 1);
  g.fillRect(x + 1, y + 2, 1, h - 4);
  g.fillStyle(PALETTE.woodDark, 1);
  g.fillRect(x + 2, y + h - 2, w - 4, 1);
  g.fillRect(x + w - 2, y + 2, 1, h - 4);

  // gold inlay + body
  g.fillStyle(PALETTE.gold, 1).fillRect(x + 3, y + 3, w - 6, h - 6);
  g.fillStyle(fill, alpha).fillRect(x + 4, y + 4, w - 8, h - 8);
  g.fillStyle(0x000000, 0.16).fillRect(x + 4, y + 4, w - 8, 2);

  // Fine inset bevels keep every modal crisp and consistent at native pixel scale.
  g.fillStyle(0xffe9b8, 0.12).fillRect(x + 6, y + 6, w - 12, 1);
  g.fillStyle(0xffe9b8, 0.07).fillRect(x + 5, y + 7, 1, h - 14);
  g.fillStyle(0x1c281c, 0.18).fillRect(x + 6, y + h - 7, w - 12, 1);
  g.fillStyle(0x1c281c, 0.12).fillRect(x + w - 7, y + 7, 1, h - 14);

  // rivets
  g.fillStyle(PALETTE.goldBright, 1);
  g.fillRect(x + 2, y + 2, 2, 2);
  g.fillRect(x + w - 4, y + 2, 2, 2);
  g.fillRect(x + 2, y + h - 4, 2, 2);
  g.fillRect(x + w - 4, y + h - 4, 2, 2);

  return g;
}

/** A compact red close control shared by modal panels.
 * The click is handled centrally by ModalUIManager using the same position,
 * rather than relying on a nested child GameObject's pointer event.
 */
export function createRedCloseButton(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const button = scene.add.container(x, y).setScrollFactor(0);
  button.setInteractive(
    new Phaser.Geom.Rectangle(-20, -20, 40, 40),
    Phaser.Geom.Rectangle.Contains
  );
  const shadow = scene.add.rectangle(1, 2, 26, 26, 0x140d09, 0.72);
  const background = scene.add.rectangle(0, 0, 24, 24, 0x9b3d32, 1);
  background.setStrokeStyle(2, PALETTE.goldBright);
  const highlight = scene.add.rectangle(0, -8, 16, 2, 0xf08b72, 0.85);
  button.on("pointerover", () => background.setFillStyle(0xc45142, 1));
  button.on("pointerout", () => background.setFillStyle(0x9b3d32, 1));

  const cross = scene.add.text(0, -1, "×", {
    fontFamily: '"Noto Sans", "Noto Sans Myanmar", "Myanmar Text", sans-serif',
    fontSize: uiFontSize(20),
    color: "#fff7e8",
    fontStyle: "bold"
  }).setOrigin(0.5);

  button.add([shadow, background, highlight, cross]);
  return button;
}
