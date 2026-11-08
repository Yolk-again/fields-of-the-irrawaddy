
import Phaser from "phaser";
import { FarmingSystem } from "./FarmingSystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { pixelPanel } from "../ui/PixelUI";

export class MarketSystem {
  private scene: Phaser.Scene;
  private farming: FarmingSystem;
  private ui: ModalUIManager;
  private language: LanguageSystem;

  private coins = 20;
  private isOpen = false;
  private marketX = 570;
  private marketY = 250;

  private interactKey!: Phaser.Input.Keyboard.Key;
  private buyKey!: Phaser.Input.Keyboard.Key;
  private sellKey!: Phaser.Input.Keyboard.Key;
  private escapeKey!: Phaser.Input.Keyboard.Key;

  private marketPanel!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private buyText!: Phaser.GameObjects.Text;
  private sellText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private closeText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private stallLabel!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    farming: FarmingSystem,
    ui: ModalUIManager,
    language: LanguageSystem
  ) {
    this.scene = scene;
    this.farming = farming;
    this.ui = ui;
    this.language = language;

    this.createMarketStall();
    this.createControls();
    this.createInterface();

    this.ui.registerPanel("market", this.marketPanel, 220, () => {
      this.isOpen = false;
      this.interactKey.reset();
      this.escapeKey.reset();
    });

    this.ui.registerHud(this.promptText);
    this.language.onChange(() => this.updateInterface());
  }

  private createMarketStall(): void {
    this.scene.add.image(this.marketX, 260, "market_stall_asset")
      .setOrigin(0.5, 1)
      .setScale(2)
      .setDepth(260);

    this.stallLabel = this.scene.add.text(
      this.marketX,
      135,
      this.language.t("market.stallName"),
      {
        fontFamily: this.language.getFontFamily(),
        fontSize: "10px",
        color: "#fff3d3",
        backgroundColor: "#34271d",
        padding: { x: 5, y: 3 }
      }
    ).setOrigin(0.5).setDepth(261);

    this.promptText = this.scene.add.text(
      this.marketX,
      282,
      this.language.t("market.prompt"),
      {
        fontFamily: this.language.getFontFamily(),
        fontSize: "10px",
        color: "#fff1b8",
        backgroundColor: "#34271d",
        padding: { x: 5, y: 4 }
      }
    ).setOrigin(0.5).setDepth(262).setVisible(false);
  }

  private createControls(): void {
    const keyboard = this.scene.input.keyboard!;
    this.interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.buyKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.sellKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.escapeKey = keyboard.addKey(27);

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
    this.marketPanel = this.scene.add.container(0, 0);
    this.marketPanel.setScrollFactor(0);

    const background = pixelPanel(this.scene, 320, 180, 500, 286, { fill: 0x2d3829, alpha: 1 });

    const divider = this.scene.add.rectangle(320, 83, 450, 2, 0x9b7047, 0.8);

    this.titleText = this.scene.add.text(320, 55, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "18px",
      color: "#e6c47e",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const stallImage = this.scene.add.image(320, 119, "market_stall_asset")
      .setScale(1);

    const buyCard = this.scene.add.rectangle(320, 169, 420, 34, 0x40513a, 1);
    buyCard.setStrokeStyle(1, 0xa0ad78);
    buyCard.setInteractive({ useHandCursor: true });
    buyCard.on("pointerdown", () => this.buySeeds());
    buyCard.on("pointerover", () => buyCard.setFillStyle(0x58734b, 1));
    buyCard.on("pointerout", () => buyCard.setFillStyle(0x40513a, 1));

    this.buyText = this.scene.add.text(320, 169, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#fff1cf",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: 390 }
    }).setOrigin(0.5);

    const sellCard = this.scene.add.rectangle(320, 210, 420, 34, 0x493629, 1);
    sellCard.setStrokeStyle(1, 0x9b7047);
    sellCard.setInteractive({ useHandCursor: true });
    sellCard.on("pointerdown", () => this.sellRice());
    sellCard.on("pointerover", () => sellCard.setFillStyle(0x704638, 1));
    sellCard.on("pointerout", () => sellCard.setFillStyle(0x493629, 1));

    this.sellText = this.scene.add.text(320, 210, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#fff1cf",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: 390 }
    }).setOrigin(0.5);

    const coinIcon = this.scene.add.image(150, 252, "coin_asset").setScale(2);

    this.moneyText = this.scene.add.text(320, 252, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#f0d69e"
    }).setOrigin(0.5);

    this.messageText = this.scene.add.text(320, 278, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#d7e6c5",
      align: "center",
      wordWrap: { width: 420 }
    }).setOrigin(0.5);

    const closeBackground = this.scene.add.rectangle(320, 309, 145, 23, 0x79382e, 1);
    closeBackground.setStrokeStyle(1, 0xd6b36b);
    closeBackground.setInteractive({ useHandCursor: true });
    closeBackground.on("pointerdown", this.closeMarket);

    this.closeText = this.scene.add.text(320, 309, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#fff1cf",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.marketPanel.add([
      background,
      divider,
      this.titleText,
      stallImage,
      buyCard,
      this.buyText,
      sellCard,
      this.sellText,
      coinIcon,
      this.moneyText,
      this.messageText,
      closeBackground,
      this.closeText
    ]);

    this.updateInterface();
  }

  private updateInterface(): void {
    const font = this.language.getFontFamily();

    this.titleText.setText(this.language.t("market.title"));
    this.buyText.setText(this.language.t("market.buy"));
    this.sellText.setText(this.language.t("market.sell"));
    this.closeText.setText(this.language.t("market.close"));
    this.stallLabel.setText(this.language.t("market.stallName"));
    this.promptText.setText(this.language.t("market.prompt"));

    for (const text of [
      this.titleText,
      this.buyText,
      this.sellText,
      this.moneyText,
      this.messageText,
      this.closeText,
      this.stallLabel,
      this.promptText
    ]) {
      text.setFontFamily(font);
    }

    this.updateMoney();
  }

  private updateMoney(): void {
    const text = this.language.getLanguage() === "my"
      ? `ဒင်္ဂါး: ${this.coins}   မျိုးစေ့: ${this.farming.getSeeds()}   စပါး: ${this.farming.getRice()}`
      : `COINS: ${this.coins}   SEEDS: ${this.farming.getSeeds()}   RICE: ${this.farming.getRice()}`;

    this.moneyText.setText(text);
  }

  private openMarket(): void {
    this.isOpen = true;
    this.ui.open("market");
    this.messageText.setText(this.language.t("market.welcome"));
    this.updateMoney();
    this.promptText.setVisible(false);
  }

  private closeMarket = (): void => {
    this.isOpen = false;
    this.ui.close("market");
    this.interactKey.reset();
    this.escapeKey.reset();
  };

  private buySeeds(): void {
    if (this.coins < 10) {
      this.messageText.setText(this.language.t("market.notEnough"));
      return;
    }

    this.coins -= 10;
    this.farming.addSeeds(5);
    this.messageText.setText(this.language.t("market.bought"));
    this.updateMoney();
  }

  private sellRice(): void {
    const rice = this.farming.getRice();
    if (rice <= 0) {
      this.messageText.setText(this.language.t("market.noRice"));
      return;
    }

    const earnings = rice * 5;
    if (!this.farming.removeRice(rice)) {
      return;
    }

    this.coins += earnings;
    this.messageText.setText(
      this.language.t("market.sold", { rice, coins: earnings })
    );
    this.updateMoney();
  }

  getSaveData(): { coins: number } {
    return { coins: this.coins };
  }

  loadSaveData(data: { coins: number }): void {
    this.coins = Math.max(0, Math.floor(Number(data.coins) || 0));
    this.updateMoney();
  }

  mobileInteract(playerX: number, playerY: number): boolean {
    if (this.isOpen) {
      this.closeMarket();
      return true;
    }

    if (this.ui.hasActiveModal()) return false;
    const distance = Phaser.Math.Distance.Between(
      playerX,
      playerY,
      this.marketX,
      this.marketY
    );

    if (distance < 90) {
      this.openMarket();
      return true;
    }

    return false;
  }

  update(playerX: number, playerY: number): void {
    if (this.isOpen) {
      if (Phaser.Input.Keyboard.JustDown(this.buyKey)) this.buySeeds();
      if (Phaser.Input.Keyboard.JustDown(this.sellKey)) this.sellRice();
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.closeMarket();
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      playerX,
      playerY,
      this.marketX,
      this.marketY
    );

    const nearMarket = distance < 90;
    this.promptText.setVisible(nearMarket);

    if (nearMarket && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.openMarket();
    }
  }
}
