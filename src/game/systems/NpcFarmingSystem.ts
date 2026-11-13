import Phaser from "phaser";
import { NPC_FARM_PLOTS } from "../data/villageLayout";
import { LanguageSystem } from "./LanguageSystem";
import { uiFontSize } from "../ui/PixelUI";

export type NpcFarmerId = "ma" | "ko";
export type NpcFarmAction = "hoe" | "plant" | "water" | "harvest" | "clear" | "sell";

export interface NpcFarmWaypoint {
  x: number;
  y: number;
  wait: number;
  animation: "hoe" | "plant" | "water" | "harvest" | "clear" | "market";
  farmAction: NpcFarmAction;
  farmTileIndex?: number;
}

interface NpcFarmTileSave {
  soil: boolean;
  planted: boolean;
  watered: boolean;
  growth: number;
  dryDays: number;
  dead: boolean;
}

interface NpcFarmTile extends NpcFarmTileSave {
  x: number;
  y: number;
  base: Phaser.GameObjects.Image;
  crop: Phaser.GameObjects.Image;
}

interface NpcFarmPlot {
  owner: NpcFarmerId;
  x: number;
  y: number;
  tiles: NpcFarmTile[];
  pendingSale: boolean;
  storedRice: number;
  day: number;
}

export interface NpcFarmsSaveData {
  day: number;
  plots: Record<NpcFarmerId, {
    pendingSale: boolean;
    storedRice: number;
    tiles: NpcFarmTileSave[];
  }>;
}

/**
 * Autonomous farm plots for Ko Aung and Ma Thiri. They use the exact same
 * 5x3 tile dimensions, terrain textures and rice growth stages as the player.
 * VillageSystem supplies the NPC movement route and calls completeTask when
 * the villager reaches each tile.
 */
export class NpcFarmingSystem {
  private scene: Phaser.Scene;
  private language: LanguageSystem;
  private plots = new Map<NpcFarmerId, NpcFarmPlot>();
  private day = 1;
  private readonly columns = 5;
  private readonly rows = 3;
  private readonly matureGrowth = 3;

  constructor(scene: Phaser.Scene, language: LanguageSystem) {
    this.scene = scene;
    this.language = language;
    this.createPlot("ma");
    this.createPlot("ko");
  }

