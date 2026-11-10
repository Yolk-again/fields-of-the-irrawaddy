import Phaser from "phaser";
import { FarmingSystem } from "./FarmingSystem";
import { FishingSystem } from "./FishingSystem";
import { CookingSystem } from "./CookingSystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, modalPanel } from "../ui/PixelUI";

interface ResourceSlot {
  translation: string;
  texture: string;
  x: number;
  y: number;
  value: () => string;
}

/** Backpack for farm, fishing, and cooked food resources. */
export class InventorySystem {
  private scene: Phaser.Scene;
  private farming: FarmingSystem;
  private fishing: FishingSystem;
  private cooking: CookingSystem;
  private ui: ModalUIManager;
  private language: LanguageSystem;

  private isOpen = false;
  private inventoryPanel!: Phaser.GameObjects.Container;
  private closeButton!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private resourceTitleText!: Phaser.GameObjects.Text;
  private equipmentTitleText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private exitHintText!: Phaser.GameObjects.Text;
  private itemNameTexts: Phaser.GameObjects.Text[] = [];
  private itemValueTexts: Phaser.GameObjects.Text[] = [];
  private equipmentBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  private equipmentLabels: Phaser.GameObjects.Text[] = [];

  private equipment = [
    { key: "1", name: "farm.hoe", tool: "hoe", texture: "hoe_asset" },
    { key: "2", name: "farm.seedTool", tool: "seeds", texture: "rice_seed_bag_asset" },
    { key: "3", name: "farm.water", tool: "water", texture: "watering_can_asset" },
    { key: "4", name: "farm.harvest", tool: "harvest", texture: "sickle_asset" }
  ];

  private itemDefinitions: ResourceSlot[] = [
    { translation: "inventory.seeds", texture: "rice_seed_bag_asset", x: 205, y: 99, value: () => String(this.farming.getSeeds()) },
    { translation: "inventory.rice", texture: "rice_bowl_asset", x: 435, y: 99, value: () => String(this.farming.getRice()) },
    { translation: "inventory.fish", texture: "fish_silver_barb_asset", x: 205, y: 143, value: () => String(this.fishing.getFishTotal()) },
    { translation: "inventory.meals", texture: "meal_fish_rice_asset", x: 435, y: 143, value: () => String(this.cooking.getTotalMeals()) },
    { translation: "inventory.rod", texture: "fishing_rod_asset", x: 205, y: 187, value: () => this.fishing.getHasRod() ? this.language.t("inventory.owned") : this.language.t("inventory.notOwned") },
    { translation: "inventory.fishVariety", texture: "fish_catfish_asset", x: 435, y: 187, value: () => {
      const counts = this.fishing.getFishCounts();
      return this.language.t("inventory.fishVarietyValue", {
        barb: counts.silverBarb, catfish: counts.catfish, carp: counts.goldenCarp
      });
    } }
  ];

  constructor(
    scene: Phaser.Scene,
    farming: FarmingSystem,
    fishing: FishingSystem,
    cooking: CookingSystem,
    ui: ModalUIManager,
    language: LanguageSystem
  ) {
    this.scene = scene;
    this.farming = farming;
    this.fishing = fishing;
    this.cooking = cooking;
    this.ui = ui;
    this.language = language;

    this.createControls();
    this.createInterface();
    this.ui.registerPanel("inventory", this.inventoryPanel, 240, () => { this.isOpen = false; }, this.closeButton);
    this.language.onChange(() => this.updateInventoryDisplay());
  }

