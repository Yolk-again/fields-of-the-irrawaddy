import Phaser from "phaser";
import { FarmingSystem } from "./FarmingSystem";
import { MarketSystem } from "./MarketSystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, modalPanel } from "../ui/PixelUI";

interface VillageBoardSaveData {
  day: number;
  riceRequired: number;
  delivered: boolean;
  lastRiceRequired?: number;
}

/** A daily community delivery board that ties farming to useful progression rewards. */
export class VillageBoardSystem {
  private readonly scene: Phaser.Scene;
  private readonly farming: FarmingSystem;
  private readonly market: MarketSystem;
  private readonly ui: ModalUIManager;
  private readonly language: LanguageSystem;

  private readonly boardX = 435;
  private readonly boardY = 258;
  private day = 1;
  private riceRequired = 3;
  private lastRiceRequired = 0;
  private delivered = false;
  private isOpen = false;

  private interactKey!: Phaser.Input.Keyboard.Key;
  private deliverKey!: Phaser.Input.Keyboard.Key;

  private promptText!: Phaser.GameObjects.Text;
  private boardLabel!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Container;
  private closeButton!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private requestText!: Phaser.GameObjects.Text;
  private rewardText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private deliverText!: Phaser.GameObjects.Text;
  private exitHintText!: Phaser.GameObjects.Text;
  private deliverCard!: Phaser.GameObjects.Rectangle;
  private progressTrack!: Phaser.GameObjects.Rectangle;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private rewardCoinIcon!: Phaser.GameObjects.Image;
  private rewardSeedIcon!: Phaser.GameObjects.Image;
  private readonly touchMode = ("ontouchstart" in window) || navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;

  constructor(
    scene: Phaser.Scene,
    farming: FarmingSystem,
    market: MarketSystem,
    ui: ModalUIManager,
    language: LanguageSystem
  ) {
    this.scene = scene;
    this.farming = farming;
    this.market = market;
    this.ui = ui;
    this.language = language;

    this.day = this.farming.getDay();
    this.rollDailyRequest();
    this.createBoardProp();
    this.createControls();
    this.createInterface();
    this.scene.input.on("pointerup", this.handleBoardPointerUp, this);
    this.scene.input.on("pointermove", this.handleBoardPointerMove, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.input.off("pointerup", this.handleBoardPointerUp, this);
      this.scene.input.off("pointermove", this.handleBoardPointerMove, this);
      this.scene.game.canvas.style.cursor = "default";
    });

