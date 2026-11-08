
import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { pixelPanel, PIXEL_FONT } from "../ui/PixelUI";

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
  private nameText!: Phaser.GameObjects.Text;
  private outfitText!: Phaser.GameObjects.Text;
  private previewSprite!: Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;
  private renameLabel!: Phaser.GameObjects.Text;
  private outfitLabel!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private languageText!: Phaser.GameObjects.Text;
  private isOpen = false;
  private profileKey!: Phaser.Input.Keyboard.Key;
  private renameOverlay?: HTMLDivElement;
  private renameInput?: HTMLInputElement;

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
      this.profileKey.reset();
    });

    this.ui.registerHud(this.nameLabel);
    this.language.onChange(() => this.updateProfileDisplay());
  }

  private createPlayerDetails(): void {
    this.nameLabel = this.scene.add.text(0, -48, this.playerName, {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#ffffff",
      backgroundColor: "#34271d",
      padding: { x: 4, y: 3 }
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
    this.profileKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    this.scene.input.on("pointerdown", this.handleProfilePointer, this);

    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.input.off("pointerdown", this.handleProfilePointer, this);
      this.renameOverlay?.remove();
    });
  }

  private handleProfilePointer = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || this.ui.getActiveModal() !== "profile") return;

    const x = pointer.x;
    const y = pointer.y;

    if (x >= 503 && x <= 535 && y >= 49 && y <= 80) {
      this.closeProfile();
      return;
    }

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

    if (x >= 195 && x <= 445 && y >= 275 && y <= 313) {
      this.language.toggleLanguage();
    }
  };

  private createProfileInterface(): void {
    this.profilePanel = this.scene.add.container(0, 0);
    this.profilePanel.setScrollFactor(0);

    const background = pixelPanel(this.scene, 320, 180, 430, 270, { fill: 0x34271d, alpha: 1 });

    this.titleText = this.scene.add.text(320, 67, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "17px",
      color: "#e6c47e"
    }).setOrigin(0.5);

    const closeButton = this.scene.add.rectangle(520, 63, 25, 25, 0x79382e, 1);
    closeButton.setStrokeStyle(1, 0xd6b36b);
    const closeX = this.scene.add.text(520, 62, "×", {
      fontFamily: "sans-serif",
      fontSize: "19px",
      color: "#fff1cf",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.previewSprite = this.scene.add.image(320, 102, this.outfits[this.outfitIndex].texture)
      .setScale(2);

    this.nameText = this.scene.add.text(320, 132, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#ffffff"
    }).setOrigin(0.5);

    const renameButton = this.scene.add.rectangle(320, 157, 170, 36, 0x477caf);
    renameButton.setStrokeStyle(1, 0xd6b36b);
    this.renameLabel = this.scene.add.text(320, 157, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.outfitLabel = this.scene.add.text(320, 183, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#f0d69e"
    }).setOrigin(0.5);

    const colorButtons: Phaser.GameObjects.GameObject[] = [];
    this.outfits.forEach((outfit, index) => {
      const x = 215 + index * 70;
      const button = this.scene.add.rectangle(x, 216, 42, 26, outfit.color);
      button.setStrokeStyle(2, 0xffffff);
      const number = this.scene.add.text(x, 216, String(index + 1), {
        fontFamily: PIXEL_FONT,
        fontSize: "10px",
        color: "#ffffff"
      }).setOrigin(0.5);
      colorButtons.push(button, number);
    });

    this.outfitText = this.scene.add.text(320, 245, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#d6e6c2"
    }).setOrigin(0.5);

    this.instructionText = this.scene.add.text(320, 266, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "8px",
      color: "#b9dca3",
      align: "center",
      wordWrap: { width: 380 }
    }).setOrigin(0.5);

    const languageButton = this.scene.add.rectangle(320, 294, 250, 30, 0x40513a, 1);
    languageButton.setStrokeStyle(1, 0xd6b36b);
    this.languageText = this.scene.add.text(320, 294, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#fff1cf",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.profilePanel.add([
      background,
      this.titleText,
      closeButton,
      closeX,
      this.previewSprite,
      this.nameText,
      renameButton,
      this.renameLabel,
      this.outfitLabel,
      ...colorButtons,
      this.outfitText,
      this.instructionText,
      languageButton,
      this.languageText
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
    this.languageText.setText(
      `${this.language.t("common.language")}: ${this.language.getLanguage() === "en" ? this.language.t("common.english") : this.language.t("common.myanmar")} · ${this.language.t("profile.languageHint")}`
    );
    this.previewSprite.setTexture(this.outfits[this.outfitIndex].texture);
    this.nameLabel.setText(this.playerName);

    for (const text of [
      this.titleText,
      this.nameText,
      this.renameLabel,
      this.outfitLabel,
      this.outfitText,
      this.instructionText,
      this.languageText,
      this.nameLabel
    ]) {
      text.setFontFamily(font);
    }
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
    overlay.style.fontFamily = "Segoe UI, Arial, sans-serif";

    const form = document.createElement("form");
    form.style.width = "min(320px, 100%)";
    form.style.padding = "20px";
    form.style.border = "2px solid #d6b36b";
    form.style.borderRadius = "12px";
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
    input.value = this.playerName;
    input.style.width = "100%";
    input.style.padding = "11px";
    input.style.border = "1px solid #9b7047";
    input.style.borderRadius = "7px";
    input.style.background = "#f5e8c6";
    input.style.color = "#34271d";
    input.style.fontSize = "16px";
    input.style.boxSizing = "border-box";

    const buttons = document.createElement("div");
    buttons.style.display = "flex";
    buttons.style.gap = "10px";

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.style.flex = "1";
    saveButton.style.padding = "10px";
    saveButton.style.border = "1px solid #d6b36b";
    saveButton.style.borderRadius = "7px";
    saveButton.style.background = "#47734b";
    saveButton.style.color = "white";
    saveButton.style.fontWeight = "700";
    saveButton.style.cursor = "pointer";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.style.flex = "1";
    cancelButton.style.padding = "10px";
    cancelButton.style.border = "1px solid #9b7047";
    cancelButton.style.borderRadius = "7px";
    cancelButton.style.background = "#493629";
    cancelButton.style.color = "#fff1cf";
    cancelButton.style.fontWeight = "700";
    cancelButton.style.cursor = "pointer";

    const updateLabels = (): void => {
      const myanmar = this.language.getLanguage() === "my";
      title.textContent = myanmar ? "လယ်သမားအမည် ပြောင်းရန်" : "Rename your farmer";
      saveButton.textContent = myanmar ? "သိမ်းရန်" : "SAVE NAME";
      cancelButton.textContent = myanmar ? "မလုပ်တော့ပါ" : "CANCEL";
    };

    cancelButton.addEventListener("click", () => {
      overlay.style.display = "none";
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

  private renamePlayer = (): void => {
    this.createRenameOverlay();
    if (!this.renameOverlay || !this.renameInput) return;
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
    this.ui.close("profile");
    this.profileKey.reset();
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

  update(): void {
    if (this.renameOverlay?.style.display === "flex") return;

    if (Phaser.Input.Keyboard.JustDown(this.profileKey)) {
      if (this.isOpen) this.closeProfile();
      else this.openProfile();
    }
  }
}
