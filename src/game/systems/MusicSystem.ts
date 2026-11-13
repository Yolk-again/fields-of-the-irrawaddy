import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { getGraphicsQuality, saveGraphicsQuality } from "./GraphicsQuality";
import type { GraphicsQuality } from "./GraphicsQuality";
import { createRedCloseButton, modalClosePosition, modalPanel, pixelPanel, uiFontSize } from "../ui/PixelUI";

/**
 * Original Fields of the Irrawaddy audio system.
 * Background tracks are original, long-form farming-sim themes rendered with
 * sampled General MIDI instrument timbres: acoustic guitar arpeggios, flute,
 * violin, music box, soft bass and restrained accompaniment. The arrangement
 * takes broad inspiration from classic Harvest Moon-era cozy game music, but
 * uses newly composed melodies. Sound effects combine custom foley textures
 * and sampled-instrument accents. Separate buses preserve independent volume
 * controls for music and sound effects.
 */
const LEGACY_MUTE_KEY = "irrawaddy-music-muted";
const MUSIC_VOLUME_KEY = "irrawaddy-background-music-volume";
const EFFECTS_VOLUME_KEY = "irrawaddy-sound-effects-volume";

type DayPhase = "dawn" | "day" | "dusk" | "night";
interface SoundEffectEvent { name: string; x?: number; y?: number; maxDistance?: number; }
const MUSIC_PHASES: DayPhase[] = ["dawn", "day", "dusk", "night"];
const EFFECT_NAMES = [
  "hoe", "plant", "water", "harvest", "dead", "request", "buy", "sell",
  "talk", "error", "cast", "bite", "catch", "miss", "cook", "eat", "sleep", "footstep", "chicken"
];

const EFFECT_BASE_GAIN: Record<string, number> = {
  hoe: 0.48, plant: 0.40, water: 0.44, harvest: 0.46, dead: 0.36,
  request: 0.34, buy: 0.36, sell: 0.38, talk: 0.28, error: 0.32,
  cast: 0.42, bite: 0.36, catch: 0.44, miss: 0.30,
  cook: 0.38, eat: 0.30, sleep: 0.30, footstep: 0.20, chicken: 0.24
};

const EFFECT_OUTPUT_SCALE = 0.62;
const EFFECT_MAX_DURATION: Record<string, number> = {
  hoe: 0.34, plant: 0.22, water: 0.28, harvest: 0.30, dead: 0.26,
  request: 0.30, buy: 0.16, sell: 0.18, talk: 0.34, error: 0.16,
  cast: 0.28, bite: 0.14, catch: 0.32, miss: 0.18,
  cook: 0.34, eat: 0.20, sleep: 0.42, footstep: 0.10, chicken: 0.16
};

