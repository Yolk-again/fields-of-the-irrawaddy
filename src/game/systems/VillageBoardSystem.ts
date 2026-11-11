import Phaser from "phaser";
import { FarmingSystem } from "./FarmingSystem";
import { MarketSystem } from "./MarketSystem";
import { FishingSystem, type FishKind } from "./FishingSystem";
import { CookingSystem, type MealKind } from "./CookingSystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, modalPanel } from "../ui/PixelUI";

type RequestKind = "rice" | "fish" | "meals" | "tomatoes" | "greenBeans";
interface VillageBoardSaveData {
  day: number;
  riceRequired?: number;
  requestKind?: RequestKind;
  requestAmount?: number;
  delivered: boolean;
  lastRiceRequired?: number;
}

const FISH_ORDER: FishKind[] = ["silverBarb", "catfish", "goldenCarp"];
const MEAL_ORDER: MealKind[] = ["fishRice", "mohinga", "fishCurry"];
const REQUEST_ICONS: Record<RequestKind, string> = {
  rice: "rice_bowl_asset",
  fish: "fish_silver_barb_asset",
  meals: "meal_fish_rice_asset",
  tomatoes: "tomato_basket_asset",
  greenBeans: "green_bean_basket_asset"
};
const REQUEST_LABELS: Record<RequestKind, string> = {
  rice: "board.item.rice",
  fish: "board.item.fish",
  meals: "board.item.meals",
  tomatoes: "board.item.tomatoes",
  greenBeans: "board.item.greenBeans"
};

/** Daily village deliveries reward a mix of crops, fish and cooked meals. */
export class VillageBoardSystem {
  private readonly scene: Phaser.Scene;
  private readonly farming: FarmingSystem;
  private readonly market: MarketSystem;
  private readonly fishing: FishingSystem;
  private readonly cooking: CookingSystem;
  private readonly ui: ModalUIManager;
  private readonly language: LanguageSystem;

