
import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, modalPanel } from "../ui/PixelUI";

interface PlayerProfileData {
  name: string;
  outfitIndex: number;
}

interface Outfit {
  nameKey: string;
  texture: string;
  color: number;
}

export class PlayerProfileSystem {
  private scene: Phaser.Scene;
  private player: Phaser.GameObjects.Container;
  private ui: ModalUIManager;
  private language: LanguageSystem;

  private playerName = "Farmer";
  private outfitIndex = 0;

  private outfits: Outfit[] = [
    { nameKey: "profile.outfit.green", texture: "farmer_green_asset", color: 0x4c8c62 },
    { nameKey: "profile.outfit.blue", texture: "farmer_blue_asset", color: 0x477caf },
    { nameKey: "profile.outfit.red", texture: "farmer_red_asset", color: 0xa84d3e },
    { nameKey: "profile.outfit.purple", texture: "farmer_purple_asset", color: 0x79559c }
  ];

  private playerSprite!: Phaser.GameObjects.Sprite;
  private nameLabel!: Phaser.GameObjects.Text;
  private profilePanel!: Phaser.GameObjects.Container;
  private closeButton!: Phaser.GameObjects.Container;
  private nameText!: Phaser.GameObjects.Text;
  private outfitText!: Phaser.GameObjects.Text;
  private previewSprite!: Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;
  private renameLabel!: Phaser.GameObjects.Text;
  private outfitLabel!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private exitHintText!: Phaser.GameObjects.Text;
  private isOpen = false;
  private renameOverlay?: HTMLDivElement;
  private renameInput?: HTMLInputElement;
  private keyboardWasEnabled: boolean | null = null;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.GameObjects.Container,
    ui: ModalUIManager,
    language: LanguageSystem
  ) {
    this.scene = scene;
    this.player = player;
    this.ui = ui;
    this.language = language;

    this.playerSprite = this.player.getByName("farmerSprite") as Phaser.GameObjects.Sprite;
    this.createPlayerDetails();
    this.createControls();
    this.createProfileInterface();

    this.ui.registerPanel("profile", this.profilePanel, 350, () => {
      this.isOpen = false;
      if (this.renameOverlay) this.renameOverlay.style.display = "none";
      this.restoreGameKeyboard();
    }, this.closeButton);

    this.ui.registerHud(this.nameLabel);
    this.language.onChange(() => this.updateProfileDisplay());
  }

  private createPlayerDetails(): void {
    this.nameLabel = this.scene.add.text(0, -48, this.playerName, {
      fontFamily: this.language.getFontFamily(),
      fontSize: "7px",
      color: "#ffffff",
      backgroundColor: "#34271d",
      padding: { x: 2, y: 1 }
    }).setOrigin(0.5);

    this.player.add(this.nameLabel);
    this.applyOutfit();
  }

  private applyOutfit(): void {
    const outfit = this.outfits[this.outfitIndex];
    this.playerSprite.setTexture(outfit.texture.replace("_asset", "_sheet"), 0);
    this.playerSprite.clearTint();
  }

  private createControls(): void {
    this.scene.input.on("pointerdown", this.handleProfilePointer, this);

    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.input.off("pointerdown", this.handleProfilePointer, this);
      this.restoreGameKeyboard();
      this.renameOverlay?.remove();
    });
  }

  private handleProfilePointer = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || this.ui.getActiveModal() !== "profile") return;

    const x = pointer.x;
    const y = pointer.y;

    if (x >= 235 && x <= 405 && y >= 139 && y <= 175) {
      this.renamePlayer();
      return;
    }

    if (y >= 195 && y <= 237) {
      const positions = [215, 285, 355, 425];
      for (let i = 0; i < positions.length; i++) {
        if (Math.abs(x - positions[i]) <= 25) {
          this.selectOutfit(i);
          return;
        }
      }
    }

  };

  private createProfileInterface(): void {
    this.profilePanel = this.scene.add.container(0, 0);
    this.profilePanel.setScrollFactor(0);

    const background = modalPanel(this.scene, 320, 180, 430, 270);

    this.titleText = this.scene.add.text(320, 67, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "17px",
      color: "#e6c47e"
    }).setOrigin(0.5);

    const closePosition = modalClosePosition(320, 180, 430, 270);
    this.closeButton = createRedCloseButton(this.scene, closePosition.x, closePosition.y);

    this.previewSprite = this.scene.add.image(320, 102, this.outfits[this.outfitIndex].texture)
      .setScale(2);

    this.nameText = this.scene.add.text(320, 132, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#ffffff"
    }).setOrigin(0.5);

    const renameButton = this.scene.add.rectangle(320, 157, 170, 36, 0x527044);
    renameButton.setStrokeStyle(1, 0xd6b36b);
    this.renameLabel = this.scene.add.text(320, 157, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.outfitLabel = this.scene.add.text(320, 183, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#f0d69e"
    }).setOrigin(0.5);

    const colorButtons: Phaser.GameObjects.GameObject[] = [];
    this.outfits.forEach((outfit, index) => {
      const x = 215 + index * 70;
      const button = this.scene.add.rectangle(x, 216, 42, 26, outfit.color);
      button.setStrokeStyle(2, 0xd6b36b);
      const number = this.scene.add.text(x, 216, String(index + 1), {
        fontFamily: this.language.getFontFamily(),
        fontSize: "11px",
        color: "#ffffff"
      }).setOrigin(0.5);
      colorButtons.push(button, number);
    });

    this.outfitText = this.scene.add.text(320, 245, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#d6e6c2"
    }).setOrigin(0.5);

    this.instructionText = this.scene.add.text(320, 260, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#b9dca3",
      align: "center",
      wordWrap: { width: 380 }
    }).setOrigin(0.5);

    this.exitHintText = this.scene.add.text(320, 289, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#d7e6c5",
      align: "center"
    }).setOrigin(0.5);

    this.profilePanel.add([
      background,
      this.titleText,
      this.closeButton,
      this.previewSprite,
      this.nameText,
      renameButton,
      this.renameLabel,
      this.outfitLabel,
      ...colorButtons,
      this.outfitText,
      this.instructionText,
      this.exitHintText
    ]);

    this.updateProfileDisplay();
  }

  private updateProfileDisplay(): void {
    const font = this.language.getFontFamily();
    this.titleText.setText(this.language.t("profile.title"));
    this.nameText.setText(this.language.t("profile.name", { name: this.playerName }));
    this.renameLabel.setText(this.language.t("profile.rename"));
    this.outfitLabel.setText(this.language.t("profile.outfit"));
    this.outfitText.setText(this.language.t(this.outfits[this.outfitIndex].nameKey));
    this.instructionText.setText(this.language.t("profile.close"));
    this.exitHintText.setText(this.language.t("common.clickCrossExit"));
    this.previewSprite.setTexture(this.outfits[this.outfitIndex].texture);
    this.nameLabel.setText(this.playerName);

    for (const text of [
      this.titleText,
      this.nameText,
      this.renameLabel,
      this.outfitLabel,
      this.outfitText,
      this.instructionText,
      this.exitHintText,
      this.nameLabel
    ]) {
      text.setFontFamily(font);
    }
    if (this.renameOverlay) this.renameOverlay.style.fontFamily = font;
    if (this.renameInput) this.renameInput.style.fontFamily = font;
  }

  private createRenameOverlay(): void {
    if (this.renameOverlay) return;

    const host = document.getElementById("game-container");
    if (!host) return;

    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.zIndex = "30";
    overlay.style.display = "none";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "16px";
    overlay.style.background = "rgba(18, 27, 19, 0.78)";
    overlay.style.fontFamily = this.language.getFontFamily();

    const form = document.createElement("form");
    form.style.width = "min(320px, 100%)";
    form.style.padding = "20px";
    form.style.border = "4px solid #2a1a14";
    form.style.outline = "2px solid #c9993f";
    form.style.borderRadius = "0";
    form.style.background = "#2d3829";
    form.style.boxShadow = "0 14px 40px rgba(0,0,0,.4)";
    form.style.display = "flex";
    form.style.flexDirection = "column";
    form.style.gap = "12px";

    const title = document.createElement("strong");
    title.style.color = "#e6c47e";
    title.style.fontSize = "15px";

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 16;
    input.required = true;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.autocapitalize = "words";
    input.inputMode = "text";
    input.value = this.playerName;
    input.style.width = "100%";
    input.style.padding = "11px";
    input.style.border = "1px solid #9b7047";
    input.style.borderRadius = "0";
    input.style.background = "#f5e8c6";
    input.style.color = "#34271d";
    input.style.fontSize = "16px";
    input.style.boxSizing = "border-box";
    input.style.fontFamily = this.language.getFontFamily();
    input.style.lineHeight = "1.4";
    input.style.outline = "2px solid #d6b36b";
    // Do not let Phaser's WASD/action shortcuts consume characters while typing.
    input.addEventListener("keydown", event => event.stopPropagation());
    input.addEventListener("keyup", event => event.stopPropagation());
    input.addEventListener("keypress", event => event.stopPropagation());

    const buttons = document.createElement("div");
    buttons.style.display = "flex";
    buttons.style.gap = "10px";

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.style.flex = "1";
    saveButton.style.padding = "10px";
    saveButton.style.border = "1px solid #d6b36b";
    saveButton.style.borderRadius = "0";
    saveButton.style.background = "#47734b";
    saveButton.style.color = "white";
    saveButton.style.fontWeight = "700";
    saveButton.style.cursor = "pointer";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.style.flex = "1";
    cancelButton.style.padding = "10px";
    cancelButton.style.border = "1px solid #9b7047";
    cancelButton.style.borderRadius = "0";
    cancelButton.style.background = "#493629";
    cancelButton.style.color = "#fff1cf";
    cancelButton.style.fontWeight = "700";
    cancelButton.style.cursor = "pointer";

    const updateLabels = (): void => {
      const myanmar = this.language.getLanguage() === "my";
      const font = this.language.getFontFamily();
      overlay.style.fontFamily = font;
      title.style.fontFamily = font;
      input.style.fontFamily = font;
      saveButton.style.fontFamily = font;
      cancelButton.style.fontFamily = font;
      title.textContent = myanmar ? "လယ်သမားအမည် ပြောင်းရန်" : "Rename your farmer";
      saveButton.textContent = myanmar ? "သိမ်းရန်" : "SAVE NAME";
      cancelButton.textContent = myanmar ? "မလုပ်တော့ပါ" : "CANCEL";
    };

    cancelButton.addEventListener("click", () => {
      overlay.style.display = "none";
      this.restoreGameKeyboard();
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      const cleanedName = input.value.trim().replace(/[<>]/g, "").slice(0, 16);
      if (!cleanedName) {
        input.focus();
        return;
      }
      this.playerName = cleanedName;
      overlay.style.display = "none";
      this.restoreGameKeyboard();
      this.updateProfileDisplay();
    });

    buttons.append(saveButton, cancelButton);
    form.append(title, input, buttons);
    overlay.append(form);
    host.append(overlay);

    this.renameOverlay = overlay;
    this.renameInput = input;
    updateLabels();
    this.language.onChange(updateLabels);
  }

  private suspendGameKeyboard(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;
    this.keyboardWasEnabled = keyboard.enabled;
    keyboard.enabled = false;
  }

  private restoreGameKeyboard(): void {
    const keyboard = this.scene.input.keyboard;
    if (keyboard && this.keyboardWasEnabled !== null) {
      keyboard.enabled = this.keyboardWasEnabled;
      this.keyboardWasEnabled = null;
    }
  }

  private renamePlayer = (): void => {
    this.createRenameOverlay();
    if (!this.renameOverlay || !this.renameInput) return;
    this.suspendGameKeyboard();
    this.renameInput.value = this.playerName;
    this.renameOverlay.style.display = "flex";
    this.renameInput.focus();
    this.renameInput.select();
  };

  private selectOutfit(index: number): void {
    if (index < 0 || index >= this.outfits.length) return;
    this.outfitIndex = index;
    this.applyOutfit();
    this.updateProfileDisplay();
  }

  private openProfile(): void {
    this.isOpen = true;
    this.ui.open("profile");
    this.updateProfileDisplay();
  }

  private closeProfile = (): void => {
    this.isOpen = false;
    if (this.renameOverlay) this.renameOverlay.style.display = "none";
    this.restoreGameKeyboard();
    this.ui.close("profile");
  };

  isProfileOpen(): boolean {
    return this.isOpen;
  }

  mobileToggle(): void {
    if (this.isOpen) this.closeProfile();
    else if (!this.ui.hasActiveModal()) this.openProfile();
  }

  getSaveData(): PlayerProfileData {
    return {
      name: this.playerName,
      outfitIndex: this.outfitIndex
    };
  }

  loadSaveData(data: PlayerProfileData): void {
    const name = typeof data.name === "string"
      ? data.name.trim().replace(/[<>]/g, "").slice(0, 16)
      : "";

    this.playerName = name || "Farmer";
    this.outfitIndex = Phaser.Math.Clamp(
      Math.floor(Number(data.outfitIndex) || 0),
      0,
      this.outfits.length - 1
    );

    this.applyOutfit();
    this.updateProfileDisplay();
  }

}
