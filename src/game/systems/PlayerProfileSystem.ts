import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, modalPanel } from "../ui/PixelUI";

interface PlayerProfileData {
  name: string;
  farmName?: string;
  outfitIndex: number;
  gender?: "male" | "female";
}

type CharacterGender = "male" | "female";

interface Outfit {
  nameKey: string;
  color: number;
  maleAsset: string;
  maleSheet: string;
  femaleAsset: string;
  femaleSheet: string;
}

export class PlayerProfileSystem {
  private scene: Phaser.Scene;
  private player: Phaser.GameObjects.Container;
  private ui: ModalUIManager;
  private language: LanguageSystem;

  private playerName = "Farmer";
  private farmName = "My Farm";
  private renameTarget: "player" | "farm" = "player";
  private gender: CharacterGender = "male";
  private outfitIndex = 0;

  private readonly outfits: Outfit[] = [
    {
      nameKey: "profile.outfit.green", color: 0x4c8c62,
      maleAsset: "farmer_green_asset", maleSheet: "farmer_green_sheet",
      femaleAsset: "farmer_female_green_asset", femaleSheet: "farmer_female_green_sheet"
    },
    {
      nameKey: "profile.outfit.blue", color: 0x477caf,
      maleAsset: "farmer_blue_asset", maleSheet: "farmer_blue_sheet",
      femaleAsset: "farmer_female_blue_asset", femaleSheet: "farmer_female_blue_sheet"
    },
    {
      nameKey: "profile.outfit.red", color: 0xa84d3e,
      maleAsset: "farmer_red_asset", maleSheet: "farmer_red_sheet",
      femaleAsset: "farmer_female_red_asset", femaleSheet: "farmer_female_red_sheet"
    },
    {
      nameKey: "profile.outfit.purple", color: 0x79559c,
      maleAsset: "farmer_purple_asset", maleSheet: "farmer_purple_sheet",
      femaleAsset: "farmer_female_purple_asset", femaleSheet: "farmer_female_purple_sheet"
    }
  ];

