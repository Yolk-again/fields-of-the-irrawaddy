
import Phaser from "phaser";

import { FarmingSystem } from "./FarmingSystem";
import { MarketSystem } from "./MarketSystem";
import { FishingSystem } from "./FishingSystem";
import { CookingSystem } from "./CookingSystem";
import { ChestStorageSystem } from "./ChestStorageSystem";
import { InventorySystem } from "./InventorySystem";
import { VillageBoardSystem } from "./VillageBoardSystem";
import { VillageSystem } from "./VillageSystem";
import { PlayerProfileSystem } from "./PlayerProfileSystem";
import { ModalUIManager } from "./ModalUIManager";
import {
  LanguageSystem,
  type Language
} from "./LanguageSystem";

const WORLD_WIDTH = 1440;
const WORLD_HEIGHT = 640;

interface GameSaveData {
  version: number;
  savedAt: string;

  player: {
    x: number;
    y: number;
  };

  farming: ReturnType<FarmingSystem["getSaveData"]>;
  market: ReturnType<MarketSystem["getSaveData"]>;
  fishing?: ReturnType<FishingSystem["getSaveData"]>;
  cooking?: ReturnType<CookingSystem["getSaveData"]>;
  chest?: ReturnType<ChestStorageSystem["getSaveData"]>;
  inventory: ReturnType<InventorySystem["getSaveData"]>;
  board?: ReturnType<VillageBoardSystem["getSaveData"]>;
  village: ReturnType<VillageSystem["getSaveData"]>;
  profile?: ReturnType<PlayerProfileSystem["getSaveData"]>;
  language?: Language;
}

export class SaveSystem {
  private scene: Phaser.Scene;
  private player: Phaser.GameObjects.Container;

  private farming: FarmingSystem;
  private market: MarketSystem;
  private fishing: FishingSystem;
  private cooking: CookingSystem;
  private chest: ChestStorageSystem;
  private inventory: InventorySystem;
  private board: VillageBoardSystem;
  private village: VillageSystem;
  private profile: PlayerProfileSystem;

  private ui: ModalUIManager;
  private language: LanguageSystem;

  private storageKey = "fields_of_irrawaddy_save_v3";

  private statusText!: Phaser.GameObjects.Text;
  private controls: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = [];

  constructor(
    scene: Phaser.Scene,
    player: Phaser.GameObjects.Container,
    farming: FarmingSystem,
    market: MarketSystem,
    fishing: FishingSystem,
    cooking: CookingSystem,
    chest: ChestStorageSystem,
    inventory: InventorySystem,
    board: VillageBoardSystem,
    village: VillageSystem,
    profile: PlayerProfileSystem,
    ui: ModalUIManager,
    language: LanguageSystem
  ) {
    this.scene = scene;
    this.player = player;

    this.farming = farming;
    this.market = market;
    this.fishing = fishing;
    this.cooking = cooking;
    this.chest = chest;
    this.inventory = inventory;
    this.board = board;
    this.village = village;
    this.profile = profile;

    this.ui = ui;
    this.language = language;

    this.createInterface();

    window.addEventListener(
      "beforeunload",
      this.handleBeforeUnload
    );

    window.addEventListener(
      "pagehide",
      this.handleBeforeUnload
    );

    this.scene.time.addEvent({
      delay: 10000,
      loop: true,
      callback: () => {
        this.saveGame(undefined, true);
      }
    });

    this.scene.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => {
        window.removeEventListener(
          "beforeunload",
          this.handleBeforeUnload
        );

        window.removeEventListener(
          "pagehide",
          this.handleBeforeUnload
        );
      }
    );

    this.language.onChange(() => {
      this.updateButtonLabels();
    });

