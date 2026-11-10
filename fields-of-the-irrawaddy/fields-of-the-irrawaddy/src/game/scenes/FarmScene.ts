
import Phaser from "phaser";
import { FarmingSystem } from "../systems/FarmingSystem";
import { MarketSystem } from "../systems/MarketSystem";
import { FishingSystem } from "../systems/FishingSystem";
import { CookingSystem } from "../systems/CookingSystem";
import { ChestStorageSystem } from "../systems/ChestStorageSystem";
import { HouseInteriorSystem } from "../systems/HouseInteriorSystem";
import { VillageSystem } from "../systems/VillageSystem";
import { InventorySystem } from "../systems/InventorySystem";
import { VillageBoardSystem } from "../systems/VillageBoardSystem";
import { SaveSystem } from "../systems/SaveSystem";
import { PlayerProfileSystem } from "../systems/PlayerProfileSystem";
import { ModalUIManager } from "../systems/ModalUIManager";
import { LanguageSystem } from "../systems/LanguageSystem";
import { HelpSystem } from "../systems/HelpSystem";
import { MusicSystem } from "../systems/MusicSystem";
import { NpcFarmingSystem } from "../systems/NpcFarmingSystem";
import {
  BACKDROP_TREES, CANAL_REEDS, FARM_DISTRICT, GARDEN_EAST, HARVEST_YARD,
  HOMES, LOTUS_POND, MONASTERY, NPC_FARM_PLOTS, NORTH_ROW, WORLD_LABELS
} from "../data/villageLayout";
import type { PropDef } from "../data/villageLayout";
import { pixelPanel } from "../ui/PixelUI";

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
  shadow: Phaser.GameObjects.Ellipse | Phaser.GameObjects.Sprite;
  kind: "chicken" | "duck" | "water_buffalo" | "sheep";
  rect: { x1: number; y1: number; x2: number; y2: number };
  speed: number;
  state: "idle" | "walk";
  timer: number;
  tx: number;
  ty: number;
  fleeing?: number;
}

interface Butterfly {
  sprite: Phaser.GameObjects.Sprite;
  angle: number;
  speed: number;
}

interface VillageBird {
  sprite: Phaser.GameObjects.Sprite;
  anchorX: number;
  anchorY: number;
  phase: number;
  speed: number;
  range: number;
}

interface Firefly {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  phase: number;
  speed: number;
}