  private readonly boardX = 435;
  private readonly boardY = 258;
  private day = 1;
  private requestKind: RequestKind = "rice";
  private requestAmount = 3;
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
  private requestIcon!: Phaser.GameObjects.Image;
  private requestText!: Phaser.GameObjects.Text;
  private rewardCoinText!: Phaser.GameObjects.Text;
  private rewardSeedText!: Phaser.GameObjects.Text;
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
    fishing: FishingSystem,
    cooking: CookingSystem,
    ui: ModalUIManager,
    language: LanguageSystem
  ) {
    this.scene = scene;
    this.farming = farming;
    this.market = market;
    this.fishing = fishing;
    this.cooking = cooking;
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

  private requestPoolForDay(day: number): RequestKind[] {
    if (day <= 3) return ["rice"];
    if (day <= 7) return ["rice", "tomatoes", "greenBeans"];
    if (day <= 12) return ["rice", "tomatoes", "greenBeans", "fish"];
    return ["rice", "tomatoes", "greenBeans", "fish", "meals"];
  }

  private amountOptions(kind: RequestKind, day: number): number[] {
    if (kind === "rice") return day <= 3 ? [2, 3, 4] : [3, 4, 5, 6];
    if (kind === "fish") return [1, 2, 3];
    if (kind === "meals") return [1, 2];
    return [2, 3, 4, 5];
  }

  private rollDailyRequest(): void {
    this.day = this.farming.getDay();
    const pool = this.requestPoolForDay(this.day).filter(kind => kind !== this.requestKind || this.requestAmount < 2);
    this.requestKind = Phaser.Utils.Array.GetRandom(pool.length ? pool : this.requestPoolForDay(this.day)) ?? "rice";
    const options = this.amountOptions(this.requestKind, this.day);
    this.requestAmount = Phaser.Utils.Array.GetRandom(options) ?? options[0] ?? 3;
    this.lastRiceRequired = this.requestKind === "rice" ? this.requestAmount : this.lastRiceRequired;
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
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#fff1cf",
      backgroundColor: "#2a1a14", padding: { x: 5, y: 3 }, stroke: "#2a1a14", strokeThickness: 2
    }).setOrigin(0.5).setDepth(600);

    this.promptText = this.scene.add.text(320, 286, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#fff1cf",
      backgroundColor: "#2a1a14", padding: { x: 7, y: 4 }, stroke: "#2a1a14", strokeThickness: 2
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

    const requestCard = this.scene.add.rectangle(320, 151, 454, 82, 0x3d4b34, 1).setStrokeStyle(2, 0x9b7047);
    this.requestIcon = this.scene.add.image(174, 151, "rice_bowl_asset").setScale(1.65);
    this.requestText = this.scene.add.text(204, 151, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "13px", color: "#fff1cf", fontStyle: "bold",
      wordWrap: { width: 245 }, lineSpacing: 1
    }).setOrigin(0, 0.5);
    this.rewardCoinIcon = this.scene.add.image(218, 185, "coin_asset").setScale(0.9);
    this.rewardCoinText = this.scene.add.text(234, 185, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#f0d69e", fontStyle: "bold"
    }).setOrigin(0, 0.5);
    this.rewardSeedIcon = this.scene.add.image(382, 185, "rice_seed_bag_asset").setScale(0.9);
    this.rewardSeedText = this.scene.add.text(398, 185, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#f0d69e", fontStyle: "bold"
    }).setOrigin(0, 0.5);
    this.statusText = this.scene.add.text(320, 218, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#d7e6c5", align: "center", fontStyle: "bold"
    }).setOrigin(0.5);
    this.progressTrack = this.scene.add.rectangle(320, 241, 300, 10, 0x263327, 1).setStrokeStyle(1, 0x9b7047);
    this.progressFill = this.scene.add.rectangle(170, 241, 1, 6, 0x79b35d, 1).setOrigin(0, 0.5);
    this.deliverCard = this.scene.add.rectangle(320, 269, 276, 38, 0x527044, 1).setStrokeStyle(2, 0xd6b36b);
    this.deliverText = this.scene.add.text(320, 269, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "11px", color: "#fff1cf", fontStyle: "bold"
    }).setOrigin(0.5);
    this.exitHintText = this.scene.add.text(320, 310, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#d7e6c5"
    }).setOrigin(0.5);
    const closePosition = modalClosePosition(320, 180, 520, 284);
    this.closeButton = createRedCloseButton(this.scene, closePosition.x, closePosition.y);
    this.panel.add([
      background, divider, this.titleText, this.subtitleText, requestCard, this.requestIcon, this.requestText,
      this.rewardCoinIcon, this.rewardCoinText, this.rewardSeedIcon, this.rewardSeedText, this.statusText,
      this.progressTrack, this.progressFill, this.deliverCard, this.deliverText, this.exitHintText, this.closeButton
    ]);
    this.updateInterface();
  }

  private get coinReward(): number {
    const multiplier: Record<RequestKind, number> = { rice: 3, fish: 5, meals: 8, tomatoes: 4, greenBeans: 4 };
    return this.requestAmount * multiplier[this.requestKind] + 5;
  }

  private get seedReward(): number {
    return Math.max(1, Math.floor(this.requestAmount / 4));
  }

  private getOwnedAmount(): number {
    switch (this.requestKind) {
      case "rice": return this.farming.getRice();
      case "fish": return this.fishing.getFishTotal();
      case "meals": return this.cooking.getTotalMeals();
      case "tomatoes": return this.farming.getCropCount("tomato");
      case "greenBeans": return this.farming.getCropCount("greenBean");
    }
  }

  private removeRequestedAmount(): boolean {
    const amount = this.requestAmount;
    switch (this.requestKind) {
      case "rice": return this.farming.removeRice(amount);
      case "tomatoes": return this.farming.removeCrop("tomato", amount);
      case "greenBeans": return this.farming.removeCrop("greenBean", amount);
      case "fish": {
        if (this.fishing.getFishTotal() < amount) return false;
        let remaining = amount;
        for (const kind of FISH_ORDER) {
          const take = Math.min(remaining, this.fishing.getFishCount(kind));
          if (take > 0) this.fishing.removeFish(kind, take);
          remaining -= take;
          if (remaining <= 0) break;
        }
        return remaining <= 0;
      }
      case "meals": {
        if (this.cooking.getTotalMeals() < amount) return false;
        let remaining = amount;
        const counts = this.cooking.getMealCounts();
        for (const kind of MEAL_ORDER) {
          const take = Math.min(remaining, counts[kind]);
          if (take > 0) this.cooking.removeMeals(kind, take);
          remaining -= take;
          if (remaining <= 0) break;
        }
        return remaining <= 0;
      }
    }
  }

  private isPointerOverDeliverButton(pointer: Phaser.Input.Pointer): boolean {
    return pointer.x >= 182 && pointer.x <= 458 && pointer.y >= 250 && pointer.y <= 288;
  }

  private handleBoardPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("board") || this.delivered) return;
    if (this.isPointerOverDeliverButton(pointer)) this.deliverRequest();
  };

  private handleBoardPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.deliverCard) return;
    if (!this.isOpen || !this.ui.isOpen("board") || this.delivered) {
      this.scene.game.canvas.style.cursor = "default";
      return;
    }
    const overButton = this.isPointerOverDeliverButton(pointer);
    this.deliverCard.setFillStyle(overButton ? 0x668651 : 0x527044, 1);
    this.scene.game.canvas.style.cursor = overButton ? "pointer" : "default";
  };

  private updateInterface(): void {
    const font = this.language.getFontFamily();
    const owned = this.getOwnedAmount();
    const canDeliver = owned >= this.requestAmount;
    const itemName = this.language.t(REQUEST_LABELS[this.requestKind]);
    this.titleText.setText(this.language.t("board.title"));
    this.subtitleText.setText(this.language.t("board.subtitle"));
    this.boardLabel.setText(this.language.t("board.label"));
    this.promptText.setText(this.language.t("board.prompt"));
    this.requestIcon.setTexture(REQUEST_ICONS[this.requestKind]);
    this.requestText.setText(this.language.t("board.requestItem", { amount: this.requestAmount, item: itemName }));
    this.rewardCoinText.setText(this.language.t("board.rewardCoins", { coins: this.coinReward }));
    this.rewardSeedText.setText(this.language.t("board.rewardSeeds", { seeds: this.seedReward }));
    this.statusText.setText(this.delivered
      ? this.language.t("board.completed")
      : this.language.t("board.progressItem", { item: itemName, current: owned, required: this.requestAmount }));
    this.statusText.setColor(this.delivered || canDeliver ? "#bce5a4" : "#f2c08f");
    this.progressFill.setSize(Math.max(1, 300 * Phaser.Math.Clamp(owned / Math.max(1, this.requestAmount), 0, 1)), 6);
    this.progressFill.setFillStyle(this.delivered ? 0x8d9d72 : canDeliver ? 0x79b35d : 0xc28b4a, 1);
    this.deliverText.setText(this.language.t(this.delivered
      ? "board.doneButton"
      : canDeliver
        ? "board.deliverButton"
        : "board.needMoreButton", { amount: Math.max(0, this.requestAmount - owned) }));
    this.deliverCard.setFillStyle(this.delivered ? 0x493629 : canDeliver ? 0x527044 : 0x6b5034, 1);
    this.exitHintText.setText(this.language.t("board.exitHint"));
    for (const text of [this.titleText, this.subtitleText, this.requestText, this.rewardCoinText, this.rewardSeedText, this.statusText,
      this.deliverText, this.exitHintText, this.boardLabel, this.promptText]) text.setFontFamily(font);
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

  private deliverRequest(): void {
    if (this.delivered) return;
    const owned = this.getOwnedAmount();
    if (owned < this.requestAmount || !this.removeRequestedAmount()) {
      this.statusText.setText(this.language.t("board.notEnoughItem", {
        amount: this.requestAmount,
        item: this.language.t(REQUEST_LABELS[this.requestKind]),
        current: owned
      }));
      return;
    }
    this.delivered = true;
    this.market.addCoins(this.coinReward);
    this.farming.addSeeds(this.seedReward);
    this.scene.events.emit("sound-effect", { name: "request", x: this.boardX, y: this.boardY, maxDistance: 175 });
    this.updateInterface();
    this.statusText.setText(this.language.t("board.thankYou", { coins: this.coinReward, seeds: this.seedReward }));
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
    if (this.isOpen) { this.closeBoard(); return true; }
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
      riceRequired: this.lastRiceRequired || (this.requestKind === "rice" ? this.requestAmount : 3),
      requestKind: this.requestKind,
      requestAmount: this.requestAmount,
      delivered: this.delivered,
      lastRiceRequired: this.lastRiceRequired
    };
  }

  loadSaveData(data: VillageBoardSaveData): void {
    this.day = Math.max(1, Math.floor(Number(data.day) || this.farming.getDay()));
    const allowed = this.requestPoolForDay(this.day);
    this.requestKind = allowed.includes(data.requestKind as RequestKind) ? data.requestKind as RequestKind : "rice";
    const amountOptions = this.amountOptions(this.requestKind, this.day);
    const savedAmount = Number(data.requestAmount ?? data.riceRequired);
    this.requestAmount = amountOptions.includes(savedAmount) ? savedAmount : (Phaser.Utils.Array.GetRandom(amountOptions) ?? amountOptions[0] ?? 3);
    this.lastRiceRequired = Math.max(0, Math.floor(Number(data.lastRiceRequired) || 0));
    this.delivered = data.delivered === true;
    if (this.day !== this.farming.getDay()) this.rollDailyRequest();
    this.updateInterface();
  }

  update(playerX: number, playerY: number): void {
    this.refreshForNewDay();
    if (this.isOpen) {
      if (Phaser.Input.Keyboard.JustDown(this.deliverKey)) this.deliverRequest();
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.closeBoard();
      return;
    }
    const near = Phaser.Math.Distance.Between(playerX, playerY, this.boardX, this.boardY) < 90;
    this.promptText.setVisible(near && !this.ui.hasActiveModal() && !this.touchMode);
    if (near && Phaser.Input.Keyboard.JustDown(this.interactKey)) this.openBoard();
  }
}
