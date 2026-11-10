import Phaser from "phaser";
import { LanguageSystem } from "./LanguageSystem";

type StorySlide = {
  chapter: string;
  title: string;
  body: string;
  speaker: string;
  portrait: string;
};

type OpeningAudio = {
  start: () => void;
  voice: () => void;
  stop: () => void;
};

const assetUrl = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

/** A skippable pixel-RPG dialogue sequence shown once when a new world is created. */
export class OpeningCutsceneSystem {
  private readonly root: HTMLDivElement;
  private readonly language: LanguageSystem;
  private readonly onComplete: () => void;
  private readonly onSlideChange: (index: number) => void;
  private readonly playerPortrait: string;
  private readonly audio: OpeningAudio;
  private readonly slides: StorySlide[];
  private currentSlide = 0;
  private isDestroyed = false;
  private bodyText?: HTMLParagraphElement;
  private typewriterTimer: number | null = null;
  private bodyCharacters: string[] = [];
  private visibleCharacters = 0;

  constructor(
    scene: Phaser.Scene,
    language: LanguageSystem,
    onComplete: () => void,
    onSlideChange: (index: number) => void = () => undefined,
    playerPortrait = "assets/characters/farmer_blue.png",
    audio: OpeningAudio = { start: () => undefined, voice: () => undefined, stop: () => undefined }
  ) {
    this.language = language;
    this.onComplete = onComplete;
    this.onSlideChange = onSlideChange;
    this.playerPortrait = playerPortrait;
    this.audio = audio;
    this.slides = this.createSlides();

    const host = document.getElementById("game-container");
    this.root = document.createElement("div");
    this.root.className = "opening-cutscene";
    document.body.classList.add("foi-cutscene-active");
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");
    this.root.setAttribute("aria-label", language.t("story.dialogLabel"));
    this.root.tabIndex = 0;

    this.root.addEventListener("pointerdown", event => event.stopPropagation());
    this.root.addEventListener("pointerup", event => event.stopPropagation());
    this.root.addEventListener("click", event => event.stopPropagation());
    this.root.addEventListener("keydown", this.handleKeyDown);

    if (!host) {
      this.complete();
      return;
    }

    host.append(this.root);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    this.audio.start();
    this.onSlideChange(0);
    this.render();
    this.root.focus({ preventScroll: true });
  }

  private createSlides(): StorySlide[] {
    return [
      {
        chapter: "story.chapterOne",
        title: "story.titleOne",
        body: "story.bodyOne",
        speaker: "story.speakerNarrator",
        portrait: this.playerPortrait
      },
      {
        chapter: "story.chapterTwo",
        title: "story.titleTwo",
        body: "story.bodyTwo",
        speaker: "village.koAung",
        portrait: "assets/characters/ko_aung.png"
      },
      {
        chapter: "story.chapterThree",
        title: "story.titleThree",
        body: "story.bodyThree",
        speaker: "village.maThiri",
        portrait: "assets/characters/ma_thiri.png"
      }
    ];
  }

