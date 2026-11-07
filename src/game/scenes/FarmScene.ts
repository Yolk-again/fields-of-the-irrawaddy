
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

const WORLD_WIDTH = 1440;
const WORLD_HEIGHT = 640;
const PLAYER_SPEED = 125;

type Obstacle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export class FarmScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private farming!: FarmingSystem;
  private market!: MarketSystem;
  private village!: VillageSystem;
  private inventory!: InventorySystem;
  private crafting!: CraftingSystem;
  public saveSystem!: SaveSystem;
  private profile!: PlayerProfileSystem;
  private ui!: ModalUIManager;
  private language!: LanguageSystem;

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
      ["lotus_pond_asset", "/assets/water/lotus_pond.png"],
      ["bridge_asset", "/assets/water/wooden_bridge_asset.png"],
      ["fruit_tree_round", "/assets/vegetation/fruit_tree_round.png"],
      ["fruit_tree_large", "/assets/vegetation/fruit_tree_large.png"],
      ["palm_tree_tall", "/assets/vegetation/palm_tree_tall.png"],
      ["palm_tree_small", "/assets/vegetation/palm_tree_small.png"],
      ["vegetable_bed_asset", "/assets/decorations/raised_vegetable_bed.png"],
      ["flower_bed_asset", "/assets/decorations/flower_bed.png"],
      ["potted_plants_asset", "/assets/decorations/potted_plants_row.png"],
      ["irrigation_asset", "/assets/decorations/irrigation_channel.png"],
      ["bamboo_fence_asset", "/assets/decorations/bamboo_fence_segment.png"],
      ["bamboo_planter_asset", "/assets/decorations/bamboo_planter.png"],
      ["village_sign_asset", "/assets/decorations/village_sign.png"],
      ["haystack_asset", "/assets/agriculture/haystack.png"],
      ["rice_bundle_asset", "/assets/agriculture/rice_bundle.png"],
      ["rice_plant_01", "/assets/agriculture/young_rice_plant_01.png"],
      ["rice_plant_02", "/assets/agriculture/young_rice_plant_02.png"],
      ["rice_plant_03", "/assets/agriculture/young_rice_plant_03.png"],
      ["scarecrow_asset", "/assets/agriculture/scarecrow.png"],
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
      ["farmer_green_asset", "/assets/characters/farmer_green.png"],
      ["farmer_blue_asset", "/assets/characters/farmer_blue.png"],
      ["farmer_red_asset", "/assets/characters/farmer_red.png"],
      ["farmer_purple_asset", "/assets/characters/farmer_purple.png"],
      ["ma_thiri_asset", "/assets/characters/ma_thiri.png"],
      ["ko_aung_asset", "/assets/characters/ko_aung.png"],
      ["chicken_asset", "/assets/animals/chicken.png"],
      ["duck_asset", "/assets/animals/duck.png"],
      ["water_buffalo_asset", "/assets/animals/water_buffalo.png"]
    ];

    for (const [key, path] of imageAssets) {
      this.load.image(key, path);
    }
  }

  create(): void {
    this.language = new LanguageSystem();
    this.createWorld();
    this.createPlayer();
    this.createControls();
    this.createCamera();

    this.ui = new ModalUIManager(this);
    this.createHUD();

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
  }

  private createWorld(): void {
    this.obstacles = [];
    this.worldLabels = [];

    this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, "world_ground")
      .setOrigin(0.5)
      .setDepth(-100);

    this.drawPaths();
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
    this.addBuildingCollisions();
    this.createWorldLabels();
  }

  private drawPaths(): void {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x886746, 0.92);
    g.fillRect(0, 270, WORLD_WIDTH, 44);
    g.fillRect(174, 205, 40, 109);
    g.fillRect(1032, 310, 48, 214);
    g.fillStyle(0xb08d61, 1);
    g.fillRect(0, 274, WORLD_WIDTH, 36);
    g.fillRect(180, 205, 28, 105);
    g.fillRect(1038, 310, 36, 214);

    const random = new Phaser.Math.RandomDataGenerator(["irrawaddy-road-details"]);
    g.fillStyle(0xd3b48a, 0.55);
    for (let i = 0; i < 145; i++) {
      const x = random.between(5, WORLD_WIDTH - 5);
      const y = random.between(278, 307);
      g.fillRect(x, y, random.between(1, 3), random.between(1, 2));
    }
  }

  private drawFarmhouse(): void {
    this.add.image(190, 250, "player_home_asset")
      .setOrigin(0.5, 1)
      .setDisplaySize(174, 155)
      .setDepth(250);

    this.add.image(75, 480, "potted_plants_asset")
      .setOrigin(0.5, 1)
      .setDisplaySize(68, 28)
      .setDepth(480);
  }

  private drawGranary(): void {
    this.add.image(355, 165, "granary_asset")
      .setOrigin(0.5, 1)
      .setDisplaySize(100, 84)
      .setDepth(165);
  }

  private drawWaterJars(): void {
    const g = this.add.graphics().setDepth(250);
    for (const x of [285, 310]) {
      g.fillStyle(0x593a27, 1).fillEllipse(x, 243, 17, 6);
      g.fillStyle(0x986344, 1).fillEllipse(x, 231, 14, 18);
      g.fillStyle(0xb77d55, 1).fillEllipse(x, 223, 10, 7);
      g.fillStyle(0x593a27, 1).fillEllipse(x, 219, 7, 3);
      g.fillStyle(0xd1a176, 1).fillRect(x - 6, 226, 3, 3);
    }
  }

  private drawRiceDryingArea(): void {
    const mat = this.add.graphics().setDepth(500);
    mat.fillStyle(0x795332, 1).fillRoundedRect(684, 486, 52, 14, 4);
    mat.fillStyle(0xd6b36b, 1).fillRoundedRect(687, 488, 46, 9, 3);
    mat.fillStyle(0xe6cd86, 1);
    for (let x = 691; x < 731; x += 7) {
      mat.fillRect(x, 490, 3, 2);
      mat.fillRect(x + 2, 495, 2, 2);
    }
  }

  private drawRiceField(): void {
    const x = 425;
    const y = 330;
    const width = 273;
    const height = 144;
    const g = this.add.graphics().setDepth(10);

    g.fillStyle(0x755b3c, 1).fillRoundedRect(x, y, width, height, 7);
    g.fillStyle(0x75a89a, 1).fillRoundedRect(x + 5, y + 5, width - 10, height - 10, 5);

    for (let row = 0; row < 6; row++) {
      const rowY = y + 17 + row * 22;
      g.fillStyle(0xa5c4a0, 0.8).fillRoundedRect(x + 12, rowY, width - 24, 2, 1);
      g.fillStyle(0x477d70, 0.55).fillRect(x + 12, rowY + 9, width - 24, 1);

      for (let col = 0; col < 8; col++) {
        const plantX = x + 24 + col * 29;
        const plantY = rowY + 7;
        const textures = ["rice_plant_01", "rice_plant_02", "rice_plant_03"];
        this.add.image(plantX, plantY, textures[(row + col) % textures.length])
          .setOrigin(0.5, 0.8)
          .setDisplaySize(17, 20)
          .setDepth(plantY + 1);
      }
    }

    g.lineStyle(2, 0x92754c, 1).strokeRoundedRect(x, y, width, height, 7);
  }

  private drawCanal(): void {
    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0x426a54, 1).fillRect(0, 522, WORLD_WIDTH, 78);
    g.fillStyle(0x57958a, 1).fillRect(0, 528, WORLD_WIDTH, 66);
    g.fillStyle(0x72b5ab, 1).fillRect(0, 536, WORLD_WIDTH, 49);

    const random = new Phaser.Math.RandomDataGenerator(["canal-water-details"]);
    for (let i = 0; i < 65; i++) {
      g.fillStyle(0xb4d8c9, random.realInRange(0.25, 0.6));
      g.fillRoundedRect(
        random.between(0, WORLD_WIDTH - 25),
        random.between(539, 583),
        random.between(7, 22),
        2,
        1
      );
    }

    this.add.image(1056, 555, "bridge_asset")
      .setOrigin(0.5)
      .setDisplaySize(112, 75)
      .setDepth(560);
  }

  private drawVegetableGarden(): void {
    this.add.image(125, 448, "vegetable_bed_asset")
      .setOrigin(0.5, 1)
      .setDisplaySize(150, 62)
      .setDepth(448);
  }

  private drawFarmPlotFence(): void {
    const fencePositions = [
      { x: 250, y: 347, width: 50, height: 11 },
      { x: 360, y: 347, width: 68, height: 11 },
      { x: 246, y: 347, width: 11, height: 120 },
      { x: 420, y: 347, width: 11, height: 120 },
      { x: 250, y: 460, width: 178, height: 11 }
    ];

    const g = this.add.graphics().setDepth(460);
    for (const fence of fencePositions) {
      const count = Math.max(1, Math.floor((fence.width || fence.height) / 16));
      if (fence.width > fence.height) {
        g.fillStyle(0x68452e, 1).fillRect(fence.x, fence.y, fence.width, 4);
        g.fillRect(fence.x, fence.y + 6, fence.width, 3);
        for (let i = 0; i <= count; i++) {
          const px = fence.x + (fence.width / count) * i;
          g.fillStyle(0xb88a58, 1).fillRect(px, fence.y - 4, 4, 17);
        }
      } else {
        g.fillStyle(0x68452e, 1).fillRect(fence.x, fence.y, 4, fence.height);
        g.fillRect(fence.x + 6, fence.y, 3, fence.height);
        for (let i = 0; i <= count; i++) {
          const py = fence.y + (fence.height / count) * i;
          g.fillStyle(0xb88a58, 1).fillRect(fence.x - 4, py, 13, 4);
        }
      }
    }
  }

  private drawScarecrow(): void {
    this.add.image(222, 432, "scarecrow_asset")
      .setOrigin(0.5, 1)
      .setDisplaySize(55, 68)
      .setDepth(432);
  }

  private drawAgricultureDecorations(): void {
    this.add.image(790, 477, "haystack_asset")
      .setOrigin(0.5, 1)
      .setDisplaySize(67, 54)
      .setDepth(477);

    this.add.image(710, 478, "rice_bundle_asset")
      .setOrigin(0.5, 1)
      .setDisplaySize(36, 35)
      .setDepth(478);

    this.add.image(825, 506, "irrigation_asset")
      .setOrigin(0.5, 1)
      .setDisplaySize(165, 22)
      .setDepth(505);

    this.add.image(1135, 470, "flower_bed_asset")
      .setOrigin(0.5, 1)
      .setDisplaySize(110, 58)
      .setDepth(470);
  }

  private drawBambooGrove(): void {
    const g = this.add.graphics().setDepth(8);
    const positions = [[875, 390], [900, 375], [925, 400], [950, 380], [975, 405]];

    for (const [x, y] of positions) {
      g.fillStyle(0x397b45, 1).fillRect(x, y - 55, 5, 65);
      g.fillStyle(0x78a84a, 1).fillRect(x + 6, y - 45, 4, 55);
      g.fillStyle(0x274f32, 1).fillRect(x - 2, y - 25, 9, 3);
      g.fillRect(x + 4, y - 9, 8, 3);
      g.fillStyle(0x6b9c50, 1);
      g.fillTriangle(x + 2, y - 43, x - 14, y - 55, x + 2, y - 34);
      g.fillTriangle(x + 8, y - 29, x + 22, y - 42, x + 8, y - 22);
      g.fillTriangle(x + 2, y - 14, x - 13, y - 23, x + 3, y - 8);
      this.obstacles.push({ x: x - 5, y: y - 20, width: 18, height: 22 });
    }
  }

  private drawMonastery(): void {
    this.add.image(1227, 235, "monastery_asset")
      .setOrigin(0.5, 1)
      .setDisplaySize(140, 145)
      .setDepth(235);
  }

  private drawLotusPond(): void {
    this.add.image(1285, 440, "lotus_pond_asset")
      .setOrigin(0.5)
      .setDisplaySize(170, 132)
      .setDepth(440);
  }

  private drawTrees(): void {
    this.placeTree("palm_tree_tall", 65, 220, 70, 116);
    this.placeTree("fruit_tree_round", 930, 230, 83, 120);
    this.placeTree("fruit_tree_large", 1380, 220, 96, 120);
    this.placeTree("palm_tree_small", 1120, 230, 58, 64);
  }

  private placeTree(texture: string, x: number, y: number, width: number, height: number): void {
    this.add.image(x, y, texture)
      .setOrigin(0.5, 1)
      .setDisplaySize(width, height)
      .setDepth(y);

    this.obstacles.push({ x: x - 8, y: y - 25, width: 16, height: 30 });
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
    this.addWorldLabel(930, 325, "world.bambooGrove");
    this.addWorldLabel(1227, 76, "world.monastery");
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
      backgroundColor: "#34271d",
      padding: { x: 5, y: 3 }
    }).setOrigin(0.5).setDepth(40);

    this.worldLabels.push({ text, key });
  }

  private createPlayer(): void {
    this.player = this.add.container(320, 330);

    const shadow = this.add.ellipse(0, 17, 24, 8, 0x405234, 0.65);
    const sprite = this.add.image(0, 0, "farmer_green_asset")
      .setDisplaySize(32, 42)
      .setName("farmerSprite");

    this.player.add([shadow, sprite]);
    this.player.setDepth(this.player.y + 30);
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
    const titleBackground = this.add.rectangle(12, 12, 260, 43, 0x34271d, 0.96)
      .setOrigin(0).setScrollFactor(0).setDepth(100);
    titleBackground.setStrokeStyle(2, 0xd6b36b);

    const title = this.add.text(22, 18, "FIELDS OF THE IRRAWADDY", {
      fontFamily: "monospace", fontSize: "12px", color: "#f2e6c5", fontStyle: "bold"
    }).setScrollFactor(0).setDepth(101);

    const subtitle = this.add.text(22, 36, "မြန်မာ့ကျေးလက်ဘဝ", {
      fontFamily: "Noto Sans Myanmar, Myanmar Text, sans-serif", fontSize: "10px", color: "#e6c47e"
    }).setScrollFactor(0).setDepth(101);

    const movementBackground = this.add.rectangle(10, 326, 213, 25, 0x34271d, 0.96)
      .setOrigin(0).setScrollFactor(0).setDepth(100);
    movementBackground.setStrokeStyle(1, 0xd6b36b);

    const movementText = this.add.text(18, 334, "MOVE: WASD / ARROW KEYS", {
      fontFamily: "monospace", fontSize: "9px", color: "#f2e6c5"
    }).setScrollFactor(0).setDepth(101);

    this.ui.registerHud(titleBackground, title, subtitle, movementBackground, movementText);
    this.createFullscreenButton();
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

    const activeModal = this.ui.getActiveModal();
    if (activeModal !== null) {
      switch (activeModal) {
        case "market": this.market.update(this.player.x, this.player.y); break;
        case "inventory": this.inventory.update(this.player.x, this.player.y); break;
        case "crafting": this.crafting.update(this.player.x, this.player.y); break;
        case "dialogue": this.village.update(this.player.x, this.player.y); break;
        case "profile": this.profile.update(); break;
      }
      return;
    }

    this.profile.update();
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

    const length = Math.hypot(moveX, moveY);
    if (length > 0) {
      moveX /= length;
      moveY /= length;
      const step = PLAYER_SPEED * Math.min(delta, 40) / 1000;
      const nextX = this.player.x + moveX * step;
      const nextY = this.player.y + moveY * step;

      if (this.canMoveTo(nextX, this.player.y)) this.player.x = nextX;
      if (this.canMoveTo(this.player.x, nextY)) this.player.y = nextY;

      if (moveX < 0) this.player.setScale(-1, 1);
      else if (moveX > 0) this.player.setScale(1, 1);
    }

    this.player.setDepth(this.player.y + 30);
    this.market.update(this.player.x, this.player.y);
    if (this.ui.hasActiveModal()) return;
    this.farming.update(this.player.x, this.player.y);
  }
}
