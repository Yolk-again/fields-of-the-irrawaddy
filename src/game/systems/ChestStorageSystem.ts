import Phaser from "phaser";
import { FarmingSystem } from "./FarmingSystem";
import { FishingSystem, type FishKind } from "./FishingSystem";
import { CookingSystem, type MealKind } from "./CookingSystem";
import { LanguageSystem } from "./LanguageSystem";
import { ModalUIManager } from "./ModalUIManager";
import { createRedCloseButton, modalClosePosition, modalPanel, uiDescriptionStyle, uiFontSize } from "../ui/PixelUI";
import { adjustQuantity, maximumQuantitySelection, normalizeQuantity, quantityAdjustmentStep } from "../ui/QuantityMath";
import { isMobilePlatform } from "../utils/DeviceMode";

export type ChestItem = "seeds" | "tomatoSeeds" | "greenBeanSeeds" | "wheat" | "tomatoes" | "greenBeans" | FishKind | MealKind;
export type ChestContents = Record<ChestItem, number>;
export interface ChestSaveData {
  stored: Partial<ChestContents> & { rice?: number; goldenWheat?: number };
  wheatBreakdown?: { regularRice: number; goldenWheat: number };
}

const ITEMS: { id: ChestItem; key: string; texture: string }[] = [
  { id: "seeds", key: "chest.seeds", texture: "wheat_seed_bag_asset" },
  { id: "tomatoSeeds", key: "chest.tomatoSeeds", texture: "tomato_seed_bag_asset" },
  { id: "greenBeanSeeds", key: "chest.greenBeanSeeds", texture: "green_bean_seed_bag_asset" },
  { id: "wheat", key: "chest.wheat", texture: "wheat_basket_asset" },
  { id: "tomatoes", key: "chest.tomatoes", texture: "tomato_basket_asset" },
  { id: "greenBeans", key: "chest.greenBeans", texture: "green_bean_basket_asset" },
  { id: "silverBarb", key: "chest.silverBarb", texture: "fish_silver_barb_asset" },
  { id: "catfish", key: "chest.catfish", texture: "fish_catfish_asset" },
  { id: "goldenCarp", key: "chest.goldenCarp", texture: "fish_golden_carp_asset" },
  { id: "fishRice", key: "chest.fishRice", texture: "meal_fish_rice_asset" },
  { id: "mohinga", key: "chest.mohinga", texture: "meal_mohinga_asset" },
  { id: "fishCurry", key: "chest.fishCurry", texture: "meal_fish_curry_asset" }
];

/** Persistent home storage for farm goods, fish and cooked meals. */
export class ChestStorageSystem {
  private readonly scene: Phaser.Scene;
  private readonly farming: FarmingSystem;
  private readonly fishing: FishingSystem;
  private readonly cooking: CookingSystem;
  private readonly ui: ModalUIManager;
  private readonly language: LanguageSystem;
  private readonly stored: ChestContents = {
    seeds: 0, tomatoSeeds: 0, greenBeanSeeds: 0, wheat: 0, tomatoes: 0, greenBeans: 0,
    silverBarb: 0, catfish: 0, goldenCarp: 0, fishRice: 0, mohinga: 0, fishCurry: 0
  };
  private storedWheatRice = 0;
  private storedGoldenWheat = 0;
  private isOpen = false;
  private panel!: Phaser.GameObjects.Container;
  private closeButton!: Phaser.GameObjects.Container;
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private bagColumn!: Phaser.GameObjects.Text;
  private chestColumn!: Phaser.GameObjects.Text;
  private quantityHeader!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private emptyState!: Phaser.GameObjects.Text;
  private exitHint!: Phaser.GameObjects.Text;
  private rowNames: Phaser.GameObjects.Text[] = [];
  private rowObjects: Phaser.GameObjects.GameObject[][] = [];
  private visibleRowIndices: number[] = [];
  private playerCounts: Phaser.GameObjects.Text[] = [];
  private chestCounts: Phaser.GameObjects.Text[] = [];
  private putButtons: Phaser.GameObjects.Rectangle[] = [];
  private takeButtons: Phaser.GameObjects.Rectangle[] = [];
  private decreaseButtons: Phaser.GameObjects.Rectangle[] = [];
  private increaseButtons: Phaser.GameObjects.Rectangle[] = [];
  private maxButtons: Phaser.GameObjects.Rectangle[] = [];
  private maxLabels: Phaser.GameObjects.Text[] = [];
  private amountTexts: Phaser.GameObjects.Text[] = [];
  private readonly selectedAmounts: Record<ChestItem, number> = {
    seeds: 1, tomatoSeeds: 1, greenBeanSeeds: 1, wheat: 1, tomatoes: 1, greenBeans: 1,
    silverBarb: 1, catfish: 1, goldenCarp: 1, fishRice: 1, mohinga: 1, fishCurry: 1
  };
  private putLabels: Phaser.GameObjects.Text[] = [];
  private takeLabels: Phaser.GameObjects.Text[] = [];
  private messageValue = "";
  private lastHoverKey = "";
  private readonly mobileMode = isMobilePlatform();
  private readonly rowStartY = 110;
  private readonly rowY = ITEMS.map((_item, index) => 110 + index * 17);

