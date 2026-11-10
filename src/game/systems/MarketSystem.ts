import Phaser from "phaser";
import { FarmingSystem } from "./FarmingSystem";
import { FishingSystem, type FishKind } from "./FishingSystem";
import { CookingSystem, type MealKind } from "./CookingSystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, modalPanel } from "../ui/PixelUI";
import { adjustQuantity, maximumQuantity, maximumQuantitySelection, normalizeQuantity, quantityAdjustmentStep } from "../ui/QuantityMath";

type SaleKind = "rice" | "meals" | "fish" | "seeds" | "rod";

export class MarketSystem {
  private scene: Phaser.Scene;
  private farming: FarmingSystem;
  private fishing: FishingSystem;
  private cooking: CookingSystem;
  private ui: ModalUIManager;
  private language: LanguageSystem;

  private coins = 20;
  private isOpen = false;
  getCoins(): number { return this.coins; }
  addCoins(amount: number): void {
    this.coins += Math.max(0, Math.floor(amount));
    this.updateMoney();
  }

  private marketX = 570;
  private marketY = 250;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private buyKey!: Phaser.Input.Keyboard.Key;
  private sellKey!: Phaser.Input.Keyboard.Key;
  private rodKey!: Phaser.Input.Keyboard.Key;
  private mealSellKey!: Phaser.Input.Keyboard.Key;
  private fishSellKey!: Phaser.Input.Keyboard.Key;
  private escapeKey!: Phaser.Input.Keyboard.Key;

  private marketPanel!: Phaser.GameObjects.Container;
  private closeButton!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private actionTexts: Phaser.GameObjects.Text[] = [];
  private moneyText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private exitHintText!: Phaser.GameObjects.Text;
  private clickHintText!: Phaser.GameObjects.Text;
  private actionCards: Phaser.GameObjects.Rectangle[] = [];
  private promptText!: Phaser.GameObjects.Text;
  private stallLabel!: Phaser.GameObjects.Text;
  private salePanel!: Phaser.GameObjects.Container;
  private saleTitleText!: Phaser.GameObjects.Text;
  private saleAvailableText!: Phaser.GameObjects.Text;
  private saleAmountText!: Phaser.GameObjects.Text;
  private saleMinus!: Phaser.GameObjects.Rectangle;
  private salePlus!: Phaser.GameObjects.Rectangle;
  private saleMax!: Phaser.GameObjects.Rectangle;
  private saleConfirm!: Phaser.GameObjects.Rectangle;
  private saleCancel!: Phaser.GameObjects.Rectangle;
  private saleButtonTexts: Phaser.GameObjects.Text[] = [];
  private saleKind: SaleKind | null = null;
  private saleAmount = 1;

  private readonly cardY = [81, 122, 163, 204, 245];

  constructor(
    scene: Phaser.Scene,
    farming: FarmingSystem,
    fishing: FishingSystem,
    cooking: CookingSystem,
    ui: ModalUIManager,
    language: LanguageSystem
  ) {
    this.scene = scene;
    this.farming = farming;
    this.fishing = fishing;
    this.cooking = cooking;
    this.ui = ui;
    this.language = language;

    this.createMarketStall();
    this.createControls();
    this.createInterface();
    this.scene.input.on("pointerup", this.handleMarketPointerUp, this);
    this.scene.input.on("pointermove", this.handleMarketPointerMove, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.input.off("pointerup", this.handleMarketPointerUp, this);
      this.scene.input.off("pointermove", this.handleMarketPointerMove, this);
      this.scene.game.canvas.style.cursor = "default";
    });