  private createControls(): void {
    window.addEventListener("keydown", this.handleWindowKeyDown, true);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("keydown", this.handleWindowKeyDown, true);
    });
  }

  private handleWindowKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.isOpen) {
      event.preventDefault();
      event.stopPropagation();
      this.closeInventory();
    }
  };

  private createInterface(): void {
    this.inventoryPanel = this.scene.add.container(0, 0).setScrollFactor(0);
    const background = modalPanel(this.scene, 320, 180, 540, 330);
    this.titleText = this.scene.add.text(320, 35, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "18px", color: "#e6c47e"
    }).setOrigin(0.5);
    this.resourceTitleText = this.scene.add.text(320, 66, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#d6b36b"
    }).setOrigin(0.5);
    this.inventoryPanel.add([background, this.titleText, this.resourceTitleText]);

    this.itemDefinitions.forEach((slot, index) => {
      const slotBackground = this.scene.add.rectangle(slot.x, slot.y, 198, 37, index % 2 === 0 ? 0x40513a : 0x3d4b34, 1)
        .setStrokeStyle(1, 0x9b7047);
      const icon = this.scene.add.image(slot.x - 78, slot.y, slot.texture).setScale(1.45);
      const name = this.scene.add.text(slot.x - 54, slot.y - 7, "", {
        fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#ffffff"
      }).setOrigin(0, 0.5);
      const quantity = this.scene.add.text(slot.x - 54, slot.y + 8, "", {
        fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#e6c47e"
      }).setOrigin(0, 0.5);
      this.itemNameTexts.push(name);
      this.itemValueTexts.push(quantity);
      this.inventoryPanel.add([slotBackground, icon, name, quantity]);
    });

    this.equipmentTitleText = this.scene.add.text(320, 224, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#d6b36b"
    }).setOrigin(0.5);
    this.inventoryPanel.add(this.equipmentTitleText);

    const toolPositions = [140, 260, 380, 500];
    this.equipment.forEach((tool, index) => {
      const backgroundSlot = this.scene.add.rectangle(toolPositions[index], 254, 105, 34, 0x3d4b34, 1)
        .setStrokeStyle(1, 0x9b7047).setInteractive({ useHandCursor: true });
      backgroundSlot.on("pointerdown", () => {
        this.farming.mobileSelectTool(index);
        this.updateEquipmentDisplay();
      });
      const icon = this.scene.add.image(toolPositions[index] - 31, 254, tool.texture).setScale(0.95);
      const label = this.scene.add.text(toolPositions[index] + 5, 254, "", {
        fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#ffffff"
      }).setOrigin(0.5);
      this.equipmentBackgrounds.push(backgroundSlot);
      this.equipmentLabels.push(label);
      this.inventoryPanel.add([backgroundSlot, icon, label]);
    });

    this.instructionText = this.scene.add.text(320, 292, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#d6e6c2", align: "center",
      wordWrap: { width: 490 }
    }).setOrigin(0.5);
    this.exitHintText = this.scene.add.text(320, 318, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#d7e6c5"
    }).setOrigin(0.5);
    const closePosition = modalClosePosition(320, 180, 540, 330);
    this.closeButton = createRedCloseButton(this.scene, closePosition.x, closePosition.y);
    this.inventoryPanel.add([this.instructionText, this.exitHintText, this.closeButton]);
    this.updateInventoryDisplay();
  }

  private updateInventoryDisplay(): void {
    const font = this.language.getFontFamily();
    this.titleText.setText(this.language.t("inventory.title"));
    this.resourceTitleText.setText(this.language.t("inventory.resources"));
    this.equipmentTitleText.setText(this.language.t("inventory.equipment"));
    this.instructionText.setText(this.language.t("inventory.instructions"));
    this.exitHintText.setText(this.language.t("common.clickCrossExit"));

    this.itemDefinitions.forEach((slot, index) => {
      this.itemNameTexts[index].setText(this.language.t(slot.translation));
      this.itemValueTexts[index].setText(slot.value());
      this.itemNameTexts[index].setFontFamily(font);
      this.itemValueTexts[index].setFontFamily(font);
    });
    for (const text of [this.titleText, this.resourceTitleText, this.equipmentTitleText, this.instructionText, this.exitHintText]) {
      text.setFontFamily(font);
    }
    this.updateEquipmentDisplay();
  }

  private updateEquipmentDisplay(): void {
    const selectedTool = this.farming.getSelectedTool().toLowerCase();
    this.equipment.forEach((tool, index) => {
      const selected = tool.tool === selectedTool;
      this.equipmentBackgrounds[index].setFillStyle(selected ? 0x527044 : 0x3d4b34, 1);
      this.equipmentBackgrounds[index].setStrokeStyle(selected ? 2 : 1, selected ? 0xd6b36b : 0x9b7047);
      this.equipmentLabels[index].setText(`${tool.key} ${this.language.t(tool.name)}${selected ? " *" : ""}`);
      this.equipmentLabels[index].setFontFamily(this.language.getFontFamily());
    });
  }

  private openInventory(): void {
    this.isOpen = true;
    this.updateInventoryDisplay();
    this.ui.open("inventory");
  }

  private closeInventory = (): void => {
    this.isOpen = false;
    this.ui.close("inventory");
  };

  getSaveData(): { items: Record<string, number>; collected: boolean[] } {
    return { items: {}, collected: [] };
  }
  loadSaveData(_data: { items?: Record<string, number>; collected?: boolean[] }): void {
    this.updateInventoryDisplay();
  }
  isInventoryOpen(): boolean { return this.isOpen; }
  mobileToggle(): void {
    if (this.isOpen) this.closeInventory();
    else if (!this.ui.hasActiveModal()) this.openInventory();
  }
  update(_playerX: number, _playerY: number): void {
    // No loose pickup resources remain in the village.
    if (this.isOpen) this.updateInventoryDisplay();
  }
}
