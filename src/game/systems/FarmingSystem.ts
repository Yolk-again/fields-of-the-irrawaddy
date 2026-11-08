
import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { pixelPanel } from "../ui/PixelUI";

type FarmingTool = "hoe" | "seeds" | "water" | "harvest";

interface FarmTile {
  x: number;
  y: number;
  soil: boolean;
  planted: boolean;
  watered: boolean;
  growth: number;
  base: Phaser.GameObjects.Image;
  crop: Phaser.GameObjects.Image;
}

interface FarmSaveData {
  day: number;
  seeds: number;
  rice: number;
  tiles: {
    soil: boolean;
    planted: boolean;
    watered: boolean;
    growth: number;
  }[];
}

export class FarmingSystem {
  private scene: Phaser.Scene;
  private ui: ModalUIManager;
  private language: LanguageSystem;

  private tiles: FarmTile[] = [];
  private tool: FarmingTool = "hoe";
  private seeds = 10;
  private rice = 0;
  private day = 1;

  private actionKey!: Phaser.Input.Keyboard.Key;
  private nextDayKey!: Phaser.Input.Keyboard.Key;
  private toolKeys!: {
    one: Phaser.Input.Keyboard.Key;
    two: Phaser.Input.Keyboard.Key;
    three: Phaser.Input.Keyboard.Key;
    four: Phaser.Input.Keyboard.Key;
  };

  private inventoryText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private highlight!: Phaser.GameObjects.Graphics;
  private selectedTile: FarmTile | null = null;
  private showingInitialHint = true;

  private toolBackgrounds: Phaser.GameObjects.Image[] = [];
  private toolTip!: Phaser.GameObjects.Text;
  private toolLabels: Phaser.GameObjects.Text[] = [];
  private toolIcons: Phaser.GameObjects.Image[] = [];

  private toolDefinitions = [
    { key: "1", tool: "hoe" as FarmingTool, name: "farm.hoe", texture: "hoe_asset" },
    { key: "2", tool: "seeds" as FarmingTool, name: "farm.seedTool", texture: "rice_seed_bag_asset" },
    { key: "3", tool: "water" as FarmingTool, name: "farm.water", texture: "watering_can_asset" },
    { key: "4", tool: "harvest" as FarmingTool, name: "farm.harvest", texture: "sickle_asset" }
  ];

  constructor(scene: Phaser.Scene, ui: ModalUIManager, language: LanguageSystem) {
    this.scene = scene;
    this.ui = ui;
    this.language = language;

    this.createPlot();
    this.createControls();
    this.createInterface();
    this.language.onChange(() => this.updateInterface());
  }

