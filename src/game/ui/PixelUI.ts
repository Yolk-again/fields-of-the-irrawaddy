import Phaser from "phaser";

/** Pixel-art font stack. Pixelify Sans is loaded from Google Fonts in index.html. */
export const PIXEL_FONT = '"Pixelify Sans", "Press Start 2P", monospace';

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
