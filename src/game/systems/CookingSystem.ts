import Phaser from "phaser";
import { FarmingSystem } from "./FarmingSystem";
import { FishingSystem, type FishKind } from "./FishingSystem";
import { LanguageSystem } from "./LanguageSystem";
import { ModalUIManager } from "./ModalUIManager";
import { createRedCloseButton, modalClosePosition, modalPanel, uiDescriptionStyle, uiFontSize } from "../ui/PixelUI";
import { isMobilePlatform } from "../utils/DeviceMode";

export type MealKind = "fishRice" | "mohinga" | "fishCurry";
export interface CookingSaveData {
  meals: Record<MealKind, number>;
}

interface Recipe {
  id: MealKind;
  fish: FishKind | "any";
  fishAmount: number;
  riceAmount: number;
  value: number;
  texture: string;
  titleKey: string;
  descriptionKey: string;
}

const RECIPES: Recipe[] = [
  { id: "fishRice", fish: "any", fishAmount: 1, riceAmount: 2, value: 18, texture: "meal_fish_rice_asset", titleKey: "cooking.recipe.fishRice", descriptionKey: "cooking.recipe.fishRiceDesc" },
  { id: "mohinga", fish: "catfish", fishAmount: 1, riceAmount: 3, value: 32, texture: "meal_mohinga_asset", titleKey: "cooking.recipe.mohinga", descriptionKey: "cooking.recipe.mohingaDesc" },
  { id: "fishCurry", fish: "goldenCarp", fishAmount: 1, riceAmount: 2, value: 36, texture: "meal_fish_curry_asset", titleKey: "cooking.recipe.fishCurry", descriptionKey: "cooking.recipe.fishCurryDesc" }
];

/** Indoor home cooker: prepare dishes by combining the player's rice and catch. */
export class CookingSystem {
  private scene: Phaser.Scene;
  private farming: FarmingSystem;
  private fishing: FishingSystem;
  private ui: ModalUIManager;
  private language: LanguageSystem;
  private isOpen = false;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private oneKey!: Phaser.Input.Keyboard.Key;
  private twoKey!: Phaser.Input.Keyboard.Key;
  private threeKey!: Phaser.Input.Keyboard.Key;
  private eatKey!: Phaser.Input.Keyboard.Key;

  private panel!: Phaser.GameObjects.Container;
  private closeButton!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private exitText!: Phaser.GameObjects.Text;
  private eatBackground!: Phaser.GameObjects.Rectangle;
  private eatText!: Phaser.GameObjects.Text;
  private detailPanel!: Phaser.GameObjects.Container;
  private detailTitle!: Phaser.GameObjects.Text;
  private detailDescription!: Phaser.GameObjects.Text;
  private detailInfo!: Phaser.GameObjects.Text;
  private detailCook!: Phaser.GameObjects.Rectangle;
  private detailBack!: Phaser.GameObjects.Rectangle;
  private detailButtons: Phaser.GameObjects.Text[] = [];
  private selectedRecipeIndex: number | null = null;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private cardBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  private cardTexts: Phaser.GameObjects.Text[] = [];
  private recipeStatusBadges: Phaser.GameObjects.Text[] = [];
  private message = "";
  private readonly mobileMode = isMobilePlatform();

  constructor(
    scene: Phaser.Scene,
    farming: FarmingSystem,
    fishing: FishingSystem,
    ui: ModalUIManager,
    language: LanguageSystem
  ) {
    this.scene = scene;
    this.farming = farming;
    this.fishing = fishing;
    this.ui = ui;
    this.language = language;

    this.interactKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.oneKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.twoKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.threeKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.eatKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.spaceKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.createInterface();
    this.scene.input.on("pointerup", this.handlePointerUp, this);
    this.scene.input.on("pointermove", this.handlePointerMove, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.input.off("pointerup", this.handlePointerUp, this);
      this.scene.input.off("pointermove", this.handlePointerMove, this);
      this.scene.game.canvas.style.cursor = "default";
    });

