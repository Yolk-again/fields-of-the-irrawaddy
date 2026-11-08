
import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { pixelPanel } from "../ui/PixelUI";

interface Villager {
  id: "ma" | "ko";
  name: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scheduleKey: string;
  activityKey: string;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;
  activityText: Phaser.GameObjects.Text;
  promptText: Phaser.GameObjects.Text;
}

interface DailySchedule {
  key: string;
  activityKey: string;
  x: number;
  y: number;
  indoors: boolean;
}

export class VillageSystem {
  private scene: Phaser.Scene;
  private ui: ModalUIManager;
  private language: LanguageSystem;
  private canMoveTo: (x: number, y: number) => boolean;

  private villagers: Villager[] = [];
  private maHomeLabel!: Phaser.GameObjects.Text;
  private koHomeLabel!: Phaser.GameObjects.Text;

  private talkKey!: Phaser.Input.Keyboard.Key;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private isTalking = false;
  private activeVillager: Villager | null = null;
  private dialogueIndex = 0;

  private dialoguePanel!: Phaser.GameObjects.Container;
  private dialogueText!: Phaser.GameObjects.Text;
  private speakerText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private closeText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;

  private clockStartTime = 0;
  private readonly gameMinuteDuration = 250;
  private lastClockLabel = "";

  constructor(
    scene: Phaser.Scene,
    ui: ModalUIManager,
    language: LanguageSystem,
    canMoveTo: (x: number, y: number) => boolean = () => true
  ) {
    this.scene = scene;
    this.ui = ui;
    this.language = language;
    this.canMoveTo = canMoveTo;
    this.clockStartTime = scene.time.now;

    this.createHomes();
    this.createVillagers();
    this.createControls();
    this.createClock();
    this.createDialogueInterface();

    this.ui.registerPanel("dialogue", this.dialoguePanel, 300, () => {
      this.isTalking = false;
      this.activeVillager = null;
      this.talkKey.reset();
      this.escapeKey.reset();
    });

    this.ui.registerHud(
      this.clockText,
      ...this.villagers.map(v => v.promptText),
      ...this.villagers.map(v => v.activityText)
    );

    this.language.onChange(() => this.updateLanguage());
  }

  private createHomes(): void {
    this.maHomeLabel = this.createHouse(
      820, 250, "ma_home_asset", "village.maHome", 132, 132
    );
    this.koHomeLabel = this.createHouse(
      695, 145, "ko_home_asset", "village.koHome", 128, 128
    );
  }

  private createHouse(
    x: number,
    bottomY: number,
    texture: string,
    labelKey: string,
    _width: number,
    height: number
  ): Phaser.GameObjects.Text {
    this.scene.add.image(x, bottomY, texture)
      .setOrigin(0.5, 1)
      .setScale(2)
      .setDepth(bottomY);

    return this.scene.add.text(
      x,
      bottomY - height - 10,
      this.language.t(labelKey),
      {
        fontFamily: this.language.getFontFamily(),
        fontSize: "10px",
        color: "#fff3d3",
        backgroundColor: "#34271d",
        padding: { x: 4, y: 3 }
      }
    ).setOrigin(0.5).setDepth(bottomY + 1);
  }

  private createVillagers(): void {
    this.createVillager("ma", "Ma Thiri", 810, 340, "ma_thiri_asset");
    this.createVillager("ko", "Ko Aung", 695, 180, "ko_aung_asset");
  }

  private createVillager(
    id: "ma" | "ko",
    name: string,
    x: number,
    y: number,
    texture: string
  ): void {
    const shadow = this.scene.add.ellipse(0, 19, 22, 7, 0x1d3015, 0.38);
    const sheetKey = texture.replace("_asset", "_sheet");
    const character = this.scene.add.sprite(0, 22, sheetKey, 0).setOrigin(0.5, 1).setScale(2);
    const container = this.scene.add.container(x, y, [shadow, character]);
    container.setDepth(y + 30);

    const nameText = this.scene.add.text(
      0,
      -34,
      this.language.t(id === "ma" ? "village.maThiri" : "village.koAung"),
      {
        fontFamily: this.language.getFontFamily(),
        fontSize: "10px",
        color: "#ffffff",
        backgroundColor: "#34271d",
        padding: { x: 4, y: 3 }
      }
    ).setOrigin(0.5);

    const activityText = this.scene.add.text(0, 27, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "8px",
      color: "#fff1b8",
      backgroundColor: "#34271d",
      padding: { x: 3, y: 2 }
    }).setOrigin(0.5);

