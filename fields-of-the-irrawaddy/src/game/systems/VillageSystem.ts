
import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, modalPanel, pixelPanel } from "../ui/PixelUI";
import { HOMES } from "../data/villageLayout";
import { NpcFarmingSystem, type NpcFarmAction, type NpcFarmerId } from "./NpcFarmingSystem";

type VillagerId = "ma" | "ko" | "monk" | "kid";
type Pose = "none" | "work" | "sit";
type NpcAction =
  | "market" | "farm" | "rest" | "eat" | "sleep" | "sweep"
  | "meditate" | "chant" | "play" | "school" | "skip"
  | "alms" | "offer" | "homage" | "walkMeditate" | "talk"
  | "hoe" | "plant" | "water" | "harvest" | "clear";

interface Waypoint {
  x: number;
  y: number;
  /** seconds spent here doing `pose` */
  wait: number;
  pose?: Pose;
  /** face left while posing (sprites face right by default) */
  flip?: boolean;
  almsResident?: "ma" | "ko";
  /** Allows a short animated escape if an NPC was already placed inside a blocker. */
  escape?: boolean;
  animation?: NpcAction;
  farmAction?: NpcFarmAction;
  farmTileIndex?: number;
}

interface GridAnchor {
  index: number;
  x: number;
  y: number;
  connector: { x: number; y: number }[];
  connectorLength: number;
}

interface DailySchedule {
  key: string;
  activityKey: string;
  indoors: boolean;
  x: number;
  y: number;
  pose?: Pose;
  flip?: boolean;
  /** walking speed in px/s and animation speed in frames/s */
  speed?: number;
  fps?: number;
  animation?: NpcAction;
  route?: Waypoint[];
  wander?: { x1: number; y1: number; x2: number; y2: number };
  chase?: boolean;
  repeatRoute?: boolean;
}

type AlmsState = "none" | "leaving" | "offering" | "homage" | "returning";

interface Villager {
  id: VillagerId;
  name: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scheduleKey: string;
  activityKey: string;
  schedule: DailySchedule | null;
  routeIndex: number;
  waitTimer: number;
  arrivedPose: Pose;
  chaseCooldown: number;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  baseScaleX: number;
  baseScaleY: number;
  currentAnimationKey: string;
  nameText: Phaser.GameObjects.Text;
  activityText: Phaser.GameObjects.Text;
  promptText: Phaser.GameObjects.Text;
  speechText: Phaser.GameObjects.Text;
  wasPlayerNear: boolean;
  lastAmbientIndex: number;
  almsState: AlmsState;
  /** True while the villager is visibly walking from their activity to the home doorway. */
  enteringHome: boolean;
  homePathRetryTimer: number;
  stuckTimer: number;
  almsTimer: number;
  almsTargetX: number;
  almsTargetY: number;
  almsDoorX: number;
  almsDoorY: number;
  almsPath: Waypoint[];
  almsPathIndex: number;
  almsStuckTimer: number;
  almsRetryTimer: number;
  almsLastDay: number;
  almsGift: Phaser.GameObjects.Image;
  homageText: Phaser.GameObjects.Text;
  taskIcon: Phaser.GameObjects.Image;
}

const NAME_KEYS: Record<VillagerId, string> = {
  ma: "village.maThiri",
  ko: "village.koAung",
  monk: "village.monk",
  kid: "village.kid"
};

/** Small front-facing character sprites used as dialogue portraits. */
const PORTRAIT_KEYS: Record<VillagerId, string> = {
  ma: "ma_thiri_asset",
  ko: "ko_aung_asset",
  monk: "monk_asset",
  kid: "kid_asset"
};

// Monastery compound waypoints (world px)
const COURT_Y = 282;
const SWEEP_ROUTE: Waypoint[] = [
  { x: 1196, y: COURT_Y, wait: 5, pose: "work", animation: "sweep" },
  { x: 1250, y: COURT_Y + 8, wait: 5, pose: "work", animation: "sweep" },
  { x: 1320, y: COURT_Y, wait: 5, pose: "work", flip: true, animation: "sweep" },
  { x: 1400, y: COURT_Y + 4, wait: 5, pose: "work", flip: true, animation: "sweep" }
];
const PACE_ROUTE: Waypoint[] = [
  { x: 1190, y: COURT_Y, wait: 0.5, animation: "walkMeditate" },
  { x: 1330, y: COURT_Y, wait: 0.5, animation: "walkMeditate" }
];
const ALMS_ROUTE: Waypoint[] = [
  // Walk straight down through the centre of the monastery gate before
  // following the open village road. These axis-aligned road waypoints avoid
  // asking the grid planner to squeeze around the gate pillars unnecessarily.
  { x: 1264, y: 286, wait: 0 },
  { x: 705, y: 286, wait: 5.5, almsResident: "ko" },
  { x: 835, y: 286, wait: 5.5, almsResident: "ma" },
  { x: 1264, y: 286, wait: 0 },
  { x: 1264, y: COURT_Y, wait: 0 }
];

export class VillageSystem {
  private scene: Phaser.Scene;
  private ui: ModalUIManager;
  private language: LanguageSystem;
  private canMoveTo: (x: number, y: number) => boolean;
  private getChaseTargets: () => { x: number; y: number }[];
  private npcFarming?: NpcFarmingSystem;

  private villagers: Villager[] = [];
  private maHomeLabel!: Phaser.GameObjects.Text;
  private koHomeLabel!: Phaser.GameObjects.Text;
  private houseLabels: { text: Phaser.GameObjects.Text; x: number; y: number }[] = [];

  private talkKey!: Phaser.Input.Keyboard.Key;
  private isTalking = false;
  private activeVillager: Villager | null = null;
  private readonly touchMode = ("ontouchstart" in window) || navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
  private dialogueIndex = 0;

  private dialoguePanel!: Phaser.GameObjects.Container;
  private dialogueCloseButton!: Phaser.GameObjects.Container;
  private dialogueText!: Phaser.GameObjects.Text;
  private speakerText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private speakerPortrait!: Phaser.GameObjects.Image;
  private clockText!: Phaser.GameObjects.Text;
  private clockIcon!: Phaser.GameObjects.Image;

  private clockStartTime = 0;
  private readonly gameMinuteDuration = 250;
  private lastClockLabel = "";

