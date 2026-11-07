
import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";

type FarmingTool = "hoe" | "seeds" | "water" | "harvest";

interface FarmTile {
  x: number;
  y: number;
  soil: boolean;
  planted: boolean;
  watered: boolean;
  growth: number;
  graphics: Phaser.GameObjects.Graphics;
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

  private toolBackgrounds: Phaser.GameObjects.Rectangle[] = [];
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
        const y = 355 + row * tileSize;
        const graphics = this.scene.add.graphics().setDepth(15);

        const tile: FarmTile = {
          x,
          y,
          soil: false,
          planted: false,
          watered: false,
          growth: 0,
          graphics
        };

        this.tiles.push(tile);
        this.drawTile(tile);
      }
    }

    this.highlight = this.scene.add.graphics().setDepth(25);
  }

  private drawTile(tile: FarmTile): void {
    const g = tile.graphics;
    g.clear();

    if (!tile.soil) {
      g.fillStyle(0x6f9f52, 1).fillRect(tile.x, tile.y, 30, 30);
      g.lineStyle(1, 0x527c43, 0.8).strokeRect(tile.x, tile.y, 30, 30);
      g.fillStyle(0x91b76a, 1);
      g.fillRect(tile.x + 5, tile.y + 6, 3, 3);
      g.fillRect(tile.x + 21, tile.y + 19, 3, 3);
      return;
    }

    const soilColor = tile.watered ? 0x55432e : 0x795332;
    g.fillStyle(soilColor, 1).fillRect(tile.x, tile.y, 30, 30);
    g.lineStyle(1, 0xa27a4e, 0.8).strokeRect(tile.x, tile.y, 30, 30);

    if (tile.watered) {
      g.fillStyle(0x91b8a7, 0.65);
      g.fillRect(tile.x + 5, tile.y + 5, 5, 2);
      g.fillRect(tile.x + 20, tile.y + 20, 5, 2);
    }

    if (!tile.planted) return;

    if (tile.growth === 0) {
      g.fillStyle(0xd6bd75, 1).fillRect(tile.x + 13, tile.y + 13, 4, 4);
    } else if (tile.growth === 1) {
      g.fillStyle(0x4b913e, 1);
      g.fillRect(tile.x + 13, tile.y + 12, 4, 10);
      g.fillRect(tile.x + 8, tile.y + 13, 5, 3);
      g.fillRect(tile.x + 17, tile.y + 13, 5, 3);
    } else if (tile.growth === 2) {
      g.fillStyle(0x3c813b, 1);
      g.fillRect(tile.x + 13, tile.y + 5, 4, 20);
      g.fillRect(tile.x + 5, tile.y + 9, 9, 4);
      g.fillRect(tile.x + 16, tile.y + 12, 9, 4);
      g.fillRect(tile.x + 7, tile.y + 18, 7, 4);
    } else {
      g.fillStyle(0x39743a, 1);
      g.fillRect(tile.x + 13, tile.y + 5, 4, 21);
      g.fillRect(tile.x + 6, tile.y + 9, 8, 4);
      g.fillRect(tile.x + 16, tile.y + 12, 8, 4);
      g.fillRect(tile.x + 8, tile.y + 18, 6, 4);
      g.fillStyle(0xe1bf55, 1);
      g.fillRect(tile.x + 11, tile.y + 3, 3, 6);
      g.fillRect(tile.x + 17, tile.y + 4, 3, 6);
      g.fillRect(tile.x + 14, tile.y + 1, 3, 7);
    }
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
    const topBackground = this.scene.add.rectangle(300, 12, 275, 57, 0x34271d, 0.96)
      .setOrigin(0).setScrollFactor(0).setDepth(100);
    topBackground.setStrokeStyle(2, 0xd6b36b);

    this.dayText = this.scene.add.text(312, 16, "", {
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

    const toolbar = this.scene.add.rectangle(230, 315, 398, 39, 0x34271d, 0.97)
      .setOrigin(0).setScrollFactor(0).setDepth(100);
    toolbar.setStrokeStyle(2, 0xd6b36b);

    const centers = [279, 378, 477, 576];
    this.toolDefinitions.forEach((definition, index) => {
      const slot = this.scene.add.rectangle(centers[index], 334, 94, 30, 0x493629, 1)
        .setScrollFactor(0).setDepth(101);
      slot.setStrokeStyle(1, 0x9b7047);

      const icon = this.scene.add.image(centers[index] - 25, 334, definition.texture)
        .setDisplaySize(23, 23).setScrollFactor(0).setDepth(102);

      const label = this.scene.add.text(centers[index] + 13, 334, "", {
        fontFamily: this.language.getFontFamily(),
        fontSize: "8px",
        color: "#f5e8c6"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(102);

      this.toolBackgrounds.push(slot);
      this.toolIcons.push(icon);
      this.toolLabels.push(label);
    });

    this.ui.registerHud(
      topBackground,
      this.dayText,
      this.inventoryText,
      this.statusText,
      toolbar,
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

    this.toolDefinitions.forEach((definition, index) => {
      const selected = definition.tool === this.tool;
      this.toolBackgrounds[index].setFillStyle(selected ? 0x79382e : 0x493629, 1);
      this.toolBackgrounds[index].setStrokeStyle(selected ? 2 : 1, selected ? 0xe6c47e : 0x9b7047);
      this.toolLabels[index].setText(`${definition.key} ${this.language.t(definition.name)}`);
      this.toolLabels[index].setFontFamily(this.language.getFontFamily());
    });

    const font = this.language.getFontFamily();
    this.dayText.setFontFamily(font);
    this.inventoryText.setFontFamily(font);
    this.statusText.setFontFamily(font);
  }

  private findNearestTile(playerX: number, playerY: number): FarmTile | null {
    let nearest: FarmTile | null = null;
    let shortestDistance = 50;

    for (const tile of this.tiles) {
      const distance = Phaser.Math.Distance.Between(
        playerX,
        playerY,
        tile.x + 15,
        tile.y + 15
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
    this.statusText.setText(
      this.language.t("farm.selected", { tool: this.language.t(names[tool]) })
    );
  }

  private useTool(): void {
    if (!this.selectedTile) {
      this.statusText.setText(this.language.t("farm.noTile"));
      return;
    }

    const tile = this.selectedTile;

    if (this.tool === "hoe") {
      if (tile.soil) {
        this.statusText.setText(this.language.t("farm.alreadyPrepared"));
        return;
      }
      tile.soil = true;
      this.statusText.setText(this.language.t("farm.prepared"));
    } else if (this.tool === "seeds") {
      if (!tile.soil) {
        this.statusText.setText(this.language.t("farm.needSoil"));
        return;
      }
      if (tile.planted) {
        this.statusText.setText(this.language.t("farm.alreadyPlanted"));
        return;
      }
      if (this.seeds <= 0) {
        this.statusText.setText(this.language.t("farm.noSeeds"));
        return;
      }
      tile.planted = true;
      tile.growth = 0;
      tile.watered = false;
      this.seeds--;
      this.statusText.setText(this.language.t("farm.planted"));
    } else if (this.tool === "water") {
      if (!tile.planted) {
        this.statusText.setText(this.language.t("farm.noCrop"));
        return;
      }
      if (tile.growth >= 3) {
        this.statusText.setText(this.language.t("farm.ready"));
        return;
      }
      if (tile.watered) {
        this.statusText.setText(this.language.t("farm.watered"));
        return;
      }
      tile.watered = true;
      this.statusText.setText(this.language.t("farm.waterSuccess"));
    } else if (this.tool === "harvest") {
      if (!tile.planted || tile.growth < 3) {
        this.statusText.setText(this.language.t("farm.notReady"));
        return;
      }
      tile.planted = false;
      tile.watered = false;
      tile.growth = 0;
      this.rice += 3;
      this.statusText.setText(this.language.t("farm.harvested"));
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
    this.statusText.setText(this.language.t("farm.newDay", { grown }));
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
      this.highlight.lineStyle(2, 0xffe39b, 1);
      this.highlight.strokeRect(
        this.selectedTile.x - 1,
        this.selectedTile.y - 1,
        32,
        32
      );
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
