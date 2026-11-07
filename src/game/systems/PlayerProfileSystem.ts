
import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";

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

  private playerSprite!: Phaser.GameObjects.Image;
  private nameLabel!: Phaser.GameObjects.Text;
  private profilePanel!: Phaser.GameObjects.Container;
  private nameText!: Phaser.GameObjects.Text;
  private outfitText!: Phaser.GameObjects.Text;
  private previewSprite!: Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;
  private renameLabel!: Phaser.GameObjects.Text;
  private outfitLabel!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private closeText!: Phaser.GameObjects.Text;
  private isOpen = false;
  private profileKey!: Phaser.Input.Keyboard.Key;

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

    this.playerSprite = this.player.getByName("farmerSprite") as Phaser.GameObjects.Image;
    this.createPlayerDetails();
    this.createControls();
    this.createProfileInterface();

    this.ui.registerPanel("profile", this.profilePanel, 350, () => {
      this.isOpen = false;
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
    this.playerSprite.setTexture(outfit.texture);
    this.playerSprite.clearTint();
  }

  private createControls(): void {
    this.profileKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    this.scene.input.on("pointerdown", this.handleProfilePointer, this);
    window.addEventListener("keydown", this.handleWindowKeyDown, true);

    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.input.off("pointerdown", this.handleProfilePointer, this);
      window.removeEventListener("keydown", this.handleWindowKeyDown, true);
    });
  }

  private handleWindowKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.isOpen) {
      event.preventDefault();
      event.stopPropagation();
      this.closeProfile();
    }
  };

  private handleProfilePointer = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || this.ui.getActiveModal() !== "profile") return;

    const x = pointer.x;
    const y = pointer.y;

    if (x >= 260 && x <= 380 && y >= 168 && y <= 193) {
      this.renamePlayer();
      return;
    }

    if (y >= 222 && y <= 252) {
      const positions = [215, 285, 355, 425];
      for (let i = 0; i < positions.length; i++) {
        if (Math.abs(x - positions[i]) <= 25) {
          this.selectOutfit(i);
          return;
        }
      }
    }

    if (x >= 260 && x <= 380 && y >= 289 && y <= 312) {
      this.closeProfile();
    }
  };

  private createProfileInterface(): void {
    this.profilePanel = this.scene.add.container(0, 0);
    this.profilePanel.setScrollFactor(0);

    const background = this.scene.add.rectangle(320, 180, 430, 250, 0x34271d, 0.99);
    background.setStrokeStyle(3, 0xd6b36b);

    this.titleText = this.scene.add.text(320, 70, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "18px",
      color: "#e6c47e"
    }).setOrigin(0.5);

    this.previewSprite = this.scene.add.image(320, 120, this.outfits[this.outfitIndex].texture)
      .setDisplaySize(42, 56);

    this.nameText = this.scene.add.text(320, 157, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "11px",
      color: "#ffffff"
    }).setOrigin(0.5);

    const renameButton = this.scene.add.rectangle(320, 180, 115, 24, 0x477caf);
    renameButton.setStrokeStyle(1, 0xd6b36b);
    this.renameLabel = this.scene.add.text(320, 180, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#ffffff"
    }).setOrigin(0.5);

    this.outfitLabel = this.scene.add.text(320, 210, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#f0d69e"
    }).setOrigin(0.5);

    const colorButtons: Phaser.GameObjects.GameObject[] = [];
    this.outfits.forEach((outfit, index) => {
      const x = 215 + index * 70;
      const button = this.scene.add.rectangle(x, 237, 42, 26, outfit.color);
      button.setStrokeStyle(2, 0xffffff);
      const number = this.scene.add.text(x, 237, String(index + 1), {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#ffffff"
      }).setOrigin(0.5);
      colorButtons.push(button, number);
    });

    this.outfitText = this.scene.add.text(320, 264, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#d6e6c2"
    }).setOrigin(0.5);

    this.instructionText = this.scene.add.text(320, 283, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "8px",
      color: "#b9dca3"
    }).setOrigin(0.5);

    this.closeText = this.scene.add.text(320, 300, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#f0d69e"
    }).setOrigin(0.5);

    this.profilePanel.add([
      background,
      this.titleText,
      this.previewSprite,
      this.nameText,
      renameButton,
      this.renameLabel,
      this.outfitLabel,
      ...colorButtons,
      this.outfitText,
      this.instructionText,
      this.closeText
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
    this.closeText.setText(this.language.t("common.close"));
    this.previewSprite.setTexture(this.outfits[this.outfitIndex].texture);
    this.nameLabel.setText(this.playerName);

    for (const text of [
      this.titleText,
      this.nameText,
      this.renameLabel,
      this.outfitLabel,
      this.outfitText,
      this.instructionText,
      this.closeText,
      this.nameLabel
    ]) {
      text.setFontFamily(font);
    }
  }

  private renamePlayer = (): void => {
    const name = window.prompt(
      this.language.getLanguage() === "my" ? "လယ်သမားအမည် ထည့်ပါ:" : "Enter your farmer's name:",
      this.playerName
    );
    if (name === null) return;

    const cleanedName = name.trim().replace(/[<>]/g, "").slice(0, 16);
    if (!cleanedName) return;

    this.playerName = cleanedName;
    this.updateProfileDisplay();
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
    this.ui.close("profile");
    this.profileKey.reset();
  };

  isProfileOpen(): boolean {
    return this.isOpen;
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
    if (Phaser.Input.Keyboard.JustDown(this.profileKey)) {
      if (this.isOpen) this.closeProfile();
      else this.openProfile();
    }
  }
}
