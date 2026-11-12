
import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { INVENTORY_ITEM_DEFINITIONS, type InventoryItemId } from "../ui/InventoryItems";

type FarmingTool = "hoe" | "seeds" | "water" | "harvest";
export type FarmCropKind = "rice" | "tomato" | "greenBean";

export type FarmUpgradeId = "hoe" | "wateringCan" | "sickle" | "expansion" | "riceMill";
export type FarmUpgradeLevels = Record<FarmUpgradeId, number>;

export const FARM_UPGRADE_DEFINITIONS: Record<FarmUpgradeId, { maxLevel: number; costs: number[]; nameKey: string; descriptionKey: string }> = {
  hoe: { maxLevel: 2, costs: [220, 520], nameKey: "market.upgrade.hoe", descriptionKey: "market.upgrade.hoeDesc" },
  wateringCan: { maxLevel: 2, costs: [260, 580], nameKey: "market.upgrade.wateringCan", descriptionKey: "market.upgrade.wateringCanDesc" },
  sickle: { maxLevel: 1, costs: [450], nameKey: "market.upgrade.sickle", descriptionKey: "market.upgrade.sickleDesc" },
  expansion: { maxLevel: 1, costs: [700], nameKey: "market.upgrade.expansion", descriptionKey: "market.upgrade.expansionDesc" },
  riceMill: { maxLevel: 1, costs: [1000], nameKey: "market.upgrade.riceMill", descriptionKey: "market.upgrade.riceMillDesc" }
};

interface FarmTile {
  x: number;
  y: number;
  soil: boolean;
  planted: boolean;
  watered: boolean;
  growth: number;
  dryDays: number;
  dead: boolean;
  /** Absolute in-game minute when the current/most recent watering happened. */
  wateredAtGameMinute: number | null;
  plantedAtGameMinute: number | null;
  goldenWheat: boolean;
  cropType: FarmCropKind;
  base: Phaser.GameObjects.Image;
  crop: Phaser.GameObjects.Image;
}

interface FarmSaveData {
  day: number;
  seeds: number;
  rice: number;
  goldenWheat?: number;
  tomatoSeeds?: number;
  greenBeanSeeds?: number;
  tomatoes?: number;
  greenBeans?: number;
  mealBoostUntilGameMinute?: number;
  upgrades?: Partial<FarmUpgradeLevels>;
  tiles: {
    soil: boolean;
    planted: boolean;
    watered: boolean;
    growth: number;
    dryDays?: number;
    dead?: boolean;
    wateredAtGameMinute?: number | null;
    plantedAtGameMinute?: number | null;
    goldenWheat?: boolean;
    cropType?: FarmCropKind;
  }[];
}

export class FarmingSystem {
  private scene: Phaser.Scene;
  private ui: ModalUIManager;
  private language: LanguageSystem;
  private getElapsedGameMinutes: () => number;

  private tiles: FarmTile[] = [];
  private readonly plotRows = 3;
  private readonly basePlotColumns = 5;
  private upgrades: FarmUpgradeLevels = { hoe: 0, wateringCan: 0, sickle: 0, expansion: 0, riceMill: 0 };
  private tool: FarmingTool | null = "hoe";
  private hotbarItems: Array<InventoryItemId | null> = ["hoe", "seeds", "water", "harvest"];
  private selectedHotbarIndex = 0;
  private selectedSeedKind: FarmCropKind = "rice";
  private seeds = 5;
  private tomatoSeeds = 3;
  private greenBeanSeeds = 3;
  private rice = 0;
  private tomatoes = 0;
  private greenBeans = 0;
  private goldenWheat = 0;
  private mealBoostUntilGameMinute = 0;
  private day = 1;
  private readonly matureGrowth = 3;

  private actionKey!: Phaser.Input.Keyboard.Key;
  private toolKeys!: {
    one: Phaser.Input.Keyboard.Key;
    two: Phaser.Input.Keyboard.Key;
    three: Phaser.Input.Keyboard.Key;
    four: Phaser.Input.Keyboard.Key;
  };

  private inventoryText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private highlight!: Phaser.GameObjects.Graphics;
  private selectedTile: FarmTile | null = null;
  private showingInitialHint = true;

