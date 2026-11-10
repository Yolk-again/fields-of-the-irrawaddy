import Phaser from "phaser";
import { FarmingSystem } from "./FarmingSystem";
import { FishingSystem } from "./FishingSystem";
import { CookingSystem } from "./CookingSystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, modalPanel } from "../ui/PixelUI";

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
    this.promptText = this.scene.add.text(this.marketX, 282, this.language.t("market.prompt"), {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#fff1b8",
      backgroundColor: "#34271d", padding: { x: 5, y: 4 }
    }).setOrigin(0.5).setDepth(262).setVisible(false);
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
      this.closeMarket();
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
    this.updateInterface();
  }

  /** Screen-space hit boxes intentionally match the rendered action cards. */
  private handleMarketPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("market")) return;
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
    this.isOpen = false;
    this.ui.close("market");
    this.interactKey.reset();
    this.escapeKey.reset();
  };

  private buySeeds(): void {
    if (this.coins < 10) { this.messageText.setText(this.language.t("market.notEnough")); return; }
    this.coins -= 10;
    this.farming.addSeeds(5);
    this.scene.events.emit("sound-effect", "buy");
    this.messageText.setText(this.language.t("market.bought"));
    this.updateInterface();
  }

  private sellRice(): void {
    const rice = this.farming.getRice();
    if (rice <= 0) { this.messageText.setText(this.language.t("market.noRice")); return; }
    const earnings = rice * 5;
    if (!this.farming.removeRice(rice)) return;
    this.coins += earnings;
    this.scene.events.emit("sound-effect", "sell");
    this.messageText.setText(this.language.t("market.sold", { rice, coins: earnings }));
    this.updateInterface();
  }

  private buyFishingRod(): void {
    if (this.fishing.getHasRod()) { this.messageText.setText(this.language.t("market.rodOwned")); return; }
    const price = 35;
    if (this.coins < price) { this.messageText.setText(this.language.t("market.notEnough")); return; }
    this.coins -= price;
    this.fishing.grantFishingRod();
    this.scene.events.emit("sound-effect", "buy");
    this.messageText.setText(this.language.t("market.rodPurchased"));
    this.updateInterface();
  }

  private sellMeals(): void {
    const count = this.cooking.getTotalMeals();
    if (count <= 0) { this.messageText.setText(this.language.t("market.noMeals")); return; }
    const earnings = this.cooking.sellAllMeals();
    this.coins += earnings;
    this.scene.events.emit("sound-effect", "sell");
    this.messageText.setText(this.language.t("market.mealsSold", { meals: count, coins: earnings }));
    this.updateInterface();
  }

  private sellFish(): void {
    const counts = this.fishing.getFishCounts();
    const total = this.fishing.getFishTotal();
    if (total <= 0) { this.messageText.setText(this.language.t("market.noFish")); return; }
    // Keep raw fish less valuable than finished dishes, so cooking remains worthwhile.
    const earnings = counts.silverBarb * 4 + counts.catfish * 6 + counts.goldenCarp * 8;
    for (const [kind, amount] of Object.entries(counts) as [keyof typeof counts, number][]) {
      if (amount > 0) this.fishing.removeFish(kind, amount);
    }
    this.coins += earnings;
    this.scene.events.emit("sound-effect", "sell");
    this.messageText.setText(this.language.t("market.fishSold", { fish: total, coins: earnings }));
    this.updateInterface();
  }

  private performAction(index: number): void {
    switch (index) {
      case 0: this.buySeeds(); break;
      case 1: this.sellRice(); break;
      case 2: this.buyFishingRod(); break;
      case 3: this.sellMeals(); break;
      case 4: this.sellFish(); break;
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
      if (Phaser.Input.Keyboard.JustDown(this.buyKey)) this.buySeeds();
      if (Phaser.Input.Keyboard.JustDown(this.sellKey)) this.sellRice();
      if (Phaser.Input.Keyboard.JustDown(this.rodKey)) this.buyFishingRod();
      if (Phaser.Input.Keyboard.JustDown(this.mealSellKey)) this.sellMeals();
      if (Phaser.Input.Keyboard.JustDown(this.fishSellKey)) this.sellFish();
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.closeMarket();
      return;
    }
    const distance = Phaser.Math.Distance.Between(playerX, playerY, this.marketX, this.marketY);
    const nearMarket = distance < 90;
    this.stallLabel.setAlpha(distance < 190 ? 1 : 0);
    this.promptText.setVisible(nearMarket);
    if (nearMarket && Phaser.Input.Keyboard.JustDown(this.interactKey)) this.openMarket();
  }
}
