
import Phaser from "phaser";
import { FarmingSystem } from "./FarmingSystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { pixelPanel } from "../ui/PixelUI";

export type ItemType = "Wood" | "Bamboo" | "Herbs" | "Coconut";

interface Collectible {
  item: ItemType;
  quantity: number;
  x: number;
  y: number;
  available: boolean;
  container: Phaser.GameObjects.Container;
}

interface ResourceSlot {
  translation: string;
  texture: string;
  x: number;
  y: number;
}

export class InventorySystem {
  private scene: Phaser.Scene;
  private farming: FarmingSystem;
  private ui: ModalUIManager;
  private language: LanguageSystem;

  private items: Record<ItemType, number> = {
    Wood: 0,
    Bamboo: 0,
    Herbs: 0,
    Coconut: 0
  };

  private collectibles: Collectible[] = [];

  private inventoryKey!: Phaser.Input.Keyboard.Key;
  private pickupKey!: Phaser.Input.Keyboard.Key;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private isOpen = false;

  private inventoryPanel!: Phaser.GameObjects.Container;
  private promptText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private resourceTitleText!: Phaser.GameObjects.Text;
  private equipmentTitleText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private closeText!: Phaser.GameObjects.Text;

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
    { translation: "inventory.wood", texture: "wood_bundle_asset", x: 155, y: 115 },
    { translation: "inventory.bamboo", texture: "bamboo_bundle_asset", x: 320, y: 115 },
    { translation: "inventory.herbs", texture: "herb_bunch_asset", x: 485, y: 115 },
    { translation: "inventory.coconut", texture: "coconut_asset", x: 155, y: 180 },
    { translation: "inventory.seeds", texture: "rice_seed_bag_asset", x: 320, y: 180 },
    { translation: "inventory.rice", texture: "rice_bowl_asset", x: 485, y: 180 }
  ];

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

    this.createCollectibles();
    this.createControls();
    this.createInterface();

    this.ui.registerPanel("inventory", this.inventoryPanel, 240, () => {
      this.isOpen = false;
    });

    this.ui.registerHud(this.promptText);
    this.language.onChange(() => this.updateInventoryDisplay());
  }

  private createCollectibles(): void {
    const resources: {
      item: ItemType;
      quantity: number;
      x: number;
      y: number;
      texture: string;
    }[] = [
      { item: "Wood", quantity: 3, x: 350, y: 490, texture: "wood_bundle_asset" },
      { item: "Bamboo", quantity: 2, x: 920, y: 445, texture: "bamboo_bundle_asset" },
      { item: "Herbs", quantity: 2, x: 250, y: 490, texture: "herb_bunch_asset" },
      { item: "Coconut", quantity: 1, x: 1110, y: 455, texture: "coconut_asset" },
      { item: "Bamboo", quantity: 3, x: 985, y: 465, texture: "bamboo_bundle_asset" },
      { item: "Herbs", quantity: 3, x: 1165, y: 490, texture: "herb_bunch_asset" },
      { item: "Wood", quantity: 3, x: 1390, y: 365, texture: "wood_bundle_asset" },
      { item: "Coconut", quantity: 2, x: 1395, y: 475, texture: "coconut_asset" }
    ];

    for (const resource of resources) {
      const shadow = this.scene.add.ellipse(0, 12, 27, 8, 0x34271d, 0.2);
      const image = this.scene.add.image(0, 0, resource.texture)
        .setScale(2);

      const container = this.scene.add.container(resource.x, resource.y, [shadow, image]);
      container.setDepth(resource.y);

      this.collectibles.push({
        item: resource.item,
        quantity: resource.quantity,
        x: resource.x,
        y: resource.y,
        available: true,
        container
      });
    }
  }

  private createControls(): void {
    const keyboard = this.scene.input.keyboard!;
    this.inventoryKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.pickupKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
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
      this.closeInventory();
    }
  };

  private createInterface(): void {
    this.promptText = this.scene.add.text(0, 0, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#f0d69e",
      backgroundColor: "#34271d",
      padding: { x: 5, y: 4 }
    }).setOrigin(0.5).setDepth(160).setVisible(false);

    this.inventoryPanel = this.scene.add.container(0, 0);
    this.inventoryPanel.setScrollFactor(0);

    const background = pixelPanel(this.scene, 320, 180, 540, 310, { fill: 0x34271d, alpha: 1 });

    const border = this.scene.add.graphics();
    border.lineStyle(2, 0x79382e, 1);
    border.strokeRect(50, 24, 540, 310);

    this.titleText = this.scene.add.text(320, 39, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "18px",
      color: "#e6c47e"
    }).setOrigin(0.5);

    this.resourceTitleText = this.scene.add.text(320, 77, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "11px",
      color: "#d6b36b"
    }).setOrigin(0.5);

    this.inventoryPanel.add([background, border, this.titleText, this.resourceTitleText]);

    this.itemDefinitions.forEach((slot, index) => {
      const slotBackground = this.scene.add.rectangle(
        slot.x,
        slot.y,
        150,
        53,
        index % 2 === 0 ? 0x40513a : 0x493629,
        1
      );
      slotBackground.setStrokeStyle(1, 0x9b7047);

      const icon = this.scene.add.image(slot.x - 51, slot.y, slot.texture)
        .setScale(2);

      const name = this.scene.add.text(slot.x - 29, slot.y - 9, "", {
        fontFamily: this.language.getFontFamily(),
        fontSize: "9px",
        color: "#ffffff"
      }).setOrigin(0, 0.5);

      const quantity = this.scene.add.text(slot.x - 29, slot.y + 11, "", {
        fontFamily: this.language.getFontFamily(),
        fontSize: "9px",
        color: "#e6c47e"
      }).setOrigin(0, 0.5);

      this.itemNameTexts.push(name);
      this.itemValueTexts.push(quantity);
      this.inventoryPanel.add([slotBackground, icon, name, quantity]);
    });

    this.equipmentTitleText = this.scene.add.text(320, 225, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#d6b36b"
    }).setOrigin(0.5);
    this.inventoryPanel.add(this.equipmentTitleText);

    const toolPositions = [140, 260, 380, 500];
    this.equipment.forEach((tool, index) => {
      const backgroundSlot = this.scene.add.rectangle(
        toolPositions[index],
        260,
        105,
        37,
        0x493629,
        1
      );
      backgroundSlot.setStrokeStyle(1, 0x9b7047);
      backgroundSlot.setInteractive({ useHandCursor: true });
      backgroundSlot.on("pointerdown", () => {
        this.farming.mobileSelectTool(index);
        this.updateEquipmentDisplay();
      });

      const icon = this.scene.add.image(toolPositions[index] - 31, 260, tool.texture)
        .setScale(1);

      const label = this.scene.add.text(
        toolPositions[index] + 5,
        260,
        "",
        {
          fontFamily: this.language.getFontFamily(),
          fontSize: "8px",
          color: "#ffffff"
        }
      ).setOrigin(0.5);

      this.equipmentBackgrounds.push(backgroundSlot);
      this.equipmentLabels.push(label);
      this.inventoryPanel.add([backgroundSlot, icon, label]);
    });

    this.instructionText = this.scene.add.text(320, 295, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "8px",
      color: "#d6e6c2",
      align: "center",
      wordWrap: { width: 490 }
    }).setOrigin(0.5);

    this.closeText = this.scene.add.text(320, 319, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#e6c47e"
    }).setOrigin(0.5);

    const closeHitArea = this.scene.add.rectangle(320, 319, 190, 25, 0x79382e, 0.01)
      .setInteractive({ useHandCursor: true });
    closeHitArea.on("pointerdown", this.closeInventory);

    this.inventoryPanel.add([this.instructionText, this.closeText, closeHitArea]);
    this.updateInventoryDisplay();
  }

  private updateInventoryDisplay(): void {
    const font = this.language.getFontFamily();

    this.titleText.setText(this.language.t("inventory.title"));
    this.resourceTitleText.setText(this.language.t("inventory.resources"));
    this.equipmentTitleText.setText(this.language.t("inventory.equipment"));
    this.instructionText.setText(
      this.language.t("inventory.instructions")
    );
    this.closeText.setText(this.language.t("inventory.close"));

    const quantities = [
      this.items.Wood,
      this.items.Bamboo,
      this.items.Herbs,
      this.items.Coconut,
      this.farming.getSeeds(),
      this.farming.getRice()
    ];

    this.itemDefinitions.forEach((slot, index) => {
      this.itemNameTexts[index].setText(this.language.t(slot.translation));
      this.itemValueTexts[index].setText(
        this.language.t("inventory.quantity", { amount: quantities[index] })
      );
      this.itemNameTexts[index].setFontFamily(font);
      this.itemValueTexts[index].setFontFamily(font);
    });

    for (const text of [
      this.titleText,
      this.resourceTitleText,
      this.equipmentTitleText,
      this.instructionText,
      this.closeText
    ]) {
      text.setFontFamily(font);
    }

    this.updateEquipmentDisplay();
  }

  private updateEquipmentDisplay(): void {
    const selectedTool = this.farming.getSelectedTool().toLowerCase();

    this.equipment.forEach((tool, index) => {
      const selected = tool.tool === selectedTool;
      this.equipmentBackgrounds[index].setFillStyle(selected ? 0x79382e : 0x493629, 1);
      this.equipmentBackgrounds[index].setStrokeStyle(
        selected ? 2 : 1,
        selected ? 0xe6c47e : 0x9b7047
      );
      this.equipmentLabels[index].setText(
        `${tool.key} ${this.language.t(tool.name)}${selected ? " *" : ""}`
      );
      this.equipmentLabels[index].setFontFamily(this.language.getFontFamily());
    });
  }

  private openInventory(): void {
    this.isOpen = true;
    this.updateInventoryDisplay();
    this.ui.open("inventory");
    this.promptText.setVisible(false);
  }

  private closeInventory = (): void => {
    this.isOpen = false;
    this.ui.close("inventory");
    this.inventoryKey.reset();
    this.escapeKey.reset();
  };

  private findNearestCollectible(playerX: number, playerY: number): Collectible | null {
    let nearest: Collectible | null = null;
    let shortestDistance = 55;

    for (const collectible of this.collectibles) {
      if (!collectible.available) continue;
      const distance = Phaser.Math.Distance.Between(
        playerX,
        playerY,
        collectible.x,
        collectible.y
      );
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearest = collectible;
      }
    }

    return nearest;
  }

  private collectItem(item: Collectible): void {
    this.items[item.item] += item.quantity;
    item.available = false;
    item.container.setVisible(false);
    this.updateInventoryDisplay();

    this.promptText.setText(
      this.language.t("inventory.collected", {
        amount: item.quantity,
        item: this.language.t(`inventory.${item.item.toLowerCase()}`)
      })
    );
  }

  getItemCount(item: ItemType): number {
    return this.items[item];
  }

  hasMaterials(materials: Partial<Record<ItemType, number>>): boolean {
    return (Object.entries(materials) as [ItemType, number][]).every(
      ([item, quantity]) => this.items[item] >= quantity
    );
  }

  removeMaterials(materials: Partial<Record<ItemType, number>>): boolean {
    if (!this.hasMaterials(materials)) return false;
    for (const [item, quantity] of Object.entries(materials) as [ItemType, number][]) {
      this.items[item] -= quantity;
    }
    this.updateInventoryDisplay();
    return true;
  }

  getSaveData() {
    return {
      items: { ...this.items },
      collected: this.collectibles.map(collectible => !collectible.available)
    };
  }

  loadSaveData(data: {
    items: Record<ItemType, number>;
    collected: boolean[];
  }): void {
    const itemTypes: ItemType[] = ["Wood", "Bamboo", "Herbs", "Coconut"];
    for (const item of itemTypes) {
      this.items[item] = Math.max(0, Math.floor(Number(data.items?.[item]) || 0));
    }

    this.collectibles.forEach((collectible, index) => {
      const collected = data.collected?.[index] === true;
      collectible.available = !collected;
      collectible.container.setVisible(!collected);
    });

    this.updateInventoryDisplay();
  }

  isInventoryOpen(): boolean {
    return this.isOpen;
  }

  mobileToggle(): void {
    if (this.isOpen) this.closeInventory();
    else if (!this.ui.hasActiveModal()) this.openInventory();
  }

  mobilePickup(playerX: number, playerY: number): void {
    if (this.ui.hasActiveModal()) return;
    const nearest = this.findNearestCollectible(playerX, playerY);
    if (nearest) this.collectItem(nearest);
  }

  update(playerX: number, playerY: number): void {
    if (this.isOpen) {
      if (Phaser.Input.Keyboard.JustDown(this.inventoryKey)) this.closeInventory();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.inventoryKey)) {
      this.openInventory();
      return;
    }

    const nearest = this.findNearestCollectible(playerX, playerY);
    if (!nearest) {
      this.promptText.setVisible(false);
      return;
    }

    this.promptText.setPosition(nearest.x, nearest.y - 34);
    this.promptText.setText(
      this.language.t("inventory.collect", {
        item: this.language.t(`inventory.${nearest.item.toLowerCase()}`)
      })
    );
    this.promptText.setVisible(true);

    if (Phaser.Input.Keyboard.JustDown(this.pickupKey)) {
      this.collectItem(nearest);
    }
  }
}
