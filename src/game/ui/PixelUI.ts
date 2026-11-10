import Phaser from "phaser";

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
  g.fillStyle(0x000000, 0.22).fillRect(x + 4, y + 4, w - 8, 2);

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
  const background = scene.add.rectangle(0, 0, 24, 24, 0x9b3d32, 1);
  background.setStrokeStyle(2, PALETTE.goldBright);
  button.on("pointerover", () => background.setFillStyle(0xc45142, 1));
  button.on("pointerout", () => background.setFillStyle(0x9b3d32, 1));

  const cross = scene.add.text(0, -1, "×", {
    fontFamily: "Arial, sans-serif",
    fontSize: "20px",
    color: "#fff7e8",
    fontStyle: "bold"
  }).setOrigin(0.5);

  button.add([background, cross]);
  return button;
}
