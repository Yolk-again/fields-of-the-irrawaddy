
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
import { getGraphicsQuality } from "../systems/GraphicsQuality";
import type { GraphicsQuality } from "../systems/GraphicsQuality";
import { OpeningCutsceneSystem } from "../systems/OpeningCutsceneSystem";
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
const publicAsset = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

type Obstacle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

interface Wanderer {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  kind: "chicken" | "duck" | "cow";
  rect: { x1: number; y1: number; x2: number; y2: number };
  speed: number;
  state: "idle" | "walk";
  timer: number;
  tx: number;
  ty: number;
  fleeing?: number;
  path: Array<{ x: number; y: number }>;
  pathIndex: number;
  stuckTimer: number;
  fleeRepathTimer: number;
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
  private footstepCooldown = 0;
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
  private openingCutscene?: OpeningCutsceneSystem;
  private openingStoryActive = false;

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
  private coinText!: Phaser.GameObjects.Text;
  private isTouchDevice = false;
  private joystickPointerId: number | null = null;
  private joystickVector = { x: 0, y: 0 };
  private joystickNub?: Phaser.GameObjects.Arc;
  private readonly joystickCenter = { x: 76, y: 267 };
  private selectedSaveSlot = 1;
  private loadExistingSave = false;
  private enteredThroughSaveSelect = false;
  private mobileContextPointerId: number | null = null;
  private chickenCluckTimer = Phaser.Math.Between(8, 15);
  private graphicsQuality: GraphicsQuality = getGraphicsQuality();
  private performanceUiElapsed = 0;
  private performanceLightingElapsed = 0;
  private performanceButterflyElapsed = 0;

  private canUseMobileContextAction(): boolean {
    if (!this.isTouchDevice) return false;
    // Dialogue is a modal, but the native mobile action button must remain
    // available so touch players can advance NPC conversations.
    if (this.village?.isDialogueOpen()) return true;
    if (this.house?.isInside()) {
      return this.ui?.isOpen("house") === true && this.house.getMobileActionLabel() !== null;
    }
    return !this.ui?.hasActiveModal();
  }

  private handleMobileContextPointerDown = (event: PointerEvent): void => {
    if (!this.canUseMobileContextAction()) return;
    event.stopPropagation();
    event.preventDefault();
    const button = event.currentTarget as HTMLButtonElement | null;
    this.mobileContextPointerId = event.pointerId;
    try { button?.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional on older browsers. */ }
  };

  private handleMobileContextPointerUp = (event: PointerEvent): void => {
    if (this.mobileContextPointerId !== event.pointerId) return;
    this.mobileContextPointerId = null;
    event.stopPropagation();
    event.preventDefault();
    const button = event.currentTarget as HTMLButtonElement | null;
    if (!button || button.hidden || button.disabled) return;
    const bounds = button.getBoundingClientRect();
    const releasedInside = event.clientX >= bounds.left && event.clientX <= bounds.right &&
      event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    if (releasedInside) this.handleMobileTalk();
  };

  private handleMobileContextPointerCancel = (event: PointerEvent): void => {
    if (this.mobileContextPointerId === event.pointerId) this.mobileContextPointerId = null;
    event.stopPropagation();
  };

  private handleMobileContextKeyboardClick = (event: MouseEvent): void => {
    event.stopPropagation();
    // Pointer taps are handled on pointerup. A click with detail 0 is keyboard/screen-reader activation.
    if (event.detail === 0 && this.canUseMobileContextAction()) this.handleMobileTalk();
  };

  private handleGameMenuRequest = (): void => {
    this.saveSystem?.saveNow();
    this.music?.shutdown();
    window.dispatchEvent(new Event("foi-return-to-title"));
  };

  private handleMobileHudAction = (event: Event): void => {
    if (!this.isTouchDevice) return;
    const action = (event as CustomEvent<string>).detail;
    switch (action) {
      case "inventory":
        this.inventory?.mobileToggle();
        break;
      case "profile":
        this.profile?.mobileToggle();
        break;
      case "language":
        this.language?.toggleLanguage();
        break;
      case "help":
        this.help?.mobileToggle();
        break;
      case "audio":
        this.music?.mobileToggle();
        break;
      case "fullscreen":
        this.toggleFullscreenForDevice();
        break;
    }
  };

  constructor() {
    super("FarmScene");
  }