  private toolBackgrounds: Phaser.GameObjects.Image[] = [];
  private toolTip!: Phaser.GameObjects.Text;
  private toolLabels: Phaser.GameObjects.Text[] = [];
  private toolIcons: Phaser.GameObjects.Image[] = [];

  constructor(
    scene: Phaser.Scene,
    ui: ModalUIManager,
    language: LanguageSystem,
    getElapsedGameMinutes: () => number = () => 0
  ) {
    this.scene = scene;
    this.ui = ui;
    this.language = language;
    this.getElapsedGameMinutes = getElapsedGameMinutes;

    this.createPlot();
    this.createControls();
    this.createInterface();
    this.language.onChange(() => this.updateInterface());
  }

  private createPlot(): void {
    for (let row = 0; row < this.plotRows; row++) {
      for (let col = 0; col < this.basePlotColumns; col++) this.createTile(row, col);
    }
    this.highlight = this.scene.add.graphics().setDepth(25);
  }

  private createTile(row: number, col: number): void {
    const x = 260 + col * 32;
    const y = 356 + row * 32;
    const base = this.scene.add.image(x, y, "tile_plot")
      .setOrigin(0, 0).setScale(2).setDepth(15);
    const crop = this.scene.add.image(x + 16, y + 30, "crop_0")
      .setOrigin(0.5, 1).setScale(2).setDepth(y + 31).setVisible(false);
    const tile: FarmTile = {
      x, y, soil: false, planted: false, watered: false, growth: 0,
      dryDays: 0, dead: false, wateredAtGameMinute: null,
      plantedAtGameMinute: null, goldenWheat: false, cropType: "rice", base, crop
    };
    this.tiles.push(tile);
    this.drawTile(tile);
  }

  private ensureExpandedPlots(): void {
    const targetColumns = this.basePlotColumns + (this.upgrades.expansion > 0 ? 2 : 0);
    for (let row = 0; row < this.plotRows; row++) {
      for (let col = this.basePlotColumns; col < targetColumns; col++) {
        if (!this.tiles.some(tile => tile.x === 260 + col * 32 && tile.y === 356 + row * 32)) {
          this.createTile(row, col);
        }
      }
    }
  }

  private drawTile(tile: FarmTile): void {
    if (!tile.soil) {
      tile.base.setTexture("tile_plot");
    } else {
      tile.base.setTexture(tile.watered ? "tile_wet" : "tile_tilled");
    }

    if (tile.soil && tile.planted) {
      if (tile.dead) {
        tile.crop.setTexture(this.cropTexture(tile.cropType, 3)).setTint(0x75604b).setAlpha(0.88).setVisible(true);
      } else {
        tile.crop
          .setTexture(this.cropTexture(tile.cropType, Phaser.Math.Clamp(tile.growth, 0, 3)))
          .setAlpha(1)
          .setVisible(true);
        if (tile.goldenWheat) tile.crop.setTint(0xf0c34d);
        else if (tile.dryDays > 0) tile.crop.setTint(0xb99567);
        else tile.crop.clearTint();
      }
    } else {
      tile.crop.clearTint().setAlpha(1).setVisible(false);
    }
  }

  private cropTexture(kind: FarmCropKind, stage: number): string {
    const safeStage = Phaser.Math.Clamp(Math.floor(stage), 0, 3);
    if (kind === "tomato") return `crop_tomato_${safeStage}`;
    if (kind === "greenBean") return `crop_green_bean_${safeStage}`;
    return `crop_${safeStage}`;
  }

  private getSeedCountFor(kind: FarmCropKind): number {
    if (kind === "tomato") return this.tomatoSeeds;
    if (kind === "greenBean") return this.greenBeanSeeds;
    return this.seeds;
  }