    this.ui.registerPanel("cooking", this.panel, 230, () => {
      this.isOpen = false;
      this.closeRecipeDetail();
      this.interactKey.reset();
    }, this.closeButton);
    this.language.onChange(() => this.updateInterface());
  }

  private createInterface(): void {
    this.panel = this.scene.add.container(0, 0).setScrollFactor(0);
    const background = modalPanel(this.scene, 320, 180, 530, 310);
    this.panel.add(background);
    this.titleText = this.scene.add.text(320, 43, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(18), color: "#e6c47e", fontStyle: "bold"
    }).setOrigin(0.5);
    const divider = this.scene.add.rectangle(320, 67, 470, 2, 0x9b7047, 0.8);
    this.subtitleText = this.scene.add.text(320, 83, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(9), color: "#d7e6c5", align: "center",
      wordWrap: { width: 430 }
    }).setOrigin(0.5);

    const ys = [125, 173, 221];
    RECIPES.forEach((recipe, index) => {
      const y = ys[index];
      const card = this.scene.add.rectangle(320, y, 446, 46, 0x40513a, 1).setStrokeStyle(2, 0x9b7047);
      const icon = this.scene.add.image(116, y, recipe.texture).setScale(1.7);
      const title = this.scene.add.text(150, y - 9, "", {
        fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(10), color: "#fff1cf", fontStyle: "bold",
        wordWrap: { width: 280 }
      }).setOrigin(0, 0.5);
      const description = this.scene.add.text(150, y + 9, "", {
        fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(8), color: "#d7e6c5",
        wordWrap: { width: 280 }
      }).setOrigin(0, 0.5);
      const status = this.scene.add.text(474, y, "", {
        fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(8), color: "#fff1cf", fontStyle: "bold",
        backgroundColor: "#527044", padding: { x: 5, y: 3 }, align: "center"
      }).setOrigin(0.5);
      this.cardBackgrounds.push(card);
      this.cardTexts.push(title, description);
      this.recipeStatusBadges.push(status);
      this.panel.add([card, icon, title, description, status]);
    });

    this.statusText = this.scene.add.text(320, 254, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(8), color: "#f0d69e", align: "center", wordWrap: { width: 460 }
    }).setOrigin(0.5);
    this.eatBackground = this.scene.add.rectangle(320, 281, 340, 24, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
    this.eatText = this.scene.add.text(320, 281, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(7), color: "#fff1cf", fontStyle: "bold",
      wordWrap: { width: 315 }
    }).setOrigin(0.5);
    this.exitText = this.scene.add.text(320, 313, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(8), color: "#d7e6c5", align: "center"
    }).setOrigin(0.5);

    const closePosition = modalClosePosition(320, 180, 530, 310);
    this.closeButton = createRedCloseButton(this.scene, closePosition.x, closePosition.y);
    this.panel.add([divider, this.titleText, this.subtitleText, this.statusText, this.eatBackground, this.eatText, this.exitText, this.closeButton]);
    this.createRecipeDetail();
    this.updateInterface();
  }

  private createRecipeDetail(): void {
    this.detailPanel = this.scene.add.container(0, 0).setVisible(false);
    const background = modalPanel(this.scene, 320, 180, 420, 212);
    this.detailTitle = this.scene.add.text(320, 94, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(15), color: "#e6c47e", fontStyle: "bold"
    }).setOrigin(0.5);
    this.detailDescription = this.scene.add.text(320, 132, "", {
      ...uiDescriptionStyle(this.language.getFontFamily(), 350, 10), align: "center"
    }).setOrigin(0.5);
    this.detailInfo = this.scene.add.text(320, 194, "", {
      ...uiDescriptionStyle(this.language.getFontFamily(), 356, 9), color: "#ffe49a", align: "center"
    }).setOrigin(0.5);
    this.detailCook = this.scene.add.rectangle(260, 263, 112, 28, 0x527044, 1).setStrokeStyle(1, 0xd6b36b);
    const cookLabel = this.scene.add.text(260, 263, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(10), color: "#fff1cf", fontStyle: "bold"
    }).setOrigin(0.5);
    this.detailBack = this.scene.add.rectangle(378, 263, 112, 28, 0x70532f, 1).setStrokeStyle(1, 0xd6b36b);
    const backLabel = this.scene.add.text(378, 263, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(10), color: "#fff1cf", fontStyle: "bold"
    }).setOrigin(0.5);
    this.detailButtons = [cookLabel, backLabel];
    this.detailPanel.add([background, this.detailTitle, this.detailDescription, this.detailInfo, this.detailCook, cookLabel, this.detailBack, backLabel]);
    this.panel.add(this.detailPanel);
  }

  private updateInterface(): void {
    const font = this.language.getFontFamily();
    this.titleText.setText(this.language.t("cooking.title"));
    this.subtitleText.setText(this.language.t(this.mobileMode ? "cooking.mobileSubtitle" : "cooking.subtitle"));
    this.exitText.setText(this.language.t(this.mobileMode ? "cooking.mobileExitHint" : "cooking.exitHint"));
    this.eatText.setText(this.language.t("cooking.eatButton"));
    this.eatBackground.setFillStyle(0x70532f, 1);
    for (const text of [this.titleText, this.subtitleText, this.statusText, this.exitText, ...this.cardTexts, ...this.recipeStatusBadges, this.eatText, this.detailTitle, this.detailDescription, this.detailInfo, ...this.detailButtons]) {
      text.setFontFamily(font);
    }
    const riceOwned = this.farming.getRice();
    RECIPES.forEach((recipe, index) => {
      const recipePrefix = this.mobileMode ? "" : `${index + 1}. `;
      this.cardTexts[index * 2].setText(`${recipePrefix}${this.language.t(recipe.titleKey)}`);
      this.cardTexts[index * 2 + 1].setText(this.language.t("cooking.made", { amount: this.getMealCount(recipe.id) }));
      const fishOwned = recipe.fish === "any"
        ? this.fishing.getFishTotal()
        : this.fishing.getFishCount(recipe.fish);
      const canCook = riceOwned >= recipe.riceAmount && fishOwned >= recipe.fishAmount;
      const missingRice = Math.max(0, recipe.riceAmount - riceOwned);
      const badge = this.recipeStatusBadges[index];
      badge.setText(this.language.t(canCook
        ? "cooking.status.ready"
        : missingRice > 0
          ? "cooking.status.needRice"
          : "cooking.status.needFish", { amount: missingRice }));
      badge.setStyle(canCook
        ? { color: "#f4ffe9", backgroundColor: "#3e7446" }
        : { color: "#fff0df", backgroundColor: "#8b4035" });
      this.cardBackgrounds[index].setFillStyle(canCook ? 0x40513a : 0x383d32, 1);
    });
    this.statusText.setText(this.message || this.ingredientSummary());
    if (this.selectedRecipeIndex !== null) this.updateRecipeDetail();
  }

  private ingredientSummary(): string {
    return this.language.t("cooking.ingredientSummary", {
      rice: this.farming.getRice(),
      fish: this.fishing.getFishTotal()
    });
  }

  private canCook(recipe: Recipe): boolean {
    if (this.farming.getRice() < recipe.riceAmount) return false;
    return recipe.fish === "any"
      ? this.fishing.getFishTotal() >= recipe.fishAmount
      : this.fishing.getFishCount(recipe.fish) >= recipe.fishAmount;
  }

  private inspectRecipe(index: number): void {
    if (!RECIPES[index]) return;
    this.selectedRecipeIndex = index;
    this.updateRecipeDetail();
    this.detailPanel.setVisible(true);
  }

  private closeRecipeDetail(): void {
    this.selectedRecipeIndex = null;
    this.detailPanel?.setVisible(false);
  }

  private updateRecipeDetail(): void {
    if (this.selectedRecipeIndex === null) return;
    const recipe = RECIPES[this.selectedRecipeIndex];
    if (!recipe) return;
    const fishName = recipe.fish === "any"
      ? this.language.t("cooking.anyFish")
      : this.language.t(`inventory.${recipe.fish}`);
    const fishOwned = recipe.fish === "any"
      ? this.fishing.getFishTotal()
      : this.fishing.getFishCount(recipe.fish);
    const font = this.language.getFontFamily();
    this.detailTitle.setText(this.language.t(recipe.titleKey));
    this.detailDescription.setText(this.language.t(recipe.descriptionKey));
    this.detailInfo.setText(this.language.t("cooking.inspectInfo", {
      riceAmount: recipe.riceAmount,
      fishAmount: recipe.fishAmount,
      fish: fishName,
      riceOwned: this.farming.getRice(),
      fishOwned,
      value: recipe.value
    }));
    this.detailButtons[0].setText(this.language.t("cooking.inspectCook"));
    this.detailButtons[1].setText(this.language.t("cooking.inspectBack"));
    const canPrepare = this.canCook(recipe);
    this.detailCook.setFillStyle(canPrepare ? 0x527044 : 0x65513a, 1).setAlpha(canPrepare ? 1 : 0.62);
    for (const text of [this.detailTitle, this.detailDescription, this.detailInfo, ...this.detailButtons]) text.setFontFamily(font);
  }

  private getMealCount(kind: MealKind): number {
    return this.meals[kind];
  }

  private meals: Record<MealKind, number> = { fishRice: 0, mohinga: 0, fishCurry: 0 };

  private cook(index: number): void {
    const recipe = RECIPES[index];
    if (!recipe) return;
    if (this.farming.getRice() < recipe.riceAmount) {
      this.message = this.language.t("cooking.needRice", { amount: recipe.riceAmount });
      this.updateInterface();
      this.scene.events.emit("sound-effect", "error");
      return;
    }
    const hasFish = recipe.fish === "any"
      ? this.fishing.getFishTotal() >= recipe.fishAmount
      : this.fishing.getFishCount(recipe.fish) >= recipe.fishAmount;
    if (!hasFish) {
      this.message = this.language.t(recipe.fish === "any" ? "cooking.needFish" : `cooking.need.${recipe.fish}`);
      this.updateInterface();
      this.scene.events.emit("sound-effect", "error");
      return;
    }

    if (!this.farming.removeRice(recipe.riceAmount)) return;
    const removedFish = recipe.fish === "any"
      ? this.fishing.removeAnyFish(recipe.fishAmount)
      : this.fishing.removeFish(recipe.fish, recipe.fishAmount);
    if (!removedFish) {
      // This should only occur if another system changed resources during the same input frame.
      this.message = this.language.t("cooking.cookFailed");
      this.updateInterface();
      return;
    }

    this.meals[recipe.id]++;
    this.closeRecipeDetail();
    this.message = this.language.t("cooking.cooked", { meal: this.language.t(recipe.titleKey) });
    this.scene.events.emit("player-action", "cook");
    this.scene.events.emit("sound-effect", "cook");
    this.updateInterface();
  }

  private handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("cooking")) return;
    if (this.selectedRecipeIndex !== null) {
      if (pointer.x >= 204 && pointer.x <= 318 && pointer.y >= 246 && pointer.y <= 280) {
        const recipe = RECIPES[this.selectedRecipeIndex];
        if (recipe && this.canCook(recipe)) this.cook(this.selectedRecipeIndex);
        return;
      }
      if (pointer.x >= 322 && pointer.x <= 434 && pointer.y >= 246 && pointer.y <= 280) {
        this.closeRecipeDetail();
        return;
      }
      return;
    }
    if (pointer.x < 97 || pointer.x > 543) return;
    const ys = [125, 173, 221];
    const index = ys.findIndex(y => pointer.y >= y - 23 && pointer.y <= y + 23);
    if (index >= 0) {
      this.inspectRecipe(index);
      return;
    }
    if (pointer.x >= 150 && pointer.x <= 490 && pointer.y >= 269 && pointer.y <= 293) this.eatMeal();
  };

  private handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isOpen || !this.ui.isOpen("cooking")) {
      this.cardBackgrounds.forEach((card, index) => card.setFillStyle(index === 0 ? 0x40513a : 0x3d4b34, 1));
      this.scene.game.canvas.style.cursor = "default";
      return;
    }
    if (this.selectedRecipeIndex !== null) {
      const overCook = pointer.x >= 204 && pointer.x <= 318 && pointer.y >= 246 && pointer.y <= 280;
      const overBack = pointer.x >= 322 && pointer.x <= 434 && pointer.y >= 246 && pointer.y <= 280;
      const recipe = RECIPES[this.selectedRecipeIndex];
      const canPrepare = !!recipe && this.canCook(recipe);
      this.detailCook.setFillStyle(overCook && canPrepare ? 0x668651 : canPrepare ? 0x527044 : 0x65513a, 1).setAlpha(canPrepare ? 1 : 0.62);
      this.detailBack.setFillStyle(overBack ? 0x98713d : 0x70532f, 1);
      this.scene.game.canvas.style.cursor = (overCook && canPrepare) || overBack ? "pointer" : "default";
      return;
    }
    const ys = [125, 173, 221];
    let over = -1;
    if (pointer.x >= 97 && pointer.x <= 543) over = ys.findIndex(y => pointer.y >= y - 23 && pointer.y <= y + 23);
    const overEat = pointer.x >= 150 && pointer.x <= 490 && pointer.y >= 269 && pointer.y <= 293;
    this.cardBackgrounds.forEach((card, index) => card.setFillStyle(index === over ? 0x58734b : 0x40513a, 1));
    this.eatBackground.setFillStyle(overEat ? 0x98713d : 0x70532f, 1);
    this.scene.game.canvas.style.cursor = over >= 0 || overEat ? "pointer" : "default";
  };

  /** Open the cooker as a sub-panel so closing it returns the player to the house. */
  openFromHouse(): void {
    if (!this.ui.isOpen("house")) return;
    this.isOpen = true;
    this.message = "";
    this.closeRecipeDetail();
    this.updateInterface();
    this.ui.openOver("cooking");
  }

  private close = (): void => {
    this.isOpen = false;
    this.closeRecipeDetail();
    this.ui.close("cooking");
    this.interactKey.reset();
  };

  /** Called by the scene in world updates and while the cooking modal is open. */
  update(_playerX: number, _playerY: number): void {
    if (this.isOpen) {
      if (this.selectedRecipeIndex !== null) {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
          const recipe = RECIPES[this.selectedRecipeIndex];
          if (recipe && this.canCook(recipe)) this.cook(this.selectedRecipeIndex);
        }
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.closeRecipeDetail();
      } else {
        if (Phaser.Input.Keyboard.JustDown(this.oneKey)) this.inspectRecipe(0);
        if (Phaser.Input.Keyboard.JustDown(this.twoKey)) this.inspectRecipe(1);
        if (Phaser.Input.Keyboard.JustDown(this.threeKey)) this.inspectRecipe(2);
        if (Phaser.Input.Keyboard.JustDown(this.eatKey)) this.eatMeal();
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.close();
      }
      return;
    }

    // Cooking is only opened by interacting with the indoor hearth.
  }

  private eatMeal(): void {
    const available: MealKind[] = ["fishRice", "fishCurry", "mohinga"];
    const kind = available.find(key => this.meals[key] > 0);
    if (!kind) {
      this.message = this.language.t("cooking.noMealToEat");
      this.updateInterface();
      return;
    }
    this.meals[kind]--;
    this.farming.applyMealBlessing();
    this.message = this.language.t("cooking.wellFed");
    this.scene.events.emit("player-action", "eat");
    this.scene.events.emit("sound-effect", "eat");
    this.updateInterface();
  }

  getTotalMeals(): number {
    return this.meals.fishRice + this.meals.mohinga + this.meals.fishCurry;
  }

  getMealCounts(): Record<MealKind, number> {
    return { ...this.meals };
  }

  addMeals(kind: MealKind, amount: number): void {
    this.meals[kind] += Math.max(0, Math.floor(amount));
    this.updateInterface();
  }

  removeMeals(kind: MealKind, amount: number): boolean {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (this.meals[kind] < safeAmount) return false;
    this.meals[kind] -= safeAmount;
    this.updateInterface();
    return true;
  }

  /** Returns total sale value and clears all cooked dishes. */
  sellAllMeals(): number {
    let value = 0;
    for (const recipe of RECIPES) {
      value += this.meals[recipe.id] * recipe.value;
      this.meals[recipe.id] = 0;
    }
    this.updateInterface();
    return value;
  }

  getSaveData(): CookingSaveData {
    return { meals: { ...this.meals } };
  }

  loadSaveData(data?: CookingSaveData): void {
    if (!data) return;
    for (const key of ["fishRice", "mohinga", "fishCurry"] as MealKind[]) {
      this.meals[key] = Math.max(0, Math.floor(Number(data.meals?.[key]) || 0));
    }
    this.updateInterface();
  }
}
