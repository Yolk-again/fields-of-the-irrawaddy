import Phaser from "phaser";
import { LanguageSystem } from "./LanguageSystem";
import { ModalUIManager } from "./ModalUIManager";

export type FishKind = "silverBarb" | "catfish" | "goldenCarp";
export type FishingBaitKind = "worm" | "shrimp" | "goldenCricket";

export interface FishingSaveData {
  rodOwned: boolean;
  fish: Record<FishKind, number>;
  baits?: Partial<Record<FishingBaitKind, number>>;
}

interface FishingSpot {
  x: number;
  y: number;
  waterX: number;
}

const FISH_KEYS: FishKind[] = ["silverBarb", "catfish", "goldenCarp"];
const BAIT_KEYS: FishingBaitKind[] = ["worm", "shrimp", "goldenCricket"];
const FISHING_INTERACTION_RADIUS = 30;
const BAIT_ITEM_TO_KIND: Record<string, FishingBaitKind> = {
  wormBait: "worm",
  shrimpBait: "shrimp",
  goldenCricketBait: "goldenCricket"
};

/** Riverbank fishing with a timed bite-and-reel interaction. */
export class FishingSystem {
  private scene: Phaser.Scene;
  private language: LanguageSystem;
  private ui: ModalUIManager;
  private getGameHour: () => number;
  private lastPlayerX = 0;
  private lastPlayerY = 0;

  private rodOwned = false;
  private baits: Record<FishingBaitKind, number> = { worm: 0, shrimp: 0, goldenCricket: 0 };
  private selectedBait: FishingBaitKind | null = null;
  private currentCastBait: FishingBaitKind | null = null;
  private soundX = 320;
  private soundY = 330;
  private fish: Record<FishKind, number> = {
    silverBarb: 0,
    catfish: 0,
    goldenCarp: 0
  };

  private readonly spots: FishingSpot[] = [
    { x: 270, y: 507, waterX: 270 },
    // The former middle spot sat inside the granary's collision footprint.
    // This bank section below the eastern NPC paddy is open and walkable.
    { x: 830, y: 507, waterX: 830 },
    { x: 1210, y: 507, waterX: 1210 }
  ];

  private castKey!: Phaser.Input.Keyboard.Key;
  private reelKey!: Phaser.Input.Keyboard.Key;
  private state: "idle" | "waiting" | "bite" = "idle";
  private stateTimer = 0;
  private biteWindow = 0;
  private biteDelay = 2600;
  private prompt!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private line!: Phaser.GameObjects.Graphics;
  private bobber!: Phaser.GameObjects.Arc;
  private markers: Phaser.GameObjects.Container[] = [];

