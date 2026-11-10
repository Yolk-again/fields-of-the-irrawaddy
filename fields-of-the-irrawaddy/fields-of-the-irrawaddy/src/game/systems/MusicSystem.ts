import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";
import { LanguageSystem } from "./LanguageSystem";
import { pixelPanel } from "../ui/PixelUI";

/**
 * Original, procedurally generated background music (Web Audio API).
 * No audio files and no third-party material, so there is nothing to license:
 * original, time-of-day-aware village music and ambience. Dawn and daytime
 * use brighter plucked pentatonic melodies and birds; dusk softens the music
 * and introduces evening insects; night uses lower sustained chords, breeze,
 * and cricket calls. Water, music, ambience, and effects share one mute control.
 */

const STORAGE_KEY = "irrawaddy-music-muted";
const BPM = 76;
const BEAT = 60 / BPM;
const hz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

// C major pentatonic (C D E G A) across two octaves, MIDI numbers
const SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];

// C – Am – F – G, pad voicings
const DAY_CHORDS: number[][] = [
  [48, 55, 64],
  [45, 52, 60],
  [41, 48, 57],
  [43, 50, 59]
];

const DAWN_CHORDS: number[][] = [
  [50, 57, 64],
  [52, 59, 67],
  [55, 62, 69],
  [52, 59, 67]
];

const DUSK_CHORDS: number[][] = [
  [45, 52, 60],
  [43, 50, 59],
  [41, 48, 57],
  [43, 50, 59]
];

const NIGHT_CHORDS: number[][] = [
  [45, 52, 57],
  [41, 48, 55],
  [43, 50, 57],
  [38, 45, 53]
];

type DayPhase = "dawn" | "day" | "dusk" | "night";

export class MusicSystem {
  private scene: Phaser.Scene;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private nextBarTime = 0;
  private bar = 0;
  private melodyIndex = 4;
  private nextBirdTime = 0;
  private nextCricketTime = 0;
  private muted = false;
  private started = false;
  private phase: DayPhase = "day";
  private timeOfDayHours = 8;
  private waterGain: GainNode | null = null;
  private breezeGain: GainNode | null = null;

  private button!: Phaser.GameObjects.Rectangle;
  private icon!: Phaser.GameObjects.Image;
  private tip!: Phaser.GameObjects.Text;
  private language: LanguageSystem;