  private consumeSeed(kind: FarmCropKind): boolean {
    if (this.getSeedCountFor(kind) <= 0) return false;
    if (kind === "tomato") this.tomatoSeeds--;
    else if (kind === "greenBean") this.greenBeanSeeds--;
    else this.seeds--;
    return true;
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

    // Four configurable hotbar slots. InventorySystem controls their contents.
    const centers = [251, 297, 343, 389];
    for (let index = 0; index < 4; index++) {
      const slot = this.scene.add.image(centers[index], 336, "ui_slot")
        .setScale(2).setScrollFactor(0).setDepth(101)
        .setInteractive({ useHandCursor: true });
      slot.on("pointerdown", () => this.selectHotbarSlot(index));

      const icon = this.scene.add.image(centers[index], 336, "ui_icon_hand")
        .setScale(2).setScrollFactor(0).setDepth(102).setVisible(false);

      const label = this.scene.add.text(centers[index] - 17, 319, String(index + 1), {
        fontFamily: this.language.getFontFamily(),
        fontSize: "9px",
        color: "#fff1cf",
        stroke: "#2a1a14",
        strokeThickness: 2
      }).setScrollFactor(0).setDepth(103);

      this.toolBackgrounds.push(slot);
      this.toolIcons.push(icon);
      this.toolLabels.push(label);
    }

    this.toolTip = this.scene.add.text(320, 314, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#ffd978",
      stroke: "#2a1a14",
      strokeThickness: 3
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(103).setAlpha(0);

    this.ui.registerHud(
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
    if (this.showingInitialHint) {
      this.toast(this.language.t("farm.findPlot"), 5000);
    }

    this.hotbarItems.forEach((item, index) => {
      const selected = index === this.selectedHotbarIndex;
      const definition = item ? INVENTORY_ITEM_DEFINITIONS[item] : null;
      this.toolBackgrounds[index].setTexture(selected ? "ui_slot_selected" : "ui_slot");
      this.toolLabels[index].setFontFamily(this.language.getFontFamily());
      this.toolIcons[index].setY(selected ? 334 : 336);
      this.toolIcons[index].setVisible(!!definition);
      if (definition) this.toolIcons[index].setTexture(definition.texture);
      if (selected && definition) {
        this.toolTip.setText(this.language.t(definition.nameKey));
        this.scene.tweens.killTweensOf(this.toolTip);
        this.toolTip.setAlpha(1);
        this.scene.tweens.add({ targets: this.toolTip, alpha: 0, delay: 1800, duration: 500 });
      } else if (selected) {
        this.scene.tweens.killTweensOf(this.toolTip);
        this.toolTip.setAlpha(0);
      }
    });

    const font = this.language.getFontFamily();
    this.toolTip.setFontFamily(font);
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

  private selectHotbarSlot(index: number): void {
    if (index < 0 || index >= this.hotbarItems.length) return;
    const item = this.hotbarItems[index];
    this.selectedHotbarIndex = index;
    this.tool = item ? (INVENTORY_ITEM_DEFINITIONS[item].tool ?? null) : null;
    this.selectedSeedKind = item ? (INVENTORY_ITEM_DEFINITIONS[item].cropSeed ?? "rice") : "rice";
    this.updateInterface();
    this.scene.events.emit("hotbar-selection-changed", item);
  }

  setHotbarItems(items: Array<InventoryItemId | null>): void {
    const next = Array.from({ length: 4 }, (_, index) => items[index] ?? null);
    this.hotbarItems = next;
    const selected = this.hotbarItems[this.selectedHotbarIndex];
    this.tool = selected ? (INVENTORY_ITEM_DEFINITIONS[selected].tool ?? null) : null;
    this.selectedSeedKind = selected ? (INVENTORY_ITEM_DEFINITIONS[selected].cropSeed ?? "rice") : "rice";
    this.updateInterface();
    this.scene.events.emit("hotbar-selection-changed", selected);
  }

  getHotbarItems(): Array<InventoryItemId | null> {
    return [...this.hotbarItems];
  }

  getSelectedHotbarIndex(): number {
    return this.selectedHotbarIndex;
  }

  getSelectedHotbarItem(): InventoryItemId | null {
    return this.hotbarItems[this.selectedHotbarIndex] ?? null;
  }

  mobileSelectTool(index: number): void {
    this.selectHotbarSlot(index);
  }

  mobileUseTool(): void {
    this.useTool();
  }

  private getAreaTiles(center: FarmTile, radiusX: number, radiusY: number): FarmTile[] {
    return this.tiles.filter(tile =>
      Math.abs(tile.x - center.x) <= radiusX * 32 &&
      Math.abs(tile.y - center.y) <= radiusY * 32
    );
  }

  private useTool(): void {
    if (!this.tool) {
      this.setStatus("farm.itemNotUsable");
      return;
    }
    if (!this.selectedTile) {
      this.setStatus("farm.noTile");
      return;
    }

    const tile = this.selectedTile;

    if (this.tool === "hoe") {
      const radiusX = this.upgrades.hoe > 0 ? 1 : 0;
      const radiusY = this.upgrades.hoe >= 2 ? 1 : 0;
      const targets = this.getAreaTiles(tile, radiusX, radiusY).filter(target => !target.soil);
      if (targets.length === 0) {
        this.setStatus("farm.alreadyPrepared");
        return;
      }
      for (const target of targets) {
        target.soil = true;
        this.drawTile(target);
        this.playFx(target, "fx_dust", "hoe");
        this.scene.events.emit("sound-effect", { name: "hoe", x: target.x + 16, y: target.y + 16 });
      }
      this.setStatus(targets.length > 1 ? "farm.preparedMany" : "farm.prepared", { amount: targets.length });
    } else if (this.tool === "seeds") {
      if (!tile.soil) {
        this.setStatus("farm.needSoil");
        return;
      }
      if (tile.planted) {
        this.setStatus("farm.alreadyPlanted");
        return;
      }
      const seedCount = this.getSeedCountFor(this.selectedSeedKind);
      if (seedCount <= 0) {
        this.setStatus("farm.noSeeds");
        return;
      }
      this.playFx(tile, "fx_dust", "plant");
      tile.planted = true;
      tile.growth = 0;
      tile.dryDays = 0;
      tile.dead = false;
      tile.cropType = this.selectedSeedKind;
      tile.goldenWheat = tile.cropType === "rice" && this.isMealBlessingActive() && Math.random() < 0.24;
      tile.watered = false;
      tile.wateredAtGameMinute = null;
      tile.plantedAtGameMinute = Math.max(0, Math.floor(this.getElapsedGameMinutes()));
      this.consumeSeed(this.selectedSeedKind);
      this.scene.events.emit("sound-effect", { name: "plant", x: tile.x + 16, y: tile.y + 16 });
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
      const radiusX = this.upgrades.wateringCan > 0 ? 1 : 0;
      const radiusY = this.upgrades.wateringCan >= 2 ? 1 : 0;
      const now = Math.max(0, Math.floor(this.getElapsedGameMinutes()));
      const targets = this.getAreaTiles(tile, radiusX, radiusY).filter(target =>
        target.planted && !target.dead && target.growth < this.matureGrowth && !target.watered
      );
      if (targets.length === 0) {
        this.setStatus("farm.watered");
        return;
      }
      for (const target of targets) {
        target.watered = true;
        target.wateredAtGameMinute = now;
        target.dryDays = 0;
        this.drawTile(target);
        this.playFx(target, "fx_splash", "water");
        this.scene.events.emit("sound-effect", { name: "water", x: target.x + 16, y: target.y + 16 });
      }
      this.setStatus(targets.length > 1 ? "farm.waterSuccessMany" : "farm.waterSuccess", { amount: targets.length });
    } else if (this.tool === "harvest") {
      if (!tile.planted || (!tile.dead && tile.growth < this.matureGrowth)) {
        this.setStatus("farm.notReady");
        return;
      }
      const wasDead = tile.dead;
      tile.planted = false;
      tile.soil = false;
      tile.watered = false;
      tile.wateredAtGameMinute = null;
      tile.plantedAtGameMinute = null;
      tile.growth = 0;
      tile.dryDays = 0;
      tile.dead = false;
      const wasGolden = tile.goldenWheat;
      const harvestedKind = tile.cropType;
      tile.goldenWheat = false;
      tile.cropType = "rice";
      if (wasDead) {
        // Dead crops can be cleared, but they never enter the rice inventory
        // and therefore cannot be sold at the market.
        this.playFx(tile, "fx_dust", "clear");
        this.scene.events.emit("sound-effect", { name: "dead", x: tile.x + 16, y: tile.y + 16 });
        this.setStatus("farm.deadHarvested");
      } else {
        const harvestYield = 3 + this.upgrades.sickle;
        if (harvestedKind === "tomato") this.tomatoes += harvestYield;
        else if (harvestedKind === "greenBean") this.greenBeans += harvestYield;
        else this.rice += harvestYield;
        if (wasGolden) this.goldenWheat += 1;
        this.playFx(tile, "fx_sparkle", "harvest");
        this.scene.events.emit("sound-effect", { name: "harvest", x: tile.x + 16, y: tile.y + 16 });
        const cropLabel = harvestedKind === "tomato" ? "TOMATOES" : harvestedKind === "greenBean" ? "GREEN BEANS" : "WHEAT";
        this.floatText(tile, wasGolden ? `+${harvestYield} WHEAT  +1 GOLDEN WHEAT` : `+${harvestYield} ${cropLabel}`);
        this.setStatus(wasGolden ? "farm.goldenHarvested" : harvestedKind === "rice" ? "farm.harvested" : "farm.harvestedCrop", { amount: harvestYield, crop: this.language.t(`inventory.${harvestedKind === "tomato" ? "tomatoes" : "greenBeans"}`) });
      }
    }

    this.drawTile(tile);
    this.updateInterface();
  }

  /**
   * A crop matures after three successful watering cycles: plant and water
   * on Day 1, water again on Day 2 and Day 3, then harvest on Day 4.
   * Each stage advances after 24 in-game hours from the previous watering.
   * The shared village clock continues while the player is indoors or asleep.
   */
  syncGameDay(gameDay: number, elapsedGameMinutes = this.getElapsedGameMinutes()): void {
    const targetDay = Math.max(1, Math.floor(Number(gameDay) || 1));
    const now = Math.max(0, Math.floor(Number(elapsedGameMinutes) || 0));
    let totalGrown = 0;
    let totalWilted = 0;

    for (const tile of this.tiles) {
      if (!tile.planted || tile.dead || tile.growth >= this.matureGrowth) continue;
      const wateredAt = tile.wateredAtGameMinute;
      const dryAnchor = wateredAt ?? tile.plantedAtGameMinute;
      if (dryAnchor === null || !Number.isFinite(dryAnchor)) continue;
      const elapsedSinceWatering = now - dryAnchor;
      if (elapsedSinceWatering < 0) continue;

      const growthInterval = this.isMealBlessingActive(now) ? 1080 : 1440;
      if (tile.watered && wateredAt !== null && elapsedSinceWatering >= growthInterval) {
        tile.growth = Math.min(this.matureGrowth, tile.growth + 1);
        tile.watered = false;
        tile.dryDays = 0;
        totalGrown++;
        this.drawTile(tile);
      } else if (!tile.watered) {
        // Unwatered new plants wilt after 24 hours. Once a watering cycle has
        // produced growth, the following 24 hours are the first missed cycle.
        const elapsedDays = Math.floor(elapsedSinceWatering / 1440);
        const dryDays = wateredAt === null ? elapsedDays : elapsedDays - 1;
        const nextDryDays = Phaser.Math.Clamp(dryDays, 0, 2);
        if (nextDryDays > tile.dryDays) {
          tile.dryDays = nextDryDays;
          totalWilted++;
          if (tile.dryDays >= 2) tile.dead = true;
          this.drawTile(tile);
        }
      }
    }

    if (targetDay > this.day) {
      this.day = targetDay;
      this.updateInterface();
      this.setStatus("farm.newDay", { grown: totalGrown, wilted: totalWilted });
    } else if (totalGrown > 0 || totalWilted > 0) {
      this.updateInterface();
    }
  }

  applyMealBlessing(): void {
    const now = Math.max(0, Math.floor(this.getElapsedGameMinutes()));
    this.mealBoostUntilGameMinute = Math.max(this.mealBoostUntilGameMinute, now) + 2880;
    for (const tile of this.tiles) {
      if (tile.planted && !tile.dead && !tile.goldenWheat && Math.random() < 0.24) {
        tile.goldenWheat = true;
        this.drawTile(tile);
      }
    }
    this.updateInterface();
  }

  private isMealBlessingActive(now = Math.max(0, Math.floor(this.getElapsedGameMinutes()))): boolean {
    return now < this.mealBoostUntilGameMinute;
  }

  getUpgradeLevel(id: FarmUpgradeId): number {
    return this.upgrades[id];
  }

  getNextUpgradeCost(id: FarmUpgradeId): number | null {
    const definition = FARM_UPGRADE_DEFINITIONS[id];
    const level = this.upgrades[id];
    return level >= definition.maxLevel ? null : definition.costs[level] ?? null;
  }

  purchaseUpgrade(id: FarmUpgradeId): boolean {
    const definition = FARM_UPGRADE_DEFINITIONS[id];
    if (this.upgrades[id] >= definition.maxLevel) return false;
    this.upgrades[id]++;
    if (id === "expansion") this.ensureExpandedPlots();
    this.updateInterface();
    return true;
  }

  getRiceSaleBonus(): number {
    return this.upgrades.riceMill * 2;
  }

  getHarvestYield(): number {
    return 3 + this.upgrades.sickle;
  }

  getPlotCount(): number {
    return this.tiles.length;
  }

  getGoldenWheat(): number {
    return this.goldenWheat;
  }

  addGoldenWheat(amount: number): void {
    this.goldenWheat += Math.max(0, Math.floor(amount));
    this.updateInterface();
  }

  removeGoldenWheat(amount: number): boolean {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (this.goldenWheat < safeAmount) return false;
    this.goldenWheat -= safeAmount;
    this.updateInterface();
    return true;
  }

  getDay(): number {
    return this.day;
  }

  getSeeds(): number {
    return this.seeds;
  }

  getSeedCount(kind: FarmCropKind): number { return this.getSeedCountFor(kind); }

  addCropSeeds(kind: FarmCropKind, amount: number): void {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (kind === "tomato") this.tomatoSeeds += safeAmount;
    else if (kind === "greenBean") this.greenBeanSeeds += safeAmount;
    else this.seeds += safeAmount;
    this.updateInterface();
  }

  removeCropSeeds(kind: FarmCropKind, amount: number): boolean {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (this.getSeedCountFor(kind) < safeAmount) return false;
    if (kind === "tomato") this.tomatoSeeds -= safeAmount;
    else if (kind === "greenBean") this.greenBeanSeeds -= safeAmount;
    else this.seeds -= safeAmount;
    this.updateInterface();
    return true;
  }

  getCropCount(kind: Exclude<FarmCropKind, "rice">): number {
    return kind === "tomato" ? this.tomatoes : this.greenBeans;
  }

  addCrop(kind: Exclude<FarmCropKind, "rice">, amount: number): void {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (kind === "tomato") this.tomatoes += safeAmount;
    else this.greenBeans += safeAmount;
    this.updateInterface();
  }

  removeCrop(kind: Exclude<FarmCropKind, "rice">, amount: number): boolean {
    const safeAmount = Math.max(0, Math.floor(amount));
    const owned = this.getCropCount(kind);
    if (owned < safeAmount) return false;
    if (kind === "tomato") this.tomatoes -= safeAmount;
    else this.greenBeans -= safeAmount;
    this.updateInterface();
    return true;
  }

  getRice(): number {
    return this.rice;
  }

  getSelectedTool(): string {
    return this.hotbarItems[this.selectedHotbarIndex] ?? "";
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
      goldenWheat: this.goldenWheat,
      tomatoSeeds: this.tomatoSeeds,
      greenBeanSeeds: this.greenBeanSeeds,
      tomatoes: this.tomatoes,
      greenBeans: this.greenBeans,
      mealBoostUntilGameMinute: this.mealBoostUntilGameMinute,
      upgrades: { ...this.upgrades },
      tiles: this.tiles.map(tile => ({
        soil: tile.soil,
        planted: tile.planted,
        watered: tile.watered,
        growth: tile.growth,
        dryDays: tile.dryDays,
        dead: tile.dead,
        wateredAtGameMinute: tile.wateredAtGameMinute,
        plantedAtGameMinute: tile.plantedAtGameMinute,
        goldenWheat: tile.goldenWheat,
        cropType: tile.cropType
      }))
    };
  }

  loadSaveData(data: FarmSaveData, migrateLegacyMatureCrops = false): void {
    this.day = Math.max(1, Math.floor(Number(data.day) || 1));
    this.seeds = Math.max(0, Math.floor(Number(data.seeds) || 0));
    this.rice = Math.max(0, Math.floor(Number(data.rice) || 0));
    this.goldenWheat = Math.max(0, Math.floor(Number(data.goldenWheat) || 0));
    this.tomatoSeeds = Math.max(0, Math.floor(Number(data.tomatoSeeds ?? 3) || 0));
    this.greenBeanSeeds = Math.max(0, Math.floor(Number(data.greenBeanSeeds ?? 3) || 0));
    this.tomatoes = Math.max(0, Math.floor(Number(data.tomatoes) || 0));
    this.greenBeans = Math.max(0, Math.floor(Number(data.greenBeans) || 0));
    this.mealBoostUntilGameMinute = Math.max(0, Math.floor(Number(data.mealBoostUntilGameMinute) || 0));
    const savedUpgrades = data.upgrades ?? {};
    this.upgrades = {
      hoe: Phaser.Math.Clamp(Math.floor(Number(savedUpgrades.hoe) || 0), 0, FARM_UPGRADE_DEFINITIONS.hoe.maxLevel),
      wateringCan: Phaser.Math.Clamp(Math.floor(Number(savedUpgrades.wateringCan) || 0), 0, FARM_UPGRADE_DEFINITIONS.wateringCan.maxLevel),
      sickle: Phaser.Math.Clamp(Math.floor(Number(savedUpgrades.sickle) || 0), 0, FARM_UPGRADE_DEFINITIONS.sickle.maxLevel),
      expansion: Phaser.Math.Clamp(Math.floor(Number(savedUpgrades.expansion) || 0), 0, FARM_UPGRADE_DEFINITIONS.expansion.maxLevel),
      riceMill: Phaser.Math.Clamp(Math.floor(Number(savedUpgrades.riceMill) || 0), 0, FARM_UPGRADE_DEFINITIONS.riceMill.maxLevel)
    };
    this.ensureExpandedPlots();

    this.tiles.forEach((tile, index) => {
      const saved = data.tiles?.[index];
      if (!saved) return;
      tile.soil = saved.soil === true;
      tile.planted = tile.soil && saved.planted === true;
      const savedWateredAt = saved.wateredAtGameMinute;
      const hasSavedWaterTime = typeof savedWateredAt === "number" && Number.isFinite(savedWateredAt);
      const currentGameMinute = Math.max(0, Math.floor(this.getElapsedGameMinutes()));
      tile.wateredAtGameMinute = tile.planted
        ? (hasSavedWaterTime ? Math.max(0, Math.floor(savedWateredAt)) : (saved.watered === true ? currentGameMinute : null))
        : null;
      const savedPlantedAt = saved.plantedAtGameMinute;
      tile.plantedAtGameMinute = tile.planted
        ? (typeof savedPlantedAt === "number" && Number.isFinite(savedPlantedAt) ? Math.max(0, Math.floor(savedPlantedAt)) : currentGameMinute)
        : null;
      tile.watered = tile.planted && saved.watered === true && tile.wateredAtGameMinute !== null;
      const savedGrowth = Math.max(0, Math.floor(Number(saved.growth) || 0));
      tile.growth = tile.planted
        ? Phaser.Math.Clamp(migrateLegacyMatureCrops && savedGrowth >= 3 ? this.matureGrowth : savedGrowth, 0, this.matureGrowth)
        : 0;
      tile.dryDays = tile.planted ? Phaser.Math.Clamp(Math.floor(Number(saved.dryDays) || 0), 0, 2) : 0;
      tile.dead = tile.planted && saved.dead === true;
      tile.goldenWheat = tile.planted && saved.goldenWheat === true;
      tile.cropType = saved.cropType === "tomato" || saved.cropType === "greenBean" ? saved.cropType : "rice";
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
    if (justDown(this.toolKeys.one)) this.selectHotbarSlot(0);
    if (justDown(this.toolKeys.two)) this.selectHotbarSlot(1);
    if (justDown(this.toolKeys.three)) this.selectHotbarSlot(2);
    if (justDown(this.toolKeys.four)) this.selectHotbarSlot(3);
    if (justDown(this.actionKey)) this.useTool();
  }
}