  constructor(scene: Phaser.Scene, farming: FarmingSystem, fishing: FishingSystem, cooking: CookingSystem, ui: ModalUIManager, language: LanguageSystem) {
    this.scene = scene;
    this.farming = farming;
    this.fishing = fishing;
    this.cooking = cooking;
    this.ui = ui;
    this.language = language;
    this.createInterface();
    this.scene.input.on("pointerup", this.handlePointerUp, this);
    this.scene.input.on("pointermove", this.handlePointerMove, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.input.off("pointerup", this.handlePointerUp, this);
      this.scene.input.off("pointermove", this.handlePointerMove, this);
      this.scene.game.canvas.style.cursor = "default";
    });
    this.ui.registerPanel("chest", this.panel, 260, () => {
      this.isOpen = false;
    }, this.closeButton);
    this.language.onChange(() => this.updateInterface());
  }

  private createInterface(): void {
    this.panel = this.scene.add.container(0, 0).setScrollFactor(0);
    const background = modalPanel(this.scene, 320, 180, 570, 340);
    this.title = this.scene.add.text(320, 34, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(16), color: "#e6c47e", fontStyle: "bold", align: "center", wordWrap: { width: 450, useAdvancedWrap: true } }).setOrigin(0.5).setMaxLines(1);
    this.subtitle = this.scene.add.text(320, 58, "", { ...uiDescriptionStyle(this.language.getFontFamily(), 470, 9), align: "center" }).setOrigin(0.5).setMaxLines(2);
    this.bagColumn = this.scene.add.text(238, 88, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(8), color: "#f0d18b", stroke: "#243426", strokeThickness: 1, align: "center", wordWrap: { width: 60, useAdvancedWrap: true }, lineSpacing: 0 }).setOrigin(0.5).setMaxLines(2);
    this.chestColumn = this.scene.add.text(302, 88, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(8), color: "#f0d18b", stroke: "#243426", strokeThickness: 1, align: "center", wordWrap: { width: 60, useAdvancedWrap: true }, lineSpacing: 0 }).setOrigin(0.5).setMaxLines(2);
    this.quantityHeader = this.scene.add.text(390, 88, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(8), color: "#f0d18b", stroke: "#243426", strokeThickness: 1, align: "center", wordWrap: { width: 150, useAdvancedWrap: true }, lineSpacing: 0 }).setOrigin(0.5).setMaxLines(2);
    this.panel.add([background, this.title, this.subtitle, this.bagColumn, this.chestColumn, this.quantityHeader]);

    ITEMS.forEach((item, index) => {
      const y = this.rowY[index];
      const card = this.scene.add.rectangle(320, y, 520, 17, index % 2 ? 0x35462f : 0x3d5136, 1)
        .setStrokeStyle(1, 0xb58a55);
      const icon = this.scene.add.image(73, y, item.texture).setDisplaySize(20, 17);
      const name = this.scene.add.text(92, y, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(7), color: "#fff1cf", stroke: "#243426", strokeThickness: 0.75, wordWrap: { width: 132, useAdvancedWrap: true }, lineSpacing: 0 }).setOrigin(0, 0.5).setMaxLines(1);
      const bag = this.scene.add.text(238, y, "0", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(9), color: "#ffffff", stroke: "#243426", strokeThickness: 0.75 }).setOrigin(0.5);
      const chest = this.scene.add.text(302, y, "0", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(9), color: "#f0d69e", stroke: "#243426", strokeThickness: 0.75 }).setOrigin(0.5);
      const decrease = this.scene.add.rectangle(342, y, 20, 16, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
      const amount = this.scene.add.text(372, y, "1", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(9), color: "#fff1cf", stroke: "#243426", strokeThickness: 0.75, fontStyle: "bold" }).setOrigin(0.5);
      const increase = this.scene.add.rectangle(402, y, 20, 16, 0x527044, 1).setStrokeStyle(1, 0xd6b36b);
      const decreaseLabel = this.scene.add.text(342, y, "−", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(11), color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
      const increaseLabel = this.scene.add.text(402, y, "+", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(11), color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
      const maximum = this.scene.add.rectangle(441, y, 36, 16, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
      const maximumLabel = this.scene.add.text(441, y, "MAX", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(7), color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
      const put = this.scene.add.rectangle(495, y, 54, 16, 0x527044, 1).setStrokeStyle(1, 0xd6b36b);
      const take = this.scene.add.rectangle(555, y, 54, 16, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
      const putLabel = this.scene.add.text(495, y, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(7), color: "#fff1cf", stroke: "#243426", strokeThickness: 0.75, align: "center", wordWrap: { width: 48 }, lineSpacing: 0 }).setOrigin(0.5).setMaxLines(1);
      const takeLabel = this.scene.add.text(555, y, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(7), color: "#fff1cf", stroke: "#243426", strokeThickness: 0.75, align: "center", wordWrap: { width: 48 }, lineSpacing: 0 }).setOrigin(0.5).setMaxLines(1);
      this.rowNames.push(name);
      this.playerCounts.push(bag);
      this.chestCounts.push(chest);
      this.decreaseButtons.push(decrease);
      this.increaseButtons.push(increase);
      this.maxButtons.push(maximum);
      this.maxLabels.push(maximumLabel);
      this.amountTexts.push(amount);
      this.putButtons.push(put);
      this.takeButtons.push(take);
      this.putLabels.push(putLabel);
      this.takeLabels.push(takeLabel);
      const rowObjects: Phaser.GameObjects.GameObject[] = [card, icon, name, bag, chest, decrease, amount, increase, decreaseLabel, increaseLabel, maximum, maximumLabel, put, take, putLabel, takeLabel];
      this.rowObjects.push(rowObjects);
      this.panel.add(rowObjects);
    });

    this.emptyState = this.scene.add.text(320, 190, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(10), color: "#e6c47e", align: "center",
      wordWrap: { width: 420 }
    }).setOrigin(0.5).setMaxLines(2).setVisible(false);
    this.message = this.scene.add.text(320, 314, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(7), color: "#f0d69e", align: "center", wordWrap: { width: 460 } }).setOrigin(0.5).setMaxLines(1);
    this.exitHint = this.scene.add.text(320, 332, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(7), color: "#d7e6c5", align: "center", wordWrap: { width: 460 } }).setOrigin(0.5).setMaxLines(1);
    const close = modalClosePosition(320, 180, 570, 340);
    this.closeButton = createRedCloseButton(this.scene, close.x, close.y);
    this.panel.add([this.emptyState, this.message, this.exitHint, this.closeButton]);
    this.updateInterface();
  }

  private playerCount(item: ChestItem): number {
    if (item === "seeds") return this.farming.getSeedCount("rice");
    if (item === "tomatoSeeds") return this.farming.getSeedCount("tomato");
    if (item === "greenBeanSeeds") return this.farming.getSeedCount("greenBean");
    if (item === "wheat") return this.farming.getRice() + this.farming.getGoldenWheat();
    if (item === "tomatoes") return this.farming.getCropCount("tomato");
    if (item === "greenBeans") return this.farming.getCropCount("greenBean");
    if (item === "silverBarb" || item === "catfish" || item === "goldenCarp") return this.fishing.getFishCount(item);
    return this.cooking.getMealCounts()[item];
  }

  private transferToChest(item: ChestItem): number {
    const amount = Math.min(this.selectedAmounts[item], this.playerCount(item));
    if (amount <= 0) return 0;

    if (item === "wheat") {
      const regularAmount = Math.min(amount, this.farming.getRice());
      const goldenAmount = amount - regularAmount;
      if (regularAmount > 0 && !this.farming.removeRice(regularAmount)) return 0;
      if (goldenAmount > 0 && !this.farming.removeGoldenWheat(goldenAmount)) {
        if (regularAmount > 0) this.farming.addRice(regularAmount);
        return 0;
      }
      this.storedWheatRice += regularAmount;
      this.storedGoldenWheat += goldenAmount;
      this.stored.wheat = this.storedWheatRice + this.storedGoldenWheat;
      return amount;
    }

    let removed = false;
    if (item === "seeds") removed = this.farming.removeCropSeeds("rice", amount);
    else if (item === "tomatoSeeds") removed = this.farming.removeCropSeeds("tomato", amount);
    else if (item === "greenBeanSeeds") removed = this.farming.removeCropSeeds("greenBean", amount);
    else if (item === "tomatoes") removed = this.farming.removeCrop("tomato", amount);
    else if (item === "greenBeans") removed = this.farming.removeCrop("greenBean", amount);
    else if (item === "silverBarb" || item === "catfish" || item === "goldenCarp") removed = this.fishing.removeFish(item, amount);
    else removed = this.cooking.removeMeals(item, amount);
    if (!removed) return 0;
    this.stored[item] += amount;
    return amount;
  }

  private transferFromChest(item: ChestItem): number {
    const amount = Math.min(this.selectedAmounts[item], this.stored[item]);
    if (amount <= 0) return 0;

    if (item === "wheat") {
      const regularAmount = Math.min(amount, this.storedWheatRice);
      const goldenAmount = Math.min(amount - regularAmount, this.storedGoldenWheat);
      this.storedWheatRice -= regularAmount;
      this.storedGoldenWheat -= goldenAmount;
      this.stored.wheat = this.storedWheatRice + this.storedGoldenWheat;
      if (regularAmount > 0) this.farming.addRice(regularAmount);
      if (goldenAmount > 0) this.farming.addGoldenWheat(goldenAmount);
      return regularAmount + goldenAmount;
    }

    this.stored[item] -= amount;
    if (item === "seeds") this.farming.addCropSeeds("rice", amount);
    else if (item === "tomatoSeeds") this.farming.addCropSeeds("tomato", amount);
    else if (item === "greenBeanSeeds") this.farming.addCropSeeds("greenBean", amount);
    else if (item === "tomatoes") this.farming.addCrop("tomato", amount);
    else if (item === "greenBeans") this.farming.addCrop("greenBean", amount);
    else if (item === "silverBarb" || item === "catfish" || item === "goldenCarp") this.fishing.addFish(item, amount);
    else this.cooking.addMeals(item, amount);
    return amount;
  }

  private visibleRowAt(y: number): number {
    const slot = this.visibleRowIndices.findIndex((_itemIndex, visibleSlot) =>
      Math.abs(y - (this.rowStartY + visibleSlot * 17)) <= 8.5
    );
    return slot < 0 ? -1 : this.visibleRowIndices[slot];
  }

  private handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("chest")) return;
    const index = this.visibleRowAt(pointer.y);
    if (index < 0) return;
    const item = ITEMS[index].id;
    const step = quantityAdjustmentStep(Boolean((pointer.event as MouseEvent).shiftKey));
    if (pointer.x >= 330 && pointer.x <= 354) this.adjustAmount(item, -step);
    else if (pointer.x >= 390 && pointer.x <= 414) this.adjustAmount(item, step);
    else if (pointer.x >= 420 && pointer.x <= 462) this.setMaximumAmount(item);
    else if (pointer.x >= 468 && pointer.x <= 522) this.transfer(item, true);
    else if (pointer.x >= 528 && pointer.x <= 582) this.transfer(item, false);
  };

  private handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("chest")) {
      if (this.lastHoverKey) {
        this.lastHoverKey = "";
        this.resetHoverStyles();
        this.scene.game.canvas.style.cursor = "default";
      }
      return;
    }
    const index = this.visibleRowAt(pointer.y);
    const region = index < 0 ? "" : pointer.x >= 330 && pointer.x <= 354 ? "decrease"
      : pointer.x >= 390 && pointer.x <= 414 ? "increase"
        : pointer.x >= 420 && pointer.x <= 462 ? "maximum"
          : pointer.x >= 468 && pointer.x <= 522 ? "put"
            : pointer.x >= 528 && pointer.x <= 582 ? "take" : "";
    const hoverKey = region ? `${index}:${region}` : "";
    if (hoverKey === this.lastHoverKey) return;
    this.lastHoverKey = hoverKey;
    this.resetHoverStyles();
    if (region && index >= 0) {
      if (region === "decrease") this.decreaseButtons[index].setFillStyle(0x98713d, 1);
      else if (region === "increase") this.increaseButtons[index].setFillStyle(0x668651, 1);
      else if (region === "maximum") this.maxButtons[index].setFillStyle(0x98713d, 1);
      else if (region === "put") this.putButtons[index].setFillStyle(0x668651, 1);
      else if (region === "take") this.takeButtons[index].setFillStyle(0x98713d, 1);
    }
    this.scene.game.canvas.style.cursor = region ? "pointer" : "default";
  };

  private resetHoverStyles(): void {
    this.decreaseButtons.forEach(button => button.setFillStyle(0x70532f, 1));
    this.increaseButtons.forEach(button => button.setFillStyle(0x527044, 1));
    this.maxButtons.forEach(button => button.setFillStyle(0x70532f, 1));
    this.putButtons.forEach(button => button.setFillStyle(0x527044, 1));
    this.takeButtons.forEach(button => button.setFillStyle(0x70532f, 1));
  }

  private adjustAmount(item: ChestItem, delta: number): void {
    const available = Math.max(this.playerCount(item), this.stored[item]);
    this.selectedAmounts[item] = adjustQuantity(this.selectedAmounts[item], delta, available);
    this.updateInterface();
  }

  private setMaximumAmount(item: ChestItem): void {
    this.selectedAmounts[item] = maximumQuantitySelection(Math.max(this.playerCount(item), this.stored[item]));
    this.updateInterface();
  }

  private transfer(item: ChestItem, toChest: boolean): void {
    const amount = toChest ? this.transferToChest(item) : this.transferFromChest(item);
    this.messageValue = amount > 0
      ? this.language.t(toChest ? "chest.stored" : "chest.taken", { amount })
      : this.language.t(toChest ? "chest.nothingToStore" : "chest.empty");
    if (amount > 0) this.scene.events.emit("sound-effect", toChest ? "buy" : "sell");
    this.updateInterface();
  }

  private updateInterface(): void {
    this.title.setText(this.language.t("chest.title"));
    this.subtitle.setText(this.language.t(this.mobileMode ? "chest.mobileSubtitle" : "chest.subtitle"));
    this.bagColumn.setText(this.language.t("chest.bag"));
    this.chestColumn.setText(this.language.t("chest.chest"));
    this.quantityHeader.setText(this.language.t("chest.quantity"));
    this.exitHint.setText(this.language.t(this.mobileMode ? "common.mobileExitHint" : "common.desktopExitHint"));
    this.message.setText(this.messageValue);
    this.rowNames.forEach((text, index) => text.setText(this.language.t(ITEMS[index].key)));
    this.visibleRowIndices = [];
    this.rowObjects.forEach((row, index) => {
      const item = ITEMS[index].id;
      const visible = this.playerCount(item) > 0 || this.stored[item] > 0;
      const visibleSlot = this.visibleRowIndices.length;
      const targetY = this.rowStartY + visibleSlot * 17;
      row.forEach(object => {
        const display = object as Phaser.GameObjects.GameObject & {
          x: number;
          setVisible(value: boolean): unknown;
          setPosition(x: number, y: number): unknown;
        };
        display.setVisible(visible);
        if (visible) display.setPosition(display.x, targetY);
      });
      if (visible) this.visibleRowIndices.push(index);
    });
    this.emptyState.setVisible(this.visibleRowIndices.length === 0);
    this.emptyState.setText(this.language.t("chest.emptyStorage"));
    this.playerCounts.forEach((text, index) => text.setText(String(this.playerCount(ITEMS[index].id))));
    this.chestCounts.forEach((text, index) => text.setText(String(this.stored[ITEMS[index].id])));
    this.amountTexts.forEach((text, index) => {
      const item = ITEMS[index].id;
      const maximum = Math.max(this.playerCount(item), this.stored[item]);
      this.selectedAmounts[item] = normalizeQuantity(this.selectedAmounts[item], maximum);
      text.setText(String(this.selectedAmounts[item]));
    });
    this.putLabels.forEach(text => text.setText(this.language.t("chest.put")));
    this.takeLabels.forEach(text => text.setText(this.language.t("chest.take")));
    this.maxLabels.forEach(text => text.setText(this.language.t("chest.max")));
    const font = this.language.getFontFamily();
    for (const text of [this.title, this.subtitle, this.bagColumn, this.chestColumn, this.quantityHeader, this.emptyState, this.message, this.exitHint, ...this.rowNames, ...this.playerCounts, ...this.chestCounts, ...this.putLabels, ...this.takeLabels, ...this.maxLabels, ...this.amountTexts]) text.setFontFamily(font);
    for (const text of this.rowNames) text.setMaxLines(1);
    for (const text of [...this.playerCounts, ...this.chestCounts, ...this.amountTexts, ...this.maxLabels]) text.setMaxLines(1);
  }

  openFromHouse(): void {
    if (!this.ui.isOpen("house")) return;
    this.isOpen = true;
    this.lastHoverKey = "";
    this.resetHoverStyles();
    this.messageValue = "";
    this.updateInterface();
    this.ui.openOver("chest");
  }

  getSaveData(): ChestSaveData {
    return {
      stored: { ...this.stored },
      wheatBreakdown: { regularRice: this.storedWheatRice, goldenWheat: this.storedGoldenWheat }
    };
  }

  loadSaveData(data?: ChestSaveData): void {
    if (!data?.stored) return;
    const saved = data.stored;
    for (const item of ITEMS) {
      if (item.id === "wheat") continue;
      this.stored[item.id] = Math.max(0, Math.floor(Number(saved[item.id]) || 0));
    }
    if (data.wheatBreakdown) {
      this.storedWheatRice = Math.max(0, Math.floor(Number(data.wheatBreakdown.regularRice) || 0));
      this.storedGoldenWheat = Math.max(0, Math.floor(Number(data.wheatBreakdown.goldenWheat) || 0));
    } else {
      this.storedWheatRice = Math.max(0, Math.floor(Number(saved.rice ?? saved.wheat) || 0));
      this.storedGoldenWheat = Math.max(0, Math.floor(Number(saved.goldenWheat) || 0));
    }
    this.stored.wheat = this.storedWheatRice + this.storedGoldenWheat;
    this.updateInterface();
  }
}
