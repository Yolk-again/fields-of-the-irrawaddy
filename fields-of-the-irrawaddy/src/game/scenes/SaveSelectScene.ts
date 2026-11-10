import Phaser from "phaser";
import { LanguageSystem } from "../systems/LanguageSystem";
import {
  SAVE_SLOT_COUNT,
  deleteSaveSlot,
  migrateLegacySaveToFirstSlot,
  readSaveSlotSummary
} from "../systems/SaveSlotStorage";
import { pixelPanel } from "../ui/PixelUI";

interface SaveSlotButton {
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

type ConfirmationKind = "overwrite" | "delete";

export class SaveSelectScene extends Phaser.Scene {
  private language!: LanguageSystem;
  private slotObjects: Phaser.GameObjects.GameObject[] = [];
  private confirmationPanel?: Phaser.GameObjects.Container;

  constructor() {
    super("SaveSelectScene");
  }

  create(): void {
    this.language = new LanguageSystem();
    migrateLegacySaveToFirstSlot();
    this.drawLandscape();
    this.drawTitle();
    this.renderSaveSlots();
  }

  private drawLandscape(): void {
    const art = this.add.graphics().setDepth(0);
    art.fillStyle(0x8dbdb0, 1).fillRect(0, 0, 640, 360);
    art.fillStyle(0xf2d17d, 1).fillCircle(530, 64, 24);
    art.fillStyle(0x709b72, 1).fillTriangle(0, 216, 175, 93, 350, 216);
    art.fillStyle(0x5c875f, 1).fillTriangle(210, 216, 430, 82, 640, 216);
    art.fillStyle(0x4e7548, 1).fillRect(0, 206, 640, 154);
    art.fillStyle(0x678e4e, 1).fillRect(0, 226, 640, 134);
    art.fillStyle(0x3d7756, 1).fillRect(0, 278, 640, 35);
    art.fillStyle(0x79b8a0, 1).fillRect(0, 283, 640, 23);
    art.fillStyle(0x4a8050, 1).fillRect(0, 313, 640, 47);

    for (let row = 0; row < 4; row++) {
      const y = 230 + row * 26;
      art.lineStyle(2, row % 2 === 0 ? 0x8eaa58 : 0x73964f, 0.8);
      for (let x = -30; x < 670; x += 48) {
        art.lineBetween(x, y, x + 24, y + 13);
      }
    }

    art.fillStyle(0x4c3525, 1).fillRect(46, 170, 62, 43);
    art.fillStyle(0xb9824d, 1).fillTriangle(38, 172, 77, 137, 116, 172);
    art.fillStyle(0x6c492c, 1).fillRect(69, 185, 15, 28);
    art.fillStyle(0x8c5b35, 1).fillRect(558, 168, 7, 53).fillRect(582, 168, 7, 53);
    art.fillStyle(0x9b6c3c, 1).fillRect(546, 163, 55, 8);
    art.fillStyle(0x426b3d, 1).fillCircle(560, 155, 16).fillCircle(585, 150, 20);
    art.fillStyle(0x507b43, 1).fillCircle(548, 166, 14);
  }

  private drawTitle(): void {
    this.add.text(320, 34, this.language.t("menu.title"), {
      fontFamily: this.language.getFontFamily(),
      fontSize: "21px",
      color: "#fff1cf",
      fontStyle: "bold",
      stroke: "#2a1a14",
      strokeThickness: 5,
      align: "center"
    }).setOrigin(0.5).setDepth(5);

    this.add.text(320, 66, this.language.t("menu.subtitle"), {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#fff1cf",
      stroke: "#2a1a14",
      strokeThickness: 3,
      align: "center"
    }).setOrigin(0.5).setDepth(5);

    this.add.text(320, 344, this.language.t("menu.footer"), {
      fontFamily: this.language.getFontFamily(),
      fontSize: "8px",
      color: "#fff1cf",
      stroke: "#2a1a14",
      strokeThickness: 3,
      align: "center"
    }).setOrigin(0.5).setDepth(5);
  }