  init(data: {
    saveSlot?: number;
    loadExisting?: boolean;
    fromSaveSelect?: boolean;
  }): void {
    this.enteredThroughSaveSelect = data?.fromSaveSelect === true;

    const slot = Number(data?.saveSlot ?? 1);
    this.selectedSaveSlot = Number.isInteger(slot) && slot >= 1 && slot <= 3 ? slot : 1;
    this.loadExistingSave = data?.loadExisting === true;
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
      ["world_ground", publicAsset("/assets/terrain/village_ground_base.png")],
      ["player_home_asset", publicAsset("/assets/buildings/player_home.png")],
      ["ma_home_asset", publicAsset("/assets/buildings/ma_thiri_home.png")],
      ["ko_home_asset", publicAsset("/assets/buildings/ko_aung_home.png")],
      ["stilt_house_01_asset", publicAsset("/assets/buildings/stilt_house_01.png")],
      ["stilt_house_02_asset", publicAsset("/assets/buildings/stilt_house_02.png")],
      ["granary_asset", publicAsset("/assets/buildings/rice_granary.png")],
      ["monastery_asset", publicAsset("/assets/buildings/village_monastery.png")],
      ["pagoda_asset", publicAsset("/assets/buildings/golden_pagoda.png")],
      ["lotus_pond_asset", publicAsset("/assets/water/lotus_pond.png")],
      ["bridge_asset", publicAsset("/assets/water/wooden_bridge_asset.png")],
      ["fruit_tree_round", publicAsset("/assets/vegetation/fruit_tree_round.png")],
      ["fruit_tree_large", publicAsset("/assets/vegetation/fruit_tree_large.png")],
      ["palm_tree_tall", publicAsset("/assets/vegetation/palm_tree_tall.png")],
      ["palm_tree_small", publicAsset("/assets/vegetation/palm_tree_small.png")],
      ["banana_plant_asset", publicAsset("/assets/vegetation/banana_plant.png")],
      ["bamboo_clump_asset", publicAsset("/assets/vegetation/bamboo_clump.png")],
      ["vegetable_bed_asset", publicAsset("/assets/decorations/raised_vegetable_bed.png")],
      ["bamboo_fence_asset", publicAsset("/assets/decorations/bamboo_fence_segment.png")],
      ["fence_h_asset", publicAsset("/assets/decorations/fence_h.png")],
      ["fence_v_asset", publicAsset("/assets/decorations/fence_v.png")],
      ["bamboo_planter_asset", publicAsset("/assets/decorations/bamboo_planter.png")],
      ["village_sign_asset", publicAsset("/assets/decorations/village_sign.png")],
      ["haystack_asset", publicAsset("/assets/agriculture/haystack.png")],
      ["drying_mat_asset", publicAsset("/assets/decorations/rice_drying_mat.png")],
      ["rice_plant_01", publicAsset("/assets/agriculture/young_rice_plant_01.png")],
      ["rice_plant_02", publicAsset("/assets/agriculture/young_rice_plant_02.png")],
      ["rice_plant_03", publicAsset("/assets/agriculture/young_rice_plant_03.png")],
      ["crop_0", publicAsset("/assets/agriculture/rice_stage_0.png")],
      ["crop_1", publicAsset("/assets/agriculture/rice_stage_1.png")],
      ["crop_2", publicAsset("/assets/agriculture/rice_stage_2.png")],
      ["crop_3", publicAsset("/assets/agriculture/rice_stage_3.png")],
      ["crop_tomato_0", publicAsset("/assets/agriculture/tomato_stage_0.png")],
      ["crop_tomato_1", publicAsset("/assets/agriculture/tomato_stage_1.png")],
      ["crop_tomato_2", publicAsset("/assets/agriculture/tomato_stage_2.png")],
      ["crop_tomato_3", publicAsset("/assets/agriculture/tomato_stage_3.png")],
      ["crop_green_bean_0", publicAsset("/assets/agriculture/green_bean_stage_0.png")],
      ["crop_green_bean_1", publicAsset("/assets/agriculture/green_bean_stage_1.png")],
      ["crop_green_bean_2", publicAsset("/assets/agriculture/green_bean_stage_2.png")],
      ["crop_green_bean_3", publicAsset("/assets/agriculture/green_bean_stage_3.png")],
      ["scarecrow_asset", publicAsset("/assets/agriculture/scarecrow.png")],
      ["tile_plot", publicAsset("/assets/terrain/farm_plot.png")],
      ["tile_tilled", publicAsset("/assets/terrain/tilled_soil.png")],
      ["tile_wet", publicAsset("/assets/terrain/tilled_soil_wet.png")],
      ["market_stall_asset", publicAsset("/assets/buildings/market_stall.png")],
      ["rice_bowl_asset", publicAsset("/assets/agriculture/rice_bowl.png")],
      ["rice_grain_asset", publicAsset("/assets/agriculture/rice_grain.png")],
      ["rice_seed_bag_asset", publicAsset("/assets/tools/rice_seed_bag.png")],
      ["tomato_seed_bag_asset", publicAsset("/assets/tools/tomato_seed_bag.png")],
      ["green_bean_seed_bag_asset", publicAsset("/assets/tools/green_bean_seed_bag.png")],
      ["tomato_basket_asset", publicAsset("/assets/agriculture/tomato_basket.png")],
      ["green_bean_basket_asset", publicAsset("/assets/agriculture/green_bean_basket.png")],
      ["wheat_basket_asset", publicAsset("/assets/agriculture/wheat_basket.png")],
      ["hoe_asset", publicAsset("/assets/tools/hoe.png")],
      ["watering_can_asset", publicAsset("/assets/tools/watering_can.png")],
      ["sickle_asset", publicAsset("/assets/tools/sickle.png")],
      ["coin_asset", publicAsset("/assets/ui/coin.png")],
      ["road_lamp_asset", publicAsset("/assets/village/road_lamp.png")],
      ["road_lamp_glow", publicAsset("/assets/village/road_lamp_glow.png")],
      ["cooking_hearth_asset", publicAsset("/assets/village/cooking_hearth.png")],
      ["fishing_rod_asset", publicAsset("/assets/tools/fishing_rod.png")],
      ["fish_silver_barb_asset", publicAsset("/assets/agriculture/fish_silver_barb.png")],
      ["fish_catfish_asset", publicAsset("/assets/agriculture/fish_catfish.png")],
      ["fish_golden_carp_asset", publicAsset("/assets/agriculture/fish_golden_carp.png")],
      ["meal_fish_rice_asset", publicAsset("/assets/agriculture/meal_fish_rice.png")],
      ["meal_mohinga_asset", publicAsset("/assets/agriculture/meal_mohinga.png")],
      ["meal_fish_curry_asset", publicAsset("/assets/agriculture/meal_fish_curry.png")],
      ["ui_slot", publicAsset("/assets/ui/slot.png")],
      ["ui_slot_selected", publicAsset("/assets/ui/slot_selected.png")],
      ["ui_talk_bubble", publicAsset("/assets/ui/talk_bubble.png")],
      ["ui_key_e", publicAsset("/assets/ui/key_e.png")],
      // portraits (idle front frame) used by menus
      ["farmer_green_asset", publicAsset("/assets/characters/farmer_green.png")],
      ["farmer_blue_asset", publicAsset("/assets/characters/farmer_blue.png")],
      ["farmer_red_asset", publicAsset("/assets/characters/farmer_red.png")],
      ["farmer_purple_asset", publicAsset("/assets/characters/farmer_purple.png")],
      ["farmer_female_green_asset", publicAsset("/assets/characters/farmer_female_green.png")],
      ["farmer_female_blue_asset", publicAsset("/assets/characters/farmer_female_blue.png")],
      ["farmer_female_red_asset", publicAsset("/assets/characters/farmer_female_red.png")],
      ["farmer_female_purple_asset", publicAsset("/assets/characters/farmer_female_purple.png")],
      ["sleep_male_green", publicAsset("/assets/characters/sleep_male_green.png")],
      ["sleep_male_blue", publicAsset("/assets/characters/sleep_male_blue.png")],
      ["sleep_male_red", publicAsset("/assets/characters/sleep_male_red.png")],
      ["sleep_male_purple", publicAsset("/assets/characters/sleep_male_purple.png")],
      ["ma_thiri_asset", publicAsset("/assets/characters/ma_thiri.png")],
      ["ko_aung_asset", publicAsset("/assets/characters/ko_aung.png")],
      ["monk_asset", publicAsset("/assets/characters/monk.png")],
      ["kid_asset", publicAsset("/assets/characters/kid.png")],
      ...village.map(name => [`v_${name}`, publicAsset(`/assets/village/${name}.png`)] as [string, string]),
      ...icons.map(name => [`ui_icon_${name}`, publicAsset(`/assets/ui/icon_${name}.png`)] as [string, string])
    ];

