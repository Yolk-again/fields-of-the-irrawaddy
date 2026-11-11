
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
import { getSaveSlotStorageKey, isSupportedSaveVersion } from "./SaveSlotStorage";

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

  private language: LanguageSystem;

  private storageKey: string;
  private profileCreationComplete: boolean;


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
    _ui: ModalUIManager,
    language: LanguageSystem,
    saveSlot = 1,
    loadExisting = false
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

    this.language = language;
    const safeSlot = Number.isInteger(saveSlot) ? Math.min(3, Math.max(1, saveSlot)) : 1;
    this.storageKey = getSaveSlotStorageKey(safeSlot);
    this.profileCreationComplete = false;

    this.createInterface();

    window.addEventListener(
      "beforeunload",
      this.handleBeforeUnload
    );

    window.addEventListener(
      "pagehide",
      this.handleBeforeUnload
    );
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    this.scene.time.addEvent({
      delay: 10000,
      loop: true,
      callback: () => {
        if (this.profileCreationComplete) this.saveGame();
      }
    });

    this.scene.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => {
        this.saveGame();
        window.removeEventListener(
          "beforeunload",
          this.handleBeforeUnload
        );

        window.removeEventListener(
          "pagehide",
          this.handleBeforeUnload
        );
        document.removeEventListener("visibilitychange", this.handleVisibilityChange);
      }
    );

    if (loadExisting) {
      this.profileCreationComplete = this.loadGame() === "common.loaded";
    }
  }

  private createInterface(): void {
    // Manual save/load controls live inside the profile panel now.
    // Autosaves are silent and never add a permanent HUD message.
  }

  private createSaveData(): GameSaveData {
    return {
      version: 16,
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

  completeInitialProfile(): void {
    this.profileCreationComplete = true;
    this.saveNow();
  }

  saveNow(): void {
    if (!this.profileCreationComplete) return;
    this.saveGame();
  }

  saveFromProfile(): string {
    return this.saveGame() ? "common.saved" : "common.saveFailed";
  }

  loadFromProfile(): string {
    const result = this.loadGame();
    if (result === "common.loaded") this.profileCreationComplete = true;
    return result;
  }

  private saveGame(): boolean {
    if (!this.profileCreationComplete) return false;
    try {
      const saveData = this.createSaveData();
      window.localStorage.setItem(this.storageKey, JSON.stringify(saveData));
      return true;
    } catch (error) {
      console.error("Game save failed:", error);
      return false;
    }
  }

  private loadGame(): string {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return "common.noSave";

      const parsed: unknown = JSON.parse(raw);

      if (
        typeof parsed !== "object" ||
        parsed === null
      ) {
        throw new Error("Invalid save data.");
      }

      const data = parsed as GameSaveData;

      if (
        !isSupportedSaveVersion(data.version) ||
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

      return "common.loaded";
    } catch (error) {
      console.error("Game load failed:", error);
      return "common.loadFailed";
    }
  }

  private handleBeforeUnload = (): void => {
    this.saveGame();
  };

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") {
      this.saveGame();
    }
  };
}