    this.ui.registerPanel("market", this.marketPanel, 220, () => {
      this.closeSaleSelector();
      this.isOpen = false;
      this.interactKey.reset();
      this.escapeKey.reset();
    }, this.closeButton);
    this.ui.registerHud(this.promptText);
    this.language.onChange(() => this.updateInterface());
  }

  private createMarketStall(): void {
    this.scene.add.image(this.marketX, 260, "market_stall_asset")
      .setOrigin(0.5, 1).setScale(2).setDepth(260);
    this.stallLabel = this.scene.add.text(this.marketX, 135, this.language.t("market.stallName"), {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#fff3d3",
      backgroundColor: "#34271d", padding: { x: 5, y: 3 }
    }).setOrigin(0.5).setDepth(261);
    this.promptText = this.scene.add.text(320, 286, this.language.t("market.prompt"), {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#fff1cf",
      backgroundColor: "#2a1a14", padding: { x: 7, y: 4 },
      stroke: "#2a1a14", strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(7200).setVisible(false);
  }

  private createControls(): void {
    const keyboard = this.scene.input.keyboard!;
    this.interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.buyKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.sellKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.rodKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.mealSellKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
    this.fishSellKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE);
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    window.addEventListener("keydown", this.handleWindowKeyDown, true);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("keydown", this.handleWindowKeyDown, true);
    });
  }

  private handleWindowKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.isOpen) {
      event.preventDefault();
      event.stopPropagation();
      if (this.saleKind) this.closeSaleSelector();
      else this.closeMarket();
    }
  };

  private createInterface(): void {
    this.marketPanel = this.scene.add.container(0, 0).setScrollFactor(0);
    const background = modalPanel(this.scene, 320, 180, 500, 350);
    const divider = this.scene.add.rectangle(320, 57, 450, 2, 0x9b7047, 0.8);
    this.titleText = this.scene.add.text(320, 33, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "18px", color: "#e6c47e", fontStyle: "bold"
    }).setOrigin(0.5);
    this.marketPanel.add([background, divider, this.titleText]);

    const icons = ["rice_seed_bag_asset", "rice_bowl_asset", "fishing_rod_asset", "meal_fish_rice_asset", "fish_silver_barb_asset"];
    const fills = [0x40513a, 0x3d4b34, 0x40513a, 0x3d4b34, 0x40513a];
    this.cardY.forEach((y, index) => {
      const card = this.scene.add.rectangle(320, y, 420, 34, fills[index], 1).setStrokeStyle(2, 0x9b7047);
      const icon = this.scene.add.image(145, y, icons[index]).setScale(index === 2 ? 1.5 : 1.35);
      const text = this.scene.add.text(340, y, "", {
        fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#fff1cf", fontStyle: "bold",
        align: "center", wordWrap: { width: 330 }
      }).setOrigin(0.5);
      this.actionCards.push(card);
      this.actionTexts.push(text);
      this.marketPanel.add([card, icon, text]);
    });

    this.clickHintText = this.scene.add.text(320, 268, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#b9dca3", align: "center"
    }).setOrigin(0.5);
    this.moneyText = this.scene.add.text(320, 284, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#f0d69e", align: "center"
    }).setOrigin(0.5);
    this.messageText = this.scene.add.text(320, 304, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#d7e6c5", align: "center",
      wordWrap: { width: 440 }
    }).setOrigin(0.5);
    this.exitHintText = this.scene.add.text(320, 334, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#d7e6c5", align: "center"
    }).setOrigin(0.5);

    const closePosition = modalClosePosition(320, 180, 500, 350);
    this.closeButton = createRedCloseButton(this.scene, closePosition.x, closePosition.y);
    this.marketPanel.add([this.clickHintText, this.moneyText, this.messageText, this.exitHintText, this.closeButton]);
    this.createSaleSelector();
    this.marketPanel.add(this.salePanel);
    this.updateInterface();
  }

  private createSaleSelector(): void {
    this.salePanel = this.scene.add.container(0, 0).setVisible(false);
    const background = this.scene.add.rectangle(320, 184, 364, 174, 0x2a2119, 0.98).setStrokeStyle(3, 0xd6b36b);
    const inner = this.scene.add.rectangle(320, 184, 350, 160, 0x40513a, 1).setStrokeStyle(1, 0x9b7047);
    this.saleTitleText = this.scene.add.text(320, 126, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "13px", color: "#e6c47e", fontStyle: "bold"
    }).setOrigin(0.5);
    this.saleAvailableText = this.scene.add.text(320, 151, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#d7e6c5"
    }).setOrigin(0.5);
    this.saleMinus = this.scene.add.rectangle(238, 186, 38, 29, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
    const minusLabel = this.scene.add.text(238, 186, "−", { fontFamily: this.language.getFontFamily(), fontSize: "16px", color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
    this.saleAmountText = this.scene.add.text(320, 186, "1", { fontFamily: this.language.getFontFamily(), fontSize: "14px", color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
    this.salePlus = this.scene.add.rectangle(402, 186, 38, 29, 0x527044, 1).setStrokeStyle(1, 0xd6b36b);
    const plusLabel = this.scene.add.text(402, 186, "+", { fontFamily: this.language.getFontFamily(), fontSize: "16px", color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
    this.saleMax = this.scene.add.rectangle(320, 220, 86, 22, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
    const maxLabel = this.scene.add.text(320, 220, "", { fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
    this.saleConfirm = this.scene.add.rectangle(262, 251, 106, 25, 0x527044, 1).setStrokeStyle(1, 0xd6b36b);
    const confirmLabel = this.scene.add.text(262, 251, "", { fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
    this.saleCancel = this.scene.add.rectangle(378, 251, 106, 25, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
    const cancelLabel = this.scene.add.text(378, 251, "", { fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
    this.saleButtonTexts = [minusLabel, plusLabel, maxLabel, confirmLabel, cancelLabel];
    this.salePanel.add([background, inner, this.saleTitleText, this.saleAvailableText, this.saleMinus, minusLabel, this.saleAmountText, this.salePlus, plusLabel, this.saleMax, maxLabel, this.saleConfirm, confirmLabel, this.saleCancel, cancelLabel]);
    this.updateSaleSelector();
  }

  private availableSaleAmount(): number {
    if (this.saleKind === "rice") return this.farming.getRice();
    if (this.saleKind === "meals") return this.cooking.getTotalMeals();
    if (this.saleKind === "fish") return this.fishing.getFishTotal();
    if (this.saleKind === "seeds") return Math.floor(this.coins / 10);
    if (this.saleKind === "rod") return this.fishing.getHasRod() || this.coins < 35 ? 0 : 1;
    return 0;
  }

  private updateSaleSelector(): void {
    if (!this.salePanel) return;
    const available = this.availableSaleAmount();
    this.saleAmount = normalizeQuantity(this.saleAmount, available);
    const isBuying = this.saleKind === "seeds" || this.saleKind === "rod";
    const kindLabel = this.saleKind ? this.language.t(`market.quantity.${this.saleKind}`) : "";
    this.saleTitleText.setText(this.language.t(isBuying ? "market.quantity.buyTitle" : "market.quantity.title", { item: kindLabel }));
    this.saleAvailableText.setText(this.language.t("market.quantity.available", { amount: available }));
    this.saleAmountText.setText(String(this.saleAmount));
    this.saleButtonTexts[2].setText(this.language.t("market.quantity.max"));
    this.saleButtonTexts[3].setText(this.language.t(isBuying ? "market.quantity.buyConfirm" : "market.quantity.confirm"));
    this.saleButtonTexts[4].setText(this.language.t("market.quantity.cancel"));
    const font = this.language.getFontFamily();
    for (const text of [this.saleTitleText, this.saleAvailableText, this.saleAmountText, ...this.saleButtonTexts]) text.setFontFamily(font);
    this.salePanel.setVisible(this.saleKind !== null);
  }

  private beginSale(kind: SaleKind): void {
    this.saleKind = kind;
    this.saleAmount = 1;
    const available = this.availableSaleAmount();
    if (available <= 0) {
      this.saleKind = null;
      this.salePanel.setVisible(false);
      const messageKey = kind === "rice" ? "market.noRice"
        : kind === "meals" ? "market.noMeals"
          : kind === "fish" ? "market.noFish"
            : kind === "rod" && this.fishing.getHasRod() ? "market.rodOwned"
              : "market.notEnough";
      this.messageText.setText(this.language.t(messageKey));
      return;
    }
    this.updateSaleSelector();
  }

  private closeSaleSelector(): void {
    this.saleKind = null;
    this.salePanel.setVisible(false);
  }

  private confirmSale(): void {
    const kind = this.saleKind;
    if (!kind) return;
    const amount = Math.min(this.saleAmount, maximumQuantity(this.availableSaleAmount()));
    if (amount <= 0) { this.closeSaleSelector(); return; }
    if (kind === "rice") this.sellRice(amount);
    else if (kind === "meals") this.sellMeals(amount);
    else if (kind === "fish") this.sellFish(amount);
    else if (kind === "seeds") this.buySeeds(amount);
    else this.buyFishingRod(amount);
    this.closeSaleSelector();
  }

  private handleSaleSelectorPointer(pointer: Phaser.Input.Pointer): boolean {
    if (!this.saleKind) return false;
    const step = quantityAdjustmentStep(Boolean((pointer.event as MouseEvent).shiftKey));
    if (pointer.x >= 218 && pointer.x <= 258 && pointer.y >= 168 && pointer.y <= 204) {
      this.saleAmount = adjustQuantity(this.saleAmount, -step, this.availableSaleAmount());
      this.updateSaleSelector();
    } else if (pointer.x >= 382 && pointer.x <= 422 && pointer.y >= 168 && pointer.y <= 204) {
      this.saleAmount = adjustQuantity(this.saleAmount, step, this.availableSaleAmount());
      this.updateSaleSelector();
    } else if (pointer.x >= 276 && pointer.x <= 364 && pointer.y >= 205 && pointer.y <= 235) {
      this.saleAmount = maximumQuantitySelection(this.availableSaleAmount());
      this.updateSaleSelector();
    } else if (pointer.x >= 205 && pointer.x <= 315 && pointer.y >= 236 && pointer.y <= 267) {
      this.confirmSale();
    } else if (pointer.x >= 325 && pointer.x <= 435 && pointer.y >= 236 && pointer.y <= 267) {
      this.closeSaleSelector();
    }
    return true;
  }

  /** Screen-space hit boxes intentionally match the rendered action cards. */
  private handleMarketPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("market")) return;
    if (this.saleKind) { this.handleSaleSelectorPointer(pointer); return; }
    if (pointer.x < 110 || pointer.x > 530) return;
    const index = this.cardY.findIndex(y => pointer.y >= y - 17 && pointer.y <= y + 17);
    if (index >= 0) this.performAction(index);
  };

  private handleMarketPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("market")) {
      this.actionCards.forEach((card, index) => card.setFillStyle(index % 2 === 0 ? 0x40513a : 0x3d4b34, 1));
      this.scene.game.canvas.style.cursor = "default";
      return;
    }
    if (this.saleKind) {
      const overMinus = pointer.x >= 218 && pointer.x <= 258 && pointer.y >= 168 && pointer.y <= 204;
      const overPlus = pointer.x >= 382 && pointer.x <= 422 && pointer.y >= 168 && pointer.y <= 204;
      const overMax = pointer.x >= 276 && pointer.x <= 364 && pointer.y >= 205 && pointer.y <= 235;
      const overConfirm = pointer.x >= 205 && pointer.x <= 315 && pointer.y >= 236 && pointer.y <= 267;
      const overCancel = pointer.x >= 325 && pointer.x <= 435 && pointer.y >= 236 && pointer.y <= 267;
      this.saleMinus.setFillStyle(overMinus ? 0x98713d : 0x70532f, 1);
      this.salePlus.setFillStyle(overPlus ? 0x668651 : 0x527044, 1);
      this.saleMax.setFillStyle(overMax ? 0x98713d : 0x70532f, 1);
      this.saleConfirm.setFillStyle(overConfirm ? 0x668651 : 0x527044, 1);
      this.saleCancel.setFillStyle(overCancel ? 0x98713d : 0x70532f, 1);
      this.scene.game.canvas.style.cursor = overMinus || overPlus || overMax || overConfirm || overCancel ? "pointer" : "default";
      return;
    }
    const index = pointer.x >= 110 && pointer.x <= 530
      ? this.cardY.findIndex(y => pointer.y >= y - 17 && pointer.y <= y + 17)
      : -1;
    this.actionCards.forEach((card, cardIndex) => card.setFillStyle(cardIndex === index ? 0x58734b : (cardIndex % 2 === 0 ? 0x40513a : 0x3d4b34), 1));
    this.scene.game.canvas.style.cursor = index >= 0 ? "pointer" : "default";
  };

  private updateInterface(): void {
    const font = this.language.getFontFamily();
    this.titleText.setText(this.language.t("market.title"));
    this.actionTexts[0].setText(this.language.t("market.buy"));
    this.actionTexts[1].setText(this.language.t("market.sell"));
    this.actionTexts[2].setText(this.fishing.getHasRod() ? this.language.t("market.rodOwned") : this.language.t("market.buyRod"));
    this.actionTexts[3].setText(this.language.t("market.sellMeals"));
    this.actionTexts[4].setText(this.language.t("market.sellFish"));
    this.updateSaleSelector();
    this.exitHintText.setText(this.language.t("market.exitHint"));
    this.clickHintText.setText(this.language.t("market.clickHint"));
    this.stallLabel.setText(this.language.t("market.stallName"));
    this.promptText.setText(this.language.t("market.prompt"));
    for (const text of [this.titleText, ...this.actionTexts, this.moneyText, this.messageText, this.exitHintText, this.clickHintText, this.stallLabel, this.promptText]) {
      text.setFontFamily(font);
    }
    this.updateMoney();
  }

  private updateMoney(): void {
    const text = this.language.getLanguage() === "my"
      ? `ဒင်္ဂါး ${this.coins}  ·  စပါး ${this.farming.getRice()}  ·  ငါး ${this.fishing.getFishTotal()}  ·  ဟင်း ${this.cooking.getTotalMeals()}`
      : `COINS ${this.coins}  ·  RICE ${this.farming.getRice()}  ·  FISH ${this.fishing.getFishTotal()}  ·  MEALS ${this.cooking.getTotalMeals()}`;
    this.moneyText.setText(text);
  }

  private openMarket(): void {
    this.isOpen = true;
    this.ui.open("market");
    this.messageText.setText(this.language.t("market.welcome"));
    this.updateInterface();
    this.promptText.setVisible(false);
  }

  private closeMarket = (): void => {
    this.closeSaleSelector();
    this.isOpen = false;
    this.ui.close("market");
    this.interactKey.reset();
    this.escapeKey.reset();
  };

  private buySeeds(requestedPacks: number): void {
    const packs = Math.min(maximumQuantity(requestedPacks), Math.floor(this.coins / 10));
    if (packs <= 0) { this.messageText.setText(this.language.t("market.notEnough")); return; }
    const totalSeeds = packs * 5;
    const totalCost = packs * 10;
    this.coins -= totalCost;
    this.farming.addSeeds(totalSeeds);
    this.scene.events.emit("sound-effect", { name: "buy", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.bought", { seeds: totalSeeds, coins: totalCost }));
    this.updateInterface();
  }

  private sellRice(requested: number): void {
    const rice = Math.min(Math.max(0, Math.floor(requested)), this.farming.getRice());
    if (rice <= 0 || !this.farming.removeRice(rice)) { this.messageText.setText(this.language.t("market.noRice")); return; }
    const earnings = rice * 5;
    this.coins += earnings;
    this.scene.events.emit("sound-effect", { name: "sell", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.sold", { rice, coins: earnings }));
    this.updateInterface();
  }

  private buyFishingRod(requested: number): void {
    if (this.fishing.getHasRod()) { this.messageText.setText(this.language.t("market.rodOwned")); return; }
    if (requested < 1 || this.coins < 35) { this.messageText.setText(this.language.t("market.notEnough")); return; }
    this.coins -= 35;
    this.fishing.grantFishingRod();
    this.scene.events.emit("sound-effect", { name: "buy", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.rodPurchased"));
    this.updateInterface();
  }

  private sellMeals(requested: number): void {
    const counts = this.cooking.getMealCounts();
    const total = this.cooking.getTotalMeals();
    let remaining = Math.min(Math.max(0, Math.floor(requested)), total);
    if (remaining <= 0) { this.messageText.setText(this.language.t("market.noMeals")); return; }
    const values: Record<MealKind, number> = { fishRice: 20, mohinga: 24, fishCurry: 20 };
    let sold = 0;
    let earnings = 0;
    for (const kind of ["fishRice", "mohinga", "fishCurry"] as MealKind[]) {
      const amount = Math.min(counts[kind], remaining);
      if (amount > 0 && this.cooking.removeMeals(kind, amount)) {
        sold += amount;
        remaining -= amount;
        earnings += amount * values[kind];
      }
      if (remaining <= 0) break;
    }
    if (sold <= 0) return;
    this.coins += earnings;
    this.scene.events.emit("sound-effect", { name: "sell", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.mealsSold", { meals: sold, coins: earnings }));
    this.updateInterface();
  }

  private sellFish(requested: number): void {
    const counts = this.fishing.getFishCounts();
    const total = this.fishing.getFishTotal();
    let remaining = Math.min(Math.max(0, Math.floor(requested)), total);
    if (remaining <= 0) { this.messageText.setText(this.language.t("market.noFish")); return; }
    const values: Record<FishKind, number> = { silverBarb: 4, catfish: 6, goldenCarp: 8 };
    let sold = 0;
    let earnings = 0;
    for (const kind of ["silverBarb", "catfish", "goldenCarp"] as FishKind[]) {
      const amount = Math.min(counts[kind], remaining);
      if (amount > 0 && this.fishing.removeFish(kind, amount)) {
        sold += amount;
        remaining -= amount;
        earnings += amount * values[kind];
      }
      if (remaining <= 0) break;
    }
    if (sold <= 0) return;
    this.coins += earnings;
    this.scene.events.emit("sound-effect", { name: "sell", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.fishSold", { fish: sold, coins: earnings }));
    this.updateInterface();
  }

  private performAction(index: number): void {
    switch (index) {
      case 0: this.beginSale("seeds"); break;
      case 1: this.beginSale("rice"); break;
      case 2: this.beginSale("rod"); break;
      case 3: this.beginSale("meals"); break;
      case 4: this.beginSale("fish"); break;
    }
  }

  getSaveData(): { coins: number } { return { coins: this.coins }; }
  loadSaveData(data: { coins: number }): void {
    this.coins = Math.max(0, Math.floor(Number(data.coins) || 0));
    this.updateMoney();
  }

  mobileInteract(playerX: number, playerY: number): boolean {
    if (this.isOpen) { this.closeMarket(); return true; }
    if (this.ui.hasActiveModal()) return false;
    if (Phaser.Math.Distance.Between(playerX, playerY, this.marketX, this.marketY) < 90) {
      this.openMarket();
      return true;
    }
    return false;
  }

  update(playerX: number, playerY: number): void {
    if (this.isOpen) {
      if (!this.saleKind) {
        if (Phaser.Input.Keyboard.JustDown(this.buyKey)) this.beginSale("seeds");
        if (Phaser.Input.Keyboard.JustDown(this.sellKey)) this.beginSale("rice");
        if (Phaser.Input.Keyboard.JustDown(this.rodKey)) this.beginSale("rod");
        if (Phaser.Input.Keyboard.JustDown(this.mealSellKey)) this.beginSale("meals");
        if (Phaser.Input.Keyboard.JustDown(this.fishSellKey)) this.beginSale("fish");
      }
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        if (this.saleKind) this.closeSaleSelector();
        else this.closeMarket();
      }
      return;
    }
    const distance = Phaser.Math.Distance.Between(playerX, playerY, this.marketX, this.marketY);
    const nearMarket = distance < 90;
    this.stallLabel.setAlpha(distance < 190 ? 1 : 0);
    this.promptText.setVisible(nearMarket && !this.ui.hasActiveModal());
    if (nearMarket && Phaser.Input.Keyboard.JustDown(this.interactKey)) this.openMarket();
  }
}
