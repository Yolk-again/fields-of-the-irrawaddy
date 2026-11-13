import Phaser from "phaser";
import { FarmingSystem } from "./FarmingSystem";
import { MarketSystem } from "./MarketSystem";
import { FishingSystem, type FishKind } from "./FishingSystem";
import { CookingSystem, type MealKind } from "./CookingSystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, modalPanel, uiFontSize } from "../ui/PixelUI";
import { isMobilePlatform } from "../utils/DeviceMode";

type RequestKind = "rice" | "fish" | "meals" | "tomatoes" | "greenBeans";
interface DailyRequest {
  kind: RequestKind;
  amount: number;
  delivered: boolean;
}
interface VillageBoardSaveData {
  day: number;
  requests?: DailyRequest[];
  requestKind?: RequestKind;
  requestAmount?: number;
  riceRequired?: number;
  delivered?: boolean;
  lastRiceRequired?: number;
}
interface RequestRowUI {
  background: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  requestText: Phaser.GameObjects.Text;
  progressText: Phaser.GameObjects.Text;
  rewardText: Phaser.GameObjects.Text;
  deliverButton: Phaser.GameObjects.Rectangle;
  deliverText: Phaser.GameObjects.Text;
}

const DAILY_REQUEST_COUNT = 3;
const REQUEST_ROW_CENTERS = [111, 180, 249];
const FISH_ORDER: FishKind[] = ["silverBarb", "catfish", "goldenCarp"];
const MEAL_ORDER: MealKind[] = ["fishRice", "mohinga", "fishCurry"];
const REQUEST_ICONS: Record<RequestKind, string> = {
  rice: "wheat_basket_asset",
  fish: "fish_silver_barb_asset",
  meals: "meal_fish_rice_asset",
  tomatoes: "tomato_basket_asset",
  greenBeans: "green_bean_basket_asset"
};
const REQUEST_LABELS: Record<RequestKind, string> = {
  rice: "board.item.wheat",
  fish: "board.item.fish",
  meals: "board.item.meals",
  tomatoes: "board.item.tomatoes",
  greenBeans: "board.item.greenBeans"
};

