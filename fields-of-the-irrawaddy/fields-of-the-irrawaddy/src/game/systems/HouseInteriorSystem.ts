import Phaser from "phaser";
import { VillageSystem } from "./VillageSystem";
import { FarmingSystem } from "./FarmingSystem";
import { CookingSystem } from "./CookingSystem";
import { ChestStorageSystem } from "./ChestStorageSystem";
import { VillageBoardSystem } from "./VillageBoardSystem";
import type { SaveSystem } from "./SaveSystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition } from "../ui/PixelUI";

type RoomTarget = "bed" | "chest" | "cooker" | "door";

/** A small walkable player-home interior with a bed, storage chest and indoor cooker. */
export class HouseInteriorSystem {
  private readonly scene: Phaser.Scene;
  private readonly player: Phaser.GameObjects.Container;
  private readonly getPlayerTexture: () => string;
  private readonly village: VillageSystem;
  private readonly farming: FarmingSystem;
  private readonly cooking: CookingSystem;
  private readonly chest: ChestStorageSystem;
  private readonly board: VillageBoardSystem;
  private readonly ui: ModalUIManager;
  private readonly language: LanguageSystem;
  private readonly save: SaveSystem;

  private inside = false;
  private outsidePosition = { x: 320, y: 330 };
  private avatar!: Phaser.GameObjects.Sprite;
  private panel!: Phaser.GameObjects.Container;
  private closeButton!: Phaser.GameObjects.Container;
  private outsidePrompt!: Phaser.GameObjects.Text;
  private roomHint!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private sleepOverlay!: Phaser.GameObjects.Rectangle;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private avatarX = 320;
  private avatarY = 278;
  private sleeping = false;
  private promptTarget: RoomTarget | null = null;
  private avatarTexture = "farmer_green_sheet";
  private readonly entrance = { x: 190, y: 267 };
  private readonly targets: Record<RoomTarget, { x: number; y: number }> = {
    bed: { x: 145, y: 211 },
    chest: { x: 320, y: 207 },
    cooker: { x: 500, y: 214 },
    door: { x: 320, y: 350 }
  };

