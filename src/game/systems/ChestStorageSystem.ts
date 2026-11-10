import Phaser from "phaser";
import { FarmingSystem } from "./FarmingSystem";
import { FishingSystem, type FishKind } from "./FishingSystem";
import { CookingSystem, type MealKind } from "./CookingSystem";
import { LanguageSystem } from "./LanguageSystem";
import { ModalUIManager } from "./ModalUIManager";
import { createRedCloseButton, modalClosePosition, modalPanel } from "../ui/PixelUI";
import { adjustQuantity, maximumQuantitySelection, normalizeQuantity, quantityAdjustmentStep } from "../ui/QuantityMath";

export type ChestItem = "seeds" | "rice" | FishKind | MealKind;
export type ChestContents = Record<ChestItem, number>;
export interface ChestSaveData { stored: ChestContents; }

const ITEMS: { id: ChestItem; key: string; texture: string }[] = [
  { id: "seeds", key: "chest.seeds", texture: "rice_seed_bag_asset" },
  { id: "rice", key: "chest.rice", texture: "rice_bowl_asset" },
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
    seeds: 0, rice: 0, silverBarb: 0, catfish: 0, goldenCarp: 0,
    fishRice: 0, mohinga: 0, fishCurry: 0
  };
  private isOpen = false;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private panel!: Phaser.GameObjects.Container;
  private closeButton!: Phaser.GameObjects.Container;
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private columns!: Phaser.GameObjects.Text;
  private quantityHeader!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private exitHint!: Phaser.GameObjects.Text;
  private rowNames: Phaser.GameObjects.Text[] = [];
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
    seeds: 1, rice: 1, silverBarb: 1, catfish: 1, goldenCarp: 1, fishRice: 1, mohinga: 1, fishCurry: 1
  };
  private putLabels: Phaser.GameObjects.Text[] = [];
  private takeLabels: Phaser.GameObjects.Text[] = [];
  private messageValue = "";
  private readonly rowY = ITEMS.map((_item, index) => 88 + index * 29);

  constructor(scene: Phaser.Scene, farming: FarmingSystem, fishing: FishingSystem, cooking: CookingSystem, ui: ModalUIManager, language: LanguageSystem) {
    this.scene = scene;
    this.farming = farming;
    this.fishing = fishing;
    this.cooking = cooking;
    this.ui = ui;
    this.language = language;
    this.escapeKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
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
      this.escapeKey.reset();
    }, this.closeButton);
    this.language.onChange(() => this.updateInterface());
  }

  private createInterface(): void {
    this.panel = this.scene.add.container(0, 0).setScrollFactor(0);
    const background = modalPanel(this.scene, 320, 180, 570, 340);
    this.title = this.scene.add.text(320, 29, "", { fontFamily: this.language.getFontFamily(), fontSize: "17px", color: "#e6c47e", fontStyle: "bold" }).setOrigin(0.5);
    this.subtitle = this.scene.add.text(320, 52, "", { fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#d7e6c5" }).setOrigin(0.5);
    this.columns = this.scene.add.text(270, 68, "", { fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#e6c47e" }).setOrigin(0.5);
    this.quantityHeader = this.scene.add.text(390, 68, "", { fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#e6c47e" }).setOrigin(0.5);
    this.panel.add([background, this.title, this.subtitle, this.columns, this.quantityHeader]);

    ITEMS.forEach((item, index) => {
      const y = this.rowY[index];
      const card = this.scene.add.rectangle(320, y, 520, 26, index % 2 ? 0x394a32 : 0x40513a, 1).setStrokeStyle(1, 0x8b6742);
      const icon = this.scene.add.image(73, y, item.texture).setScale(0.9);
      const name = this.scene.add.text(92, y, "", { fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#fff1cf" }).setOrigin(0, 0.5);
      const bag = this.scene.add.text(238, y, "0", { fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#ffffff" }).setOrigin(0.5);
      const chest = this.scene.add.text(302, y, "0", { fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#f0d69e" }).setOrigin(0.5);
      const decrease = this.scene.add.rectangle(342, y, 20, 21, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
      const amount = this.scene.add.text(372, y, "1", { fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
      const increase = this.scene.add.rectangle(402, y, 20, 21, 0x527044, 1).setStrokeStyle(1, 0xd6b36b);
      const decreaseLabel = this.scene.add.text(342, y, "−", { fontFamily: this.language.getFontFamily(), fontSize: "11px", color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
      const increaseLabel = this.scene.add.text(402, y, "+", { fontFamily: this.language.getFontFamily(), fontSize: "11px", color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
      const maximum = this.scene.add.rectangle(441, y, 36, 21, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
      const maximumLabel = this.scene.add.text(441, y, "MAX", { fontFamily: this.language.getFontFamily(), fontSize: "7px", color: "#fff1cf", fontStyle: "bold" }).setOrigin(0.5);
      const put = this.scene.add.rectangle(495, y, 54, 21, 0x527044, 1).setStrokeStyle(1, 0xd6b36b);
      const take = this.scene.add.rectangle(555, y, 54, 21, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
      const putLabel = this.scene.add.text(495, y, "", { fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#fff1cf" }).setOrigin(0.5);
      const takeLabel = this.scene.add.text(555, y, "", { fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#fff1cf" }).setOrigin(0.5);
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
      this.panel.add([card, icon, name, bag, chest, decrease, amount, increase, decreaseLabel, increaseLabel, maximum, maximumLabel, put, take, putLabel, takeLabel]);
    });

    this.message = this.scene.add.text(320, 322, "", { fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#f0d69e" }).setOrigin(0.5);
    this.exitHint = this.scene.add.text(320, 338, "", { fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#d7e6c5" }).setOrigin(0.5);
    const close = modalClosePosition(320, 180, 570, 340);
    this.closeButton = createRedCloseButton(this.scene, close.x, close.y);
    this.panel.add([this.message, this.exitHint, this.closeButton]);
    this.updateInterface();
  }

  private playerCount(item: ChestItem): number {
    if (item === "seeds") return this.farming.getSeeds();
    if (item === "rice") return this.farming.getRice();
    if (item === "silverBarb" || item === "catfish" || item === "goldenCarp") return this.fishing.getFishCount(item);
    return this.cooking.getMealCounts()[item];
  }

  private transferToChest(item: ChestItem): number {
    const amount = Math.min(this.selectedAmounts[item], this.playerCount(item));
    if (amount <= 0) return 0;
    let removed = false;
    if (item === "seeds") removed = this.farming.removeSeeds(amount);
    else if (item === "rice") removed = this.farming.removeRice(amount);
    else if (item === "silverBarb" || item === "catfish" || item === "goldenCarp") removed = this.fishing.removeFish(item, amount);
    else removed = this.cooking.removeMeals(item, amount);
    if (!removed) return 0;
    this.stored[item] += amount;
    return amount;
  }

  private transferFromChest(item: ChestItem): number {
    const amount = Math.min(this.selectedAmounts[item], this.stored[item]);
    if (amount <= 0) return 0;
    this.stored[item] -= amount;
    if (item === "seeds") this.farming.addSeeds(amount);
    else if (item === "rice") this.farming.addRice(amount);
    else if (item === "silverBarb" || item === "catfish" || item === "goldenCarp") this.fishing.addFish(item, amount);
    else this.cooking.addMeals(item, amount);
    return amount;
  }

  private handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("chest")) return;
    const index = this.rowY.findIndex(y => Math.abs(pointer.y - y) <= 13);
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
      this.scene.game.canvas.style.cursor = "default";
      return;
    }
    const index = this.rowY.findIndex(y => Math.abs(pointer.y - y) <= 13);
    const overDecrease = index >= 0 && pointer.x >= 330 && pointer.x <= 354;
    const overIncrease = index >= 0 && pointer.x >= 390 && pointer.x <= 414;
    const overMaximum = index >= 0 && pointer.x >= 420 && pointer.x <= 462;
    const overPut = index >= 0 && pointer.x >= 468 && pointer.x <= 522;
    const overTake = index >= 0 && pointer.x >= 528 && pointer.x <= 582;
    this.decreaseButtons.forEach((button, i) => button.setFillStyle(overDecrease && i === index ? 0x98713d : 0x70532f, 1));
    this.increaseButtons.forEach((button, i) => button.setFillStyle(overIncrease && i === index ? 0x668651 : 0x527044, 1));
    this.maxButtons.forEach((button, i) => button.setFillStyle(overMaximum && i === index ? 0x98713d : 0x70532f, 1));
    this.putButtons.forEach((button, i) => button.setFillStyle(overPut && i === index ? 0x668651 : 0x527044, 1));
    this.takeButtons.forEach((button, i) => button.setFillStyle(overTake && i === index ? 0x98713d : 0x70532f, 1));
    this.scene.game.canvas.style.cursor = overDecrease || overIncrease || overMaximum || overPut || overTake ? "pointer" : "default";
  };

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
    this.subtitle.setText(this.language.t("chest.subtitle"));
    this.columns.setText(`${this.language.t("chest.bag")}     ${this.language.t("chest.chest")}`);
    this.quantityHeader.setText(this.language.t("chest.quantity"));
    this.exitHint.setText(this.language.t("common.clickCrossExit"));
    this.message.setText(this.messageValue);
    this.rowNames.forEach((text, index) => text.setText(this.language.t(ITEMS[index].key)));
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
    for (const text of [this.title, this.subtitle, this.columns, this.quantityHeader, this.message, this.exitHint, ...this.rowNames, ...this.playerCounts, ...this.chestCounts, ...this.putLabels, ...this.takeLabels, ...this.maxLabels, ...this.amountTexts]) text.setFontFamily(font);
  }

  openFromHouse(): void {
    if (!this.ui.isOpen("house")) return;
    this.isOpen = true;
    this.escapeKey.reset();
    this.messageValue = "";
    this.updateInterface();
    this.ui.openOver("chest");
  }

  update(): void {
    if (!this.isOpen) return;
    this.updateInterface();
    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.isOpen = false;
      this.ui.close("chest");
      this.escapeKey.reset();
    }
  }

  getSaveData(): ChestSaveData { return { stored: { ...this.stored } }; }

  loadSaveData(data?: ChestSaveData): void {
    if (!data?.stored) return;
    for (const item of ITEMS) this.stored[item.id] = Math.max(0, Math.floor(Number(data.stored[item.id]) || 0));
    this.updateInterface();
  }
}