    const promptText = this.scene.add.text(
      0,
      43,
      this.language.t("village.talk"),
      {
        fontFamily: this.language.getFontFamily(),
        fontSize: "9px",
        color: "#fff1b8",
        backgroundColor: "#79382e",
        padding: { x: 5, y: 3 }
      }
    ).setOrigin(0.5).setVisible(false);

    container.add([nameText, activityText, promptText]);

    this.villagers.push({
      id,
      name,
      x,
      y,
      targetX: x,
      targetY: y,
      scheduleKey: "",
      activityKey: "",
      container,
      sprite: character,
      nameText,
      activityText,
      promptText
    });
  }

  private createControls(): void {
    const keyboard = this.scene.input.keyboard!;
    this.talkKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.escapeKey = keyboard.addKey(27);

    window.addEventListener("keydown", this.handleWindowKeyDown, true);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("keydown", this.handleWindowKeyDown, true);
    });
  }

  private handleWindowKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.isTalking) {
      event.preventDefault();
      event.stopPropagation();
      this.closeDialogue();
    }
  };

  private createClock(): void {
    const background = pixelPanel(this.scene, 520, 85, 190, 31).setDepth(150);

    this.clockText = this.scene.add.text(520, 85, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#f0d69e"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(151);

    this.ui.registerHud(background, this.clockText);
    this.updateClockAndSchedules();
  }

  private createDialogueInterface(): void {
    this.dialoguePanel = this.scene.add.container(0, 0);
    this.dialoguePanel.setScrollFactor(0).setDepth(300).setVisible(false);

    const background = pixelPanel(this.scene, 320, 300, 590, 105, { alpha: 1 });

    const border = this.scene.add.graphics();

    this.speakerText = this.scene.add.text(48, 258, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "13px",
      color: "#e6c47e"
    });

    this.dialogueText = this.scene.add.text(48, 283, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "11px",
      color: "#ffffff",
      wordWrap: { width: 535 }
    });

    this.instructionText = this.scene.add.text(48, 335, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#d6e6c2"
    });

    this.closeText = this.scene.add.text(465, 335, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#e6c47e"
    });

    const continueHitArea = this.scene.add.rectangle(320, 305, 550, 43, 0x79382e, 0.01)
      .setInteractive({ useHandCursor: true });
    continueHitArea.on("pointerdown", () => this.nextDialogue());

    const closeHitArea = this.scene.add.rectangle(505, 339, 120, 28, 0x79382e, 0.01)
      .setInteractive({ useHandCursor: true });
    closeHitArea.on("pointerdown", this.closeDialogue);

    this.dialoguePanel.add([
      background,
      border,
      this.speakerText,
      this.dialogueText,
      this.instructionText,
      this.closeText,
      continueHitArea,
      closeHitArea
    ]);

    this.updateDialogueLabels();
  }

  private updateDialogueLabels(): void {
    this.instructionText.setText(
      this.language.getLanguage() === "my"
        ? "E နှိပ်၍ ဆက်လက်ဖတ်ရှုပါ"
        : "PRESS E TO CONTINUE"
    );
    this.closeText.setText(this.language.t("common.close"));

    const font = this.language.getFontFamily();
    this.speakerText.setFontFamily(font);
    this.dialogueText.setFontFamily(font);
    this.instructionText.setFontFamily(font);
    this.closeText.setFontFamily(font);
  }

  private updateLanguage(): void {
    this.maHomeLabel.setText(this.language.t("village.maHome"));
    this.koHomeLabel.setText(this.language.t("village.koHome"));
    const font = this.language.getFontFamily();
    this.maHomeLabel.setFontFamily(font);
    this.koHomeLabel.setFontFamily(font);

    for (const villager of this.villagers) {
      villager.nameText.setText(
        this.language.t(villager.id === "ma" ? "village.maThiri" : "village.koAung")
      );
      villager.activityText.setText(this.language.t(villager.activityKey));
      villager.promptText.setText(this.language.t("village.talk"));
      villager.nameText.setFontFamily(font);
      villager.activityText.setFontFamily(font);
      villager.promptText.setFontFamily(font);
    }

    this.updateDialogueLabels();
    this.lastClockLabel = "";
  }

  private getSchedule(villagerId: "ma" | "ko", minutes: number): DailySchedule {
    if (villagerId === "ma") {
      if (minutes >= 360 && minutes < 480) {
        return { key: "morning-home", activityKey: "village.breakfast", x: 820, y: 235, indoors: true };
      }
      if (minutes >= 480 && minutes < 720) {
        return { key: "market", activityKey: "village.market", x: 635, y: 280, indoors: false };
      }
      if (minutes >= 720 && minutes < 960) {
        return { key: "rice-field", activityKey: "village.field", x: 720, y: 380, indoors: false };
      }
      if (minutes >= 960 && minutes < 1080) {
        return { key: "canal", activityKey: "village.canal", x: 690, y: 485, indoors: false };
      }
      if (minutes >= 1080 && minutes < 1320) {
        return { key: "evening-home", activityKey: "village.home", x: 820, y: 235, indoors: true };
      }
      return { key: "sleeping", activityKey: "village.sleep", x: 820, y: 235, indoors: true };
    }

    if (minutes >= 360 && minutes < 480) {
      return { key: "morning-home", activityKey: "village.breakfast", x: 695, y: 130, indoors: true };
    }
    if (minutes >= 480 && minutes < 720) {
      return { key: "rice-field", activityKey: "village.field", x: 710, y: 420, indoors: false };
    }
    if (minutes >= 720 && minutes < 960) {
      return { key: "market", activityKey: "village.market", x: 575, y: 285, indoors: false };
    }
    if (minutes >= 960 && minutes < 1080) {
      return { key: "canal", activityKey: "village.canal", x: 760, y: 490, indoors: false };
    }
    if (minutes >= 1080 && minutes < 1320) {
      return { key: "evening-home", activityKey: "village.home", x: 695, y: 130, indoors: true };
    }
    return { key: "sleeping", activityKey: "village.sleep", x: 695, y: 130, indoors: true };
  }

  private updateClockAndSchedules(): void {
    const elapsedMinutes = Math.floor(
      (this.scene.time.now - this.clockStartTime) / this.gameMinuteDuration
    );
    const day = Math.floor(elapsedMinutes / 1440) + 1;
    const totalMinutes = (360 + elapsedMinutes) % 1440;
    const hour24 = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    const time = `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
    const label = this.language.getLanguage() === "my" ? `နေ့ ${day}  ${time}` : `DAY ${day}  ${time}`;

    if (label !== this.lastClockLabel) {
      this.clockText.setText(label);
      this.lastClockLabel = label;
    }

    for (const villager of this.villagers) {
      const schedule = this.getSchedule(villager.id, totalMinutes);
      if (schedule.key === villager.scheduleKey) continue;

      const wasIndoors = !villager.container.visible;
      villager.scheduleKey = schedule.key;
      villager.activityKey = schedule.activityKey;
      villager.targetX = schedule.x;
      villager.targetY = schedule.y;

      if (schedule.indoors) {
        villager.x = schedule.x;
        villager.y = schedule.y;
        villager.container.setPosition(villager.x, villager.y);
        villager.container.setVisible(false);
      } else {
        if (wasIndoors) {
          villager.x = villager.id === "ma" ? 820 : 695;
          villager.y = villager.id === "ma" ? 270 : 160;
          villager.container.setPosition(villager.x, villager.y);
        }
        villager.container.setVisible(true);
      }

      villager.activityText.setText(this.language.t(schedule.activityKey));
    }
  }

  private moveVillager(villager: Villager): void {
    if (!villager.container.visible) return;

    const dx = villager.targetX - villager.x;
    const dy = villager.targetY - villager.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 2) {
      villager.sprite.anims.stop();
      villager.sprite.setFrame(0);
      return;
    }

    const delta = Math.min(this.scene.game.loop.delta, 50) / 1000;
    const movement = 48 * delta;
    const nextX = movement >= distance ? villager.targetX : villager.x + (dx / distance) * movement;
    const nextY = movement >= distance ? villager.targetY : villager.y + (dy / distance) * movement;

    if (this.canMoveTo(nextX, villager.y)) villager.x = nextX;
    if (this.canMoveTo(villager.x, nextY)) villager.y = nextY;

    const key = villager.sprite.texture.key;
    if (Math.abs(dx) > Math.abs(dy)) {
      villager.sprite.setFlipX(dx < 0);
      villager.sprite.anims.play(`${key}-side`, true);
    } else {
      villager.sprite.anims.play(`${key}-${dy < 0 ? "up" : "down"}`, true);
    }

    villager.container.setPosition(villager.x, villager.y);
    villager.container.setDepth(villager.y + 30);
  }

  private getNearestVillager(playerX: number, playerY: number): Villager | null {
    let nearest: Villager | null = null;
    let shortestDistance = 75;

    for (const villager of this.villagers) {
      if (!villager.container.visible) continue;
      const distance = Phaser.Math.Distance.Between(playerX, playerY, villager.x, villager.y);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearest = villager;
      }
    }

    return nearest;
  }

  private openDialogue(villager: Villager): void {
    this.isTalking = true;
    this.activeVillager = villager;
    this.dialogueIndex = 0;
    this.speakerText.setText(
      this.language.t(villager.id === "ma" ? "village.maThiri" : "village.koAung")
    );
    this.ui.open("dialogue");
    this.showDialogue();
  }

  private showDialogue(): void {
    if (!this.activeVillager) return;
    const key = this.activeVillager.id === "ma"
      ? `dialogue.ma.${this.dialogueIndex}`
      : `dialogue.ko.${this.dialogueIndex}`;
    this.dialogueText.setText(this.language.t(key));
  }

  private closeDialogue = (): void => {
    this.isTalking = false;
    this.activeVillager = null;
    this.ui.close("dialogue");
    this.talkKey.reset();
    this.escapeKey.reset();
  };

  private nextDialogue(): void {
    if (!this.activeVillager) return;
    this.dialogueIndex++;
    if (this.dialogueIndex >= 6) {
      this.closeDialogue();
      return;
    }
    this.showDialogue();
  }

  isDialogueOpen(): boolean {
    return this.isTalking;
  }

  mobileTalk(playerX: number, playerY: number): boolean {
    if (this.isTalking) {
      this.nextDialogue();
      return true;
    }

    if (this.ui.hasActiveModal()) return false;
    const nearest = this.getNearestVillager(playerX, playerY);
    if (!nearest) return false;

    this.openDialogue(nearest);
    return true;
  }

  getSaveData() {
    return {
      elapsedGameMinutes: Math.max(0, Math.floor(
        (this.scene.time.now - this.clockStartTime) / this.gameMinuteDuration
      ))
    };
  }

  loadSaveData(data: { elapsedGameMinutes: number }): void {
    const elapsed = Math.max(0, Math.floor(Number(data.elapsedGameMinutes) || 0));
    this.clockStartTime = this.scene.time.now - elapsed * this.gameMinuteDuration;
    this.lastClockLabel = "";
    this.updateClockAndSchedules();

    for (const villager of this.villagers) {
      villager.container.setPosition(villager.x, villager.y);
      villager.container.setDepth(villager.y + 30);
    }
  }

  update(playerX: number, playerY: number): void {
    this.updateClockAndSchedules();

    for (const villager of this.villagers) {
      if (!this.isTalking || this.activeVillager !== villager) {
        this.moveVillager(villager);
      }
      villager.promptText.setVisible(false);
    }

    if (this.isTalking) {
      if (Phaser.Input.Keyboard.JustDown(this.talkKey)) this.nextDialogue();
      return;
    }

    const nearest = this.getNearestVillager(playerX, playerY);
    if (nearest) {
      nearest.promptText.setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(this.talkKey)) {
        this.openDialogue(nearest);
      }
    }
  }
}