    this.ui.registerPanel("board", this.panel, 270, () => {
      this.isOpen = false;
      this.interactKey.reset();
      this.deliverKey.reset();
    }, this.closeButton);
    this.ui.registerHud(this.promptText);
    this.language.onChange(() => this.updateInterface());
  }

  private requestOptionsForDay(day: number): number[] {
    if (day <= 3) return [5, 6, 7];
    if (day <= 7) return [7, 8, 9, 10];
    if (day <= 15) return [9, 10, 12, 13];
    return [10, 12, 14, 15];
  }

  private rollDailyRequest(): void {
    this.day = this.farming.getDay();
    const previous = this.riceRequired;
    const options = this.requestOptionsForDay(this.day).filter(amount => amount !== previous);
    this.riceRequired = Phaser.Utils.Array.GetRandom(options) ?? this.requestOptionsForDay(this.day)[0];
    this.lastRiceRequired = previous;
    this.delivered = false;
  }

  private createBoardProp(): void {
    const board = this.scene.add.container(this.boardX, this.boardY).setDepth(this.boardY + 2);
    const shadow = this.scene.add.ellipse(0, 0, 54, 10, 0x1b2617, 0.3);
    const posts = this.scene.add.graphics();
    posts.fillStyle(0x57351f, 1).fillRect(-17, -35, 5, 38).fillRect(12, -35, 5, 38);
    posts.fillStyle(0xb88450, 1).fillRect(-16, -35, 2, 34).fillRect(13, -35, 2, 34);
    posts.fillStyle(0x5e3b22, 1).fillRect(-24, -42, 48, 29);
    posts.fillStyle(0xb88450, 1).fillRect(-22, -40, 44, 25);
    posts.fillStyle(0x2a1a14, 1).fillRect(-19, -37, 38, 19);
    posts.fillStyle(0xd6b36b, 1).fillRect(-17, -35, 34, 15);
    posts.fillStyle(0xfff1cf, 1).fillRect(-13, -32, 10, 8).fillRect(3, -32, 10, 8);
    posts.fillStyle(0xb88450, 1).fillRect(-12, -31, 8, 6).fillRect(4, -31, 8, 6);
    posts.fillStyle(0xc9993f, 1).fillRect(-2, -38, 4, 4);
    const pin = this.scene.add.circle(-2, -29, 2, 0xb94f39);
    board.add([shadow, posts, pin]);

    this.boardLabel = this.scene.add.text(this.boardX, this.boardY - 61, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#fff1cf",
      backgroundColor: "#2a1a14",
      padding: { x: 5, y: 3 },
      stroke: "#2a1a14",
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(600);

    this.promptText = this.scene.add.text(320, 286, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#fff1cf",
      backgroundColor: "#2a1a14", padding: { x: 7, y: 4 },
      stroke: "#2a1a14", strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(7200).setVisible(false);
  }

  private createControls(): void {
    const keyboard = this.scene.input.keyboard!;
    this.interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.deliverKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
  }

  private createInterface(): void {
    this.panel = this.scene.add.container(0, 0).setScrollFactor(0);
    const background = modalPanel(this.scene, 320, 180, 520, 284);
    const divider = this.scene.add.rectangle(320, 99, 468, 2, 0x9b7047, 0.9);

    this.titleText = this.scene.add.text(320, 56, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "16px", color: "#e6c47e", fontStyle: "bold",
      align: "center", wordWrap: { width: 450 }
    }).setOrigin(0.5);
    this.subtitleText = this.scene.add.text(320, 80, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#d7e6c5", align: "center",
      wordWrap: { width: 452 }
    }).setOrigin(0.5);

    const requestCard = this.scene.add.rectangle(320, 151, 454, 82, 0x3d4b34, 1);
    requestCard.setStrokeStyle(2, 0x9b7047);
    const riceIcon = this.scene.add.image(145, 151, "rice_bowl_asset").setScale(2);
    this.requestText = this.scene.add.text(185, 128, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "15px", color: "#fff1cf", fontStyle: "bold"
    });
    this.rewardCoinIcon = this.scene.add.image(205, 169, "coin_asset").setScale(0.95);
    this.rewardSeedIcon = this.scene.add.image(435, 169, "rice_seed_bag_asset").setScale(0.95);
    this.rewardText = this.scene.add.text(320, 169, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#f0d69e", fontStyle: "bold", align: "center"
    }).setOrigin(0.5);
    this.statusText = this.scene.add.text(320, 214, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "11px", color: "#d7e6c5", align: "center", fontStyle: "bold"
    }).setOrigin(0.5);
    this.progressTrack = this.scene.add.rectangle(320, 240, 300, 10, 0x263327, 1).setStrokeStyle(1, 0x9b7047);
    this.progressFill = this.scene.add.rectangle(170, 240, 1, 6, 0x79b35d, 1).setOrigin(0, 0.5);

    this.deliverCard = this.scene.add.rectangle(320, 267, 276, 38, 0x527044, 1);
    this.deliverCard.setStrokeStyle(2, 0xd6b36b);

    this.deliverText = this.scene.add.text(320, 267, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "12px", color: "#fff1cf", fontStyle: "bold"
    }).setOrigin(0.5);
    this.exitHintText = this.scene.add.text(320, 310, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#d7e6c5"
    }).setOrigin(0.5);
    const closePosition = modalClosePosition(320, 180, 520, 284);
    this.closeButton = createRedCloseButton(this.scene, closePosition.x, closePosition.y);

    this.panel.add([
      background, divider, this.titleText, this.subtitleText, requestCard, riceIcon,
      this.requestText, this.rewardCoinIcon, this.rewardSeedIcon, this.rewardText, this.statusText,
      this.progressTrack, this.progressFill, this.deliverCard, this.deliverText, this.exitHintText, this.closeButton
    ]);
    this.updateInterface();
  }

  private get coinReward(): number {
    return this.riceRequired * 3 + 5;
  }

  private get seedReward(): number {
    return Math.max(1, Math.floor(this.riceRequired / 7));
  }

  /** Screen-space pointer handling for the visible delivery button. */
  private isPointerOverDeliverButton(pointer: Phaser.Input.Pointer): boolean {
    // The green card is centred at (320, 267), sized 276 x 38 in the 640x360 HUD.
    return pointer.x >= 182 && pointer.x <= 458 && pointer.y >= 248 && pointer.y <= 286;
  }

  private handleBoardPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("board") || this.delivered) return;
    if (this.isPointerOverDeliverButton(pointer)) this.deliverRice();
  };

  private handleBoardPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.deliverCard) return;
    if (!this.isOpen || !this.ui.isOpen("board") || this.delivered) {
      // Button color and progress indicator make the required delivery state visible at a glance.
      this.scene.game.canvas.style.cursor = "default";
      return;
    }
    const overButton = this.isPointerOverDeliverButton(pointer);
    this.deliverCard.setFillStyle(overButton ? 0x668651 : 0x527044, 1);
    this.scene.game.canvas.style.cursor = overButton ? "pointer" : "default";
  };

  private updateInterface(): void {
    const font = this.language.getFontFamily();
    this.titleText.setText(this.language.t("board.title"));
    this.subtitleText.setText(this.language.t("board.subtitle"));
    this.boardLabel.setText(this.language.t("board.label"));
    this.promptText.setText(this.language.t("board.prompt"));
    this.requestText.setText(this.language.t("board.request", { amount: this.riceRequired }));
    this.rewardText.setText(this.language.t("board.reward", {
      coins: this.coinReward,
      seeds: this.seedReward
    }));
    const riceOwned = this.farming.getRice();
    const canDeliver = riceOwned >= this.riceRequired;
    this.statusText.setText(this.delivered
      ? this.language.t("board.completed")
      : this.language.t("board.progress", { current: riceOwned, required: this.riceRequired }));
    this.statusText.setColor(this.delivered || canDeliver ? "#bce5a4" : "#f2c08f");
    this.progressFill.setSize(Math.max(1, 300 * Phaser.Math.Clamp(riceOwned / Math.max(1, this.riceRequired), 0, 1)), 6);
    this.progressFill.setFillStyle(this.delivered ? 0x8d9d72 : canDeliver ? 0x79b35d : 0xc28b4a, 1);
    this.deliverText.setText(this.language.t(this.delivered
      ? "board.doneButton"
      : canDeliver
        ? "board.deliverButton"
        : "board.needMoreButton", { amount: Math.max(0, this.riceRequired - riceOwned) }));
    this.deliverCard.setFillStyle(this.delivered ? 0x493629 : canDeliver ? 0x527044 : 0x6b5034, 1);
    this.exitHintText.setText(this.language.t("board.exitHint"));

    for (const text of [this.titleText, this.subtitleText, this.requestText, this.rewardText,
      this.statusText, this.deliverText, this.exitHintText, this.boardLabel, this.promptText]) {
      text.setFontFamily(font);
    }
    // Button color and progress indicator make the required delivery state visible at a glance.
  }

  private openBoard(): void {
    this.isOpen = true;
    this.ui.open("board");
    this.promptText.setVisible(false);
    this.updateInterface();
  }

  private closeBoard = (): void => {
    this.isOpen = false;
    this.ui.close("board");
    this.interactKey.reset();
    this.deliverKey.reset();
  };

  private deliverRice(): void {
    if (this.delivered) return;
    if (!this.farming.removeRice(this.riceRequired)) {
      this.statusText.setText(this.language.t("board.notEnough", {
        amount: this.riceRequired,
        current: this.farming.getRice()
      }));
      return;
    }

    this.delivered = true;
    this.market.addCoins(this.coinReward);
    this.farming.addSeeds(this.seedReward);
    this.scene.events.emit("sound-effect", { name: "request", x: this.boardX, y: this.boardY, maxDistance: 175 });
    this.updateInterface();
    this.statusText.setText(this.language.t("board.thankYou", {
      coins: this.coinReward,
      seeds: this.seedReward
    }));
  }

  private refreshForNewDay(): void {
    if (this.farming.getDay() === this.day) return;
    this.rollDailyRequest();
    this.updateInterface();
  }

  mobileInteractionDistance(playerX: number, playerY: number): number {
    return Phaser.Math.Distance.Between(playerX, playerY, this.boardX, this.boardY);
  }

  mobileInteract(playerX: number, playerY: number): boolean {
    if (this.isOpen) {
      this.closeBoard();
      return true;
    }
    if (this.ui.hasActiveModal()) return false;
    if (Phaser.Math.Distance.Between(playerX, playerY, this.boardX, this.boardY) >= 90) return false;
    this.openBoard();
    return true;
  }

  canMobileInteract(playerX: number, playerY: number): boolean {
    return !this.isOpen && !this.ui.hasActiveModal() &&
      Phaser.Math.Distance.Between(playerX, playerY, this.boardX, this.boardY) < 90;
  }

  getSaveData(): VillageBoardSaveData {
    return {
      day: this.day,
      riceRequired: this.riceRequired,
      delivered: this.delivered,
      lastRiceRequired: this.lastRiceRequired
    };
  }

  loadSaveData(data: VillageBoardSaveData): void {
    this.day = Math.max(1, Math.floor(Number(data.day) || this.farming.getDay()));
    const validAmounts = this.requestOptionsForDay(this.day);
    this.riceRequired = validAmounts.includes(Number(data.riceRequired)) ? Number(data.riceRequired) : (Phaser.Utils.Array.GetRandom(validAmounts) ?? validAmounts[0]);
    this.lastRiceRequired = Math.max(0, Math.floor(Number(data.lastRiceRequired) || 0));
    this.delivered = data.delivered === true;
    if (this.day !== this.farming.getDay()) this.rollDailyRequest();
    this.updateInterface();
  }

  update(playerX: number, playerY: number): void {
    this.refreshForNewDay();
    if (this.isOpen) {
      if (Phaser.Input.Keyboard.JustDown(this.deliverKey)) this.deliverRice();
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.closeBoard();
      return;
    }

    const near = Phaser.Math.Distance.Between(playerX, playerY, this.boardX, this.boardY) < 90;
    this.promptText.setVisible(near && !this.ui.hasActiveModal() && !this.touchMode);
    if (near && Phaser.Input.Keyboard.JustDown(this.interactKey)) this.openBoard();
  }
}