  private playerSprite!: Phaser.GameObjects.Sprite;
  private nameLabel!: Phaser.GameObjects.Text;
  private profilePanel!: Phaser.GameObjects.Container;
  private closeButton!: Phaser.GameObjects.Container;
  private nameText!: Phaser.GameObjects.Text;
  private farmNameText!: Phaser.GameObjects.Text;
  private farmRenameLabel!: Phaser.GameObjects.Text;
  private outfitText!: Phaser.GameObjects.Text;
  private previewSprite!: Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;
  private renameLabel!: Phaser.GameObjects.Text;
  private genderLabel!: Phaser.GameObjects.Text;
  private maleLabel!: Phaser.GameObjects.Text;
  private femaleLabel!: Phaser.GameObjects.Text;
  private maleButton!: Phaser.GameObjects.Rectangle;
  private femaleButton!: Phaser.GameObjects.Rectangle;
  private outfitLabel!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private saveButton!: Phaser.GameObjects.Rectangle;
  private loadButton!: Phaser.GameObjects.Rectangle;
  private saveButtonText!: Phaser.GameObjects.Text;
  private loadButtonText!: Phaser.GameObjects.Text;
  private saveActions: { save: () => string; load: () => string } = { save: () => "common.saveFailed", load: () => "common.loadFailed" };
  private outfitButtons: Phaser.GameObjects.Rectangle[] = [];
  private outfitNumbers: Phaser.GameObjects.Text[] = [];
  private isOpen = false;
  private renameOverlay?: HTMLDivElement;
  private renameInput?: HTMLInputElement;
  private characterCreationOverlay?: HTMLDivElement;
  private characterCreationInput?: HTMLInputElement;
  private characterCreationFarmInput?: HTMLInputElement;
  private characterCreationPreview?: HTMLImageElement;
  private characterCreationGenderButtons: HTMLButtonElement[] = [];
  private characterCreationOutfitButtons: HTMLButtonElement[] = [];
  private characterCreationComplete?: () => void;
  private characterCreationCancel?: () => void;
  private keyboardWasEnabled: boolean | null = null;
  private feedbackActive = false;

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
      if (this.characterCreationOverlay) this.characterCreationOverlay.classList.remove("is-open");
      this.restoreGameKeyboard();
    }, this.closeButton);

    this.ui.registerHud(this.nameLabel);
    this.language.onChange(() => {
      this.updateProfileDisplay();
      this.updateCharacterCreationLabels();
    });
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

  private getCurrentSheet(): string {
    const outfit = this.outfits[this.outfitIndex];
    return this.gender === "female" ? outfit.femaleSheet : outfit.maleSheet;
  }

  private getCurrentPortraitAsset(): string {
    const outfit = this.outfits[this.outfitIndex];
    return this.gender === "female" ? outfit.femaleAsset : outfit.maleAsset;
  }

  /** Public portrait path used by the opening RPG dialogue scene. */
  getCurrentPortraitPath(): string {
    const outfit = this.outfits[this.outfitIndex];
    const sheet = this.gender === "female" ? outfit.femaleSheet : outfit.maleSheet;
    return `assets/characters/${sheet.replace(/_sheet$/, "")}.png`;
  }

  private applyOutfit(): void {
    this.playerSprite.anims.stop();
    this.playerSprite.setTexture(this.getCurrentSheet(), 0);
    this.playerSprite.setFrame(0);
    this.playerSprite.clearTint();
  }

  private createControls(): void {
    this.scene.input.on("pointerdown", this.handleProfilePointer, this);

    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.input.off("pointerdown", this.handleProfilePointer, this);
      this.restoreGameKeyboard();
      this.renameOverlay?.remove();
      this.characterCreationOverlay?.remove();
    });
  }

  private handleProfilePointer = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || this.ui.getActiveModal() !== "profile" || this.characterCreationOverlay?.classList.contains("is-open")) return;

    const x = pointer.x;
    const y = pointer.y;

    if (x >= 230 && x <= 410 && y >= 119 && y <= 145) {
      this.renamePlayer();
      return;
    }

    if (x >= 230 && x <= 410 && y >= 158 && y <= 184) {
      this.renameFarm();
      return;
    }

    if (y >= 201 && y <= 235) {
      if (x >= 188 && x <= 320) this.selectGender("male");
      else if (x > 320 && x <= 452) this.selectGender("female");
      return;
    }

    if (y >= 253 && y <= 285) {
      const positions = [245, 295, 345, 395];
      for (let index = 0; index < positions.length; index++) {
        if (Math.abs(x - positions[index]) <= 19) {
          this.selectOutfit(index);
          return;
        }
      }
    }

    if (y >= 296 && y <= 321) {
      if (x >= 190 && x <= 310) this.showSaveFeedback(this.saveActions.save());
      else if (x >= 330 && x <= 450) this.showSaveFeedback(this.saveActions.load());
    }
  };

  private createProfileInterface(): void {
    this.profilePanel = this.scene.add.container(0, 0);
    this.profilePanel.setScrollFactor(0);

    const background = modalPanel(this.scene, 320, 180, 470, 310);

    this.titleText = this.scene.add.text(320, 34, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "16px", color: "#e6c47e", fontStyle: "bold"
    }).setOrigin(0.5);

    const closePosition = modalClosePosition(320, 180, 470, 310);
    this.closeButton = createRedCloseButton(this.scene, closePosition.x, closePosition.y);

    this.previewSprite = this.scene.add.image(320, 75, this.getCurrentPortraitAsset()).setScale(2.1);

    this.nameText = this.scene.add.text(320, 105, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#ffffff"
    }).setOrigin(0.5);

    const renameButton = this.scene.add.rectangle(320, 132, 170, 25, 0x527044).setStrokeStyle(1, 0xd6b36b);
    this.renameLabel = this.scene.add.text(320, 132, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#ffffff", fontStyle: "bold"
    }).setOrigin(0.5);

    this.farmNameText = this.scene.add.text(320, 157, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#f4e4bd"
    }).setOrigin(0.5);

    const renameFarmButton = this.scene.add.rectangle(320, 176, 170, 24, 0x725332).setStrokeStyle(1, 0xd6b36b);
    this.farmRenameLabel = this.scene.add.text(320, 176, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#ffffff", fontStyle: "bold"
    }).setOrigin(0.5);

    this.genderLabel = this.scene.add.text(320, 204, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#f0d69e", fontStyle: "bold"
    }).setOrigin(0.5);

    this.maleButton = this.scene.add.rectangle(253, 224, 124, 26, 0x527044).setStrokeStyle(2, 0xd6b36b);
    this.femaleButton = this.scene.add.rectangle(387, 224, 124, 26, 0x493729).setStrokeStyle(2, 0x9b7047);
    this.maleLabel = this.scene.add.text(253, 224, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#fff1cf", fontStyle: "bold"
    }).setOrigin(0.5);
    this.femaleLabel = this.scene.add.text(387, 224, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#fff1cf", fontStyle: "bold"
    }).setOrigin(0.5);

    this.outfitLabel = this.scene.add.text(320, 253, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#f0d69e", fontStyle: "bold"
    }).setOrigin(0.5);

    const swatchColors = [0x4c8c62, 0x477caf, 0xa84d3e, 0x79559c];
    this.outfitButtons = swatchColors.map((color, index) => {
      const x = 245 + index * 50;
      const swatch = this.scene.add.rectangle(x, 274, 35, 22, color).setStrokeStyle(2, 0xd6b36b);
      const numeral = this.scene.add.text(x, 274, String(index + 1), {
        fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#ffffff", fontStyle: "bold"
      }).setOrigin(0.5);
      this.outfitNumbers.push(numeral);
      return swatch;
    });

    this.outfitText = this.scene.add.text(320, 288, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#d6e6c2"
    }).setOrigin(0.5);

    this.instructionText = this.scene.add.text(320, 331, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "7px", color: "#b9dca3", align: "center",
      wordWrap: { width: 400 }
    }).setOrigin(0.5);

    this.saveButton = this.scene.add.rectangle(250, 307, 116, 23, 0x527044).setStrokeStyle(2, 0xd6b36b);
    this.loadButton = this.scene.add.rectangle(390, 307, 116, 23, 0x725332).setStrokeStyle(2, 0xd6b36b);
    this.saveButtonText = this.scene.add.text(250, 307, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#fff1cf", fontStyle: "bold"
    }).setOrigin(0.5);
    this.loadButtonText = this.scene.add.text(390, 307, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#fff1cf", fontStyle: "bold"
    }).setOrigin(0.5);

    this.profilePanel.add([
      background, this.titleText, this.closeButton, this.previewSprite, this.nameText,
      renameButton, this.renameLabel, this.farmNameText, renameFarmButton, this.farmRenameLabel,
      this.genderLabel, this.maleButton, this.femaleButton, this.maleLabel, this.femaleLabel,
      this.outfitLabel, ...this.outfitButtons, ...this.outfitNumbers, this.outfitText,
      this.saveButton, this.loadButton, this.saveButtonText, this.loadButtonText,
      this.instructionText
    ]);

    this.updateProfileDisplay();
  }

  private updateProfileDisplay(): void {
    if (!this.titleText) return;
    const font = this.language.getFontFamily();
    this.titleText.setText(this.language.t("profile.title"));
    this.nameText.setText(this.language.t("profile.name", { name: this.playerName }));
    this.renameLabel.setText(this.language.t("profile.rename"));
    this.farmNameText.setText(this.language.t("profile.farmName", { name: this.farmName }));
    this.farmRenameLabel.setText(this.language.t("profile.renameFarm"));
    this.genderLabel.setText(this.language.t("profile.gender"));
    this.maleLabel.setText(this.language.t("profile.male"));
    this.femaleLabel.setText(this.language.t("profile.female"));
    this.outfitLabel.setText(this.language.t("profile.outfit"));
    this.outfitText.setText(this.language.t(this.outfits[this.outfitIndex].nameKey));
    if (!this.feedbackActive) {
      this.instructionText.setText(this.language.t("profile.close"));
      this.instructionText.setColor("#b9dca3");
    }
    this.saveButtonText.setText(this.language.t("save.saveButton"));
    this.loadButtonText.setText(this.language.t("save.loadButton"));
    this.previewSprite.setTexture(this.getCurrentPortraitAsset());
    this.nameLabel.setText(this.playerName);
    this.maleButton.setFillStyle(this.gender === "male" ? 0x527044 : 0x493729);
    this.femaleButton.setFillStyle(this.gender === "female" ? 0x527044 : 0x493729);
    this.maleButton.setStrokeStyle(2, this.gender === "male" ? 0xf2d28d : 0x9b7047);
    this.femaleButton.setStrokeStyle(2, this.gender === "female" ? 0xf2d28d : 0x9b7047);
    this.outfitButtons.forEach((button, index) => {
      button.setStrokeStyle(index === this.outfitIndex ? 3 : 1, index === this.outfitIndex ? 0xffe09a : 0xd6b36b);
    });

    for (const text of [
      this.titleText, this.nameText, this.renameLabel, this.farmNameText, this.farmRenameLabel,
      this.genderLabel, this.maleLabel, this.femaleLabel, this.outfitLabel, ...this.outfitNumbers,
      this.outfitText, this.instructionText, this.saveButtonText, this.loadButtonText, this.nameLabel
    ]) text.setFontFamily(font);

    if (this.renameOverlay) this.renameOverlay.style.fontFamily = font;
    if (this.renameInput) this.renameInput.style.fontFamily = font;
    this.updateCharacterCreationPreview();
  }

  setSaveActions(save: () => string, load: () => string): void {
    this.saveActions = { save, load };
    this.updateProfileDisplay();
  }

  private showSaveFeedback(key: string): void {
    this.feedbackActive = true;
    this.instructionText.setText(this.language.t(key));
    this.instructionText.setColor(key === "common.saved" || key === "common.loaded" ? "#bce5a4" : "#f0b28d");
    this.scene.time.delayedCall(2200, () => {
      if (!this.instructionText || !this.instructionText.active) return;
      this.feedbackActive = false;
      this.instructionText.setText(this.language.t("profile.close"));
      this.instructionText.setColor("#b9dca3");
    });
  }

  private createRenameOverlay(): void {
    if (this.renameOverlay) return;
    const host = document.getElementById("game-container");
    if (!host) return;

    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.zIndex = "13000";
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
    form.style.background = "#2d3829";
    form.style.boxShadow = "0 14px 40px rgba(0,0,0,.4)";
    form.style.display = "flex";
    form.noValidate = true;
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
    input.style.background = "#f5e8c6";
    input.style.color = "#34271d";
    input.style.fontSize = "16px";
    input.style.boxSizing = "border-box";
    input.style.fontFamily = this.language.getFontFamily();
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
    saveButton.style.background = "#47734b";
    saveButton.style.color = "white";
    saveButton.style.fontWeight = "700";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.style.flex = "1";
    cancelButton.style.padding = "10px";
    cancelButton.style.border = "1px solid #9b7047";
    cancelButton.style.background = "#493629";
    cancelButton.style.color = "#fff1cf";
    cancelButton.style.fontWeight = "700";

    const updateLabels = (): void => {
      const myanmar = this.language.getLanguage() === "my";
      const font = this.language.getFontFamily();
      overlay.style.fontFamily = font;
      title.style.fontFamily = font;
      input.style.fontFamily = font;
      saveButton.style.fontFamily = font;
      cancelButton.style.fontFamily = font;
      title.textContent = this.renameTarget === "farm"
        ? (myanmar ? "လယ်ယာအမည် ပြောင်းရန်" : "Rename your farm")
        : (myanmar ? "လယ်သမားအမည် ပြောင်းရန်" : "Rename your farmer");
      saveButton.textContent = myanmar ? "သိမ်းရန်" : "SAVE NAME";
      cancelButton.textContent = myanmar ? "မလုပ်တော့ပါ" : "CANCEL";
    };

    cancelButton.addEventListener("click", () => {
      overlay.style.display = "none";
      this.restoreGameKeyboard();
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      const maxLength = this.renameTarget === "farm" ? 24 : 16;
      const cleanedName = input.value.trim().replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, maxLength);
      if (!cleanedName) { input.focus(); return; }
      if (this.renameTarget === "farm") this.farmName = cleanedName;
      else this.playerName = cleanedName;
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

  private createCharacterCreationOverlay(): void {
    if (this.characterCreationOverlay) return;
    const host = document.getElementById("game-container");
    if (!host) return;

    const overlay = document.createElement("div");
    overlay.className = "character-creation-overlay";

    const card = document.createElement("form");
    card.className = "character-creation-card";
    card.noValidate = true;

    const title = document.createElement("h2");
    title.className = "character-creation-title";
    const subtitle = document.createElement("p");
    subtitle.className = "character-creation-subtitle";

    const previewWrap = document.createElement("div");
    previewWrap.className = "character-creation-preview";
    const preview = document.createElement("img");
    preview.alt = "Character preview";
    previewWrap.append(preview);

    const genderLabel = document.createElement("label");
    genderLabel.className = "character-creation-label";
    const genderRow = document.createElement("div");
    genderRow.className = "character-creation-row";
    const maleButton = document.createElement("button");
    maleButton.type = "button";
    maleButton.className = "character-creation-choice";
    const femaleButton = document.createElement("button");
    femaleButton.type = "button";
    femaleButton.className = "character-creation-choice";
    genderRow.append(maleButton, femaleButton);

    const outfitLabel = document.createElement("label");
    outfitLabel.className = "character-creation-label";
    const outfitRow = document.createElement("div");
    outfitRow.className = "character-creation-row";
    const swatches = ["#4c8c62", "#477caf", "#a84d3e", "#79559c"];
    const outfitButtons = this.outfits.map((_, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "character-creation-color";
      button.style.setProperty("--swatch", swatches[index]);
      button.dataset.index = String(index);
      outfitRow.append(button);
      return button;
    });

    const nameLabel = document.createElement("label");
    nameLabel.className = "character-creation-label";
    const input = document.createElement("input");
    input.className = "character-creation-name";
    input.type = "text";
    input.maxLength = 16;
    input.required = true;
    input.autocomplete = "off";
    input.autocapitalize = "words";
    input.spellcheck = false;
    input.value = this.playerName;

    const farmNameLabel = document.createElement("label");
    farmNameLabel.className = "character-creation-label";
    const farmNameInput = document.createElement("input");
    farmNameInput.className = "character-creation-name";
    farmNameInput.type = "text";
    farmNameInput.maxLength = 24;
    farmNameInput.required = true;
    farmNameInput.autocomplete = "off";
    farmNameInput.autocapitalize = "words";
    farmNameInput.spellcheck = false;
    farmNameInput.value = this.farmName;

    for (const textInput of [input, farmNameInput]) {
      textInput.addEventListener("keydown", event => event.stopPropagation());
      textInput.addEventListener("keyup", event => event.stopPropagation());
      textInput.addEventListener("keypress", event => event.stopPropagation());
    }

    const actions = document.createElement("div");
    actions.className = "character-creation-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "character-creation-cancel";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "character-creation-submit";
    const note = document.createElement("p");
    note.className = "character-creation-note";

    maleButton.addEventListener("click", () => this.selectGender("male"));
    femaleButton.addEventListener("click", () => this.selectGender("female"));
    outfitButtons.forEach((button, index) => button.addEventListener("click", () => this.selectOutfit(index)));

    cancel.addEventListener("click", () => {
      overlay.classList.remove("is-open");
      this.isOpen = false;
      this.ui.close("profile");
      const cancelAction = this.characterCreationCancel;
      this.characterCreationComplete = undefined;
      this.characterCreationCancel = undefined;
      cancelAction?.();
    });

    card.addEventListener("submit", event => {
      event.preventDefault();
      const cleanedName = input.value.trim().replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, 16);
      const cleanedFarmName = farmNameInput.value.trim().replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, 24);
      if (!cleanedName) {
        note.textContent = this.language.getLanguage() === "my" ? "အမည်တစ်ခု ထည့်ပေးပါ။" : "Please enter a character name.";
        input.focus();
        return;
      }
      if (!cleanedFarmName) {
        note.textContent = this.language.getLanguage() === "my" ? "လယ်ယာအမည်တစ်ခု ထည့်ပေးပါ။" : "Please enter a farm name.";
        farmNameInput.focus();
        return;
      }
      this.playerName = cleanedName;
      this.farmName = cleanedFarmName;
      this.updateProfileDisplay();
      overlay.classList.remove("is-open");
      this.isOpen = false;
      this.ui.close("profile");
      const complete = this.characterCreationComplete;
      this.characterCreationComplete = undefined;
      this.characterCreationCancel = undefined;
      complete?.();
    });

    actions.append(cancel, submit);
    card.append(
      title, subtitle, previewWrap, genderLabel, genderRow, outfitLabel, outfitRow,
      nameLabel, input, farmNameLabel, farmNameInput, actions, note
    );
    overlay.append(card);
    host.append(overlay);

    this.characterCreationOverlay = overlay;
    this.characterCreationInput = input;
    this.characterCreationFarmInput = farmNameInput;
    this.characterCreationPreview = preview;
    this.characterCreationGenderButtons = [maleButton, femaleButton];
    this.characterCreationOutfitButtons = outfitButtons;

    const updateLabels = (): void => {
      const myanmar = this.language.getLanguage() === "my";
      const font = this.language.getFontFamily();
      card.style.fontFamily = font;
      title.style.fontFamily = font;
      subtitle.style.fontFamily = font;
      genderLabel.style.fontFamily = font;
      outfitLabel.style.fontFamily = font;
      nameLabel.style.fontFamily = font;
      farmNameLabel.style.fontFamily = font;
      input.style.fontFamily = font;
      farmNameInput.style.fontFamily = font;
      submit.style.fontFamily = font;
      cancel.style.fontFamily = font;
      note.style.fontFamily = font;
      maleButton.style.fontFamily = font;
      femaleButton.style.fontFamily = font;
      outfitButtons.forEach(button => button.style.fontFamily = font);
      title.textContent = myanmar ? "သင့်လယ်သမားကို ဖန်တီးပါ" : "CREATE YOUR FARMER";
      subtitle.textContent = myanmar ? "ဧရာဝတီမြစ်ဝှမ်းတွင် သင့်ခရီးစဉ်ကို စတင်ပါ" : "Choose your farmer and give your farm a name";
      genderLabel.textContent = myanmar ? "ဇာတ်ကောင်ကို ရွေးချယ်ပါ" : "CHOOSE YOUR CHARACTER";
      maleButton.textContent = myanmar ? "အမျိုးသား" : "MALE FARMER";
      femaleButton.textContent = myanmar ? "အမျိုးသမီး" : "FEMALE FARMER";
      outfitLabel.textContent = myanmar ? "အဝတ်အစား အရောင်" : "CHOOSE YOUR OUTFIT";
      outfitButtons.forEach((button, index) => {
        const labels = myanmar ? ["အစိမ်း", "အပြာ", "အနီ", "ခရမ်း"] : ["GREEN", "BLUE", "RED", "PURPLE"];
        button.textContent = labels[index];
      });
      nameLabel.textContent = myanmar ? "လယ်သမားအမည်" : "CHARACTER NAME";
      input.placeholder = myanmar ? "သင့်အမည်" : "Enter your character's name";
      farmNameLabel.textContent = myanmar ? "လယ်ယာအမည်" : "FARM NAME";
      farmNameInput.placeholder = myanmar ? "သင့်လယ်ယာအမည်" : "Name your farm";
      submit.textContent = myanmar ? "ခရီးစဉ် စတင်မည်" : "BEGIN YOUR JOURNEY";
      cancel.textContent = myanmar ? "မလုပ်တော့ပါ" : "CANCEL";
      note.textContent = myanmar ? "နောက်ပိုင်းတွင် Profile မှ အမည်နှင့် အဝတ်အစားကို ပြောင်းလဲနိုင်သည်။" : "You can change your character and farm names later from your Profile.";
    };

    this.language.onChange(updateLabels);
    updateLabels();
    this.updateCharacterCreationPreview();
  }

  private updateCharacterCreationPreview(): void {
    if (!this.characterCreationPreview) return;
    const assetFile = this.getCurrentPortraitAsset().replace(/_asset$/, "").replace(/^.*?characters\//, "");
    this.characterCreationPreview.src = `${import.meta.env.BASE_URL}assets/characters/${assetFile}.png`;
    this.characterCreationPreview.alt = this.gender === "female" ? "Female farmer preview" : "Male farmer preview";
    this.characterCreationGenderButtons.forEach((button, index) => {
      button.setAttribute("aria-pressed", String((index === 0 ? "male" : "female") === this.gender));
    });
    this.characterCreationOutfitButtons.forEach((button, index) => {
      button.setAttribute("aria-pressed", String(index === this.outfitIndex));
    });
  }

  private updateCharacterCreationLabels(): void {
    // Label text and font updates are registered when the overlay is created.
    this.updateCharacterCreationPreview();
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
    this.openNameEditor("player");
  };

  private renameFarm = (): void => {
    this.openNameEditor("farm");
  };

  private openNameEditor(target: "player" | "farm"): void {
    this.createRenameOverlay();
    if (!this.renameOverlay || !this.renameInput) return;
    this.renameTarget = target;
    this.renameInput.maxLength = target === "farm" ? 24 : 16;
    this.renameInput.value = target === "farm" ? this.farmName : this.playerName;
    const title = this.renameOverlay.querySelector("strong");
    if (title) {
      const myanmar = this.language.getLanguage() === "my";
      title.textContent = target === "farm"
        ? (myanmar ? "လယ်ယာအမည် ပြောင်းရန်" : "Rename your farm")
        : (myanmar ? "လယ်သမားအမည် ပြောင်းရန်" : "Rename your farmer");
    }
    this.suspendGameKeyboard();
    this.renameOverlay.style.display = "flex";
    this.renameInput.focus();
    this.renameInput.select();
  }

  private selectGender(gender: CharacterGender): void {
    this.gender = gender;
    this.applyOutfit();
    this.updateProfileDisplay();
  }

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

  /** Opens the mandatory first-world character setup and saves only after confirmation. */
  openCharacterCreation(onComplete: () => void, onCancel: () => void): void {
    this.characterCreationComplete = onComplete;
    this.characterCreationCancel = onCancel;
    this.createCharacterCreationOverlay();
    if (!this.characterCreationOverlay) {
      this.characterCreationComplete = undefined;
      this.characterCreationCancel = undefined;
      onComplete();
      return;
    }
    this.isOpen = true;
    this.ui.open("profile");
    this.characterCreationOverlay.classList.add("is-open");
    if (this.characterCreationInput) this.characterCreationInput.value = this.playerName;
    if (this.characterCreationFarmInput) this.characterCreationFarmInput.value = this.farmName;
    this.updateProfileDisplay();
  }

  isProfileOpen(): boolean {
    return this.isOpen;
  }

  mobileToggle(): void {
    if (this.isOpen) this.closeProfile();
    else if (!this.ui.hasActiveModal()) this.openProfile();
  }

  private closeProfile = (): void => {
    if (this.characterCreationOverlay?.classList.contains("is-open")) return;
    this.isOpen = false;
    if (this.renameOverlay) this.renameOverlay.style.display = "none";
    this.restoreGameKeyboard();
    this.ui.close("profile");
  };

  getSaveData(): PlayerProfileData {
    return {
      name: this.playerName,
      farmName: this.farmName,
      gender: this.gender,
      outfitIndex: this.outfitIndex
    };
  }

  loadSaveData(data: PlayerProfileData): void {
    const name = typeof data.name === "string"
      ? data.name.trim().replace(/[<>]/g, "").slice(0, 16)
      : "";

    this.playerName = name || "Farmer";
    const farmName = typeof data.farmName === "string"
      ? data.farmName.trim().replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, 24)
      : "";
    this.farmName = farmName || "My Farm";
    this.gender = data.gender === "female" ? "female" : "male";
    this.outfitIndex = Phaser.Math.Clamp(
      Math.floor(Number(data.outfitIndex) || 0),
      0,
      this.outfits.length - 1
    );

    this.applyOutfit();
    this.updateProfileDisplay();
  }
}