  constructor(scene: Phaser.Scene, ui: ModalUIManager, language: LanguageSystem) {
    this.scene = scene;
    this.language = language;
    try {
      this.muted = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      this.muted = false;
    }

    this.createButton(ui);
    this.scene.events.on("sound-effect", this.handleSoundEffect, this);

    // Browsers only allow audio after a user gesture.
    const unlock = (): void => {
      // Do not create or resume an audio graph while the user's saved setting is muted.
      if (!this.muted) this.start();
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.events.off("sound-effect", this.handleSoundEffect, this);
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      if (this.timer !== null) window.clearInterval(this.timer);
      void this.ctx?.close();
    });
  }

  private createButton(ui: ModalUIManager): void {
    const frame = pixelPanel(this.scene, 594, 22, 28, 28, { fill: 0x4a3324 }).setDepth(8500);
    this.icon = this.scene.add.image(594, 22, "ui_icon_note")
      .setScrollFactor(0).setDepth(8501);
    this.button = this.scene.add.rectangle(594, 22, 28, 28, 0xffffff, 0.001)
      .setScrollFactor(0).setDepth(8502)
      .setInteractive({ useHandCursor: true });
    this.tip = this.scene.add.text(594, 44, "", {
      fontFamily: this.language.getFontFamily(), fontSize: "10px", color: "#fff1cf",
      backgroundColor: "#2a1a14", padding: { x: 4, y: 2 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(8503).setVisible(false);
    this.language.onChange(() => this.refreshButton());

    this.button.on("pointerover", () => this.tip.setVisible(true));
    this.button.on("pointerout", () => this.tip.setVisible(false));
    this.button.on("pointerup", () => this.toggle());
    ui.registerHud(frame, this.icon, this.button, this.tip);
    this.refreshButton();
  }

  private refreshButton(): void {
    this.icon.setTexture(this.muted ? "ui_icon_note_off" : "ui_icon_note");
    this.tip.setText(this.language.t("hud.tip.music"));
    this.tip.setFontFamily(this.language.getFontFamily());
  }


  toggle(): void {
    this.muted = !this.muted;
    try {
      window.localStorage.setItem(STORAGE_KEY, this.muted ? "1" : "0");
    } catch {
      // ignore storage problems
    }
    this.refreshButton();
    this.applyVolume();

    if (this.muted) {
      // Suspend the whole Web Audio context as a hard mute. This stops already
      // scheduled birds/crickets and any one-shot effects, not just future music.
      if (this.ctx?.state === "running") void this.ctx.suspend().catch(() => undefined);
      return;
    }

    this.start();
  }

  private applyVolume(): void {
    // Also mute Phaser's own sound manager. This keeps the button global if a
    // later feature uses Phaser audio rather than this class's Web Audio bus.
    const phaserSound = (this.scene as unknown as { sound?: { mute: boolean } }).sound;
    if (phaserSound) phaserSound.mute = this.muted;

    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    // Set the bus directly to zero; setTargetAtTime can leave a short audible tail.
    this.master.gain.setValueAtTime(this.muted ? 0 : 0.55, now);
  }

  private resetSchedulers(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.nextBarTime = now + 0.3;
    this.nextBirdTime = now + this.birdInterval();
    this.nextCricketTime = now + 1.5;
    this.applyAmbienceLevels();
  }

  private start(): void {
    if (this.muted) return;
    if (this.started) {
      const context = this.ctx;
      if (!context) return;
      void context.resume().then(() => {
        if (!this.muted) this.resetSchedulers();
      }).catch(() => undefined);
      this.applyVolume();
      return;
    }
    const AudioCtor = window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    this.started = true;
    this.ctx = new AudioCtor();
    void this.ctx.resume();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    this.applyVolume();

    this.startWater();
    this.startBreeze();
    this.applyAmbienceLevels();
    this.nextBarTime = this.ctx.currentTime + 0.3;
    this.nextBirdTime = this.ctx.currentTime + this.birdInterval();
    this.nextCricketTime = this.ctx.currentTime + 1.5;
    this.timer = window.setInterval(() => this.schedule(), 120);
  }

  /**
   * Change the original procedural soundtrack and village ambience to match
   * the shared in-game clock. Transitions are crossfaded rather than restarted.
   */
  setTimeOfDayHours(hour: number): void {
    this.timeOfDayHours = ((hour % 24) + 24) % 24;
    const nextPhase: DayPhase = this.timeOfDayHours < 5.5
      ? "night"
      : this.timeOfDayHours < 7
        ? "dawn"
        : this.timeOfDayHours < 17
          ? "day"
          : this.timeOfDayHours < 19
            ? "dusk"
            : "night";

    if (nextPhase === this.phase) return;
    this.phase = nextPhase;
    if (this.ctx) {
      this.applyAmbienceLevels();
      this.nextBirdTime = this.ctx.currentTime + this.birdInterval();
      this.nextCricketTime = this.ctx.currentTime + 1.2;
    }
  }

  private applyAmbienceLevels(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const levels: Record<DayPhase, { water: number; breeze: number }> = {
      dawn: { water: 0.030, breeze: 0.006 },
      day: { water: 0.034, breeze: 0.004 },
      dusk: { water: 0.019, breeze: 0.016 },
      night: { water: 0.012, breeze: 0.011 }
    };
    const target = levels[this.phase];
    this.waterGain?.gain.setTargetAtTime(target.water, now, 2.8);
    this.breezeGain?.gain.setTargetAtTime(target.breeze, now, 3.5);
  }

  private birdInterval(): number {
    if (this.phase === "dawn") return 4 + Math.random() * 3;
    if (this.phase === "day") return 6 + Math.random() * 7;
    if (this.phase === "dusk") return 14 + Math.random() * 8;
    return 90;
  }

  private schedule(): void {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    while (this.nextBarTime < this.ctx.currentTime + 0.6) {
      this.playBar(this.nextBarTime, this.bar % 4);
      this.nextBarTime += BEAT * 4;
      this.bar++;
    }

    const now = this.ctx.currentTime;
    if (now >= this.nextBirdTime) {
      if (this.timeOfDayHours >= 5.0 && this.timeOfDayHours < 19) {
        this.bird(now + 0.02);
        this.nextBirdTime = now + this.birdInterval();
      } else {
        this.nextBirdTime = now + 3;
      }
    }

    if (now >= this.nextCricketTime) {
      if (this.timeOfDayHours >= 18.2 || this.timeOfDayHours < 5.5) {
        this.cricket(now + 0.02);
        this.nextCricketTime = now + 2.2 + Math.random() * 2.8;
      } else if (this.phase === "dusk") {
        this.cricket(now + 0.02, 0.35);
        this.nextCricketTime = now + 7 + Math.random() * 4;
      } else {
        this.nextCricketTime = now + 1.5;
      }
    }
  }

  private playBar(t: number, chordIndex: number): void {
    const chords = this.phase === "dawn"
      ? DAWN_CHORDS
      : this.phase === "dusk"
        ? DUSK_CHORDS
        : this.phase === "night"
          ? NIGHT_CHORDS
          : DAY_CHORDS;
    const chord = chords[chordIndex];
    const padVolume = this.phase === "night" ? 0.021 : this.phase === "dusk" ? 0.026 : 0.035;
    const padDuration = this.phase === "night" ? BEAT * 5.8 : BEAT * 4.2;
    for (const note of chord) this.pad(hz(note), t, padDuration, padVolume);

    if (this.phase === "night") {
      // Sparse, low bell-like notes and long warm pads for a quieter night mood.
      this.pluck(hz(chord[0] - 12), t, 0.065, 2.1);
      if (chordIndex % 2 === 0) {
        const nightNotes = [72, 74, 76, 79];
        this.pluck(hz(nightNotes[(this.bar + chordIndex) % nightNotes.length]), t + BEAT * 2, 0.035, 2.5);
      }
      return;
    }

    if (this.phase === "dusk") {
      this.pluck(hz(chord[0] - 12), t, 0.085, 1.9);
      const duskNotes = [0, 3, 5, 7];
      for (const stepIndex of duskNotes) {
        if (Math.random() < 0.28) continue;
        const step = [-1, 0, 0, 1, 1][Math.floor(Math.random() * 5)];
        this.melodyIndex = Phaser.Math.Clamp(this.melodyIndex + step, 0, SCALE.length - 1);
        this.pluck(hz(SCALE[this.melodyIndex] - 12), t + stepIndex * BEAT * 0.5, 0.065, 1.7);
      }
      return;
    }

    // Dawn and daytime use the brighter, lightly plucked pentatonic theme.
    this.pluck(hz(chord[0] - 12), t, 0.14, 1.6);
    this.pluck(hz(chord[1] - 12), t + BEAT * 2, 0.09, 1.4);
    for (let i = 0; i < 8; i++) {
      if (this.phase === "day" && [1, 3, 6].includes(i) && Math.random() < 0.7) continue;
      const step = this.phase === "dawn"
        ? [0, 1, 1, 2, 1, 2, 2, 3][i]
        : [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
      this.melodyIndex = Phaser.Math.Clamp(this.melodyIndex + step, 0, SCALE.length - 1);
      this.pluck(hz(SCALE[this.melodyIndex]), t + i * BEAT * 0.5, 0.095, 1.15);
    }
  }

  private pluck(freq: number, time: number, volume: number, decay: number): void {
    if (this.muted || !this.ctx || !this.master) return;
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3200, time);
    filter.frequency.exponentialRampToValueAtTime(700, time + decay);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    const a = this.ctx.createOscillator();
    a.type = this.phase === "night" ? "sine" : "triangle";
    a.frequency.value = freq;
    const b = this.ctx.createOscillator();
    b.type = "sine";
    b.frequency.value = freq * 2;
    const bGain = this.ctx.createGain();
    bGain.gain.value = 0.25;

    a.connect(filter);
    b.connect(bGain).connect(filter);
    filter.connect(gain).connect(this.master);
    a.start(time);
    b.start(time);
    a.stop(time + decay + 0.1);
    b.stop(time + decay + 0.1);
  }

  private pad(freq: number, time: number, duration: number, peak = 0.035): void {
    if (this.muted || !this.ctx || !this.master) return;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + (this.phase === "night" ? 2.0 : 1.2));
    gain.gain.linearRampToValueAtTime(0.0001, time + duration);
    for (const detune of [-5, 5]) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(gain);
      osc.start(time);
      osc.stop(time + duration + 0.1);
    }
    gain.connect(this.master);
  }

  private bird(time: number): void {
    if (this.muted || !this.ctx || !this.master) return;
    const base = 2400 + Math.random() * 900;
    for (let i = 0; i < 3; i++) {
      const t = time + i * 0.13;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.08);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.025, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  private handleSoundEffect = (effect: string): void => {
    this.playSoundEffect(effect);
  };

  /** Small, original Web Audio effects for farming, dialogue and rewards. */
  private playSoundEffect(effect: string): void {
    if (this.muted) return;
    if (!this.ctx || !this.master) this.start();
    if (!this.ctx || !this.master) return;

    const tone = (
      frequency: number,
      duration: number,
      volume: number,
      wave: OscillatorType = "sine",
      offset = 0,
      endFrequency?: number
    ): void => {
      if (!this.ctx || !this.master) return;
      const startAt = this.ctx.currentTime + offset;
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      if (endFrequency && endFrequency > 0) {
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startAt + duration);
      }
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(volume, startAt + Math.min(0.012, duration * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(gain).connect(this.master);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.02);
    };

    const noise = (duration: number, volume: number, cutoff: number): void => {
      if (!this.ctx || !this.master) return;
      const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) samples[i] = Math.random() * 2 - 1;
      const source = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      source.buffer = buffer;
      source.connect(filter).connect(gain).connect(this.master);
      source.start();
      source.stop(this.ctx.currentTime + duration + 0.01);
    };

    switch (effect) {
      case "hoe":
        tone(150, 0.16, 0.15, "triangle", 0, 72);
        noise(0.09, 0.045, 850);
        break;
      case "plant":
        tone(520, 0.11, 0.075, "sine");
        tone(690, 0.14, 0.065, "sine", 0.08);
        break;
      case "water":
        noise(0.26, 0.085, 1500);
        tone(540, 0.2, 0.035, "sine", 0.02, 390);
        break;
      case "harvest":
        tone(660, 0.14, 0.095, "triangle");
        tone(880, 0.16, 0.095, "triangle", 0.09);
        tone(1100, 0.2, 0.09, "sine", 0.18);
        break;
      case "dead":
        tone(190, 0.24, 0.11, "triangle", 0, 86);
        break;
      case "request":
        tone(523, 0.18, 0.1, "sine");
        tone(659, 0.2, 0.095, "sine", 0.1);
        tone(784, 0.24, 0.09, "sine", 0.2);
        break;
      case "buy":
        tone(790, 0.1, 0.08, "triangle");
        tone(1180, 0.15, 0.075, "sine", 0.07);
        break;
      case "sell":
        tone(960, 0.09, 0.08, "triangle");
        tone(1320, 0.17, 0.09, "sine", 0.08);
        break;
      case "talk":
        tone(440, 0.1, 0.055, "sine");
        tone(587, 0.13, 0.05, "sine", 0.07);
        break;
      case "error":
        tone(210, 0.17, 0.075, "triangle", 0, 150);
        break;
      case "cast":
        noise(0.22, 0.055, 1050);
        tone(360, 0.16, 0.045, "sine", 0.04, 520);
        break;
      case "bite":
        tone(720, 0.10, 0.08, "sine");
        tone(980, 0.13, 0.08, "sine", 0.09);
        break;
      case "catch":
        tone(660, 0.10, 0.09, "triangle");
        tone(880, 0.13, 0.09, "triangle", 0.08);
        tone(1175, 0.17, 0.08, "sine", 0.16);
        break;
      case "miss":
        tone(330, 0.22, 0.07, "sine", 0, 190);
        break;
      case "cook":
        noise(0.15, 0.04, 900);
        tone(520, 0.12, 0.065, "triangle");
        tone(780, 0.16, 0.07, "sine", 0.09);
        break;
      case "eat":
        tone(523, 0.12, 0.06, "sine");
        tone(659, 0.14, 0.07, "sine", 0.08);
        tone(784, 0.18, 0.07, "triangle", 0.16);
        break;
    }
  }

  private startWater(): void {
    if (!this.ctx || !this.master) return;
    const length = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    this.waterGain = this.ctx.createGain();
    this.waterGain.gain.value = 0.001;
    source.connect(filter).connect(this.waterGain).connect(this.master);
    source.start();
  }

  /** A soft wind bed becomes more noticeable around sunset and at night. */
  private startBreeze(): void {
    if (!this.ctx || !this.master) return;
    const length = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    const slowFilter = this.ctx.createBiquadFilter();
    slowFilter.type = "highpass";
    slowFilter.frequency.value = 90;
    this.breezeGain = this.ctx.createGain();
    this.breezeGain.gain.value = 0.001;
    source.connect(filter).connect(slowFilter).connect(this.breezeGain).connect(this.master);
    source.start();
  }

  /** Short, gentle cricket chirps make nighttime ambience distinct from day. */
  private cricket(time: number, volume = 1): void {
    if (this.muted || !this.ctx || !this.master) return;
    for (let i = 0; i < 3; i++) {
      const startAt = time + i * 0.16;
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(4100 + Math.random() * 380, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(3650 + Math.random() * 250, startAt + 0.095);
      filter.type = "bandpass";
      filter.frequency.value = 3900;
      filter.Q.value = 3.2;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.012 * volume, startAt + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.11);
      oscillator.connect(filter).connect(gain).connect(this.master);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.13);
    }
  }
}
