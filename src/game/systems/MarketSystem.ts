
import Phaser from "phaser";
import { FarmingSystem } from "./FarmingSystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";

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
  private instructionsText!: Phaser.GameObjects.Text;
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
      .setDisplaySize(142, 114)
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

    const background = this.scene.add.rectangle(
      320, 180, 480, 260, 0x34271d, 0.99
    );
    background.setStrokeStyle(3, 0xd6b36b);

    const border = this.scene.add.graphics();
    border.lineStyle(2, 0x79382e, 1);
    border.strokeRect(80, 50, 480, 260);

    this.titleText = this.scene.add.text(320, 70, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "18px",
      color: "#e6c47e"
    }).setOrigin(0.5);

    const stallImage = this.scene.add.image(320, 125, "market_stall_asset")
      .setDisplaySize(104, 78);

    this.instructionsText = this.scene.add.text(320, 188, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#f5e8c6",
      align: "center",
      lineSpacing: 9,
      wordWrap: { width: 420 }
    }).setOrigin(0.5);

    const coinIcon = this.scene.add.image(155, 250, "coin_asset")
      .setDisplaySize(25, 25);

    this.moneyText = this.scene.add.text(320, 250, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "12px",
      color: "#f0d69e"
    }).setOrigin(0.5);

    this.messageText = this.scene.add.text(320, 278, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#d7e6c5",
      align: "center",
      wordWrap: { width: 420 }
    }).setOrigin(0.5);

    this.closeText = this.scene.add.text(320, 300, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#e6c47e"
    }).setOrigin(0.5);

    this.marketPanel.add([
      background,
      border,
      this.titleText,
      stallImage,
      this.instructionsText,
      coinIcon,
      this.moneyText,
      this.messageText,
      this.closeText
    ]);

    this.updateInterface();
  }

  private updateInterface(): void {
    const font = this.language.getFontFamily();

    this.titleText.setText(this.language.t("market.title"));
    this.instructionsText.setText(
      `${this.language.t("market.buy")}\n\n${this.language.t("market.sell")}`
    );
    this.closeText.setText(this.language.t("market.close"));
    this.stallLabel.setText(this.language.t("market.stallName"));
    this.promptText.setText(this.language.t("market.prompt"));

    for (const text of [
      this.titleText,
      this.instructionsText,
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
