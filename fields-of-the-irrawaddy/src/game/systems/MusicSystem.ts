import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { createRedCloseButton, modalClosePosition, modalPanel, pixelPanel } from "../ui/PixelUI";

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
  "talk", "error", "cast", "bite", "catch", "miss", "cook", "eat", "sleep", "footstep"
];

const EFFECT_BASE_GAIN: Record<string, number> = {
  hoe: 0.72, plant: 0.62, water: 0.72, harvest: 0.70, dead: 0.62,
  request: 0.55, buy: 0.62, sell: 0.65, talk: 0.40, error: 0.62,
  cast: 0.70, bite: 0.62, catch: 0.70, miss: 0.63,
  cook: 0.62, eat: 0.45, sleep: 0.48, footstep: 0.34
};

export class MusicSystem {
  private scene: Phaser.Scene;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private musicVolume = 1;
  private effectsVolume = 1;
  private started = false;
  private audioReady = false;
  private audioLoadPromise: Promise<void> | null = null;
  private pendingEffects: SoundEffectEvent[] = [];
  private listenerX = 320;
  private listenerY = 330;
  private musicBuffers = new Map<DayPhase, AudioBuffer>();
  private effectBuffers = new Map<string, AudioBuffer>();
  private currentMusicSource: AudioBufferSourceNode | null = null;
  private currentMusicGain: GainNode | null = null;
  private currentMusicPhase: DayPhase | null = null;
  private ui: ModalUIManager;
  private settingsPanel!: Phaser.GameObjects.Container;
  private settingsCloseButton!: Phaser.GameObjects.Container;
  private settingsTitle!: Phaser.GameObjects.Text;
  private musicLabel!: Phaser.GameObjects.Text;
  private effectsLabel!: Phaser.GameObjects.Text;
  private musicValueText!: Phaser.GameObjects.Text;
  private effectsValueText!: Phaser.GameObjects.Text;
  private settingsFooter!: Phaser.GameObjects.Text;
  private musicFill!: Phaser.GameObjects.Rectangle;
  private effectsFill!: Phaser.GameObjects.Rectangle;
  private musicKnob!: Phaser.GameObjects.Arc;
  private effectsKnob!: Phaser.GameObjects.Arc;
  private activeSlider: "music" | "effects" | null = null;
  private phase: DayPhase = "day";
  private button!: Phaser.GameObjects.Rectangle;
  private icon!: Phaser.GameObjects.Image;
  private tip!: Phaser.GameObjects.Text;
  private language: LanguageSystem;
  private headerControls: Phaser.GameObjects.GameObject[] = [];
  private mobileLayout: boolean;

