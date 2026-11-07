
import Phaser from "phaser";
import { InventorySystem, type ItemType } from "./InventorySystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";

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

  private benchX = 435;
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
  private recipesText!: Phaser.GameObjects.Text;
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
      .setDisplaySize(120, 82)
      .setDepth(258);

    this.workbenchLabel = this.scene.add.text(
      this.benchX,
      166,
      this.language.t("craft.workbenchName"),
      {
        fontFamily: this.language.getFontFamily(),
        fontSize: "10px",
        color: "#fff3d3",
        backgroundColor: "#34271d",
        padding: { x: 5, y: 3 }
      }
    ).setOrigin(0.5).setDepth(259);
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
      192,
      this.language.t("craft.prompt"),
      {
        fontFamily: this.language.getFontFamily(),
        fontSize: "10px",
        color: "#f0d69e",
        backgroundColor: "#34271d",
        padding: { x: 5, y: 4 }
      }
    ).setOrigin(0.5).setDepth(160).setVisible(false);

    this.craftingPanel = this.scene.add.container(0, 0);
    this.craftingPanel.setScrollFactor(0);

    const background = this.scene.add.rectangle(320, 180, 480, 260, 0x34271d, 0.99);
    background.setStrokeStyle(3, 0xd6b36b);

    const border = this.scene.add.graphics();
    border.lineStyle(2, 0x79382e, 1);
    border.strokeRect(80, 50, 480, 260);

    this.titleText = this.scene.add.text(320, 68, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "18px",
      color: "#e6c47e"
    }).setOrigin(0.5);

    const workbenchPreview = this.scene.add.image(320, 119, "crafting_workbench_asset")
      .setDisplaySize(100, 68);

    this.recipesText = this.scene.add.text(105, 160, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#f5e8c6",
      lineSpacing: 6,
      wordWrap: { width: 430 }
    });

    this.materialText = this.scene.add.text(105, 228, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#d6b36b",
      lineSpacing: 4,
      wordWrap: { width: 430 }
    });

    this.resultText = this.scene.add.text(320, 278, "", {
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

    const closeHitArea = this.scene.add.rectangle(320, 300, 150, 24, 0x79382e, 0.01)
      .setInteractive({ useHandCursor: true });
    closeHitArea.on("pointerdown", this.closeCrafting);

    this.craftingPanel.add([
      background,
      border,
      this.titleText,
      workbenchPreview,
      this.recipesText,
      this.materialText,
      this.resultText,
      this.closeText,
      closeHitArea
    ]);

    this.updateInterface();
  }

  private updateInterface(): void {
    const font = this.language.getFontFamily();

    this.titleText.setText(this.language.t("craft.title"));
    this.recipesText.setText([
      this.language.t("craft.recipe1"),
      this.language.t("craft.recipe2"),
      this.language.t("craft.recipe3")
    ].join("\n\n"));

    this.closeText.setText(this.language.t("craft.close"));
    this.promptText.setText(this.language.t("craft.prompt"));
    this.workbenchLabel.setText(this.language.t("craft.workbenchName"));
    this.resultText.setText(this.language.t(this.resultKey));

    const wood = this.language.t("inventory.wood");
    const bamboo = this.language.t("inventory.bamboo");
    const herbs = this.language.t("inventory.herbs");
    const coconut = this.language.t("inventory.coconut");

    this.materialText.setText(
      `${wood}: ${this.inventory.getItemCount("Wood")}   ` +
      `${bamboo}: ${this.inventory.getItemCount("Bamboo")}\n` +
      `${herbs}: ${this.inventory.getItemCount("Herbs")}   ` +
      `${coconut}: ${this.inventory.getItemCount("Coconut")}\n` +
      `FENCES: ${this.crafted.woodenFence}   ` +
      `PLANTERS: ${this.crafted.bambooPlanter}   ` +
      `SIGNS: ${this.crafted.villageSign}`
    );

    for (const text of [
      this.titleText,
      this.recipesText,
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
      .setDisplaySize(42, 28)
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
      .setDisplaySize(34, 34)
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
      .setDisplaySize(44, 42)
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
    const nearBench = distance < 90;
    this.promptText.setVisible(nearBench);

    if (nearBench && Phaser.Input.Keyboard.JustDown(this.craftKey)) {
      this.openCrafting();
    }
  }
}