    for (const [key, path] of imageAssets) {
      this.load.image(key, path);
    }

    // [key, path, frameWidth, frameHeight]
    const sheets: [string, string, number, number][] = [
      ["farmer_green_sheet", publicAsset("/assets/characters/farmer_green_sheet.png"), 16, 26],
      ["farmer_blue_sheet", publicAsset("/assets/characters/farmer_blue_sheet.png"), 16, 26],
      ["farmer_red_sheet", publicAsset("/assets/characters/farmer_red_sheet.png"), 16, 26],
      ["farmer_purple_sheet", publicAsset("/assets/characters/farmer_purple_sheet.png"), 16, 26],
      ["farmer_female_green_sheet", publicAsset("/assets/characters/farmer_female_green_sheet.png"), 16, 26],
      ["farmer_female_blue_sheet", publicAsset("/assets/characters/farmer_female_blue_sheet.png"), 16, 26],
      ["farmer_female_red_sheet", publicAsset("/assets/characters/farmer_female_red_sheet.png"), 16, 26],
      ["farmer_female_purple_sheet", publicAsset("/assets/characters/farmer_female_purple_sheet.png"), 16, 26],
      ["ma_thiri_sheet", publicAsset("/assets/characters/ma_thiri_sheet.png"), 16, 26],
      ["ko_aung_sheet", publicAsset("/assets/characters/ko_aung_sheet.png"), 16, 26],
      ["monk_sheet", publicAsset("/assets/characters/monk_sheet.png"), 16, 26],
      ["kid_sheet", publicAsset("/assets/characters/kid_sheet.png"), 16, 26],
      ["chicken_sheet", publicAsset("/assets/animals/chicken_sheet.png"), 16, 16],
      ["duck_sheet", publicAsset("/assets/animals/duck_sheet.png"), 16, 16],
      ["cow_sheet", publicAsset("/assets/animals/cow_sheet.png"), 44, 30],
      ["fx_dust", publicAsset("/assets/fx/dust.png"), 16, 16],
      ["fx_splash", publicAsset("/assets/fx/splash.png"), 16, 16],
      ["fx_sparkle", publicAsset("/assets/fx/sparkle.png"), 16, 16],
      ["water_glint", publicAsset("/assets/fx/water_glint.png"), 8, 8],
      ["butterfly_yellow", publicAsset("/assets/fx/butterfly_yellow.png"), 8, 8],
      ["butterfly_white", publicAsset("/assets/fx/butterfly_white.png"), 8, 8]
    ];

