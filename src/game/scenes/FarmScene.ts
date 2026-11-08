import Phaser from "phaser";
import { FarmingSystem } from "../systems/FarmingSystem";
import { MarketSystem } from "../systems/MarketSystem";
import { VillageSystem } from "../systems/VillageSystem";
import { InventorySystem } from "../systems/InventorySystem";
import { CraftingSystem } from "../systems/CraftingSystem";
import { SaveSystem } from "../systems/SaveSystem";
import { PlayerProfileSystem } from "../systems/PlayerProfileSystem";
import { ModalUIManager } from "../systems/ModalUIManager";
import { LanguageSystem } from "../systems/LanguageSystem";
import { HelpSystem } from "../systems/HelpSystem";
import { MusicSystem } from "../systems/MusicSystem";
import { PIXEL_FONT, pixelPanel } from "../ui/PixelUI";

const WORLD_WIDTH = 1440;
const WORLD_HEIGHT = 640;
const PLAYER_SPEED = 125;
/** Art is authored at 16px tiles and shown at 2x (32px world tiles). */
const PIXEL_SCALE = 2;

type Obstacle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

interface Wanderer {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  kind: "chicken" | "duck" | "water_buffalo";
  rect: { x1: number; y1: number; x2: number; y2: number };
  speed: number;
  state: "idle" | "walk";
  timer: number;
  tx: number;
  ty: number;
}

interface Butterfly {
  sprite: Phaser.GameObjects.Sprite;
  angle: number;
  speed: number;
}