/** Multiple daily village deliveries reward a mix of crops, fish and cooked meals. */
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
  private lastPlayerX = 0;
  private lastPlayerY = 0;
  private requests: DailyRequest[] = [];
  private lastRiceRequired = 0;
  private isOpen = false;

  private interactKey!: Phaser.Input.Keyboard.Key;
  private deliverKeys: Phaser.Input.Keyboard.Key[] = [];
  private promptText!: Phaser.GameObjects.Text;
  private boardLabel!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Container;
  private closeButton!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private exitHintText!: Phaser.GameObjects.Text;
  private requestRows: RequestRowUI[] = [];
  private readonly touchMode = isMobilePlatform();

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
    this.rollDailyRequests();
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
      this.deliverKeys.forEach(key => key.reset());
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

  private generateDailyRequests(day: number): DailyRequest[] {
    const candidates: DailyRequest[] = [];
    for (const kind of this.requestPoolForDay(day)) {
      for (const amount of this.amountOptions(kind, day)) {
        candidates.push({ kind, amount, delivered: false });
      }
    }

    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
    }

    const chosen: DailyRequest[] = [];
    const usedKinds = new Set<RequestKind>();
    for (const candidate of candidates) {
      if (chosen.length >= DAILY_REQUEST_COUNT) break;
      if (usedKinds.has(candidate.kind)) continue;
      chosen.push(candidate);
      usedKinds.add(candidate.kind);
    }

    for (const candidate of candidates) {
      if (chosen.length >= DAILY_REQUEST_COUNT) break;
      if (chosen.some(request => request.kind === candidate.kind && request.amount === candidate.amount)) continue;
      chosen.push(candidate);
    }

    return chosen.slice(0, DAILY_REQUEST_COUNT);
  }

  private rollDailyRequests(): void {
    this.day = this.farming.getDay();
    this.requests = this.generateDailyRequests(this.day);
    this.lastRiceRequired = this.requests.find(request => request.kind === "rice")?.amount ?? this.lastRiceRequired;
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
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(10), color: "#fff1cf",
      backgroundColor: "#2a1a14", padding: { x: 5, y: 3 }, stroke: "#2a1a14", strokeThickness: 2
    }).setOrigin(0.5).setDepth(600);

    this.promptText = this.scene.add.text(320, 286, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(10), color: "#fff1cf",
      backgroundColor: "#2a1a14", padding: { x: 7, y: 4 }, stroke: "#2a1a14", strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(7200).setVisible(false);
  }

  private createControls(): void {
    const keyboard = this.scene.input.keyboard!;
    this.interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.deliverKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE)
    ];
  }

  private createInterface(): void {
    this.panel = this.scene.add.container(0, 0).setScrollFactor(0);
    const background = modalPanel(this.scene, 320, 180, 560, 328);
    const divider = this.scene.add.rectangle(320, 76, 510, 2, 0x9b7047, 0.9);
    this.titleText = this.scene.add.text(320, 34, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(16), color: "#e6c47e", fontStyle: "bold",
      align: "center", wordWrap: { width: 450 }
    }).setOrigin(0.5);
    this.subtitleText = this.scene.add.text(320, 57, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(9), color: "#d7e6c5", align: "center",
      wordWrap: { width: 452 }
    }).setOrigin(0.5);

    this.requestRows = REQUEST_ROW_CENTERS.map((centerY) => {
      const backgroundCard = this.scene.add.rectangle(320, centerY, 520, 58, 0x3d4b34, 1).setStrokeStyle(2, 0x9b7047);
      const icon = this.scene.add.image(79, centerY, "wheat_basket_asset").setDisplaySize(30, 25);
      const requestText = this.scene.add.text(108, centerY - 13, "", {
        fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(11), color: "#fff1cf", fontStyle: "bold",
        wordWrap: { width: 300 }, lineSpacing: 1
      }).setOrigin(0, 0.5);
      const progressText = this.scene.add.text(108, centerY + 13, "", {
        fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(9), color: "#d7e6c5",
        wordWrap: { width: 300 }
      }).setOrigin(0, 0.5);
      const rewardText = this.scene.add.text(520, centerY - 16, "", {
        fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(8), color: "#f0d69e", fontStyle: "bold",
        align: "center", wordWrap: { width: 112 }
      }).setOrigin(0.5);
      const deliverButton = this.scene.add.rectangle(520, centerY + 10, 108, 25, 0x527044, 1).setStrokeStyle(1, 0xd6b36b);
      const deliverText = this.scene.add.text(520, centerY + 10, "", {
        fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(8), color: "#fff1cf", fontStyle: "bold",
        align: "center", wordWrap: { width: 100 }
      }).setOrigin(0.5);
      return { background: backgroundCard, icon, requestText, progressText, rewardText, deliverButton, deliverText };
    });

    this.exitHintText = this.scene.add.text(320, 309, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(9), color: "#d7e6c5", align: "center"
    }).setOrigin(0.5);
    const closePosition = modalClosePosition(320, 180, 560, 328);
    this.closeButton = createRedCloseButton(this.scene, closePosition.x, closePosition.y);
    const rowObjects = this.requestRows.flatMap(row => [row.background, row.icon, row.requestText, row.progressText,
      row.rewardText, row.deliverButton, row.deliverText]);
    this.panel.add([background, divider, this.titleText, this.subtitleText, ...rowObjects, this.exitHintText, this.closeButton]);
    this.updateInterface();
  }

  private coinReward(request: DailyRequest): number {
    const multiplier: Record<RequestKind, number> = { rice: 3, fish: 5, meals: 8, tomatoes: 4, greenBeans: 4 };
    return request.amount * multiplier[request.kind] + 5;
  }

  private seedReward(request: DailyRequest): number {
    return Math.max(1, Math.floor(request.amount / 4));
  }

  private getOwnedAmount(request: DailyRequest): number {
    switch (request.kind) {
      case "rice": return this.farming.getRice() + this.farming.getGoldenWheat();
      case "fish": return this.fishing.getFishTotal();
      case "meals": return this.cooking.getTotalMeals();
      case "tomatoes": return this.farming.getCropCount("tomato");
      case "greenBeans": return this.farming.getCropCount("greenBean");
    }
  }

  private removeRequestedAmount(request: DailyRequest): boolean {
    const amount = request.amount;
    switch (request.kind) {
      case "rice": {
        const regularAmount = Math.min(amount, this.farming.getRice());
        const goldenAmount = amount - regularAmount;
        if (regularAmount > 0 && !this.farming.removeRice(regularAmount)) return false;
        if (goldenAmount > 0 && !this.farming.removeGoldenWheat(goldenAmount)) {
          if (regularAmount > 0) this.farming.addRice(regularAmount);
          return false;
        }
        return true;
      }
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

  private getDeliverButtonIndex(pointer: Phaser.Input.Pointer): number {
    if (pointer.x < 466 || pointer.x > 574) return -1;
    return REQUEST_ROW_CENTERS.findIndex(centerY => pointer.y >= centerY - 3 && pointer.y <= centerY + 23);
  }

  private handleBoardPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("board")) {
      const nearBoard = Phaser.Math.Distance.Between(this.lastPlayerX, this.lastPlayerY, this.boardX, this.boardY) < 90;
      const clickedPrompt = pointer.x >= 220 && pointer.x <= 420 && pointer.y >= 270 && pointer.y <= 304;
      if (!this.touchMode && nearBoard && clickedPrompt && !this.ui.hasActiveModal()) this.openBoard();
      return;
    }
    const index = this.getDeliverButtonIndex(pointer);
    if (index >= 0 && index < this.requests.length) this.deliverRequest(index);
  };

  private handleBoardPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.requestRows.length) return;
    if (!this.isOpen || !this.ui.isOpen("board")) {
      this.scene.game.canvas.style.cursor = "default";
      return;
    }
    // Touch pointers do not have a persistent hover state. Never recolor mobile
    // delivery buttons from pointer movement; their state comes only from stock.
    if (this.touchMode) {
      this.scene.game.canvas.style.cursor = "default";
      return;
    }
    const hovered = this.getDeliverButtonIndex(pointer);
    this.requestRows.forEach((row, index) => {
      const request = this.requests[index];
      const canDeliver = !!request && !request.delivered && this.getOwnedAmount(request) >= request.amount;
      const fill = request?.delivered ? 0x493629 : canDeliver ? (hovered === index ? 0x668651 : 0x527044) : 0x6b5034;
      row.deliverButton.setFillStyle(fill, 1);
    });
    const hoveredRequest = this.requests[hovered];
    const hoveredCanDeliver = !!hoveredRequest && !hoveredRequest.delivered && this.getOwnedAmount(hoveredRequest) >= hoveredRequest.amount;
    this.scene.game.canvas.style.cursor = hoveredCanDeliver ? "pointer" : "default";
  };

  private updateInterface(): void {
    const font = this.language.getFontFamily();
    this.titleText.setText(this.language.t("board.title"));
    this.subtitleText.setText(this.requests.every(request => request.delivered)
      ? this.language.t("board.allComplete")
      : this.language.t("board.subtitle", { count: this.requests.length }));
    this.boardLabel.setText(this.language.t("board.label"));
    this.promptText.setText(this.language.t(this.touchMode ? "board.mobilePrompt" : "board.prompt"));
    this.exitHintText.setText(this.language.t(this.touchMode ? "board.mobileExitHint" : "board.exitHint"));

    this.requestRows.forEach((row, index) => {
      const request = this.requests[index];
      if (!request) return;
      const owned = this.getOwnedAmount(request);
      const canDeliver = owned >= request.amount && !request.delivered;
      const itemName = this.language.t(REQUEST_LABELS[request.kind]);
      row.icon.setTexture(REQUEST_ICONS[request.kind]);
      row.requestText.setText(this.language.t("board.requestItem", { amount: request.amount, item: itemName }));
      row.progressText.setText(request.delivered
        ? this.language.t("board.rowCompleted")
        : this.language.t("board.progressItem", { item: itemName, current: owned, required: request.amount }));
      row.progressText.setColor(request.delivered || canDeliver ? "#bce5a4" : "#d7e6c5");
      row.rewardText.setText(this.language.t("board.rewardCompact", {
        coins: this.coinReward(request), seeds: this.seedReward(request)
      }));
      row.deliverText.setText(this.language.t(request.delivered
        ? "board.doneButton"
        : canDeliver
          ? "board.deliverShort"
          : "board.needMoreButton", { amount: Math.max(0, request.amount - owned) }));
      row.background.setFillStyle(request.delivered ? 0x33412f : 0x3d4b34, 1);
      row.deliverButton.setFillStyle(request.delivered ? 0x493629 : canDeliver ? 0x527044 : 0x6b5034, 1);
      row.deliverButton.setAlpha(request.delivered ? 0.8 : canDeliver ? 1 : 0.72);
      row.deliverText.setColor(request.delivered ? "#d9c5a2" : canDeliver ? "#fff1cf" : "#c7b69b");
      for (const text of [row.requestText, row.progressText, row.rewardText, row.deliverText]) text.setFontFamily(font);
    });
    this.titleText.setFontFamily(font);
    this.subtitleText.setFontFamily(font);
    this.exitHintText.setFontFamily(font);
    this.boardLabel.setFontFamily(font);
    this.promptText.setFontFamily(font);
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
    this.deliverKeys.forEach(key => key.reset());
  };

  private deliverRequest(index: number): void {
    const request = this.requests[index];
    if (!request || request.delivered) return;
    const owned = this.getOwnedAmount(request);
    if (owned < request.amount || !this.removeRequestedAmount(request)) {
      const row = this.requestRows[index];
      row.progressText.setText(this.language.t("board.notEnoughItem", {
        amount: request.amount,
        item: this.language.t(REQUEST_LABELS[request.kind]),
        current: owned
      }));
      row.progressText.setColor("#f2c08f");
      row.deliverButton.setFillStyle(0x6b5034, 1).setAlpha(0.72);
      row.deliverText.setColor("#c7b69b");
      return;
    }
    request.delivered = true;
    const coins = this.coinReward(request);
    const seeds = this.seedReward(request);
    this.market.addCoins(coins);
    this.farming.addSeeds(seeds);
    this.scene.events.emit("sound-effect", { name: "request", x: this.boardX, y: this.boardY, maxDistance: 175 });
    this.updateInterface();
    this.requestRows[index].progressText.setText(this.language.t("board.thankYou", { coins, seeds }));
  }

  private refreshForNewDay(): void {
    if (this.farming.getDay() === this.day) return;
    this.rollDailyRequests();
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
    const firstRequest = this.requests[0];
    return {
      day: this.day,
      requests: this.requests.map(request => ({ ...request })),
      riceRequired: this.lastRiceRequired || (firstRequest?.kind === "rice" ? firstRequest.amount : 3),
      requestKind: firstRequest?.kind,
      requestAmount: firstRequest?.amount,
      delivered: firstRequest?.delivered ?? false,
      lastRiceRequired: this.lastRiceRequired
    };
  }

  loadSaveData(data: VillageBoardSaveData): void {
    this.day = Math.max(1, Math.floor(Number(data.day) || this.farming.getDay()));
    const allowed = this.requestPoolForDay(this.day);
    this.requests = this.generateDailyRequests(this.day);

    if (Array.isArray(data.requests) && data.requests.length > 0) {
      const restored = data.requests
        .filter(request => request && allowed.includes(request.kind) && Number.isFinite(Number(request.amount)) && Number(request.amount) > 0)
        .slice(0, DAILY_REQUEST_COUNT)
        .map(request => ({
          kind: request.kind,
          amount: Math.max(1, Math.floor(Number(request.amount))),
          delivered: request.delivered === true
        }));
      if (restored.length > 0) {
        this.requests = restored;
        for (const generated of this.generateDailyRequests(this.day)) {
          if (this.requests.length >= DAILY_REQUEST_COUNT) break;
          if (!this.requests.some(request => request.kind === generated.kind && request.amount === generated.amount)) {
            this.requests.push(generated);
          }
        }
      }
    } else if (data.requestKind && allowed.includes(data.requestKind)) {
      const legacyAmount = Math.max(1, Math.floor(Number(data.requestAmount ?? data.riceRequired) || 3));
      this.requests[0] = { kind: data.requestKind, amount: legacyAmount, delivered: data.delivered === true };
    }

    this.lastRiceRequired = Math.max(0, Math.floor(Number(data.lastRiceRequired) || Number(data.riceRequired) || 0));
    const riceRequest = this.requests.find(request => request.kind === "rice");
    if (riceRequest) this.lastRiceRequired = riceRequest.amount;
    if (this.day !== this.farming.getDay()) this.rollDailyRequests();
    this.updateInterface();
  }

  update(playerX: number, playerY: number): void {
    this.lastPlayerX = playerX;
    this.lastPlayerY = playerY;
    this.refreshForNewDay();
    if (this.isOpen) {
      this.deliverKeys.forEach((key, index) => {
        if (Phaser.Input.Keyboard.JustDown(key)) this.deliverRequest(index);
      });
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.closeBoard();
      return;
    }
    const near = Phaser.Math.Distance.Between(playerX, playerY, this.boardX, this.boardY) < 90;
    this.promptText.setVisible(near && !this.ui.hasActiveModal() && !this.touchMode);
    if (near && Phaser.Input.Keyboard.JustDown(this.interactKey)) this.openBoard();
  }
}
