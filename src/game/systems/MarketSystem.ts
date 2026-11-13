import Phaser from "phaser";
import { FARM_UPGRADE_DEFINITIONS, FarmingSystem, type FarmUpgradeId } from "./FarmingSystem";
import { FishingSystem, type FishKind } from "./FishingSystem";
import { CookingSystem, type MealKind } from "./CookingSystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, modalPanel, uiFontSize, uiDescriptionStyle } from "../ui/PixelUI";
import { adjustQuantity, maximumQuantity, maximumQuantitySelection, normalizeQuantity, quantityAdjustmentStep } from "../ui/QuantityMath";
import { isMobilePlatform } from "../utils/DeviceMode";

type SaleKind = "wheat" | "tomatoes" | "greenBeans" | MealKind | "silverBarb" | "catfish" | "goldenCarp" | "seeds" | "tomatoSeeds" | "greenBeanSeeds" | "wormBait" | "shrimpBait" | "goldenCricketBait";

const SEED_PACK_PRICES: Record<"seeds" | "tomatoSeeds" | "greenBeanSeeds", number> = {
  seeds: 25,
  greenBeanSeeds: 35,
  tomatoSeeds: 45
};
const FISHING_ROD_COST = 120;
const BAIT_PRICES: Record<"wormBait" | "shrimpBait" | "goldenCricketBait", number> = {
  wormBait: 10,
  shrimpBait: 25,
  goldenCricketBait: 50
};
const NORMAL_WHEAT_PRICE = 6;
const GOLDEN_WHEAT_PRICE = 24;
const CROP_SELL_PRICES: Record<"tomato" | "greenBean", number> = { tomato: 14, greenBean: 10 };
const FISH_SELL_PRICES: Record<FishKind, number> = { silverBarb: 3, catfish: 8, goldenCarp: 15 };
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
  private lastPlayerX = 0;
  private lastPlayerY = 0;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private buyKey!: Phaser.Input.Keyboard.Key;
  private sellKey!: Phaser.Input.Keyboard.Key;
  private rodKey!: Phaser.Input.Keyboard.Key;
  private menuSixKey!: Phaser.Input.Keyboard.Key;
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
  private saleDescriptionText!: Phaser.GameObjects.Text;
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
  private baitMenuOpen = false;
  private produceMenuOpen = false;
  private fishMenuOpen = false;
  private mealMenuOpen = false;
  private upgradeDetailPanel!: Phaser.GameObjects.Container;
  private upgradeDetailTitle!: Phaser.GameObjects.Text;
  private upgradeDetailDescription!: Phaser.GameObjects.Text;
  private upgradeDetailInfo!: Phaser.GameObjects.Text;
  private upgradeDetailBuy!: Phaser.GameObjects.Rectangle;
  private upgradeDetailBack!: Phaser.GameObjects.Rectangle;
  private upgradeDetailButtons: Phaser.GameObjects.Text[] = [];
  private selectedUpgradeId: FarmUpgradeId | null = null;
  private selectedRodDetail = false;
  private readonly touchMode = isMobilePlatform();

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
      this.closeUpgradeDetail();
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
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(10), color: "#fff3d3",
      backgroundColor: "#34271d", padding: { x: 5, y: 3 }, align: "center", wordWrap: { width: 190 }
    }).setOrigin(0.5).setDepth(261);
    this.promptText = this.scene.add.text(320, 286, this.language.t("market.prompt"), {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(10), color: "#fff1cf",
      backgroundColor: "#2a1a14", padding: { x: 7, y: 4 },
      stroke: "#2a1a14", strokeThickness: 2, wordWrap: { width: 440 }
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
    this.menuSixKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SIX);
    this.upgradesKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN);
  }

  private createInterface(): void {
    this.marketPanel = this.scene.add.container(0, 0).setScrollFactor(0);
    const background = modalPanel(this.scene, 320, 180, 500, 350);
    const divider = this.scene.add.rectangle(320, 57, 450, 2, 0x9b7047, 0.8);
    this.titleText = this.scene.add.text(320, 33, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(17), color: "#e6c47e", fontStyle: "bold", align: "center", wordWrap: { width: 430, useAdvancedWrap: true }
    }).setOrigin(0.5).setMaxLines(2);
    this.marketPanel.add([background, divider, this.titleText]);

    const icons = ["wheat_seed_bag_asset", "wheat_basket_asset", "fishing_rod_asset", "meal_fish_rice_asset", "fish_silver_barb_asset", "hoe_asset", "ui_icon_hand"];
    const fills = [0x40513a, 0x3d4b34, 0x40513a, 0x3d4b34, 0x40513a, 0x3d4b34, 0x40513a];
    this.cardY.forEach((y, index) => {
      const card = this.scene.add.rectangle(320, y, 420, 29, fills[index], 1)
        .setStrokeStyle(1, 0xc29a62);
      const icon = this.scene.add.image(145, y, icons[index]).setDisplaySize(22, 22);
      const text = this.scene.add.text(178, y, "", {
        fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(8), color: "#fff1cf", fontStyle: "bold",
        align: "left", wordWrap: { width: 280 }, lineSpacing: 0
      }).setOrigin(0, 0.5).setMaxLines(2);
      const status = this.scene.add.text(492, y, "", {
        fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(7), color: "#fff1cf", fontStyle: "bold",
        align: "center", backgroundColor: "#527044", padding: { x: 4, y: 2 }, wordWrap: { width: 74 }, lineSpacing: 0
      }).setOrigin(0.5).setMaxLines(2);
      this.actionCards.push(card);
      this.actionIcons.push(icon);
      this.actionTexts.push(text);
      this.actionStatusBadges.push(status);
      this.marketPanel.add([card, icon, text, status]);
    });

    const balanceCard = this.scene.add.rectangle(320, 302, 230, 24, 0x2f432f, 1).setStrokeStyle(1, 0xe0bb70);
    this.coinBalanceIcon = this.scene.add.image(232, 302, "coin_asset").setScale(1.1);
    this.moneyText = this.scene.add.text(342, 302, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(12), color: "#ffe49a", fontStyle: "bold", align: "center", wordWrap: { width: 160, useAdvancedWrap: true }
    }).setOrigin(0.5).setMaxLines(1);
    this.clickHintText = this.scene.add.text(320, 322, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(7), color: "#b9dca3", align: "center", wordWrap: { width: 440, useAdvancedWrap: true }
    }).setOrigin(0.5).setMaxLines(1);
    this.messageText = this.scene.add.text(320, 337, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(7), color: "#d7e6c5", align: "center",
      wordWrap: { width: 440, useAdvancedWrap: true }
    }).setOrigin(0.5).setMaxLines(1);
    this.exitHintText = this.scene.add.text(320, 349, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(7), color: "#d7e6c5", align: "center", wordWrap: { width: 440, useAdvancedWrap: true }
    }).setOrigin(0.5).setMaxLines(1);

    const closePosition = modalClosePosition(320, 180, 500, 350);
    this.closeButton = createRedCloseButton(this.scene, closePosition.x, closePosition.y);
    this.marketPanel.add([balanceCard, this.coinBalanceIcon, this.moneyText, this.clickHintText, this.messageText, this.exitHintText, this.closeButton]);
    this.createSaleSelector();
    this.marketPanel.add(this.salePanel);
    this.createUpgradeDetail();
    this.marketPanel.add(this.upgradeDetailPanel);
    this.updateInterface();
  }

  private createSaleSelector(): void {
    this.salePanel = this.scene.add.container(0, 0).setVisible(false);
    const background = modalPanel(this.scene, 320, 180, 410, 212);
    this.saleTitleText = this.scene.add.text(320, 94, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(14), color: "#e6c47e", fontStyle: "bold", align: "center", wordWrap: { width: 360, useAdvancedWrap: true }
    }).setOrigin(0.5).setMaxLines(2);
    this.saleDescriptionText = this.scene.add.text(320, 125, "", {
      ...uiDescriptionStyle(this.language.getFontFamily(), 346, 8.5), align: "center"
    }).setOrigin(0.5).setMaxLines(3);
    this.saleAvailableText = this.scene.add.text(320, 161, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(8), color: "#d7e6c5", align: "center", wordWrap: { width: 420, useAdvancedWrap: true }
    }).setOrigin(0.5).setMaxLines(2);
    this.saleMinus = this.scene.add.rectangle(238, 194, 40, 30, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
    const minusLabel = this.scene.add.text(238, 194, "−", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(17), color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
    this.saleAmountText = this.scene.add.text(320, 194, "1", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(15), color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
    this.salePlus = this.scene.add.rectangle(402, 194, 40, 30, 0x527044, 1).setStrokeStyle(1, 0xd6b36b);
    const plusLabel = this.scene.add.text(402, 194, "+", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(17), color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
    this.saleMax = this.scene.add.rectangle(320, 228, 90, 22, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
    const maxLabel = this.scene.add.text(320, 228, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(8), color: "#fff1cf", fontStyle: "bold", align: "center", wordWrap: { width: 100, useAdvancedWrap: true } }).setOrigin(0.5).setMaxLines(2);
    this.saleConfirm = this.scene.add.rectangle(262, 263, 112, 27, 0x527044, 1).setStrokeStyle(1, 0xd6b36b);
    const confirmLabel = this.scene.add.text(262, 263, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(8), color: "#fff1cf", fontStyle: "bold", wordWrap: { width: 100, useAdvancedWrap: true } }).setOrigin(0.5).setMaxLines(2);
    this.saleCancel = this.scene.add.rectangle(378, 263, 112, 27, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
    const cancelLabel = this.scene.add.text(378, 263, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(8), color: "#fff1cf", fontStyle: "bold", wordWrap: { width: 100, useAdvancedWrap: true } }).setOrigin(0.5).setMaxLines(2);
    this.saleButtonTexts = [minusLabel, plusLabel, maxLabel, confirmLabel, cancelLabel];
    this.salePanel.add([background, this.saleTitleText, this.saleDescriptionText, this.saleAvailableText, this.saleMinus, minusLabel, this.saleAmountText, this.salePlus, plusLabel, this.saleMax, maxLabel, this.saleConfirm, confirmLabel, this.saleCancel, cancelLabel]);
    this.updateSaleSelector();
  }

  private createUpgradeDetail(): void {
    this.upgradeDetailPanel = this.scene.add.container(0, 0).setVisible(false);
    const background = modalPanel(this.scene, 320, 180, 410, 212);
    this.upgradeDetailTitle = this.scene.add.text(320, 94, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(14), color: "#e6c47e", fontStyle: "bold", align: "center", wordWrap: { width: 350, useAdvancedWrap: true }
    }).setOrigin(0.5).setMaxLines(2);
    this.upgradeDetailDescription = this.scene.add.text(320, 145, "", {
      ...uiDescriptionStyle(this.language.getFontFamily(), 346, 9.5), align: "center"
    }).setOrigin(0.5).setMaxLines(3);
    this.upgradeDetailInfo = this.scene.add.text(320, 207, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(9), color: "#ffe49a", fontStyle: "bold", align: "center", wordWrap: { width: 350, useAdvancedWrap: true }
    }).setOrigin(0.5).setMaxLines(2);
    this.upgradeDetailBuy = this.scene.add.rectangle(260, 263, 112, 28, 0x527044, 1).setStrokeStyle(1, 0xd6b36b);
    const buyLabel = this.scene.add.text(260, 263, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(9), color: "#fff1cf", fontStyle: "bold", align: "center", wordWrap: { width: 100, useAdvancedWrap: true } }).setOrigin(0.5).setMaxLines(2);
    this.upgradeDetailBack = this.scene.add.rectangle(378, 263, 112, 28, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
    const backLabel = this.scene.add.text(378, 263, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(9), color: "#fff1cf", fontStyle: "bold", wordWrap: { width: 100, useAdvancedWrap: true } }).setOrigin(0.5).setMaxLines(2);
    this.upgradeDetailButtons = [buyLabel, backLabel];
    this.upgradeDetailPanel.add([background, this.upgradeDetailTitle, this.upgradeDetailDescription, this.upgradeDetailInfo, this.upgradeDetailBuy, buyLabel, this.upgradeDetailBack, backLabel]);
  }

  private availableSaleAmount(): number {
    if (this.saleKind === "wheat") return this.farming.getRice() + this.farming.getGoldenWheat();
    if (this.saleKind === "fishRice" || this.saleKind === "mohinga" || this.saleKind === "fishCurry") return this.cooking.getMealCounts()[this.saleKind];
    if (this.saleKind === "silverBarb" || this.saleKind === "catfish" || this.saleKind === "goldenCarp") return this.fishing.getFishCount(this.saleKind);
    if (this.saleKind === "tomatoes") return this.farming.getCropCount("tomato");
    if (this.saleKind === "greenBeans") return this.farming.getCropCount("greenBean");
    if (this.saleKind === "seeds" || this.saleKind === "tomatoSeeds" || this.saleKind === "greenBeanSeeds") return Math.floor(this.coins / SEED_PACK_PRICES[this.saleKind]);
    if (this.saleKind === "wormBait" || this.saleKind === "shrimpBait" || this.saleKind === "goldenCricketBait") {
      return Math.floor(this.coins / BAIT_PRICES[this.saleKind]);
    }
    return 0;
  }

  private saleDescription(): string {
    if (!this.saleKind) return "";
    const keys: Record<SaleKind, string> = {
      wheat: "market.inspect.wheat",
      tomatoes: "market.inspect.tomatoes",
      greenBeans: "market.inspect.greenBeans",
      fishRice: "market.inspect.fishRice",
      mohinga: "market.inspect.mohinga",
      fishCurry: "market.inspect.fishCurry",
      silverBarb: "market.inspect.silverBarb",
      catfish: "market.inspect.catfish",
      goldenCarp: "market.inspect.goldenCarp",
      seeds: "market.inspect.riceSeeds",
      tomatoSeeds: "market.inspect.tomatoSeeds",
      greenBeanSeeds: "market.inspect.greenBeanSeeds",
      wormBait: "market.inspect.wormBait",
      shrimpBait: "market.inspect.shrimpBait",
      goldenCricketBait: "market.inspect.goldenCricketBait"
    };
    const values: Record<string, string | number> = this.saleKind === "wheat"
      ? { normal: NORMAL_WHEAT_PRICE + this.farming.getRiceSaleBonus(), golden: GOLDEN_WHEAT_PRICE }
      : this.saleKind === "tomatoes" ? { price: CROP_SELL_PRICES.tomato }
        : this.saleKind === "greenBeans" ? { price: CROP_SELL_PRICES.greenBean }
        : this.saleKind === "fishRice" ? { price: 18 }
          : this.saleKind === "mohinga" ? { price: 32 }
            : this.saleKind === "fishCurry" ? { price: 36 }
              : this.saleKind === "silverBarb" || this.saleKind === "catfish" || this.saleKind === "goldenCarp"
            ? { price: FISH_SELL_PRICES[this.saleKind] }
            : this.saleKind === "seeds" || this.saleKind === "tomatoSeeds" || this.saleKind === "greenBeanSeeds"
              ? { cost: SEED_PACK_PRICES[this.saleKind as "seeds" | "tomatoSeeds" | "greenBeanSeeds"] }
              : this.saleKind === "wormBait" || this.saleKind === "shrimpBait" || this.saleKind === "goldenCricketBait"
                ? { cost: BAIT_PRICES[this.saleKind] }
                : {};
    return this.language.t(keys[this.saleKind], values);
  }

  private buyOwnedAmount(): number {
    switch (this.saleKind) {
      case "seeds": return this.farming.getSeedCount("rice");
      case "tomatoSeeds": return this.farming.getSeedCount("tomato");
      case "greenBeanSeeds": return this.farming.getSeedCount("greenBean");
      case "wormBait": return this.fishing.getBaitCount("worm");
      case "shrimpBait": return this.fishing.getBaitCount("shrimp");
      case "goldenCricketBait": return this.fishing.getBaitCount("goldenCricket");
      default: return 0;
    }
  }

  private updateSaleSelector(): void {
    if (!this.salePanel) return;
    const available = this.availableSaleAmount();
    this.saleAmount = available > 0 ? normalizeQuantity(this.saleAmount, available) : 0;
    const isBuying = this.saleKind === "seeds" || this.saleKind === "tomatoSeeds" || this.saleKind === "greenBeanSeeds" || this.saleKind === "wormBait" || this.saleKind === "shrimpBait" || this.saleKind === "goldenCricketBait";
    const kindLabel = this.saleKind ? this.language.t(`market.quantity.${this.saleKind}`) : "";
    this.saleTitleText.setText(this.language.t(isBuying ? "market.quantity.buyTitle" : "market.quantity.title", { item: kindLabel }));
    this.saleDescriptionText.setText(this.saleDescription());
    if (isBuying) {
      const owned = this.buyOwnedAmount();
      const isSeedPack = this.saleKind === "seeds" || this.saleKind === "tomatoSeeds" || this.saleKind === "greenBeanSeeds";
      const availabilityKey = isSeedPack ? "market.quantity.buyAvailablePacks" : "market.quantity.buyAvailable";
      this.saleAvailableText.setText(this.language.t(availabilityKey, { owned, amount: available }));
    } else {
      this.saleAvailableText.setText(this.language.t("market.quantity.available", { amount: available }));
    }
    this.saleAmountText.setText(String(this.saleAmount));
    this.saleButtonTexts[2].setText(this.language.t("market.quantity.max"));
    this.saleButtonTexts[3].setText(this.language.t(isBuying ? "market.quantity.buyConfirm" : "market.quantity.confirm"));
    this.saleButtonTexts[4].setText(this.language.t("market.quantity.cancel"));
    const font = this.language.getFontFamily();
    for (const text of [this.saleTitleText, this.saleDescriptionText, this.saleAvailableText, this.saleAmountText, ...this.saleButtonTexts]) text.setFontFamily(font);
    for (const text of this.saleButtonTexts) text.setMaxLines(2);
    const canConfirm = available > 0;
    this.saleConfirm.setFillStyle(canConfirm ? 0x527044 : 0x65513a, 1).setAlpha(canConfirm ? 1 : 0.62);
    this.salePanel.setVisible(this.saleKind !== null);
  }

  private beginSale(kind: SaleKind): void {
    this.saleKind = kind;
    this.saleAmount = this.availableSaleAmount() > 0 ? 1 : 0;
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
    if (amount <= 0) return;
    if (kind === "wheat") this.sellWheat(amount);
    else if (kind === "wormBait" || kind === "shrimpBait" || kind === "goldenCricketBait") this.buyFishingBait(kind, amount);
    else if (kind === "fishRice" || kind === "mohinga" || kind === "fishCurry") this.sellMeal(kind, amount);
    else if (kind === "silverBarb" || kind === "catfish" || kind === "goldenCarp") this.sellFish(kind, amount);
    else if (kind === "seeds") this.buySeeds(amount);
    else if (kind === "tomatoSeeds") this.buyCropSeeds("tomato", amount);
    else if (kind === "greenBeanSeeds") this.buyCropSeeds("greenBean", amount);
    else if (kind === "tomatoes") this.sellCrop("tomato", amount);
    else if (kind === "greenBeans") this.sellCrop("greenBean", amount);
    this.closeSaleSelector();
  }

  private handleSaleSelectorPointer(pointer: Phaser.Input.Pointer): boolean {
    if (!this.saleKind) return false;
    const available = this.availableSaleAmount();
    if (pointer.x >= 322 && pointer.x <= 434 && pointer.y >= 248 && pointer.y <= 280) {
      this.closeSaleSelector();
      return true;
    }
    if (available <= 0) return true;
    const step = quantityAdjustmentStep(Boolean((pointer.event as MouseEvent).shiftKey));
    if (pointer.x >= 216 && pointer.x <= 260 && pointer.y >= 176 && pointer.y <= 212) {
      this.saleAmount = adjustQuantity(this.saleAmount, -step, this.availableSaleAmount());
      this.updateSaleSelector();
    } else if (pointer.x >= 380 && pointer.x <= 424 && pointer.y >= 176 && pointer.y <= 212) {
      this.saleAmount = adjustQuantity(this.saleAmount, step, this.availableSaleAmount());
      this.updateSaleSelector();
    } else if (pointer.x >= 274 && pointer.x <= 366 && pointer.y >= 214 && pointer.y <= 242) {
      this.saleAmount = maximumQuantitySelection(this.availableSaleAmount());
      this.updateSaleSelector();
    } else if (pointer.x >= 204 && pointer.x <= 318 && pointer.y >= 248 && pointer.y <= 280) {
      this.confirmSale();
    }
    return true;
  }

  /** Screen-space hit boxes intentionally match the rendered action cards. */
  private handleMarketPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("market")) {
      const nearMarket = Phaser.Math.Distance.Between(this.lastPlayerX, this.lastPlayerY, this.marketX, this.marketY) < 90;
      const clickedPrompt = pointer.x >= 220 && pointer.x <= 420 && pointer.y >= 270 && pointer.y <= 304;
      if (!this.touchMode && nearMarket && clickedPrompt && !this.ui.hasActiveModal()) this.openMarket();
      return;
    }
    if (this.selectedUpgradeId || this.selectedRodDetail) {
      if (pointer.x >= 202 && pointer.x <= 318 && pointer.y >= 246 && pointer.y <= 278) {
        if (this.selectedUpgradeId) this.purchaseUpgradeById(this.selectedUpgradeId);
        else this.purchaseFishingRod();
      } else if (pointer.x >= 322 && pointer.x <= 434 && pointer.y >= 246 && pointer.y <= 278) {
        this.closeUpgradeDetail();
      }
      return;
    }
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
    if (this.selectedUpgradeId || this.selectedRodDetail) {
      const overBuy = pointer.x >= 202 && pointer.x <= 318 && pointer.y >= 246 && pointer.y <= 278;
      const overBack = pointer.x >= 322 && pointer.x <= 434 && pointer.y >= 246 && pointer.y <= 278;
      const detailCost = this.selectedUpgradeId ? this.farming.getNextUpgradeCost(this.selectedUpgradeId) : (this.fishing.getHasRod() ? null : FISHING_ROD_COST);
      const canBuy = detailCost !== null && this.coins >= detailCost;
      this.upgradeDetailBuy.setFillStyle(overBuy && canBuy ? 0x668651 : canBuy ? 0x527044 : 0x65513a, 1);
      this.upgradeDetailBack.setFillStyle(overBack ? 0x98713d : 0x70532f, 1);
      this.scene.game.canvas.style.cursor = (overBuy && canBuy) || overBack ? "pointer" : "default";
      return;
    }
    if (this.saleKind) {
      const overMinus = pointer.x >= 216 && pointer.x <= 260 && pointer.y >= 176 && pointer.y <= 212;
      const overPlus = pointer.x >= 380 && pointer.x <= 424 && pointer.y >= 176 && pointer.y <= 212;
      const overMax = pointer.x >= 274 && pointer.x <= 366 && pointer.y >= 214 && pointer.y <= 242;
      const overConfirm = pointer.x >= 204 && pointer.x <= 318 && pointer.y >= 248 && pointer.y <= 280;
      const overCancel = pointer.x >= 322 && pointer.x <= 434 && pointer.y >= 248 && pointer.y <= 280;
      const canAdjust = this.availableSaleAmount() > 0;
      this.saleMinus.setFillStyle(canAdjust && overMinus ? 0x98713d : canAdjust ? 0x70532f : 0x514638, 1).setAlpha(canAdjust ? 1 : 0.58);
      this.salePlus.setFillStyle(canAdjust && overPlus ? 0x668651 : canAdjust ? 0x527044 : 0x514638, 1).setAlpha(canAdjust ? 1 : 0.58);
      this.saleMax.setFillStyle(canAdjust && overMax ? 0x98713d : canAdjust ? 0x70532f : 0x514638, 1).setAlpha(canAdjust ? 1 : 0.58);
      this.saleConfirm.setFillStyle(canAdjust && overConfirm ? 0x668651 : canAdjust ? 0x527044 : 0x514638, 1).setAlpha(canAdjust ? 1 : 0.58);
      this.saleCancel.setFillStyle(overCancel ? 0x98713d : 0x70532f, 1);
      this.scene.game.canvas.style.cursor = (canAdjust && (overMinus || overPlus || overMax || overConfirm)) || overCancel ? "pointer" : "default";
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
      this.upgradeMenuOpen ? "market.upgradesTitle" : this.seedMenuOpen ? "market.seedPacketsTitle" : this.baitMenuOpen ? "market.baitTitle" : this.produceMenuOpen ? "market.produceTitle" : this.fishMenuOpen ? "market.fishTitle" : this.mealMenuOpen ? "market.mealsTitle" : "market.title"
    ));
    if (this.upgradeMenuOpen) {
      this.updateUpgradeMenu();
      this.updateUpgradeStatuses();
    } else if (this.seedMenuOpen) {
      this.updateSeedPacketMenu();
    } else if (this.baitMenuOpen) {
      this.updateBaitMenu();
    } else if (this.produceMenuOpen) {
      this.updateProduceMenu();
    } else if (this.fishMenuOpen) {
      this.updateFishMenu();
    } else if (this.mealMenuOpen) {
      this.updateMealMenu();
    } else {
      this.actionTexts[0].setText(this.language.t("market.seedPackets"));
      this.actionTexts[1].setText(this.language.t("market.sellProduce"));
      this.actionTexts[2].setText(this.fishing.getHasRod() ? this.language.t("market.rodOwned") : this.language.t("market.rodShort"));
      this.actionTexts[3].setText(this.language.t("market.mealsShort"));
      this.actionTexts[4].setText(this.language.t("market.fishShort"));
      this.actionTexts[5].setText(this.language.t("market.baitShort"));
      this.actionTexts[6].setText(this.language.t("market.upgradesShort"));
      const icons = ["wheat_seed_bag_asset", "wheat_basket_asset", "fishing_rod_asset", "meal_fish_rice_asset", "fish_silver_barb_asset", "worm_bait_asset", "hoe_asset"];
      this.actionIcons.forEach((icon, index) => icon.setVisible(true).setTexture(icons[index]).setDisplaySize(22, 22));
      this.setActionStatus(0, "market.status.open", "info");
      this.setActionStatus(1, "market.status.open", "info");
      this.setActionStatus(2, this.fishing.getHasRod() ? "market.status.owned" : "market.status.price", this.fishing.getHasRod() ? "good" : "info", { amount: FISHING_ROD_COST });
      this.setActionStatus(3, "market.status.open", "info");
      this.setActionStatus(4, "market.status.open", "info");
      this.setActionStatus(5, "market.status.open", "info");
      this.setActionStatus(6, "market.status.open", "info");
    }
    this.updateSaleSelector();
    if (this.produceMenuOpen && !this.saleKind) {
      this.messageText.setText(this.language.t("market.wheatPriceInfo", {
        normal: NORMAL_WHEAT_PRICE + this.farming.getRiceSaleBonus(),
        golden: GOLDEN_WHEAT_PRICE
      }));
    }
    this.exitHintText.setText(this.language.t(this.touchMode ? "market.mobileExitHint" : "market.exitHint"));
    const desktopHintKey = this.upgradeMenuOpen ? "market.upgradesClickHint" : this.seedMenuOpen ? "market.seedPacketHint" : this.baitMenuOpen ? "market.baitHint" : this.produceMenuOpen ? "market.produceHint" : this.fishMenuOpen ? "market.fishHint" : "market.clickHint";
    const mobileHintKey = this.upgradeMenuOpen ? "market.mobileUpgradesClickHint" : this.seedMenuOpen ? "market.mobileSeedPacketHint" : this.baitMenuOpen ? "market.mobileBaitHint" : this.produceMenuOpen ? "market.mobileProduceHint" : this.fishMenuOpen ? "market.mobileFishHint" : "market.mobileClickHint";
    this.clickHintText.setText(this.language.t(this.touchMode ? mobileHintKey : desktopHintKey));
    this.stallLabel.setText(this.language.t("market.stallName"));
    this.promptText.setText(this.language.t(this.touchMode ? "market.mobilePrompt" : "market.prompt"));
    for (const text of [this.titleText, ...this.actionTexts, ...this.actionStatusBadges, this.moneyText, this.messageText, this.exitHintText, this.clickHintText, this.stallLabel, this.promptText]) text.setFontFamily(font);
    this.updateMoney();
  }

  private updateSeedPacketMenu(): void {
    const options = [
      { icon: "wheat_seed_bag_asset", cost: SEED_PACK_PRICES.seeds, label: this.language.t("market.riceSeedShort") },
      { icon: "tomato_seed_bag_asset", cost: SEED_PACK_PRICES.tomatoSeeds, label: this.language.t("inventory.tomatoSeeds") },
      { icon: "green_bean_seed_bag_asset", cost: SEED_PACK_PRICES.greenBeanSeeds, label: this.language.t("inventory.greenBeanSeeds") }
    ];
    options.forEach((option, index) => {
      this.actionIcons[index].setTexture(option.icon).setDisplaySize(22, 22);
      this.actionTexts[index].setText(option.label);
      this.setActionStatus(index, "market.status.packCost", "info", { amount: option.cost });
    });
    for (let index = 3; index < 6; index++) {
      this.actionIcons[index].setVisible(false);
      this.actionTexts[index].setText("");
      this.actionStatusBadges[index].setText("");
    }
    this.actionIcons[6].setVisible(true).setTexture("ui_icon_hand").setDisplaySize(22, 22);
    this.actionTexts[6].setText(this.language.t("market.back"));
    this.setActionStatus(6, "market.status.back", "muted");
  }
  private updateBaitMenu(): void {
    const options = [
      { icon: "worm_bait_asset", cost: BAIT_PRICES.wormBait, label: this.language.t("inventory.wormBait") },
      { icon: "shrimp_bait_asset", cost: BAIT_PRICES.shrimpBait, label: this.language.t("inventory.shrimpBait") },
      { icon: "golden_cricket_bait_asset", cost: BAIT_PRICES.goldenCricketBait, label: this.language.t("inventory.goldenCricketBait") }
    ];
    options.forEach((option, index) => {
      this.actionIcons[index].setVisible(true).setTexture(option.icon).setDisplaySize(23, 23);
      this.actionTexts[index].setText(option.label);
      this.setActionStatus(index, "market.status.unitCost", "info", { amount: option.cost });
    });
    for (let index = 3; index < 6; index++) {
      this.actionIcons[index].setVisible(false);
      this.actionTexts[index].setText("");
      this.actionStatusBadges[index].setText("");
    }
    this.actionIcons[6].setVisible(true).setTexture("ui_icon_hand").setDisplaySize(22, 22);
    this.actionTexts[6].setText(this.language.t("market.back"));
    this.setActionStatus(6, "market.status.back", "muted");
  }

  private updateProduceMenu(): void {
    const options: { icon: string; label: string; statusKey: string; values: Record<string, string | number> }[] = [
      {
        icon: "wheat_basket_asset",
        label: this.language.t("inventory.wheat"),
        statusKey: "market.status.open",
        values: {}
      },
      { icon: "tomato_basket_asset", label: this.language.t("inventory.tomatoes"), statusKey: "market.status.unitSell", values: { amount: CROP_SELL_PRICES.tomato } },
      { icon: "green_bean_basket_asset", label: this.language.t("inventory.greenBeans"), statusKey: "market.status.unitSell", values: { amount: CROP_SELL_PRICES.greenBean } }
    ];
    options.forEach((option, index) => {
      this.actionIcons[index].setVisible(true).setTexture(option.icon).setDisplaySize(22, 22);
      this.actionTexts[index].setText(option.label);
      this.setActionStatus(index, option.statusKey, "info", option.values);
    });
    for (let index = 3; index < 6; index++) {
      this.actionIcons[index].setVisible(false);
      this.actionTexts[index].setText("");
      this.actionStatusBadges[index].setText("");
    }
    this.actionIcons[6].setVisible(true).setTexture("ui_icon_hand").setDisplaySize(22, 22);
    this.actionTexts[6].setText(this.language.t("market.back"));
    this.setActionStatus(6, "market.status.back", "muted");
  }

  private updateFishMenu(): void {
    const options = [
      { id: "silverBarb" as const, icon: "fish_silver_barb_asset", price: FISH_SELL_PRICES.silverBarb },
      { id: "catfish" as const, icon: "fish_catfish_asset", price: FISH_SELL_PRICES.catfish },
      { id: "goldenCarp" as const, icon: "fish_golden_carp_asset", price: FISH_SELL_PRICES.goldenCarp }
    ];
    options.forEach((option, index) => {
      this.actionIcons[index].setVisible(true).setTexture(option.icon).setDisplaySize(24, 24);
      const fishName = this.language.t(`inventory.${option.id}`);
      this.actionTexts[index].setText(fishName);
      this.setActionStatus(index, "market.status.unitSell", "info", { amount: option.price });
    });
    for (let index = 3; index < 6; index++) {
      this.actionIcons[index].setVisible(false);
      this.actionTexts[index].setText("");
      this.actionStatusBadges[index].setText("");
    }
    this.actionIcons[6].setVisible(true).setTexture("ui_icon_hand").setDisplaySize(22, 22);
    this.actionTexts[6].setText(this.language.t("market.back"));
    this.setActionStatus(6, "market.status.back", "muted");
  }

  private updateMealMenu(): void {
    const options: { id: MealKind; icon: string; price: number }[] = [
      { id: "fishRice", icon: "meal_fish_rice_asset", price: 18 },
      { id: "mohinga", icon: "meal_mohinga_asset", price: 32 },
      { id: "fishCurry", icon: "meal_fish_curry_asset", price: 36 }
    ];
    options.forEach((option, index) => {
      this.actionIcons[index].setVisible(true).setTexture(option.icon).setDisplaySize(24, 24);
      this.actionTexts[index].setText(this.language.t(`cooking.recipe.${option.id}`));
      this.setActionStatus(index, "market.status.unitSell", "info", { amount: option.price });
    });
    for (let index = 3; index < 6; index++) {
      this.actionIcons[index].setVisible(false);
      this.actionTexts[index].setText("");
      this.actionStatusBadges[index].setText("");
    }
    this.actionIcons[6].setVisible(true).setTexture("ui_icon_hand").setDisplaySize(22, 22);
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
    const icons = ["hoe_asset", "watering_can_asset", "sickle_asset", "granary_asset", "rice_bowl_asset", "wheat_basket_asset", "ui_icon_hand"];
    this.actionIcons.forEach((icon, index) => icon.setTexture(icons[index]).setDisplaySize(22, 22));
    UPGRADE_ORDER.forEach((id, index) => {
      const definition = FARM_UPGRADE_DEFINITIONS[id];
      const level = this.farming.getUpgradeLevel(id);
      const name = this.language.t(definition.nameKey);
      const cost = this.farming.getNextUpgradeCost(id);
      const status = cost === null
        ? this.language.t("market.upgradeRowMaxed", { name })
        : definition.maxLevel === 1
          ? this.language.t("market.upgradeRowOneTime", { name })
          : this.language.t("market.upgradeRowLevel", { name, level, max: definition.maxLevel });
      this.actionTexts[index].setText(status);
    });
    this.actionTexts[5].setText(this.language.t("market.upgradesInspectHint"));
    this.actionTexts[6].setText(this.language.t("market.back"));
  }

  private inspectUpgrade(index: number): void {
    const id = UPGRADE_ORDER[index];
    if (!id) return;
    this.selectedUpgradeId = id;
    this.updateUpgradeDetail();
    this.upgradeDetailPanel.setVisible(true);
  }

  private inspectFishingRod(): void {
    this.selectedUpgradeId = null;
    this.selectedRodDetail = true;
    this.upgradeDetailTitle.setText(this.language.t("market.rodShort"));
    this.upgradeDetailDescription.setText(this.language.t("market.inspect.rod", { cost: FISHING_ROD_COST }));
    this.upgradeDetailInfo.setText(this.fishing.getHasRod()
      ? this.language.t("market.rodOwnedInfo")
      : this.language.t("market.rodCostInfo", { cost: FISHING_ROD_COST, coins: this.coins }));
    this.upgradeDetailButtons[0].setText(this.fishing.getHasRod()
      ? this.language.t("market.status.owned")
      : this.language.t("market.rodBuyDetail", { cost: FISHING_ROD_COST }));
    this.upgradeDetailButtons[1].setText(this.language.t("market.back"));
    const canBuy = !this.fishing.getHasRod() && this.coins >= FISHING_ROD_COST;
    this.upgradeDetailBuy.setFillStyle(canBuy ? 0x527044 : 0x65513a, 1).setAlpha(this.fishing.getHasRod() ? 0.75 : 1);
    this.upgradeDetailPanel.setVisible(true);
  }

  private updateUpgradeDetail(): void {
    if (!this.selectedUpgradeId) return;
    const definition = FARM_UPGRADE_DEFINITIONS[this.selectedUpgradeId];
    const level = this.farming.getUpgradeLevel(this.selectedUpgradeId);
    const cost = this.farming.getNextUpgradeCost(this.selectedUpgradeId);
    const font = this.language.getFontFamily();
    this.upgradeDetailTitle.setText(this.language.t(definition.nameKey));
    this.upgradeDetailDescription.setText(this.language.t(definition.descriptionKey));
    this.upgradeDetailInfo.setText(cost === null
      ? this.language.t("market.upgradeOwnedInfo", { level, max: definition.maxLevel })
      : this.language.t("market.upgradeInspectInfo", { level, max: definition.maxLevel, cost, coins: this.coins }));
    this.upgradeDetailButtons[0].setText(cost === null ? this.language.t("market.status.owned") : this.language.t("market.upgradeInspectBuy", { cost }));
    this.upgradeDetailButtons[1].setText(this.language.t("market.back"));
    const canBuy = cost !== null && this.coins >= cost;
    this.upgradeDetailBuy.setFillStyle(canBuy ? 0x527044 : 0x65513a, 1).setAlpha(cost === null ? 0.75 : 1);
    for (const text of [this.upgradeDetailTitle, this.upgradeDetailDescription, this.upgradeDetailInfo, ...this.upgradeDetailButtons]) text.setFontFamily(font);
  }

  private closeUpgradeDetail(): void {
    this.selectedUpgradeId = null;
    this.selectedRodDetail = false;
    this.upgradeDetailPanel?.setVisible(false);
  }

  private openSeedMenu(): void {
    this.seedMenuOpen = true;
    this.baitMenuOpen = false;
    this.produceMenuOpen = false;
    this.fishMenuOpen = false;
    this.upgradeMenuOpen = false;
    this.mealMenuOpen = false;
    this.closeUpgradeDetail();
    this.messageText.setText(this.language.t("market.seedPacketsTitle"));
    this.updateInterface();
  }

  private closeSeedMenu(): void {
    this.seedMenuOpen = false;
    this.messageText.setText(this.language.t("market.welcome"));
    this.updateInterface();
  }

  private openBaitMenu(): void {
    this.baitMenuOpen = true;
    this.seedMenuOpen = false;
    this.produceMenuOpen = false;
    this.fishMenuOpen = false;
    this.upgradeMenuOpen = false;
    this.mealMenuOpen = false;
    this.closeUpgradeDetail();
    this.messageText.setText(this.language.t("market.baitWelcome"));
    this.updateInterface();
  }

  private closeBaitMenu(): void {
    this.baitMenuOpen = false;
    this.messageText.setText(this.language.t("market.welcome"));
    this.updateInterface();
  }

  private openProduceMenu(): void {
    this.produceMenuOpen = true;
    this.seedMenuOpen = false;
    this.baitMenuOpen = false;
    this.fishMenuOpen = false;
    this.upgradeMenuOpen = false;
    this.mealMenuOpen = false;
    this.closeUpgradeDetail();
    this.messageText.setText(this.language.t("market.wheatPriceInfo", {
      normal: NORMAL_WHEAT_PRICE + this.farming.getRiceSaleBonus(),
      golden: GOLDEN_WHEAT_PRICE
    }));
    this.updateInterface();
  }

  private closeProduceMenu(): void {
    this.produceMenuOpen = false;
    this.messageText.setText(this.language.t("market.welcome"));
    this.updateInterface();
  }

  private openUpgradeMenu(): void {
    this.upgradeMenuOpen = true;
    this.seedMenuOpen = false;
    this.baitMenuOpen = false;
    this.produceMenuOpen = false;
    this.fishMenuOpen = false;
    this.mealMenuOpen = false;
    this.closeUpgradeDetail();
    this.messageText.setText(this.language.t("market.upgradesWelcome"));
    this.updateInterface();
  }

  private closeUpgradeMenu(): void {
    this.closeUpgradeDetail();
    this.upgradeMenuOpen = false;
    this.messageText.setText(this.language.t("market.welcome"));
    this.updateInterface();
  }

  private openFishMenu(): void {
    this.fishMenuOpen = true;
    this.seedMenuOpen = false;
    this.baitMenuOpen = false;
    this.produceMenuOpen = false;
    this.upgradeMenuOpen = false;
    this.mealMenuOpen = false;
    this.closeUpgradeDetail();
    this.messageText.setText(this.language.t("market.fishWelcome"));
    this.updateInterface();
  }

  private closeFishMenu(): void {
    this.fishMenuOpen = false;
    this.messageText.setText(this.language.t("market.welcome"));
    this.updateInterface();
  }

  private openMealMenu(): void {
    this.mealMenuOpen = true;
    this.seedMenuOpen = false;
    this.baitMenuOpen = false;
    this.produceMenuOpen = false;
    this.fishMenuOpen = false;
    this.upgradeMenuOpen = false;
    this.closeUpgradeDetail();
    this.messageText.setText(this.language.t("market.mealsWelcome"));
    this.updateInterface();
  }

  private closeMealMenu(): void {
    this.mealMenuOpen = false;
    this.messageText.setText(this.language.t("market.welcome"));
    this.updateInterface();
  }


  private purchaseUpgradeById(id: FarmUpgradeId): void {
    const definition = FARM_UPGRADE_DEFINITIONS[id];
    const level = this.farming.getUpgradeLevel(id);
    const cost = this.farming.getNextUpgradeCost(id);
    const name = this.language.t(definition.nameKey);
    if (cost === null) {
      this.messageText.setText(this.language.t("market.upgradeAlreadyOwned", { item: name }));
      this.updateUpgradeDetail();
      return;
    }
    if (this.coins < cost) {
      this.messageText.setText(this.language.t("market.upgradeNeedCoins", { cost, coins: this.coins }));
      this.updateUpgradeDetail();
      return;
    }
    this.coins -= cost;
    if (!this.farming.purchaseUpgrade(id)) {
      this.coins += cost;
      this.messageText.setText(this.language.t("market.upgradeAlreadyOwned", { item: name }));
      this.updateUpgradeDetail();
      return;
    }
    this.scene.events.emit("sound-effect", { name: "buy", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.upgradeBought", { item: name, level: level + 1 }));
    this.closeUpgradeDetail();
    this.updateInterface();
  }

  private updateMoney(): void {
    this.moneyText.setText(this.language.t("market.balance", { coins: this.coins }));
  }

  private openMarket(): void {
    this.isOpen = true;
    this.seedMenuOpen = false;
    this.baitMenuOpen = false;
    this.produceMenuOpen = false;
    this.fishMenuOpen = false;
    this.mealMenuOpen = false;
    this.upgradeMenuOpen = false;
    this.closeUpgradeDetail();
    this.ui.open("market");
    this.messageText.setText(this.language.t("market.welcome"));
    this.updateInterface();
    this.promptText.setVisible(false);
  }

  private closeMarket = (): void => {
    this.closeSaleSelector();
    this.closeUpgradeDetail();
    this.seedMenuOpen = false;
    this.baitMenuOpen = false;
    this.produceMenuOpen = false;
    this.fishMenuOpen = false;
    this.mealMenuOpen = false;
    this.upgradeMenuOpen = false;
    this.isOpen = false;
    this.ui.close("market");
    this.interactKey.reset();
  };

  private buySeeds(requestedPacks: number): void {
    const packCost = SEED_PACK_PRICES.seeds;
    const packs = Math.min(maximumQuantity(requestedPacks), Math.floor(this.coins / packCost));
    if (packs <= 0) { this.messageText.setText(this.language.t("market.notEnough")); return; }
    const totalSeeds = packs * 5;
    const totalCost = packs * packCost;
    this.coins -= totalCost;
    this.farming.addSeeds(totalSeeds);
    this.scene.events.emit("sound-effect", { name: "buy", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.bought", { seeds: totalSeeds, coins: totalCost }));
    this.updateInterface();
  }

  private buyCropSeeds(kind: "tomato" | "greenBean", requestedPacks: number): void {
    const packCost = kind === "tomato" ? SEED_PACK_PRICES.tomatoSeeds : SEED_PACK_PRICES.greenBeanSeeds;
    const packs = Math.min(maximumQuantity(requestedPacks), Math.floor(this.coins / packCost));
    if (packs <= 0) { this.messageText.setText(this.language.t("market.notEnough")); return; }
    const amount = packs * 5;
    const cost = packs * packCost;
    this.coins -= cost;
    this.farming.addCropSeeds(kind, amount);
    this.scene.events.emit("sound-effect", { name: "buy", x: this.marketX, y: this.marketY, maxDistance: 185 });
    const crop = this.language.t(kind === "tomato" ? "inventory.tomatoes" : "inventory.greenBeans");
    this.messageText.setText(this.language.t("market.seedPacketBought", { amount, crop, coins: cost }));
    this.updateInterface();
  }

  private sellWheat(requested: number): void {
    let remaining = Math.min(maximumQuantity(requested), this.farming.getRice() + this.farming.getGoldenWheat());
    if (remaining <= 0) { this.messageText.setText(this.language.t("market.noWheat")); return; }

    const regularAmount = Math.min(remaining, this.farming.getRice());
    if (regularAmount > 0 && !this.farming.removeRice(regularAmount)) {
      this.messageText.setText(this.language.t("market.noWheat"));
      return;
    }
    remaining -= regularAmount;
    const goldenAmount = Math.min(remaining, this.farming.getGoldenWheat());
    if (goldenAmount > 0 && !this.farming.removeGoldenWheat(goldenAmount)) {
      if (regularAmount > 0) this.farming.addRice(regularAmount);
      this.messageText.setText(this.language.t("market.noWheat"));
      return;
    }

    const regularPrice = NORMAL_WHEAT_PRICE + this.farming.getRiceSaleBonus();
    const earnings = regularAmount * regularPrice + goldenAmount * GOLDEN_WHEAT_PRICE;
    this.coins += earnings;
    this.scene.events.emit("sound-effect", { name: "sell", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.wheatSold", {
      regular: regularAmount, golden: goldenAmount, coins: earnings
    }));
    this.updateInterface();
  }

  private buyFishingBait(kind: "wormBait" | "shrimpBait" | "goldenCricketBait", requested: number): void {
    const cost = BAIT_PRICES[kind];
    const amount = Math.min(maximumQuantity(requested), Math.floor(this.coins / cost));
    if (amount <= 0) {
      this.messageText.setText(this.language.t("market.notEnough"));
      return;
    }
    const baitKind = kind === "wormBait" ? "worm" : kind === "shrimpBait" ? "shrimp" : "goldenCricket";
    this.coins -= amount * cost;
    this.fishing.addBait(baitKind, amount);
    this.scene.events.emit("sound-effect", { name: "buy", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.baitBought", {
      amount,
      bait: this.language.t(kind === "wormBait" ? "inventory.wormBait" : kind === "shrimpBait" ? "inventory.shrimpBait" : "inventory.goldenCricketBait"),
      coins: amount * cost
    }));
    this.updateInterface();
  }

  private purchaseFishingRod(): void {
    if (this.fishing.getHasRod()) {
      this.messageText.setText(this.language.t("market.rodOwned"));
      return;
    }
    if (this.coins < FISHING_ROD_COST) {
      this.messageText.setText(this.language.t("market.notEnough"));
      return;
    }
    this.coins -= FISHING_ROD_COST;
    this.fishing.grantFishingRod();
    this.scene.events.emit("sound-effect", { name: "buy", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.rodPurchased"));
    this.closeUpgradeDetail();
    this.updateInterface();
  }

  private sellMeal(kind: MealKind, requested: number): void {
    const amount = Math.min(maximumQuantity(requested), this.cooking.getMealCounts()[kind]);
    if (amount <= 0 || !this.cooking.removeMeals(kind, amount)) {
      this.messageText.setText(this.language.t("market.noMeals"));
      return;
    }
    const prices: Record<MealKind, number> = { fishRice: 18, mohinga: 32, fishCurry: 36 };
    const earnings = amount * prices[kind];
    this.coins += earnings;
    this.scene.events.emit("sound-effect", { name: "sell", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.mealTypeSold", {
      amount,
      meal: this.language.t(`cooking.recipe.${kind}`),
      coins: earnings
    }));
    this.updateInterface();
  }

  private sellFish(kind: FishKind, requested: number): void {
    const amount = Math.min(maximumQuantity(requested), this.fishing.getFishCount(kind));
    if (amount <= 0 || !this.fishing.removeFish(kind, amount)) {
      this.messageText.setText(this.language.t(kind === "silverBarb" ? "market.noFishSilverBarb" : kind === "catfish" ? "market.noFishCatfish" : "market.noFishGoldenCarp"));
      return;
    }
    const earnings = amount * FISH_SELL_PRICES[kind];
    this.coins += earnings;
    this.scene.events.emit("sound-effect", { name: "sell", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.fishTypeSold", {
      amount,
      fish: this.language.t(`inventory.${kind}`),
      coins: earnings
    }));
    this.updateInterface();
  }

  private sellCrop(kind: "tomato" | "greenBean", requested: number): void {
    const amount = Math.min(maximumQuantity(requested), this.farming.getCropCount(kind));
    if (amount <= 0 || !this.farming.removeCrop(kind, amount)) {
      this.messageText.setText(this.language.t(kind === "tomato" ? "market.noTomatoes" : "market.noGreenBeans"));
      return;
    }
    const price = CROP_SELL_PRICES[kind];
    const earnings = amount * price;
    this.coins += earnings;
    this.scene.events.emit("sound-effect", { name: "sell", x: this.marketX, y: this.marketY, maxDistance: 185 });
    this.messageText.setText(this.language.t("market.cropSold", {
      amount,
      crop: this.language.t(kind === "tomato" ? "inventory.tomatoes" : "inventory.greenBeans"),
      coins: earnings
    }));
    this.updateInterface();
  }


  private performAction(index: number): void {
    if (this.upgradeMenuOpen) {
      if (index < UPGRADE_ORDER.length) this.inspectUpgrade(index);
      else if (index === 6) this.closeUpgradeMenu();
      return;
    }
    if (this.mealMenuOpen) {
      if (index === 0) this.beginSale("fishRice");
      else if (index === 1) this.beginSale("mohinga");
      else if (index === 2) this.beginSale("fishCurry");
      else if (index === 6) this.closeMealMenu();
      return;
    }
    if (this.fishMenuOpen) {
      if (index === 0) this.beginSale("silverBarb");
      else if (index === 1) this.beginSale("catfish");
      else if (index === 2) this.beginSale("goldenCarp");
      else if (index === 6) this.closeFishMenu();
      return;
    }
    if (this.seedMenuOpen) {
      if (index === 0) this.beginSale("seeds");
      else if (index === 1) this.beginSale("tomatoSeeds");
      else if (index === 2) this.beginSale("greenBeanSeeds");
      else if (index === 6) this.closeSeedMenu();
      return;
    }
    if (this.baitMenuOpen) {
      if (index === 0) this.beginSale("wormBait");
      else if (index === 1) this.beginSale("shrimpBait");
      else if (index === 2) this.beginSale("goldenCricketBait");
      else if (index === 6) this.closeBaitMenu();
      return;
    }
    if (this.produceMenuOpen) {
      if (index === 0) this.beginSale("wheat");
      else if (index === 1) this.beginSale("tomatoes");
      else if (index === 2) this.beginSale("greenBeans");
      else if (index === 6) this.closeProduceMenu();
      return;
    }
    switch (index) {
      case 0: this.openSeedMenu(); break;
      case 1: this.openProduceMenu(); break;
      case 2: this.inspectFishingRod(); break;
      case 3: this.openMealMenu(); break;
      case 4: this.openFishMenu(); break;
      case 5: this.openBaitMenu(); break;
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
    this.lastPlayerX = playerX;
    this.lastPlayerY = playerY;
    if (this.isOpen) {
      if (this.selectedUpgradeId || this.selectedRodDetail) {
        if (Phaser.Input.Keyboard.JustDown(this.buyKey)) {
          if (this.selectedUpgradeId) this.purchaseUpgradeById(this.selectedUpgradeId);
          else this.purchaseFishingRod();
        }
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.closeUpgradeDetail();
        return;
      }
      if (!this.saleKind) {
        if (this.upgradeMenuOpen) {
          if (Phaser.Input.Keyboard.JustDown(this.buyKey)) this.inspectUpgrade(0);
          if (Phaser.Input.Keyboard.JustDown(this.sellKey)) this.inspectUpgrade(1);
          if (Phaser.Input.Keyboard.JustDown(this.rodKey)) this.inspectUpgrade(2);
          if (Phaser.Input.Keyboard.JustDown(this.mealSellKey)) this.inspectUpgrade(3);
          if (Phaser.Input.Keyboard.JustDown(this.fishSellKey)) this.inspectUpgrade(4);
          if (Phaser.Input.Keyboard.JustDown(this.upgradesKey)) this.closeUpgradeMenu();
        } else if (this.mealMenuOpen) {
          if (Phaser.Input.Keyboard.JustDown(this.buyKey)) this.beginSale("fishRice");
          if (Phaser.Input.Keyboard.JustDown(this.sellKey)) this.beginSale("mohinga");
          if (Phaser.Input.Keyboard.JustDown(this.rodKey)) this.beginSale("fishCurry");
          if (Phaser.Input.Keyboard.JustDown(this.upgradesKey)) this.closeMealMenu();
        } else if (this.fishMenuOpen) {
          if (Phaser.Input.Keyboard.JustDown(this.buyKey)) this.beginSale("silverBarb");
          if (Phaser.Input.Keyboard.JustDown(this.sellKey)) this.beginSale("catfish");
          if (Phaser.Input.Keyboard.JustDown(this.rodKey)) this.beginSale("goldenCarp");
          if (Phaser.Input.Keyboard.JustDown(this.upgradesKey)) this.closeFishMenu();
        } else if (this.seedMenuOpen) {
          if (Phaser.Input.Keyboard.JustDown(this.buyKey)) this.beginSale("seeds");
          if (Phaser.Input.Keyboard.JustDown(this.sellKey)) this.beginSale("tomatoSeeds");
          if (Phaser.Input.Keyboard.JustDown(this.rodKey)) this.beginSale("greenBeanSeeds");
          if (Phaser.Input.Keyboard.JustDown(this.upgradesKey)) this.closeSeedMenu();
        } else if (this.baitMenuOpen) {
          if (Phaser.Input.Keyboard.JustDown(this.buyKey)) this.beginSale("wormBait");
          if (Phaser.Input.Keyboard.JustDown(this.sellKey)) this.beginSale("shrimpBait");
          if (Phaser.Input.Keyboard.JustDown(this.rodKey)) this.beginSale("goldenCricketBait");
          if (Phaser.Input.Keyboard.JustDown(this.upgradesKey)) this.closeBaitMenu();
        } else if (this.produceMenuOpen) {
          if (Phaser.Input.Keyboard.JustDown(this.buyKey)) this.beginSale("wheat");
          if (Phaser.Input.Keyboard.JustDown(this.sellKey)) this.beginSale("tomatoes");
          if (Phaser.Input.Keyboard.JustDown(this.rodKey)) this.beginSale("greenBeans");
          if (Phaser.Input.Keyboard.JustDown(this.upgradesKey)) this.closeProduceMenu();
        } else {
          if (Phaser.Input.Keyboard.JustDown(this.buyKey)) this.openSeedMenu();
          if (Phaser.Input.Keyboard.JustDown(this.sellKey)) this.openProduceMenu();
          if (Phaser.Input.Keyboard.JustDown(this.rodKey)) this.inspectFishingRod();
          if (Phaser.Input.Keyboard.JustDown(this.mealSellKey)) this.openMealMenu();
          if (Phaser.Input.Keyboard.JustDown(this.fishSellKey)) this.openFishMenu();
          if (Phaser.Input.Keyboard.JustDown(this.menuSixKey)) this.openBaitMenu();
          if (Phaser.Input.Keyboard.JustDown(this.upgradesKey)) this.openUpgradeMenu();
        }
      }
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        if (this.saleKind) this.closeSaleSelector();
        else if (this.selectedRodDetail || this.selectedUpgradeId) this.closeUpgradeDetail();
        else if (this.upgradeMenuOpen) this.closeUpgradeMenu();
        else if (this.seedMenuOpen) this.closeSeedMenu();
        else if (this.baitMenuOpen) this.closeBaitMenu();
        else if (this.produceMenuOpen) this.closeProduceMenu();
        else if (this.fishMenuOpen) this.closeFishMenu();
        else if (this.mealMenuOpen) this.closeMealMenu();
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