  private createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    text?: string
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  private render(): void {
    if (this.isDestroyed) return;
    this.stopTypewriter();
    const slide = this.slides[this.currentSlide];
    this.root.replaceChildren();
    this.root.dataset.slide = String(this.currentSlide + 1);

    const shade = this.createElement("div", "opening-cutscene-shade");
    shade.setAttribute("aria-hidden", "true");

    const header = this.createElement("div", "opening-cutscene-header");
    const chapterMark = this.createElement("span", "opening-cutscene-chapter-mark", "◆");
    const chapter = this.createElement("p", "opening-cutscene-chapter", this.language.t(slide.chapter));
    const skip = this.createElement("button", "opening-cutscene-skip", this.language.t("story.skip")) as HTMLButtonElement;
    skip.type = "button";
    skip.addEventListener("click", () => this.complete());
    header.append(chapterMark, chapter, skip);

    const sceneCaption = this.createElement("div", "opening-cutscene-scene-caption", this.language.t("story.burmeseMark"));

    const dialogue = this.createElement("section", "opening-cutscene-dialogue");
    dialogue.setAttribute("aria-live", "polite");

    const portraitFrame = this.createElement("div", "opening-cutscene-portrait-frame");
    const portrait = this.createElement("img", "opening-cutscene-portrait") as HTMLImageElement;
    portrait.src = assetUrl(slide.portrait);
    portrait.alt = this.language.t(slide.speaker);
    portrait.draggable = false;
    portraitFrame.append(portrait);

    const content = this.createElement("div", "opening-cutscene-dialogue-content");
    const speaker = this.createElement("div", "opening-cutscene-speaker", this.language.t(slide.speaker));
    const title = this.createElement("h2", "opening-cutscene-title", this.language.t(slide.title));
    const body = this.createElement("p", "opening-cutscene-body");
    this.bodyText = body;
    content.append(speaker, title, body);

    const dialogueFooter = this.createElement("div", "opening-cutscene-dialogue-footer");
    const progress = this.createElement("div", "opening-cutscene-progress");
    this.slides.forEach((_, index) => {
      const dot = this.createElement("span", `opening-cutscene-dot${index === this.currentSlide ? " is-active" : ""}`);
      dot.setAttribute("aria-hidden", "true");
      progress.append(dot);
    });
    const hint = this.createElement("span", "opening-cutscene-hint", this.language.t("story.progress", {
      current: this.currentSlide + 1,
      total: this.slides.length
    }));
    const next = this.createElement("button", "opening-cutscene-next", "▼") as HTMLButtonElement;
    next.type = "button";
    next.setAttribute("aria-label", this.language.t(
      this.currentSlide === this.slides.length - 1 ? "story.begin" : "story.next"
    ));
    next.title = next.getAttribute("aria-label") ?? "Continue";
    next.addEventListener("click", () => this.continueDialogue());
    dialogueFooter.append(progress, hint, next);

    dialogue.append(portraitFrame, content, dialogueFooter);
    this.root.append(shade, header, sceneCaption, dialogue);
    this.startTypewriter(slide.body);
  }

  private startTypewriter(bodyKey: string): void {
    const body = this.language.t(bodyKey);
    this.bodyCharacters = Array.from(body);
    this.visibleCharacters = 0;
    if (this.bodyText) this.bodyText.textContent = "";
    let lastVoiceAt = 0;
    this.typewriterTimer = window.setInterval(() => {
      if (this.isDestroyed || !this.bodyText) {
        this.stopTypewriter();
        return;
      }
      this.visibleCharacters = Math.min(this.bodyCharacters.length, this.visibleCharacters + 1);
      const character = this.bodyCharacters[this.visibleCharacters - 1] ?? "";
      this.bodyText.textContent = this.bodyCharacters.slice(0, this.visibleCharacters).join("");
      const now = performance.now();
      if (character.trim() && this.visibleCharacters % 7 === 0 && now - lastVoiceAt >= 175) {
        this.audio.voice();
        lastVoiceAt = now;
      }
      if (this.visibleCharacters >= this.bodyCharacters.length) this.stopTypewriter();
    }, 24);
  }

  private stopTypewriter(): void {
    if (this.typewriterTimer !== null) {
      window.clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  private revealDialogue(): void {
    this.stopTypewriter();
    this.visibleCharacters = this.bodyCharacters.length;
    if (this.bodyText) this.bodyText.textContent = this.bodyCharacters.join("");
  }

  private continueDialogue(): void {
    if (this.isDestroyed) return;
    if (this.visibleCharacters < this.bodyCharacters.length) {
      this.revealDialogue();
      return;
    }
    this.advance();
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Enter" && event.key !== " " && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.stopPropagation();
    this.continueDialogue();
  };

  private advance(): void {
    if (this.currentSlide >= this.slides.length - 1) {
      this.complete();
      return;
    }
    this.currentSlide += 1;
    this.onSlideChange(this.currentSlide);
    this.render();
    this.root.focus({ preventScroll: true });
  }

  private complete(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.stopTypewriter();
    this.root.removeEventListener("keydown", this.handleKeyDown);
    this.root.remove();
    document.body.classList.remove("foi-cutscene-active");
    this.audio.stop();
    this.onComplete();
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.stopTypewriter();
    this.root.removeEventListener("keydown", this.handleKeyDown);
    this.root.remove();
    document.body.classList.remove("foi-cutscene-active");
    this.audio.stop();
  }
}
