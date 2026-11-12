import Phaser from "phaser";
import { FarmingSystem } from "./FarmingSystem";
import { FishingSystem } from "./FishingSystem";
import { CookingSystem } from "./CookingSystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, modalPanel } from "../ui/PixelUI";
import { INVENTORY_ITEM_DEFINITIONS, type InventoryItemId } from "../ui/InventoryItems";

type InventoryZone = "hotbar" | "backpack";
interface SlotAddress { zone: InventoryZone; index: number; }
interface InventoryCell {
  address: SlotAddress;
  x: number;
  y: number;
  width: number;
  height: number;
  background: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  amount: Phaser.GameObjects.Text;
  keyLabel?: Phaser.GameObjects.Text;
}
type InventorySaveData = {
  items: Record<string, number>;
  collected: boolean[];
  hotbarSlots?: Array<InventoryItemId | null>;
  backpackSlots?: Array<InventoryItemId | null>;
  selectedHotbarIndex?: number;
};

const HOTBAR_DEFAULT: Array<InventoryItemId | null> = ["hoe", "seeds", "water", "harvest"];
const BACKPACK_DEFAULT: Array<InventoryItemId | null> = Array(15).fill(null);
const ALL_ITEMS: InventoryItemId[] = ["hoe", "seeds", "tomatoSeeds", "greenBeanSeeds", "water", "harvest", "rice", "tomatoes", "greenBeans", "silverBarb", "catfish", "goldenCarp", "meals", "rod", "wormBait", "shrimpBait", "goldenCricketBait"];