  private renderSaveSlots(): void {
    this.destroySlotObjects();

    const centers = [108, 320, 532];
    for (let index = 0; index < SAVE_SLOT_COUNT; index++) {
      const slotNumber = index + 1;
      const centerX = centers[index];
      const summary = readSaveSlotSummary(slotNumber);
      const panel = pixelPanel(this, centerX, 207, 190, 196, {
        fill: 0x2d3829,
        alpha: 0.97
      }).setDepth(10);
      this.slotObjects.push(panel);

      const title = this.add.text(centerX, 132, this.language.t("menu.slot", { number: slotNumber }), {
        fontFamily: this.language.getFontFamily(),
        fontSize: "11px",
        color: "#e6c47e",
        fontStyle: "bold",
        align: "center"
      }).setOrigin(0.5).setDepth(12);
      this.slotObjects.push(title);

      if (!summary.occupied) {
        const emptyText = this.add.text(centerX, 179, this.language.t("menu.empty"), {
          fontFamily: this.language.getFontFamily(),
          fontSize: "10px",
          color: "#d7e6c5",
          align: "center"
        }).setOrigin(0.5).setDepth(12);
        this.slotObjects.push(emptyText);
        const button = this.createButton(centerX, 226, 148, 34, this.language.t("menu.newGame"), () => {
          this.startGame(slotNumber, false);
        }, 0x527044);
        this.trackButton(button);
        continue;
      }

      const infoLabel = summary.valid
        ? this.language.t("menu.saved", {
            day: summary.day,
            date: this.formatSavedDate(summary.savedAt)
          })
        : this.language.t("menu.invalid");
      const info = this.add.text(centerX, 163, infoLabel, {
        fontFamily: this.language.getFontFamily(),
        fontSize: "8px",
        color: summary.valid ? "#d7e6c5" : "#f2a28b",
        align: "center",
        wordWrap: { width: 164 }
      }).setOrigin(0.5).setDepth(12);
      this.slotObjects.push(info);

      if (summary.valid) {
        const continueButton = this.createButton(
          centerX,
          199,
          150,
          27,
          this.language.t("menu.continue"),
          () => this.startGame(slotNumber, true),
          0x527044
        );
        this.trackButton(continueButton);
      }

      const newGameButton = this.createButton(
        centerX - 42,
        244,
        78,
        27,
        this.language.t("menu.newGame"),
        () => this.showConfirmation(slotNumber, "overwrite"),
        0x80603b
      );
      this.trackButton(newGameButton);

      const deleteButton = this.createButton(
        centerX + 42,
        244,
        78,
        27,
        this.language.t("menu.delete"),
        () => this.showConfirmation(slotNumber, "delete"),
        0x813b32
      );
      this.trackButton(deleteButton);
    }
  }

  private trackButton(button: SaveSlotButton): void {
    this.slotObjects.push(button.background, button.label);
  }

  private destroySlotObjects(): void {
    for (const object of this.slotObjects) object.destroy();
    this.slotObjects = [];
  }

  private formatSavedDate(value: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    action: () => void,
    fill: number
  ): SaveSlotButton {
    const background = this.add.rectangle(x, y, width, height, fill, 1)
      .setStrokeStyle(2, 0xd6b36b, 1)
      .setDepth(15)
      .setInteractive({ useHandCursor: true });
    const buttonLabel = this.add.text(x, y, label, {
      fontFamily: this.language.getFontFamily(),
      fontSize: "8px",
      color: "#fff1cf",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: width - 8 }
    }).setOrigin(0.5).setDepth(16);

    background.on("pointerover", () => background.setFillStyle(fill + 0x151515, 1));
    background.on("pointerout", () => background.setFillStyle(fill, 1));
    background.on("pointerdown", () => action());
    return { background, label: buttonLabel };
  }

  private showConfirmation(slotNumber: number, kind: ConfirmationKind): void {
    this.confirmationPanel?.destroy(true);
    const panel = this.add.container(0, 0).setDepth(1000);
    this.confirmationPanel = panel;

    const dim = this.add.rectangle(320, 180, 640, 360, 0x11170f, 0.78)
      .setInteractive();
    const frame = pixelPanel(this, 320, 180, 370, 166, { fill: 0x2d3829, alpha: 1 });
    const titleKey = kind === "delete" ? "menu.confirmDeleteTitle" : "menu.confirmOverwriteTitle";
    const bodyKey = kind === "delete" ? "menu.confirmDeleteBody" : "menu.confirmOverwriteBody";
    const title = this.add.text(320, 128, this.language.t(titleKey), {
      fontFamily: this.language.getFontFamily(),
      fontSize: "15px",
      color: "#e6c47e",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: 320 }
    }).setOrigin(0.5);
    const body = this.add.text(320, 171, this.language.t(bodyKey, { number: slotNumber }), {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#fff1cf",
      align: "center",
      wordWrap: { width: 310 }
    }).setOrigin(0.5);

    const confirmLabel = this.language.t(kind === "delete" ? "menu.confirmDelete" : "menu.confirmNew");
    const confirmButton = this.createButton(
      236,
      230,
      140,
      32,
      confirmLabel,
      () => {
        if (kind === "delete") {
          if (deleteSaveSlot(slotNumber)) {
            this.confirmationPanel?.destroy(true);
            this.confirmationPanel = undefined;
            this.renderSaveSlots();
          }
        } else {
          deleteSaveSlot(slotNumber);
          this.startGame(slotNumber, false);
        }
      },
      kind === "delete" ? 0x813b32 : 0x527044
    );
    const cancelButton = this.createButton(
      404,
      230,
      140,
      32,
      this.language.t("menu.cancel"),
      () => {
        this.confirmationPanel?.destroy(true);
        this.confirmationPanel = undefined;
      },
      0x80603b
    );

    panel.add([
      dim, frame, title, body,
      confirmButton.background, confirmButton.label,
      cancelButton.background, cancelButton.label
    ]);
  }

  private startGame(slotNumber: number, loadExisting: boolean): void {
    this.scene.start("FarmScene", {
      saveSlot: slotNumber,
      loadExisting,
      fromSaveSelect: true
    });
  }
}
