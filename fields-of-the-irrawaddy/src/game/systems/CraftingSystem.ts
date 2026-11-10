
import Phaser from "phaser";
import { InventorySystem, type ItemType } from "./InventorySystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { pixelPanel } from "../ui/PixelUI";

type RecipeCost = Partial<Record<ItemType, number>>;

interface CraftingSaveData {
  woodenFence: number;
  bambooPlanter: number;
  villageSign: number;
}

export class CraftingSystem {
  private scene: Phaser.Scene;
  private inventory: InventorySystem;
  private ui: ModalUIManager;
  private language: LanguageSystem;

  private benchX = 440;
  private benchY = 250;
  private isOpen = false;

  private craftKey!: Phaser.Input.Keyboard.Key;
  private oneKey!: Phaser.Input.Keyboard.Key;
  private twoKey!: Phaser.Input.Keyboard.Key;
  private threeKey!: Phaser.Input.Keyboard.Key;

  private craftingPanel!: Phaser.GameObjects.Container;
  private promptText!: Phaser.GameObjects.Text;
  private workbenchLabel!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private recipeTexts: Phaser.GameObjects.Text[] = [];
  private materialText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private closeText!: Phaser.GameObjects.Text;

  private resultKey = "craft.choose";

  private crafted = {
    woodenFence: 0,
    bambooPlanter: 0,
    villageSign: 0
  };

  private craftedObjects: Phaser.GameObjects.GameObject[] = [];

  private recipes: Record<number, RecipeCost> = {
    1: { Wood: 3 },
    2: { Bamboo: 2, Herbs: 1 },
    3: { Wood: 2, Bamboo: 1 }
  };

  constructor(
    scene: Phaser.Scene,
    inventory: InventorySystem,
    ui: ModalUIManager,
    language: LanguageSystem
  ) {
    this.scene = scene;
    this.inventory = inventory;
    this.ui = ui;
    this.language = language;

    this.createWorkbench();
    this.createControls();
    this.createInterface();

    this.ui.registerPanel("crafting", this.craftingPanel, 260, () => {
      this.isOpen = false;
      this.craftKey.reset();
      this.oneKey.reset();
      this.twoKey.reset();
      this.threeKey.reset();
    });

    this.ui.registerHud(this.promptText);
    this.language.onChange(() => this.updateInterface());
  }

  private createWorkbench(): void {
    this.scene.add.image(this.benchX, 258, "crafting_workbench_asset")
      .setOrigin(0.5, 1)
      .setScale(2)
      .setDepth(258);

    this.workbenchLabel = this.scene.add.text(
      this.benchX,
      224,
      this.language.t("craft.workbenchName"),
      {
        fontFamily: this.language.getFontFamily(),
        fontSize: "10px",
        color: "#fff3d3",
        backgroundColor: "#34271d",
        padding: { x: 5, y: 3 }
      }
    ).setOrigin(0.5).setDepth(259).setVisible(false);
  }

  private createControls(): void {
    const keyboard = this.scene.input.keyboard!;
    this.craftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.oneKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.twoKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.threeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);