  constructor(
    scene: Phaser.Scene,
    ui: ModalUIManager,
    language: LanguageSystem,
    mobileLayout = false
  ) {
    this.scene = scene;
    this.ui = ui;
    this.language = language;
    this.mobileLayout = mobileLayout;
    try {
      const legacyMuted = window.localStorage.getItem(LEGACY_MUTE_KEY) === "1";
      this.musicVolume = legacyMuted ? 0 : this.readStoredVolume(MUSIC_VOLUME_KEY, 1);
      this.effectsVolume = legacyMuted ? 0 : this.readStoredVolume(EFFECTS_VOLUME_KEY, 1);
      if (legacyMuted) {
        window.localStorage.setItem(MUSIC_VOLUME_KEY, "0");
        window.localStorage.setItem(EFFECTS_VOLUME_KEY, "0");
        window.localStorage.removeItem(LEGACY_MUTE_KEY);
      }
    } catch {
      this.musicVolume = 1;
      this.effectsVolume = 1;
    }

    this.createButton(ui);
    this.createSettingsPanel(ui);
    this.scene.events.on("sound-effect", this.handleSoundEffect, this);
    this.scene.input.on("pointerdown", this.handleSliderPointerDown, this);
    this.scene.input.on("pointermove", this.handleSliderPointerMove, this);
    this.scene.input.on("pointerup", this.handleSliderPointerUp, this);

    const unlock = (): void => {
      if (this.musicVolume > 0 || this.effectsVolume > 0) this.start();
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.events.off("sound-effect", this.handleSoundEffect, this);
      this.scene.input.off("pointerdown", this.handleSliderPointerDown, this);
      this.scene.input.off("pointermove", this.handleSliderPointerMove, this);
      this.scene.input.off("pointerup", this.handleSliderPointerUp, this);
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      try {
        this.currentMusicSource?.stop();
      } catch {
        // The source may already have finished during a crossfade.
      }
      void this.ctx?.close();
    });
  }

  private createButton(ui: ModalUIManager): void {
    const x = this.mobileLayout ? 580 : 594;
    const y = this.mobileLayout ? 24 : 22;
    const frameSize = this.mobileLayout ? 32 : 28;
    const hitSize = this.mobileLayout ? 38 : 28;
    const frame = pixelPanel(this.scene, x, y, frameSize, frameSize, { fill: 0x4a3324 }).setDepth(8500);
    this.icon = this.scene.add.image(x, y, "ui_icon_note")
      .setScrollFactor(0).setDepth(8501);
    this.button = this.scene.add.rectangle(x, y, hitSize, hitSize, 0xffffff, 0.001)
      .setScrollFactor(0).setDepth(8502)
      .setInteractive({ useHandCursor: true });
    this.tip = this.scene.add.text(x, y + 22, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#fff1cf",
      backgroundColor: "#2a1a14", padding: { x: 4, y: 2 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(8503).setVisible(false);
    this.language.onChange(() => this.refreshButton());

    this.button.on("pointerover", () => this.tip.setVisible(true));
    this.button.on("pointerout", () => this.tip.setVisible(false));
    this.button.on(this.mobileLayout ? "pointerdown" : "pointerup", () => this.openSettings());
    ui.registerHud(frame, this.icon, this.button, this.tip);
    this.headerControls = [frame, this.icon, this.button, this.tip];
    this.refreshButton();
  }

  private refreshButton(): void {
    this.icon.setTexture("ui_icon_note");
    this.tip.setText(this.language.getLanguage() === "my" ? "အသံချိန်ညှိရန်" : "AUDIO SETTINGS");
    this.tip.setFontFamily(this.language.getFontFamily());
  }

  private readStoredVolume(key: string, fallback: number): number {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return fallback;
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
    const background = modalPanel(this.scene, 320, 180, 390, 220);
    const divider = this.scene.add.rectangle(320, 117, 350, 2, 0x9b7047, 0.9);
    this.settingsTitle = this.scene.add.text(320, 96, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "17px", color: "#e6c47e", fontStyle: "bold"
    }).setOrigin(0.5);

    this.musicLabel = this.scene.add.text(170, 143, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#fff1cf", fontStyle: "bold"
    }).setOrigin(0, 0.5);
    this.musicValueText = this.scene.add.text(475, 143, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#e6c47e", fontStyle: "bold"
    }).setOrigin(1, 0.5);
    this.effectsLabel = this.scene.add.text(170, 205, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#fff1cf", fontStyle: "bold"
    }).setOrigin(0, 0.5);
    this.effectsValueText = this.scene.add.text(475, 205, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#e6c47e", fontStyle: "bold"
    }).setOrigin(1, 0.5);

    const musicTrack = this.scene.add.rectangle(320, 164, 230, 8, 0x241a14, 1);
    const effectsTrack = this.scene.add.rectangle(320, 226, 230, 8, 0x241a14, 1);
    this.musicFill = this.scene.add.rectangle(205, 164, 230, 8, 0x88a85f, 1).setOrigin(0, 0.5);
    this.effectsFill = this.scene.add.rectangle(205, 226, 230, 8, 0x88a85f, 1).setOrigin(0, 0.5);
    this.musicKnob = this.scene.add.circle(435, 164, 7, 0xe6c47e, 1).setStrokeStyle(2, 0x2a1a14);
    this.effectsKnob = this.scene.add.circle(435, 226, 7, 0xe6c47e, 1).setStrokeStyle(2, 0x2a1a14);

    this.settingsFooter = this.scene.add.text(320, 269, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "8px", color: "#d7e6c5", align: "center"
    }).setOrigin(0.5);
    const closePosition = modalClosePosition(320, 180, 390, 220);
    this.settingsCloseButton = createRedCloseButton(this.scene, closePosition.x, closePosition.y);

    this.settingsPanel.add([
      background, divider, this.settingsTitle, this.musicLabel, this.musicValueText,
      musicTrack, this.musicFill, this.musicKnob,
      this.effectsLabel, this.effectsValueText, effectsTrack,
      this.effectsFill, this.effectsKnob, this.settingsFooter, this.settingsCloseButton
    ]);
    ui.registerPanel("audio", this.settingsPanel, 420, () => {
      this.activeSlider = null;
    }, this.settingsCloseButton);
    this.language.onChange(() => this.updateSettingsText());
    this.updateSettingsText();
    this.updateSliderVisuals();
  }

  private updateSettingsText(): void {
    const myanmar = this.language.getLanguage() === "my";
    const font = this.language.getFontFamily();
    this.settingsTitle.setText(myanmar ? "အသံချိန်ညှိမှု" : "AUDIO SETTINGS");
    this.musicLabel.setText(myanmar ? "နောက်ခံတေးဂီတ" : "BACKGROUND MUSIC");
    this.effectsLabel.setText(myanmar ? "အသံအကျိုးသက်ရောက်မှု" : "SOUND EFFECTS");
    this.settingsFooter.setText(myanmar ? "ဘားကို နှိပ်ပါ သို့မဟုတ် ဆွဲရွှေ့၍ အသံချိန်ညှိပါ" : "CLICK OR DRAG A BAR TO ADJUST VOLUME");
    for (const text of [this.settingsTitle, this.musicLabel, this.effectsLabel, this.musicValueText, this.effectsValueText, this.settingsFooter]) {
      text.setFontFamily(font);
    }
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
    this.musicVolume = Phaser.Math.Clamp(value, 0, 1);
    this.saveVolume(MUSIC_VOLUME_KEY, this.musicVolume);
    this.updateSliderVisuals();
    this.applyVolume();
    if (this.musicVolume > 0) {
      if (!this.started) this.start();
      else if (this.audioReady && (!this.currentMusicSource || this.currentMusicPhase !== this.phase)) this.playMusicTrack(this.phase);
    }
  }

  private setEffectsVolume(value: number): void {
    this.effectsVolume = Phaser.Math.Clamp(value, 0, 1);
    this.saveVolume(EFFECTS_VOLUME_KEY, this.effectsVolume);
    this.updateSliderVisuals();
    this.applyVolume();
    if (this.effectsVolume > 0 && !this.started) this.start();
  }

  private handleSliderPointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.ui.isOpen("audio")) return;

    const x = pointer.x;
    const y = pointer.y;
    const onTrack = x >= 188 && x <= 452;

    if (onTrack && y >= 150 && y <= 178) {
      this.activeSlider = "music";
      this.updateSliderFromPointer(pointer);
    } else if (onTrack && y >= 212 && y <= 240) {
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

  /** Allows the header music control to remain visible on touch layouts. */
  setMobileHeaderHidden(hidden: boolean): void {
    for (const control of this.headerControls) {
      (control as unknown as { setVisible: (visible: boolean) => void }).setVisible(!hidden);
    }
  }

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
    if (this.started) {
      if (this.ctx?.state === "suspended") {
        void this.ctx.resume().catch(() => undefined);
      }
      this.applyVolume();
      if (!this.audioLoadPromise) this.audioLoadPromise = this.loadAudioAssets();
      if (this.audioReady && this.musicVolume > 0 && (!this.currentMusicSource || this.currentMusicPhase !== this.phase)) {
        this.playMusicTrack(this.phase);
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

    const musicResults = await Promise.all(MUSIC_PHASES.map(async (phase) => {
      const buffer = await decode(`music/${phase}.ogg`);
      return [phase, buffer] as const;
    }));
    const effectResults = await Promise.all(EFFECT_NAMES.map(async (name) => {
      const buffer = await decode(`effects/${name}.ogg`);
      return [name, buffer] as const;
    }));

    if (this.ctx !== context || context.state === "closed") return;
    for (const [phase, buffer] of musicResults) {
      if (buffer) this.musicBuffers.set(phase, buffer);
    }
    for (const [name, buffer] of effectResults) {
      if (buffer) this.effectBuffers.set(name, buffer);
    }
    this.audioReady = true;

    if (this.musicVolume > 0) this.playMusicTrack(this.phase);
    const queued = this.pendingEffects.splice(0);
    for (const effect of queued) this.playSoundEffect(effect);
  }

  private playMusicTrack(phase: DayPhase): void {
    if (!this.ctx || !this.musicBus || this.ctx.state === "closed") return;
    const buffer = this.musicBuffers.get(phase);
    if (!buffer) return;
    if (this.currentMusicPhase === phase && this.currentMusicSource) return;

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
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
    if (this.musicVolume > 0 && this.audioReady) this.playMusicTrack(nextPhase);
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
    if (this.effectsVolume <= 0) return;
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

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();
    const baseGain = EFFECT_BASE_GAIN[effect] ?? 0.58;
    source.buffer = buffer;
    source.playbackRate.value = 0.975 + Math.random() * 0.05;
    gain.gain.value = baseGain * attenuation * (0.94 + Math.random() * 0.12);
    panner.pan.value = Phaser.Math.Clamp(pan, -1, 1);
    source.connect(gain).connect(panner).connect(this.effectsBus);
    source.start();
  }
}