    this.loadGame();
  }

  private createInterface(): void {
    this.createButton(
      48,
      88,
      "save.saveButton",
      () => this.saveGame()
    );

    this.createButton(
      132,
      88,
      "save.loadButton",
      () => this.loadGame()
    );

    this.statusText = this.scene.add.text(
      12,
      107,
      "",
      {
        fontFamily: this.language.getFontFamily(),
        fontSize: "10px",
        color: "#e6c47e",
        backgroundColor: "#34271d",
        padding: { x: 4, y: 3 }
      }
    )
      .setScrollFactor(0)
      .setDepth(142);

    this.ui.registerHud(this.statusText);
  }

  private createButton(
    x: number,
    y: number,
    labelKey: string,
    action: () => void
  ): void {
    const background = this.scene.add.rectangle(
      x,
      y,
      76,
      24,
      0x79382e,
      0.98
    );

    background.setStrokeStyle(1, 0xd6b36b);

    background
      .setScrollFactor(0)
      .setDepth(140)
      .setInteractive({ useHandCursor: true });

    background.on("pointerdown", action);

    const buttonText = this.scene.add.text(
      x,
      y,
      "",
      {
        fontFamily: this.language.getFontFamily(),
        fontSize: "10px",
        color: "#f5e8c6"
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(141);

    buttonText.setData("labelKey", labelKey);

    this.ui.registerHud(
      background,
      buttonText
    );
    this.controls.push(background, buttonText);

    this.updateButtonLabel(buttonText);
  }

  private updateButtonLabel(
    button: Phaser.GameObjects.Text
  ): void {
    const key = button.getData("labelKey") as string;

    button.setText(this.language.t(key));

    button.setFontFamily(
      this.language.getFontFamily()
    );
  }

  private updateButtonLabels(): void {
    for (const object of this.scene.children.list) {
      if (
        object instanceof Phaser.GameObjects.Text &&
        typeof object.getData("labelKey") === "string"
      ) {
        this.updateButtonLabel(object);
      }
    }

    if (this.statusText) {
      this.statusText.setFontFamily(
        this.language.getFontFamily()
      );
    }
  }

  /** Save/load remain available from the mobile action grid without crowding it with desktop buttons. */
  setMobileControlsHidden(hidden: boolean): void {
    for (const control of this.controls) control.setVisible(!hidden);
  }

  mobileSave(): void { this.saveGame(); }

  mobileLoad(): void { this.loadGame(); }

  private createSaveData(): GameSaveData {
    return {
      version: 13,
      savedAt: new Date().toISOString(),

      player: {
        x: this.player.x,
        y: this.player.y
      },

      farming: this.farming.getSaveData(),
      market: this.market.getSaveData(),
      fishing: this.fishing.getSaveData(),
      cooking: this.cooking.getSaveData(),
      chest: this.chest.getSaveData(),
      inventory: this.inventory.getSaveData(),
      board: this.board.getSaveData(),
      village: this.village.getSaveData(),
      profile: this.profile.getSaveData(),
      language: this.language.getLanguage()
    };
  }

  saveNow(): void {
    this.saveGame(this.language.t("common.saved"));
  }

  private saveGame(message?: string, silent = false): void {
    try {
      const saveData = this.createSaveData();

      window.localStorage.setItem(
        this.storageKey,
        JSON.stringify(saveData)
      );

      if (!silent) {
        this.statusText.setText(
          message ?? this.language.t("common.saved")
        );
      }
    } catch (error) {
      this.statusText.setText(
        this.language.t("common.saveFailed")
      );

      console.error("Game save failed:", error);
    }
  }

  private loadGame(): void {
    try {
      const currentSave = window.localStorage.getItem(
        this.storageKey
      );

      const previousSave = currentSave
        ? null
        : window.localStorage.getItem(
            "fields_of_irrawaddy_save_v1"
          );

      const raw = currentSave ?? previousSave;

      if (!raw) {
        this.statusText.setText(
          this.language.t("common.noSave")
        );
        return;
      }

      const parsed: unknown = JSON.parse(raw);

      if (
        typeof parsed !== "object" ||
        parsed === null
      ) {
        throw new Error("Invalid save data.");
      }

      const data = parsed as GameSaveData;

      if (
        ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(data.version) ||
        !data.player ||
        !Number.isFinite(data.player.x) ||
        !Number.isFinite(data.player.y) ||
        !data.farming ||
        !Array.isArray(data.farming.tiles) ||
        !data.market ||
        !data.inventory ||
        !data.inventory.items ||
        !Array.isArray(data.inventory.collected) ||
        (data.version >= 4 && !data.board) ||
        !data.village
      ) {
        throw new Error(
          "Save file is incomplete or invalid."
        );
      }

      const x = Phaser.Math.Clamp(
        data.player.x,
        8,
        WORLD_WIDTH - 8
      );

      const y = Phaser.Math.Clamp(
        data.player.y,
        12,
        WORLD_HEIGHT - 16
      );

      this.player.setPosition(x, y);

      // Restore the world clock before crop timestamps so saved watering times
      // are compared against the correct elapsed in-game minute.
      this.village.loadSaveData(data.village);
      this.farming.loadSaveData(data.farming, data.version < 5);
      this.market.loadSaveData(data.market);
      this.fishing.loadSaveData(data.fishing);
      this.cooking.loadSaveData(data.cooking);
      this.chest.loadSaveData(data.chest);
      this.inventory.loadSaveData(data.inventory);
      if (data.board) this.board.loadSaveData(data.board);

      if (data.profile) {
        this.profile.loadSaveData(data.profile);
      }

      if (
        data.language === "my" ||
        data.language === "en"
      ) {
        this.language.setLanguage(data.language);
      }

      this.statusText.setText(
        this.language.t("common.loaded")
      );
    } catch (error) {
      this.statusText.setText(
        this.language.t("common.loadFailed")
      );

      console.error("Game load failed:", error);
    }
  }

  private handleBeforeUnload = (): void => {
    this.saveGame(undefined, true);
  };
}