    window.addEventListener("keydown", this.handleWindowKeyDown, true);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("keydown", this.handleWindowKeyDown, true);
    });
  }

  private handleWindowKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.isOpen) {
      event.preventDefault();
      event.stopPropagation();
      this.closeCrafting();
    }
  };

  private createInterface(): void {
    this.promptText = this.scene.add.text(
      this.benchX,
      158,
      `${this.language.t("craft.workbenchName")} · C`,
      {
        fontFamily: this.language.getFontFamily(),
        fontSize: "10px",
        color: "#f0d69e",
        backgroundColor: "#34271d",
        padding: { x: 5, y: 4 }
      }
    ).setOrigin(0.5).setDepth(260).setVisible(false);

    this.craftingPanel = this.scene.add.container(0, 0);
    this.craftingPanel.setScrollFactor(0);

    const background = pixelPanel(this.scene, 320, 180, 500, 290, { fill: 0x2d3829, alpha: 1 });

    const divider = this.scene.add.rectangle(320, 84, 450, 2, 0x9b7047, 0.8);

    this.titleText = this.scene.add.text(320, 55, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "18px",
      color: "#e6c47e",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const workbenchPreview = this.scene.add.image(320, 113, "crafting_workbench_asset")
      .setScale(1);

    this.craftingPanel.add([background, divider, this.titleText, workbenchPreview]);

    const recipeRows = [160, 188, 216];
    recipeRows.forEach((y, index) => {
      const card = this.scene.add.rectangle(320, y, 430, 24, index === 1 ? 0x493629 : 0x40513a, 1);
      card.setStrokeStyle(1, 0x9b7047);
      card.setInteractive({ useHandCursor: true });
      card.on("pointerdown", () => this.craftItem(index + 1));
      card.on("pointerover", () => card.setFillStyle(0x58734b, 1));
      card.on("pointerout", () => card.setFillStyle(index === 1 ? 0x493629 : 0x40513a, 1));

      const recipeText = this.scene.add.text(115, y, "", {
        fontFamily: this.language.getFontFamily(),
        fontSize: "9px",
        color: "#fff1cf",
        fontStyle: "bold"
      }).setOrigin(0, 0.5);

      this.recipeTexts.push(recipeText);
      this.craftingPanel.add([card, recipeText]);
    });

    this.materialText = this.scene.add.text(105, 239, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "8px",
      color: "#d6b36b",
      lineSpacing: 4,
      wordWrap: { width: 430 }
    });

    this.resultText = this.scene.add.text(320, 288, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#d7e6c5",
      align: "center",
      wordWrap: { width: 420 }
    }).setOrigin(0.5);

    const closeBackground = this.scene.add.rectangle(320, 316, 145, 22, 0x79382e, 1);
    closeBackground.setStrokeStyle(1, 0xd6b36b);
    closeBackground.setInteractive({ useHandCursor: true });
    closeBackground.on("pointerdown", this.closeCrafting);

    this.closeText = this.scene.add.text(320, 316, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#fff1cf",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.craftingPanel.add([
      this.materialText,
      this.resultText,
      closeBackground,
      this.closeText
    ]);
    this.updateInterface();
  }

  private updateInterface(): void {
    const font = this.language.getFontFamily();

    this.titleText.setText(this.language.t("craft.title"));
    ["craft.recipe1", "craft.recipe2", "craft.recipe3"].forEach((key, index) => {
      this.recipeTexts[index].setText(this.language.t(key));
      this.recipeTexts[index].setFontFamily(font);
    });

    this.closeText.setText(this.language.t("craft.close"));
    this.promptText.setText(`${this.language.t("craft.workbenchName")} · C`);
    this.workbenchLabel.setText(this.language.t("craft.workbenchName"));
    this.resultText.setText(this.language.t(this.resultKey));

    const wood = this.language.t("inventory.wood");
    const bamboo = this.language.t("inventory.bamboo");
    const herbs = this.language.t("inventory.herbs");
    const coconut = this.language.t("inventory.coconut");

    const materialsLabel = this.language.t("craft.materials");
    const craftedLabel = this.language.t("craft.built");
    const fencesLabel = this.language.t("craft.fences");
    const plantersLabel = this.language.t("craft.planters");
    const signsLabel = this.language.t("craft.signs");
    this.materialText.setText(
      `${materialsLabel}  ${wood}: ${this.inventory.getItemCount("Wood")}   ` +
      `${bamboo}: ${this.inventory.getItemCount("Bamboo")}   ` +
      `${herbs}: ${this.inventory.getItemCount("Herbs")}   ${coconut}: ${this.inventory.getItemCount("Coconut")}\n` +
      `${craftedLabel}  ${fencesLabel}: ${this.crafted.woodenFence}/5   ${plantersLabel}: ${this.crafted.bambooPlanter}/3   ${signsLabel}: ${this.crafted.villageSign}/1`
    );

    for (const text of [
      this.titleText,
      this.materialText,
      this.resultText,
      this.closeText,
      this.promptText,
      this.workbenchLabel
    ]) {
      text.setFontFamily(font);
    }
  }

  private setResult(key: string): void {
    this.resultKey = key;
    this.resultText.setText(this.language.t(key));
  }

  private openCrafting(): void {
    this.isOpen = true;
    this.ui.open("crafting");
    this.setResult("craft.choose");
    this.updateInterface();
    this.promptText.setVisible(false);
  }

  private closeCrafting = (): void => {
    this.isOpen = false;
    this.ui.close("crafting");
    this.craftKey.reset();
    this.oneKey.reset();
    this.twoKey.reset();
    this.threeKey.reset();
  };

  private craftFence(): void {
    if (this.crafted.woodenFence >= 5) {
      this.setResult("craft.fenceFull");
      return;
    }
    if (!this.inventory.removeMaterials(this.recipes[1])) {
      this.setResult("craft.noWood");
      return;
    }

    const index = this.crafted.woodenFence++;
    this.createFence(385 + index * 42, 292);
    this.setResult("craft.fenceDone");
    this.updateInterface();
  }

  private createFence(x: number, y: number): void {
    const fence = this.scene.add.image(x, y, "bamboo_fence_asset")
      .setOrigin(0.5, 1)
      .setScale(2)
      .setDepth(y);
    this.craftedObjects.push(fence);
  }

  private craftPlanter(): void {
    if (this.crafted.bambooPlanter >= 3) {
      this.setResult("craft.planterFull");
      return;
    }
    if (!this.inventory.removeMaterials(this.recipes[2])) {
      this.setResult("craft.noPlanter");
      return;
    }

    const index = this.crafted.bambooPlanter++;
    this.createPlanter(410 + index * 42, 260);
    this.setResult("craft.planterDone");
    this.updateInterface();
  }

  private createPlanter(x: number, y: number): void {
    const planter = this.scene.add.image(x, y, "bamboo_planter_asset")
      .setScale(2)
      .setDepth(y);
    this.craftedObjects.push(planter);
  }

  private craftSign(): void {
    if (this.crafted.villageSign >= 1) {
      this.setResult("craft.signFull");
      return;
    }
    if (!this.inventory.removeMaterials(this.recipes[3])) {
      this.setResult("craft.noSign");
      return;
    }

    this.crafted.villageSign = 1;
    this.createVillageSign(535, 275);
    this.setResult("craft.signDone");
    this.updateInterface();
  }

  private createVillageSign(x: number, y: number): void {
    const sign = this.scene.add.image(x, y, "village_sign_asset")
      .setOrigin(0.5, 1)
      .setScale(2)
      .setDepth(y);

    const label = this.scene.add.text(
      x,
      y - 26,
      this.language.getLanguage() === "my" ? "ရွာ" : "VILLAGE",
      {
        fontFamily: this.language.getFontFamily(),
        fontSize: "7px",
        color: "#fff4d6",
        backgroundColor: "#68452e",
        padding: { x: 2, y: 1 }
      }
    ).setOrigin(0.5).setDepth(y + 1);

    this.craftedObjects.push(sign, label);
    this.language.onChange(() => {
      label.setText(this.language.getLanguage() === "my" ? "ရွာ" : "VILLAGE");
      label.setFontFamily(this.language.getFontFamily());
    });
  }

  private craftItem(recipe: number): void {
    if (recipe === 1) this.craftFence();
    if (recipe === 2) this.craftPlanter();
    if (recipe === 3) this.craftSign();
  }

  getSaveData(): CraftingSaveData {
    return { ...this.crafted };
  }

  loadSaveData(data: CraftingSaveData): void {
    for (const object of this.craftedObjects) object.destroy();
    this.craftedObjects = [];

    this.crafted.woodenFence = Phaser.Math.Clamp(Math.floor(Number(data.woodenFence) || 0), 0, 5);
    this.crafted.bambooPlanter = Phaser.Math.Clamp(Math.floor(Number(data.bambooPlanter) || 0), 0, 3);
    this.crafted.villageSign = Phaser.Math.Clamp(Math.floor(Number(data.villageSign) || 0), 0, 1);

    for (let i = 0; i < this.crafted.woodenFence; i++) this.createFence(385 + i * 42, 292);
    for (let i = 0; i < this.crafted.bambooPlanter; i++) this.createPlanter(410 + i * 42, 260);
    if (this.crafted.villageSign > 0) this.createVillageSign(535, 275);

    this.updateInterface();
  }

  isCraftingOpen(): boolean {
    return this.isOpen;
  }

  mobileInteract(playerX: number, playerY: number): boolean {
    if (this.isOpen) {
      this.closeCrafting();
      return true;
    }

    if (this.ui.hasActiveModal()) return false;
    const distance = Phaser.Math.Distance.Between(playerX, playerY, this.benchX, this.benchY);
    if (distance < 75) {
      this.openCrafting();
      return true;
    }

    return false;
  }

  update(playerX: number, playerY: number): void {
    if (this.isOpen) {
      if (Phaser.Input.Keyboard.JustDown(this.craftKey)) {
        this.closeCrafting();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.oneKey)) this.craftItem(1);
      if (Phaser.Input.Keyboard.JustDown(this.twoKey)) this.craftItem(2);
      if (Phaser.Input.Keyboard.JustDown(this.threeKey)) this.craftItem(3);
      return;
    }

    const distance = Phaser.Math.Distance.Between(playerX, playerY, this.benchX, this.benchY);
    const nearBench = distance < 75;
    this.promptText.setVisible(nearBench);
    this.workbenchLabel.setVisible(false);
    this.promptText.setText(`${this.language.t("craft.workbenchName")} · C`);

    if (nearBench && Phaser.Input.Keyboard.JustDown(this.craftKey)) {
      this.openCrafting();
    }
  }
}