export class FarmScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private facing: "down" | "up" | "side" = "down";
  private animals: Wanderer[] = [];
  private butterflies: Butterfly[] = [];
  private birds: VillageBird[] = [];
  private fireflies: Firefly[] = [];
  private riceClumps: Phaser.GameObjects.Image[] = [];
  private farming!: FarmingSystem;
  private market!: MarketSystem;
  private fishing!: FishingSystem;
  private cooking!: CookingSystem;
  private chest!: ChestStorageSystem;
  private house!: HouseInteriorSystem;
  private village!: VillageSystem;
  private npcFarming!: NpcFarmingSystem;
  private inventory!: InventorySystem;
  private villageBoard!: VillageBoardSystem;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private roadLampLights: { glow: Phaser.GameObjects.Image }[] = [];
  private music!: MusicSystem;
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
  private worldLabels: { text: Phaser.GameObjects.Text; key: string; radius: number }[] = [];

  private fullscreenIcon!: Phaser.GameObjects.Image;
  private seedText!: Phaser.GameObjects.Text;
  private riceText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private isTouchDevice = false;
  private joystickPointerId: number | null = null;
  private joystickVector = { x: 0, y: 0 };
  private joystickNub?: Phaser.GameObjects.Arc;
  private readonly joystickCenter = { x: 76, y: 267 };

  constructor() {
    super("FarmScene");
  }

  preload(): void {
    const village = [
      "water_pot_stand", "village_well", "ox_cart", "firewood_stack", "rice_sacks", "bench",
      "signpost", "shrub", "laundry_line", "wall_h", "wall_v", "gate_pillar", "produce_crates",
      "reeds", "leaf_pile", "trough", "monastery_bell", "chicken_coop", "hay_bale",
      "flower_bush_pink", "flower_bush_yellow", "flower_bush_white", "boulder_small", "boulder_large"
    ];
    const icons = [
      "bag", "help", "hand", "talk", "person", "bed", "action", "sun", "moon",
      "seed", "globe", "expand", "note", "note_off", "sprout", "rice"
    ];
    const imageAssets: [string, string][] = [
      ["world_ground", "/assets/terrain/village_ground_base.png"],
      ["player_home_asset", "/assets/buildings/player_home.png"],
      ["ma_home_asset", "/assets/buildings/ma_thiri_home.png"],
      ["ko_home_asset", "/assets/buildings/ko_aung_home.png"],
      ["stilt_house_01_asset", "/assets/buildings/stilt_house_01.png"],
      ["stilt_house_02_asset", "/assets/buildings/stilt_house_02.png"],
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
      ["bamboo_fence_asset", "/assets/decorations/bamboo_fence_segment.png"],
      ["fence_h_asset", "/assets/decorations/fence_h.png"],
      ["fence_v_asset", "/assets/decorations/fence_v.png"],
      ["bamboo_planter_asset", "/assets/decorations/bamboo_planter.png"],
      ["village_sign_asset", "/assets/decorations/village_sign.png"],
      ["haystack_asset", "/assets/agriculture/haystack.png"],
      ["drying_mat_asset", "/assets/decorations/rice_drying_mat.png"],
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
      ["rice_bowl_asset", "/assets/agriculture/rice_bowl.png"],
      ["rice_seed_bag_asset", "/assets/tools/rice_seed_bag.png"],
      ["hoe_asset", "/assets/tools/hoe.png"],
      ["watering_can_asset", "/assets/tools/watering_can.png"],
      ["sickle_asset", "/assets/tools/sickle.png"],
      ["coin_asset", "/assets/ui/coin.png"],
      ["road_lamp_asset", "/assets/village/road_lamp.png"],
      ["road_lamp_glow", "/assets/village/road_lamp_glow.png"],
      ["cooking_hearth_asset", "/assets/village/cooking_hearth.png"],
      ["house_bed_asset", "/assets/village/house_bed.png"],
      ["house_chest_asset", "/assets/village/house_lacquer_chest.png"],
      ["house_woven_mat_asset", "/assets/village/house_woven_mat.png"],
      ["house_wall_textile_asset", "/assets/village/house_wall_textile.png"],
      ["house_clay_jar_asset", "/assets/village/house_clay_jar.png"],
      ["house_oil_lamp_asset", "/assets/village/house_oil_lamp.png"],
      ["fishing_rod_asset", "/assets/tools/fishing_rod.png"],
      ["fish_silver_barb_asset", "/assets/agriculture/fish_silver_barb.png"],
      ["fish_catfish_asset", "/assets/agriculture/fish_catfish.png"],
      ["fish_golden_carp_asset", "/assets/agriculture/fish_golden_carp.png"],
      ["meal_fish_rice_asset", "/assets/agriculture/meal_fish_rice.png"],
      ["meal_mohinga_asset", "/assets/agriculture/meal_mohinga.png"],
      ["meal_fish_curry_asset", "/assets/agriculture/meal_fish_curry.png"],
      ["ui_slot", "/assets/ui/slot.png"],
      ["ui_slot_selected", "/assets/ui/slot_selected.png"],
      ["ui_talk_bubble", "/assets/ui/talk_bubble.png"],
      ["ui_key_e", "/assets/ui/key_e.png"],
      // portraits (idle front frame) used by menus
      ["farmer_green_asset", "/assets/characters/farmer_green.png"],
      ["farmer_blue_asset", "/assets/characters/farmer_blue.png"],
      ["farmer_red_asset", "/assets/characters/farmer_red.png"],
      ["farmer_purple_asset", "/assets/characters/farmer_purple.png"],
      ["ma_thiri_asset", "/assets/characters/ma_thiri.png"],
      ["ko_aung_asset", "/assets/characters/ko_aung.png"],
      ["monk_asset", "/assets/characters/monk.png"],
      ["kid_asset", "/assets/characters/kid.png"],
      ...village.map(name => [`v_${name}`, `/assets/village/${name}.png`] as [string, string]),
      ...icons.map(name => [`ui_icon_${name}`, `/assets/ui/icon_${name}.png`] as [string, string])
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
      ["monk_sheet", "/assets/characters/monk_sheet.png", 16, 26],
      ["kid_sheet", "/assets/characters/kid_sheet.png", 16, 26],
      ["chicken_sheet", "/assets/animals/chicken_sheet.png", 16, 16],
      ["duck_sheet", "/assets/animals/duck_sheet.png", 16, 16],
      ["water_buffalo_sheet", "/assets/animals/water_buffalo_sheet.png", 44, 30],
      ["myna_sheet", "/assets/animals/myna_sheet.png", 16, 16],
      ["firefly_sheet", "/assets/fx/firefly.png", 8, 8],
      ["rice_sway_1", "/assets/agriculture/rice_sway_1.png", 16, 16],
      ["rice_sway_2", "/assets/agriculture/rice_sway_2.png", 16, 16],
      ["rice_sway_3", "/assets/agriculture/rice_sway_3.png", 16, 16],
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

    // The supplied paid pack mixes 16px tiles, 48px environment tiles and
    // larger building frames. Each sheet is loaded on its native grid.
    const paidSheets: [string, string, number, number][] = [
      ["paid_character_sheet", "/assets/paid_pack/character.png", 16, 16],
      ["paid_fences_sheet", "/assets/paid_pack/fences.png", 16, 16],
      ["paid_fire_sheet", "/assets/paid_pack/fire.png", 16, 16],
      ["paid_house_sheet", "/assets/paid_pack/house.png", 96, 112],
      ["paid_plants_sheet", "/assets/paid_pack/plants.png", 16, 16],
      ["paid_sheep_sheet", "/assets/paid_pack/sheep.png", 16, 16],
      ["paid_sheep_shadow_sheet", "/assets/paid_pack/sheep_with_shadow.png", 16, 16],
      ["paid_tile_map_sheet", "/assets/paid_pack/tile_map.png", 16, 16],
      ["paid_toilet_sheet", "/assets/paid_pack/toilet.png", 36, 48],
      ["paid_trees_sheet", "/assets/paid_pack/trees.png", 48, 48],
      ["paid_water_sheet", "/assets/paid_pack/water.png", 48, 48]
    ];
    for (const [key, path, frameWidth, frameHeight] of paidSheets) {
      this.load.spritesheet(key, path, { frameWidth, frameHeight });
    }
  }

  create(): void {
    this.language = new LanguageSystem();
    this.createAnimations();
    this.createWorld();
    this.createLighting();
    this.createPlayer();
    this.createControls();
    this.createCamera();

    this.ui = new ModalUIManager(this);
    this.help = new HelpSystem(this, this.ui, this.language);
    this.createHUD();
    this.music = new MusicSystem(this, this.ui, this.language);

    this.farming = new FarmingSystem(this, this.ui, this.language);
    this.fishing = new FishingSystem(
      this,
      this.ui,
      this.language,
      () => this.village?.getTimeOfDayHours() ?? 8
    );
    this.cooking = new CookingSystem(this, this.farming, this.fishing, this.ui, this.language);
    this.market = new MarketSystem(this, this.farming, this.fishing, this.cooking, this.ui, this.language);
    this.npcFarming = new NpcFarmingSystem(this, this.language);
    this.village = new VillageSystem(
      this,
      this.ui,
      this.language,
      (x, y) => this.canMoveTo(x, y),
      () => this.animals
        .filter(a => a.kind === "chicken")
        .map(a => ({ x: a.sprite.x, y: a.sprite.y })),
      this.npcFarming
    );
    this.music.setTimeOfDayHours(this.village.getTimeOfDayHours());
    this.inventory = new InventorySystem(this, this.farming, this.fishing, this.cooking, this.ui, this.language);
    this.villageBoard = new VillageBoardSystem(this, this.farming, this.market, this.ui, this.language);
    this.chest = new ChestStorageSystem(this, this.farming, this.fishing, this.cooking, this.ui, this.language);
    this.profile = new PlayerProfileSystem(this, this.player, this.ui, this.language);

    this.saveSystem = new SaveSystem(
      this,
      this.player,
      this.farming,
      this.market,
      this.fishing,
      this.cooking,
      this.chest,
      this.inventory,
      this.villageBoard,
      this.village,
      this.profile,
      this.ui,
      this.language
    );

    this.house = new HouseInteriorSystem(
      this,
      this.player,
      () => this.playerSprite.texture.key,
      this.village,
      this.farming,
      this.cooking,
      this.chest,
      this.villageBoard,
      this.ui,
      this.language,
      this.saveSystem
    );

    this.createResourceHud();
    this.createTouchControls();
    this.applyReadableTextRendering();

    // tool use -> short swing animation
    this.events.on("player-action", this.playPlayerAction, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off("player-action", this.playPlayerAction, this);
    });
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
      "farmer_purple_sheet", "ma_thiri_sheet", "ko_aung_sheet", "monk_sheet", "kid_sheet"
    ];
    for (const sheet of people) {
      make(`${sheet}-down`, sheet, [0, 1, 2, 3], 8);
      make(`${sheet}-up`, sheet, [4, 5, 6, 7], 8);
      make(`${sheet}-side`, sheet, [8, 9, 10, 11], 8);
      make(`${sheet}-work`, sheet, [12, 13, 14, 15], sheet.startsWith("monk") ? 4 : 8);
      make(`${sheet}-sit`, sheet, [16, 17, 18, 19], 2);

      // Character sheets now contain 14 Burmese action rows (56 frames total):
      // walk, work, sit, plant, water, harvest, fish, cook, gesture, homage, eat.
      make(`${sheet}-task-market`, sheet, [40, 41, 42, 43, 42, 41], 3);
      make(`${sheet}-task-farm`, sheet, [12, 13, 14, 15, 14, 13], 8);
      make(`${sheet}-task-fish`, sheet, [32, 33, 34, 35, 34, 33], 5);
      make(`${sheet}-task-cook`, sheet, [36, 37, 38, 39, 38, 37], 5);
      make(`${sheet}-task-rest`, sheet, [16, 17, 18, 19, 18, 17], 2.5);
      make(`${sheet}-task-eat`, sheet, [48, 49, 50, 51, 50, 49], 4);
      make(`${sheet}-task-sleep`, sheet, [16, 16, 17, 17, 18, 18, 19, 19], 1.5);
      make(`${sheet}-task-sweep`, sheet, [12, 14, 13, 15, 14, 12], 7);
      make(`${sheet}-task-meditate`, sheet, [16, 16, 17, 17, 18, 18, 19, 19], 1.5);
      make(`${sheet}-task-chant`, sheet, [16, 17, 18, 19, 18, 17], 2);
      make(`${sheet}-task-play`, sheet, [12, 13, 14, 15, 14, 13], 12);
      make(`${sheet}-task-school`, sheet, [16, 17, 16, 18, 19, 18], 2.5);
      make(`${sheet}-task-skip`, sheet, [12, 13, 14, 15, 13, 12], 10);
      make(`${sheet}-task-alms`, sheet, [52, 53, 54, 55], 2.5);
      make(`${sheet}-task-offer`, sheet, [40, 41, 42, 43, 42, 41], 4);
      make(`${sheet}-task-homage`, sheet, [44, 45, 46, 47, 46, 45], 3.5);
      make(`${sheet}-task-walkMeditate`, sheet, [8, 9, 10, 11], 3);
      make(`${sheet}-task-talk`, sheet, [40, 41, 42, 43, 42, 41], 3);
      // Player-only actions use their dedicated side-view frames.
      make(`${sheet}-task-hoe`, sheet, [12, 13, 14, 15], 9, 0);
      make(`${sheet}-task-plant`, sheet, [20, 21, 22, 23], 5, 0);
      make(`${sheet}-task-water`, sheet, [24, 25, 26, 27], 5, 0);
      make(`${sheet}-task-harvest`, sheet, [28, 29, 30, 31], 11, 0);
      make(`${sheet}-task-clear`, sheet, [28, 30, 28], 6, 0);
    }

    make("chicken-idle", "chicken_sheet", [0, 2, 0, 2], 2.5);
    make("chicken-walk", "chicken_sheet", [3, 4, 3, 4], 7);
    make("chicken-peck", "chicken_sheet", [0, 1, 2, 1, 0], 5);
    make("chicken-flutter", "chicken_sheet", [2, 5, 2], 8, 0);
    make("duck-walk", "duck_sheet", [2, 3, 2, 3], 5);
    make("duck-idle", "duck_sheet", [0, 1, 0, 1], 2.5);
    make("water_buffalo-walk", "water_buffalo_sheet", [0, 1, 2, 3], 4);
    make("water_buffalo-idle", "water_buffalo_sheet", [0, 1, 0, 3], 1.7);
    make("myna-flap", "myna_sheet", [0, 1, 2, 3], 8);
    make("firefly-pulse", "firefly_sheet", [0, 1, 2, 3], 3);
    make("rice-sway-1", "rice_sway_1", [0, 1, 2, 3], 2.2);
    make("rice-sway-2", "rice_sway_2", [0, 1, 2, 3], 1.9);
    make("rice-sway-3", "rice_sway_3", [0, 1, 2, 3], 1.6);

    make("fx_dust-play", "fx_dust", [0, 1, 2, 3], 12, 0);
    make("fx_splash-play", "fx_splash", [0, 1, 2, 3], 12, 0);
    make("fx_sparkle-play", "fx_sparkle", [0, 1, 2, 3], 10, 0);
    make("water_glint-play", "water_glint", [0, 1, 2, 3], 4, -1);
    make("butterfly_yellow-flap", "butterfly_yellow", [0, 1], 10);
    make("butterfly_white-flap", "butterfly_white", [0, 1], 10);

    // Paid-pack animations: frames were checked against each sheet's native
    // grid so no blank padding cells are used in the visible loops.
    make("paid-character-walk", "paid_character_sheet", [280, 281, 282, 284, 285, 286], 8);
    make("paid-sheep-walk", "paid_sheep_sheet", Array.from({ length: 15 }, (_, i) => i), 7);
    make("paid-sheep-idle", "paid_sheep_sheet", [15, 16, 17, 18], 2);
    make("paid-sheep-shadow-walk", "paid_sheep_shadow_sheet", Array.from({ length: 15 }, (_, i) => i), 7);
    make("paid-fire-loop", "paid_fire_sheet", [36, 42, 48, 54], 4);
    make("paid-house-smoke", "paid_house_sheet", [0, 1, 2, 3, 4, 5, 6], 2);
    make("paid-house-door", "paid_house_sheet", [7, 8, 9, 10, 11, 12, 13, 14], 2.5);
    make("paid-toilet-door", "paid_toilet_sheet", [0, 1, 2, 3, 4, 5, 6, 7], 2);
    make("paid-water-glimmer", "paid_water_sheet", [43, 48, 53, 58], 1.8);
  }

  // ------------------------------------------------------------------
  // World
  // ------------------------------------------------------------------
  /** Places a 2x pixel-art prop with its feet at (x, y). */
  private prop(texture: string, x: number, y: number, depth?: number): Phaser.GameObjects.Image {
    const image = this.add.image(x, y, texture)
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE)
      .setDepth(depth ?? y);
    // A very small base-pivot sway gives tropical foliage life without
    // changing its collision footprint or making the pixel art look rubbery.
    if (["palm_tree_tall", "palm_tree_small", "banana_plant_asset", "fruit_tree_round", "fruit_tree_large"].includes(texture)) {
      this.tweens.add({
        targets: image,
        angle: { from: -0.45, to: 0.45 },
        duration: Phaser.Math.Between(4200, 6200),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
    return image;
  }

  private createWorld(): void {
    this.obstacles = [];
    this.worldLabels = [];

    // The ground (grass, dirt roads, plazas, canal, paddy bund) is one hand-painted map.
    this.add.image(0, 0, "world_ground")
      .setOrigin(0, 0)
      .setScale(PIXEL_SCALE)
      .setDepth(-100);

    this.drawCanal();
    this.drawRiceField();
    this.drawVillage();
    this.drawPaidPackAdditions();
    this.drawMonasteryCompound();
    this.drawFarmPlotFence();
    this.drawNpcFarmPlotFences();
    this.drawLotusPond();
    this.addStructureCollisions();
    this.createWorldLabels();
    this.spawnAnimals();
    this.spawnButterflies();
    this.spawnBirds();
    this.spawnFireflies();
    this.createRoadLamps();
  }

  private placeProp(def: PropDef): Phaser.GameObjects.Image {
    const image = this.prop(def.texture.startsWith("v_") || !this.textures.exists(`v_${def.texture}`)
      ? def.texture
      : `v_${def.texture}`, def.x, def.y, def.depth);
    if (def.solid) {
      const [w, h] = def.solid;
      this.obstacles.push({ x: def.x - w / 2, y: def.y - h, width: w, height: h });
    }
    return image;
  }

  private placeAll(defs: PropDef[]): void {
    for (const def of defs) this.placeProp(def);
  }

  private drawVillage(): void {
    this.placeAll(NORTH_ROW);
    this.placeAll(BACKDROP_TREES);
    this.placeAll(FARM_DISTRICT);
    this.placeAll(HARVEST_YARD);
    this.placeAll(GARDEN_EAST);
    this.placeAll(CANAL_REEDS);
    // keep the Ko Aung / Ma Thiri house footprints (their sprites are placed by VillageSystem)
    this.obstacles.push(
      { x: HOMES.ko.x - 62, y: HOMES.ko.y - 100, width: 124, height: 100 },
      { x: HOMES.ma.x - 64, y: HOMES.ma.y - 104, width: 128, height: 104 }
    );
  }

  private drawMonasteryCompound(): void {
    const m = MONASTERY;
    const wallPieces = (x1: number, x2: number, bottomY: number, skip?: [number, number]): void => {
      // wall_h is 16px wide at native resolution and displayed at 2x = 32px.
      // All run endpoints are aligned to this tile width, so there are no
      // overhanging half-segments at the compound corners or gate.
      for (let x = x1; x < x2; x += 32) {
        if (skip && x >= skip[0] && x < skip[1]) continue;
        this.add.image(x, bottomY, "v_wall_h")
          .setOrigin(0, 1).setScale(PIXEL_SCALE).setDepth(bottomY);
      }
    };

    // Back wall (10 complete tiles), left side (5 complete tiles), and
    // front wall split into exact 3-tile / 4-tile runs around the gate.
    wallPieces(m.wallX, 1440, m.backWallY);
    wallPieces(m.wallX, 1440, m.frontWallY, [m.gate.left - 16, m.gate.right + 16]);
    for (let y = m.backWallY; y < m.frontWallY; y += 32) {
      this.add.image(m.wallX, y, "v_wall_v")
        .setOrigin(0, 0).setScale(PIXEL_SCALE).setDepth(y + 30);
      // Close the compound against the eastern map edge. The end posts meet
      // the back/front horizontal runs, so the monastery wall is a complete
      // enclosure instead of two fence lines that appear cut off.
      this.add.image(1424, y, "v_wall_v")
        .setOrigin(0, 0).setScale(PIXEL_SCALE).setDepth(y + 30);
    }

    this.prop("v_gate_pillar", m.gate.left, m.frontWallY + 2);
    this.prop("v_gate_pillar", m.gate.right, m.frontWallY + 2);

    this.placeProp(m.hall);
    this.placeProp(m.pagoda);
    this.placeProp(m.bell);
    for (const pile of m.leafPiles) this.prop("v_leaf_pile", pile.x, pile.y);

    // Collision strips match the visible wall runs. Pillar blockers are kept
    // narrow so the centre of the 96px gate remains comfortably walkable.
    const gateOpeningLeft = m.gate.left - 16;
    const gateOpeningRight = m.gate.right + 16;
    this.obstacles.push(
      { x: m.wallX, y: m.backWallY - 16, width: 320, height: 16 },
      { x: m.wallX, y: m.backWallY, width: 16, height: m.frontWallY - m.backWallY },
      { x: 1424, y: m.backWallY, width: 16, height: m.frontWallY - m.backWallY },
      { x: m.wallX, y: m.frontWallY - 22, width: gateOpeningLeft - m.wallX, height: 22 },
      { x: gateOpeningRight, y: m.frontWallY - 22, width: 1440 - gateOpeningRight, height: 22 },
      { x: m.gate.left - 14, y: m.frontWallY - 14, width: 28, height: 14 },
      { x: m.gate.right - 14, y: m.frontWallY - 14, width: 28, height: 14 }
    );
  }

  private drawPaidPackAdditions(): void {
    // The 48px tree atlas stores its larger trees as adjacent half-tiles.
    // Compose each pair so the canopy and trunk are never cut in half.
    const orchard: [number, number, number, number][] = [
      [350, 150, 23, 24], [520, 150, 40, 41]
    ];
    for (const [x, y, leftFrame, rightFrame] of orchard) {
      this.add.image(x - 48, y, "paid_trees_sheet", leftFrame)
        .setOrigin(0.5, 1).setScale(PIXEL_SCALE).setDepth(y - 3);
      this.add.image(x + 48, y, "paid_trees_sheet", rightFrame)
        .setOrigin(0.5, 1).setScale(PIXEL_SCALE).setDepth(y - 3);
    }

    // Small mixed crop and flower tiles decorate the monastery-side garden,
    // staying outside the two NPC crop plots and the lotus pond's main area.
    const gardenPlants: [number, number, number][] = [
      [1250, 348, 24], [1280, 358, 30], [1380, 346, 36],
      [1410, 366, 42], [1260, 378, 45]
    ];
    for (const [x, y, frame] of gardenPlants) {
      this.add.image(x, y, "paid_plants_sheet", frame)
        .setOrigin(0.5, 1)
        .setScale(PIXEL_SCALE)
        .setDepth(y + 2);
    }

    // The tile atlas contributes natural stone and timber details to the
    // rice-yard path. These are real 16px tiles, not scaled screenshots.
    for (const [x, y, frame] of [[815, 516, 11], [848, 520, 12], [905, 530, 13]] as [number, number, number][]) {
      this.add.image(x, y, "paid_tile_map_sheet", frame)
        .setOrigin(0.5, 1)
        .setScale(PIXEL_SCALE)
        .setDepth(y + 4);
    }

    // Give the sheep a small dirt feeding area inside their new southwest
    // paddock. These ground tiles sit below the animal sprites and fence.
    for (const [x, y, frame] of [[96, 502, 146], [128, 502, 147], [160, 502, 148]] as [number, number, number][]) {
      this.add.image(x, y, "paid_tile_map_sheet", frame)
        .setOrigin(0.5, 1)
        .setScale(PIXEL_SCALE)
        .setDepth(450);
    }

    // Small sheep paddock made from the pack's fence tiles. The south edge
    // has a two-tile opening so the enclosure reads as a real farm gate.
    for (let x = 64; x <= 192; x += 32) {
      this.add.image(x, 454, "paid_fences_sheet", 40)
        .setOrigin(0.5, 1).setScale(PIXEL_SCALE).setDepth(455);
      if (x !== 128 && x !== 160) {
        this.add.image(x, 520, "paid_fences_sheet", 40)
          .setOrigin(0.5, 1).setScale(PIXEL_SCALE).setDepth(521);
      }
    }
    for (let y = 454; y <= 518; y += 32) {
      this.add.image(64, y, "paid_fences_sheet", 39)
        .setOrigin(0.5, 1).setScale(PIXEL_SCALE).setDepth(y + 20);
      this.add.image(208, y, "paid_fences_sheet", 39)
        .setOrigin(0.5, 1).setScale(PIXEL_SCALE).setDepth(y + 20);
    }
    this.obstacles.push(
      { x: 52, y: 445, width: 24, height: 74 },
      { x: 196, y: 445, width: 24, height: 74 },
      { x: 64, y: 439, width: 144, height: 10 },
      { x: 64, y: 510, width: 48, height: 10 },
      { x: 160, y: 510, width: 48, height: 10 }
    );

    // A compact field shed sits in the gap between the two NPC farm plots.
    // The paid house sheet has two separate animations: chimney smoke on the
    // house body, and a small door overlay that opens/closes at the entrance.
    const shed = this.add.sprite(1035, 540, "paid_house_sheet", 0)
      .setOrigin(0.5, 1)
      .setScale(0.9)
      .setDepth(535);
    shed.anims.play("paid-house-smoke");
    const shedDoor = this.add.sprite(1035, 540, "paid_house_sheet", 7)
      .setOrigin(0.5, 1)
      .setScale(0.9)
      .setDepth(536);
    shedDoor.anims.play("paid-house-door");
    this.obstacles.push({ x: 995, y: 516, width: 80, height: 20 });

    // A little fire uses only the pack's actual flame frames, not the log
    // and ember cells that share the same atlas.
    const cookingFire = this.add.sprite(930, 520, "paid_fire_sheet", 36)
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE)
      .setDepth(519);
    cookingFire.anims.play("paid-fire-loop");

    const outhouse = this.add.sprite(1100, 540, "paid_toilet_sheet", 0)
      .setOrigin(0.5, 1)
      .setScale(1.35)
      .setDepth(540);
    outhouse.anims.play("paid-toilet-door");
    this.obstacles.push({ x: 1080, y: 516, width: 40, height: 24 });

    // An animated water patch joins the bottom edge of the existing lotus
    // pond, making a larger village water feature rather than a second pond.
    const pond = this.add.sprite(1270, 540, "paid_water_sheet", 43)
      .setOrigin(0.5, 1)
      .setScale(1.5)
      .setDepth(541);
    pond.anims.play("paid-water-glimmer");

    // The pack's generic 16px traveller is kept as a background villager;
    // Ko Aung, Ma Thiri, the monk and the child retain their Burmese sprites.
    const traveller = this.add.sprite(462, 304, "paid_character_sheet", 280)
      .setOrigin(0.5, 1)
      .setScale(2.5)
      .setDepth(305);
    traveller.anims.play("paid-character-walk");
    this.tweens.add({
      targets: traveller,
      x: { from: 448, to: 488 },
      duration: 5200,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
      onYoyo: () => traveller.setFlipX(true),
      onRepeat: () => traveller.setFlipX(false)
    });
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

  private drawFarmPlotFence(): void {
    const left = 250;
    const right = 426; // 176px = 11 complete horizontal fence segments
    const top = 358;
    const bottom = 470; // 112px = 4 complete vertical fence segments
    const gateLeft = 298;
    const gateRight = 346;

    const horizontal = (x1: number, x2: number, bottomY: number): void => {
      const count = Math.round((x2 - x1) / 16);
      for (let i = 0; i < count; i++) {
        const piece = this.add.image(x1 + i * 16, bottomY, "fence_h_asset")
          .setOrigin(0, 1).setScale(PIXEL_SCALE).setDepth(bottomY + 1);
        // The final rail is mirrored so its terminal post caps the run neatly.
        if (i === count - 1) piece.setFlipX(true);
      }
    };
    const vertical = (centerX: number, y1: number, y2: number): void => {
      const count = Math.round((y2 - y1) / 28);
      for (let i = 0; i < count; i++) {
        const piece = this.add.image(centerX, y1 + i * 28, "fence_v_asset")
          .setOrigin(0.5, 0).setScale(PIXEL_SCALE).setDepth(y1 + i * 28 + 30);
        // The last run is flipped vertically to close the lower corner.
        if (i === count - 1) piece.setFlipY(true);
      }
    };

    horizontal(left, gateLeft, top);
    horizontal(gateRight, right, top);
    horizontal(left, right, bottom);
    vertical(left, top, bottom);
    vertical(right, top, bottom);

    // Collision strips follow the connected fence rails, leaving only the
    // intentional 48px top entrance open.
    this.obstacles.push(
      { x: left, y: top - 15, width: gateLeft - left, height: 11 },
      { x: gateRight, y: top - 15, width: right - gateRight, height: 11 },
      { x: left - 8, y: top, width: 16, height: bottom - top },
      { x: right - 8, y: top, width: 16, height: bottom - top },
      { x: left, y: bottom - 11, width: right - left, height: 11 }
    );
  }

  /** NPC fields use the exact same capped, connected fence runs as the player. */
  private drawNpcFarmPlotFences(): void {
    const horizontal = (x1: number, x2: number, bottomY: number): void => {
      const count = Math.round((x2 - x1) / 16);
      for (let i = 0; i < count; i++) {
        const piece = this.add.image(x1 + i * 16, bottomY, "fence_h_asset")
          .setOrigin(0, 1).setScale(PIXEL_SCALE).setDepth(bottomY + 1);
        if (i === count - 1) piece.setFlipX(true);
      }
    };
    const vertical = (centerX: number, y1: number, y2: number): void => {
      const count = Math.round((y2 - y1) / 28);
      for (let i = 0; i < count; i++) {
        const piece = this.add.image(centerX, y1 + i * 28, "fence_v_asset")
          .setOrigin(0.5, 0).setScale(PIXEL_SCALE).setDepth(y1 + i * 28 + 30);
        if (i === count - 1) piece.setFlipY(true);
      }
    };

    for (const plot of [NPC_FARM_PLOTS.ma, NPC_FARM_PLOTS.ko]) {
      const left = plot.x - 10;
      const right = left + 176;
      const top = plot.y + 2;
      const bottom = top + 112;
      const gateLeft = left + 48;
      const gateRight = gateLeft + 48;

      horizontal(left, gateLeft, top);
      horizontal(gateRight, right, top);
      horizontal(left, right, bottom);
      vertical(left, top, bottom);
      vertical(right, top, bottom);

      this.obstacles.push(
        { x: left, y: top - 15, width: gateLeft - left, height: 11 },
        { x: gateRight, y: top - 15, width: right - gateRight, height: 11 },
        { x: left - 8, y: top, width: 16, height: bottom - top },
        { x: right - 8, y: top, width: 16, height: bottom - top },
        { x: left, y: bottom - 11, width: right - left, height: 11 }
      );
    }
  }

  private drawLotusPond(): void {
    this.add.image(LOTUS_POND.x, LOTUS_POND.y, "lotus_pond_asset")
      .setOrigin(0.5)
      .setScale(PIXEL_SCALE)
      .setDepth(LOTUS_POND.y);
    this.obstacles.push({ x: LOTUS_POND.x - 82, y: LOTUS_POND.y - 55, width: 164, height: 112 });
  }

  private addStructureCollisions(): void {
    this.obstacles.push({ x: 425, y: 330, width: 243, height: 144 });   // paddy bund
    // Market stall footprint; the community request board is placed in the open plaza.
    this.obstacles.push({ x: 500, y: 190, width: 140, height: 70 });
  }

  private createWorldLabels(): void {
    for (const label of WORLD_LABELS) this.addWorldLabel(label.x, label.y, label.key, label.radius);

    this.language.onChange(() => {
      for (const item of this.worldLabels) {
        item.text.setText(this.language.t(item.key));
        item.text.setFontFamily(this.language.getFontFamily());
      }
    });
  }

  private addWorldLabel(x: number, y: number, key: string, radius: number): void {
    const text = this.add.text(x, y, this.language.t(key), {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#fff3d3",
      backgroundColor: "#2a1a14",
      padding: { x: 5, y: 3 }
    }).setOrigin(0.5).setDepth(5000).setAlpha(0);

    this.worldLabels.push({ text, key, radius });
  }

  /** World name-plates fade in only when the player is close, so they never clutter the view. */
  private updateWorldLabels(): void {
    for (const item of this.worldLabels) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.text.x, item.text.y);
      const target = distance < item.radius ? 1 : 0;
      item.text.setAlpha(Phaser.Math.Linear(item.text.alpha, target, 0.15));
    }
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
      const sheetKey = kind === "water_buffalo"
        ? "water_buffalo_sheet"
        : kind === "sheep" ? "paid_sheep_sheet" : `${kind}_sheet`;
      const shadow = kind === "sheep"
        ? this.add.sprite(x, y - 1, "paid_sheep_shadow_sheet", 0)
          .setOrigin(0.5, 1).setScale(PIXEL_SCALE).setDepth(y - 0.5)
        : this.add.ellipse(x, y - 1, shadowW, Math.max(5, shadowW / 4), 0x1d3015, 0.35)
          .setDepth(y - 0.5);
      const sprite = this.add.sprite(x, y, sheetKey, 0)
        .setOrigin(0.5, 1)
        .setScale(PIXEL_SCALE)
        .setDepth(y);
      if (kind === "sheep") (shadow as Phaser.GameObjects.Sprite).anims.play("paid-sheep-shadow-walk");
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

    add("water_buffalo", 730, 408, { x1: 692, y1: 382, x2: 756, y2: 430 }, 9, 64);

    for (const [x, y] of [[94, 478], [142, 490], [174, 474]] as [number, number][]) {
      add("sheep", x, y, { x1: 80, y1: 466, x2: 194, y2: 508 }, 6, 24);
    }
  }

  private playIdle(animal: Wanderer): void {
    if (animal.kind === "chicken") animal.sprite.anims.play("chicken-peck", true);
    else if (animal.kind === "duck") animal.sprite.anims.play("duck-idle", true);
    else if (animal.kind === "sheep") animal.sprite.anims.play("paid-sheep-idle", true);
    else animal.sprite.anims.play("water_buffalo-idle", true);
  }

  private updateAnimals(delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    const kid = this.village?.getKidPosition();
    for (const animal of this.animals) {
      const sprite = animal.sprite;
      animal.timer -= dt;

      // chickens bolt away from the village kid (and a little from the player)
      if (animal.kind === "chicken") {
        const threats = [kid, { x: this.player.x, y: this.player.y + 20 }];
        for (const t of threats) {
          if (!t) continue;
          const d = Phaser.Math.Distance.Between(sprite.x, sprite.y, t.x, t.y);
          const limit = t === kid ? 70 : 28;
          if (d < limit) {
            const ang = Math.atan2(sprite.y - t.y, sprite.x - t.x);
            animal.tx = Phaser.Math.Clamp(sprite.x + Math.cos(ang) * 60, animal.rect.x1, animal.rect.x2);
            animal.ty = Phaser.Math.Clamp(sprite.y + Math.sin(ang) * 20, animal.rect.y1, animal.rect.y2);
            animal.state = "walk";
            animal.timer = 1.2;
            animal.fleeing = t === kid ? 1 : 0.5;
            sprite.anims.play("chicken-walk", true);
          }
        }
      }

      if (animal.state === "idle") {
        if (animal.timer <= 0) {
          if (animal.kind === "chicken" && Math.random() < 0.22) {
            sprite.anims.play("chicken-flutter", true);
            animal.timer = 0.55;
            continue;
          }
          animal.tx = Phaser.Math.Between(animal.rect.x1, animal.rect.x2);
          animal.ty = Phaser.Math.Between(animal.rect.y1, animal.rect.y2);
          animal.state = "walk";
          animal.timer = Phaser.Math.FloatBetween(2, 5);
          sprite.anims.play(animal.kind === "sheep" ? "paid-sheep-walk" : `${animal.kind}-walk`, true);
        }
        continue;
      }

      const dx = animal.tx - sprite.x;
      const dy = animal.ty - sprite.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 2 || animal.timer <= 0) {
        animal.state = "idle";
        animal.fleeing = 0;
        animal.timer = Phaser.Math.FloatBetween(1.5, 4.5);
        this.playIdle(animal);
        continue;
      }

      const boost = animal.fleeing && animal.timer > 0 ? 3.4 : 1;
      const step = Math.min(distance, animal.speed * boost * dt);
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
      [1370, 350, "butterfly_yellow"], [600, 500, "butterfly_white"]
    ];
    for (const [x, y, key] of spots) {
      const sprite = this.add.sprite(x, y, key, 0).setScale(PIXEL_SCALE).setDepth(y + 15);
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
      sprite.setDepth(ny + 15);
      sprite.setFlipX(Math.cos(b.angle) < 0);
    }
  }

  private spawnBirds(): void {
    const perches: [number, number, number][] = [
      [118, 154, 24], [542, 118, 28], [930, 160, 22], [1165, 176, 34]
    ];
    for (const [x, y, range] of perches) {
      const sprite = this.add.sprite(x, y, "myna_sheet", 0)
        .setOrigin(0.5, 0.5)
        .setScale(1.7)
        .setDepth(y + 30)
        .setAlpha(0);
      sprite.anims.play("myna-flap");
      this.birds.push({ sprite, anchorX: x, anchorY: y, phase: Phaser.Math.FloatBetween(0, Math.PI * 2), speed: Phaser.Math.FloatBetween(0.45, 0.8), range });
    }
  }

  private updateBirds(delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    const hour = this.village?.getTimeOfDayHours() ?? 8;
    const daylight = hour >= 6 && hour < 18.5;
    for (const bird of this.birds) {
      bird.phase += bird.speed * dt;
      const x = bird.anchorX + Math.sin(bird.phase) * bird.range;
      const y = bird.anchorY + Math.sin(bird.phase * 2.1) * 5;
      bird.sprite.setPosition(x, y)
        .setDepth(y + 30)
        .setFlipX(Math.cos(bird.phase) < 0)
        .setAlpha(daylight ? 0.95 : 0);
    }
  }

  private spawnFireflies(): void {
    const glades: [number, number][] = [
      [530, 222], [690, 472], [1118, 352], [354, 486],
      [1300, 294], [854, 530], [618, 142], [1015, 207], [245, 390]
    ];
    for (const [x, y] of glades) {
      const sprite = this.add.sprite(x, y, "firefly_sheet", 0)
        .setScale(2)
        // Fireflies sit just above the night tint so their warm pixel glow remains visible.
        .setDepth(2050 + this.fireflies.length)
        .setVisible(false)
        .setAlpha(0.8);
      sprite.anims.play("firefly-pulse");
      this.fireflies.push({ sprite, x, y, phase: Phaser.Math.FloatBetween(0, Math.PI * 2), speed: Phaser.Math.FloatBetween(0.7, 1.3) });
    }
  }

  private updateFireflies(delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    const hour = this.village?.getTimeOfDayHours() ?? 8;
    const night = hour >= 19 || hour < 5.5;
    for (const fly of this.fireflies) {
      fly.phase += fly.speed * dt;
      fly.sprite.setPosition(fly.x + Math.sin(fly.phase) * 5, fly.y + Math.cos(fly.phase * 1.6) * 4)
        .setDepth(2050 + this.fireflies.indexOf(fly))
        .setVisible(night)
        .setAlpha(0.55 + 0.4 * (0.5 + 0.5 * Math.sin(fly.phase * 2)));
    }
  }

  private applyReadableTextRendering(): void {
    // Render UI fonts at 2x texture resolution so antialiased letter edges stay clear
    // when the pixel-art canvas is scaled to the player's screen.
    const applyToObject = (object: Phaser.GameObjects.GameObject): void => {
      if (object instanceof Phaser.GameObjects.Text) object.setResolution(2);
      if (object instanceof Phaser.GameObjects.Container) {
        for (const child of object.list) applyToObject(child);
      }
    };
    for (const object of this.children.list) applyToObject(object);
  }

  private createLighting(): void {
    // This overlay sits above the world but below every HUD and modal element.
    // Keep the rectangle's fill opaque-capable. In Phaser, GameObject alpha
    // and Shape fill alpha are separate: setting only setAlpha() on a shape
    // created with fillAlpha=0 leaves it fully transparent forever.
    this.nightOverlay = this.add.rectangle(320, 180, 640, 360, 0x071326, 1)
      .setScrollFactor(0)
      .setDepth(2000)
      .setOrigin(0.5)
      .setAlpha(1);
  }

  private createRoadLamps(): void {
    // Lanterns stand on roadside shoulders, never in the walkable dirt lanes.
    // The first three follow the north edge of the east-west road (one on its
    // paved shoulder); the last two fit in the grass strips beside vertical lanes.
    const placements: [number, number][] = [
      [350, 260], [650, 260], [950, 260], [748, 420], [1014, 420]
    ];

    for (const [x, y] of placements) {
      // The light source is at the lantern window near the top of its 32x64
      // displayed sprite. A radial PNG gives a soft spill onto the nearby road.
      const lightY = y - 50;
      const glow = this.add.image(x, lightY, "road_lamp_glow")
        .setOrigin(0.5)
        .setScale(1.5)
        .setAlpha(0)
        .setDepth(2100);
      // Use only a broad, soft halo. A separate bright dot/flame sprite made
      // the lantern look like it had a little circle embedded in its window.
      this.roadLampLights.push({ glow });

      this.add.image(x, y, "road_lamp_asset")
        .setOrigin(0.5, 1)
        .setScale(PIXEL_SCALE)
        .setDepth(y + 5);
    }
  }

  private updateLighting(): void {
    if (!this.village || !this.nightOverlay) return;
    const hour = this.village.getTimeOfDayHours();
    const smooth = (value: number): number => {
      const t = Phaser.Math.Clamp(value, 0, 1);
      return t * t * (3 - 2 * t);
    };

    // Daylight is clear and untinted. Dusk starts at 17:00, reaches full
    // darkness by 19:00, and the deep blue night tint remains until dawn.
    const maximumDarkness = 0.80;
    let darkness = 0;
    if (hour < 5) {
      darkness = maximumDarkness;
    } else if (hour < 7) {
      darkness = maximumDarkness * (1 - smooth((hour - 5) / 2));
    } else if (hour >= 19) {
      darkness = maximumDarkness;
    } else if (hour >= 17) {
      darkness = maximumDarkness * smooth((hour - 17) / 2);
    }
    // Apply darkness to the rectangle's FILL alpha (not just GameObject alpha).
    // This is the key fix that makes the overlay visible in Phaser.
    this.nightOverlay.setFillStyle(0x071326, darkness);

    // The lanterns turn on as dusk begins, remain lit through midnight, and
    // fade off after sunrise. This is driven by the same clock as NPCs/crops.
    let lampIntensity = 0;
    if (hour >= 18) {
      lampIntensity = 1;
    } else if (hour >= 17) {
      lampIntensity = smooth(hour - 17);
    } else if (hour < 5) {
      lampIntensity = 1;
    } else if (hour < 7) {
      lampIntensity = 1 - smooth((hour - 5) / 2);
    }

    // A restrained flicker makes the lantern feel alive without pulsing the
    // halo. The glow renders above the darkness tint and below the HUD.
    const flicker = 0.94 + 0.06 * Math.sin(this.time.now / 780);
    for (const light of this.roadLampLights) {
      // A large soft halo replaces the old tiny white circle inside the lamp.
      light.glow.setAlpha(lampIntensity * 0.92 * flicker);
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

  private actionUntil = 0;

  private playPlayerAction(action: "hoe" | "plant" | "water" | "harvest" | "clear" | "fish" | "cook" | "eat" = "hoe"): void {
    const sprite = this.playerSprite;
    const animation = `${sprite.texture.key}-task-${action}`;
    this.tweens.killTweensOf(sprite);
    sprite.setAngle(0).setScale(PIXEL_SCALE);
    sprite.anims.play(animation, true);
    const swingAngle = action === "water" ? 12 : action === "plant" ? -9 : action === "harvest" ? 18 : action === "fish" ? -7 : action === "cook" ? -5 : action === "eat" ? 0 : -16;
    this.tweens.add({
      targets: sprite,
      angle: [0, swingAngle, 0],
      scaleY: [PIXEL_SCALE, PIXEL_SCALE * 0.94, PIXEL_SCALE],
      duration: action === "water" ? 540 : 420,
      ease: "Sine.easeInOut",
      onComplete: () => sprite.setAngle(0).setScale(PIXEL_SCALE)
    });
    this.actionUntil = this.time.now + (action === "water" ? 560 : action === "fish" || action === "cook" ? 600 : 460);
  }

  private animatePlayer(moveX: number, moveY: number, moving: boolean): void {
    const sprite = this.playerSprite;
    if (!moving && this.time.now < this.actionUntil) return;
    if (!moving && sprite.anims.currentAnim?.key.endsWith("-work")) {
      sprite.anims.stop();
    }
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
    this.isTouchDevice = ("ontouchstart" in window) || navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches;

    // Desktop control hint (bottom-left, clear of the hotbar)
    if (!this.isTouchDevice) {
      const hintBackground = pixelPanel(this, 117, 345, 218, 22).setDepth(100);
      const hint = this.add.text(20, 339, "", {
        fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#f2e6c5"
      }).setScrollFactor(0).setDepth(101);
      const refreshHint = (): void => {
        hint.setText(this.language.t("hud.hint"));
        hint.setFontFamily(this.language.getFontFamily());
      };
      refreshHint();
      this.language.onChange(refreshHint);
      this.ui.registerHud(hintBackground, hint);
    }

    // Top-right icon buttons (right to left): fullscreen, help, language, profile, inventory
    this.createFullscreenButton();
    // Keep the same six-button row on desktop and touch: fullscreen, music,
    // help, language, profile, inventory. Music owns x=594 in MusicSystem.
    this.createIconButton(562, 22, "ui_icon_help", "hud.tip.help",
      () => this.help.mobileToggle());
    this.createIconButton(530, 22, "ui_icon_globe", "hud.tip.language",
      () => this.language.toggleLanguage());
    this.createIconButton(498, 22, "ui_icon_person", "hud.tip.profile",
      () => this.profile.mobileToggle());
    this.createIconButton(466, 22, "ui_icon_bag", "hud.tip.inventory",
      () => this.inventory.mobileToggle());
  }

  /** 28px framed icon button with a hover/long-press tooltip. */
  private createIconButton(
    x: number,
    y: number,
    icon: string,
    tipKey: string,
    action: () => void
  ): Phaser.GameObjects.Image {
    const frame = pixelPanel(this, x, y, 28, 28, { fill: 0x4a3324 }).setDepth(8500);
    const image = this.add.image(x, y, icon).setScrollFactor(0).setDepth(8501);
    const hit = this.add.rectangle(x, y, 28, 28, 0xffffff, 0.001)
      .setScrollFactor(0).setDepth(8502).setInteractive({ useHandCursor: true });
    const tip = this.add.text(x, y + 22, this.language.t(tipKey), {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#fff1cf",
      backgroundColor: "#2a1a14", padding: { x: 4, y: 2 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(8503).setVisible(false);
    this.language.onChange(() => {
      tip.setText(this.language.t(tipKey));
      tip.setFontFamily(this.language.getFontFamily());
    });

    hit.on("pointerover", () => { image.setY(y - 1); tip.setVisible(true); });
    hit.on("pointerout", () => { image.setY(y); tip.setVisible(false); });
    hit.on("pointerup", action);
    this.ui.registerHud(frame, image, hit, tip);
    return image;
  }

  private createResourceHud(): void {
    const panel = pixelPanel(this, 93, 52, 170, 26).setDepth(150);
    const slots: { icon: string; x: number }[] = [
      { icon: "ui_icon_seed", x: 16 }, { icon: "ui_icon_rice", x: 66 }, { icon: "coin_asset", x: 116 }
    ];
    const objs: Phaser.GameObjects.GameObject[] = [panel];
    for (const slot of slots) {
      const image = this.add.image(slot.x + 8, 52, slot.icon).setScrollFactor(0).setDepth(151);
      if (slot.icon === "coin_asset") image.setScale(1);
      objs.push(image);
    }
    const style = { fontFamily: this.language.getFontFamily(), fontSize: "11px", color: "#fff1cf", stroke: "#2a1a14", strokeThickness: 2 };
    this.seedText = this.add.text(30, 46, "0", style).setScrollFactor(0).setDepth(151);
    this.riceText = this.add.text(80, 46, "0", style).setScrollFactor(0).setDepth(151);
    this.coinText = this.add.text(130, 46, "0", style).setScrollFactor(0).setDepth(151);
    this.ui.registerHud(...objs, this.seedText, this.riceText, this.coinText);
  }

  private updateResourceHud(): void {
    const seeds = String(this.farming.getSeeds());
    const rice = String(this.farming.getRice());
    const coins = String(this.market.getCoins());
    if (this.seedText.text !== seeds) this.seedText.setText(seeds);
    if (this.riceText.text !== rice) this.riceText.setText(rice);
    if (this.coinText.text !== coins) this.coinText.setText(coins);
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
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
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

    // 2 x 2 action grid on the right edge (clear of the clock, resources and hotbar)
    const cols = [564, 614];
    const rows = [100, 152];
    const buttons = [
      this.createMobileButton(cols[0], rows[0], "ui_icon_bag", "BAG", () => this.inventory.mobileToggle()),
      this.createMobileButton(cols[1], rows[0], "ui_icon_note", "BOARD", () => this.villageBoard.mobileInteract(this.player.x, this.player.y)),
      this.createMobileButton(cols[0], rows[1], "ui_icon_talk", "TALK", () => this.handleMobileTalk()),
      this.createMobileButton(cols[1], rows[1], "ui_icon_action", "USE", () => this.farming.mobileUseTool())
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
    icon: string,
    label: string,
    action: () => void
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y).setScrollFactor(0);
    const frame = pixelPanel(this, 0, 0, 44, 44, { fill: 0x4a3324, alpha: 0.92 });
    const image = this.add.image(0, -6, icon).setScale(2);
    const text = this.add.text(0, 15, label, {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#ffd978", stroke: "#2a1a14", strokeThickness: 2
    }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, 44, 44, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => { button.setScale(0.94); action(); });
    hit.on("pointerup", () => button.setScale(1));
    hit.on("pointerout", () => button.setScale(1));

    button.add([frame, image, text, hit]);
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
    if (this.villageBoard.mobileInteract(this.player.x, this.player.y)) return;
    this.market.mobileInteract(this.player.x, this.player.y);
  }

  private createFullscreenButton(): void {
    this.fullscreenIcon = this.createIconButton(626, 22, "ui_icon_expand", "hud.tip.fullscreen",
      () => this.scale.toggleFullscreen());

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
    this.fullscreenIcon.setTint(0xffd978);
  }

  private handleFullscreenLeft(): void {
    this.fullscreenIcon.clearTint();
  }

  private handleFullscreenFailed(): void {
    this.fullscreenIcon.setTint(0xff6a5a);
    this.time.delayedCall(1800, () => {
      if (this.fullscreenIcon.active) this.fullscreenIcon.clearTint();
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
    this.updateBirds(delta);
    this.updateFireflies(delta);
    this.updateWorldLabels();
    this.updateLighting();
    this.music.setTimeOfDayHours(this.village.getTimeOfDayHours());
    this.updateResourceHud();

    // Farming and daily village requests share the exact same 24-hour game clock.
    this.farming.syncGameDay(this.village.getGameDay());

    const activeModal = this.ui.getActiveModal();
    if (activeModal !== null) {
      this.animatePlayer(0, 0, false);
      this.joystickVector = { x: 0, y: 0 };
      this.joystickPointerId = null;
      this.joystickNub?.setPosition(this.joystickCenter.x, this.joystickCenter.y);
      switch (activeModal) {
        case "market": this.market.update(this.player.x, this.player.y); break;
        case "inventory": this.inventory.update(this.player.x, this.player.y); break;
        case "board": this.villageBoard.update(this.player.x, this.player.y); break;
        case "dialogue": this.village.update(this.player.x, this.player.y); break;
        case "cooking": this.cooking.update(this.player.x, this.player.y); break;
        case "house": this.house.update(this.player.x, this.player.y, delta); break;
        case "chest": this.chest.update(); break;
      }
      if (this.house.isInside()) {
        // Keep villagers and the shared day clock progressing while the player is indoors.
        this.village.update(-10000, -10000);
        this.villageBoard.update(-10000, -10000);
      }
      return;
    }

    if (this.ui.hasActiveModal()) return;

    this.house.update(this.player.x, this.player.y, delta);
    if (this.ui.hasActiveModal()) return;

    this.village.update(this.player.x, this.player.y);
    if (this.ui.hasActiveModal()) return;

    this.cooking.update(this.player.x, this.player.y);
    if (this.ui.hasActiveModal()) return;

    this.inventory.update(this.player.x, this.player.y);
    if (this.ui.hasActiveModal()) return;

    this.villageBoard.update(this.player.x, this.player.y);
    if (this.ui.hasActiveModal()) return;

    // Keep the player at the riverbank while the line is cast so the bobber
    // stays attached to the correct fishing spot until the reel/miss resolves.
    if (this.fishing.isBusy()) {
      this.animatePlayer(0, 0, false);
      this.fishing.update(this.player.x, this.player.y, delta, false);
      return;
    }

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
    const fishingConsumesAction = this.fishing.update(this.player.x, this.player.y, delta, false);
    if (!fishingConsumesAction) this.farming.update(this.player.x, this.player.y);
  }
}