export class MusicSystem {
  private scene: Phaser.Scene;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  // 30% is the first-run starting point. readStoredVolume preserves any later player choice.
  private musicVolume = 0.3;
  private effectsVolume = 0.3;
  private started = false;
  private audioReady = false;
  private audioLoadPromise: Promise<void> | null = null;
  private pendingEffects: SoundEffectEvent[] = [];
  private listenerX = 320;
  private listenerY = 330;
  private musicBuffers = new Map<DayPhase, AudioBuffer>();
  private cutsceneMusicBuffer: AudioBuffer | null = null;
  private effectBuffers = new Map<string, AudioBuffer>();
  private currentMusicSource: AudioBufferSourceNode | null = null;
  private currentMusicGain: GainNode | null = null;
  private currentMusicPhase: DayPhase | null = null;
  private cutsceneMusicSource: AudioBufferSourceNode | null = null;
  private cutsceneMusicGain: GainNode | null = null;
  private cutsceneMusicRequested = false;
  private playbackMode: "profile" | "cutscene" | "world" = "profile";
  private ui: ModalUIManager;
  private settingsPanel!: Phaser.GameObjects.Container;
  private settingsCloseButton!: Phaser.GameObjects.Container;
  private settingsTitle!: Phaser.GameObjects.Text;
  private musicLabel!: Phaser.GameObjects.Text;
  private effectsLabel!: Phaser.GameObjects.Text;
  private musicValueText!: Phaser.GameObjects.Text;
  private effectsValueText!: Phaser.GameObjects.Text;
  private settingsFooter!: Phaser.GameObjects.Text;
  private qualityLabel!: Phaser.GameObjects.Text;
  private qualityButtons: { quality: GraphicsQuality; button: Phaser.GameObjects.Container; plate: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private musicFill!: Phaser.GameObjects.Rectangle;
  private effectsFill!: Phaser.GameObjects.Rectangle;
  private musicKnob!: Phaser.GameObjects.Arc;
  private effectsKnob!: Phaser.GameObjects.Arc;
  private activeSlider: "music" | "effects" | null = null;
  private graphicsQuality: GraphicsQuality = getGraphicsQuality();
  private phase: DayPhase = "day";
  private language: LanguageSystem;
  private readonly musicVolumeStorageKey: string;
  private readonly effectsVolumeStorageKey: string;
  private readonly activeSources = new Set<AudioBufferSourceNode>();
  private unlockHandler: (() => void) | null = null;
  private disposed = false;

  constructor(
    scene: Phaser.Scene,
    ui: ModalUIManager,
    language: LanguageSystem,
    _mobileLayout = false,
    saveSlot = 1,
    loadExistingSave = false
  ) {
    this.scene = scene;
    this.ui = ui;
    this.language = language;
    // New-game profile setup stays silent. Existing worlds may start their day theme after audio unlock.
    this.playbackMode = loadExistingSave ? "world" : "profile";
    const safeSlot = Number.isInteger(saveSlot) && saveSlot >= 1 && saveSlot <= 3 ? saveSlot : 1;
    this.musicVolumeStorageKey = `${MUSIC_VOLUME_KEY}-slot-${safeSlot}`;
    this.effectsVolumeStorageKey = `${EFFECTS_VOLUME_KEY}-slot-${safeSlot}`;

    try {
      const legacyMuted = window.localStorage.getItem(LEGACY_MUTE_KEY) === "1";
      if (loadExistingSave) {
        // Existing worlds keep their own volume choices. Older saves migrate the previous global values once.
        this.musicVolume = legacyMuted ? 0 : this.readStoredVolume(
          this.musicVolumeStorageKey,
          this.readStoredVolume(MUSIC_VOLUME_KEY, 0.3)
        );
        this.effectsVolume = legacyMuted ? 0 : this.readStoredVolume(
          this.effectsVolumeStorageKey,
          this.readStoredVolume(EFFECTS_VOLUME_KEY, 0.3)
        );
        this.saveVolume(this.musicVolumeStorageKey, this.musicVolume);
        this.saveVolume(this.effectsVolumeStorageKey, this.effectsVolume);
      } else {
        // Every new world starts at 30%, including when it overwrites an earlier slot.
        this.musicVolume = 0.3;
        this.effectsVolume = 0.3;
        this.saveVolume(this.musicVolumeStorageKey, this.musicVolume);
        this.saveVolume(this.effectsVolumeStorageKey, this.effectsVolume);
      }
      if (legacyMuted) window.localStorage.removeItem(LEGACY_MUTE_KEY);
    } catch {
      this.musicVolume = 0.3;
      this.effectsVolume = 0.3;
    }

    this.createSettingsPanel(ui);
    this.scene.events.on("sound-effect", this.handleSoundEffect, this);
    this.scene.input.on("pointerdown", this.handleSliderPointerDown, this);
    this.scene.input.on("pointermove", this.handleSliderPointerMove, this);
    this.scene.input.on("pointerup", this.handleSliderPointerUp, this);

    const unlock = (): void => {
      if (this.musicVolume > 0 || this.effectsVolume > 0) this.start();
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      this.unlockHandler = null;
    };
    this.unlockHandler = unlock;
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  private readStoredVolume(key: string, fallback: number): number {
    const stored = window.localStorage.getItem(key);
    if (stored === null || stored.trim() === "") return fallback;
    const value = Number(stored);
    return Number.isFinite(value) ? Phaser.Math.Clamp(value, 0, 1) : fallback;
  }

  private saveVolume(key: string, value: number): void {
    try {
      window.localStorage.setItem(key, value.toFixed(2));
    } catch {
      // Keep the in-session setting even when browser storage is unavailable.
    }
  }

  private createSettingsPanel(ui: ModalUIManager): void {
    this.settingsPanel = this.scene.add.container(0, 0).setScrollFactor(0);
    const background = modalPanel(this.scene, 320, 180, 420, 286);
    const divider = this.scene.add.rectangle(320, 87, 380, 2, 0x9b7047, 0.9);
    this.settingsTitle = this.scene.add.text(320, 63, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(16), color: "#e6c47e", fontStyle: "bold"
    }).setOrigin(0.5);

    this.musicLabel = this.scene.add.text(170, 108, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(10), color: "#fff1cf", fontStyle: "bold"
    }).setOrigin(0, 0.5);
    this.musicValueText = this.scene.add.text(475, 108, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(10), color: "#e6c47e", fontStyle: "bold"
    }).setOrigin(1, 0.5);
    this.effectsLabel = this.scene.add.text(170, 163, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(10), color: "#fff1cf", fontStyle: "bold"
    }).setOrigin(0, 0.5);
    this.effectsValueText = this.scene.add.text(475, 163, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(10), color: "#e6c47e", fontStyle: "bold"
    }).setOrigin(1, 0.5);

    const musicTrack = this.scene.add.rectangle(320, 132, 230, 8, 0x241a14, 1);
    const effectsTrack = this.scene.add.rectangle(320, 187, 230, 8, 0x241a14, 1);
    this.musicFill = this.scene.add.rectangle(205, 132, 230, 8, 0x88a85f, 1).setOrigin(0, 0.5);
    this.effectsFill = this.scene.add.rectangle(205, 187, 230, 8, 0x88a85f, 1).setOrigin(0, 0.5);
    this.musicKnob = this.scene.add.circle(435, 132, 7, 0xe6c47e, 1).setStrokeStyle(2, 0x2a1a14);
    this.effectsKnob = this.scene.add.circle(435, 187, 7, 0xe6c47e, 1).setStrokeStyle(2, 0x2a1a14);

    this.qualityLabel = this.scene.add.text(170, 220, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(10), color: "#fff1cf", fontStyle: "bold"
    }).setOrigin(0, 0.5);
    this.qualityButtons = ([
      { quality: "high", x: 235 },
      { quality: "balanced", x: 320 },
      { quality: "low", x: 405 }
    ] as const).map(({ quality, x }) => {
      const button = this.scene.add.container(x, 248).setScrollFactor(0);
      const plate = this.scene.add.rectangle(0, 0, 78, 28, 0x3a4a32, 1).setStrokeStyle(1, 0x9b7047);
      const label = this.scene.add.text(0, 0, "", {
        fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(9), color: "#e7dfc8", fontStyle: "bold"
      }).setOrigin(0.5);
      button.add([plate, label]);
      button.setSize(78, 28);
      button.setInteractive(new Phaser.Geom.Rectangle(-39, -14, 78, 28), Phaser.Geom.Rectangle.Contains);
      button.on("pointerdown", () => this.selectGraphicsQuality(quality));
      button.on("pointerover", () => plate.setStrokeStyle(2, 0xe6c47e));
      button.on("pointerout", () => this.updateQualityVisuals());
      return { quality, button, plate, label };
    });

    this.settingsFooter = this.scene.add.text(320, 298, "", {
      fontFamily: this.language.getFontFamily(), fontSize: uiFontSize(7), color: "#d7e6c5", align: "center", wordWrap: { width: 360 }
    }).setOrigin(0.5);
    const closePosition = modalClosePosition(320, 180, 420, 286);
    this.settingsCloseButton = createRedCloseButton(this.scene, closePosition.x, closePosition.y);

    this.settingsPanel.add([
      background, divider, this.settingsTitle, this.musicLabel, this.musicValueText,
      musicTrack, this.musicFill, this.musicKnob,
      this.effectsLabel, this.effectsValueText, effectsTrack,
      this.effectsFill, this.effectsKnob, this.qualityLabel,
      ...this.qualityButtons.map(item => item.button),
      this.settingsFooter, this.settingsCloseButton
    ]);
    ui.registerPanel("audio", this.settingsPanel, 420, () => {
      this.activeSlider = null;
    }, this.settingsCloseButton);
    this.language.onChange(() => this.updateSettingsText());
    this.updateSettingsText();
    this.updateSliderVisuals();
    this.updateQualityVisuals();
  }

  private updateSettingsText(): void {
    const font = this.language.getFontFamily();
    this.settingsTitle.setText(this.language.t("settings.title"));
    this.musicLabel.setText(this.language.getLanguage() === "my" ? "နောက်ခံတေးဂီတ" : "BACKGROUND MUSIC");
    this.effectsLabel.setText(this.language.getLanguage() === "my" ? "အသံအကျိုးသက်ရောက်မှု" : "SOUND EFFECTS");
    this.qualityLabel.setText(this.language.t("settings.graphicsQuality"));
    this.settingsFooter.setText(this.language.t("settings.qualityHint"));
    for (const text of [this.settingsTitle, this.musicLabel, this.effectsLabel, this.musicValueText, this.effectsValueText, this.qualityLabel, this.settingsFooter, ...this.qualityButtons.map(item => item.label)]) {
      text.setFontFamily(font);
    }
    this.updateQualityVisuals();
  }

  private updateQualityVisuals(): void {
    const selected = this.graphicsQuality;
    const labels: Record<GraphicsQuality, string> = {
      high: this.language.t("settings.qualityHigh"),
      balanced: this.language.t("settings.qualityBalanced"),
      low: this.language.t("settings.qualityLow")
    };
    for (const item of this.qualityButtons) {
      const active = item.quality === selected;
      item.plate.setFillStyle(active ? 0x8b7442 : 0x3a4a32, 1);
      item.plate.setStrokeStyle(active ? 2 : 1, active ? 0xffd77c : 0x9b7047);
      item.label.setText(labels[item.quality]);
      item.label.setColor(active ? "#fff5d6" : "#e7dfc8");
    }
  }

  private selectGraphicsQuality(quality: GraphicsQuality): void {
    this.graphicsQuality = quality;
    saveGraphicsQuality(quality);
    this.scene.events.emit("foi-graphics-quality-change", quality);
    this.updateQualityVisuals();
    this.settingsFooter.setText(this.language.t("settings.qualityHint"));
  }

  private updateSliderVisuals(): void {
    const musicWidth = 230 * this.musicVolume;
    const effectsWidth = 230 * this.effectsVolume;
    this.musicFill.setSize(Math.max(0.01, musicWidth), 8).setVisible(this.musicVolume > 0);
    this.effectsFill.setSize(Math.max(0.01, effectsWidth), 8).setVisible(this.effectsVolume > 0);
    this.musicKnob.setX(205 + musicWidth);
    this.effectsKnob.setX(205 + effectsWidth);
    this.musicValueText.setText(`${Math.round(this.musicVolume * 100)}%`);
    this.effectsValueText.setText(`${Math.round(this.effectsVolume * 100)}%`);
  }

  private setMusicVolume(value: number): void {
    if (this.disposed) return;
    this.musicVolume = Phaser.Math.Clamp(value, 0, 1);
    this.saveVolume(this.musicVolumeStorageKey, this.musicVolume);
    this.updateSliderVisuals();
    this.applyVolume();
    if (this.musicVolume > 0) {
      if (!this.started) this.start();
      else if (this.audioReady && this.playbackMode === "cutscene" && this.cutsceneMusicBuffer) this.playCutsceneMusicTrack();
      else if (this.audioReady && this.playbackMode === "world" && (!this.currentMusicSource || this.currentMusicPhase !== this.phase)) {
        this.playMusicTrack(this.phase);
      }
    }
  }

  private setEffectsVolume(value: number): void {
    if (this.disposed) return;
    this.effectsVolume = Phaser.Math.Clamp(value, 0, 1);
    this.saveVolume(this.effectsVolumeStorageKey, this.effectsVolume);
    this.updateSliderVisuals();
    this.applyVolume();
    if (this.effectsVolume > 0 && !this.started) this.start();
  }

  private handleSliderPointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.ui.isOpen("audio")) return;

    const x = pointer.x;
    const y = pointer.y;
    const onTrack = x >= 188 && x <= 452;

    if (onTrack && y >= 118 && y <= 146) {
      this.activeSlider = "music";
      this.updateSliderFromPointer(pointer);
    } else if (onTrack && y >= 173 && y <= 201) {
      this.activeSlider = "effects";
      this.updateSliderFromPointer(pointer);
    } else {
      this.activeSlider = null;
    }
  };

  private updateSliderFromPointer(pointer: Phaser.Input.Pointer): void {
    const value = Phaser.Math.Clamp((pointer.x - 205) / 230, 0, 1);
    if (this.activeSlider === "music") this.setMusicVolume(value);
    else if (this.activeSlider === "effects") this.setEffectsVolume(value);
  }

  private handleSliderPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.activeSlider || !pointer.isDown || !this.ui.isOpen("audio")) return;
    this.updateSliderFromPointer(pointer);
  };

  private handleSliderPointerUp = (): void => {
    this.activeSlider = null;
  };

  private openSettings(): void {
    if (this.ui.isOpen("audio")) {
      this.ui.close("audio");
      return;
    }
    if (this.ui.hasActiveModal()) return;
    this.updateSettingsText();
    this.updateSliderVisuals();
    this.ui.open("audio");
  }

  /** Opens audio settings from a mobile control. */
  mobileToggle(): void { this.openSettings(); }

  private applyVolume(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.musicBus) {
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setTargetAtTime(this.musicVolume, now, 0.025);
    }
    if (this.effectsBus) {
      this.effectsBus.gain.cancelScheduledValues(now);
      this.effectsBus.gain.setTargetAtTime(this.effectsVolume, now, 0.025);
    }
  }

  private start(): void {
    if (this.disposed) return;
    if (this.started) {
      if (this.ctx?.state === "suspended") {
        void this.ctx.resume().catch(() => undefined);
      }
      this.applyVolume();
      if (!this.audioLoadPromise) this.audioLoadPromise = this.loadAudioAssets();
      if (this.audioReady && this.musicVolume > 0) {
        if (this.playbackMode === "cutscene" && this.cutsceneMusicBuffer) {
          this.playCutsceneMusicTrack();
        } else if (this.playbackMode === "world" && (!this.currentMusicSource || this.currentMusicPhase !== this.phase)) {
          this.playMusicTrack(this.phase);
        }
      }
      return;
    }

    const AudioCtor = window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    this.ctx = new AudioCtor({ latencyHint: "interactive" });
    this.started = true;
    this.master = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.effectsBus = this.ctx.createGain();
    this.master.gain.value = 0.84;
    this.musicBus.gain.value = this.musicVolume;
    this.effectsBus.gain.value = this.effectsVolume;
    this.musicBus.connect(this.master);
    this.effectsBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    void this.ctx.resume().catch(() => undefined);
    this.audioLoadPromise = this.loadAudioAssets();
  }

  private async loadAudioAssets(): Promise<void> {
    const context = this.ctx;
    if (!context) return;

    const decode = async (relativePath: string): Promise<AudioBuffer | null> => {
      try {
        const base = import.meta.env.BASE_URL;
        const response = await fetch(`${base}audio/${relativePath}`);
        if (!response.ok) return null;
        const bytes = await response.arrayBuffer();
        if (this.ctx !== context || context.state === "closed") return null;
        return await context.decodeAudioData(bytes);
      } catch {
        return null;
      }
    };

    const musicResultsPromise = Promise.all(MUSIC_PHASES.map(async (phase) => {
      const buffer = await decode(`music/${phase}.ogg`);
      return [phase, buffer] as const;
    }));
    const cutsceneMusicPromise = decode("music/cutscene.ogg");
    const effectResultsPromise = Promise.all(EFFECT_NAMES.map(async (name) => {
      const buffer = await decode(`effects/${name}.ogg`);
      return [name, buffer] as const;
    }));
    const [musicResults, cutsceneMusic, effectResults] = await Promise.all([
      musicResultsPromise,
      cutsceneMusicPromise,
      effectResultsPromise
    ]);

    if (this.disposed || this.ctx !== context || context.state === "closed") return;
    for (const [phase, buffer] of musicResults) {
      if (buffer) this.musicBuffers.set(phase, buffer);
    }
    for (const [name, buffer] of effectResults) {
      if (buffer) this.effectBuffers.set(name, buffer);
    }
    this.cutsceneMusicBuffer = cutsceneMusic;
    this.audioReady = true;

    if (this.musicVolume > 0) {
      if (this.playbackMode === "cutscene" && this.cutsceneMusicBuffer) this.playCutsceneMusicTrack();
      else if (this.playbackMode === "world") this.playMusicTrack(this.phase);
    }
    const queued = this.pendingEffects.splice(0);
    for (const effect of queued) this.playSoundEffect(effect);
  }

  /** Start the original, softly layered story theme while the opening dialogue is shown. */
  startOpeningCutsceneAudio(): void {
    if (this.disposed) return;
    this.playbackMode = "cutscene";
    this.cutsceneMusicRequested = true;
    if (!this.started) this.start();
    if (this.ctx?.state === "suspended") void this.ctx.resume().catch(() => undefined);
    if (this.audioReady && this.musicVolume > 0 && this.cutsceneMusicBuffer) this.playCutsceneMusicTrack();
  }

  /** A restrained RPG-style dialogue blip, throttled by the cutscene typewriter. */
  playCutsceneVoice(): void {
    if (this.disposed) return;
    if (!this.started) this.start();
    // Do not queue early typewriter blips; a delayed burst is worse than a missed first syllable.
    if (!this.audioReady || !this.effectBuffers.has("talk")) return;
    this.playSoundEffect({ name: "talk" });
  }

  /** Fade back to the current time-of-day theme when the intro ends. */
  stopOpeningCutsceneAudio(): void {
    if (this.disposed) return;
    this.cutsceneMusicRequested = false;
    this.playbackMode = "world";
    const source = this.cutsceneMusicSource;
    const gain = this.cutsceneMusicGain;
    if (!source || !gain || !this.ctx || this.ctx.state === "closed") {
      if (this.audioReady && this.musicVolume > 0) this.playMusicTrack(this.phase);
      return;
    }

    const context = this.ctx;
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.45);
    source.onended = () => {
      if (this.cutsceneMusicSource !== source) return;
      this.cutsceneMusicSource = null;
      this.cutsceneMusicGain = null;
      if (!this.cutsceneMusicRequested && this.musicVolume > 0) this.playMusicTrack(this.phase);
    };
    try { source.stop(now + 0.48); } catch { /* Source may already be stopping. */ }
  }

  private playCutsceneMusicTrack(): void {
    if (this.disposed || this.playbackMode !== "cutscene" || !this.ctx || !this.musicBus || !this.cutsceneMusicBuffer || this.ctx.state === "closed") return;
    if (this.cutsceneMusicSource) return;

    const now = this.ctx.currentTime;
    const oldSource = this.currentMusicSource;
    const oldGain = this.currentMusicGain;
    if (oldSource && oldGain) {
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setValueAtTime(Math.max(0.0001, oldGain.gain.value), now);
      oldGain.gain.linearRampToValueAtTime(0.0001, now + 0.55);
      try { oldSource.stop(now + 0.58); } catch { /* Ignore an already stopped source. */ }
    }
    this.currentMusicSource = null;
    this.currentMusicGain = null;
    this.currentMusicPhase = null;

    const source = this.trackSource(this.ctx.createBufferSource());
    const gain = this.ctx.createGain();
    source.buffer = this.cutsceneMusicBuffer;
    source.loop = true;
    source.connect(gain).connect(this.musicBus);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.72, now + 1.8);
    this.cutsceneMusicSource = source;
    this.cutsceneMusicGain = gain;
    source.start(now);
  }

  private playMusicTrack(phase: DayPhase): void {
    if (this.disposed || this.playbackMode !== "world" || this.cutsceneMusicRequested) return;
    if (!this.ctx || !this.musicBus || this.ctx.state === "closed") return;
    const buffer = this.musicBuffers.get(phase);
    if (!buffer) return;
    if (this.currentMusicPhase === phase && this.currentMusicSource) return;

    const now = this.ctx.currentTime;
    const source = this.trackSource(this.ctx.createBufferSource());
    const trackGain = this.ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    source.connect(trackGain).connect(this.musicBus);
    trackGain.gain.setValueAtTime(0.0001, now);
    trackGain.gain.linearRampToValueAtTime(0.82, now + 2.6);

    const oldSource = this.currentMusicSource;
    const oldGain = this.currentMusicGain;
    if (oldSource && oldGain) {
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setValueAtTime(Math.max(0.0001, oldGain.gain.value), now);
      oldGain.gain.linearRampToValueAtTime(0.0001, now + 2.6);
      try {
        oldSource.stop(now + 2.72);
      } catch {
        // Ignore a source that has already been stopped by a previous fade.
      }
    }

    this.currentMusicSource = source;
    this.currentMusicGain = trackGain;
    this.currentMusicPhase = phase;
    source.start(now);
  }

  /** Called by the village clock; phase changes crossfade over a few seconds. */
  setTimeOfDayHours(hour: number): void {
    const timeOfDayHours = ((hour % 24) + 24) % 24;
    const nextPhase: DayPhase = timeOfDayHours < 5.5
      ? "night"
      : timeOfDayHours < 7
        ? "dawn"
        : timeOfDayHours < 17
          ? "day"
          : timeOfDayHours < 19
            ? "dusk"
            : "night";

    if (nextPhase === this.phase) return;
    this.phase = nextPhase;
    if (this.playbackMode === "world" && this.musicVolume > 0 && this.audioReady) this.playMusicTrack(nextPhase);
  }

  /** Update the listener anchor every frame so world sounds fade with player distance. */
  setListenerPosition(x: number, y: number): void {
    if (Number.isFinite(x)) this.listenerX = x;
    if (Number.isFinite(y)) this.listenerY = y;
  }

  private handleSoundEffect = (payload: string | SoundEffectEvent): void => {
    const event = typeof payload === "string" ? { name: payload } : payload;
    if (!event || typeof event.name !== "string") return;
    this.playSoundEffect(event);
  };

  private playSoundEffect(event: SoundEffectEvent): void {
    if (this.disposed || this.effectsVolume <= 0) return;
    if (!this.started) this.start();
    if (!this.ctx || !this.effectsBus || this.ctx.state === "closed") return;

    const effect = event.name;
    const buffer = this.effectBuffers.get(effect);
    if (!buffer) {
      if (!this.audioReady && this.pendingEffects.length < 5) this.pendingEffects.push({ ...event });
      return;
    }

    let attenuation = 1;
    let pan = (Math.random() - 0.5) * 0.06;
    if (Number.isFinite(event.x) && Number.isFinite(event.y)) {
      const dx = (event.x as number) - this.listenerX;
      const dy = (event.y as number) - this.listenerY;
      const distance = Math.hypot(dx, dy);
      const maxDistance = Math.max(48, event.maxDistance ?? 220);
      if (distance >= maxDistance) return;
      const proximity = Phaser.Math.Clamp(1 - distance / maxDistance, 0, 1);
      // A gentle exponential roll-off keeps nearby foley clear and distant sounds unobtrusive.
      attenuation = Math.pow(proximity, 1.25);
      pan = Phaser.Math.Clamp(dx / maxDistance, -1, 1) * 0.82 + pan;
    }

    const source = this.trackSource(this.ctx.createBufferSource());
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();
    const baseGain = EFFECT_BASE_GAIN[effect] ?? 0.58;
    source.buffer = buffer;
    source.playbackRate.value = 0.975 + Math.random() * 0.05;
    const now = this.ctx.currentTime;
    const effectGain = baseGain * EFFECT_OUTPUT_SCALE * attenuation * (0.94 + Math.random() * 0.12);
    const duration = Math.min(buffer.duration, EFFECT_MAX_DURATION[effect] ?? 0.28);
    const stopAt = now + Math.max(0.08, duration);
    gain.gain.setValueAtTime(Math.max(0.0001, effectGain), now);
    gain.gain.linearRampToValueAtTime(0.0001, Math.max(now + 0.035, stopAt - 0.045));
    panner.pan.value = Phaser.Math.Clamp(pan, -1, 1);
    source.connect(gain).connect(panner).connect(this.effectsBus);
    source.start(now);
    source.stop(stopAt);
  }
  private trackSource(source: AudioBufferSourceNode): AudioBufferSourceNode {
    this.activeSources.add(source);
    source.addEventListener("ended", () => {
      this.activeSources.delete(source);
      try { source.disconnect(); } catch { /* The source may already be disconnected. */ }
    }, { once: true });
    return source;
  }

  /** Stop every active and crossfading source immediately when this save slot closes. */
  shutdown(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pendingEffects.length = 0;
    this.cutsceneMusicRequested = false;
    this.activeSlider = null;

    this.scene.events.off("sound-effect", this.handleSoundEffect, this);
    this.scene.input.off("pointerdown", this.handleSliderPointerDown, this);
    this.scene.input.off("pointermove", this.handleSliderPointerMove, this);
    this.scene.input.off("pointerup", this.handleSliderPointerUp, this);
    if (this.unlockHandler) {
      window.removeEventListener("pointerdown", this.unlockHandler, true);
      window.removeEventListener("keydown", this.unlockHandler, true);
      this.unlockHandler = null;
    }

    const context = this.ctx;
    if (context && context.state !== "closed") {
      const now = context.currentTime;
      try {
        if (this.master) {
          this.master.gain.cancelScheduledValues(now);
          this.master.gain.setValueAtTime(0, now);
        }
      } catch { /* Closing the context is still sufficient if the gain node has ended. */ }
      for (const source of this.activeSources) {
        try { source.stop(now); } catch { /* Source may have already ended. */ }
        try { source.disconnect(); } catch { /* Ignore an already disconnected source. */ }
      }
      this.activeSources.clear();
      try { this.musicBus?.disconnect(); } catch { /* Ignore teardown races. */ }
      try { this.effectsBus?.disconnect(); } catch { /* Ignore teardown races. */ }
      try { this.master?.disconnect(); } catch { /* Ignore teardown races. */ }
      void context.close().catch(() => undefined);
    }

    this.currentMusicSource = null;
    this.currentMusicGain = null;
    this.currentMusicPhase = null;
    this.cutsceneMusicSource = null;
    this.cutsceneMusicGain = null;
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.effectsBus = null;
    this.audioReady = false;
    this.started = false;
    this.audioLoadPromise = null;
  }

}