  constructor(
    scene: Phaser.Scene,
    ui: ModalUIManager,
    language: LanguageSystem,
    getGameHour: () => number
  ) {
    this.scene = scene;
    this.ui = ui;
    this.language = language;
    this.getGameHour = getGameHour;

    const keyboard = scene.input.keyboard!;
    this.castKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.reelKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.createFishingSpots();
    this.createInterface();
    scene.events.on("hotbar-selection-changed", this.handleHotbarSelection, this);
    this.language.onChange(() => this.updateInterface());
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off("hotbar-selection-changed", this.handleHotbarSelection, this);
      this.markers.forEach(marker => marker.destroy());
      this.line.destroy();
      this.bobber.destroy();
    });
  }

  private createFishingSpots(): void {
    for (const spot of this.spots) {
      const marker = this.scene.add.container(spot.x, spot.y + 4).setDepth(524);
      const shadow = this.scene.add.ellipse(0, 0, 23, 7, 0x1d4a4c, 0.45);
      const ring = this.scene.add.circle(0, -3, 5, 0x6db9bd, 0.7).setStrokeStyle(1, 0xc8e8d6, 0.9);
      const fishIcon = this.scene.add.image(0, -12, "fish_silver_barb_asset").setScale(1.15);
      marker.add([shadow, ring, fishIcon]);
      this.scene.tweens.add({
        targets: ring,
        alpha: { from: 0.35, to: 0.9 },
        scale: { from: 0.85, to: 1.18 },
        duration: 1100,
        yoyo: true,
        repeat: -1
      });
      this.markers.push(marker);
    }
  }

  private createInterface(): void {
    this.prompt = this.scene.add.text(320, 292, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#fff1cf",
      backgroundColor: "#2a1a14",
      padding: { x: 7, y: 4 },
      align: "center"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(7000).setVisible(false).setInteractive({ useHandCursor: true });
    this.prompt.on("pointerdown", this.handlePromptPointerDown, this);

    this.toastText = this.scene.add.text(320, 264, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "11px",
      color: "#ffe18a",
      backgroundColor: "#2a1a14",
      padding: { x: 7, y: 4 },
      align: "center"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(7001).setAlpha(0);

    this.line = this.scene.add.graphics().setDepth(530);
    this.bobber = this.scene.add.circle(0, 0, 4, 0xd45d45, 1)
      .setStrokeStyle(1, 0xf5e6bc, 1)
      .setDepth(531)
      .setVisible(false);

    this.ui.registerHud(this.prompt, this.toastText);
    this.updateInterface();
  }

  private updateInterface(): void {
    this.prompt.setFontFamily(this.language.getFontFamily());
    this.toastText.setFontFamily(this.language.getFontFamily());
  }

  getHasRod(): boolean {
    return this.rodOwned;
  }

  grantFishingRod(): void {
    this.rodOwned = true;
    this.showToast(this.language.t("fishing.rodPurchased"));
  }

  getFishCount(kind: FishKind): number {
    return this.fish[kind];
  }

  getBaitCount(kind: FishingBaitKind): number {
    return this.baits[kind];
  }

  addBait(kind: FishingBaitKind, amount = 1): void {
    this.baits[kind] += Math.max(0, Math.floor(amount));
  }

  removeBait(kind: FishingBaitKind, amount = 1): boolean {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (this.baits[kind] < safeAmount) return false;
    this.baits[kind] -= safeAmount;
    return true;
  }

  getSelectedBait(): FishingBaitKind | null {
    return this.selectedBait;
  }

  setSelectedBaitFromHotbarItem(item: string | null): void {
    this.selectedBait = item ? BAIT_ITEM_TO_KIND[item] ?? null : null;
  }

  private handleHotbarSelection(item: string | null): void {
    this.setSelectedBaitFromHotbarItem(item);
  }

  private baitNameKey(kind: FishingBaitKind): string {
    if (kind === "worm") return "fishing.bait.worm";
    if (kind === "shrimp") return "fishing.bait.shrimp";
    return "fishing.bait.goldenCricket";
  }

  getFishTotal(): number {
    return FISH_KEYS.reduce((sum, key) => sum + this.fish[key], 0);
  }

  getFishCounts(): Record<FishKind, number> {
    return { ...this.fish };
  }

  addFish(kind: FishKind, amount = 1): void {
    this.fish[kind] += Math.max(0, Math.floor(amount));
  }

  removeFish(kind: FishKind, amount = 1): boolean {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (this.fish[kind] < safeAmount) return false;
    this.fish[kind] -= safeAmount;
    return true;
  }

  removeAnyFish(amount = 1): boolean {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (this.getFishTotal() < safeAmount) return false;
    let left = safeAmount;
    // Use common fish first so rarer catfish/carp remain available for recipes.
    for (const kind of ["silverBarb", "catfish", "goldenCarp"] as FishKind[]) {
      const take = Math.min(this.fish[kind], left);
      this.fish[kind] -= take;
      left -= take;
      if (left <= 0) break;
    }
    return true;
  }

  isBusy(): boolean {
    return this.state !== "idle";
  }

  private nearestSpot(playerX: number, playerY: number): FishingSpot | null {
    let best: FishingSpot | null = null;
    let bestDistance = FISHING_INTERACTION_RADIUS;
    for (const spot of this.spots) {
      const distance = Phaser.Math.Distance.Between(playerX, playerY, spot.x, spot.y);
      if (distance < bestDistance) {
        best = spot;
        bestDistance = distance;
      }
    }
    return best;
  }

  private beginCast(playerX: number, playerY: number, spot: FishingSpot): void {
    this.currentCastBait = this.selectedBait && this.baits[this.selectedBait] > 0 ? this.selectedBait : null;
    if (this.currentCastBait) {
      this.removeBait(this.currentCastBait, 1);
      this.showToast(this.language.t("fishing.baitUsed", { bait: this.language.t(this.baitNameKey(this.currentCastBait)) }));
    }
    this.state = "waiting";
    this.stateTimer = 0;
    this.biteWindow = 0;
    this.biteDelay = 1900 + (spot.x % 5) * 340 + Math.random() * 900;
    this.line.clear();
    this.line.lineStyle(1, 0x4a3424, 0.95);
    this.line.beginPath();
    this.line.moveTo(playerX, playerY + 2);
    this.line.lineTo(spot.waterX, 558);
    this.line.strokePath();
    this.bobber.setPosition(spot.waterX, 558).setVisible(true);
    this.soundX = spot.waterX;
    this.soundY = 558;
    this.prompt.setText(this.language.t("fishing.waiting"));
    this.prompt.setVisible(true);
    this.scene.events.emit("player-action", "fish");
    this.scene.events.emit("sound-effect", { name: "cast", x: this.soundX, y: this.soundY, maxDistance: 245 });
  }

  private pickFish(bait: FishingBaitKind | null): FishKind {
    const hour = ((this.getGameHour() % 24) + 24) % 24;
    let carpChance: number;
    let catfishChance: number;

    if (hour < 6 || hour >= 18) {
      carpChance = 0.26;
      catfishChance = 0.48;
    } else if ((hour >= 6 && hour < 9) || (hour >= 16 && hour < 18)) {
      carpChance = 0.34;
      catfishChance = 0.23;
    } else {
      carpChance = 0.20;
      catfishChance = 0.18;
    }

    // Better bait shifts the catch table toward valuable fish without
    // removing the common Silver Barb from the river.
    if (bait === "worm") {
      catfishChance += 0.08;
      carpChance += 0.02;
    } else if (bait === "shrimp") {
      catfishChance += 0.12;
      carpChance += 0.12;
    } else if (bait === "goldenCricket") {
      catfishChance += 0.08;
      carpChance += 0.24;
    }

    const combinedChance = carpChance + catfishChance;
    if (combinedChance > 0.88) {
      const scale = 0.88 / combinedChance;
      carpChance *= scale;
      catfishChance *= scale;
    }

    const roll = Math.random();
    if (roll < carpChance) return "goldenCarp";
    if (roll < carpChance + catfishChance) return "catfish";
    return "silverBarb";
  }

  private catchFish(): void {
    const kind = this.pickFish(this.currentCastBait);
    this.addFish(kind);
    this.scene.events.emit("player-action", "fish");
    this.scene.events.emit("sound-effect", { name: "catch", x: this.soundX, y: this.soundY, maxDistance: 245 });
    this.showToast(this.language.t(`fishing.caught.${kind}`));
    this.finishCast();
  }

  private finishCast(): void {
    this.state = "idle";
    this.stateTimer = 0;
    this.biteWindow = 0;
    this.currentCastBait = null;
    this.line.clear();
    this.bobber.setVisible(false);
    this.prompt.setVisible(false);
  }

  private showToast(message: string): void {
    this.toastText.setText(message);
    this.scene.tweens.killTweensOf(this.toastText);
    this.toastText.setAlpha(1);
    this.scene.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1800,
      duration: 500
    });
  }

  private handlePromptPointerDown(): void {
    if (this.ui.hasActiveModal()) return;
    if (this.state === "bite") {
      this.catchFish();
      return;
    }
    if (this.state === "waiting") return;

    const spot = this.nearestSpot(this.lastPlayerX, this.lastPlayerY);
    if (!spot) return;
    if (!this.rodOwned) {
      this.prompt.setText(this.language.t("fishing.needRod")).setVisible(true);
      return;
    }
    this.beginCast(this.lastPlayerX, this.lastPlayerY, spot);
  }

  /** Touch equivalent of cast/reel. Returns false when the player is not at water. */
  mobileAction(playerX: number, playerY: number): boolean {
    this.lastPlayerX = playerX;
    this.lastPlayerY = playerY;
    if (this.state === "bite") {
      this.catchFish();
      return true;
    }
    if (this.state === "waiting") return true;

    const spot = this.nearestSpot(playerX, playerY);
    if (!spot) return false;
    if (!this.rodOwned) {
      this.prompt.setText(this.language.t("fishing.needRod")).setVisible(true);
      return true;
    }
    this.beginCast(playerX, playerY, spot);
    return true;
  }

  /** Returns true while fishing consumes SPACE so farming cannot use the tool. */
  update(playerX: number, playerY: number, delta: number, modalOpen = false): boolean {
    this.lastPlayerX = playerX;
    this.lastPlayerY = playerY;
    if (modalOpen) {
      this.prompt.setVisible(false);
      return false;
    }

    if (this.state === "waiting") {
      this.stateTimer += Math.min(delta, 50);
      this.bobber.setY(558 + Math.sin(this.scene.time.now / 220) * 1.5);
      if (this.stateTimer >= this.biteDelay) {
        this.state = "bite";
        this.stateTimer = 0;
        this.biteWindow = 2300;
        this.prompt.setText(this.language.t("fishing.bite"));
        this.scene.events.emit("sound-effect", { name: "bite", x: this.soundX, y: this.soundY, maxDistance: 245 });
      }
      return true;
    }

    if (this.state === "bite") {
      this.stateTimer += Math.min(delta, 50);
      this.bobber.setY(558 + Math.sin(this.scene.time.now / 75) * 3);
      if (Phaser.Input.Keyboard.JustDown(this.reelKey)) {
        this.catchFish();
        return true;
      }
      if (this.stateTimer >= this.biteWindow) {
        this.scene.events.emit("sound-effect", { name: "miss", x: this.soundX, y: this.soundY, maxDistance: 245 });
        this.showToast(this.language.t("fishing.missed"));
        this.finishCast();
      }
      return true;
    }

    const spot = this.nearestSpot(playerX, playerY);
    if (!spot) {
      this.prompt.setVisible(false);
      return false;
    }

    if (!this.rodOwned) {
      this.prompt.setText(this.language.t("fishing.needRod"));
      this.prompt.setVisible(true);
      return false;
    }

    const availableBait = this.selectedBait && this.baits[this.selectedBait] > 0 ? this.selectedBait : null;
    this.prompt.setText(availableBait
      ? this.language.t("fishing.castHintWithBait", {
          bait: this.language.t(this.baitNameKey(availableBait)),
          amount: this.baits[availableBait]
        })
      : this.language.t("fishing.castHint"));
    this.prompt.setVisible(true);
    if (Phaser.Input.Keyboard.JustDown(this.castKey)) {
      this.beginCast(playerX, playerY, spot);
      return true;
    }
    return false;
  }

  getSaveData(): FishingSaveData {
    return { rodOwned: this.rodOwned, fish: { ...this.fish }, baits: { ...this.baits } };
  }

  loadSaveData(data?: FishingSaveData): void {
    if (!data) return;
    this.rodOwned = data.rodOwned === true;
    for (const key of FISH_KEYS) {
      this.fish[key] = Math.max(0, Math.floor(Number(data.fish?.[key]) || 0));
    }
    for (const key of BAIT_KEYS) {
      this.baits[key] = Math.max(0, Math.floor(Number(data.baits?.[key]) || 0));
    }
  }
}