    for (const [key, path, frameWidth, frameHeight] of sheets) {
      this.load.spritesheet(key, path, { frameWidth, frameHeight });
    }
  }

  create(): void {
    // The title screen is shown before Phaser is created. FarmScene only
    // becomes visible after the player explicitly chooses a save slot.
    if (!this.enteredThroughSaveSelect) {
      document.body.classList.remove("foi-in-game", "foi-launching");
      document.getElementById("title-screen")?.classList.remove("is-hidden");
      document.getElementById("mobile-game-hud")?.setAttribute("aria-hidden", "true");
      this.scene.stop();
      return;
    }

    this.isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(max-width: 900px)").matches;
    document.body.classList.toggle("foi-touch-device", this.isTouchDevice);

    this.language = new LanguageSystem();
    this.createAnimations();
    this.createWorld();
    this.createLighting();
    this.createPlayer();
    this.createControls();
    this.createCamera();

    this.ui = new ModalUIManager(this);
    this.help = new HelpSystem(this, this.ui, this.language, this.isTouchDevice);
    this.createHUD();
    this.music = new MusicSystem(
      this, this.ui, this.language, this.isTouchDevice,
      this.selectedSaveSlot, this.loadExistingSave
    );
    this.music.setMobileHeaderHidden(this.isTouchDevice);

    this.farming = new FarmingSystem(
      this,
      this.ui,
      this.language,
      () => this.village?.getElapsedGameMinutes() ?? 0
    );
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
    this.villageBoard = new VillageBoardSystem(this, this.farming, this.market, this.fishing, this.cooking, this.ui, this.language);
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
      this.language,
      this.selectedSaveSlot,
      this.loadExistingSave
    );
    this.profile.setSaveActions(
      () => this.saveSystem.saveFromProfile(),
      () => this.saveSystem.loadFromProfile()
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
    this.applyGraphicsQuality(this.graphicsQuality);
    this.events.on("foi-graphics-quality-change", this.handleGraphicsQualityChange, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off("foi-graphics-quality-change", this.handleGraphicsQualityChange, this);
    });
    window.addEventListener("foi-menu-request", this.handleGameMenuRequest);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("foi-menu-request", this.handleGameMenuRequest);
      this.openingCutscene?.destroy();
      this.openingCutscene = undefined;
      this.openingStoryActive = false;
    });

    // tool use -> short swing animation
    this.events.on("player-action", this.playPlayerAction, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off("player-action", this.playPlayerAction, this);
    });

    // Reveal gameplay only after the complete scene and its controls are ready.
    document.body.classList.remove("foi-launching");
    document.body.classList.add("foi-in-game");
    document.getElementById("app")?.setAttribute("aria-hidden", "false");
    document.getElementById("title-screen")?.classList.add("is-hidden");
    document.getElementById("mobile-game-hud")?.setAttribute("aria-hidden", this.isTouchDevice ? "false" : "true");

    if (!this.loadExistingSave) {
      this.profile.openCharacterCreation(() => {
        this.saveSystem.completeInitialProfile();
        this.openingStoryActive = true;
        this.openingCutscene = new OpeningCutsceneSystem(
          this,
          this.language,
          () => {
            this.village.restoreAfterOpeningCutscene();
            this.cameras.main.stopFollow();
            this.cameras.main.centerOn(this.player.x, this.player.y);
            this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
            this.openingStoryActive = false;
            this.openingCutscene = undefined;
            this.joystickVector = { x: 0, y: 0 };
            this.joystickPointerId = null;
            this.joystickNub?.setPosition(this.joystickCenter.x, this.joystickCenter.y);
            this.saveSystem.saveNow();
          },
          (slideIndex) => {
            const camera = this.cameras.main;
            const focusPoints = [
              { x: this.player.x, y: this.player.y },
              { x: 760, y: 500 },
              { x: 910, y: 385 }
            ];
            this.village.stageOpeningCutsceneCharacter(slideIndex);
            const focus = focusPoints[slideIndex] ?? focusPoints[0];
            camera.stopFollow();
            camera.pan(focus.x, focus.y, 680, "Sine.easeInOut");
          },
          this.profile.getCurrentPortraitPath(),
          {
            start: () => this.music.startOpeningCutsceneAudio(),
            voice: () => this.music.playCutsceneVoice(),
            stop: () => this.music.stopOpeningCutsceneAudio()
          }
        );
      }, () => {
        this.music?.shutdown();
        window.dispatchEvent(new Event("foi-return-to-title"));
      });
    }
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
      "farmer_purple_sheet",
      "farmer_female_green_sheet", "farmer_female_blue_sheet",
      "farmer_female_red_sheet", "farmer_female_purple_sheet",
      "ma_thiri_sheet", "ko_aung_sheet", "monk_sheet", "kid_sheet"
    ];
    for (const sheet of people) {
      make(`${sheet}-down`, sheet, [0, 1, 2, 3], 8);
      make(`${sheet}-up`, sheet, [4, 5, 6, 7], 8);
      make(`${sheet}-side`, sheet, [8, 9, 10, 11], 8);
      make(`${sheet}-work`, sheet, [12, 13, 14, 15], sheet.startsWith("monk") ? 4 : 8);
      make(`${sheet}-sit`, sheet, [16, 17, 18, 19], 2);

      // Task-specific loops use the action poses already drawn in each
      // character sheet. Different rhythm and frame order make each activity
      // visibly distinct without replacing the original pixel-art characters.
      make(`${sheet}-task-market`, sheet, [0, 1, 2, 3, 2, 1], 3);
      make(`${sheet}-task-farm`, sheet, [12, 13, 14, 15, 14, 13], 8);
      make(`${sheet}-task-fish`, sheet, [8, 9, 10, 11, 10, 9], 5);
      make(`${sheet}-task-cook`, sheet, [12, 13, 14, 15, 14, 13], 5);
      make(`${sheet}-task-rest`, sheet, [16, 17, 18, 19, 18, 17], 2.5);
      make(`${sheet}-task-eat`, sheet, [0, 1, 2, 3, 2, 1], 4);
      make(`${sheet}-task-sleep`, sheet, [16, 16, 17, 17, 18, 18, 19, 19], 1.5);
      make(`${sheet}-task-sweep`, sheet, [12, 14, 13, 15, 14, 12], 7);
      make(`${sheet}-task-meditate`, sheet, [16, 16, 17, 17, 18, 18, 19, 19], 1.5);
      make(`${sheet}-task-chant`, sheet, [16, 17, 18, 19, 18, 17], 2);
      make(`${sheet}-task-play`, sheet, [12, 13, 14, 15, 14, 13], 12);
      make(`${sheet}-task-school`, sheet, [16, 17, 16, 18, 19, 18], 2.5);
      make(`${sheet}-task-skip`, sheet, [12, 13, 14, 15, 13, 12], 10);
      make(`${sheet}-task-alms`, sheet, [0, 1, 0, 1], 2.5);
      make(`${sheet}-task-offer`, sheet, [0, 1, 2, 3, 2, 1], 4);
      make(`${sheet}-task-homage`, sheet, [16, 17, 18, 19, 18, 17], 3.5);
      make(`${sheet}-task-walkMeditate`, sheet, [8, 9, 10, 11], 3);
      make(`${sheet}-task-talk`, sheet, [0, 1, 2, 3, 2, 1], 3);
      // Player-only tool animations (the farmer sheets also register these).
      make(`${sheet}-task-hoe`, sheet, [12, 13, 14, 15], 9, 0);
      make(`${sheet}-task-plant`, sheet, [12, 13, 12, 13], 5, 0);
      make(`${sheet}-task-water`, sheet, [12, 14, 15, 12], 5, 0);
      make(`${sheet}-task-harvest`, sheet, [12, 13, 14, 15], 11, 0);
      make(`${sheet}-task-clear`, sheet, [12, 14, 12], 6, 0);
    }

    make("chicken-walk", "chicken_sheet", [0, 2], 6);
    make("chicken-peck", "chicken_sheet", [0, 1, 1, 0], 5);
    make("duck-walk", "duck_sheet", [0, 1, 0, 2], 5);
    make("duck-idle", "duck_sheet", [0], 1);
    make("cow-walk", "cow_sheet", [0, 1, 2, 3], 7);
    make("cow-idle", "cow_sheet", [0], 1);

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

    // The ground (grass, dirt roads, plazas, canal, paddy bund) is one hand-painted map.
    this.add.image(0, 0, "world_ground")
      .setOrigin(0, 0)
      .setScale(PIXEL_SCALE)
      .setDepth(-100);

    this.drawCanal();
    this.drawRiceField();
    this.drawVillage();
    this.drawMonasteryCompound();
    this.drawFarmPlotFence();
    this.drawNpcFarmPlotFences();
    this.drawLotusPond();
    this.addStructureCollisions();
    this.createWorldLabels();
    this.spawnAnimals();
    this.spawnButterflies();
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
  private updateWorldLabels(delta = 16.67): void {
    const blend = 1 - Math.pow(0.85, Math.max(1, delta) / 16.67);
    for (const item of this.worldLabels) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.text.x, item.text.y);
      const target = distance < item.radius ? 1 : 0;
      item.text.setAlpha(Phaser.Math.Linear(item.text.alpha, target, blend));
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
      const sheetKey = kind === "cow" ? "cow_sheet" : `${kind}_sheet`;
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
        ty: y,
        path: [],
        pathIndex: 0,
        stuckTimer: 0,
        fleeRepathTimer: 0
      });
      this.playIdle(this.animals[this.animals.length - 1]);
    };

    // Chickens can roam the full outdoor map instead of a coop-yard rectangle.
    // Their path grid rejects buildings, fences, props, ponds and canal water,
    // but leaves the bridge open so they can cross to the riverbank.
    const villageRoam = { x1: 16, y1: 16, x2: WORLD_WIDTH - 16, y2: WORLD_HEIGHT - 16 };
    for (const [x, y] of [[120, 292], [170, 304], [245, 288], [300, 306]]) {
      add("chicken", x, y, villageRoam, 34, 18);
    }

    const canal = { x1: 60, y1: 556, x2: 520, y2: 584 };
    for (const [x, y] of [[200, 566], [255, 572], [420, 562]]) {
      add("duck", x, y, canal, 12, 20);
    }

    add("cow", 730, 408, { x1: 660, y1: 360, x2: 800, y2: 468 }, 12, 58);
  }

  private playIdle(animal: Wanderer): void {
    if (animal.kind === "chicken") animal.sprite.anims.play("chicken-peck", true);
    else if (animal.kind === "duck") animal.sprite.anims.play("duck-idle", true);
    else animal.sprite.anims.play("cow-idle", true);
  }

  private chickenCanStand(animal: Wanderer, x: number, y: number): boolean {
    if (x < animal.rect.x1 + 4 || x > animal.rect.x2 - 4 ||
        y < animal.rect.y1 + 2 || y > animal.rect.y2 - 2) return false;
    const left = x - 5;
    const right = x + 5;
    const top = y - 13;
    const bottom = y - 2;
    const touchingCanal = bottom > 532 && top < 589;
    const onBridge = left >= 1020 && right <= 1092;
    if (touchingCanal && !onBridge) return false;
    for (const obstacle of this.obstacles) {
      if (right > obstacle.x && left < obstacle.x + obstacle.width &&
          bottom > obstacle.y && top < obstacle.y + obstacle.height) return false;
    }
    return true;
  }

  /** Check a chicken's full footprint along a straight movement segment. */
  private chickenSegmentClear(animal: Wanderer, x1: number, y1: number, x2: number, y2: number): boolean {
    const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Math.max(1, Math.ceil(distance / 3));
    for (let index = 1; index <= steps; index++) {
      const t = index / steps;
      const x = Phaser.Math.Linear(x1, x2, t);
      const y = Phaser.Math.Linear(y1, y2, t);
      if (!this.chickenCanStand(animal, x, y)) return false;
    }
    return true;
  }

  /** Chickens use the same collision-aware four-way route planner as villagers. */
  private findChickenPath(animal: Wanderer, targetX: number, targetY: number): Array<{ x: number; y: number }> {
    return this.village?.findAnimalRoute(animal.sprite.x, animal.sprite.y, targetX, targetY) ?? [];
  }

  private planChickenEscape(animal: Wanderer, threat: { x: number; y: number }): boolean {
    const baseAngle = Math.atan2(animal.sprite.y - threat.y, animal.sprite.x - threat.x);
    let bestPath: Array<{ x: number; y: number }> = [];
    let bestScore = -Infinity;
    const directionCount = this.graphicsQuality === "high" ? 24 : this.graphicsQuality === "balanced" ? 16 : 10;
    for (let index = 0; index < directionCount; index++) {
      const angle = baseAngle + index * (Math.PI * 2 / directionCount);
      const targetX = Phaser.Math.Clamp(animal.sprite.x + Math.cos(angle) * 90, animal.rect.x1 + 5, animal.rect.x2 - 5);
      const targetY = Phaser.Math.Clamp(animal.sprite.y + Math.sin(angle) * 76, animal.rect.y1 + 3, animal.rect.y2 - 3);
      if (Phaser.Math.Distance.Between(animal.sprite.x, animal.sprite.y, targetX, targetY) < 12) continue;
      const path = this.findChickenPath(animal, targetX, targetY);
      if (path.length === 0) continue;
      const endpoint = path[path.length - 1];
      const threatDistance = Phaser.Math.Distance.Between(endpoint.x, endpoint.y, threat.x, threat.y);
      const routeLength = path.reduce((sum, point, pathIndex) => {
        const previous = pathIndex === 0 ? animal.sprite : path[pathIndex - 1];
        return sum + Phaser.Math.Distance.Between(previous.x, previous.y, point.x, point.y);
      }, 0);
      const score = threatDistance - routeLength * 0.18;
      if (score > bestScore) {
        bestScore = score;
        bestPath = path;
      }
    }
    if (bestPath.length === 0) return false;
    animal.path = bestPath;
    animal.pathIndex = 0;
    animal.tx = bestPath[bestPath.length - 1].x;
    animal.ty = bestPath[bestPath.length - 1].y;
    animal.state = "walk";
    animal.fleeing = 1;
    animal.timer = 10;
    animal.stuckTimer = 0;
    animal.fleeRepathTimer = 0.45;
    animal.sprite.anims.play("chicken-walk", true);
    return true;
  }

  private updateAnimals(delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    const hour = this.village?.getTimeOfDayHours() ?? 12;
    this.chickenCluckTimer -= dt;
    if (hour >= 5.5 && hour < 9.5 && this.chickenCluckTimer <= 0) {
      const chickens = this.animals.filter(animal => animal.kind === "chicken");
      if (chickens.length > 0) {
        const chicken = Phaser.Utils.Array.GetRandom(chickens);
        this.events.emit("sound-effect", {
          name: "chicken", x: chicken.sprite.x, y: chicken.sprite.y, maxDistance: 360
        });
      }
      this.chickenCluckTimer = Phaser.Math.Between(12, 24);
    } else if (hour < 5.5 || hour >= 9.5) {
      this.chickenCluckTimer = Math.max(this.chickenCluckTimer, 5);
    }
    const kid = this.village?.getKidPosition();
    for (const animal of this.animals) {
      const sprite = animal.sprite;
      animal.timer -= dt;
      animal.fleeRepathTimer = Math.max(0, animal.fleeRepathTimer - dt);

      if (animal.kind === "chicken") {
        const threats = [kid, { x: this.player.x, y: this.player.y + 20 }];
        let nearestThreat: { x: number; y: number } | null = null;
        let nearestDistance = Infinity;
        for (const threat of threats) {
          if (!threat) continue;
          const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, threat.x, threat.y);
          const limit = threat === kid ? 94 : 38;
          if (distance < limit && distance < nearestDistance) {
            nearestThreat = threat;
            nearestDistance = distance;
          }
        }
        if (nearestThreat && animal.fleeRepathTimer <= 0) this.planChickenEscape(animal, nearestThreat);
      }

      if (animal.state === "idle") {
        if (animal.timer <= 0) {
          let foundRoute = animal.kind !== "chicken";
          for (let attempt = 0; attempt < (animal.kind === "chicken" ? 8 : 1); attempt++) {
            animal.tx = Phaser.Math.Between(animal.rect.x1 + 5, animal.rect.x2 - 5);
            animal.ty = Phaser.Math.Between(animal.rect.y1 + 3, animal.rect.y2 - 3);
            animal.path = animal.kind === "chicken" ? this.findChickenPath(animal, animal.tx, animal.ty) : [];
            if (animal.kind !== "chicken" || animal.path.length > 0) {
              foundRoute = true;
              break;
            }
          }
          animal.pathIndex = 0;
          if (foundRoute) {
            animal.state = "walk";
            animal.timer = animal.kind === "chicken" ? 20 : Phaser.Math.FloatBetween(2, 5);
            sprite.anims.play(`${animal.kind}-walk`, true);
          } else {
            animal.state = "idle";
            animal.timer = 0.6;
            this.playIdle(animal);
          }
        }
        continue;
      }

      let targetX = animal.tx;
      let targetY = animal.ty;
      if (animal.kind === "chicken") {
        const waypoint = animal.path[animal.pathIndex];
        if (!waypoint) {
          animal.state = "idle";
          animal.fleeing = 0;
          animal.timer = Phaser.Math.FloatBetween(0.5, 1.8);
          this.playIdle(animal);
          continue;
        }
        targetX = waypoint.x;
        targetY = waypoint.y;
      }

      const dx = targetX - sprite.x;
      const dy = targetY - sprite.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 2 || (animal.timer <= 0 && animal.kind !== "chicken")) {
        if (animal.kind === "chicken" && animal.pathIndex < animal.path.length - 1 && distance < 2) {
          animal.pathIndex++;
          animal.stuckTimer = 0;
          continue;
        }
        animal.state = "idle";
        animal.fleeing = 0;
        animal.path = [];
        animal.timer = Phaser.Math.FloatBetween(1.5, 4.5);
        this.playIdle(animal);
        continue;
      }

      const boost = animal.fleeing && animal.kind === "chicken" ? 3.0 : 1;
      const step = Math.min(distance, animal.speed * boost * dt);
      const nextX = sprite.x + (dx / distance) * step;
      const nextY = sprite.y + (dy / distance) * step;
      const canStep = animal.kind !== "chicken" || this.chickenSegmentClear(animal, sprite.x, sprite.y, nextX, nextY);
      if (canStep) {
        sprite.x = nextX;
        sprite.y = nextY;
        animal.stuckTimer = 0;
      } else {
        animal.stuckTimer += dt;
      }
      if (animal.stuckTimer >= 0.35 && animal.kind === "chicken") {
        animal.path = [];
        animal.pathIndex = 0;
        animal.stuckTimer = 0;
        const threat = kid ?? { x: this.player.x, y: this.player.y + 20 };
        if (!this.planChickenEscape(animal, threat)) {
          let recovered = false;
          for (let attempt = 0; attempt < 10; attempt++) {
            animal.tx = Phaser.Math.Between(animal.rect.x1 + 8, animal.rect.x2 - 8);
            animal.ty = Phaser.Math.Between(animal.rect.y1 + 5, animal.rect.y2 - 5);
            const route = this.findChickenPath(animal, animal.tx, animal.ty);
            if (route.length === 0) continue;
            animal.path = route;
            animal.pathIndex = 0;
            animal.state = "walk";
            animal.fleeing = 0;
            animal.timer = 20;
            animal.sprite.anims.play("chicken-walk", true);
            recovered = true;
            break;
          }
          if (!recovered) {
            animal.state = "idle";
            animal.fleeing = 0;
            animal.timer = 0.45;
            animal.fleeRepathTimer = 0.35;
            this.playIdle(animal);
          }
        }
      }
      if (Math.abs(dx) > 1) sprite.setFlipX(dx < 0);
      if (animal.kind === "chicken" && Phaser.Math.Distance.Between(sprite.x, sprite.y, targetX, targetY) < 2) {
        animal.pathIndex++;
      }
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
      const qualityGlow = this.graphicsQuality === "low" ? 0.52 : this.graphicsQuality === "balanced" ? 0.78 : 0.92;
      const qualityFlicker = this.graphicsQuality === "low" ? 1 : flicker;
      light.glow.setAlpha(lampIntensity * qualityGlow * qualityFlicker);
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
    this.isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(max-width: 900px)").matches;

    const headerY = this.isTouchDevice ? 24 : 22;
    const positions = this.isTouchDevice
      ? { bag: 420, profile: 460, language: 500, help: 540, fullscreen: 620 }
      : { bag: 466, profile: 498, language: 530, help: 562, fullscreen: 626 };

    if (this.isTouchDevice) {
      window.addEventListener("foi-mobile-hud-action", this.handleMobileHudAction);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        window.removeEventListener("foi-mobile-hud-action", this.handleMobileHudAction);
      });
      return;
    }

    this.createFullscreenButton(positions.fullscreen, headerY);
    this.createIconButton(positions.help, headerY, "ui_icon_help", "hud.tip.help",
      () => this.help.mobileToggle());
    this.createIconButton(positions.language, headerY, "ui_icon_globe", "hud.tip.language",
      () => this.language.toggleLanguage());
    this.createIconButton(positions.profile, headerY, "ui_icon_person", "hud.tip.profile",
      () => this.profile.mobileToggle());
    this.createIconButton(positions.bag, headerY, "ui_icon_bag", "hud.tip.inventory",
      () => this.inventory.mobileToggle());
  }

  private createIconButton(
    x: number,
    y: number,
    icon: string,
    tipKey: string,
    action: () => void
  ): Phaser.GameObjects.Image {
    const frameSize = this.isTouchDevice ? 32 : 28;
    const hitSize = this.isTouchDevice ? 38 : 28;
    const frame = this.add.graphics().setScrollFactor(0).setDepth(8500);
    const left = Math.round(x - frameSize / 2);
    const top = Math.round(y - frameSize / 2);
    frame.fillStyle(0x21150f, 1).fillRect(left + 2, top + 2, frameSize, frameSize);
    frame.fillStyle(0x2a1a14, 1).fillRect(left, top, frameSize, frameSize);
    frame.fillStyle(0x4a3324, 1).fillRect(left + 3, top + 3, frameSize - 6, frameSize - 6);
    frame.fillStyle(0x8a5a34, 1).fillRect(left + 3, top + 3, frameSize - 6, 2);
    frame.fillStyle(0x8a5a34, 1).fillRect(left + 3, top + 3, 2, frameSize - 6);
    frame.fillStyle(0x2a1a14, 1).fillRect(left + 3, top + frameSize - 5, frameSize - 6, 2);
    frame.fillStyle(0x2a1a14, 1).fillRect(left + frameSize - 5, top + 3, 2, frameSize - 6);
    const image = this.add.image(x, y, icon)
      .setScale(this.isTouchDevice ? 1.45 : 1)
      .setScrollFactor(0).setDepth(8501);
    const hit = this.add.rectangle(x, y, hitSize, hitSize, 0xffffff, 0.001)
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
    hit.on("pointerdown", () => { tip.setVisible(false); action(); });
    const hideTip = (): void => { tip.setVisible(false); image.setY(y); };
    this.input.on("gameout", hideTip);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("gameout", hideTip);
      hideTip();
    });
    this.ui.registerHud(frame, image, hit, tip);
    this.ui.registerTooltip(tip);
    return image;
  }

  private createResourceHud(): void {
    const panel = pixelPanel(this, 70, 52, 108, 26).setDepth(150);
    const icon = this.add.image(34, 52, "coin_asset").setScrollFactor(0).setDepth(151);
    const style = { fontFamily: this.language.getFontFamily(), fontSize: "11px", color: "#fff1cf", stroke: "#2a1a14", strokeThickness: 2 };
    this.coinText = this.add.text(52, 46, "0", style).setScrollFactor(0).setDepth(151);
    this.ui.registerHud(panel, icon, this.coinText);
  }

  private updateResourceHud(): void {
    const coins = String(this.market.getCoins());
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

    const joystickZone = this.add.zone(
      this.joystickCenter.x,
      this.joystickCenter.y,
      124,
      124
    ).setScrollFactor(0).setDepth(8600).setInteractive();

    joystickZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.ui.hasActiveModal() && !this.ui.isOpen("house")) || this.joystickPointerId !== null) return;
      this.joystickPointerId = pointer.id;
      this.updateJoystick(pointer);
    });

    this.input.on("pointermove", this.handleJoystickMove, this);
    this.input.on("pointerup", this.handleJoystickEnd, this);
    this.input.on("pointerupoutside", this.handleJoystickEnd, this);

    const actionButtonObjects = this.createMobileActionButton(564, 267);
    const contextAction = document.getElementById("mobile-context-action") as HTMLButtonElement | null;
    contextAction?.addEventListener("pointerdown", this.handleMobileContextPointerDown, { passive: false });
    contextAction?.addEventListener("pointerup", this.handleMobileContextPointerUp, { passive: false });
    contextAction?.addEventListener("pointercancel", this.handleMobileContextPointerCancel);
    contextAction?.addEventListener("click", this.handleMobileContextKeyboardClick);

    this.ui.registerHud(
      base,
      innerRing,
      joystickNub,
      joystickZone,
      ...actionButtonObjects
    );
    this.ui.registerRoomControls(base, innerRing, joystickNub, joystickZone, ...actionButtonObjects);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointermove", this.handleJoystickMove, this);
      this.input.off("pointerup", this.handleJoystickEnd, this);
      this.input.off("pointerupoutside", this.handleJoystickEnd, this);
      contextAction?.removeEventListener("pointerdown", this.handleMobileContextPointerDown);
      contextAction?.removeEventListener("pointerup", this.handleMobileContextPointerUp);
      contextAction?.removeEventListener("pointercancel", this.handleMobileContextPointerCancel);
      contextAction?.removeEventListener("click", this.handleMobileContextKeyboardClick);
      if (contextAction) contextAction.hidden = true;
      this.mobileContextPointerId = null;
      this.joystickPointerId = null;
      this.joystickVector = { x: 0, y: 0 };
    });
  }

  private createMobileActionButton(x: number, y: number): Phaser.GameObjects.GameObject[] {
    const hitSurface = this.add.rectangle(x, y, 132, 132, 0xffffff, 0.001)
      .setScrollFactor(0)
      .setDepth(8601)
      .setInteractive({ useHandCursor: true });
    const outerFrame = this.add.rectangle(x, y, 88, 88, 0x2a1a14, 1)
      .setStrokeStyle(3, 0xd6b36b, 1).setScrollFactor(0);
    const innerFrame = this.add.rectangle(x, y, 80, 80, 0x4a3324, 0.98)
      .setStrokeStyle(2, 0xb88450, 1).setScrollFactor(0);
    const image = this.add.image(x, y - 11, "ui_icon_action")
      .setScale(2.65).setScrollFactor(0);
    const label = this.add.text(x, y + 30, "USE", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "12px",
      color: "#ffd978",
      stroke: "#2a1a14",
      strokeThickness: 2,
      fontStyle: "bold"
    }).setOrigin(0.5).setScrollFactor(0);

    hitSurface.on("pointerdown", () => {
      outerFrame.setScale(0.94);
      innerFrame.setScale(0.94);
      if (this.ui.hasActiveModal()) return;
      if (!this.fishing.mobileAction(this.player.x, this.player.y)) {
        this.farming.mobileUseTool();
      }
    });
    const release = (): void => {
      outerFrame.setScale(1);
      innerFrame.setScale(1);
    };
    hitSurface.on("pointerup", release);
    hitSurface.on("pointerupoutside", release);
    hitSurface.on("pointerout", release);

    this.language.onChange(() => label.setFontFamily(this.language.getFontFamily()));
    return [hitSurface, outerFrame, innerFrame, image, label];
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

  private getMobileContextTarget(): "home" | "board" | "market" | "villager" | null {
    const x = this.player.x;
    const y = this.player.y;

    if (this.house.canMobileInteract(x, y)) return "home";

    const nearBoard = this.villageBoard.canMobileInteract(x, y);
    const nearMarket = this.market.canMobileInteract(x, y);

    // The board and market interaction radii overlap in the village square.
    // Select the nearer landmark so the prompt and the tap always agree.
    if (nearBoard && nearMarket) {
      return this.villageBoard.mobileInteractionDistance(x, y) <=
        this.market.mobileInteractionDistance(x, y) ? "board" : "market";
    }
    if (nearBoard) return "board";
    if (nearMarket) return "market";

    // A nearby villager must not swallow a tap intended for the shop or board.
    if (this.village.canMobileTalk(x, y)) return "villager";
    return null;
  }

  private handleMobileTalk(): void {
    // While a villager dialogue is open, the same native button advances it.
    // This check must happen before the generic modal guard below.
    if (this.village?.isDialogueOpen()) {
      this.village.mobileTalk(this.player.x, this.player.y);
      return;
    }
    // Indoors, the same native contextual button activates the room's current
    // target (bed, chest, cooker or door), just as it activates the market outdoors.
    if (this.house?.isInside()) {
      this.house.mobileInteractPrompt();
      return;
    }
    if (this.ui.hasActiveModal()) return;
    const x = this.player.x;
    const y = this.player.y;

    switch (this.getMobileContextTarget()) {
      case "home":
        this.house.mobileInteract(x, y);
        break;
      case "board":
        this.villageBoard.mobileInteract(x, y);
        break;
      case "market":
        this.market.mobileInteract(x, y);
        break;
      case "villager":
        this.village.mobileTalk(x, y);
        break;
    }
  }

  private updateMobileContextAction(): void {
    const button = document.getElementById("mobile-context-action") as HTMLButtonElement | null;
    if (!button || !this.isTouchDevice) return;

    if (this.village?.isDialogueOpen()) {
      const continueLabel = this.language.t("mobile.continueDialogue");
      button.hidden = false;
      button.textContent = continueLabel;
      button.setAttribute("aria-label", continueLabel);
      return;
    }

    if (this.house?.isInside()) {
      const roomLabel = this.house.getMobileActionLabel();
      button.hidden = roomLabel === null;
      if (roomLabel) {
        button.textContent = roomLabel;
        button.setAttribute("aria-label", roomLabel);
      }
      return;
    }

    if (this.ui.hasActiveModal()) {
      button.hidden = true;
      return;
    }
    const target = this.getMobileContextTarget();
    const labelKeys = {
      home: "mobile.clickOpenHome",
      board: "mobile.clickOpenRequests",
      market: "mobile.clickOpenMarket",
      villager: "mobile.clickTalkVillager"
    } as const;
    const labelKey = target ? labelKeys[target] : null;
    button.hidden = labelKey === null;
    if (labelKey) {
      button.textContent = this.language.t(labelKey);
      button.setAttribute("aria-label", this.language.t(labelKey));
    }
  }

  private createFullscreenButton(x = 626, y = 22): void {
    this.fullscreenIcon = this.createIconButton(x, y, "ui_icon_expand", "hud.tip.fullscreen",
      () => this.toggleFullscreenForDevice());

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

  private toggleFullscreenForDevice(): void {
    const container = document.getElementById("game-container");
    if (!container) return;
    if (document.body.classList.contains("foi-mobile-fullscreen")) {
      document.body.classList.remove("foi-mobile-fullscreen");
      this.scale.refresh();
      return;
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => undefined);
      return;
    }
    const requestFullscreen = container.requestFullscreen || (container as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen;
    if (requestFullscreen) {
      try {
        const result = requestFullscreen.call(container);
        if (result && typeof result.then === "function") {
          void result.catch(() => {
            document.body.classList.add("foi-mobile-fullscreen");
            this.scale.refresh();
          });
        }
      } catch {
        document.body.classList.add("foi-mobile-fullscreen");
        this.scale.refresh();
      }
    } else {
      document.body.classList.add("foi-mobile-fullscreen");
      this.scale.refresh();
    }
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

  private handleGraphicsQualityChange = (quality: GraphicsQuality): void => {
    this.applyGraphicsQuality(quality);
  };

  private applyGraphicsQuality(quality: GraphicsQuality): void {
    this.graphicsQuality = quality;
    const reduced = quality === "low";
    for (const butterfly of this.butterflies) butterfly.sprite.setVisible(!reduced);
    for (const animal of this.animals) animal.shadow.setVisible(!reduced);
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
    if (this.openingStoryActive) {
      this.animatePlayer(0, 0, false);
      return;
    }

    if (!this.canMoveTo(this.player.x, this.player.y)) {
      this.player.setPosition(320, 330);
    }

    this.music.setListenerPosition(this.player.x, this.player.y);
    this.updateAnimals(delta);

    const uiRefreshInterval = this.graphicsQuality === "high" ? 90 : this.graphicsQuality === "balanced" ? 120 : 150;
    const lightingRefreshInterval = this.graphicsQuality === "high" ? 50 : this.graphicsQuality === "balanced" ? 100 : 180;
    this.updateWorldLabels(delta);
    this.performanceUiElapsed += delta;
    this.performanceLightingElapsed += delta;

    if (this.graphicsQuality === "high") {
      this.updateButterflies(delta);
    } else if (this.graphicsQuality === "balanced") {
      this.performanceButterflyElapsed += delta;
      if (this.performanceButterflyElapsed >= 1000 / 30) {
        this.updateButterflies(this.performanceButterflyElapsed);
        this.performanceButterflyElapsed = 0;
      }
    }

    if (this.performanceUiElapsed >= uiRefreshInterval) {
      this.updateResourceHud();
      this.updateMobileContextAction();
      this.performanceUiElapsed = 0;
    }

    if (this.performanceLightingElapsed >= lightingRefreshInterval) {
      this.updateLighting();
      this.performanceLightingElapsed = 0;
    }
    this.music.setTimeOfDayHours(this.village.getTimeOfDayHours());

    // Farming and daily village requests share the exact same 24-hour game clock.
    this.farming.syncGameDay(this.village.getGameDay(), this.village.getElapsedGameMinutes());

    const activeModal = this.ui.getActiveModal();
    if (activeModal !== null) {
      this.animatePlayer(0, 0, false);
      if (activeModal === "house") {
        this.house.update(this.player.x, this.player.y, delta, this.joystickVector);
      } else {
        this.joystickVector = { x: 0, y: 0 };
        this.joystickPointerId = null;
        this.joystickNub?.setPosition(this.joystickCenter.x, this.joystickCenter.y);
        switch (activeModal) {
          case "market": this.market.update(this.player.x, this.player.y); break;
          case "inventory": this.inventory.update(this.player.x, this.player.y); break;
          case "board": this.villageBoard.update(this.player.x, this.player.y); break;
          case "dialogue": this.village.update(this.player.x, this.player.y); break;
          case "cooking": this.cooking.update(this.player.x, this.player.y); break;
          case "chest": this.chest.update(); break;
        }
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

    // The market owns E when the player is within its interaction radius.
    // Run it before villager dialogue so Ko Aung or Ma Thiri cannot consume
    // the same key press when they are visiting the market square.
    this.market.update(this.player.x, this.player.y);
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
      const previousX = this.player.x;
      const previousY = this.player.y;
      const step = PLAYER_SPEED * Math.min(delta, 40) / 1000;
      const nextX = this.player.x + moveX * step;
      const nextY = this.player.y + moveY * step;

      if (this.canMoveTo(nextX, this.player.y)) this.player.x = nextX;
      if (this.canMoveTo(this.player.x, nextY)) this.player.y = nextY;

      const distanceMoved = Math.hypot(this.player.x - previousX, this.player.y - previousY);
      if (distanceMoved > 0.5) {
        this.footstepCooldown -= delta;
        if (this.footstepCooldown <= 0) {
          this.events.emit("sound-effect", { name: "footstep", x: this.player.x, y: this.player.y, maxDistance: 135 });
          this.footstepCooldown = Phaser.Math.Between(300, 360);
        }
      }
      this.animatePlayer(moveX, moveY, true);
    } else {
      this.footstepCooldown = 0;
      this.animatePlayer(0, 0, false);
    }

    this.player.setDepth(this.player.y + 30);
    if (this.ui.hasActiveModal()) return;
    const fishingConsumesAction = this.fishing.update(this.player.x, this.player.y, delta, false);
    if (!fishingConsumesAction) this.farming.update(this.player.x, this.player.y);
  }
}