  private createPlot(): void {
    const tileSize = 32;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const x = 260 + col * tileSize;
        const y = 356 + row * tileSize;
        const base = this.scene.add.image(x, y, "tile_plot")
          .setOrigin(0, 0).setScale(2).setDepth(15);
        const crop = this.scene.add.image(x + 16, y + 30, "crop_0")
          .setOrigin(0.5, 1).setScale(2).setDepth(y + 31).setVisible(false);

        const tile: FarmTile = {
          x,
          y,
          soil: false,
          planted: false,
          watered: false,
          growth: 0,
          base,
          crop
        };

        this.tiles.push(tile);
        this.drawTile(tile);
      }
    }

    this.highlight = this.scene.add.graphics().setDepth(25);
  }

  private drawTile(tile: FarmTile): void {
    if (!tile.soil) {
      tile.base.setTexture("tile_plot");
    } else {
      tile.base.setTexture(tile.watered ? "tile_wet" : "tile_tilled");
    }

    if (tile.soil && tile.planted) {
      tile.crop.setTexture(`crop_${Phaser.Math.Clamp(tile.growth, 0, 3)}`).setVisible(true);
    } else {
      tile.crop.setVisible(false);
    }
  }

  private playFx(tile: FarmTile, key: "fx_dust" | "fx_splash" | "fx_sparkle"): void {
    const fx = this.scene.add.sprite(tile.x + 16, tile.y + 20, key, 0)
      .setScale(2).setDepth(9000);
    fx.anims.play(`${key}-play`);
    fx.once("animationcomplete", () => fx.destroy());
  }

  private floatText(tile: FarmTile, text: string): void {
    const label = this.scene.add.text(tile.x + 16, tile.y, text, {
      fontFamily: this.language.getFontFamily(),
      fontSize: "12px",
      color: "#ffe070",
      stroke: "#2a1a14",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(9001);
    this.scene.tweens.add({
      targets: label,
      y: tile.y - 22,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy()
    });
  }

  private createControls(): void {
    const keyboard = this.scene.input.keyboard!;
    this.actionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.nextDayKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    this.toolKeys = {
      one: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      two: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      three: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      four: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR)
    };
  }

  private createInterface(): void {
    const topBackground = pixelPanel(this.scene, 437.5, 40.5, 275, 57).setDepth(100);

    this.dayText = this.scene.add.text(312, 17, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#f0d69e"
    }).setScrollFactor(0).setDepth(101);

    this.inventoryText = this.scene.add.text(312, 34, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#eee0c0"
    }).setScrollFactor(0).setDepth(101);

    this.statusText = this.scene.add.text(312, 52, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "8px",
      color: "#d6e6c2"
    }).setScrollFactor(0).setDepth(101);

    // Stardew-style hotbar: four 40px slots with 2x icons
    const centers = [244, 290, 336, 382];
    this.toolDefinitions.forEach((definition, index) => {
      const slot = this.scene.add.image(centers[index], 336, "ui_slot")
        .setScale(2).setScrollFactor(0).setDepth(101)
        .setInteractive({ useHandCursor: true });
      slot.on("pointerdown", () => this.selectTool(definition.tool));

      const icon = this.scene.add.image(centers[index], 336, definition.texture)
        .setScale(2).setScrollFactor(0).setDepth(102);

      const label = this.scene.add.text(centers[index] - 16, 319, definition.key, {
        fontFamily: this.language.getFontFamily(),
        fontSize: "8px",
        color: "#fff1cf",
        stroke: "#2a1a14",
        strokeThickness: 2
      }).setScrollFactor(0).setDepth(103);

      this.toolBackgrounds.push(slot);
      this.toolIcons.push(icon);
      this.toolLabels.push(label);
    });

    this.toolTip = this.scene.add.text(313, 307, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#fff1cf",
      backgroundColor: "#2a1a14",
      padding: { x: 5, y: 2 }
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(103);

    this.ui.registerHud(
      topBackground,
      this.dayText,
      this.inventoryText,
      this.statusText,
      this.toolTip,
      ...this.toolBackgrounds,
      ...this.toolIcons,
      ...this.toolLabels
    );

    this.updateInterface();
  }

  private updateInterface(): void {
    this.dayText.setText(this.language.t("farm.day", { day: this.day }));
    this.inventoryText.setText(
      this.language.t("farm.seeds", { seeds: this.seeds, rice: this.rice })
    );
    if (this.showingInitialHint) {
      this.statusText.setText(this.language.t("farm.findPlot"));
    }

    this.toolDefinitions.forEach((definition, index) => {
      const selected = definition.tool === this.tool;
      this.toolBackgrounds[index].setTexture(selected ? "ui_slot_selected" : "ui_slot");
      this.toolLabels[index].setFontFamily(this.language.getFontFamily());
      this.toolIcons[index].setY(selected ? 334 : 336);
      if (selected) this.toolTip.setText(this.language.t(definition.name));
    });

    const font = this.language.getFontFamily();
    this.toolTip.setFontFamily(font);
    this.dayText.setFontFamily(font);
    this.inventoryText.setFontFamily(font);
    this.statusText.setFontFamily(font);
  }


  private setStatus(key: string, values: Record<string, string | number> = {}): void {
    this.showingInitialHint = false;
    this.statusText.setText(this.language.t(key, values));
  }

  private findNearestTile(playerX: number, playerY: number): FarmTile | null {
    let nearest: FarmTile | null = null;
    let shortestDistance = 50;

    for (const tile of this.tiles) {
      const distance = Phaser.Math.Distance.Between(
        playerX,
        playerY,
        tile.x + 16,
        tile.y + 16
      );
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearest = tile;
      }
    }

    return nearest;
  }

  private selectTool(tool: FarmingTool): void {
    this.tool = tool;
    const names: Record<FarmingTool, string> = {
      hoe: "farm.hoe",
      seeds: "farm.seedTool",
      water: "farm.water",
      harvest: "farm.harvest"
    };

    this.updateInterface();
    this.setStatus("farm.selected", { tool: this.language.t(names[tool]) });
  }

  mobileSelectTool(index: number): void {
    const definition = this.toolDefinitions[index];
    if (definition) this.selectTool(definition.tool);
  }

  mobileUseTool(): void {
    this.useTool();
  }

  mobileAdvanceDay(): void {
    this.advanceDay();
  }

  private useTool(): void {
    if (!this.selectedTile) {
      this.setStatus("farm.noTile");
      return;
    }

    const tile = this.selectedTile;

    if (this.tool === "hoe") {
      if (tile.soil) {
        this.setStatus("farm.alreadyPrepared");
        return;
      }
      tile.soil = true;
      this.playFx(tile, "fx_dust");
      this.setStatus("farm.prepared");
    } else if (this.tool === "seeds") {
      if (!tile.soil) {
        this.setStatus("farm.needSoil");
        return;
      }
      if (tile.planted) {
        this.setStatus("farm.alreadyPlanted");
        return;
      }
      if (this.seeds <= 0) {
        this.setStatus("farm.noSeeds");
        return;
      }
      this.playFx(tile, "fx_dust");
      tile.planted = true;
      tile.growth = 0;
      tile.watered = false;
      this.seeds--;
      this.setStatus("farm.planted");
    } else if (this.tool === "water") {
      if (!tile.planted) {
        this.setStatus("farm.noCrop");
        return;
      }
      if (tile.growth >= 3) {
        this.setStatus("farm.ready");
        return;
      }
      if (tile.watered) {
        this.setStatus("farm.watered");
        return;
      }
      tile.watered = true;
      this.playFx(tile, "fx_splash");
      this.setStatus("farm.waterSuccess");
    } else if (this.tool === "harvest") {
      if (!tile.planted || tile.growth < 3) {
        this.setStatus("farm.notReady");
        return;
      }
      tile.planted = false;
      tile.watered = false;
      tile.growth = 0;
      this.rice += 3;
      this.playFx(tile, "fx_sparkle");
      this.floatText(tile, "+3");
      this.setStatus("farm.harvested");
    }

    this.drawTile(tile);
    this.updateInterface();
  }

  private advanceDay(): void {
    this.day++;
    let grown = 0;

    for (const tile of this.tiles) {
      if (!tile.planted) continue;
      if (tile.watered && tile.growth < 3) {
        tile.growth++;
        grown++;
      }
      tile.watered = false;
      this.drawTile(tile);
    }

    this.updateInterface();
    this.setStatus("farm.newDay", { grown });
  }

  getDay(): number {
    return this.day;
  }

  getSeeds(): number {
    return this.seeds;
  }

  getRice(): number {
    return this.rice;
  }

  getSelectedTool(): string {
    return this.tool;
  }

  addSeeds(amount: number): void {
    this.seeds += Math.max(0, Math.floor(amount));
    this.updateInterface();
  }

  removeRice(amount: number): boolean {
    if (this.rice < amount) return false;
    this.rice -= amount;
    this.updateInterface();
    return true;
  }

  getSaveData(): FarmSaveData {
    return {
      day: this.day,
      seeds: this.seeds,
      rice: this.rice,
      tiles: this.tiles.map(tile => ({
        soil: tile.soil,
        planted: tile.planted,
        watered: tile.watered,
        growth: tile.growth
      }))
    };
  }

  loadSaveData(data: FarmSaveData): void {
    this.day = Math.max(1, Math.floor(Number(data.day) || 1));
    this.seeds = Math.max(0, Math.floor(Number(data.seeds) || 0));
    this.rice = Math.max(0, Math.floor(Number(data.rice) || 0));

    this.tiles.forEach((tile, index) => {
      const saved = data.tiles?.[index];
      if (!saved) return;
      tile.soil = saved.soil === true;
      tile.planted = tile.soil && saved.planted === true;
      tile.watered = tile.planted && saved.watered === true;
      tile.growth = tile.planted
        ? Phaser.Math.Clamp(Math.floor(Number(saved.growth) || 0), 0, 3)
        : 0;
      this.drawTile(tile);
    });

    this.updateInterface();
  }

  update(playerX: number, playerY: number): void {
    this.selectedTile = this.findNearestTile(playerX, playerY);
    this.highlight.clear();

    if (this.selectedTile) {
      const t = this.selectedTile;
      const pulse = 0.65 + 0.35 * Math.sin(this.scene.time.now / 160);
      const L = 8;
      const g = this.highlight;
      g.fillStyle(0x2a1a14, 1);
      for (const [cx, cy, sx, sy] of [[t.x, t.y, 1, 1], [t.x + 32, t.y, -1, 1], [t.x, t.y + 32, 1, -1], [t.x + 32, t.y + 32, -1, -1]] as number[][]) {
        g.fillRect(sx > 0 ? cx - 1 : cx - L + 1, sy > 0 ? cy - 1 : cy - 1, L + 1, 4);
        g.fillRect(sx > 0 ? cx - 1 : cx - 2, sy > 0 ? cy - 1 : cy - L + 1, 4, L + 1);
      }
      g.fillStyle(0xfff2b0, pulse);
      for (const [cx, cy, sx, sy] of [[t.x, t.y, 1, 1], [t.x + 32, t.y, -1, 1], [t.x, t.y + 32, 1, -1], [t.x + 32, t.y + 32, -1, -1]] as number[][]) {
        g.fillRect(sx > 0 ? cx : cx - L, sy > 0 ? cy : cy - 2, L, 2);
        g.fillRect(sx > 0 ? cx : cx - 2, sy > 0 ? cy : cy - L, 2, L);
      }
    }

    const justDown = Phaser.Input.Keyboard.JustDown;
    if (justDown(this.toolKeys.one)) this.selectTool("hoe");
    if (justDown(this.toolKeys.two)) this.selectTool("seeds");
    if (justDown(this.toolKeys.three)) this.selectTool("water");
    if (justDown(this.toolKeys.four)) this.selectTool("harvest");
    if (justDown(this.actionKey)) this.useTool();
    if (justDown(this.nextDayKey)) this.advanceDay();
  }
}
