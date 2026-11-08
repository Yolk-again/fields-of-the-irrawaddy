import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { pixelPanel } from "../ui/PixelUI";

export class HelpSystem {
  private scene: Phaser.Scene;
  private ui: ModalUIManager;
  private language: LanguageSystem;
  private helpKey!: Phaser.Input.Keyboard.Key;
  private isOpen = false;
  private panel!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private closeText!: Phaser.GameObjects.Text;
  private cardTexts: { title: Phaser.GameObjects.Text; body: Phaser.GameObjects.Text; titleKey: string; bodyKey: string }[] = [];

  constructor(scene: Phaser.Scene, ui: ModalUIManager, language: LanguageSystem) {
    this.scene = scene;
    this.ui = ui;
    this.language = language;
    this.helpKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.createInterface();
    this.ui.registerPanel("help", this.panel, 400, () => {
      this.isOpen = false;
      this.helpKey.reset();
    });
    this.language.onChange(() => this.updateInterface());
  }

  private createCard(x: number, y: number, titleKey: string, bodyKey: string, width: number, height: number): void {
    const background = this.scene.add.rectangle(x, y, width, height, 0x40513a, 0.98);
    background.setStrokeStyle(1, 0x9b7047);

    const title = this.scene.add.text(x, y - height / 2 + 16, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#e6c47e",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const body = this.scene.add.text(x, y - height / 2 + 34, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "8px",
      color: "#f5e8c6",
      align: "center",
      lineSpacing: 4,
      wordWrap: { width: width - 20 }
    }).setOrigin(0.5, 0);

    this.panel.add([background, title, body]);
    this.cardTexts.push({ title, body, titleKey, bodyKey });
  }

  private createInterface(): void {
    this.panel = this.scene.add.container(0, 0).setScrollFactor(0);

    const background = pixelPanel(this.scene, 320, 180, 550, 310, { fill: 0x2d3829, alpha: 1 });

    const topLine = this.scene.add.rectangle(320, 91, 490, 2, 0x9b7047, 0.8);

    this.titleText = this.scene.add.text(320, 48, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "18px",
      color: "#e6c47e",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.subtitleText = this.scene.add.text(320, 72, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "8px",
      color: "#d7e6c5",
      align: "center"
    }).setOrigin(0.5);

    this.panel.add([background, topLine, this.titleText, this.subtitleText]);
    this.createCard(190, 151, "help.moveTitle", "help.moveBody", 245, 112);
    this.createCard(450, 151, "help.villageTitle", "help.villageBody", 245, 112);
    this.createCard(320, 257, "help.farmTitle", "help.farmBody", 505, 76);

    const closeBackground = this.scene.add.rectangle(320, 319, 130, 24, 0x79382e, 1);
    closeBackground.setStrokeStyle(1, 0xd6b36b);
    closeBackground.setInteractive({ useHandCursor: true });
    closeBackground.on("pointerdown", this.close);

    this.closeText = this.scene.add.text(320, 319, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#fff1cf",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.panel.add([closeBackground, this.closeText]);

    this.updateInterface();
  }

  private updateInterface(): void {
    const font = this.language.getFontFamily();
    this.titleText.setText(this.language.t("help.title"));
    this.subtitleText.setText(this.language.t("help.subtitle"));
    this.closeText.setText(this.language.t("help.close"));

    for (const text of [this.titleText, this.subtitleText, this.closeText]) {
      text.setFontFamily(font);
    }

    for (const card of this.cardTexts) {
      card.title.setText(this.language.t(card.titleKey));
      card.body.setText(this.language.t(card.bodyKey));
      card.title.setFontFamily(font);
      card.body.setFontFamily(font);
    }
  }

  private open(): void {
    if (this.ui.hasActiveModal()) return;
    this.isOpen = true;
    this.updateInterface();
    this.ui.open("help");
  }

  private close = (): void => {
    this.isOpen = false;
    this.ui.close("help");
    this.helpKey.reset();
  };

  mobileToggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.helpKey)) {
      if (this.isOpen) this.close();
      else this.open();
    }
  }
}