export class FarmScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private facing: "down" | "up" | "side" = "down";
  private animals: Wanderer[] = [];
  private butterflies: Butterfly[] = [];
  private riceClumps: Phaser.GameObjects.Image[] = [];
  private farming!: FarmingSystem;
  private market!: MarketSystem;
  private village!: VillageSystem;
  private inventory!: InventorySystem;
  private crafting!: CraftingSystem;
  public saveSystem!: SaveSystem;
  private profile!: PlayerProfileSystem;
  private ui!: ModalUIManager;
  private language!: LanguageSystem;
  private help!: HelpSystem;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private obstacles: Obstacle[] = [];
  private worldLabels: { text: Phaser.GameObjects.Text; key: string }[] = [];
  private fullscreenButton!: Phaser.GameObjects.Rectangle;
  private fullscreenIcon!: Phaser.GameObjects.Text;
  private isTouchDevice = false;
  private joystickPointerId: number | null = null;
  private joystickVector = { x: 0, y: 0 };
  private joystickNub?: Phaser.GameObjects.Arc;
  private readonly joystickCenter = { x: 76, y: 267 };

  constructor() {
    super("FarmScene");
  }

  preload(): void {
    const imageAssets: [string, string][] = [
      ["world_ground", "/assets/terrain/village_ground_base.png"],
      ["player_home_asset", "/assets/buildings/player_home.png"],
      ["ma_home_asset", "/assets/buildings/ma_thiri_home.png"],
      ["ko_home_asset", "/assets/buildings/ko_aung_home.png"],
      ["granary_asset", "/assets/buildings/rice_granary.png"],
      ["monastery_asset", "/assets/buildings/village_monastery.png"],
      ["pagoda_asset", "/assets/buildings/golden_pagoda.png"],
      ["lotus_pond_asset", "/assets/water/lotus_pond.png"],
      ["bridge_asset", "/assets/water/wooden_bridge_asset.png"],
      ["fruit_tree_round", "/assets/vegetation/fruit_tree_round.png"],
      ["fruit_tree_large", "/assets/vegetation/fruit_tree_large.png"],
      ["palm_tree_tall", "/assets/vegetation/palm_tree_tall.png"],
      ["palm_tree_small", "/assets/vegetation/palm_tree_small.png"],
      ["banana_plant_asset", "/assets/vegetation/banana_plant.png"],
      ["bamboo_clump_asset", "/assets/vegetation/bamboo_clump.png"],
      ["vegetable_bed_asset", "/assets/decorations/raised_vegetable_bed.png"],
      ["flower_bed_asset", "/assets/decorations/flower_bed.png"],
      ["potted_plants_asset", "/assets/decorations/potted_plants_row.png"],
      ["irrigation_asset", "/assets/decorations/irrigation_channel.png"],
      ["bamboo_fence_asset", "/assets/decorations/bamboo_fence_segment.png"],
      ["fence_h_asset", "/assets/decorations/fence_h.png"],
      ["fence_v_asset", "/assets/decorations/fence_v.png"],
      ["bamboo_planter_asset", "/assets/decorations/bamboo_planter.png"],
      ["village_sign_asset", "/assets/decorations/village_sign.png"],
      ["water_jar_asset", "/assets/decorations/water_jar.png"],
      ["drying_mat_asset", "/assets/decorations/rice_drying_mat.png"],
      ["haystack_asset", "/assets/agriculture/haystack.png"],
      ["rice_bundle_asset", "/assets/agriculture/rice_bundle.png"],
      ["rice_plant_01", "/assets/agriculture/young_rice_plant_01.png"],
      ["rice_plant_02", "/assets/agriculture/young_rice_plant_02.png"],
      ["rice_plant_03", "/assets/agriculture/young_rice_plant_03.png"],
      ["crop_0", "/assets/agriculture/rice_stage_0.png"],
      ["crop_1", "/assets/agriculture/rice_stage_1.png"],
      ["crop_2", "/assets/agriculture/rice_stage_2.png"],
      ["crop_3", "/assets/agriculture/rice_stage_3.png"],
      ["scarecrow_asset", "/assets/agriculture/scarecrow.png"],
      ["tile_plot", "/assets/terrain/farm_plot.png"],
      ["tile_tilled", "/assets/terrain/tilled_soil.png"],
      ["tile_wet", "/assets/terrain/tilled_soil_wet.png"],
      ["market_stall_asset", "/assets/buildings/market_stall.png"],
      ["crafting_workbench_asset", "/assets/buildings/crafting_workbench.png"],
      ["wood_bundle_asset", "/assets/resources/wood_bundle.png"],
      ["bamboo_bundle_asset", "/assets/resources/bamboo_bundle.png"],
      ["herb_bunch_asset", "/assets/resources/herb_bunch.png"],
      ["coconut_asset", "/assets/resources/coconut.png"],
      ["rice_bowl_asset", "/assets/agriculture/rice_bowl.png"],
      ["rice_seed_bag_asset", "/assets/tools/rice_seed_bag.png"],
      ["hoe_asset", "/assets/tools/hoe.png"],
      ["watering_can_asset", "/assets/tools/watering_can.png"],
      ["sickle_asset", "/assets/tools/sickle.png"],
      ["coin_asset", "/assets/ui/coin.png"],
      ["ui_slot", "/assets/ui/slot.png"],
      ["ui_slot_selected", "/assets/ui/slot_selected.png"],
      // portraits (idle front frame) used by menus
      ["farmer_green_asset", "/assets/characters/farmer_green.png"],
      ["farmer_blue_asset", "/assets/characters/farmer_blue.png"],
      ["farmer_red_asset", "/assets/characters/farmer_red.png"],
      ["farmer_purple_asset", "/assets/characters/farmer_purple.png"],
      ["ma_thiri_asset", "/assets/characters/ma_thiri.png"],
      ["ko_aung_asset", "/assets/characters/ko_aung.png"]
    ];

    for (const [key, path] of imageAssets) {
      this.load.image(key, path);
    }

    // [key, path, frameWidth, frameHeight]
    const sheets: [string, string, number, number][] = [
      ["farmer_green_sheet", "/assets/characters/farmer_green_sheet.png", 16, 26],
      ["farmer_blue_sheet", "/assets/characters/farmer_blue_sheet.png", 16, 26],
      ["farmer_red_sheet", "/assets/characters/farmer_red_sheet.png", 16, 26],
      ["farmer_purple_sheet", "/assets/characters/farmer_purple_sheet.png", 16, 26],
      ["ma_thiri_sheet", "/assets/characters/ma_thiri_sheet.png", 16, 26],
      ["ko_aung_sheet", "/assets/characters/ko_aung_sheet.png", 16, 26],
      ["chicken_sheet", "/assets/animals/chicken_sheet.png", 16, 16],
      ["duck_sheet", "/assets/animals/duck_sheet.png", 16, 16],
      ["water_buffalo_sheet", "/assets/animals/water_buffalo_sheet.png", 44, 30],
      ["fx_dust", "/assets/fx/dust.png", 16, 16],
      ["fx_splash", "/assets/fx/splash.png", 16, 16],
      ["fx_sparkle", "/assets/fx/sparkle.png", 16, 16],
      ["water_glint", "/assets/fx/water_glint.png", 8, 8],
      ["butterfly_yellow", "/assets/fx/butterfly_yellow.png", 8, 8],
      ["butterfly_white", "/assets/fx/butterfly_white.png", 8, 8]
    ];

    for (const [key, path, frameWidth, frameHeight] of sheets) {
      this.load.spritesheet(key, path, { frameWidth, frameHeight });
    }
  }

  create(): void {
    this.language = new LanguageSystem();
    this.createAnimations();
    this.createWorld();
    this.createPlayer();
    this.createControls();
    this.createCamera();

    this.ui = new ModalUIManager(this);
    this.help = new HelpSystem(this, this.ui, this.language);
    this.createHUD();
    new MusicSystem(this, this.ui);

    this.farming = new FarmingSystem(this, this.ui, this.language);
    this.market = new MarketSystem(this, this.farming, this.ui, this.language);
    this.village = new VillageSystem(
      this,
      this.ui,
      this.language,
      (x, y) => this.canMoveTo(x, y)
    );
    this.inventory = new InventorySystem(this, this.farming, this.ui, this.language);
    this.crafting = new CraftingSystem(this, this.inventory, this.ui, this.language);
    this.profile = new PlayerProfileSystem(this, this.player, this.ui, this.language);

    this.saveSystem = new SaveSystem(
      this,
      this.player,
      this.farming,
      this.market,
      this.inventory,
      this.crafting,
      this.village,
      this.profile,
      this.ui,
      this.language
    );

    this.createTouchControls();
  }

  // ------------------------------------------------------------------
  // Animations
  // ------------------------------------------------------------------
  private createAnimations(): void {
    const make = (
      key: string,
      sheet: string,
      frames: number[],
      frameRate: number,
      repeat = -1
    ): void => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(sheet, { frames }),
        frameRate,
        repeat
      });
    };

    const people = [
      "farmer_green_sheet", "farmer_blue_sheet", "farmer_red_sheet",
      "farmer_purple_sheet", "ma_thiri_sheet", "ko_aung_sheet"
    ];
    for (const sheet of people) {
      make(`${sheet}-down`, sheet, [0, 1, 2, 3], 8);
      make(`${sheet}-up`, sheet, [4, 5, 6, 7], 8);
      make(`${sheet}-side`, sheet, [8, 9, 10, 11], 8);
    }

    make("chicken-walk", "chicken_sheet", [0, 2], 6);
    make("chicken-peck", "chicken_sheet", [0, 1, 1, 0], 5);
    make("duck-walk", "duck_sheet", [0, 1, 0, 2], 5);
    make("duck-idle", "duck_sheet", [0], 1);
    make("water_buffalo-walk", "water_buffalo_sheet", [0, 1, 2, 3], 4);
    make("water_buffalo-idle", "water_buffalo_sheet", [0], 1);

    make("fx_dust-play", "fx_dust", [0, 1, 2, 3], 12, 0);
    make("fx_splash-play", "fx_splash", [0, 1, 2, 3], 12, 0);
    make("fx_sparkle-play", "fx_sparkle", [0, 1, 2, 3], 10, 0);
    make("water_glint-play", "water_glint", [0, 1, 2, 3], 4, -1);
    make("butterfly_yellow-flap", "butterfly_yellow", [0, 1], 10);
    make("butterfly_white-flap", "butterfly_white", [0, 1], 10);
  }

  // ------------------------------------------------------------------
  // World
  // ------------------------------------------------------------------
  /** Places a 2x pixel-art prop with its feet at (x, y). */
  private prop(texture: string, x: number, y: number, depth?: number): Phaser.GameObjects.Image {
    return this.add.image(x, y, texture)
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE)
      .setDepth(depth ?? y);
  }

  private createWorld(): void {
    this.obstacles = [];
    this.worldLabels = [];

    // The ground (grass, dirt roads, canal, paddy bund, plaza) is one hand-painted map.
    this.add.image(0, 0, "world_ground")
      .setOrigin(0, 0)
      .setScale(PIXEL_SCALE)
      .setDepth(-100);

    this.drawCanal();
    this.drawRiceField();
    this.drawFarmhouse();
    this.drawGranary();
    this.drawWaterJars();
    this.drawRiceDryingArea();
    this.drawVegetableGarden();
    this.drawFarmPlotFence();
    this.drawScarecrow();
    this.drawAgricultureDecorations();
    this.drawBambooGrove();
    this.drawMonastery();
    this.drawLotusPond();
    this.drawTrees();
    this.drawBananaPlants();
    this.addBuildingCollisions();
    this.createWorldLabels();
    this.spawnAnimals();
    this.spawnButterflies();
  }

  private drawFarmhouse(): void {
    this.prop("player_home_asset", 190, 250);
    this.prop("potted_plants_asset", 75, 480);
  }

  private drawGranary(): void {
    this.prop("granary_asset", 355, 165);
  }

  private drawWaterJars(): void {
    this.prop("water_jar_asset", 285, 243);
    this.prop("water_jar_asset", 312, 243);
  }

  private drawRiceDryingArea(): void {
    this.prop("drying_mat_asset", 710, 500);
  }

  private drawRiceField(): void {
    const x = 425;
    const y = 330;
    const textures = ["rice_plant_01", "rice_plant_02", "rice_plant_03"];

    for (let row = 0; row < 6; row++) {
      const plantY = y + 24 + row * 22;
      for (let col = 0; col < 8; col++) {
        const plantX = x + 24 + col * 29;
        const clump = this.add.image(plantX, plantY, textures[(row + col) % textures.length])
          .setOrigin(0.5, 0.85)
          .setScale(PIXEL_SCALE)
          .setDepth(plantY + 1)
          .setFlipX((row + col) % 2 === 0);
        this.riceClumps.push(clump);
      }
    }

    // Wind through the paddy: a few clumps flip each beat (pixel-friendly "sway").
    this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => {
        for (const clump of this.riceClumps) {
          if (Math.random() < 0.22) clump.setFlipX(!clump.flipX);
        }
      }
    });
  }

  private drawCanal(): void {
    this.prop("bridge_asset", 1056, 594, 560);

    // twinkling highlights on the water
    for (let i = 0; i < 46; i++) {
      const gx = Phaser.Math.Between(12, WORLD_WIDTH - 12);
      const gy = Phaser.Math.Between(542, 584);
      if (gx > 1000 && gx < 1112) continue;
      const glint = this.add.sprite(gx, gy, "water_glint", 0)
        .setScale(PIXEL_SCALE)
        .setDepth(6);
      glint.anims.play({
        key: "water_glint-play",
        repeat: -1,
        delay: Phaser.Math.Between(0, 3500),
        repeatDelay: Phaser.Math.Between(1800, 4200)
      });
    }
  }

  private drawVegetableGarden(): void {
    this.prop("vegetable_bed_asset", 125, 448);
  }

  private drawFarmPlotFence(): void {
    const horizontal = (x1: number, x2: number, bottomY: number): void => {
      for (let x = x1; x < x2; x += 16) {
        this.add.image(x, bottomY, "fence_h_asset")
          .setOrigin(0, 1)
          .setScale(PIXEL_SCALE)
          .setDepth(bottomY);
      }
    };
    const vertical = (cx: number, y1: number, y2: number): void => {
      for (let y = y1; y < y2; y += 16) {
        this.add.image(cx, y, "fence_v_asset")
          .setOrigin(0.5, 0)
          .setScale(PIXEL_SCALE)
          .setDepth(y + 20);
      }
    };

    horizontal(250, 300, 358);
    horizontal(360, 428, 358);
    horizontal(250, 428, 471);
    vertical(254, 358, 462);
    vertical(426, 358, 462);
  }

  private drawScarecrow(): void {
    this.prop("scarecrow_asset", 222, 432);
  }

  private drawAgricultureDecorations(): void {
    this.prop("haystack_asset", 790, 477);
    this.prop("rice_bundle_asset", 710, 478);
    this.prop("irrigation_asset", 825, 506, 505);
    this.prop("flower_bed_asset", 1135, 470);
  }

  private drawBambooGrove(): void {
    const clumps: [number, number][] = [[885, 396], [930, 412], [975, 398], [908, 372]];
    for (const [x, y] of clumps) {
      this.prop("bamboo_clump_asset", x, y);
      this.obstacles.push({ x: x - 16, y: y - 16, width: 32, height: 18 });
    }
  }

  private drawMonastery(): void {
    this.prop("monastery_asset", 1227, 235);
    this.prop("pagoda_asset", 1385, 222);
    this.obstacles.push({ x: 1362, y: 168, width: 46, height: 54 });
  }

  private drawLotusPond(): void {
    this.add.image(1285, 440, "lotus_pond_asset")
      .setOrigin(0.5)
      .setScale(PIXEL_SCALE)
      .setDepth(440);
  }

  private drawTrees(): void {
    this.placeTree("palm_tree_tall", 65, 220);
    this.placeTree("fruit_tree_round", 930, 230);
    this.placeTree("fruit_tree_large", 1035, 240);
    this.placeTree("palm_tree_small", 1120, 232);

    // framing trees along the northern edge of the village
    this.placeTree("palm_tree_tall", 235, 72);
    this.placeTree("fruit_tree_round", 30, 84);
    this.placeTree("fruit_tree_round", 440, 76);
    this.placeTree("palm_tree_tall", 575, 70);
    this.placeTree("fruit_tree_large", 880, 80);
    this.placeTree("palm_tree_tall", 1045, 68);
    this.placeTree("fruit_tree_round", 1440 - 60, 396);
    this.placeTree("palm_tree_small", 560, 520 - 2);
  }

  private placeTree(texture: string, x: number, y: number): void {
    this.prop(texture, x, y);
    this.obstacles.push({ x: x - 8, y: y - 25, width: 16, height: 30 });
  }

  private drawBananaPlants(): void {
    for (const [x, y] of [[78, 264], [352, 262], [1160, 300]] as [number, number][]) {
      this.prop("banana_plant_asset", x, y);
      this.obstacles.push({ x: x - 10, y: y - 14, width: 20, height: 16 });
    }
  }

  private addBuildingCollisions(): void {
    this.obstacles.push(
      { x: 103, y: 93, width: 174, height: 157 },
      { x: 305, y: 81, width: 100, height: 84 },
      { x: 750, y: 125, width: 140, height: 125 },
      { x: 630, y: 30, width: 130, height: 118 },
      { x: 500, y: 155, width: 140, height: 105 },
      { x: 375, y: 176, width: 120, height: 84 },
      { x: 1160, y: 87, width: 135, height: 145 },
      { x: 1198, y: 373, width: 174, height: 134 },
      { x: 48, y: 385, width: 154, height: 65 },
      { x: 215, y: 414, width: 14, height: 18 },
      { x: 760, y: 430, width: 60, height: 46 },
      { x: 425, y: 330, width: 273, height: 144 },
      { x: 1080, y: 412, width: 110, height: 58 }
    );

    this.obstacles.push(
      { x: 250, y: 343, width: 50, height: 11 },
      { x: 360, y: 343, width: 68, height: 11 },
      { x: 246, y: 347, width: 11, height: 120 },
      { x: 420, y: 347, width: 11, height: 120 },
      { x: 250, y: 460, width: 178, height: 11 }
    );
  }

  private createWorldLabels(): void {
    this.addWorldLabel(930, 296, "world.bambooGrove");
    this.addWorldLabel(1227, 70, "world.monastery");
    this.addWorldLabel(1285, 355, "world.lotusPond");

    this.language.onChange(() => {
      for (const item of this.worldLabels) {
        item.text.setText(this.language.t(item.key));
        item.text.setFontFamily(this.language.getFontFamily());
      }
    });
  }

  private addWorldLabel(x: number, y: number, key: string): void {
    const text = this.add.text(x, y, this.language.t(key), {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#fff3d3",
      backgroundColor: "#2a1a14",
      padding: { x: 5, y: 3 }
    }).setOrigin(0.5).setDepth(5000);

    this.worldLabels.push({ text, key });
  }

  // ------------------------------------------------------------------
  // Living world: wandering animals + butterflies
  // ------------------------------------------------------------------
  private spawnAnimals(): void {
    const add = (
      kind: Wanderer["kind"],
      x: number,
      y: number,
      rect: Wanderer["rect"],
      speed: number,
      shadowW: number
    ): void => {
      const sheetKey = kind === "water_buffalo" ? "water_buffalo_sheet" : `${kind}_sheet`;
      const shadow = this.add.ellipse(x, y - 1, shadowW, Math.max(5, shadowW / 4), 0x1d3015, 0.35)
        .setDepth(y - 0.5);
      const sprite = this.add.sprite(x, y, sheetKey, 0)
        .setOrigin(0.5, 1)
        .setScale(PIXEL_SCALE)
        .setDepth(y);
      this.animals.push({
        sprite, shadow, kind, rect, speed,
        state: "idle",
        timer: Phaser.Math.FloatBetween(0.2, 3),
        tx: x,
        ty: y
      });
      this.playIdle(this.animals[this.animals.length - 1]);
    };

    const yard = { x1: 70, y1: 280, x2: 340, y2: 312 };
    for (const [x, y] of [[120, 292], [170, 304], [245, 288], [300, 306]]) {
      add("chicken", x, y, yard, 16, 18);
    }

    const canal = { x1: 60, y1: 556, x2: 520, y2: 584 };
    for (const [x, y] of [[200, 566], [255, 572], [420, 562]]) {
      add("duck", x, y, canal, 12, 20);
    }

    add("water_buffalo", 790, 404, { x1: 742, y1: 372, x2: 872, y2: 440 }, 9, 64);
  }

  private playIdle(animal: Wanderer): void {
    if (animal.kind === "chicken") animal.sprite.anims.play("chicken-peck", true);
    else if (animal.kind === "duck") animal.sprite.anims.play("duck-idle", true);
    else animal.sprite.anims.play("water_buffalo-idle", true);
  }

  private updateAnimals(delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    for (const animal of this.animals) {
      const sprite = animal.sprite;
      animal.timer -= dt;

      if (animal.state === "idle") {
        if (animal.timer <= 0) {
          animal.tx = Phaser.Math.Between(animal.rect.x1, animal.rect.x2);
          animal.ty = Phaser.Math.Between(animal.rect.y1, animal.rect.y2);
          animal.state = "walk";
          animal.timer = Phaser.Math.FloatBetween(2, 5);
          sprite.anims.play(`${animal.kind}-walk`, true);
        }
        continue;
      }

      const dx = animal.tx - sprite.x;
      const dy = animal.ty - sprite.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 2 || animal.timer <= 0) {
        animal.state = "idle";
        animal.timer = Phaser.Math.FloatBetween(1.5, 4.5);
        this.playIdle(animal);
        continue;
      }

      const step = Math.min(distance, animal.speed * dt);
      sprite.x += (dx / distance) * step;
      sprite.y += (dy / distance) * step;
      if (Math.abs(dx) > 1) sprite.setFlipX(dx < 0);
      sprite.setDepth(sprite.y);
      animal.shadow.setPosition(sprite.x, sprite.y - 1).setDepth(sprite.y - 0.5);
    }
  }

  private spawnButterflies(): void {
    const spots: [number, number, string][] = [
      [520, 120, "butterfly_yellow"], [760, 235, "butterfly_white"],
      [170, 400, "butterfly_yellow"], [990, 310, "butterfly_white"],
      [1260, 330, "butterfly_yellow"], [600, 500, "butterfly_white"]
    ];
    for (const [x, y, key] of spots) {
      const sprite = this.add.sprite(x, y, key, 0).setScale(PIXEL_SCALE).setDepth(7000);
      sprite.anims.play(`${key}-flap`);
      this.butterflies.push({
        sprite,
        angle: Phaser.Math.FloatBetween(0, Math.PI * 2),
        speed: Phaser.Math.FloatBetween(14, 24)
      });
    }
  }

  private updateButterflies(delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    for (const b of this.butterflies) {
      b.angle += Phaser.Math.FloatBetween(-2.2, 2.2) * dt;
      const sprite = b.sprite;
      let nx = sprite.x + Math.cos(b.angle) * b.speed * dt;
      let ny = sprite.y + Math.sin(b.angle) * b.speed * dt * 0.7;
      if (nx < 20 || nx > WORLD_WIDTH - 20 || ny < 20 || ny > 500) {
        b.angle += Math.PI;
        nx = Phaser.Math.Clamp(nx, 20, WORLD_WIDTH - 20);
        ny = Phaser.Math.Clamp(ny, 20, 500);
      }
      sprite.setPosition(nx, ny);
      sprite.setFlipX(Math.cos(b.angle) < 0);
    }
  }

  private createPlayer(): void {
    this.player = this.add.container(320, 330);

    const shadow = this.add.ellipse(0, 19, 22, 7, 0x1d3015, 0.38);
    const sprite = this.add.sprite(0, 22, "farmer_green_sheet", 0)
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE)
      .setName("farmerSprite");

    this.playerSprite = sprite;
    this.player.add([shadow, sprite]);
    this.player.setDepth(this.player.y + 30);
  }

  private animatePlayer(moveX: number, moveY: number, moving: boolean): void {
    const sprite = this.playerSprite;
    if (moving) {
      if (Math.abs(moveX) > Math.abs(moveY) + 0.01) {
        this.facing = "side";
        sprite.setFlipX(moveX < 0);
      } else if (Math.abs(moveY) > 0) {
        this.facing = moveY < 0 ? "up" : "down";
      }
      sprite.anims.play(`${sprite.texture.key}-${this.facing}`, true);
    } else {
      sprite.anims.stop();
      sprite.setFrame(this.facing === "down" ? 0 : this.facing === "up" ? 4 : 8);
    }
  }

  private createControls(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.wasd;
  }

  private createCamera(): void {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  private createHUD(): void {
    const titleBackground = pixelPanel(this, 142, 33.5, 260, 43).setDepth(100);

    const title = this.add.text(22, 18, "FIELDS OF THE IRRAWADDY", {
      fontFamily: PIXEL_FONT, fontSize: "12px", color: "#f2e6c5", fontStyle: "bold"
    }).setScrollFactor(0).setDepth(101);

    const subtitle = this.add.text(22, 36, "မြန်မာ့ကျေးလက်ဘဝ", {
      fontFamily: "Noto Sans Myanmar, Myanmar Text, sans-serif", fontSize: "10px", color: "#e6c47e"
    }).setScrollFactor(0).setDepth(101);

    const movementBackground = pixelPanel(this, 116.5, 338.5, 213, 25).setDepth(100);

    const movementText = this.add.text(18, 334, "MOVE: WASD / ARROWS  ·  H: HELP", {
      fontFamily: PIXEL_FONT, fontSize: "8px", color: "#f2e6c5"
    }).setScrollFactor(0).setDepth(101);

    this.isTouchDevice = ("ontouchstart" in window) || navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches;
    if (this.isTouchDevice) {
      movementBackground.setVisible(false);
      movementText.setVisible(false);
    }

    this.ui.registerHud(titleBackground, title, subtitle, movementBackground, movementText);

    if (!this.isTouchDevice) {
      const helpButton = this.add.rectangle(572, 88, 54, 25, 0x40513a, 0.98)
        .setStrokeStyle(1, 0xd6b36b)
        .setScrollFactor(0)
        .setDepth(8500)
        .setInteractive({ useHandCursor: true });
      const helpLabel = this.add.text(572, 88, "HELP  H", {
        fontFamily: PIXEL_FONT,
        fontSize: "9px",
        color: "#fff1cf",
        fontStyle: "bold"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(8501);
      helpButton.on("pointerdown", () => this.help.mobileToggle());
      helpButton.on("pointerover", () => helpButton.setFillStyle(0x58734b, 1));
      helpButton.on("pointerout", () => helpButton.setFillStyle(0x40513a, 0.98));
      this.ui.registerHud(helpButton, helpLabel);
    }

    this.createFullscreenButton();
  }

  private createTouchControls(): void {
    if (!this.isTouchDevice) return;

    const base = this.add.circle(
      this.joystickCenter.x,
      this.joystickCenter.y,
      48,
      0x1b241c,
      0.58
    ).setScrollFactor(0);
    base.setStrokeStyle(3, 0xd6b36b, 0.9);

    const innerRing = this.add.circle(
      this.joystickCenter.x,
      this.joystickCenter.y,
      28,
      0x506b45,
      0.38
    ).setScrollFactor(0);
    innerRing.setStrokeStyle(1, 0xe8d29b, 0.55);

    const joystickNub = this.add.circle(
      this.joystickCenter.x,
      this.joystickCenter.y,
      18,
      0xe0c27d,
      0.88
    ).setScrollFactor(0);
    joystickNub.setStrokeStyle(2, 0x68452e, 1);
    this.joystickNub = joystickNub;

    const moveLabel = this.add.text(this.joystickCenter.x, 207, "MOVE", {
      fontFamily: PIXEL_FONT,
      fontSize: "9px",
      color: "#f5e8c6",
      backgroundColor: "#34271d",
      padding: { x: 5, y: 3 }
    }).setOrigin(0.5).setScrollFactor(0);

    const joystickZone = this.add.zone(
      this.joystickCenter.x,
      this.joystickCenter.y,
      116,
      116
    ).setScrollFactor(0).setInteractive();

    joystickZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointerId !== null) return;
      this.joystickPointerId = pointer.id;
      this.updateJoystick(pointer);
    });

    this.input.on("pointermove", this.handleJoystickMove, this);
    this.input.on("pointerup", this.handleJoystickEnd, this);
    this.input.on("pointerupoutside", this.handleJoystickEnd, this);

    const buttons = [
      this.createMobileButton(412, 182, "BAG", () => this.inventory.mobileToggle()),
      this.createMobileButton(490, 182, "CRAFT", () => this.crafting.mobileInteract(this.player.x, this.player.y)),
      this.createMobileButton(568, 182, "HELP", () => this.help.mobileToggle()),
      this.createMobileButton(412, 236, "PICK", () => this.inventory.mobilePickup(this.player.x, this.player.y)),
      this.createMobileButton(490, 236, "TALK", () => this.handleMobileTalk()),
      this.createMobileButton(568, 236, "PROFILE", () => this.profile.mobileToggle()),
      this.createMobileButton(412, 290, "DAY", () => this.farming.mobileAdvanceDay()),
      this.createMobileButton(490, 290, "USE", () => this.farming.mobileUseTool())
    ];

    this.ui.registerHud(base, innerRing, joystickNub, moveLabel, joystickZone, ...buttons);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointermove", this.handleJoystickMove, this);
      this.input.off("pointerup", this.handleJoystickEnd, this);
      this.input.off("pointerupoutside", this.handleJoystickEnd, this);
      this.joystickPointerId = null;
      this.joystickVector = { x: 0, y: 0 };
    });
  }

  private createMobileButton(
    x: number,
    y: number,
    label: string,
    action: () => void
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y).setScrollFactor(0);
    const background = this.add.rectangle(0, 0, 66, 42, 0x34271d, 0.88);
    background.setStrokeStyle(2, 0xd6b36b, 0.95);
    background.setInteractive({ useHandCursor: true });
    background.on("pointerdown", action);
    background.on("pointerover", () => background.setFillStyle(0x704638, 0.98));
    background.on("pointerout", () => background.setFillStyle(0x34271d, 0.88));

    const text = this.add.text(0, 0, label, {
      fontFamily: PIXEL_FONT,
      fontSize: label.length > 5 ? "7px" : "9px",
      color: "#fff1cf",
      fontStyle: "bold"
    }).setOrigin(0.5);

    button.add([background, text]);
    return button;
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    if (!this.joystickNub) return;

    const dx = pointer.x - this.joystickCenter.x;
    const dy = pointer.y - this.joystickCenter.y;
    const distance = Math.hypot(dx, dy);
    const maxDistance = 34;
    const scale = distance > maxDistance ? maxDistance / distance : 1;
    const offsetX = dx * scale;
    const offsetY = dy * scale;

    this.joystickNub.setPosition(
      this.joystickCenter.x + offsetX,
      this.joystickCenter.y + offsetY
    );

    if (distance < 9) {
      this.joystickVector = { x: 0, y: 0 };
    } else {
      this.joystickVector = {
        x: Phaser.Math.Clamp(offsetX / maxDistance, -1, 1),
        y: Phaser.Math.Clamp(offsetY / maxDistance, -1, 1)
      };
    }
  }

  private handleJoystickMove(pointer: Phaser.Input.Pointer): void {
    if (this.joystickPointerId === pointer.id) this.updateJoystick(pointer);
  }

  private handleJoystickEnd(pointer: Phaser.Input.Pointer): void {
    if (this.joystickPointerId !== pointer.id) return;
    this.joystickPointerId = null;
    this.joystickVector = { x: 0, y: 0 };
    this.joystickNub?.setPosition(this.joystickCenter.x, this.joystickCenter.y);
  }

  private handleMobileTalk(): void {
    if (this.ui.hasActiveModal()) return;
    if (this.village.mobileTalk(this.player.x, this.player.y)) return;
    this.market.mobileInteract(this.player.x, this.player.y);
  }

  private createFullscreenButton(): void {
    this.fullscreenButton = this.add.rectangle(610, 27, 48, 32, 0x79382e, 0.98);
    this.fullscreenButton.setStrokeStyle(2, 0xd6b36b);
    this.fullscreenButton.setOrigin(0.5).setScrollFactor(0).setDepth(8500)
      .setInteractive({ useHandCursor: true });

    this.fullscreenIcon = this.add.text(610, 27, "⛶", {
      fontFamily: "sans-serif", fontSize: "21px", color: "#f5e8c6"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(8501);

    this.fullscreenButton.on("pointerover", () => this.fullscreenButton.setFillStyle(0x985446, 1));
    this.fullscreenButton.on("pointerout", () => this.fullscreenButton.setFillStyle(0x79382e, 0.98));
    this.fullscreenButton.on("pointerup", () => this.scale.toggleFullscreen());
    this.ui.registerHud(this.fullscreenButton, this.fullscreenIcon);

    this.scale.on("enterfullscreen", this.handleFullscreenEntered, this);
    this.scale.on("leavefullscreen", this.handleFullscreenLeft, this);
    this.scale.on("fullscreenfailed", this.handleFullscreenFailed, this);
    this.scale.on("fullscreenunsupported", this.handleFullscreenFailed, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("enterfullscreen", this.handleFullscreenEntered, this);
      this.scale.off("leavefullscreen", this.handleFullscreenLeft, this);
      this.scale.off("fullscreenfailed", this.handleFullscreenFailed, this);
      this.scale.off("fullscreenunsupported", this.handleFullscreenFailed, this);
    });
  }

  private handleFullscreenEntered(): void {
    this.fullscreenIcon.setText("×");
  }

  private handleFullscreenLeft(): void {
    this.fullscreenIcon.setText("⛶");
  }

  private handleFullscreenFailed(): void {
    this.fullscreenIcon.setText("!");
    this.time.delayedCall(1800, () => {
      if (this.fullscreenIcon.active) {
        this.fullscreenIcon.setText(this.scale.isFullscreen ? "×" : "⛶");
      }
    });
  }

  private canMoveTo(x: number, y: number): boolean {
    const left = x - 5;
    const right = x + 5;
    const top = y + 8;
    const bottom = y + 20;

    if (left < 8 || right > WORLD_WIDTH - 8 || y < 12 || bottom > WORLD_HEIGHT - 8) {
      return false;
    }

    const touchingWater = bottom > 532 && top < 589;
    const safelyOnBridge = left >= 1020 && right <= 1092;
    if (touchingWater && !safelyOnBridge) return false;

    for (const obstacle of this.obstacles) {
      const overlaps = right > obstacle.x && left < obstacle.x + obstacle.width &&
        bottom > obstacle.y && top < obstacle.y + obstacle.height;
      if (overlaps) return false;
    }

    return true;
  }

  update(_time: number, delta: number): void {
    if (!this.canMoveTo(this.player.x, this.player.y)) {
      this.player.setPosition(320, 330);
    }

    this.updateAnimals(delta);
    this.updateButterflies(delta);

    const activeModal = this.ui.getActiveModal();
    if (activeModal !== null) {
      this.animatePlayer(0, 0, false);
      this.joystickVector = { x: 0, y: 0 };
      this.joystickPointerId = null;
      this.joystickNub?.setPosition(this.joystickCenter.x, this.joystickCenter.y);
      switch (activeModal) {
        case "market": this.market.update(this.player.x, this.player.y); break;
        case "inventory": this.inventory.update(this.player.x, this.player.y); break;
        case "crafting": this.crafting.update(this.player.x, this.player.y); break;
        case "dialogue": this.village.update(this.player.x, this.player.y); break;
        case "profile": this.profile.update(); break;
        case "help": this.help.update(); break;
      }
      return;
    }

    this.profile.update();
    this.help.update();
    if (this.ui.hasActiveModal()) return;

    this.village.update(this.player.x, this.player.y);
    if (this.ui.hasActiveModal()) return;

    this.inventory.update(this.player.x, this.player.y);
    if (this.ui.hasActiveModal()) return;

    this.crafting.update(this.player.x, this.player.y);
    if (this.ui.hasActiveModal()) return;

    let moveX = 0;
    let moveY = 0;
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    if (left) moveX -= 1;
    if (right) moveX += 1;
    if (up) moveY -= 1;
    if (down) moveY += 1;

    moveX += this.joystickVector.x;
    moveY += this.joystickVector.y;

    const length = Math.hypot(moveX, moveY);
    if (length > 0) {
      moveX /= length;
      moveY /= length;
      const step = PLAYER_SPEED * Math.min(delta, 40) / 1000;
      const nextX = this.player.x + moveX * step;
      const nextY = this.player.y + moveY * step;

      if (this.canMoveTo(nextX, this.player.y)) this.player.x = nextX;
      if (this.canMoveTo(this.player.x, nextY)) this.player.y = nextY;

      this.animatePlayer(moveX, moveY, true);
    } else {
      this.animatePlayer(0, 0, false);
    }

    this.player.setDepth(this.player.y + 30);
    this.market.update(this.player.x, this.player.y);
    if (this.ui.hasActiveModal()) return;
    this.farming.update(this.player.x, this.player.y);
  }
}