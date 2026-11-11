import Phaser from "phaser";
import { FARM_UPGRADE_DEFINITIONS, FarmingSystem, type FarmUpgradeId } from "./FarmingSystem";
import { FishingSystem, type FishKind } from "./FishingSystem";
import { CookingSystem, type MealKind } from "./CookingSystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, modalPanel } from "../ui/PixelUI";
import { adjustQuantity, maximumQuantity, maximumQuantitySelection, normalizeQuantity, quantityAdjustmentStep } from "../ui/QuantityMath";

type SaleKind = "rice" | "meals" | "fish" | "seeds" | "tomatoSeeds" | "greenBeanSeeds" | "rod" | "goldenWheat";

const SEED_PACK_COST = 25;
const FISHING_ROD_COST = 120;
const GOLDEN_WHEAT_PRICE = 20;
const UPGRADE_ORDER: FarmUpgradeId[] = ["hoe", "wateringCan", "sickle", "expansion", "riceMill"];

export class MarketSystem {
  private scene: Phaser.Scene;
  private farming: FarmingSystem;
  private fishing: FishingSystem;
  private cooking: CookingSystem;
  private ui: ModalUIManager;
  private language: LanguageSystem;

  private coins = 15;
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
  private goldenWheatKey!: Phaser.Input.Keyboard.Key;
  private upgradesKey!: Phaser.Input.Keyboard.Key;
  private mealSellKey!: Phaser.Input.Keyboard.Key;
  private fishSellKey!: Phaser.Input.Keyboard.Key;

  private marketPanel!: Phaser.GameObjects.Container;
  private closeButton!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private actionTexts: Phaser.GameObjects.Text[] = [];
  private moneyText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private exitHintText!: Phaser.GameObjects.Text;
  private clickHintText!: Phaser.GameObjects.Text;
  private actionCards: Phaser.GameObjects.Rectangle[] = [];
  private actionIcons: Phaser.GameObjects.Image[] = [];
  private actionStatusBadges: Phaser.GameObjects.Text[] = [];
  private coinBalanceIcon!: Phaser.GameObjects.Image;
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
  private upgradeMenuOpen = false;
  private seedMenuOpen = false;
  private readonly touchMode = ("ontouchstart" in window) || navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;

