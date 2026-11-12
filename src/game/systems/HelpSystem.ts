import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, modalPanel } from "../ui/PixelUI";

interface HelpCard {
  title: Phaser.GameObjects.Text;
  body: Phaser.GameObjects.Text;
  titleKey: string;
  bodyKey: string;
  mobileTitleKey: string;
  mobileBodyKey: string;
}

/** Compact illustrated guide for movement, farming, fishing and cooking. */
export class HelpSystem {
  private ui: ModalUIManager;
  private language: LanguageSystem;
  private readonly mobileMode: boolean;
  private isOpen = false;
  private panel!: Phaser.GameObjects.Container;
  private closeButton!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private exitHintText!: Phaser.GameObjects.Text;
  private cardTexts: HelpCard[] = [];

  constructor(scene: Phaser.Scene, ui: ModalUIManager, language: LanguageSystem, mobileMode = false) {
    this.ui = ui;
    this.language = language;
    this.mobileMode = mobileMode;
    this.createInterface(scene);
    this.ui.registerPanel("help", this.panel, 400, () => { this.isOpen = false; }, this.closeButton);
    this.language.onChange(() => this.updateInterface());
  }

  private createCard(
    scene: Phaser.Scene,
    x: number,
    y: number,
    iconKey: string,
    titleKey: string,
    bodyKey: string,
    mobileTitleKey: string,
    mobileBodyKey: string,
    mobileIconKey: string
  ): void {
    const width = 160;
    const height = 76;
    const background = scene.add.rectangle(x, y, width, height, 0x40513a, 1).setStrokeStyle(2, 0x9b7047);
    const iconFrame = scene.add.rectangle(x - 56, y, 34, 34, 0x2d3829, 1).setStrokeStyle(1, 0xd6b36b);
    const icon = scene.add.image(x - 56, y, this.mobileMode ? mobileIconKey : iconKey).setScale(1.35);
    const title = scene.add.text(x - 31, y - 17, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#e6c47e", fontStyle: "bold",
      wordWrap: { width: 120 }
    }).setOrigin(0, 0.5);
    const body = scene.add.text(x - 31, y + 7, "", {
      fontFamily: this.language.getFontFamily(), fontSize: this.mobileMode ? "7px" : "8px", color: "#f5e8c6", lineSpacing: 2,
      wordWrap: { width: 120 }
    }).setOrigin(0, 0.5);
    this.panel.add([background, iconFrame, icon, title, body]);
    this.cardTexts.push({ title, body, titleKey, bodyKey, mobileTitleKey, mobileBodyKey });
  }

  private createInterface(scene: Phaser.Scene): void {
    this.panel = scene.add.container(0, 0).setScrollFactor(0);
    const background = modalPanel(scene, 320, 180, 550, 310);
    const topLine = scene.add.rectangle(320, 91, 490, 2, 0x9b7047, 0.8);
    this.titleText = scene.add.text(320, 43, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "18px", color: "#e6c47e", fontStyle: "bold"
    }).setOrigin(0.5);
    this.subtitleText = scene.add.text(320, 69, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#d7e6c5", align: "center", wordWrap: { width: 450 }
    }).setOrigin(0.5);
    this.panel.add([background, topLine, this.titleText, this.subtitleText]);

    this.createCard(scene, 145, 136, "ui_icon_hand", "help.moveTitle", "help.moveBody", "help.mobileMoveTitle", "help.mobileMoveBody", "ui_icon_hand");
    this.createCard(scene, 320, 136, "ui_icon_sprout", "help.farmTitle", "help.farmBody", "help.mobileUseTitle", "help.mobileUseBody", "ui_icon_action");
    this.createCard(scene, 495, 136, "fish_silver_barb_asset", "help.fishingTitle", "help.fishingBody", "help.mobileFishingTitle", "help.mobileFishingBody", "fish_silver_barb_asset");
    this.createCard(scene, 145, 224, "ui_icon_talk", "help.villageTitle", "help.villageBody", "help.mobileVillageTitle", "help.mobileVillageBody", "ui_icon_talk");
    this.createCard(scene, 320, 224, "cooking_hearth_asset", "help.cookingTitle", "help.cookingBody", "help.mobileCookingTitle", "help.mobileCookingBody", "cooking_hearth_asset");
    this.createCard(scene, 495, 224, "ui_icon_bed", "help.houseTitle", "help.houseBody", "help.mobileHouseTitle", "help.mobileHouseBody", "ui_icon_bed");

    this.exitHintText = scene.add.text(320, 318, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#d7e6c5", align: "center"
    }).setOrigin(0.5);
    const closePosition = modalClosePosition(320, 180, 550, 310);
    this.closeButton = createRedCloseButton(scene, closePosition.x, closePosition.y);
    this.panel.add([this.exitHintText, this.closeButton]);
    this.updateInterface();
  }

  private updateInterface(): void {
    const font = this.language.getFontFamily();
    this.titleText.setText(this.language.t("help.title"));
    this.subtitleText.setText(this.language.t(this.mobileMode ? "help.mobileSubtitle" : "help.subtitle"));
    this.exitHintText.setText(this.language.t(this.mobileMode ? "help.mobileExit" : "common.desktopExitHint"));
    for (const text of [this.titleText, this.subtitleText, this.exitHintText]) text.setFontFamily(font);
    for (const card of this.cardTexts) {
      card.title.setText(this.language.t(this.mobileMode ? card.mobileTitleKey : card.titleKey));
      card.body.setText(this.language.t(this.mobileMode ? card.mobileBodyKey : card.bodyKey));
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
  private close = (): void => { this.isOpen = false; this.ui.close("help"); };
  mobileToggle(): void { if (this.isOpen) this.close(); else this.open(); }
}