  constructor(
    scene: Phaser.Scene,
    player: Phaser.GameObjects.Container,
    getPlayerTexture: () => string,
    village: VillageSystem,
    farming: FarmingSystem,
    cooking: CookingSystem,
    chest: ChestStorageSystem,
    board: VillageBoardSystem,
    ui: ModalUIManager,
    language: LanguageSystem,
    save: SaveSystem
  ) {
    this.scene = scene;
    this.player = player;
    this.getPlayerTexture = getPlayerTexture;
    this.village = village;
    this.farming = farming;
    this.cooking = cooking;
    this.chest = chest;
    this.board = board;
    this.ui = ui;
    this.language = language;
    this.save = save;

    const keyboard = scene.input.keyboard!;
    this.enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    this.createOutsidePrompt();
    this.createInterior();
    this.scene.input.on("pointerup", this.handlePointerUp, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.input.off("pointerup", this.handlePointerUp, this);
    });
    this.ui.registerPanel("house", this.panel, 300, () => this.restoreOutside(), this.closeButton);
    this.ui.registerHud(this.outsidePrompt);
    this.language.onChange(() => this.updateLanguage());
  }

  private createOutsidePrompt(): void {
    this.outsidePrompt = this.scene.add.text(320, 305, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#fff1cf",
      backgroundColor: "#2a1a14", padding: { x: 7, y: 4 }, stroke: "#2a1a14", strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(7200).setVisible(false);
    this.updateLanguage();
  }

  private createInterior(): void {
    this.panel = this.scene.add.container(0, 0).setScrollFactor(0);
    const room = this.scene.add.graphics();
    // Full-screen opaque interior replaces the outdoor map while indoors.
    room.fillStyle(0x39271e, 1).fillRect(0, 0, 640, 360);
    room.fillStyle(0x70452d, 1).fillRect(0, 0, 640, 70);
    room.fillStyle(0x98653e, 1).fillRect(0, 66, 640, 12);
    room.fillStyle(0xb98a58, 1).fillRect(12, 78, 616, 270);
    room.fillStyle(0x6a432d, 1).fillRect(12, 78, 616, 4);
    room.fillStyle(0x6a432d, 1).fillRect(12, 344, 616, 4);
    // Floorboard seams and warm nail details.
    for (let y = 96; y < 342; y += 22) {
      room.lineStyle(1, 0x9b7047, 0.65).lineBetween(16, y, 624, y);
      for (let x = 42; x < 624; x += 118) room.fillStyle(0x815638, 0.65).fillRect(x, y + 5, 2, 2);
    }
    // Windows, shutters and sill.
    room.fillStyle(0x3b291e, 1).fillRect(270, 14, 100, 43);
    room.fillStyle(0x8fc1b2, 1).fillRect(276, 20, 88, 31);
    room.fillStyle(0xc7dfc8, 0.75).fillRect(280, 23, 34, 25);
    room.fillStyle(0x815336, 1).fillRect(316, 18, 6, 36);
    room.fillStyle(0x815336, 1).fillRect(273, 52, 94, 5);
    room.fillStyle(0x9c6840, 1).fillRect(20, 23, 8, 45).fillRect(612, 23, 8, 45);
    // Original Burmese household furniture is rendered as separate pixel-art props below.
    // Exit doorway at bottom centre.
    room.fillStyle(0x3b271c, 1).fillRect(286, 318, 68, 30);
    room.fillStyle(0xb88450, 1).fillRect(291, 322, 58, 26);
    room.fillStyle(0x56351f, 1).fillRect(297, 326, 46, 22);
    room.fillStyle(0xd6b36b, 1).fillRect(333, 335, 4, 4);

    this.title = this.scene.add.text(28, 18, "", { fontFamily: this.language.getFontFamily(), fontSize: "15px", color: "#fff0cf", fontStyle: "bold" });
    const bedLabel = this.scene.add.text(145, 94, "", { fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#fff1cf", backgroundColor: "#39271e", padding: { x: 4, y: 2 } }).setOrigin(0.5);
    const chestLabel = this.scene.add.text(320, 100, "", { fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#fff1cf", backgroundColor: "#39271e", padding: { x: 4, y: 2 } }).setOrigin(0.5);
    const cookerLabel = this.scene.add.text(502, 112, "", { fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#fff1cf", backgroundColor: "#39271e", padding: { x: 4, y: 2 } }).setOrigin(0.5);
    const wallTextile = this.scene.add.image(145, 91, "house_wall_textile_asset").setScale(2);
    const bedArt = this.scene.add.image(145, 151, "house_bed_asset").setScale(1.8);
    const wovenMat = this.scene.add.image(320, 267, "house_woven_mat_asset").setScale(2);
    const chestArt = this.scene.add.image(320, 151, "house_chest_asset").setScale(1.9);
    const cookerArt = this.scene.add.image(502, 166, "cooking_hearth_asset").setScale(1.8);
    const waterJar = this.scene.add.image(576, 240, "house_clay_jar_asset").setScale(1.8);
    const oilLamp = this.scene.add.image(575, 90, "house_oil_lamp_asset").setScale(2);
    this.avatar = this.scene.add.sprite(this.avatarX, this.avatarY, "farmer_green_sheet", 0).setOrigin(0.5, 1).setScale(2);
    this.roomHint = this.scene.add.text(320, 337, "", { fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#fff1cf", backgroundColor: "#39271e", padding: { x: 5, y: 3 } }).setOrigin(0.5);
    this.statusText = this.scene.add.text(320, 310, "", { fontFamily: this.language.getFontFamily(), fontSize: "9px", color: "#f0d69e", backgroundColor: "#39271e", padding: { x: 4, y: 2 } }).setOrigin(0.5);
    this.sleepOverlay = this.scene.add.rectangle(320, 180, 640, 360, 0x101827, 1).setAlpha(0);
    const closePos = modalClosePosition(320, 180, 640, 360);
    this.closeButton = createRedCloseButton(this.scene, closePos.x, closePos.y);
    this.panel.add([
      room, wovenMat, wallTextile, bedArt, chestArt, cookerArt, waterJar, oilLamp,
      this.title, bedLabel, chestLabel, cookerLabel, this.avatar, this.statusText,
      this.roomHint, this.sleepOverlay, this.closeButton
    ]);
    this.panel.setVisible(false);
    this.updateLanguage();
  }

  private updateLanguage(): void {
    this.outsidePrompt.setText(this.language.t("house.enterPrompt"));
    if (!this.roomHint) return;
    this.title.setText(this.language.t("house.title"));
    this.roomHint.setText(this.language.t("house.controls"));
    this.statusText.setText(this.statusText.text || this.language.t("house.welcome"));
    const font = this.language.getFontFamily();
    for (const child of this.panel.list) {
      if (child instanceof Phaser.GameObjects.Text) child.setFontFamily(font);
    }
    // Static labels are localized by their data keys on every language change.
    const labels = this.panel.list.filter(child => child instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text[];
    if (labels.length >= 4) {
      labels[1].setText(this.language.t("house.bed"));
      labels[2].setText(this.language.t("house.chest"));
      labels[3].setText(this.language.t("house.cooker"));
    }
  }

  private enterHouse(): void {
    this.outsidePosition = { x: this.player.x, y: this.player.y };
    this.inside = true;
    this.sleeping = false;
    this.avatarX = 320;
    this.avatarY = 278;
    this.avatar.setPosition(this.avatarX, this.avatarY);
    this.avatarTexture = this.getPlayerTexture();
    if (this.scene.textures.exists(this.avatarTexture)) this.avatar.setTexture(this.avatarTexture, 0);
    this.avatar.anims.play(`${this.avatarTexture}-down`, true);
    this.player.setVisible(false);
    this.ui.open("house");
    this.enterKey.reset();
    this.escapeKey.reset();
  }

  private restoreOutside(): void {
    if (!this.inside) return;
    this.inside = false;
    this.sleeping = false;
    this.player.setPosition(this.outsidePosition.x, this.outsidePosition.y).setVisible(true);
    this.enterKey.reset();
    this.escapeKey.reset();
  }

  private exitHouse(): void {
    if (!this.inside || !this.ui.isOpen("house")) return;
    this.restoreOutside();
    this.ui.close("house");
  }

  private closestTarget(): RoomTarget | null {
    let chosen: RoomTarget | null = null;
    let best = 58;
    for (const [id, point] of Object.entries(this.targets) as [RoomTarget, { x: number; y: number }][]) {
      const distance = Phaser.Math.Distance.Between(this.avatarX, this.avatarY, point.x, point.y);
      if (distance < best) { chosen = id; best = distance; }
    }
    return chosen;
  }

  private interact(target: RoomTarget): void {
    if (target === "door") { this.exitHouse(); return; }
    if (target === "chest") { this.chest.openFromHouse(); return; }
    if (target === "cooker") { this.cooking.openFromHouse(); return; }
    this.sleep();
  }

  private sleep(): void {
    if (this.sleeping) return;
    this.sleeping = true;
    this.closeButton.setVisible(false);
    this.statusText.setText(this.language.t("house.sleeping"));
    this.avatar.anims.play(`${this.avatarTexture}-task-sleep`, true);
    this.scene.events.emit("sound-effect", "sleep");
    this.scene.tweens.add({
      targets: this.sleepOverlay,
      alpha: 1,
      duration: 550,
      ease: "Sine.easeInOut",
      onComplete: () => {
        const result = this.village.sleepUntilNextPeriod();
        this.farming.syncGameDay(result.day);
        this.board.update(-10000, -10000);
        const timeText = `${String(result.hour % 12 || 12).padStart(2, "0")}:00 ${result.hour >= 12 ? "PM" : "AM"}`;
        this.statusText.setText(this.language.t("house.woke", { time: timeText, day: result.day }));
        this.save.saveNow();
        this.scene.events.emit("time-skipped");
        this.scene.tweens.add({
          targets: this.sleepOverlay,
          alpha: 0,
          duration: 650,
          delay: 500,
          ease: "Sine.easeInOut",
          onComplete: () => {
            this.sleeping = false;
            this.closeButton.setVisible(true);
            this.avatar.anims.play(`${this.avatarTexture}-down`, true);
          }
        });
      }
    });
  }

  private moveAvatar(delta: number): void {
    let dx = Number(this.cursors.left.isDown || this.wasd.A.isDown) * -1 + Number(this.cursors.right.isDown || this.wasd.D.isDown);
    let dy = Number(this.cursors.up.isDown || this.wasd.W.isDown) * -1 + Number(this.cursors.down.isDown || this.wasd.S.isDown);
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      dx /= length; dy /= length;
      const step = 125 * Math.min(delta, 40) / 1000;
      const nx = Phaser.Math.Clamp(this.avatarX + dx * step, 56, 584);
      const ny = Phaser.Math.Clamp(this.avatarY + dy * step, 100, 314);
      const hitsFurniture = (x: number, y: number): boolean =>
        (x > 75 && x < 215 && y > 103 && y < 200) ||
        (x > 262 && x < 378 && y > 108 && y < 190) ||
        (x > 438 && x < 565 && y > 124 && y < 202);
      if (!hitsFurniture(nx, this.avatarY)) this.avatarX = nx;
      if (!hitsFurniture(this.avatarX, ny)) this.avatarY = ny;
      this.avatar.setPosition(this.avatarX, this.avatarY);
      if (Math.abs(dx) > Math.abs(dy)) {
        this.avatar.setFlipX(dx < 0).anims.play(`${this.avatarTexture}-side`, true);
      } else this.avatar.anims.play(`${this.avatarTexture}-${dy < 0 ? "up" : "down"}`, true);
    } else if (!this.sleeping) {
      this.avatar.anims.play(`${this.avatarTexture}-down`, true);
    }
  }

  private handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!this.inside || !this.ui.isOpen("house") || this.sleeping) return;
    const hitAreas: { target: RoomTarget; left: number; right: number; top: number; bottom: number }[] = [
      { target: "bed", left: 82, right: 208, top: 104, bottom: 194 },
      { target: "chest", left: 270, right: 370, top: 112, bottom: 190 },
      { target: "cooker", left: 448, right: 558, top: 126, bottom: 200 },
      { target: "door", left: 282, right: 358, top: 316, bottom: 359 }
    ];
    const found = hitAreas.find(area => pointer.x >= area.left && pointer.x <= area.right && pointer.y >= area.top && pointer.y <= area.bottom);
    if (found) {
      const targetPoint = this.targets[found.target];
      if (Phaser.Math.Distance.Between(this.avatarX, this.avatarY, targetPoint.x, targetPoint.y) < 92) this.interact(found.target);
    }
  };

  update(playerX: number, playerY: number, delta = this.scene.game.loop.delta): void {
    if (!this.inside) {
      const near = Phaser.Math.Distance.Between(playerX, playerY, this.entrance.x, this.entrance.y) < 76;
      this.outsidePrompt.setVisible(near && !this.ui.hasActiveModal());
      if (near && Phaser.Input.Keyboard.JustDown(this.enterKey) && !this.ui.hasActiveModal()) this.enterHouse();
      return;
    }
    this.outsidePrompt.setVisible(false);
    if (!this.ui.isOpen("house") || this.sleeping) return;

    this.moveAvatar(delta);
    this.promptTarget = this.closestTarget();
    if (this.promptTarget) {
      const promptKey: Record<RoomTarget, string> = {
        bed: "house.useBed", chest: "house.openChest", cooker: "house.useCooker", door: "house.exitDoor"
      };
      this.roomHint.setText(`${this.language.t(promptKey[this.promptTarget])} · E`);
    } else this.roomHint.setText(this.language.t("house.controls"));

    if (Phaser.Input.Keyboard.JustDown(this.enterKey) && this.promptTarget) this.interact(this.promptTarget);
    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) this.exitHouse();
  }

  isInside(): boolean { return this.inside; }
}
