import Phaser from "phaser";
import { VillageSystem } from "./VillageSystem";
import { FarmingSystem } from "./FarmingSystem";
import { CookingSystem } from "./CookingSystem";
import { ChestStorageSystem } from "./ChestStorageSystem";
import { VillageBoardSystem } from "./VillageBoardSystem";
import type { SaveSystem } from "./SaveSystem";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, uiFontSize } from "../ui/PixelUI";
import { isMobilePlatform } from "../utils/DeviceMode";

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
  private lastPlayerX = 0;
  private lastPlayerY = 0;
  private avatar!: Phaser.GameObjects.Sprite;
  private panel!: Phaser.GameObjects.Container;
  private closeButton!: Phaser.GameObjects.Container;
  private outsidePrompt!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private roomPrompt!: Phaser.GameObjects.Text;
  private roomPromptHitArea!: Phaser.GameObjects.Rectangle;
  private sleepOverlay!: Phaser.GameObjects.Rectangle;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private avatarX = 320;
  private avatarY = 278;
  private avatarVelocityX = 0;
  private avatarVelocityY = 0;
  private movementAccumulator = 0;
  private sleeping = false;
  private sleepBreathTween?: Phaser.Tweens.Tween;
  private promptTarget: RoomTarget | null = null;
  private readonly touchMode = isMobilePlatform();
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
    this.outsidePrompt = this.scene.add.text(320, 288, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(10), color: "#fff1cf",
      backgroundColor: "#2a1a14", padding: { x: 7, y: 4 }, stroke: "#2a1a14", strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(7200).setVisible(false).setInteractive({ useHandCursor: true });
    this.outsidePrompt.on("pointerdown", () => {
      const near = Phaser.Math.Distance.Between(this.lastPlayerX, this.lastPlayerY, this.entrance.x, this.entrance.y) < 76;
      if (!this.inside && near && !this.ui.hasActiveModal()) this.enterHouse();
    });
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
    // Woven rug in the middle of the room.
    room.fillStyle(0x7d4932, 1).fillRect(210, 226, 220, 82);
    room.fillStyle(0xd5ad70, 1).fillRect(216, 232, 208, 70);
    room.fillStyle(0x8d5035, 1).fillRect(224, 240, 192, 54);
    for (let x = 232; x < 412; x += 16) room.fillStyle(0xd5ad70, 0.75).fillRect(x, 246, 2, 42);
    // Bed frame and bedding (left side).
    room.fillStyle(0x4b2d1d, 1).fillRect(86, 108, 118, 83);
    room.fillStyle(0x8e5b35, 1).fillRect(91, 112, 108, 74);
    room.fillStyle(0xe1d5b6, 1).fillRect(97, 117, 96, 63);
    room.fillStyle(0xeee6d2, 1).fillRect(101, 121, 34, 23);
    room.fillStyle(0x4d7590, 1).fillRect(138, 121, 52, 56);
    room.fillStyle(0x668ba0, 1).fillRect(143, 126, 42, 46);
    room.fillStyle(0x56331f, 1).fillRect(84, 188, 12, 8).fillRect(190, 188, 12, 8);
    // Storage chest (centre).
    room.fillStyle(0x3e2719, 1).fillRect(273, 119, 94, 65);
    room.fillStyle(0x986039, 1).fillRect(278, 122, 84, 56);
    room.fillStyle(0xb77e49, 1).fillRect(282, 125, 76, 8);
    room.fillStyle(0x704326, 1).fillRect(282, 139, 76, 3).fillRect(282, 163, 76, 3);
    room.fillStyle(0xe0bb65, 1).fillRect(315, 145, 14, 18);
    room.fillStyle(0x4b2f1e, 1).fillRect(319, 149, 6, 8);
    // Cooking hearth at right.
    room.fillStyle(0x493126, 1).fillRect(451, 134, 102, 62);
    room.fillStyle(0x77746a, 1).fillRect(458, 140, 88, 50);
    room.fillStyle(0x4b4036, 1).fillRect(465, 146, 74, 37);
    room.fillStyle(0xc07b3d, 1).fillRect(483, 172, 38, 11);
    room.fillStyle(0xf0a34a, 1).fillRect(490, 159, 24, 18);
    room.fillStyle(0xe2c68e, 1).fillRect(487, 146, 30, 7);
    room.fillStyle(0x3d3026, 1).fillRect(493, 138, 18, 9);
    // Exit doorway at bottom centre.
    room.fillStyle(0x3b271c, 1).fillRect(286, 318, 68, 30);
    room.fillStyle(0xb88450, 1).fillRect(291, 322, 58, 26);
    room.fillStyle(0x56351f, 1).fillRect(297, 326, 46, 22);
    room.fillStyle(0xd6b36b, 1).fillRect(333, 335, 4, 4);

    this.title = this.scene.add.text(28, 18, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(15), color: "#fff0cf", fontStyle: "bold" });
    const cookerArt = this.scene.add.image(502, 166, "cooking_hearth_asset").setScale(1.8);
    this.avatar = this.scene.add.sprite(this.avatarX, this.avatarY, "farmer_green_sheet", 0).setOrigin(0.5, 1).setScale(2);
    this.statusText = this.scene.add.text(320, 310, "", { fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(9), color: "#f0d69e", backgroundColor: "#39271e", padding: { x: 4, y: 2 }, align: "center", wordWrap: { width: 420 } }).setOrigin(0.5).setVisible(false);
    this.roomPromptHitArea = this.scene.add.rectangle(320, 245, 250, 42, 0x527044, 0.98)
      .setStrokeStyle(2, 0xd6b36b, 1)
      .setVisible(false);
    // Touch users activate room actions through the shared native HTML
    // contextual button, matching the market and request-board interaction.
    // Desktop continues to use the E key; this canvas hit-area is never used.
    this.roomPrompt = this.scene.add.text(320, 245, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: uiFontSize(9),
      color: "#fff1cf",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: 232 }
    }).setOrigin(0.5).setVisible(false);
    this.sleepOverlay = this.scene.add.rectangle(320, 180, 640, 360, 0x101827, 1).setAlpha(0);
    const closePos = modalClosePosition(320, 180, 640, 360);
    this.closeButton = createRedCloseButton(this.scene, closePos.x, closePos.y);
    this.panel.add([room, this.title, cookerArt, this.avatar, this.statusText, this.roomPromptHitArea, this.roomPrompt, this.sleepOverlay, this.closeButton]);
    this.panel.setVisible(false);
    this.updateLanguage();
  }

  private updateLanguage(): void {
    this.outsidePrompt.setText(this.language.t(this.touchMode ? "house.mobileEnterPrompt" : "house.enterPrompt"));
    if (!this.title) return;
    this.title.setText(this.language.t("house.title"));
    const font = this.language.getFontFamily();
    for (const child of this.panel.list) {
      if (child instanceof Phaser.GameObjects.Text) child.setFontFamily(font);
    }
    if (this.roomPrompt && this.promptTarget) this.roomPrompt.setText(this.promptTextFor(this.promptTarget));
  }

  private enterHouse(): void {
    this.outsidePosition = { x: this.player.x, y: this.player.y };
    this.inside = true;
    this.sleeping = false;
    this.statusText.setText("").setVisible(false);
    this.roomPrompt.setVisible(false);
    this.avatarX = 320;
    this.avatarY = 278;
    this.avatarVelocityX = 0;
    this.avatarVelocityY = 0;
    this.movementAccumulator = 0;
    this.avatar.setPosition(this.avatarX, this.avatarY);
    this.avatarTexture = this.getPlayerTexture();
    if (this.scene.textures.exists(this.avatarTexture)) this.avatar.setTexture(this.avatarTexture, 0);
    this.avatar.anims.play(`${this.avatarTexture}-down`, true);
    this.player.setVisible(false);
    this.ui.open("house");
    this.enterKey.reset();
  }

  private restoreOutside(): void {
    if (!this.inside) return;
    this.sleepBreathTween?.stop();
    this.sleepBreathTween = undefined;
    this.inside = false;
    this.sleeping = false;
    this.avatarVelocityX = 0;
    this.avatarVelocityY = 0;
    this.movementAccumulator = 0;
    this.promptTarget = null;
    this.roomPrompt.setVisible(false);
    this.roomPromptHitArea.setVisible(false);
    this.player.setPosition(this.outsidePosition.x, this.outsidePosition.y).setVisible(true);
    this.enterKey.reset();
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

  private promptTextFor(target: RoomTarget): string {
    if (this.touchMode) {
      const mobileKeys: Record<RoomTarget, string> = {
        bed: "mobile.clickSleepBed",
        chest: "mobile.clickOpenChest",
        cooker: "mobile.clickCook",
        door: "mobile.clickExitHouse"
      };
      return this.language.t(mobileKeys[target]);
    }
    const keys: Record<RoomTarget, string> = {
      bed: "house.promptBed",
      chest: "house.promptChest",
      cooker: "house.promptCooker",
      door: "house.promptDoor"
    };
    return this.language.t(keys[target]);
  }

  private interact(target: RoomTarget): void {
    if (target === "door") { this.exitHouse(); return; }
    if (target === "chest") { this.chest.openFromHouse(); return; }
    if (target === "cooker") { this.cooking.openFromHouse(); return; }
    this.sleep();
  }

  private sleep(): void {
    if (this.sleeping) return;
    this.avatarVelocityX = 0;
    this.avatarVelocityY = 0;
    this.movementAccumulator = 0;
    this.sleeping = true;
    this.closeButton.setVisible(false);
    this.statusText.setText(this.language.t("house.sleeping")).setVisible(true);
    this.roomPrompt.setVisible(false);
    this.roomPromptHitArea.setVisible(false);
    this.scene.events.emit("sound-effect", "sleep");

    const mattress = { x: 155, y: 153 };
    const originalTexture = this.avatarTexture;
    this.avatar.anims.play(`${this.avatarTexture}-side`, true);
    this.avatar.setFlipX(true).setAngle(0).setScale(2);
    this.scene.tweens.add({
      targets: this.avatar,
      x: mattress.x,
      y: mattress.y,
      duration: 520,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.avatarX = mattress.x;
        this.avatarY = mattress.y;
        const currentSheet = this.getPlayerTexture();
        const female = currentSheet.startsWith("farmer_female_");
        const outfit = currentSheet.replace("farmer_", "").replace("_sheet", "");
        const sleepTexture = female ? currentSheet : `sleep_male_${outfit}`;
        if (this.scene.textures.exists(sleepTexture)) {
          this.avatar.anims.stop();
          if (female) this.avatar.setTexture(sleepTexture, 0);
          else this.avatar.setTexture(sleepTexture);
        } else {
          this.avatar.anims.play(`${originalTexture}-task-sleep`, true);
        }
        // The pillow is on the left of the mattress, so the character lies
        // horizontally with their head turned toward it.
        this.avatar.setOrigin(0.5, 0.5).setPosition(mattress.x, mattress.y).setAngle(-90).setFlipX(false).setScale(2);
        this.sleepBreathTween = this.scene.tweens.add({
          targets: this.avatar,
          scaleY: { from: 2, to: 2.035 },
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
        this.scene.tweens.add({
          targets: this.sleepOverlay,
          alpha: 1,
          duration: 550,
          ease: "Sine.easeInOut",
          onComplete: () => {
            const result = this.village.sleepUntilNextPeriod();
            this.farming.syncGameDay(result.day, this.village.getElapsedGameMinutes());
            this.board.update(-10000, -10000);
            const timeText = `${String(result.hour % 12 || 12).padStart(2, "0")}:00 ${result.hour >= 12 ? "PM" : "AM"}`;
            this.statusText.setText(this.language.t("house.woke", { time: timeText, day: result.day })).setVisible(true);
            this.scene.time.delayedCall(3200, () => { if (!this.sleeping) this.statusText.setVisible(false); });
            this.save.saveNow();
            this.scene.events.emit("time-skipped");
            this.scene.tweens.add({
              targets: this.sleepOverlay,
              alpha: 0,
              duration: 650,
              delay: 500,
              ease: "Sine.easeInOut",
              onComplete: () => {
                this.sleepBreathTween?.stop();
                this.sleepBreathTween = undefined;
                this.sleeping = false;
                this.closeButton.setVisible(true);
                this.avatarTexture = this.getPlayerTexture();
                this.avatar.setTexture(this.avatarTexture, 0).setOrigin(0.5, 1).setAngle(0).setFlipX(false).setScale(2);
                this.avatarX = this.targets.bed.x;
                this.avatarY = this.targets.bed.y;
                this.avatar.setPosition(this.avatarX, this.avatarY);
                this.avatar.anims.play(`${this.avatarTexture}-down`, true);
              }
            });
          }
        });
      }
    });
  }

  private moveAvatar(delta: number, mobileVector: { x: number; y: number } = { x: 0, y: 0 }): void {
    let dx = Number(this.cursors.left.isDown || this.wasd.A.isDown) * -1 + Number(this.cursors.right.isDown || this.wasd.D.isDown);
    let dy = Number(this.cursors.up.isDown || this.wasd.W.isDown) * -1 + Number(this.cursors.down.isDown || this.wasd.S.isDown);
    if (this.touchMode) {
      dx += mobileVector.x;
      dy += mobileVector.y;
    }

    const inputLength = Math.hypot(dx, dy);
    if (inputLength > 1) {
      dx /= inputLength;
      dy /= inputLength;
    }

    const targetVelocityX = dx * 125;
    const targetVelocityY = dy * 125;
    const fixedStep = 1 / 120;
    // A fixed 120 Hz movement step keeps indoor motion consistent when the
    // browser delivers slightly uneven frame times. The accumulator is reset
    // on room transitions so old frame time never creates a movement burst.
    this.movementAccumulator += Math.min(Math.max(delta, 0), 100) / 1000;
    let steps = 0;

    const hitsFurniture = (x: number, y: number): boolean =>
      (x > 75 && x < 215 && y > 103 && y < 200) ||
      (x > 262 && x < 378 && y > 108 && y < 190) ||
      (x > 438 && x < 565 && y > 124 && y < 202);

    while (this.movementAccumulator >= fixedStep && steps < 12) {
      const response = inputLength > 0.08 ? 26 : 30;
      const blend = 1 - Math.exp(-response * fixedStep);
      this.avatarVelocityX = Phaser.Math.Linear(this.avatarVelocityX, targetVelocityX, blend);
      this.avatarVelocityY = Phaser.Math.Linear(this.avatarVelocityY, targetVelocityY, blend);

      const rawX = this.avatarX + this.avatarVelocityX * fixedStep;
      const rawY = this.avatarY + this.avatarVelocityY * fixedStep;
      const nextX = Phaser.Math.Clamp(rawX, 56, 584);
      const nextY = Phaser.Math.Clamp(rawY, 100, 314);

      if (nextX !== rawX || hitsFurniture(nextX, this.avatarY)) this.avatarVelocityX = 0;
      else this.avatarX = nextX;

      if (nextY !== rawY || hitsFurniture(this.avatarX, nextY)) this.avatarVelocityY = 0;
      else this.avatarY = nextY;

      this.movementAccumulator -= fixedStep;
      steps += 1;
    }

    // Avoid carrying an unusually large backlog after a suspended tab or a
    // slow frame; the next visible frame should resume at normal speed.
    if (steps >= 12 && this.movementAccumulator >= fixedStep) this.movementAccumulator = 0;

    this.avatar.setPosition(this.avatarX, this.avatarY);
    const speed = Math.hypot(this.avatarVelocityX, this.avatarVelocityY);
    if (speed > 4) {
      if (Math.abs(this.avatarVelocityX) > Math.abs(this.avatarVelocityY)) {
        this.avatar.setFlipX(this.avatarVelocityX < 0).anims.play(`${this.avatarTexture}-side`, true);
      } else {
        this.avatar.anims.play(`${this.avatarTexture}-${this.avatarVelocityY < 0 ? "up" : "down"}`, true);
      }
    } else if (!this.sleeping) {
      this.avatarVelocityX = 0;
      this.avatarVelocityY = 0;
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
      // Touch players must walk close to furniture before using the shared
      // mobile action button. A tap on furniture must never move/teleport the
      // avatar (the old snap-to-target behavior could land on the bed).
      const closeEnough = Phaser.Math.Distance.Between(this.avatarX, this.avatarY, targetPoint.x, targetPoint.y) < 92;
      if (this.touchMode) {
        this.promptTarget = closeEnough ? found.target : this.closestTarget();
        this.roomPrompt.setVisible(false);
        this.roomPromptHitArea.setVisible(false);
        if (closeEnough) this.interact(found.target);
        return;
      }
      if (closeEnough) {
        this.roomPrompt.setVisible(false);
        this.interact(found.target);
      }
    }
  };

  update(
    playerX: number,
    playerY: number,
    delta = this.scene.game.loop.delta,
    mobileVector: { x: number; y: number } = { x: 0, y: 0 }
  ): void {
    this.lastPlayerX = playerX;
    this.lastPlayerY = playerY;
    if (!this.inside) {
      const near = Phaser.Math.Distance.Between(playerX, playerY, this.entrance.x, this.entrance.y) < 76;
      this.outsidePrompt.setVisible(near && !this.ui.hasActiveModal() && !this.touchMode);
      if (near && Phaser.Input.Keyboard.JustDown(this.enterKey) && !this.ui.hasActiveModal()) this.enterHouse();
      return;
    }
    this.outsidePrompt.setVisible(false);
    if (!this.ui.isOpen("house") || this.sleeping) return;

    if (this.ui.isOpen("chest") || this.ui.isOpen("cooking")) {
      this.roomPrompt.setVisible(false);
      this.roomPromptHitArea.setVisible(false);
      return;
    }

    this.moveAvatar(delta, mobileVector);
    this.promptTarget = this.closestTarget();
    if (this.promptTarget) {
      if (this.touchMode) {
        // Touch devices use the same dedicated HTML action button as the
        // market and request board. Keep canvas prompt graphics out of the way.
        this.roomPrompt.setVisible(false);
        this.roomPromptHitArea.setVisible(false);
      } else {
        this.roomPrompt.setText(this.promptTextFor(this.promptTarget));
        this.roomPrompt.setPosition(this.avatarX, Math.max(94, this.avatarY - 48));
        this.roomPrompt.setVisible(true);
        this.roomPromptHitArea.setVisible(false);
      }
    } else {
      this.roomPrompt.setVisible(false);
      this.roomPromptHitArea.setVisible(false);
    }
    if (Phaser.Input.Keyboard.JustDown(this.enterKey) && this.promptTarget) {
      const target = this.promptTarget;
      this.roomPrompt.setVisible(false);
      this.interact(target);
    }
  }

  isInside(): boolean { return this.inside; }

  /** Current touch action label for the shared native contextual button. */
  getMobileActionLabel(): string | null {
    if (!this.touchMode || !this.inside || !this.ui.isOpen("house") || this.sleeping || !this.promptTarget) {
      return null;
    }
    if (this.ui.isOpen("chest") || this.ui.isOpen("cooking")) return null;

    const mobileKeys: Record<RoomTarget, string> = {
      bed: "mobile.clickSleepBed",
      chest: "mobile.clickOpenChest",
      cooker: "mobile.clickCook",
      door: "mobile.clickExitHouse"
    };
    return this.language.t(mobileKeys[this.promptTarget]);
  }

  /** Activate the currently selected room target from the shared HTML button. */
  mobileInteractPrompt(): boolean {
    if (!this.getMobileActionLabel() || !this.promptTarget) return false;
    const target = this.promptTarget;
    this.roomPrompt.setVisible(false);
    this.roomPromptHitArea.setVisible(false);
    this.interact(target);
    return true;
  }

  /** Touch equivalent of the E key for entering the home from the world. */
  mobileInteract(playerX: number, playerY: number): boolean {
    if (this.inside || this.ui.hasActiveModal()) return false;
    if (Phaser.Math.Distance.Between(playerX, playerY, this.entrance.x, this.entrance.y) >= 76) return false;
    this.enterHouse();
    return true;
  }

  canMobileInteract(playerX: number, playerY: number): boolean {
    return !this.inside && !this.ui.hasActiveModal() &&
      Phaser.Math.Distance.Between(playerX, playerY, this.entrance.x, this.entrance.y) < 76;
  }
}
