import Phaser from "phaser";
import { ModalUIManager } from "./ModalUIManager";

/**
 * Original, procedurally generated background music (Web Audio API).
 * No audio files and no third-party material, so there is nothing to license:
 * a calm pentatonic "village morning" – plucked harp melody, soft pads,
 * flowing-water noise and the odd bird call. Press M or tap the note button to mute.
 */

const STORAGE_KEY = "irrawaddy-music-muted";
const BPM = 76;
const BEAT = 60 / BPM;
const hz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

// C major pentatonic (C D E G A) across two octaves, MIDI numbers
const SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];

// C – Am – F – G, pad voicings
const CHORDS: number[][] = [
  [48, 55, 64],
  [45, 52, 60],
  [41, 48, 57],
  [43, 50, 59]
];

export class MusicSystem {
  private scene: Phaser.Scene;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private nextBarTime = 0;
  private bar = 0;
  private melodyIndex = 4;
  private nextBirdTime = 0;
  private muted = false;
  private started = false;

  private button!: Phaser.GameObjects.Rectangle;
  private icon!: Phaser.GameObjects.Text;
  private muteKey!: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, ui: ModalUIManager) {
    this.scene = scene;
    try {
      this.muted = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      this.muted = false;
    }

    this.createButton(ui);
    this.muteKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.handleUpdate, this);

    // Browsers only allow audio after a user gesture.
    const unlock = (): void => {
      this.start();
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.handleUpdate, this);
      if (this.timer !== null) window.clearInterval(this.timer);
      void this.ctx?.close();
    });
  }

  private createButton(ui: ModalUIManager): void {
    this.button = this.scene.add.rectangle(610, 60, 48, 22, 0x40513a, 0.98)
      .setStrokeStyle(2, 0x2a1a14)
      .setScrollFactor(0)
      .setDepth(8500)
      .setInteractive({ useHandCursor: true });
    this.icon = this.scene.add.text(610, 60, "♪", {
      fontFamily: "sans-serif",
      fontSize: "15px",
      color: "#fff1cf"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(8501);

    this.button.on("pointerup", () => this.toggle());
    ui.registerHud(this.button, this.icon);
    this.refreshButton();
  }

  private refreshButton(): void {
    this.icon.setAlpha(this.muted ? 0.35 : 1);
    this.icon.setText(this.muted ? "×" : "♪");
    this.button.setFillStyle(this.muted ? 0x79382e : 0x40513a, 0.98);
  }

  private handleUpdate(): void {
    if (Phaser.Input.Keyboard.JustDown(this.muteKey)) this.toggle();
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
    if (!this.muted) this.start();
  }

  private applyVolume(): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.55, now, 0.4);
  }

  private start(): void {
    if (this.started) {
      void this.ctx?.resume();
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
    this.nextBarTime = this.ctx.currentTime + 0.3;
    this.nextBirdTime = this.ctx.currentTime + 5;
    this.timer = window.setInterval(() => this.schedule(), 120);
  }

  private schedule(): void {
    if (!this.ctx) return;
    while (this.nextBarTime < this.ctx.currentTime + 0.6) {
      this.playBar(this.nextBarTime, this.bar % 4);
      this.nextBarTime += BEAT * 4;
      this.bar++;
    }
    if (this.nextBirdTime < this.ctx.currentTime + 0.6) {
      this.bird(this.nextBirdTime);
      this.nextBirdTime += 5 + Math.random() * 7;
    }
  }

  private playBar(t: number, chordIndex: number): void {
    for (const note of CHORDS[chordIndex]) this.pad(hz(note), t, BEAT * 4.2);
    // low pluck on beat 1 and 3
    this.pluck(hz(CHORDS[chordIndex][0] - 12), t, 0.16, 1.6);
    this.pluck(hz(CHORDS[chordIndex][1] - 12), t + BEAT * 2, 0.1, 1.4);

    // eighth-note melody: a gentle random walk on the pentatonic scale
    const rests = [false, true, false, true, false, false, true, false];
    for (let i = 0; i < 8; i++) {
      if (rests[i] && Math.random() < 0.7) continue;
      const step = [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
      this.melodyIndex = Phaser.Math.Clamp(this.melodyIndex + step, 0, SCALE.length - 1);
      this.pluck(hz(SCALE[this.melodyIndex]), t + i * BEAT * 0.5, 0.11, 1.1);
    }
  }

  private pluck(freq: number, time: number, volume: number, decay: number): void {
    if (!this.ctx || !this.master) return;
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3200, time);
    filter.frequency.exponentialRampToValueAtTime(700, time + decay);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    const a = this.ctx.createOscillator();
    a.type = "triangle";
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

  private pad(freq: number, time: number, duration: number): void {
    if (!this.ctx || !this.master) return;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.035, time + 1.2);
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
    if (!this.ctx || !this.master) return;
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
    const gain = this.ctx.createGain();
    gain.gain.value = 0.045;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
  }
}