  private readonly cardY = [80, 112, 144, 176, 208, 240, 272];

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
    this.goldenWheatKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SIX);
    this.upgradesKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN);
  }

  private createInterface(): void {
    this.marketPanel = this.scene.add.container(0, 0).setScrollFactor(0);
    const background = modalPanel(this.scene, 320, 180, 500, 350);
    const divider = this.scene.add.rectangle(320, 57, 450, 2, 0x9b7047, 0.8);
    this.titleText = this.scene.add.text(320, 33, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "18px", color: "#e6c47e", fontStyle: "bold"
    }).setOrigin(0.5);
    this.marketPanel.add([background, divider, this.titleText]);

    const icons = ["rice_seed_bag_asset", "rice_bowl_asset", "fishing_rod_asset", "meal_fish_rice_asset", "fish_silver_barb_asset", "rice_grain_asset", "hoe_asset"];
    const fills = [0x40513a, 0x3d4b34, 0x40513a, 0x3d4b34, 0x40513a, 0x3d4b34, 0x40513a];
    this.cardY.forEach((y, index) => {
      const card = this.scene.add.rectangle(320, y, 420, 29, fills[index], 1).setStrokeStyle(2, 0x9b7047);
      const icon = this.scene.add.image(145, y, icons[index]).setScale(index === 2 ? 1.35 : 1.15);
      const text = this.scene.add.text(178, y, "", {
        fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#fff1cf", fontStyle: "bold",
        align: "left", wordWrap: { width: 280 }, lineSpacing: 0
      }).setOrigin(0, 0.5);
      const status = this.scene.add.text(492, y, "", {
        fontFamily: this.language.getFontFamily(), fontSize: "7.5px", color: "#fff1cf", fontStyle: "bold",
        align: "center", backgroundColor: "#527044", padding: { x: 5, y: 3 }
      }).setOrigin(0.5);
      this.actionCards.push(card);
      this.actionIcons.push(icon);
      this.actionTexts.push(text);
      this.actionStatusBadges.push(status);
      this.marketPanel.add([card, icon, text, status]);
    });

    const balanceCard = this.scene.add.rectangle(320, 302, 230, 24, 0x263b2d, 1).setStrokeStyle(2, 0xd6b36b);
    this.coinBalanceIcon = this.scene.add.image(232, 302, "coin_asset").setScale(1.1);
    this.moneyText = this.scene.add.text(342, 302, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "13px", color: "#ffe49a", fontStyle: "bold", align: "center"
    }).setOrigin(0.5);
    this.clickHintText = this.scene.add.text(320, 322, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#b9dca3", align: "center"
    }).setOrigin(0.5);
    this.messageText = this.scene.add.text(320, 337, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#d7e6c5", align: "center",
      wordWrap: { width: 440 }
    }).setOrigin(0.5);
    this.exitHintText = this.scene.add.text(320, 349, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#d7e6c5", align: "center"
    }).setOrigin(0.5);

    const closePosition = modalClosePosition(320, 180, 500, 350);
    this.closeButton = createRedCloseButton(this.scene, closePosition.x, closePosition.y);
    this.marketPanel.add([balanceCard, this.coinBalanceIcon, this.moneyText, this.clickHintText, this.messageText, this.exitHintText, this.closeButton]);
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
    if (this.saleKind === "goldenWheat") return this.farming.getGoldenWheat();
    if (this.saleKind === "seeds" || this.saleKind === "tomatoSeeds" || this.saleKind === "greenBeanSeeds") return Math.floor(this.coins / SEED_PACK_COST);
    if (this.saleKind === "rod") return this.fishing.getHasRod() || this.coins < FISHING_ROD_COST ? 0 : 1;
    return 0;
  }

  private updateSaleSelector(): void {
    if (!this.salePanel) return;
    const available = this.availableSaleAmount();
    this.saleAmount = normalizeQuantity(this.saleAmount, available);
    const isBuying = this.saleKind === "seeds" || this.saleKind === "tomatoSeeds" || this.saleKind === "greenBeanSeeds" || this.saleKind === "rod";
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
            : kind === "goldenWheat" ? "market.noGoldenWheat"
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
    else if (kind === "tomatoSeeds") this.buyCropSeeds("tomato", amount);
    else if (kind === "greenBeanSeeds") this.buyCropSeeds("greenBean", amount);
    else if (kind === "goldenWheat") this.sellGoldenWheat(amount);
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
    const index = this.cardY.findIndex(y => pointer.y >= y - 15 && pointer.y <= y + 15);
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
      ? this.cardY.findIndex(y => pointer.y >= y - 15 && pointer.y <= y + 15)
      : -1;
    this.actionCards.forEach((card, cardIndex) => card.setFillStyle(cardIndex === index ? 0x58734b : (cardIndex % 2 === 0 ? 0x40513a : 0x3d4b34), 1));
    this.scene.game.canvas.style.cursor = index >= 0 ? "pointer" : "default";
  };

  private updateInterface(): void {
    const font = this.language.getFontFamily();
    this.titleText.setText(this.language.t(
      this.upgradeMenuOpen ? "market.upgradesTitle" : this.seedMenuOpen ? "market.seedPacketsTitle" : "market.title"
    ));
    if (this.upgradeMenuOpen) {
      this.updateUpgradeMenu();
      this.updateUpgradeStatuses();
    } else if (this.seedMenuOpen) {
      this.updateSeedPacketMenu();
    } else {
      const rice = this.farming.getRice();
      const meals = this.cooking.getTotalMeals();
      const fish = this.fishing.getFishTotal();
      const goldenWheat = this.farming.getGoldenWheat();
      this.actionTexts[0].setText(this.language.t("market.seedPackets"));
      this.actionTexts[1].setText(this.language.t("market.sellRiceWithOwned", { price: 4 + this.farming.getRiceSaleBonus(), owned: rice }));
      this.actionTexts[2].setText(this.fishing.getHasRod() ? this.language.t("market.rodOwned") : this.language.t("market.buyRod", { cost: FISHING_ROD_COST }));
      this.actionTexts[3].setText(this.language.t("market.sellMealsWithOwned", { owned: meals }));
      this.actionTexts[4].setText(this.language.t("market.sellFishWithOwned", { owned: fish }));
      this.actionTexts[5].setText(this.language.t("market.sellGoldenWheatWithOwned", { price: GOLDEN_WHEAT_PRICE, owned: goldenWheat }));
      this.actionTexts[6].setText(this.language.t("market.openUpgrades"));
      const icons = ["rice_seed_bag_asset", "rice_bowl_asset", "fishing_rod_asset", "meal_fish_rice_asset", "fish_silver_barb_asset", "rice_grain_asset", "hoe_asset"];
      this.actionIcons.forEach((icon, index) => icon.setVisible(true).setTexture(icons[index]));
      this.setActionStatus(0, "market.status.open", "info");
      this.setActionStatus(1, rice > 0 ? "market.status.sell" : "market.status.none", rice > 0 ? "good" : "muted");
      this.setActionStatus(2, this.fishing.getHasRod() ? "market.status.owned" : this.coins >= FISHING_ROD_COST ? "market.status.ready" : "market.status.need", this.fishing.getHasRod() || this.coins >= FISHING_ROD_COST ? "good" : "bad", { amount: Math.max(0, FISHING_ROD_COST - this.coins) });
      this.setActionStatus(3, meals > 0 ? "market.status.sell" : "market.status.none", meals > 0 ? "good" : "muted");
      this.setActionStatus(4, fish > 0 ? "market.status.sell" : "market.status.none", fish > 0 ? "good" : "muted");
      this.setActionStatus(5, goldenWheat > 0 ? "market.status.sell" : "market.status.none", goldenWheat > 0 ? "good" : "muted");
      this.setActionStatus(6, "market.status.open", "info");
    }
    this.updateSaleSelector();
    this.exitHintText.setText(this.language.t("market.exitHint"));
    this.clickHintText.setText(this.language.t(this.upgradeMenuOpen ? "market.upgradesClickHint" : this.seedMenuOpen ? "market.seedPacketHint" : "market.clickHint"));
    this.stallLabel.setText(this.language.t("market.stallName"));
    this.promptText.setText(this.language.t("market.prompt"));
    for (const text of [this.titleText, ...this.actionTexts, ...this.actionStatusBadges, this.moneyText, this.messageText, this.exitHintText, this.clickHintText, this.stallLabel, this.promptText]) text.setFontFamily(font);
    this.updateMoney();
  }

  private updateSeedPacketMenu(): void {
    const options = [
      { kind: "seeds" as const, icon: "rice_seed_bag_asset", owned: this.farming.getSeedCount("rice"), label: this.language.t("market.buyWithOwned", { cost: SEED_PACK_COST, owned: this.farming.getSeedCount("rice") }) },
      { kind: "tomatoSeeds" as const, icon: "tomato_seed_bag_asset", owned: this.farming.getSeedCount("tomato"), label: this.language.t("market.buyTomatoSeeds", { cost: SEED_PACK_COST }) },
      { kind: "greenBeanSeeds" as const, icon: "green_bean_seed_bag_asset", owned: this.farming.getSeedCount("greenBean"), label: this.language.t("market.buyGreenBeanSeeds", { cost: SEED_PACK_COST }) }
    ];
    options.forEach((option, index) => {
      this.actionIcons[index].setTexture(option.icon);
      this.actionTexts[index].setText(option.label);
      this.setActionStatus(index, this.coins >= SEED_PACK_COST ? "market.status.ready" : "market.status.need", this.coins >= SEED_PACK_COST ? "good" : "bad", { amount: Math.max(0, SEED_PACK_COST - this.coins) });
    });
    for (let index = 3; index < 6; index++) {
      this.actionIcons[index].setVisible(false);
      this.actionTexts[index].setText("");
      this.actionStatusBadges[index].setText("");
    }
    this.actionIcons[6].setVisible(true).setTexture("ui_icon_hand");
    this.actionTexts[6].setText(this.language.t("market.back"));
    this.setActionStatus(6, "market.status.back", "muted");
  }
  private setActionStatus(index: number, key: string, tone: "good" | "bad" | "muted" | "info", values: Record<string, string | number> = {}): void {
    const badge = this.actionStatusBadges[index];
    if (!badge) return;
    const palette = {
      good: { text: "#f4ffe9", background: "#3e7446" },
      bad: { text: "#fff0df", background: "#8b4035" },
      muted: { text: "#d8d0bd", background: "#66513b" },
      info: { text: "#fff1cf", background: "#80603b" }
    }[tone];
    badge.setText(this.language.t(key, values));
    badge.setStyle({ color: palette.text, backgroundColor: palette.background });
  }

  private updateUpgradeStatuses(): void {
    UPGRADE_ORDER.forEach((id, index) => {
      const cost = this.farming.getNextUpgradeCost(id);
      if (cost === null) this.setActionStatus(index, "market.status.owned", "good");
      else if (this.coins >= cost) this.setActionStatus(index, "market.status.ready", "good");
      else this.setActionStatus(index, "market.status.need", "bad", { amount: cost - this.coins });
    });
    this.setActionStatus(5, "market.status.info", "info");
    this.setActionStatus(6, "market.status.back", "muted");
  }

  private updateUpgradeMenu(): void {
    const icons = ["hoe_asset", "watering_can_asset", "sickle_asset", "granary_asset", "rice_bowl_asset", "rice_grain_asset", "ui_icon_hand"];
    this.actionIcons.forEach((icon, index) => icon.setTexture(icons[index]));
    UPGRADE_ORDER.forEach((id, index) => {
      const definition = FARM_UPGRADE_DEFINITIONS[id];
      const level = this.farming.getUpgradeLevel(id);
      const cost = this.farming.getNextUpgradeCost(id);
      const name = this.language.t(definition.nameKey);
      const status = cost === null
        ? this.language.t("market.upgradeMaxed", { index: index + 1, name })
        : this.language.t("market.upgradeLine", { index: index + 1, name, level, max: definition.maxLevel, cost });
      // Keep action rows to one line: the previous two-line upgrade copy
      // collided with neighbouring cards, especially in Burmese.
      this.actionTexts[index].setText(status);
    });
    this.actionTexts[5].setText(this.language.t("market.upgradesHint"));
    this.actionTexts[6].setText(this.language.t("market.back"));
  }

  private openSeedMenu(): void {
    this.seedMenuOpen = true;
    this.upgradeMenuOpen = false;
    this.messageText.setText(this.language.t("market.seedPacketsTitle"));
    this.updateInterface();
  }

  private closeSeedMenu(): void {
    this.seedMenuOpen = false;
    this.messageText.setText(this.language.t("market.welcome"));
    this.updateInterface();
  }

  private openUpgradeMenu(): void {
    this.upgradeMenuOpen = true;
    this.messageText.setText(this.language.t("market.upgradesWelcome"));
    this.updateInterface();
  }

  private closeUpgradeMenu(): void {
    this.upgradeMenuOpen = false;
    this.messageText.setText(this.language.t("market.welcome"));
    this.updateInterface();
  }

  private purchaseUpgrade(index: number): void {
    const id = UPGRADE_ORDER[index];
    if (!id) return;
    const definition = FARM_UPGRADE_DEFINITIONS[id];
    const level = this.farming.getUpgradeLevel(id);
    const cost = this.farming.getNextUpgradeCost(id);
    const name = this.language.t(definition.nameKey);
    if (cost === null) {
      this.messageText.setText(this.language.t("market.upgradeAlreadyOwned", { item: name }));
      return;
    }
    if (this.coins < cost) {
      this.messageText.setText(this.language.t("market.upgradeNeedCoins", { cost, coins: this.coins }));
      return;
    }
    this.coins -= cost;
    if (!this.farming.purchaseUpgrade(id)) {
      this.coins += cost;
      this.messageText.setText(this.language.t("market.upgradeAlreadyOwned", { item: name }));
      return;
    }
    this.scene.events.emit("sound-effect", { name: "buy", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.upgradeBought", { item: name, level: level + 1 }));
    this.updateInterface();
  }

  private updateMoney(): void {
    this.moneyText.setText(this.language.t("market.balance", { coins: this.coins }));
  }

  private openMarket(): void {
    this.isOpen = true;
    this.seedMenuOpen = false;
    this.upgradeMenuOpen = false;
    this.ui.open("market");
    this.messageText.setText(this.language.t("market.welcome"));
    this.updateInterface();
    this.promptText.setVisible(false);
  }

  private closeMarket = (): void => {
    this.closeSaleSelector();
    this.seedMenuOpen = false;
    this.upgradeMenuOpen = false;
    this.isOpen = false;
    this.ui.close("market");
    this.interactKey.reset();
  };

  private buySeeds(requestedPacks: number): void {
    const packs = Math.min(maximumQuantity(requestedPacks), Math.floor(this.coins / SEED_PACK_COST));
    if (packs <= 0) { this.messageText.setText(this.language.t("market.notEnough")); return; }
    const totalSeeds = packs * 5;
    const totalCost = packs * SEED_PACK_COST;
    this.coins -= totalCost;
    this.farming.addSeeds(totalSeeds);
    this.scene.events.emit("sound-effect", { name: "buy", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.bought", { seeds: totalSeeds, coins: totalCost }));
    this.updateInterface();
  }

  private buyCropSeeds(kind: "tomato" | "greenBean", requestedPacks: number): void {
    const packs = Math.min(maximumQuantity(requestedPacks), Math.floor(this.coins / SEED_PACK_COST));
    if (packs <= 0) { this.messageText.setText(this.language.t("market.notEnough")); return; }
    const amount = packs * 5;
    const cost = packs * SEED_PACK_COST;
    this.coins -= cost;
    this.farming.addCropSeeds(kind, amount);
    this.scene.events.emit("sound-effect", { name: "buy", x: this.marketX, y: this.marketY, maxDistance: 185 });
    const crop = this.language.t(kind === "tomato" ? "inventory.tomatoes" : "inventory.greenBeans");
    this.messageText.setText(this.language.t("market.seedPacketBought", { amount, crop, coins: cost }));
    this.updateInterface();
  }

  private sellRice(requested: number): void {
    const rice = Math.min(Math.max(0, Math.floor(requested)), this.farming.getRice());
    if (rice <= 0 || !this.farming.removeRice(rice)) { this.messageText.setText(this.language.t("market.noRice")); return; }
    const earnings = rice * (4 + this.farming.getRiceSaleBonus());
    this.coins += earnings;
    this.scene.events.emit("sound-effect", { name: "sell", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.sold", { rice, coins: earnings }));
    this.updateInterface();
  }

  private buyFishingRod(requested: number): void {
    if (this.fishing.getHasRod()) { this.messageText.setText(this.language.t("market.rodOwned")); return; }
    if (requested < 1 || this.coins < FISHING_ROD_COST) { this.messageText.setText(this.language.t("market.notEnough")); return; }
    this.coins -= FISHING_ROD_COST;
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
    const values: Record<MealKind, number> = { fishRice: 18, mohinga: 32, fishCurry: 36 };
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
    const values: Record<FishKind, number> = { silverBarb: 3, catfish: 8, goldenCarp: 15 };
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

  private sellGoldenWheat(requested: number): void {
    const amount = Math.min(maximumQuantity(requested), this.farming.getGoldenWheat());
    if (amount <= 0 || !this.farming.removeGoldenWheat(amount)) {
      this.messageText.setText(this.language.t("market.noGoldenWheat"));
      return;
    }
    const earnings = amount * GOLDEN_WHEAT_PRICE;
    this.coins += earnings;
    this.scene.events.emit("sound-effect", { name: "sell", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.goldenWheatSold", { amount, coins: earnings }));
    this.updateInterface();
  }

  private performAction(index: number): void {
    if (this.upgradeMenuOpen) {
      if (index < UPGRADE_ORDER.length) this.purchaseUpgrade(index);
      else if (index === 6) this.closeUpgradeMenu();
      return;
    }
    if (this.seedMenuOpen) {
      if (index === 0) this.beginSale("seeds");
      else if (index === 1) this.beginSale("tomatoSeeds");
      else if (index === 2) this.beginSale("greenBeanSeeds");
      else if (index === 6) this.closeSeedMenu();
      return;
    }
    switch (index) {
      case 0: this.openSeedMenu(); break;
      case 1: this.beginSale("rice"); break;
      case 2: this.beginSale("rod"); break;
      case 3: this.beginSale("meals"); break;
      case 4: this.beginSale("fish"); break;
      case 5: this.beginSale("goldenWheat"); break;
      case 6: this.openUpgradeMenu(); break;
    }
  }

  getSaveData(): { coins: number } { return { coins: this.coins }; }
  loadSaveData(data: { coins: number }): void {
    this.coins = Math.max(0, Math.floor(Number(data.coins) || 0));
    this.updateMoney();
  }

  mobileInteractionDistance(playerX: number, playerY: number): number {
    return Phaser.Math.Distance.Between(playerX, playerY, this.marketX, this.marketY);
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

  canMobileInteract(playerX: number, playerY: number): boolean {
    return !this.isOpen && !this.ui.hasActiveModal() &&
      Phaser.Math.Distance.Between(playerX, playerY, this.marketX, this.marketY) < 90;
  }

  update(playerX: number, playerY: number): void {
    if (this.isOpen) {
      if (!this.saleKind) {
        if (this.upgradeMenuOpen) {
          if (Phaser.Input.Keyboard.JustDown(this.buyKey)) this.purchaseUpgrade(0);
          if (Phaser.Input.Keyboard.JustDown(this.sellKey)) this.purchaseUpgrade(1);
          if (Phaser.Input.Keyboard.JustDown(this.rodKey)) this.purchaseUpgrade(2);
          if (Phaser.Input.Keyboard.JustDown(this.mealSellKey)) this.purchaseUpgrade(3);
          if (Phaser.Input.Keyboard.JustDown(this.fishSellKey)) this.purchaseUpgrade(4);
          if (Phaser.Input.Keyboard.JustDown(this.upgradesKey)) this.closeUpgradeMenu();
        } else if (this.seedMenuOpen) {
          if (Phaser.Input.Keyboard.JustDown(this.buyKey)) this.beginSale("seeds");
          if (Phaser.Input.Keyboard.JustDown(this.sellKey)) this.beginSale("tomatoSeeds");
          if (Phaser.Input.Keyboard.JustDown(this.rodKey)) this.beginSale("greenBeanSeeds");
          if (Phaser.Input.Keyboard.JustDown(this.upgradesKey)) this.closeSeedMenu();
        } else {
          if (Phaser.Input.Keyboard.JustDown(this.buyKey)) this.openSeedMenu();
          if (Phaser.Input.Keyboard.JustDown(this.sellKey)) this.beginSale("rice");
          if (Phaser.Input.Keyboard.JustDown(this.rodKey)) this.beginSale("rod");
          if (Phaser.Input.Keyboard.JustDown(this.mealSellKey)) this.beginSale("meals");
          if (Phaser.Input.Keyboard.JustDown(this.fishSellKey)) this.beginSale("fish");
          if (Phaser.Input.Keyboard.JustDown(this.goldenWheatKey)) this.beginSale("goldenWheat");
          if (Phaser.Input.Keyboard.JustDown(this.upgradesKey)) this.openUpgradeMenu();
        }
      }
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        if (this.saleKind) this.closeSaleSelector();
        else if (this.upgradeMenuOpen) this.closeUpgradeMenu();
        else if (this.seedMenuOpen) this.closeSeedMenu();
        else this.closeMarket();
      }
      return;
    }
    const distance = Phaser.Math.Distance.Between(playerX, playerY, this.marketX, this.marketY);
    const nearMarket = distance < 90;
    this.stallLabel.setAlpha(distance < 190 ? 1 : 0);
    this.promptText.setVisible(nearMarket && !this.ui.hasActiveModal() && !this.touchMode);
    if (nearMarket && Phaser.Input.Keyboard.JustDown(this.interactKey)) this.openMarket();
  }
}