/** Minecraft-inspired movable backpack and four-slot quick toolbar. */
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
  private hotbarTitleText!: Phaser.GameObjects.Text;
  private backpackTitleText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private exitHintText!: Phaser.GameObjects.Text;
  private seedPacketText!: Phaser.GameObjects.Text;
  private hotbarSlots: Array<InventoryItemId | null> = [...HOTBAR_DEFAULT];
  private backpackSlots: Array<InventoryItemId | null> = [...BACKPACK_DEFAULT];
  private cells: InventoryCell[] = [];
  private dragSource: SlotAddress | null = null;
  private dragTarget: SlotAddress | null = null;
  private lastCounts = new Map<InventoryItemId, number>();
  private dragPreviewBackground!: Phaser.GameObjects.Rectangle;
  private dragPreviewIcon!: Phaser.GameObjects.Image;
  private readonly defaultCanvasCursor = "default";

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
    this.ui.registerPanel("inventory", this.inventoryPanel, 240, () => {
      this.isOpen = false;
      this.dragSource = null;
      this.dragTarget = null;
      this.hideDragPreview();
      this.setCanvasCursor(this.defaultCanvasCursor);
    }, this.closeButton);
    this.language.onChange(() => this.updateInventoryDisplay());
    this.ensureNewItemsHaveSlots();
  }

  private createControls(): void {
    this.scene.input.on("pointerdown", this.handlePointerDown, this);
    this.scene.input.on("pointerup", this.handlePointerUp, this);
    this.scene.input.on("pointermove", this.handlePointerMove, this);
    this.scene.input.on("gameout", this.handleGameOut, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.input.off("pointerdown", this.handlePointerDown, this);
      this.scene.input.off("pointerup", this.handlePointerUp, this);
      this.scene.input.off("pointermove", this.handlePointerMove, this);
      this.scene.input.off("gameout", this.handleGameOut, this);
      this.setCanvasCursor(this.defaultCanvasCursor);
    });
  }

  private createInterface(): void {
    this.inventoryPanel = this.scene.add.container(0, 0).setScrollFactor(0);
    const background = modalPanel(this.scene, 320, 180, 540, 330);
    this.titleText = this.scene.add.text(320, 31, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "18px", color: "#e6c47e"
    }).setOrigin(0.5);
    this.hotbarTitleText = this.scene.add.text(320, 61, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#d6b36b"
    }).setOrigin(0.5);
    this.seedPacketText = this.scene.add.text(320, 119, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#d7e6c5", align: "center"
    }).setOrigin(0.5);
    this.backpackTitleText = this.scene.add.text(320, 140, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#d6b36b"
    }).setOrigin(0.5);
    this.inventoryPanel.add([background, this.titleText, this.hotbarTitleText, this.seedPacketText, this.backpackTitleText]);

    const hotbarX = [230, 290, 350, 410];
    hotbarX.forEach((x, index) => this.createCell({ zone: "hotbar", index }, x, 96, 52, String(index + 1)));

    const backpackX = [192, 256, 320, 384, 448];
    const backpackY = [176, 223, 270];
    for (let index = 0; index < 15; index++) {
      this.createCell({ zone: "backpack", index }, backpackX[index % 5], backpackY[Math.floor(index / 5)], 56);
    }

    this.instructionText = this.scene.add.text(320, 303, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#d6e6c2", align: "center",
      wordWrap: { width: 490 }
    }).setOrigin(0.5);
    this.exitHintText = this.scene.add.text(320, 322, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#d7e6c5"
    }).setOrigin(0.5);
    const closePosition = modalClosePosition(320, 180, 540, 330);
    this.closeButton = createRedCloseButton(this.scene, closePosition.x, closePosition.y);
    this.dragPreviewBackground = this.scene.add.rectangle(-100, -100, 38, 38, 0x2a1d16, 0.94)
      .setStrokeStyle(2, 0xffd978)
      .setVisible(false);
    this.dragPreviewIcon = this.scene.add.image(-100, -100, "ui_icon_hand")
      .setDisplaySize(27, 27)
      .setVisible(false);
    this.inventoryPanel.add([
      this.instructionText,
      this.exitHintText,
      this.closeButton,
      this.dragPreviewBackground,
      this.dragPreviewIcon
    ]);
    this.updateInventoryDisplay();
  }

  private createCell(address: SlotAddress, x: number, y: number, width: number, hotkey?: string): void {
    const background = this.scene.add.rectangle(x, y, width, address.zone === "hotbar" ? 48 : 42, 0x3d4b34, 1)
      .setStrokeStyle(1, 0x9b7047);
    const icon = this.scene.add.image(x, y - 5, "ui_icon_hand").setScale(1.15).setVisible(false);
    const name = this.scene.add.text(x, y + (address.zone === "hotbar" ? 15 : 13), "", {
      fontFamily: this.language.getFontFamily(), fontSize: "7px", color: "#fff1cf", align: "center"
    }).setOrigin(0.5).setVisible(false);
    const amount = this.scene.add.text(x + width / 2 - 4, y - 17, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#ffe070",
      stroke: "#2a1a14", strokeThickness: 2
    }).setOrigin(1, 0).setVisible(false);
    const keyLabel = hotkey ? this.scene.add.text(x - width / 2 + 4, y - 18, hotkey, {
      fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#fff1cf",
      stroke: "#2a1a14", strokeThickness: 2
    }).setOrigin(0, 0) : undefined;
    this.cells.push({
      address,
      x,
      y,
      width,
      height: address.zone === "hotbar" ? 48 : 42,
      background,
      icon,
      name,
      amount,
      keyLabel
    });
    this.inventoryPanel.add([background, icon, name, amount, ...(keyLabel ? [keyLabel] : [])]);
  }

  private slotsFor(zone: InventoryZone): Array<InventoryItemId | null> {
    return zone === "hotbar" ? this.hotbarSlots : this.backpackSlots;
  }

  private countFor(item: InventoryItemId): number {
    switch (item) {
      case "hoe": case "water": case "harvest": case "rod": return item === "rod" ? (this.fishing.getHasRod() ? 1 : 0) : 1;
      case "seeds": return this.farming.getSeedCount("rice");
      case "tomatoSeeds": return this.farming.getSeedCount("tomato");
      case "greenBeanSeeds": return this.farming.getSeedCount("greenBean");
      case "rice": return this.farming.getRice() + this.farming.getGoldenWheat();
      case "tomatoes": return this.farming.getCropCount("tomato");
      case "greenBeans": return this.farming.getCropCount("greenBean");
      case "silverBarb": case "catfish": case "goldenCarp": return this.fishing.getFishCount(item);
      case "wormBait": return this.fishing.getBaitCount("worm");
      case "shrimpBait": return this.fishing.getBaitCount("shrimp");
      case "goldenCricketBait": return this.fishing.getBaitCount("goldenCricket");
      case "meals": return this.cooking.getTotalMeals();
    }
  }

  private ensureNewItemsHaveSlots(): void {
    let hotbarChanged = false;
    for (const item of ALL_ITEMS) {
      const count = this.countFor(item);
      const previous = this.lastCounts.get(item) ?? 0;
      const isTool = INVENTORY_ITEM_DEFINITIONS[item].tool !== undefined;
      // Consumables disappear when depleted, then return in a free backpack
      // slot as soon as the player obtains one again.
      if (!isTool && count <= 0) {
        const nextHotbar = this.hotbarSlots.map(slot => slot === item ? null : slot);
        hotbarChanged ||= nextHotbar.some((slot, index) => slot !== this.hotbarSlots[index]);
        this.hotbarSlots = nextHotbar;
        this.backpackSlots = this.backpackSlots.map(slot => slot === item ? null : slot);
      }
      const alreadyPlaced = this.hotbarSlots.includes(item) || this.backpackSlots.includes(item);
      if (count > 0 && !alreadyPlaced && count >= previous) {
        const emptyIndex = this.backpackSlots.findIndex(slot => slot === null);
        if (emptyIndex >= 0) this.backpackSlots[emptyIndex] = item;
      }
      this.lastCounts.set(item, count);
    }
    if (hotbarChanged) this.farming.setHotbarItems(this.hotbarSlots);
  }

  private labelFor(item: InventoryItemId): string {
    const value = this.language.t(INVENTORY_ITEM_DEFINITIONS[item].nameKey);
    return value.length > 10 ? `${value.slice(0, 9)}…` : value;
  }

  private updateInventoryDisplay(): void {
    const font = this.language.getFontFamily();
    this.titleText.setText(this.language.t("inventory.title"));
    this.hotbarTitleText.setText(this.language.t("inventory.hotbar"));
    this.backpackTitleText.setText(this.language.t("inventory.backpack"));
    this.seedPacketText.setText(this.language.t("inventory.seedPacketInfo", {
      rice: this.farming.getSeedCount("rice"),
      tomato: this.farming.getSeedCount("tomato"),
      greenBean: this.farming.getSeedCount("greenBean")
    }));
    this.instructionText.setText(this.language.t("inventory.dragInstructions"));
    this.exitHintText.setText(this.language.t("common.clickCrossExit"));
    for (const text of [this.titleText, this.hotbarTitleText, this.seedPacketText, this.backpackTitleText, this.instructionText, this.exitHintText]) {
      text.setFontFamily(font);
    }
    this.ensureNewItemsHaveSlots();

    for (const cell of this.cells) {
      const slots = this.slotsFor(cell.address.zone);
      const item = slots[cell.address.index] ?? null;
      const selected = cell.address.zone === "hotbar" && this.farming.getSelectedHotbarIndex() === cell.address.index;
      const isSource = this.dragSource?.zone === cell.address.zone && this.dragSource?.index === cell.address.index;
      const isTarget = this.dragTarget?.zone === cell.address.zone && this.dragTarget?.index === cell.address.index;
      cell.background.setFillStyle(isSource ? 0x58734b : selected ? 0x527044 : 0x3d4b34, 1);
      cell.background.setStrokeStyle(isTarget && !isSource ? 3 : selected ? 2 : 1, isTarget ? 0xffd978 : selected ? 0xd6b36b : 0x9b7047);
      cell.name.setFontFamily(font);
      cell.amount.setFontFamily(font);
      if (!item || (!INVENTORY_ITEM_DEFINITIONS[item].tool && this.countFor(item) <= 0)) {
        cell.icon.setVisible(false);
        cell.name.setVisible(false);
        cell.amount.setVisible(false);
        continue;
      }
      const definition = INVENTORY_ITEM_DEFINITIONS[item];
      cell.icon.setTexture(definition.texture).setVisible(true);
      cell.name.setText(this.labelFor(item)).setVisible(true);
      const count = this.countFor(item);
      let quantityText = String(count);
      if (item === "rod") {
        quantityText = count > 0 ? "1" : "0";
      }
      cell.amount.setText(quantityText).setVisible(true);
    }
  }

  private addressAt(x: number, y: number): SlotAddress | null {
    const cell = this.cells.find(candidate =>
      x >= candidate.x - candidate.width / 2 &&
      x <= candidate.x + candidate.width / 2 &&
      y >= candidate.y - candidate.height / 2 &&
      y <= candidate.y + candidate.height / 2
    );
    return cell ? { ...cell.address } : null;
  }

  private setCanvasCursor(cursor: string): void {
    const canvas = this.scene.game.canvas;
    if (canvas && canvas.style.cursor !== cursor) canvas.style.cursor = cursor;
  }

  private showDragPreview(x: number, y: number, item: InventoryItemId): void {
    const definition = INVENTORY_ITEM_DEFINITIONS[item];
    this.dragPreviewBackground.setPosition(x + 20, y + 20).setVisible(true);
    this.dragPreviewIcon.setTexture(definition.texture).setPosition(x + 20, y + 20).setVisible(true);
  }

  private hideDragPreview(): void {
    this.dragPreviewBackground.setVisible(false);
    this.dragPreviewIcon.setVisible(false);
  }

  private handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("inventory")) return;
    const address = this.addressAt(pointer.x, pointer.y);
    if (!address) return;

    pointer.event?.preventDefault?.();
    this.dragSource = { ...address };
    this.dragTarget = { ...address };
    this.setCanvasCursor("grabbing");

    const item = this.slotsFor(address.zone)[address.index];
    if (item) {
      this.setCanvasCursor("grabbing");
      this.showDragPreview(pointer.x, pointer.y, item);
    } else {
      this.setCanvasCursor(this.defaultCanvasCursor);
      this.hideDragPreview();
    }
    this.updateInventoryDisplay();
  };

  private handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("inventory")) return;

    if (this.dragSource && pointer.isDown) {
      this.dragTarget = this.addressAt(pointer.x, pointer.y);
      this.setCanvasCursor("grabbing");
      const item = this.slotsFor(this.dragSource.zone)[this.dragSource.index];
      if (item) this.showDragPreview(pointer.x, pointer.y, item);
      this.updateInventoryDisplay();
      return;
    }

    this.setCanvasCursor(this.addressAt(pointer.x, pointer.y) ? "grab" : this.defaultCanvasCursor);
  };

  private handleGameOut = (): void => {
    if (this.dragSource) {
      this.dragSource = null;
      this.dragTarget = null;
      this.hideDragPreview();
      this.updateInventoryDisplay();
    }
    this.setCanvasCursor(this.defaultCanvasCursor);
  };

  private handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("inventory") || !this.dragSource) return;
    const source = this.dragSource;
    const target = this.addressAt(pointer.x, pointer.y);
    this.dragSource = null;
    this.dragTarget = null;
    this.hideDragPreview();

    if (!target) {
      this.setCanvasCursor(this.defaultCanvasCursor);
      this.updateInventoryDisplay();
      return;
    }

    const sourceSlots = this.slotsFor(source.zone);
    const targetSlots = this.slotsFor(target.zone);
    const sourceItem = sourceSlots[source.index] ?? null;
    if (!sourceItem) {
      this.setCanvasCursor(this.addressAt(pointer.x, pointer.y) ? "grab" : this.defaultCanvasCursor);
      this.updateInventoryDisplay();
      return;
    }

    if (source.zone === target.zone && source.index === target.index) {
      if (source.zone === "hotbar") {
        this.farming.mobileSelectTool(source.index);
      } else {
        const tappedItem = sourceSlots[source.index];
        const definition = tappedItem ? INVENTORY_ITEM_DEFINITIONS[tappedItem] : null;
        if (tappedItem && (definition?.tool === "seeds" || definition?.fishingBait)) {
          const selectedIndex = this.farming.getSelectedHotbarIndex();
          const previousItem = this.hotbarSlots[selectedIndex] ?? null;
          this.hotbarSlots[selectedIndex] = tappedItem;
          this.backpackSlots[source.index] = previousItem;
          this.farming.setHotbarItems(this.hotbarSlots);
          this.farming.mobileSelectTool(selectedIndex);
        }
      }
      this.setCanvasCursor("grab");
      this.updateInventoryDisplay();
      return;
    }

    const targetItem = targetSlots[target.index] ?? null;
    sourceSlots[source.index] = targetItem;
    targetSlots[target.index] = sourceItem;
    this.farming.setHotbarItems(this.hotbarSlots);
    this.setCanvasCursor("grab");
    this.updateInventoryDisplay();
  };

  private openInventory(): void {
    this.isOpen = true;
    this.updateInventoryDisplay();
    this.ui.open("inventory");
    this.setCanvasCursor("default");
  }

  private closeInventory = (): void => {
    this.isOpen = false;
    this.dragSource = null;
    this.dragTarget = null;
    this.hideDragPreview();
    this.setCanvasCursor(this.defaultCanvasCursor);
    this.ui.close("inventory");
  };

  getSaveData(): InventorySaveData {
    return {
      items: {},
      collected: [],
      hotbarSlots: [...this.hotbarSlots],
      backpackSlots: [...this.backpackSlots],
      selectedHotbarIndex: this.farming.getSelectedHotbarIndex()
    };
  }

  loadSaveData(data: InventorySaveData): void {
    const valid = (value: unknown): value is InventoryItemId => typeof value === "string" && ALL_ITEMS.includes(value as InventoryItemId);
    const migrateLegacyFish = (item: unknown): InventoryItemId | null => {
      const normalized = item === "goldenWheat" ? "rice" : item;
      if (normalized !== "fish") return normalized === null ? null : valid(normalized) ? normalized : null;
      const counts = this.fishing.getFishCounts();
      return counts.silverBarb > 0 ? "silverBarb" : counts.catfish > 0 ? "catfish" : counts.goldenCarp > 0 ? "goldenCarp" : null;
    };
    if (Array.isArray(data.hotbarSlots) && data.hotbarSlots.length === 4) {
      this.hotbarSlots = data.hotbarSlots.map(migrateLegacyFish);
    } else {
      this.hotbarSlots = [...HOTBAR_DEFAULT];
    }
    if (Array.isArray(data.backpackSlots) && data.backpackSlots.length === 15) {
      this.backpackSlots = data.backpackSlots.map(migrateLegacyFish);
    } else {
      this.backpackSlots = [...BACKPACK_DEFAULT];
    }
    // Keep items unique if a malformed or old save somehow duplicated a slot.
    const seen = new Set<InventoryItemId>();
    for (const slots of [this.hotbarSlots, this.backpackSlots]) {
      for (let index = 0; index < slots.length; index++) {
        const item = slots[index];
        if (!item) continue;
        if (seen.has(item)) slots[index] = null;
        else seen.add(item);
      }
    }
    this.farming.setHotbarItems(this.hotbarSlots);
    const selectedIndex = Number.isInteger(data.selectedHotbarIndex)
      ? Math.max(0, Math.min(3, Number(data.selectedHotbarIndex)))
      : 0;
    this.farming.mobileSelectTool(selectedIndex);
    this.lastCounts.clear();
    for (const item of ALL_ITEMS) this.lastCounts.set(item, this.countFor(item));
    this.ensureNewItemsHaveSlots();
    this.updateInventoryDisplay();
  }

  isInventoryOpen(): boolean { return this.isOpen; }

  mobileToggle(): void {
    if (this.isOpen) this.closeInventory();
    else if (!this.ui.hasActiveModal()) this.openInventory();
  }

  update(_playerX: number, _playerY: number): void {
    this.ensureNewItemsHaveSlots();
    if (this.isOpen) this.updateInventoryDisplay();
  }
}