  constructor(
    scene: Phaser.Scene,
    ui: ModalUIManager,
    language: LanguageSystem,
    canMoveTo: (x: number, y: number) => boolean = () => true,
    getChaseTargets: () => { x: number; y: number }[] = () => [],
    npcFarming?: NpcFarmingSystem
  ) {
    this.scene = scene;
    this.ui = ui;
    this.language = language;
    this.canMoveTo = canMoveTo;
    this.getChaseTargets = getChaseTargets;
    this.npcFarming = npcFarming;
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
    }, this.dialogueCloseButton);

    this.ui.registerHud(
      this.clockText,
      ...this.villagers.map(v => v.promptText),
      ...this.villagers.map(v => v.activityText)
    );

    this.language.onChange(() => this.updateLanguage());
  }

  private createHomes(): void {
    this.maHomeLabel = this.createHouse(HOMES.ma.x, HOMES.ma.y, "ma_home_asset", "village.maHome", 132);
    this.koHomeLabel = this.createHouse(HOMES.ko.x, HOMES.ko.y, "ko_home_asset", "village.koHome", 128);
  }

  private createHouse(
    x: number,
    bottomY: number,
    texture: string,
    labelKey: string,
    height: number
  ): Phaser.GameObjects.Text {
    this.scene.add.image(x, bottomY, texture)
      .setOrigin(0.5, 1)
      .setScale(2)
      .setDepth(bottomY);

    const label = this.scene.add.text(
      x,
      bottomY - height - 8,
      this.language.t(labelKey),
      {
        fontFamily: this.language.getFontFamily(),
        fontSize: "10px",
        color: "#fff3d3",
        backgroundColor: "#2a1a14",
        padding: { x: 4, y: 3 }
      }
    ).setOrigin(0.5).setDepth(5000).setAlpha(0);
    this.houseLabels.push({ text: label, x, y: bottomY - 60 });
    return label;
  }

  private createVillagers(): void {
    this.createVillager("ma", "Ma Thiri", 865, 270, "ma_thiri_asset");
    this.createVillager("ko", "Ko Aung", 735, 270, "ko_aung_asset");
    this.createVillager("monk", "U Nanda", 1264, 240, "monk_asset");
    this.createVillager("kid", "Maung Nyi", 865, 275, "kid_asset");
  }

  private createVillager(
    id: VillagerId,
    name: string,
    x: number,
    y: number,
    texture: string
  ): void {
    const isKid = id === "kid";
    const shadow = this.scene.add.ellipse(0, 19, isKid ? 17 : 22, isKid ? 5 : 7, 0x1d3015, 0.38);
    const sheetKey = texture.replace("_asset", "_sheet");
    const character = this.scene.add.sprite(0, 22, sheetKey, 0)
      .setOrigin(0.5, 1)
      .setScale(isKid ? 1.45 : 2);
    const container = this.scene.add.container(x, y, [shadow, character]);
    container.setDepth(y + 30);

    const nameText = this.scene.add.text(0, -36, this.language.t(NAME_KEYS[id]), {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#ffffff",
      backgroundColor: "#2a1a14",
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setAlpha(0);

    const activityText = this.scene.add.text(0, 27, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "9px",
      color: "#fff1b8",
      backgroundColor: "#2a1a14",
      padding: { x: 3, y: 2 }
    }).setOrigin(0.5).setAlpha(0);

    const promptText = this.scene.add.text(0, 44, this.language.t("village.talk"), {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#fff1b8",
      backgroundColor: "#79382e",
      padding: { x: 5, y: 3 },
      stroke: "#2a1a14",
      strokeThickness: 2
    }).setOrigin(0.5).setVisible(false);

    // Ambient remarks are intentionally compact world-space bubbles. They are
    // separate from the larger dialogue panel opened when the player presses E.
    const speechText = this.scene.add.text(0, -52, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#302015",
      backgroundColor: "#fff1cf",
      padding: { x: 4, y: 3 },
      align: "center",
      wordWrap: { width: 124 },
      lineSpacing: 0,
      stroke: "#5e3b22",
      strokeThickness: 1,
      shadow: { color: "#000000", blur: 0, offsetX: 1, offsetY: 2, fill: true }
    }).setOrigin(0.5, 1).setVisible(false);

    const almsGift = this.scene.add.image(-15, -4, "rice_bowl_asset")
      .setScale(1.25)
      .setVisible(false);
    const homageText = this.scene.add.text(0, -47, "🙏", {
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
      color: "#fff1cf",
      stroke: "#2a1a14",
      strokeThickness: 3
    }).setOrigin(0.5).setVisible(false);
    const taskIcon = this.scene.add.image(18, -24, "ui_icon_note")
      .setScale(0.8)
      .setAlpha(0.9)
      .setVisible(false);

    container.add([nameText, activityText, promptText, speechText, almsGift, homageText, taskIcon]);

    this.villagers.push({
      id,
      name,
      x,
      y,
      targetX: x,
      targetY: y,
      scheduleKey: "",
      activityKey: "",
      schedule: null,
      routeIndex: 0,
      waitTimer: 0,
      arrivedPose: "none",
      chaseCooldown: 0,
      container,
      sprite: character,
      baseScaleX: character.scaleX,
      baseScaleY: character.scaleY,
      currentAnimationKey: "",
      nameText,
      activityText,
      promptText,
      speechText,
      wasPlayerNear: false,
      lastAmbientIndex: -1,
      almsState: "none",
      enteringHome: false,
      homePathRetryTimer: 0,
      stuckTimer: 0,
      almsTimer: 0,
      almsTargetX: x,
      almsTargetY: y,
      almsDoorX: x,
      almsDoorY: y,
      almsPath: [],
      almsPathIndex: 0,
      almsStuckTimer: 0,
      almsRetryTimer: 0,
      almsLastDay: 0,
      almsGift,
      homageText,
      taskIcon
    });
  }

  private createControls(): void {
    const keyboard = this.scene.input.keyboard!;
    this.talkKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  private createClock(): void {
    const background = pixelPanel(this.scene, 93, 22, 170, 28).setDepth(150);
    this.clockIcon = this.scene.add.image(22, 22, "ui_icon_sun").setScrollFactor(0).setDepth(151);

    this.clockText = this.scene.add.text(38, 16, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#f0d69e",
      stroke: "#2a1a14",
      strokeThickness: 2
    }).setScrollFactor(0).setDepth(151);

    this.ui.registerHud(background, this.clockIcon, this.clockText);
    this.updateClockAndSchedules();
  }

  private createDialogueInterface(): void {
    this.dialoguePanel = this.scene.add.container(0, 0);
    this.dialoguePanel.setScrollFactor(0).setDepth(300).setVisible(false);

    // Keep the same wooden-and-gold modal frame, with a dedicated portrait bay
    // on the right and enough room for dialogue text on the left.
    const panelCenter = { x: 320, y: 300 };
    const panelWidth = 590;
    const panelHeight = 112;
    const background = modalPanel(
      this.scene,
      panelCenter.x,
      panelCenter.y,
      panelWidth,
      panelHeight
    );
    const portraitFrame = pixelPanel(this.scene, 548, 300, 76, 88, {
      fill: 0x263326,
      alpha: 1
    });

    this.speakerText = this.scene.add.text(48, 257, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "15px",
      color: "#e6c47e",
      stroke: "#21170f",
      strokeThickness: 1
    });

    this.dialogueText = this.scene.add.text(48, 282, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "13px",
      color: "#ffffff",
      wordWrap: { width: 430 },
      lineSpacing: 3,
      stroke: "#21170f",
      strokeThickness: 1
    });

    this.instructionText = this.scene.add.text(48, 335, "", {
      fontFamily: this.language.getFontFamily(),
      fontSize: "10px",
      color: "#d6e6c2"
    });

    this.speakerPortrait = this.scene.add.image(548, 300, PORTRAIT_KEYS.ko)
      .setOrigin(0.5)
      .setScale(2.65);

    // The continue hit area covers only the text region, never the portrait or
    // the top-right red close control.
    const continueHitArea = this.scene.add.rectangle(270, 306, 450, 54, 0x79382e, 0.01)
      .setInteractive({ useHandCursor: true });
    continueHitArea.on("pointerdown", () => this.nextDialogue());

    const closePosition = modalClosePosition(
      panelCenter.x,
      panelCenter.y,
      panelWidth,
      panelHeight
    );
    this.dialogueCloseButton = createRedCloseButton(
      this.scene,
      closePosition.x,
      closePosition.y
    );

    this.dialoguePanel.add([
      background,
      portraitFrame,
      this.speakerPortrait,
      this.speakerText,
      this.dialogueText,
      this.instructionText,
      continueHitArea,
      this.dialogueCloseButton
    ]);

    this.updateDialogueLabels();
  }

  private updateDialogueLabels(): void {
    this.instructionText.setText(
      this.language.getLanguage() === "my"
        ? "E နှိပ်၍ ဆက်လက်ဖတ်ရှုပါ"
        : "PRESS E TO CONTINUE"
    );
    const font = this.language.getFontFamily();
    this.speakerText.setFontFamily(font);
    this.dialogueText.setFontFamily(font);
    this.instructionText.setFontFamily(font);
  }

  private updateLanguage(): void {
    this.maHomeLabel.setText(this.language.t("village.maHome"));
    this.koHomeLabel.setText(this.language.t("village.koHome"));
    const font = this.language.getFontFamily();
    this.maHomeLabel.setFontFamily(font);
    this.koHomeLabel.setFontFamily(font);

    for (const villager of this.villagers) {
      villager.nameText.setText(this.language.t(NAME_KEYS[villager.id]));
      villager.activityText.setText(this.language.t(villager.activityKey));
      villager.promptText.setText(this.language.t("village.talk"));
      villager.nameText.setFontFamily(font);
      villager.activityText.setFontFamily(font);
      villager.promptText.setFontFamily(font);
      villager.speechText.setFontFamily(font);
    }

    this.updateDialogueLabels();
    this.lastClockLabel = "";
  }

  private getSchedule(id: VillagerId, minutes: number): DailySchedule {
    const h = minutes / 60;
    const inRange = (from: number, to: number): boolean => h >= from && h < to;

    if (id === "ma") {
      const home = { x: HOMES.ma.x, y: HOMES.ma.y - 15 };
      if (inRange(6, 8)) return { key: "ma-home-am", activityKey: "village.breakfast", indoors: true, ...home };
      if (inRange(8, 13)) return { key: "ma-field", activityKey: "village.field", indoors: false, x: 910, y: 385, pose: "work", speed: 82, fps: 10 };
      if (inRange(13, 16)) return { key: "ma-market", activityKey: "village.market", indoors: false, x: 600, y: 290, pose: "none" };
      if (inRange(16, 18)) return { key: "ma-canal", activityKey: "village.canal", indoors: false, x: 690, y: 500, pose: "sit" };
      if (inRange(18, 22)) return { key: "ma-home-pm", activityKey: "village.home", indoors: true, ...home };
      return { key: "ma-sleep", activityKey: "village.sleep", indoors: true, ...home };
    }

    if (id === "ko") {
      const home = { x: HOMES.ko.x, y: HOMES.ko.y - 15 };
      if (inRange(6, 8)) return { key: "ko-home-am", activityKey: "village.breakfast", indoors: true, ...home };
      if (inRange(8, 13)) return { key: "ko-field", activityKey: "village.field", indoors: false, x: 1160, y: 385, pose: "work", speed: 82, fps: 10 };
      if (inRange(13, 16)) return { key: "ko-market", activityKey: "village.market", indoors: false, x: 540, y: 292, pose: "none" };
      if (inRange(16, 18)) return { key: "ko-canal", activityKey: "village.canal", indoors: false, x: 760, y: 500, pose: "sit" };
      if (inRange(18, 22)) return { key: "ko-home-pm", activityKey: "village.home", indoors: true, ...home };
      return { key: "ko-sleep", activityKey: "village.sleep", indoors: true, ...home };
    }

    if (id === "monk") {
      const cell = { x: 1264, y: 232 };
      // Three in-game hours are reserved for the full return trip and two
      // household visits; the former two-hour window could cancel the route
      // before its final monastery return was reached.
      if (inRange(6, 9)) return { key: "monk-alms", activityKey: "village.alms", indoors: false, x: 1264, y: COURT_Y, speed: 84, fps: 5, route: ALMS_ROUTE, repeatRoute: false };
      if (inRange(9, 10)) return { key: "monk-sweep-am", activityKey: "village.sweeping", indoors: false, x: 1196, y: COURT_Y, speed: 30, fps: 5, route: SWEEP_ROUTE };
      if (inRange(10, 11)) return { key: "monk-meditate", activityKey: "village.meditate", indoors: false, x: 1385, y: COURT_Y, pose: "sit", speed: 30, fps: 4 };
      if (inRange(11, 13)) return { key: "monk-meal", activityKey: "village.monkMeal", indoors: true, ...cell };
      if (inRange(13, 15)) return { key: "monk-sweep-pm", activityKey: "village.sweeping", indoors: false, x: 1196, y: COURT_Y, speed: 30, fps: 5, route: SWEEP_ROUTE };
      if (inRange(15, 17)) return { key: "monk-walk", activityKey: "village.walkMeditate", indoors: false, x: 1190, y: COURT_Y, speed: 18, fps: 3, route: PACE_ROUTE };
      if (inRange(17, 19)) return { key: "monk-chant", activityKey: "village.chant", indoors: false, x: 1385, y: COURT_Y, pose: "sit", speed: 30, fps: 4 };
      return { key: "monk-rest", activityKey: "village.monkRest", indoors: true, ...cell };
    }

    // kid
    const home = { x: HOMES.ma.x + 18, y: HOMES.ma.y - 15 };
    const yard = { x1: 80, y1: 284, x2: 400, y2: 316 };
    if (inRange(6, 7)) return { key: "kid-home-am", activityKey: "village.breakfast", indoors: true, ...home };
    if (inRange(7, 9)) return { key: "kid-chase-am", activityKey: "village.kidChase", indoors: false, x: 300, y: 296, speed: 88, fps: 14, chase: true, wander: yard };
    if (inRange(9, 11.5)) return { key: "kid-school", activityKey: "village.kidSchool", indoors: false, x: 1264, y: 300, pose: "sit", speed: 70, fps: 12 };
    if (inRange(11.5, 12.5)) return { key: "kid-lunch", activityKey: "village.lunch", indoors: true, ...home };
    if (inRange(12.5, 15)) return { key: "kid-run", activityKey: "village.kidPlay", indoors: false, x: 760, y: 350, speed: 95, fps: 14, wander: { x1: 740, y1: 330, x2: 1000, y2: 500 } };
    if (inRange(15, 17)) return { key: "kid-chase-pm", activityKey: "village.kidChase", indoors: false, x: 300, y: 296, speed: 88, fps: 14, chase: true, wander: yard };
    if (inRange(17, 18.5)) return { key: "kid-skip", activityKey: "village.kidSkip", indoors: false, x: 560, y: 508, pose: "work", speed: 70, fps: 12 };
    if (inRange(18.5, 20)) return { key: "kid-square", activityKey: "village.kidPlay", indoors: false, x: 520, y: 292, speed: 90, fps: 14, wander: { x1: 420, y1: 280, x2: 700, y2: 312 } };
    return { key: "kid-sleep", activityKey: "village.sleep", indoors: true, ...home };
  }

  /**
   * Skip to the next rest milestone using the shared village clock.
   * Morning sleep wakes at 18:00, afternoon sleep at 21:00, and night sleep
   * wakes at 07:00 on the following in-game day.
   */
  sleepUntilNextPeriod(): { hour: number; day: number } {
    const elapsedMinutes = Math.max(0, Math.floor((this.scene.time.now - this.clockStartTime) / this.gameMinuteDuration));
    const dayIndex = Math.floor(elapsedMinutes / 1440);
    const minuteOfDay = (360 + elapsedMinutes) % 1440;
    const hourNow = Math.floor(minuteOfDay / 60);
    let targetElapsedMinutes: number;
    let targetHour: number;

    if (hourNow >= 6 && hourNow < 12) {
      targetHour = 18;
      targetElapsedMinutes = dayIndex * 1440 + (targetHour * 60 - 360);
    } else if (hourNow >= 12 && hourNow < 19) {
      targetHour = 21;
      targetElapsedMinutes = dayIndex * 1440 + (targetHour * 60 - 360);
    } else {
      targetHour = 7;
      targetElapsedMinutes = (dayIndex + 1) * 1440 + (targetHour * 60 - 360);
    }

    this.clockStartTime = this.scene.time.now - targetElapsedMinutes * this.gameMinuteDuration;
    this.lastClockLabel = "";
    this.updateClockAndSchedules();
    return { hour: targetHour, day: this.getGameDay() };
  }

  getTimeOfDayHours(): number {
    const elapsedMinutes = Math.floor((this.scene.time.now - this.clockStartTime) / this.gameMinuteDuration);
    return ((360 + elapsedMinutes) % 1440) / 60;
  }

  /** Total elapsed in-game minutes since the world began; 1,440 = 24 hours. */
  getElapsedGameMinutes(): number {
    return Math.max(0, Math.floor((this.scene.time.now - this.clockStartTime) / this.gameMinuteDuration));
  }

  /** Day number shared by crop growth and daily village requests. */
  getGameDay(): number {
    const elapsedMinutes = Math.floor((this.scene.time.now - this.clockStartTime) / this.gameMinuteDuration);
    return Math.floor(elapsedMinutes / 1440) + 1;
  }

  private updateClockAndSchedules(): void {
    const elapsedMinutes = Math.floor(
      (this.scene.time.now - this.clockStartTime) / this.gameMinuteDuration
    );
    const day = Math.floor(elapsedMinutes / 1440) + 1;
    this.npcFarming?.syncGameDay(day);
    const totalMinutes = (360 + elapsedMinutes) % 1440;
    const hour24 = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    const time = `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
    const label = this.language.getLanguage() === "my" ? `နေ့ ${day}  ${time}` : `DAY ${day}  ${time}`;

    if (label !== this.lastClockLabel) {
      this.clockText.setText(label);
      // Align the sun/moon indicator with the same dawn/dusk transition used by the world.
      this.clockIcon.setTexture(hour24 >= 7 && hour24 < 17 ? "ui_icon_sun" : "ui_icon_moon");
      this.lastClockLabel = label;
    }

    for (const villager of this.villagers) {
      const schedule = this.getSchedule(villager.id, totalMinutes);
      if (schedule.key === villager.scheduleKey) continue;

      // Ko Aung and Ma Thiri share the same tile-based farming routine as the
      // player: prepare soil, sow seed, water each day, harvest, then sell.
      if (this.npcFarming && (villager.id === "ma" || villager.id === "ko")) {
        const owner = villager.id as NpcFarmerId;
        if (schedule.key === `${owner}-field`) {
          const workRoute = this.npcFarming.getDailyWorkRoute(owner);
          if (workRoute.length > 0) {
            schedule.route = workRoute;
            schedule.repeatRoute = false;
            schedule.x = workRoute[0].x;
            schedule.y = workRoute[0].y;
          }
        } else if (schedule.key === `${owner}-market` && this.npcFarming.hasSalePending(owner)) {
          schedule.route = [{
            x: schedule.x,
            y: schedule.y,
            wait: 2.6,
            animation: "market",
            farmAction: "sell"
          }];
          schedule.repeatRoute = false;
        }
      }

      const isFirstSchedule = villager.scheduleKey === "";
      const wasIndoors = !villager.container.visible;
      villager.scheduleKey = schedule.key;
      villager.activityKey = schedule.activityKey;
      villager.schedule = schedule;
      villager.routeIndex = 0;
      villager.waitTimer = 0;
      villager.arrivedPose = "none";
      villager.currentAnimationKey = "";
      villager.targetX = schedule.x;
      villager.targetY = schedule.y;

      if (schedule.indoors) {
        villager.promptText.setVisible(false);
        villager.speechText.setVisible(false);
        villager.wasPlayerNear = false;

        // On a fresh load, an indoor schedule should start indoors. During live
        // play, however, villagers must visibly walk to their doorway first.
        // The monk's alms sequence owns a donor's movement until that visit ends.
        if (villager.almsState !== "none") {
          villager.enteringHome = false;
          villager.container.setVisible(true);
        } else if (isFirstSchedule || wasIndoors) {
          villager.enteringHome = false;
          villager.x = schedule.x;
          villager.y = schedule.y;
          villager.container.setPosition(villager.x, villager.y);
          villager.container.setVisible(false);
        } else {
          const door = this.doorPosition(villager.id);
          villager.enteringHome = true;
          villager.targetX = door.x;
          villager.targetY = door.y;
          // Calculate a collision-aware path for every villager. This routes
          // around props, buildings, fences and canal edges instead of relying
          // on a single straight line that can leave an NPC stuck.
          const homePath = this.findHomePath(villager.x, villager.y, door);
          // An unreachable route stays pending and is retried; never replace
          // it with a straight line through a solid building or fence.
          schedule.route = homePath;
          schedule.repeatRoute = false;
          villager.routeIndex = 0;
          villager.homePathRetryTimer = 0;
          villager.stuckTimer = 0;
          villager.container.setVisible(true);
        }
      } else {
        villager.enteringHome = false;
        villager.homePathRetryTimer = 0;
        villager.stuckTimer = 0;
        if (wasIndoors) {
          const door = this.doorPosition(villager.id);
          villager.x = door.x;
          villager.y = door.y;
          villager.container.setPosition(villager.x, villager.y);
        }
        villager.container.setVisible(true);
        // Plan every fixed daily destination through the same four-way grid,
        // not just home paths. Dynamic kid chase/wander targets are planned
        // on demand when they change or encounter a blocker.
        if (!schedule.chase) {
          const hasAuthoredRoute = Array.isArray(schedule.route);
          const targets = schedule.route ?? [{ x: schedule.x, y: schedule.y, wait: 0, pose: schedule.pose, flip: schedule.flip, animation: schedule.animation }];
          const shouldLoop = hasAuthoredRoute && schedule.repeatRoute !== false;
          schedule.repeatRoute = shouldLoop;
          const planned = this.planWaypoints(villager.x, villager.y, targets, shouldLoop);
          schedule.route = planned;
          villager.routeIndex = 0;
          if (planned.length > 0) {
            villager.targetX = planned[0].x;
            villager.targetY = planned[0].y;
          }
        }
      }

      villager.activityText.setText(this.language.t(schedule.activityKey));
    }
  }

  private doorPosition(id: VillagerId): { x: number; y: number } {
    if (id === "ma") return { x: HOMES.ma.x, y: HOMES.ma.y + 18 };
    if (id === "ko") return { x: HOMES.ko.x, y: HOMES.ko.y + 18 };
    if (id === "monk") return { x: 1264, y: 262 };
    return { x: HOMES.ma.x + 18, y: HOMES.ma.y + 18 };
  }

  private animationForActivity(activityKey: string): NpcAction {
    const map: Record<string, NpcAction> = {
      "village.breakfast": "eat", "village.market": "market", "village.field": "farm",
      "village.canal": "rest", "village.home": "rest", "village.sleep": "sleep",
      "village.alms": "alms", "village.offering": "offer", "village.homage": "homage",
      "village.sweeping": "sweep", "village.meditate": "meditate",
      "village.walkMeditate": "walkMeditate", "village.monkMeal": "eat",
      "village.monkRest": "rest", "village.chant": "chant", "village.kidChase": "play",
      "village.kidPlay": "play", "village.kidSchool": "school", "village.kidSkip": "skip",
      "village.lunch": "eat"
    };
    return map[activityKey] ?? "rest";
  }

  private playNpcAnimation(villager: Villager, action: NpcAction, flip = false): void {
    const sprite = villager.sprite;
    const key = `${sprite.texture.key}-task-${action}`;
    const taskIcons: Record<NpcAction, string> = {
      market: "ui_icon_note", farm: "ui_icon_seed", rest: "ui_icon_sun",
      eat: "rice_bowl_asset", sleep: "ui_icon_moon", sweep: "v_leaf_pile",
      meditate: "ui_icon_sprout", chant: "ui_icon_note", play: "ui_icon_sun",
      school: "ui_icon_note", skip: "water_glint", alms: "rice_bowl_asset",
      offer: "rice_bowl_asset", homage: "ui_icon_person", walkMeditate: "ui_icon_sprout",
      talk: "ui_icon_person", hoe: "hoe_asset", plant: "rice_seed_bag_asset",
      water: "watering_can_asset", harvest: "sickle_asset", clear: "sickle_asset"
    };
    if (villager.currentAnimationKey === key && sprite.anims.isPlaying) {
      sprite.setFlipX(flip);
      return;
    }
    this.scene.tweens.killTweensOf(sprite);
    sprite.setPosition(0, 22).setAngle(0).setScale(villager.baseScaleX, villager.baseScaleY);
    sprite.setFlipX(flip);
    sprite.anims.timeScale = 1;
    if (this.scene.anims.exists(key)) sprite.anims.play(key, true);
    else sprite.anims.play(`${sprite.texture.key}-sit`, true);
    villager.currentAnimationKey = key;
    const taskIcon = villager.taskIcon;
    this.scene.tweens.killTweensOf(taskIcon);
    taskIcon.setTexture(taskIcons[action]).setPosition(18, -24).setAlpha(0.9).setVisible(true);
    this.scene.tweens.add({
      targets: taskIcon,
      y: -29,
      alpha: 0.65,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    // Each routine has a different movement cue as well as its own frame loop.
    if (action === "sleep") {
      this.scene.tweens.add({ targets: sprite, y: 24, scaleY: villager.baseScaleY * 0.97, duration: 1050, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (action === "meditate" || action === "rest") {
      this.scene.tweens.add({ targets: sprite, scaleY: villager.baseScaleY * 0.96, duration: 1250, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (action === "chant") {
      this.scene.tweens.add({ targets: sprite, angle: { from: -2, to: 2 }, scaleY: villager.baseScaleY * 0.98, duration: 850, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (action === "market") {
      this.scene.tweens.add({ targets: sprite, angle: { from: -3, to: 3 }, scaleX: villager.baseScaleX * 0.98, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (action === "farm") {
      this.scene.tweens.add({ targets: sprite, angle: { from: -7, to: 5 }, y: { from: 22, to: 20 }, duration: 360, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (action === "sweep") {
      this.scene.tweens.add({ targets: sprite, angle: { from: -8, to: 8 }, duration: 300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (action === "eat") {
      this.scene.tweens.add({ targets: sprite, angle: { from: 3, to: -2 }, y: { from: 22, to: 20 }, duration: 320, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (action === "offer") {
      this.scene.tweens.add({ targets: sprite, angle: { from: -4, to: 7 }, duration: 420, yoyo: true, repeat: 2, ease: "Sine.easeInOut" });
    } else if (action === "alms") {
      this.scene.tweens.add({ targets: sprite, angle: { from: -2, to: 2 }, duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (action === "homage") {
      this.scene.tweens.add({ targets: sprite, angle: 8, y: 24, duration: 360, yoyo: true, repeat: 1, ease: "Sine.easeInOut" });
    } else if (action === "school") {
      this.scene.tweens.add({ targets: sprite, angle: { from: -1, to: 2 }, y: { from: 22, to: 21 }, duration: 780, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (action === "walkMeditate") {
      this.scene.tweens.add({ targets: sprite, y: { from: 22, to: 20 }, angle: { from: -1.5, to: 1.5 }, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (action === "talk") {
      this.scene.tweens.add({ targets: sprite, angle: { from: -2, to: 2 }, y: { from: 22, to: 21 }, duration: 260, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (action === "play" || action === "skip") {
      this.scene.tweens.add({ targets: sprite, y: 18, scaleY: villager.baseScaleY * 1.02, duration: action === "skip" ? 155 : 190, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  private playWalkAnimation(villager: Villager, dx: number, dy: number): void {
    const sprite = villager.sprite;
    const key = sprite.texture.key;
    const animation = Math.abs(dx) > Math.abs(dy) ? `${key}-side` : `${key}-${dy < 0 ? "up" : "down"}`;
    this.scene.tweens.killTweensOf(sprite);
    this.scene.tweens.killTweensOf(villager.taskIcon);
    villager.taskIcon.setVisible(false);
    sprite.setPosition(0, 22).setAngle(0).setScale(villager.baseScaleX, villager.baseScaleY);
    if (Math.abs(dx) > Math.abs(dy)) sprite.setFlipX(dx < 0);
    else sprite.setFlipX(false);
    if (villager.currentAnimationKey !== animation || !sprite.anims.isPlaying) {
      sprite.anims.timeScale = 1;
      sprite.anims.play(animation, true);
      villager.currentAnimationKey = animation;
    }
  }

  private readonly navigationCellSize = 16;
  private readonly navigationClearance = 4;

  /** The NPC footprint must clear the obstacle on all four sides and corners. */
  private canNavigateTo(x: number, y: number): boolean {
    const margin = this.navigationClearance;
    return this.canMoveTo(x, y) &&
      this.canMoveTo(x - margin, y) && this.canMoveTo(x + margin, y) &&
      this.canMoveTo(x, y - margin) && this.canMoveTo(x, y + margin) &&
      this.canMoveTo(x - margin, y - margin) && this.canMoveTo(x + margin, y - margin) &&
      this.canMoveTo(x - margin, y + margin) && this.canMoveTo(x + margin, y + margin);
  }

  private navigationDimensions(): { columns: number; rows: number } {
    const cell = this.navigationCellSize;
    return { columns: Math.ceil(1440 / cell), rows: Math.ceil(640 / cell) };
  }

  /**
   * Return the shortest collision-free orthogonal connector between two exact
   * points. Diagonal shortcuts are deliberately forbidden so an NPC cannot
   * clip the corner of a house, wall, crop bed or prop.
   */
  private getOrthogonalConnector(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): { points: { x: number; y: number }[]; length: number } | null {
    const options = [
      [{ x: toX, y: fromY }, { x: toX, y: toY }],
      [{ x: fromX, y: toY }, { x: toX, y: toY }]
    ];
    const valid: { points: { x: number; y: number }[]; length: number }[] = [];
    for (const points of options) {
      let from = { x: fromX, y: fromY };
      let length = 0;
      let clear = true;
      const compact: { x: number; y: number }[] = [];
      for (const point of points) {
        if (Phaser.Math.Distance.Between(from.x, from.y, point.x, point.y) < 1) continue;
        if (!this.isWalkSegmentClear(from.x, from.y, point.x, point.y)) {
          clear = false;
          break;
        }
        length += Phaser.Math.Distance.Between(from.x, from.y, point.x, point.y);
        compact.push(point);
        from = point;
      }
      if (clear) valid.push({ points: compact, length });
    }
    return valid.sort((a, b) => a.length - b.length)[0] ?? null;
  }

  /**
   * Enumerate nearby walkable grid centres that can actually be reached from
   * the exact position. Keeping several anchors avoids the old failure mode
   * where the single nearest cell was separated by a collider even though a
   * neighbouring cell had a clear approach.
   */
  private getGridAnchors(x: number, y: number, allowNearBlockedTarget = false): GridAnchor[] {
    const cell = this.navigationCellSize;
    const { columns, rows } = this.navigationDimensions();
    const centerCol = Phaser.Math.Clamp(Math.floor(x / cell), 0, columns - 1);
    const centerRow = Phaser.Math.Clamp(Math.floor(y / cell), 0, rows - 1);
    const anchors: GridAnchor[] = [];
    const maxRadius = 4;

    for (let radius = 0; radius <= maxRadius; radius++) {
      for (let rowOffset = -radius; rowOffset <= radius; rowOffset++) {
        for (let colOffset = -radius; colOffset <= radius; colOffset++) {
          if (radius > 0 && Math.max(Math.abs(rowOffset), Math.abs(colOffset)) !== radius) continue;
          const col = centerCol + colOffset;
          const row = centerRow + rowOffset;
          if (col < 0 || row < 0 || col >= columns || row >= rows) continue;
          const px = col * cell + cell / 2;
          const py = row * cell + cell / 2;
          if (!this.canNavigateTo(px, py)) continue;
          const index = row * columns + col;
          if (allowNearBlockedTarget && !this.canNavigateTo(x, y)) {
            const distance = Phaser.Math.Distance.Between(px, py, x, y);
            if (distance <= 72) {
              anchors.push({ index, x: px, y: py, connector: [], connectorLength: distance * 0.8 });
            }
            continue;
          }
          // Source connectors run exact-position -> grid centre; goal
          // connectors run grid centre -> exact-position.
          const connector = allowNearBlockedTarget
            ? this.getOrthogonalConnector(px, py, x, y)
            : this.getOrthogonalConnector(x, y, px, py);
          if (connector) {
            anchors.push({ index, x: px, y: py, connector: connector.points, connectorLength: connector.length });
          }
        }
      }
    }

    // Retain the best nearby approaches but include alternatives on each side.
    anchors.sort((a, b) => a.connectorLength - b.connectorLength);
    return anchors.slice(0, 40);
  }

  private isWalkSegmentClear(x1: number, y1: number, x2: number, y2: number): boolean {
    const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Math.max(1, Math.ceil(distance / 6));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!this.canNavigateTo(Phaser.Math.Linear(x1, x2, t), Phaser.Math.Linear(y1, y2, t))) return false;
    }
    return true;
  }

  /**
   * Check all four escape directions when a villager starts intersecting a
   * blocker. Each candidate is a straight cardinal exit; the full route score
   * later chooses the shortest escape + path, rather than blindly choosing the
   * first direction that happens to be open.
   */
  private getEscapeCandidates(x: number, y: number): { x: number; y: number; distance: number; escape: boolean }[] {
    if (this.canNavigateTo(x, y)) return [{ x, y, distance: 0, escape: false }];
    const directions = [
      { x: 0, y: 1 },   // down / doorway side
      { x: 1, y: 0 },   // right
      { x: -1, y: 0 },  // left
      { x: 0, y: -1 }   // up
    ];
    const candidates: { x: number; y: number; distance: number; escape: boolean }[] = [];
    for (const direction of directions) {
      let firstClearDistance = -1;
      let lastClearPoint: { x: number; y: number } | null = null;
      let alternativesForDirection = 0;
      for (let distance = 8; distance <= 224; distance += 8) {
        const px = x + direction.x * distance;
        const py = y + direction.y * distance;
        if (px < 12 || px > 1428 || py < 16 || py > 616) break;
        if (!this.canNavigateTo(px, py)) {
          // Once we have exited the starting obstruction, a second obstacle
          // ends this candidate corridor. Never let an escape shortcut pass
          // through a different building or prop.
          if (firstClearDistance >= 0) break;
          continue;
        }

        const point = { x: px, y: py };
        if (firstClearDistance < 0) {
          firstClearDistance = distance;
          lastClearPoint = point;
          candidates.push({ x: px, y: py, distance, escape: true });
          alternativesForDirection++;
          continue;
        }

        // Keep a couple of farther, still-clear exit points in each direction.
        // A nearest exit can be beside a second wall and have no usable grid
        // connection; the alternatives let the full route score choose better.
        if (distance - firstClearDistance >= alternativesForDirection * 16 &&
            lastClearPoint && this.isWalkSegmentClear(lastClearPoint.x, lastClearPoint.y, px, py)) {
          candidates.push({ x: px, y: py, distance, escape: true });
          lastClearPoint = point;
          alternativesForDirection++;
          if (alternativesForDirection >= 3) break;
        }
      }
    }
    return candidates;
  }

  /**
   * Four-neighbour Dijkstra search. It considers multiple reachable start and
   * goal anchors, so it can select the genuinely shortest clear route rather
   * than committing to one nearest grid cell. Every grid edge is orthogonal.
   */
  private findGridPath(startX: number, startY: number, targetX: number, targetY: number): Waypoint[] {
    const cell = this.navigationCellSize;
    const { columns, rows } = this.navigationDimensions();
    const total = columns * rows;
    const starts = this.getGridAnchors(startX, startY, false);
    const goals = this.getGridAnchors(targetX, targetY, true);
    if (starts.length === 0 || goals.length === 0) return [];

    const goalByIndex = new Map<number, GridAnchor>();
    for (const goal of goals) {
      const previous = goalByIndex.get(goal.index);
      if (!previous || goal.connectorLength < previous.connectorLength) goalByIndex.set(goal.index, goal);
    }

    const distances = new Float64Array(total);
    distances.fill(Infinity);
    const previous = new Int32Array(total);
    previous.fill(-2);
    const startByIndex = new Map<number, GridAnchor>();
    const walkability = new Int8Array(total); // 0 unknown, 1 open, -1 blocked
    const heap: { index: number; cost: number }[] = [];

    const push = (entry: { index: number; cost: number }): void => {
      heap.push(entry);
      let child = heap.length - 1;
      while (child > 0) {
        const parent = Math.floor((child - 1) / 2);
        if (heap[parent].cost <= entry.cost) break;
        heap[child] = heap[parent];
        child = parent;
      }
      heap[child] = entry;
    };
    const pop = (): { index: number; cost: number } | undefined => {
      if (heap.length === 0) return undefined;
      const root = heap[0];
      const last = heap.pop()!;
      if (heap.length > 0) {
        let parent = 0;
        while (true) {
          const left = parent * 2 + 1;
          const right = left + 1;
          if (left >= heap.length) break;
          let child = left;
          if (right < heap.length && heap[right].cost < heap[left].cost) child = right;
          if (heap[child].cost >= last.cost) break;
          heap[parent] = heap[child];
          parent = child;
        }
        heap[parent] = last;
      }
      return root;
    };

    for (const start of starts) {
      if (start.connectorLength >= distances[start.index]) continue;
      distances[start.index] = start.connectorLength;
      previous[start.index] = -1;
      startByIndex.set(start.index, start);
      push({ index: start.index, cost: start.connectorLength });
    }

    let bestGoal = -1;
    let bestScore = Infinity;
    while (heap.length > 0) {
      const current = pop()!;
      if (current.cost !== distances[current.index]) continue;
      if (current.cost > bestScore) break;

      const goal = goalByIndex.get(current.index);
      if (goal) {
        const score = current.cost + goal.connectorLength;
        if (score < bestScore) {
          bestScore = score;
          bestGoal = current.index;
        }
      }

      const col = current.index % columns;
      const row = Math.floor(current.index / columns);
      const goalCol = Math.floor(targetX / cell);
      const goalRow = Math.floor(targetY / cell);
      const horizontal = goalCol >= col ? 1 : -1;
      const vertical = goalRow >= row ? 1 : -1;
      const directions = [
        [horizontal, 0], [0, vertical], [-horizontal, 0], [0, -vertical]
      ] as const;

      for (const [dc, dr] of directions) {
        const nc = col + dc;
        const nr = row + dr;
        if (nc < 0 || nr < 0 || nc >= columns || nr >= rows) continue;
        const next = nr * columns + nc;
        if (walkability[next] === -1) continue;
        const nx = nc * cell + cell / 2;
        const ny = nr * cell + cell / 2;
        if (walkability[next] === 0) {
          walkability[next] = this.canNavigateTo(nx, ny) ? 1 : -1;
        }
        if (walkability[next] !== 1) continue;
        const currentX = col * cell + cell / 2;
        const currentY = row * cell + cell / 2;
        if (!this.isWalkSegmentClear(currentX, currentY, nx, ny)) continue;
        const nextCost = current.cost + cell;
        if (nextCost >= distances[next] || nextCost > bestScore) continue;
        distances[next] = nextCost;
        previous[next] = current.index;
        push({ index: next, cost: nextCost });
      }
    }
    if (bestGoal < 0) return [];

    const nodes: number[] = [];
    for (let node = bestGoal; node !== -1; node = previous[node]) nodes.push(node);
    nodes.reverse();
    const source = startByIndex.get(nodes[0]);
    const goal = goalByIndex.get(bestGoal);
    if (!source || !goal) return [];

    const gridPoints = nodes.map(node => ({
      x: (node % columns) * cell + cell / 2,
      y: Math.floor(node / columns) * cell + cell / 2
    }));
    const route: Waypoint[] = [];
    const addPoint = (point: { x: number; y: number }): void => {
      const from = route[route.length - 1];
      // Keep even very small offsets: a 2px orthogonal corner is still a
      // required turn. Dropping it turns the next segment into a diagonal and
      // can send the NPC into the corner of a collision box.
      if (!from || Phaser.Math.Distance.Between(from.x, from.y, point.x, point.y) > 0.5) {
        route.push({ x: point.x, y: point.y, wait: 0 });
      }
    };

    // Exact start -> grid, using the shortest reachable L-shaped connector.
    for (const point of source.connector) addPoint(point);
    for (let i = 1; i < gridPoints.length; i++) {
      const currentPoint = gridPoints[i];
      const previousPoint = gridPoints[i - 1];
      const direction = currentPoint.x === previousPoint.x ? "v" : "h";
      const nextPoint = gridPoints[i + 1];
      const nextDirection = nextPoint ? (nextPoint.x === currentPoint.x ? "v" : "h") : "";
      if (i === gridPoints.length - 1 || direction !== nextDirection) addPoint(currentPoint);
    }
    // Grid -> exact target (or stop at the closest safe cell if the target itself is blocked).
    for (const point of goal.connector) addPoint(point);
    if (route.length === 0) addPoint(gridPoints[gridPoints.length - 1]);
    return route;
  }

  /** Score all four possible escape directions and return the shortest clear path. */
  private findWalkablePath(startX: number, startY: number, targetX: number, targetY: number): Waypoint[] {
    const candidates = this.getEscapeCandidates(startX, startY);
    let bestPath: Waypoint[] = [];
    let bestCost = Infinity;
    for (const candidate of candidates) {
      const path = this.findGridPath(candidate.x, candidate.y, targetX, targetY);
      if (path.length === 0) continue;
      const fullPath: Waypoint[] = [];
      if (candidate.escape) fullPath.push({ x: candidate.x, y: candidate.y, wait: 0, escape: true });
      fullPath.push(...path);
      let cost = 0;
      let from = { x: startX, y: startY };
      let pathIsClear = true;
      for (let index = 0; index < fullPath.length; index++) {
        const point = fullPath[index];
        // The first cardinal escape is allowed to leave the NPC's original
        // overlapping footprint. Every segment after that must be clear.
        if (!(index === 0 && candidate.escape)) {
          const sameX = Math.abs(from.x - point.x) < 1;
          const sameY = Math.abs(from.y - point.y) < 1;
          if ((!sameX && !sameY) || !this.isWalkSegmentClear(from.x, from.y, point.x, point.y)) {
            pathIsClear = false;
            break;
          }
        } else if (Math.abs(from.x - point.x) > 1 && Math.abs(from.y - point.y) > 1) {
          pathIsClear = false;
          break;
        }
        cost += Phaser.Math.Distance.Between(from.x, from.y, point.x, point.y);
        from = point;
      }
      if (!pathIsClear) continue;
      if (cost < bestCost) {
        bestCost = cost;
        bestPath = fullPath;
      }
    }
    return bestPath;
  }

  /** Plan each semantic waypoint separately so waits, actions and alms visits survive pathfinding. */
  private planWaypoints(startX: number, startY: number, targets: Waypoint[], loop: boolean): Waypoint[] {
    const planned: Waypoint[] = [];
    let cursor = { x: startX, y: startY };
    for (const target of targets) {
      const previous = planned[planned.length - 1];
      const isPlotTask = target.farmAction !== undefined && target.farmAction !== "sell" &&
        target.farmTileIndex !== undefined;
      const previousIsPlotTask = previous?.farmAction !== undefined && previous.farmAction !== "sell";
      // Once inside one of the clear fenced plots, tile targets are arranged in
      // a continuous snake path. Avoid running a full map search for every
      // neighbouring tile, but still validate the exact segment for clearance.
      const axisAligned = Math.abs(cursor.x - target.x) < 0.5 || Math.abs(cursor.y - target.y) < 0.5;
      const directRoadLeg = axisAligned && this.isWalkSegmentClear(cursor.x, cursor.y, target.x, target.y)
        ? [{ x: target.x, y: target.y, wait: 0 } as Waypoint]
        : null;
      const segment = isPlotTask && previousIsPlotTask && this.isWalkSegmentClear(cursor.x, cursor.y, target.x, target.y)
        ? [{ x: target.x, y: target.y, wait: 0 } as Waypoint]
        : directRoadLeg ?? this.findWalkablePath(cursor.x, cursor.y, target.x, target.y);
      if (segment.length === 0) continue;
      const final = segment[segment.length - 1];
      segment[segment.length - 1] = {
        ...final,
        wait: target.wait,
        pose: target.pose,
        flip: target.flip,
        almsResident: target.almsResident,
        animation: target.animation,
        farmAction: target.farmAction,
        farmTileIndex: target.farmTileIndex
      };
      planned.push(...segment);
      cursor = { x: final.x, y: final.y };
    }
    if (loop && planned.length > 1) {
      const first = planned[0];
      const returnPath = this.findWalkablePath(cursor.x, cursor.y, first.x, first.y);
      if (returnPath.length > 0) {
        returnPath[returnPath.length - 1] = { ...returnPath[returnPath.length - 1], wait: 0, pose: first.pose, animation: first.animation };
        planned.push(...returnPath);
      }
    }
    return planned;
  }

  private findHomePath(startX: number, startY: number, door: { x: number; y: number }): Waypoint[] {
    const offsets = [
      [0, 0], [0, 20], [24, 16], [-24, 16], [36, 0], [-36, 0],
      [0, 36], [24, 36], [-24, 36], [0, -20], [40, 24], [-40, 24]
    ] as const;
    let bestPath: Waypoint[] = [];
    let bestScore = Infinity;
    for (const [offsetX, offsetY] of offsets) {
      const targetX = Phaser.Math.Clamp(door.x + offsetX, 16, 1424);
      const targetY = Phaser.Math.Clamp(door.y + offsetY, 24, 616);
      const path = this.findWalkablePath(startX, startY, targetX, targetY);
      if (path.length === 0) continue;
      const end = path[path.length - 1];
      const doorDistance = Phaser.Math.Distance.Between(end.x, end.y, door.x, door.y);
      if (doorDistance > 58) continue;
      let pathLength = 0;
      let from = { x: startX, y: startY };
      for (const point of path) {
        pathLength += Phaser.Math.Distance.Between(from.x, from.y, point.x, point.y);
        from = point;
      }
      const score = pathLength + doorDistance * 0.35;
      if (score < bestScore) { bestScore = score; bestPath = path; }
    }
    return bestPath;
  }

  private hideVillagerAtHome(villager: Villager): void {
    villager.enteringHome = false;
    villager.container.setVisible(false);
    villager.promptText.setVisible(false);
    villager.speechText.setVisible(false);
    villager.wasPlayerNear = false;
    villager.stuckTimer = 0;
  }

  private planNextWander(villager: Villager, schedule: DailySchedule): boolean {
    if (!schedule.wander) return false;
    for (let attempt = 0; attempt < 12; attempt++) {
      const targetX = Phaser.Math.Between(schedule.wander.x1, schedule.wander.x2);
      const targetY = Phaser.Math.Between(schedule.wander.y1, schedule.wander.y2);
      const path = this.findWalkablePath(villager.x, villager.y, targetX, targetY);
      if (path.length === 0) continue;
      schedule.route = path;
      schedule.repeatRoute = false;
      villager.routeIndex = 0;
      villager.targetX = path[0].x;
      villager.targetY = path[0].y;
      villager.stuckTimer = 0;
      return true;
    }
    return false;
  }

  private advanceRoute(villager: Villager, schedule: DailySchedule): void {
    const route = schedule.route;
    if (!route) return;
    if (villager.routeIndex < route.length - 1) {
      villager.routeIndex++;
      villager.arrivedPose = "none";
      return;
    }
    if (schedule.repeatRoute !== false) {
      villager.routeIndex = 0;
      villager.arrivedPose = "none";
      return;
    }

    schedule.route = undefined;
    if (villager.enteringHome && schedule.indoors) {
      this.hideVillagerAtHome(villager);
      return;
    }
    if (schedule.chase) {
      // Pause briefly to play the child's playful reaction, then choose a new
      // moving target and calculate another collision-free path.
      villager.arrivedPose = "none";
      villager.stuckTimer = 0;
      villager.waitTimer = 0.35;
      this.playNpcAnimation(villager, "play");
      return;
    }
    if (schedule.wander && !schedule.chase) {
      this.planNextWander(villager, schedule);
      villager.arrivedPose = "none";
      return;
    }
    villager.targetX = schedule.x;
    villager.targetY = schedule.y;
    villager.arrivedPose = "none";
  }

  private currentGameDay(): number {
    const elapsedMinutes = Math.floor((this.scene.time.now - this.clockStartTime) / this.gameMinuteDuration);
    return Math.floor(elapsedMinutes / 1440) + 1;
  }

  private startAlmsVisit(residentId: "ma" | "ko"): void {
    const resident = this.villagers.find(v => v.id === residentId);
    if (!resident || resident.almsLastDay === this.currentGameDay()) return;
    resident.almsLastDay = this.currentGameDay();
    const door = this.doorPosition(residentId);
    resident.almsDoorX = door.x;
    resident.almsDoorY = door.y;
    resident.almsTargetX = door.x + 28;
    resident.almsTargetY = 286;
    // Villagers emerge at their actual doorway and walk to a standing point on
    // the road. The path is intentionally kept separate from the monk route.
    resident.x = door.x;
    resident.y = door.y;
    resident.almsPath = this.findWalkablePath(resident.x, resident.y, resident.almsTargetX, resident.almsTargetY);
    if (resident.almsPath.length === 0) {
      // Short, deterministic L-shaped fallback for the simple doorstep move.
      const elbows = [
        { x: resident.almsTargetX, y: resident.y },
        { x: resident.x, y: resident.almsTargetY }
      ];
      for (const elbow of elbows) {
        if (this.isWalkSegmentClear(resident.x, resident.y, elbow.x, elbow.y) &&
            this.isWalkSegmentClear(elbow.x, elbow.y, resident.almsTargetX, resident.almsTargetY)) {
          resident.almsPath = [
            { ...elbow, wait: 0 },
            { x: resident.almsTargetX, y: resident.almsTargetY, wait: 0 }
          ];
          break;
        }
      }
    }
    resident.almsPathIndex = 0;
    resident.almsStuckTimer = 0;
    resident.almsRetryTimer = 0;
    resident.container.setPosition(resident.x, resident.y).setDepth(resident.y + 30).setVisible(true);
    resident.almsState = "leaving";
    resident.almsTimer = 0;
    resident.almsGift.setVisible(false);
    resident.homageText.setVisible(false);
    resident.speechText.setVisible(false);
    resident.taskIcon.setVisible(false);
    resident.activityText.setText(this.language.t("village.offering"));
    resident.sprite.setFlipX(true);
  }

  private moveAlmsDonor(villager: Villager, dt: number): void {
    if (villager.almsState === "offering" || villager.almsState === "homage") {
      villager.almsTimer -= dt;
      if (villager.almsTimer > 0) return;
      if (villager.almsState === "offering") {
        villager.almsState = "homage";
        villager.almsTimer = 1.2;
        villager.almsGift.setVisible(false);
        villager.homageText.setVisible(true);
        villager.activityText.setText(this.language.t("village.homage"));
        this.playNpcAnimation(villager, "homage", false);
      } else {
        villager.almsState = "returning";
        villager.homageText.setVisible(false);
        villager.almsTargetX = villager.almsDoorX;
        villager.almsTargetY = villager.almsDoorY;
        villager.almsPath = this.findWalkablePath(villager.x, villager.y, villager.almsTargetX, villager.almsTargetY);
        villager.almsPathIndex = 0;
        villager.almsStuckTimer = 0;
        villager.almsRetryTimer = 0;
      }
      return;
    }

    if (villager.almsPath.length === 0 || villager.almsPathIndex >= villager.almsPath.length) {
      villager.almsRetryTimer -= dt;
      if (villager.almsRetryTimer <= 0) {
        villager.almsPath = this.findWalkablePath(villager.x, villager.y, villager.almsTargetX, villager.almsTargetY);
        villager.almsPathIndex = 0;
        villager.almsRetryTimer = 0.8;
      }
      if (villager.almsPath.length === 0) return;
    }

    const waypoint = villager.almsPath[villager.almsPathIndex];
    if (!waypoint) return;

    const dx = waypoint.x - villager.x;
    const dy = waypoint.y - villager.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 3) {
      if (villager.almsPathIndex < villager.almsPath.length - 1) {
        villager.almsPathIndex++;
        return;
      }
      if (villager.almsState === "leaving") {
        villager.almsState = "offering";
        villager.almsTimer = 1.25;
        villager.almsGift.setVisible(true).setPosition(-15, -5);
        villager.sprite.setFlipX(true);
        this.playNpcAnimation(villager, "offer", true);
        villager.activityText.setText(this.language.t("village.offering"));
      } else if (villager.almsState === "returning") {
        villager.almsState = "none";
        villager.container.setVisible(false);
        villager.almsGift.setVisible(false);
        villager.homageText.setVisible(false);
        villager.activityText.setText(this.language.t(villager.activityKey));
        villager.almsPath = [];
      }
      return;
    }

    const step = Math.min(distance, 58 * dt);
    const escaping = waypoint.escape === true && villager.almsPathIndex === 0;
    let nextX = villager.x;
    let nextY = villager.y;
    if (Math.abs(dx) > 0.5 && Math.abs(dy) > 0.5) {
      // If an L connector ever reaches this movement layer, take the clear
      // horizontal leg first; otherwise take the vertical leg. Never move on
      // both axes in one frame, which previously cut diagonally across corners.
      const horizontalClear = this.isWalkSegmentClear(villager.x, villager.y, waypoint.x, villager.y) &&
        this.isWalkSegmentClear(waypoint.x, villager.y, waypoint.x, waypoint.y);
      const verticalClear = this.isWalkSegmentClear(villager.x, villager.y, villager.x, waypoint.y) &&
        this.isWalkSegmentClear(villager.x, waypoint.y, waypoint.x, waypoint.y);
      if (horizontalClear) nextX += Math.sign(dx) * step;
      else if (verticalClear) nextY += Math.sign(dy) * step;
    } else if (Math.abs(dx) > 0.5) {
      nextX += Math.sign(dx) * step;
    } else if (Math.abs(dy) > 0.5) {
      nextY += Math.sign(dy) * step;
    }
    if (escaping || this.canNavigateTo(nextX, nextY)) {
      villager.x = nextX;
      villager.y = nextY;
    }
    const remaining = Phaser.Math.Distance.Between(villager.x, villager.y, waypoint.x, waypoint.y);
    if (distance - remaining > 0.1) villager.almsStuckTimer = 0;
    else villager.almsStuckTimer += dt;
    if (villager.almsStuckTimer >= 0.7) {
      villager.almsPath = this.findWalkablePath(villager.x, villager.y, villager.almsTargetX, villager.almsTargetY);
      villager.almsPathIndex = 0;
      villager.almsStuckTimer = 0;
    }
    this.playWalkAnimation(villager, dx, dy);
    villager.container.setPosition(villager.x, villager.y);
    villager.container.setDepth(villager.y + 30);
  }

  private showAmbientSpeech(villager: Villager): void {
    const choices = [0, 1, 2, 3].filter(index => index !== villager.lastAmbientIndex);
    const index = choices[Phaser.Math.Between(0, choices.length - 1)] ?? 0;
    villager.lastAmbientIndex = index;
    villager.speechText.setText(this.language.t(`ambient.${villager.id}.${index}`));
    villager.speechText.setFontFamily(this.language.getFontFamily());
    villager.speechText.setVisible(true);
  }

  private moveVillager(villager: Villager, dt: number): void {
    if (villager.almsState !== "none") {
      this.moveAlmsDonor(villager, dt);
      return;
    }
    const schedule = villager.schedule;
    if (!villager.container.visible || !schedule) return;

    // ---- decide where to go next
    let wait = 0;
    let allowBlockedEscape = false;
    let pose: Pose = schedule.pose ?? "none";
    let flip = schedule.flip;
    const speed = schedule.speed ?? 48;
    const fps = schedule.fps ?? 8;

    if (villager.waitTimer > 0) {
      villager.waitTimer -= dt;
      if (villager.waitTimer <= 0 && schedule.route) this.advanceRoute(villager, schedule);
      return;
    }

    if (villager.enteringHome && schedule.indoors && schedule.route?.length === 0) {
      // If no route was available at the schedule transition, retry instead
      // of sending the villager directly into the blocking doorway collider.
      villager.homePathRetryTimer -= dt;
      if (villager.homePathRetryTimer <= 0) {
        const door = this.doorPosition(villager.id);
        const retryPath = this.findHomePath(villager.x, villager.y, door);
        schedule.route = retryPath;
        villager.routeIndex = 0;
        villager.homePathRetryTimer = 1.25;
        if (retryPath.length > 0) {
          villager.targetX = retryPath[0].x;
          villager.targetY = retryPath[0].y;
        }
      }
      if (!schedule.route || schedule.route.length === 0) {
        this.playNpcAnimation(villager, this.animationForActivity(schedule.activityKey));
        return;
      }
    }

    if (schedule.chase) {
      // The child chases moving animals through the same four-way pathfinder as
      // scheduled routes. Recalculate periodically so a moving target does not
      // leave the child running toward an obsolete or blocked position.
      villager.chaseCooldown -= dt;
      const targets = this.getChaseTargets();
      if (targets.length === 0 && !schedule.route) {
        villager.targetX = villager.x;
        villager.targetY = villager.y;
        this.playNpcAnimation(villager, "play");
        return;
      }
      if (targets.length > 0 && (!schedule.route || villager.chaseCooldown <= 0)) {
        let best = targets[0];
        let bestDistance = Infinity;
        for (const target of targets) {
          const distanceToTarget = Phaser.Math.Distance.Between(villager.x, villager.y, target.x, target.y);
          if (distanceToTarget < bestDistance) {
            bestDistance = distanceToTarget;
            best = target;
          }
        }
        const targetX = Phaser.Math.Clamp(best.x, schedule.wander?.x1 ?? 8, schedule.wander?.x2 ?? 1432);
        const targetY = Phaser.Math.Clamp(best.y, schedule.wander?.y1 ?? 12, schedule.wander?.y2 ?? 624);
        if (bestDistance < 22) {
          schedule.route = undefined;
          villager.routeIndex = 0;
          villager.targetX = villager.x;
          villager.targetY = villager.y;
          villager.waitTimer = 0.45;
          villager.chaseCooldown = 0;
          this.playNpcAnimation(villager, "play");
          return;
        }

        // A chicken can run right up against a fence or world-edge cell. Aim
        // for several nearby reachable points rather than abandoning the chase
        // when its exact current position cannot be reached by the pathfinder.
        const offsets: Array<[number, number]> = [
          [0, 0], [18, 0], [-18, 0], [0, 12], [0, -12],
          [30, 14], [-30, 14], [30, -14], [-30, -14],
          [48, 0], [-48, 0], [0, 22], [0, -22],
          [54, 18], [-54, 18], [54, -18], [-54, -18]
        ];
        let chasePath: Waypoint[] = [];
        let bestPathCost = Infinity;
        for (const [offsetX, offsetY] of offsets) {
          const candidateX = Phaser.Math.Clamp(targetX + offsetX, schedule.wander?.x1 ?? 8, schedule.wander?.x2 ?? 1432);
          const candidateY = Phaser.Math.Clamp(targetY + offsetY, schedule.wander?.y1 ?? 12, schedule.wander?.y2 ?? 624);
          const candidatePath = this.findWalkablePath(villager.x, villager.y, candidateX, candidateY);
          if (candidatePath.length === 0) continue;
          let cost = 0;
          let from = { x: villager.x, y: villager.y };
          for (const point of candidatePath) {
            cost += Phaser.Math.Distance.Between(from.x, from.y, point.x, point.y);
            from = point;
          }
          cost += Phaser.Math.Distance.Between(candidateX, candidateY, best.x, best.y) * 0.28;
          if (cost < bestPathCost) {
            bestPathCost = cost;
            chasePath = candidatePath;
          }
        }
        if (chasePath.length > 0) {
          schedule.route = chasePath;
          schedule.repeatRoute = false;
          villager.routeIndex = 0;
          villager.targetX = chasePath[0].x;
          villager.targetY = chasePath[0].y;
        } else {
          // A cornered chicken may not have a reachable approach point. Let the
          // child patrol a fresh reachable point while the next chase scan runs;
          // never leave the child frozen against the coop fence.
          schedule.route = undefined;
          villager.routeIndex = 0;
          if (!this.planNextWander(villager, schedule)) {
            villager.targetX = villager.x;
            villager.targetY = villager.y;
            villager.waitTimer = 0.18;
            this.playNpcAnimation(villager, "play");
          }
        }
        villager.chaseCooldown = chasePath.length > 0 ? 0.55 : 0.22;
      }
    }

    if (schedule.route && schedule.route.length > 0) {
      const wp = schedule.route[villager.routeIndex];
      if (!wp) {
        villager.routeIndex = 0;
        return;
      }
      villager.targetX = wp.x;
      villager.targetY = wp.y;
      wait = wp.wait;
      allowBlockedEscape = wp.escape === true;
      pose = wp.pose ?? "none";
      flip = wp.flip;
    }

    const dx = villager.targetX - villager.x;
    const dy = villager.targetY - villager.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 3) {
      // arrived
      if (schedule.wander && !schedule.chase && !schedule.route) {
        if (!this.planNextWander(villager, schedule)) {
          this.playNpcAnimation(villager, "play");
          villager.waitTimer = 0.35;
        }
        return;
      }
      const waypoint = schedule.route?.[villager.routeIndex];
      const atTaskStop = !schedule.route ||
        villager.routeIndex >= schedule.route.length - 1 ||
        !!waypoint?.wait || !!waypoint?.pose || !!waypoint?.almsResident;
      if (atTaskStop) {
        const action = waypoint?.animation ?? schedule.animation ?? this.animationForActivity(schedule.activityKey);
        this.playNpcAnimation(villager, action, pose === "work" ? !!flip : false);
      }
      villager.arrivedPose = pose;
      if (schedule.route) {
        const waypoint = schedule.route[villager.routeIndex];
        if (waypoint?.farmAction && this.npcFarming && (villager.id === "ma" || villager.id === "ko")) {
          if (waypoint.farmAction === "sell") {
            this.npcFarming.completeMarketSale(villager.id);
            this.playNpcAnimation(villager, "market", false);
          } else if (waypoint.farmTileIndex !== undefined) {
            this.npcFarming.completeTask(villager.id, waypoint.farmTileIndex, waypoint.farmAction);
            const action = waypoint.animation ?? "farm";
            this.playNpcAnimation(villager, action, false);
          }
        }
        if (villager.id === "monk" && waypoint?.almsResident) {
          // Start the resident's offering/homage scene, then let the monk wait
          // at this waypoint. The old code returned without setting a wait or
          // advancing routeIndex, so the monk retriggered Ko Aung's visit forever.
          this.startAlmsVisit(waypoint.almsResident);
          this.playNpcAnimation(villager, "alms", false);
          villager.waitTimer = Math.max(wait, 4.5);
          return;
        }
        if (wait > 0) villager.waitTimer = wait;
        else this.advanceRoute(villager, schedule);
      }
      return;
    }

    villager.arrivedPose = "none";
    const step = Math.min(distance, speed * dt);
    const nextX = villager.x + (dx / distance) * step;
    const nextY = villager.y + (dy / distance) * step;
    if (allowBlockedEscape || this.canNavigateTo(nextX, villager.y)) villager.x = nextX;
    if (allowBlockedEscape || this.canNavigateTo(villager.x, nextY)) villager.y = nextY;

    const remainingDistance = Phaser.Math.Distance.Between(villager.x, villager.y, villager.targetX, villager.targetY);
    const madeProgress = distance - remainingDistance > 0.1;
    if (madeProgress) {
      villager.stuckTimer = 0;
    } else {
      villager.stuckTimer += dt;
      villager.homePathRetryTimer -= dt;
      if (villager.stuckTimer >= 0.7 && villager.homePathRetryTimer <= 0) {
        if (villager.enteringHome && schedule.indoors) {
          const door = this.doorPosition(villager.id);
          const homePath = this.findHomePath(villager.x, villager.y, door);
          schedule.route = homePath;
        } else if (schedule.route && schedule.route.length > 0) {
          // Replan to the current semantic waypoint. Keep its wait/action data,
          // then leave the later route stops intact.
          const current = schedule.route[villager.routeIndex];
          const later = schedule.route.slice(villager.routeIndex + 1);
          const newPath = current ? this.findWalkablePath(villager.x, villager.y, current.x, current.y) : [];
          if (newPath.length > 0 && current) {
            const endIndex = newPath.length - 1;
            newPath[endIndex] = { ...newPath[endIndex], ...current, x: newPath[endIndex].x, y: newPath[endIndex].y };
            schedule.route = [...newPath, ...later];
          }
        } else {
          // A free-roaming kid may have picked a blocked random/chase target.
          const detour = this.findWalkablePath(villager.x, villager.y, villager.targetX, villager.targetY);
          if (detour.length > 0) {
            schedule.route = detour;
            schedule.repeatRoute = false;
          }
        }
        villager.routeIndex = 0;
        villager.waitTimer = 0;
        if (schedule.route && schedule.route.length > 0) {
          villager.targetX = schedule.route[0].x;
          villager.targetY = schedule.route[0].y;
        }
        villager.homePathRetryTimer = 0.9;
        villager.stuckTimer = 0;
      }
    }

    this.playWalkAnimation(villager, dx, dy);
    villager.sprite.anims.timeScale = fps / 8;

    villager.container.setPosition(villager.x, villager.y);
    villager.container.setDepth(villager.y + 30);
  }

  getKidPosition(): { x: number; y: number } | null {
    const kid = this.villagers.find(v => v.id === "kid");
    if (!kid || !kid.container.visible || kid.schedule?.chase !== true) return null;
    return { x: kid.x, y: kid.y };
  }

  private getNearestVillager(playerX: number, playerY: number, maxDistance = 75): Villager | null {
    let nearest: Villager | null = null;
    let shortestDistance = maxDistance;

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
    villager.speechText.setVisible(false);
    villager.taskIcon.setVisible(false);
    this.playNpcAnimation(villager, "talk", false);
    villager.taskIcon.setVisible(false);
    this.dialogueIndex = 0;
    this.scene.events.emit("sound-effect", { name: "talk", x: villager.x, y: villager.y, maxDistance: 190 });
    this.speakerText.setText(this.language.t(NAME_KEYS[villager.id]));
    this.speakerPortrait.setTexture(PORTRAIT_KEYS[villager.id]);
    this.ui.open("dialogue");
    this.showDialogue();
  }

  private showDialogue(): void {
    if (!this.activeVillager) return;
    const key = `dialogue.${this.activeVillager.id}.${this.dialogueIndex}`;
    this.dialogueText.setText(this.language.t(key));
  }

  private closeDialogue = (): void => {
    const previousVillager = this.activeVillager;
    this.isTalking = false;
    this.activeVillager = null;
    if (previousVillager?.schedule) {
      this.playNpcAnimation(previousVillager, this.animationForActivity(previousVillager.activityKey));
      previousVillager.taskIcon.setVisible(false);
    }
    this.ui.close("dialogue");
    this.talkKey.reset();
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

  canMobileTalk(playerX: number, playerY: number): boolean {
    return !this.isTalking && !this.ui.hasActiveModal() && this.getNearestVillager(playerX, playerY) !== null;
  }

  getSaveData() {
    return {
      elapsedGameMinutes: Math.max(0, Math.floor(
        (this.scene.time.now - this.clockStartTime) / this.gameMinuteDuration
      )),
      npcFarms: this.npcFarming?.getSaveData()
    };
  }

  loadSaveData(data: { elapsedGameMinutes: number; npcFarms?: ReturnType<NpcFarmingSystem["getSaveData"]> }): void {
    const elapsed = Math.max(0, Math.floor(Number(data.elapsedGameMinutes) || 0));
    this.clockStartTime = this.scene.time.now - elapsed * this.gameMinuteDuration;
    this.npcFarming?.loadSaveData(data.npcFarms);
    this.lastClockLabel = "";
    this.updateClockAndSchedules();

    for (const villager of this.villagers) {
      villager.container.setPosition(villager.x, villager.y);
      villager.container.setDepth(villager.y + 30);
    }
  }

  update(playerX: number, playerY: number): void {
    this.updateClockAndSchedules();

    const dt = Math.min(this.scene.game.loop.delta, 50) / 1000;
    for (const villager of this.villagers) {
      if (!this.isTalking || this.activeVillager !== villager) {
        this.moveVillager(villager, dt);
      } // Active dialogue NPC remains stationary and plays its talk animation.
      villager.promptText.setVisible(false);

      // Name, activity and random remarks appear only near the player.
      const distance = Phaser.Math.Distance.Between(playerX, playerY, villager.x, villager.y);
      const near = villager.container.visible && distance < 112;
      const inSpeechRange = villager.container.visible && distance < 96;
      const canShowAmbient = inSpeechRange && !this.isTalking && villager.almsState === "none";
      const enteringSpeechRange = canShowAmbient && !villager.wasPlayerNear;
      if (enteringSpeechRange) this.showAmbientSpeech(villager);

      // Ambient speech stays visible for as long as the player remains close.
      // It disappears only after leaving the proximity radius (or when a full
      // E-key dialogue/alms interaction takes over). Re-entering chooses a new line.
      if (canShowAmbient) {
        villager.speechText.setVisible(true);
      } else {
        villager.speechText.setVisible(false);
      }
      villager.wasPlayerNear = canShowAmbient;
      villager.nameText.setAlpha(Phaser.Math.Linear(villager.nameText.alpha, near ? 1 : 0, 0.2));
      villager.activityText.setAlpha(Phaser.Math.Linear(villager.activityText.alpha, near ? 1 : 0, 0.2));
      if (!near || !villager.currentAnimationKey.includes("-task-")) {
        villager.taskIcon.setVisible(false);
      } else if (villager.container.visible && !this.isTalking && villager.almsState === "none") {
        villager.taskIcon.setVisible(true);
      }
    }
    for (const label of this.houseLabels) {
      const near = Phaser.Math.Distance.Between(playerX, playerY, label.x, label.y) < 170;
      label.text.setAlpha(Phaser.Math.Linear(label.text.alpha, near ? 1 : 0, 0.15));
    }

    if (this.isTalking) {
      if (Phaser.Input.Keyboard.JustDown(this.talkKey)) this.nextDialogue();
      return;
    }

    const nearest = this.getNearestVillager(playerX, playerY);
    if (nearest) {
      nearest.promptText.setVisible(!this.touchMode);
      if (Phaser.Input.Keyboard.JustDown(this.talkKey)) {
        this.openDialogue(nearest);
      }
    }
  }
}
