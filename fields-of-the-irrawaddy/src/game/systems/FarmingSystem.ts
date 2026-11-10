
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
  dryDays: number;
  dead: boolean;
  base: Phaser.GameObjects.Image;
  crop: Phaser.GameObjects.Sprite;
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
    dryDays?: number;
    dead?: boolean;
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
  private readonly matureGrowth = 4;

  private actionKey!: Phaser.Input.Keyboard.Key;
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
        const crop = this.scene.add.sprite(x + 16, y + 30, "crop_0")
          .setOrigin(0.5, 1).setScale(2).setDepth(y + 31).setVisible(false);

        const tile: FarmTile = {
          x,
          y,
          soil: false,
          planted: false,
          watered: false,
          growth: 0,
          dryDays: 0,
          dead: false,
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
    if (!tile.soil) tile.base.setTexture("tile_plot");
    else tile.base.setTexture(tile.watered ? "tile_wet" : "tile_tilled");

    if (tile.soil && tile.planted) {
      if (tile.dead) {
        tile.crop.anims.stop();
        tile.crop.setTexture("crop_3").setTint(0x75604b).setAlpha(0.88).setVisible(true);
      } else {
        const stage = Phaser.Math.Clamp(tile.growth, 0, 3);
        if (stage === 0) {
          tile.crop.anims.stop();
          tile.crop.setTexture("crop_0").setAlpha(1).setVisible(true);
        } else {
          const animationKey = `rice-sway-${stage}`;
          tile.crop.setTexture(`rice_sway_${stage}`, 0).setAlpha(1).setVisible(true);
          if (tile.crop.anims.currentAnim?.key !== animationKey) {
            tile.crop.anims.play(animationKey, true);
          }
        }
        if (tile.dryDays > 0) tile.crop.setTint(0xb99567);
        else tile.crop.clearTint();
      }
    } else {
      tile.crop.anims.stop();
      tile.crop.clearTint().setAlpha(1).setVisible(false);
    }
  }

  private playFx(tile: FarmTile, key: "fx_dust" | "fx_splash" | "fx_sparkle", action: "hoe" | "plant" | "water" | "harvest" | "clear"): void {
    this.scene.events.emit("player-action", action);
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
    this.toolKeys = {
      one: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      two: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      three: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      four: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR)
    };
  }

  private createInterface(): void {
    // Crop-day chip to the right of the hotbar
    const chip = pixelPanel(this.scene, 468, 336, 118, 24).setDepth(100);
    const chipIcon = this.scene.add.image(420, 336, "ui_icon_sprout").setScrollFactor(0).setDepth(101);
    this.dayText = this.scene.add.text(432, 331, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#f0d69e"
    }).setScrollFactor(0).setDepth(101);

    // unused legacy text objects kept off-screen-free: inventory is shown by the resource HUD
    this.inventoryText = this.scene.add.text(0, 0, "").setVisible(false);

    // Toast message above the hotbar (fades out)
    this.statusText = this.scene.add.text(320, 298, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#fff1cf",
      backgroundColor: "#2a1a14",
      padding: { x: 7, y: 4 },
      align: "center",
      wordWrap: { width: 330 }
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(104).setAlpha(0);

    // Stardew-style hotbar: four 40px slots with 2x icons
    const centers = [251, 297, 343, 389];
    this.toolDefinitions.forEach((definition, index) => {
      const slot = this.scene.add.image(centers[index], 336, "ui_slot")
        .setScale(2).setScrollFactor(0).setDepth(101)
        .setInteractive({ useHandCursor: true });
      slot.on("pointerdown", () => this.selectTool(definition.tool));

      const icon = this.scene.add.image(centers[index], 336, definition.texture)
        .setScale(2).setScrollFactor(0).setDepth(102);

      const label = this.scene.add.text(centers[index] - 17, 319, definition.key, {
        fontFamily: this.language.getFontFamily(),
        fontSize: "9px",
        color: "#fff1cf",
        stroke: "#2a1a14",
        strokeThickness: 2
      }).setScrollFactor(0).setDepth(103);

      this.toolBackgrounds.push(slot);
      this.toolIcons.push(icon);
      this.toolLabels.push(label);
    });

    this.toolTip = this.scene.add.text(320, 314, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#ffd978",
      stroke: "#2a1a14",
      strokeThickness: 3
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(103).setAlpha(0);

    this.ui.registerHud(
      chip,
      chipIcon,
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
    this.dayText.setText(this.language.t("hud.cropDay", { day: this.day }));
    if (this.showingInitialHint) {
      this.toast(this.language.t("farm.findPlot"), 5000);
    }

    this.toolDefinitions.forEach((definition, index) => {
      const selected = definition.tool === this.tool;
      this.toolBackgrounds[index].setTexture(selected ? "ui_slot_selected" : "ui_slot");
      this.toolLabels[index].setFontFamily(this.language.getFontFamily());
      this.toolIcons[index].setY(selected ? 334 : 336);
      if (selected) {
        this.toolTip.setText(this.language.t(definition.name));
        this.scene.tweens.killTweensOf(this.toolTip);
        this.toolTip.setAlpha(1);
        this.scene.tweens.add({ targets: this.toolTip, alpha: 0, delay: 1400, duration: 500 });
      }
    });

    const font = this.language.getFontFamily();
    this.toolTip.setFontFamily(font);
    this.dayText.setFontFamily(font);
    this.inventoryText.setFontFamily(font);
    this.statusText.setFontFamily(font);
  }


  private setStatus(key: string, values: Record<string, string | number> = {}): void {
    this.showingInitialHint = false;
    this.toast(this.language.t(key, values), 2800);
  }

  private toast(text: string, hold: number): void {
    this.statusText.setText(text);
    this.scene.tweens.killTweensOf(this.statusText);
    this.statusText.setAlpha(1);
    this.scene.tweens.add({ targets: this.statusText, alpha: 0, delay: hold, duration: 600 });
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
      this.playFx(tile, "fx_dust", "hoe");
      this.scene.events.emit("sound-effect", "hoe");
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
      this.playFx(tile, "fx_dust", "plant");
      tile.planted = true;
      tile.growth = 0;
      tile.dryDays = 0;
      tile.dead = false;
      tile.watered = false;
      this.seeds--;
      this.scene.events.emit("sound-effect", "plant");
      this.setStatus("farm.planted");
    } else if (this.tool === "water") {
      if (!tile.planted) {
        this.setStatus("farm.noCrop");
        return;
      }
      if (tile.dead) {
        this.setStatus("farm.deadCrop");
        return;
      }
      if (tile.growth >= this.matureGrowth) {
        this.setStatus("farm.ready");
        return;
      }
      if (tile.watered) {
        this.setStatus("farm.watered");
        return;
      }
      tile.watered = true;
      tile.dryDays = 0;
      this.playFx(tile, "fx_splash", "water");
      this.scene.events.emit("sound-effect", "water");
      this.setStatus("farm.waterSuccess");
    } else if (this.tool === "harvest") {
      if (!tile.planted || (!tile.dead && tile.growth < this.matureGrowth)) {
        this.setStatus("farm.notReady");
        return;
      }
      const wasDead = tile.dead;
      tile.planted = false;
      tile.watered = false;
      tile.growth = 0;
      tile.dryDays = 0;
      tile.dead = false;
      if (wasDead) {
        // Dead crops can be cleared, but they never enter the rice inventory
        // and therefore cannot be sold at the market.
        this.playFx(tile, "fx_dust", "clear");
        this.scene.events.emit("sound-effect", "dead");
        this.setStatus("farm.deadHarvested");
      } else {
        this.rice += 3;
        this.playFx(tile, "fx_sparkle", "harvest");
        this.scene.events.emit("sound-effect", "harvest");
        this.floatText(tile, "+3");
        this.setStatus("farm.harvested");
      }
    }

    this.drawTile(tile);
    this.updateInterface();
  }

  /**
   * Keep farming on the shared village clock. One full 24-hour in-game cycle
   * processes crop growth exactly once, even when several days elapsed in a
   * loaded save.
   */
  syncGameDay(gameDay: number): void {
    const targetDay = Math.max(1, Math.floor(Number(gameDay) || 1));
    if (targetDay <= this.day) return;

    let totalGrown = 0;
    let totalWilted = 0;
    while (this.day < targetDay) {
      this.day++;
      for (const tile of this.tiles) {
        if (!tile.planted || tile.dead) {
          tile.watered = false;
          continue;
        }

        // Once mature, a crop stays ready to harvest. Daily watering is only
        // required during its four growth days, not while waiting to be picked.
        if (tile.growth >= this.matureGrowth) {
          tile.watered = false;
          tile.dryDays = 0;
          continue;
        }

        if (tile.watered) {
          if (tile.growth < this.matureGrowth) {
            tile.growth++;
            totalGrown++;
          }
          tile.dryDays = 0;
        } else {
          tile.dryDays++;
          totalWilted++;
          // Two consecutive missed daily waterings kill a crop. A wilted crop
          // can still recover if watered before the next day boundary.
          if (tile.dryDays >= 2) tile.dead = true;
        }

        tile.watered = false;
        this.drawTile(tile);
      }
    }

    this.updateInterface();
    this.setStatus("farm.newDay", { grown: totalGrown, wilted: totalWilted });
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

  removeSeeds(amount: number): boolean {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (this.seeds < safeAmount) return false;
    this.seeds -= safeAmount;
    this.updateInterface();
    return true;
  }

  addRice(amount: number): void {
    this.rice += Math.max(0, Math.floor(amount));
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
        growth: tile.growth,
        dryDays: tile.dryDays,
        dead: tile.dead
      }))
    };
  }

  loadSaveData(data: FarmSaveData, migrateLegacyMatureCrops = false): void {
    this.day = Math.max(1, Math.floor(Number(data.day) || 1));
    this.seeds = Math.max(0, Math.floor(Number(data.seeds) || 0));
    this.rice = Math.max(0, Math.floor(Number(data.rice) || 0));

    this.tiles.forEach((tile, index) => {
      const saved = data.tiles?.[index];
      if (!saved) return;
      tile.soil = saved.soil === true;
      tile.planted = tile.soil && saved.planted === true;
      tile.watered = tile.planted && saved.watered === true;
      const savedGrowth = Math.max(0, Math.floor(Number(saved.growth) || 0));
      tile.growth = tile.planted
        ? Phaser.Math.Clamp(migrateLegacyMatureCrops && savedGrowth >= 3 ? 4 : savedGrowth, 0, this.matureGrowth)
        : 0;
      tile.dryDays = tile.planted ? Phaser.Math.Clamp(Math.floor(Number(saved.dryDays) || 0), 0, 2) : 0;
      tile.dead = tile.planted && saved.dead === true;
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
  }
}