  private createPlot(owner: NpcFarmerId): void {
    const origin = NPC_FARM_PLOTS[owner];
    const tiles: NpcFarmTile[] = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const x = origin.x + col * 32;
        const y = origin.y + row * 32;
        const base = this.scene.add.image(x, y, "tile_plot")
          .setOrigin(0, 0).setScale(2).setDepth(15);
        const crop = this.scene.add.image(x + 16, y + 30, "crop_0")
          .setOrigin(0.5, 1).setScale(2).setDepth(y + 31).setVisible(false);
        tiles.push({
          x, y, soil: false, planted: false, watered: false,
          growth: 0, dryDays: 0, dead: false, base, crop
        });
      }
    }

    this.plots.set(owner, {
      owner, x: origin.x, y: origin.y, tiles,
      pendingSale: false, storedRice: 0, day: this.day
    });
    for (const tile of tiles) this.drawTile(tile);
  }

  private drawTile(tile: NpcFarmTile): void {
    if (!tile.soil) tile.base.setTexture("tile_plot");
    else tile.base.setTexture(tile.watered ? "tile_wet" : "tile_tilled");

    if (!tile.planted) {
      tile.crop.clearTint().setAlpha(1).setVisible(false);
      return;
    }

    if (tile.dead) {
      tile.crop.setTexture("crop_3").setTint(0x75604b).setAlpha(0.88).setVisible(true);
    } else {
      tile.crop.setTexture(`crop_${Phaser.Math.Clamp(tile.growth, 0, 3)}`)
        .setAlpha(1).setVisible(true);
      if (tile.dryDays > 0) tile.crop.setTint(0xb99567);
      else tile.crop.clearTint();
    }
  }

  /** Build the day's ordered work list in a snake pattern across the plot. */
  getDailyWorkRoute(owner: NpcFarmerId): NpcFarmWaypoint[] {
    const plot = this.plots.get(owner);
    if (!plot || plot.pendingSale) return [];

    const order: number[] = [];
    for (let row = 0; row < this.rows; row++) {
      const cols = row % 2 === 0
        ? [0, 1, 2, 3, 4]
        : [4, 3, 2, 1, 0];
      for (const col of cols) order.push(row * this.columns + col);
    }

    const tasks: NpcFarmWaypoint[] = [];
    const add = (index: number, action: NpcFarmAction): void => {
      const tile = plot.tiles[index];
      const animation = action === "clear" ? "clear" : action === "sell" ? "market" : action;
      const wait = action === "hoe" ? 0.24
        : action === "plant" ? 0.24
        : action === "water" ? 0.28
        : action === "harvest" ? 0.28 : 0.22;
      tasks.push({
        x: tile.x + 16,
        // Keep the villager's feet inside the tile row, clear of the bottom fence.
        y: tile.y + 6,
        wait,
        animation,
        farmAction: action,
        farmTileIndex: index
      });
    };

    // If a save is loaded midway through harvesting, finish the existing crop
    // batch first. Do not plant already-picked tiles until that batch is sold.
    if (plot.storedRice > 0) {
      for (const index of order) {
        const tile = plot.tiles[index];
        if (tile.dead) add(index, "clear");
        else if (tile.planted && tile.growth >= this.matureGrowth) add(index, "harvest");
      }
      return tasks;
    }

    // Work each tile in order: clear/prepare, sow, water. This keeps the NPC
    // moving in one continuous snake through the plot instead of walking back
    // and forth for three separate passes over the same rows.
    for (const index of order) {
      const tile = plot.tiles[index];
      if (tile.dead) {
        // Dead crops clear without producing rice. Replant on the next visit.
        add(index, "clear");
        continue;
      }
      if (tile.planted && tile.growth >= this.matureGrowth) {
        add(index, "harvest");
        continue;
      }
      if (!tile.soil) add(index, "hoe");
      if (!tile.planted) add(index, "plant");
      if ((!tile.planted || tile.growth < this.matureGrowth) && !tile.watered) {
        add(index, "water");
      }
    }
    return tasks;
  }

  completeTask(owner: NpcFarmerId, index: number, action: NpcFarmAction): void {
    const plot = this.plots.get(owner);
    if (!plot) return;
    const tile = plot.tiles[index];
    if (!tile) return;

    if (action === "hoe" && !tile.soil) {
      tile.soil = true;
      this.playEffect(tile, "fx_dust", "hoe");
    } else if (action === "plant" && tile.soil && !tile.planted) {
      tile.planted = true;
      tile.watered = false;
      tile.growth = 0;
      tile.dryDays = 0;
      tile.dead = false;
      this.playEffect(tile, "fx_dust", "plant");
    } else if (action === "water" && tile.planted && !tile.dead && tile.growth < this.matureGrowth) {
      tile.watered = true;
      tile.dryDays = 0;
      this.playEffect(tile, "fx_splash", "water");
    } else if (action === "harvest" && tile.planted && !tile.dead && tile.growth >= this.matureGrowth) {
      tile.planted = false;
      tile.watered = false;
      tile.growth = 0;
      tile.dryDays = 0;
      plot.storedRice += 3;
      this.playEffect(tile, "fx_sparkle", "harvest");
    } else if (action === "clear" && tile.planted && tile.dead) {
      tile.planted = false;
      tile.watered = false;
      tile.growth = 0;
      tile.dryDays = 0;
      tile.dead = false;
      this.playEffect(tile, "fx_dust", "clear");
    }

    this.drawTile(tile);
    if (plot.storedRice > 0 && plot.tiles.every(item => !item.planted)) {
      plot.pendingSale = true;
    }
  }

  hasSalePending(owner: NpcFarmerId): boolean {
    return this.plots.get(owner)?.pendingSale === true;
  }

  /** Called when the NPC finishes the market visit after harvesting. */
  completeMarketSale(owner: NpcFarmerId): number {
    const plot = this.plots.get(owner);
    if (!plot || !plot.pendingSale || plot.storedRice <= 0) return 0;
    const sold = plot.storedRice;
    plot.storedRice = 0;
    plot.pendingSale = false;
    for (const tile of plot.tiles) {
      tile.soil = false;
      tile.planted = false;
      tile.watered = false;
      tile.growth = 0;
      tile.dryDays = 0;
      tile.dead = false;
      this.drawTile(tile);
    }
    this.scene.events.emit("sound-effect", { name: "sell", x: plot.tiles[0]?.x ?? 570, y: plot.tiles[0]?.y ?? 220, maxDistance: 220 });
    const ownerName = this.language.t(owner === "ma" ? "village.maThiri" : "village.koAung");
    const label = this.scene.add.text(570, 218, this.language.t("npcFarm.sold", { name: ownerName, amount: sold }), {
      fontFamily: this.language.getFontFamily(),
      fontSize: uiFontSize(10),
      color: "#ffe070",
      backgroundColor: "#2a1a14",
      padding: { x: 5, y: 3 },
      stroke: "#2a1a14",
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(650);
    this.scene.tweens.add({
      targets: label,
      y: 194,
      alpha: 0,
      duration: 1800,
      onComplete: () => label.destroy()
    });
    return sold;
  }

  private playEffect(tile: NpcFarmTile, texture: "fx_dust" | "fx_splash" | "fx_sparkle", sound: string): void {
    this.scene.events.emit("sound-effect", { name: sound, x: tile.x + 16, y: tile.y + 17, maxDistance: 210 });
    const fx = this.scene.add.sprite(tile.x + 16, tile.y + 17, texture, 0)
      .setScale(2).setDepth(tile.y + 80);
    fx.anims.play(`${texture}-play`);
    fx.once("animationcomplete", () => fx.destroy());
  }

  /** Process each elapsed 24-hour village day exactly once. */
  syncGameDay(gameDay: number): void {
    const target = Math.max(1, Math.floor(Number(gameDay) || 1));
    while (this.day < target) {
      this.day++;
      for (const plot of this.plots.values()) {
        plot.day = this.day;
        for (const tile of plot.tiles) {
          if (!tile.planted || tile.dead) {
            tile.watered = false;
            continue;
          }
          if (tile.growth >= this.matureGrowth) {
            tile.watered = false;
            tile.dryDays = 0;
            continue;
          }
          if (tile.watered) {
            tile.growth = Math.min(this.matureGrowth, tile.growth + 1);
            tile.dryDays = 0;
          } else {
            tile.dryDays++;
            if (tile.dryDays >= 2) tile.dead = true;
          }
          tile.watered = false;
          this.drawTile(tile);
        }
      }
    }
  }

  getSaveData(): NpcFarmsSaveData {
    const plots = {} as NpcFarmsSaveData["plots"];
    for (const owner of ["ma", "ko"] as const) {
      const plot = this.plots.get(owner)!;
      plots[owner] = {
        pendingSale: plot.pendingSale,
        storedRice: plot.storedRice,
        tiles: plot.tiles.map(({ soil, planted, watered, growth, dryDays, dead }) => ({
          soil, planted, watered, growth, dryDays, dead
        }))
      };
    }
    return { day: this.day, plots };
  }

  loadSaveData(data?: NpcFarmsSaveData): void {
    if (!data || !data.plots) return;
    this.day = Math.max(1, Math.floor(Number(data.day) || 1));
    for (const owner of ["ma", "ko"] as const) {
      const plot = this.plots.get(owner)!;
      const saved = data.plots[owner];
      if (!saved) continue;
      plot.pendingSale = saved.pendingSale === true;
      plot.storedRice = Math.max(0, Math.floor(Number(saved.storedRice) || 0));
      for (let i = 0; i < plot.tiles.length; i++) {
        const tile = plot.tiles[i];
        const source = saved.tiles?.[i];
        if (!source) continue;
        tile.soil = source.soil === true;
        tile.planted = tile.soil && source.planted === true;
        tile.watered = tile.planted && source.watered === true;
        tile.growth = tile.planted ? Phaser.Math.Clamp(Math.floor(Number(source.growth) || 0), 0, this.matureGrowth) : 0;
        tile.dryDays = tile.planted ? Phaser.Math.Clamp(Math.floor(Number(source.dryDays) || 0), 0, 2) : 0;
        tile.dead = tile.planted && source.dead === true;
        this.drawTile(tile);
      }
    }
  }
}
