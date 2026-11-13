import Phaser from "phaser";
import "./style.css";
import "./game/assets.css";
import { FarmScene } from "./game/scenes/FarmScene";
import { getGraphicsQuality } from "./game/systems/GraphicsQuality";
import { isMobilePlatform } from "./game/utils/DeviceMode";
import {
  SAVE_SLOT_COUNT,
  deleteSaveSlot,
  migrateLegacySaveToFirstSlot,
  readSaveSlotSummary,
  getSaveSlotName,
  setSaveSlotName
} from "./game/systems/SaveSlotStorage";

interface SelectedSave {
  saveSlot: number;
  loadExisting: boolean;
  fromSaveSelect: true;
}

type ConfirmationKind = "overwrite" | "delete";

let selectedSaveForBoot: SelectedSave | null = null;
let gameInstance: Phaser.Game | null = null;
let launchPending = false;

class SaveSlotBootScene extends Phaser.Scene {
  constructor() {
    super("SaveSlotBootScene");
  }

  create(): void {
    const selection = selectedSaveForBoot;
    if (!selection) {
      this.scene.stop();
      return;
    }

    selectedSaveForBoot = null;
    this.scene.start("FarmScene", selection);
  }
}

const initialGraphicsQuality = getGraphicsQuality();

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  fullscreenTarget: "game-container",
  width: 640,
  height: 360,
  backgroundColor: "#527b43",
  input: {
    activePointers: 5
  },
  fps: {
    target: 60,
    limit: 0,
    smoothStep: true,
    deltaHistory: 8
  },
  render: initialGraphicsQuality === "low"
    ? { pixelArt: true, roundPixels: true }
    : { smoothPixelArt: true, roundPixels: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [SaveSlotBootScene, FarmScene]
};

const titleScreen = document.getElementById("title-screen");
const appElement = document.getElementById("app");
const saveSlotGrid = document.getElementById("save-slot-grid");
const confirmation = document.getElementById("save-confirmation");
const confirmationTitle = document.getElementById("save-confirmation-title");
const confirmationMessage = document.getElementById("save-confirmation-message");
const confirmationAccept = document.getElementById("save-confirmation-accept");
const confirmationCancel = document.getElementById("save-confirmation-cancel");
const saveNameDialog = document.getElementById("save-name-dialog");
const saveNameTitle = document.getElementById("save-name-title");
const saveNameMessage = document.getElementById("save-name-message");
const saveNameInput = document.getElementById("save-name-input") as HTMLInputElement | null;
const saveNameError = document.getElementById("save-name-error");
const saveNameCancel = document.getElementById("save-name-cancel");
const saveNameSave = document.getElementById("save-name-save");
const mobileHud = document.getElementById("mobile-game-hud");
const menuButton = document.getElementById("game-menu-button");
const mobileContextAction = document.getElementById("mobile-context-action") as HTMLButtonElement | null;
const titleScrollCue = document.getElementById("title-scroll-cue");
const titleScrollCueLabel = titleScrollCue?.querySelector("span");
const titleScrollCueMyanmar = titleScrollCue?.querySelector("em");
const installGameButton = document.getElementById("install-game-button") as HTMLButtonElement | null;
const installGameHint = document.getElementById("install-game-hint");

interface DeferredInstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferredInstallPrompt: DeferredInstallPrompt | null = null;
const isInstalledApp = window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
if (isInstalledApp && installGameButton) installGameButton.hidden = true;

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event as DeferredInstallPrompt;
  if (installGameButton) installGameButton.hidden = false;
  if (installGameHint) installGameHint.hidden = true;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  if (installGameButton) installGameButton.hidden = true;
  if (installGameHint) {
    installGameHint.textContent = "Fields of the Irrawaddy is installed on this device.";
    installGameHint.hidden = false;
  }
});

installGameButton?.addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (installGameHint) {
      installGameHint.textContent = choice.outcome === "accepted"
        ? "Installation started. You can open the game from your home screen or apps list."
        : "You can install the game later from your browser menu.";
      installGameHint.hidden = false;
    }
    return;
  }

  const ua = navigator.userAgent;
  const isAppleMobile = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (installGameHint) {
    installGameHint.textContent = isAppleMobile
      ? "To install: tap Share in Safari, then choose Add to Home Screen."
      : "To install: open your browser menu and choose Install app or Add to Home Screen.";
    installGameHint.hidden = false;
  }
});

const isTouchDevice = isMobilePlatform();
if (isTouchDevice) document.body.classList.add("foi-touch-device");

document.body.classList.remove("foi-in-game", "foi-launching");
titleScreen?.classList.remove("is-hidden");
appElement?.setAttribute("aria-hidden", "true");

let pendingConfirmation: { slot: number; kind: ConfirmationKind } | null = null;
let pendingSaveNameSlot: number | null = null;

function appendButton(
  parent: HTMLElement,
  label: string,
  className: string,
  action: () => void,
  disabled = false
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener("click", action);
  parent.append(button);
  return button;
}

function formatSavedDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function renderSaveSlots(): void {
  if (!saveSlotGrid) return;
  migrateLegacySaveToFirstSlot();
  saveSlotGrid.replaceChildren();

  for (let slotNumber = 1; slotNumber <= SAVE_SLOT_COUNT; slotNumber++) {
    const summary = readSaveSlotSummary(slotNumber);
    const card = document.createElement("article");
    card.className = "save-slot-card";
    card.setAttribute("aria-label", `Save Slot ${slotNumber}`);

    const title = document.createElement("h3");
    title.className = "save-slot-title";
    title.textContent = getSaveSlotName(slotNumber);
    card.append(title);

    const details = document.createElement("p");
    details.className = summary.occupied ? "save-slot-details" : "save-slot-details is-empty";
    if (!summary.occupied) {
      details.textContent = "EMPTY SLOT";
    } else if (summary.valid) {
      const player = summary.playerName ? summary.playerName : "FARMER";
      const farm = summary.farmName ? ` · ${summary.farmName}` : "";
      const savedDate = formatSavedDate(summary.savedAt);
      details.textContent = `${player}${farm} · DAY ${summary.day}${savedDate ? ` · ${savedDate}` : ""}`;
    } else {
      details.textContent = "SAVE DATA UNAVAILABLE";
    }
    card.append(details);

    const actions = document.createElement("div");
    actions.className = "save-slot-actions";

    if (!summary.occupied) {
      appendButton(actions, "START NEW GAME", "save-button save-button-primary", () => {
        launchGame(slotNumber, false);
      });
      appendButton(actions, "RENAME SLOT", "save-button save-button-slotname", () => {
        renameSaveSlot(slotNumber);
      });
    } else {
      if (summary.valid) {
        appendButton(actions, "CONTINUE", "save-button save-button-primary", () => {
          launchGame(slotNumber, true);
        });
      }
      const secondaryActions = document.createElement("div");
      secondaryActions.className = "save-slot-secondary-actions";
      appendButton(secondaryActions, "NEW GAME", "save-button save-button-secondary", () => {
        showConfirmation(slotNumber, "overwrite");
      });
      appendButton(secondaryActions, "DELETE", "save-button save-button-danger", () => {
        showConfirmation(slotNumber, "delete");
      });
      appendButton(secondaryActions, "RENAME", "save-button save-button-slotname", () => {
        renameSaveSlot(slotNumber);
      });
      actions.append(secondaryActions);
    }

    card.append(actions);
    saveSlotGrid.append(card);
  }
  window.requestAnimationFrame(updateTitleScrollCue);
}

function renameSaveSlot(slot: number): void {
  if (!saveNameDialog || !saveNameInput || !saveNameTitle || !saveNameMessage) return;
  pendingSaveNameSlot = slot;
  saveNameTitle.textContent = "NAME THIS SAVE SLOT";
  saveNameMessage.textContent = "Give this save a name you will recognize later.";
  saveNameInput.value = getSaveSlotName(slot);
  if (saveNameError) saveNameError.textContent = "";
  saveNameDialog.hidden = false;
  window.requestAnimationFrame(() => {
    saveNameInput.focus();
    saveNameInput.select();
  });
}

function closeSaveNameDialog(): void {
  pendingSaveNameSlot = null;
  if (saveNameDialog) saveNameDialog.hidden = true;
  if (saveNameError) saveNameError.textContent = "";
}

function saveRenamedSlot(): void {
  if (pendingSaveNameSlot === null || !saveNameInput) return;
  const cleaned = saveNameInput.value.trim().replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, 24);
  if (!cleaned) {
    if (saveNameError) saveNameError.textContent = "Please enter a name before saving.";
    saveNameInput.focus();
    return;
  }
  if (!setSaveSlotName(pendingSaveNameSlot, cleaned)) {
    if (saveNameError) saveNameError.textContent = "The name could not be saved. Check browser storage permissions.";
    return;
  }
  closeSaveNameDialog();
  renderSaveSlots();
}

function showConfirmation(slot: number, kind: ConfirmationKind): void {
  if (!confirmation || !confirmationTitle || !confirmationMessage) return;
  pendingConfirmation = { slot, kind };
  confirmationTitle.textContent = kind === "delete" ? "DELETE THIS SAVE?" : "START A NEW GAME?";
  confirmationMessage.textContent = kind === "delete"
    ? `Are you sure you want to permanently delete “${getSaveSlotName(slot)}”? This cannot be undone.`
    : `“${getSaveSlotName(slot)}” already contains progress. Starting a new game will permanently replace it.`;
  if (confirmationAccept) confirmationAccept.textContent = kind === "delete" ? "DELETE SAVE" : "OVERWRITE SAVE";
  confirmation.hidden = false;
  confirmationCancel?.focus();
}

function closeConfirmation(): void {
  pendingConfirmation = null;
  if (confirmation) confirmation.hidden = true;
}

async function launchGame(slot: number, loadExisting: boolean): Promise<void> {
  if (gameInstance || launchPending) return;
  launchPending = true;

  selectedSaveForBoot = {
    saveSlot: slot,
    loadExisting,
    fromSaveSelect: true
  };

  document.body.classList.add("foi-launching");
  try {
    // Wait for both script faces before Phaser paints any canvas text.
    if (document.fonts) {
      await Promise.all([
        document.fonts.load('16px "Noto Sans"').catch(() => []),
        document.fonts.load('16px "Noto Sans Myanmar"').catch(() => [])
      ]);
      await document.fonts.ready;
    }
    gameInstance = new Phaser.Game(gameConfig);
  } catch (error) {
    selectedSaveForBoot = null;
    document.body.classList.remove("foi-launching");
    console.error("Could not start Fields of the Irrawaddy:", error);
    window.alert("The game could not start. Please refresh the page and try again.");
  } finally {
    launchPending = false;
  }
}

function confirmSaveAction(): void {
  if (!pendingConfirmation) return;
  const { slot, kind } = pendingConfirmation;
  if (kind === "delete") {
    const deleted = deleteSaveSlot(slot);
    if (!deleted) {
      if (confirmationMessage) confirmationMessage.textContent = "The browser could not update this save. Check storage permissions and try again.";
      return;
    }
    closeConfirmation();
    renderSaveSlots();
    return;
  }

  // Preserve the old world until the new character and farm names are confirmed.
  closeConfirmation();
  launchGame(slot, false);
}

function setupMobileHud(): void {
  mobileHud?.querySelectorAll<HTMLButtonElement>("button[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      if (!document.body.classList.contains("foi-in-game")) return;
      const action = button.dataset.action;
      if (!action) return;
      window.dispatchEvent(new CustomEvent("foi-mobile-hud-action", { detail: action }));
    });
  });
  menuButton?.addEventListener("click", () => {
    if (!document.body.classList.contains("foi-in-game")) return;
    window.dispatchEvent(new Event("foi-menu-request"));
  });
}

function updateTitleScrollCue(): void {
  if (!titleScreen || !titleScrollCue) return;
  if (titleScrollCueLabel) {
    titleScrollCueLabel.textContent = isTouchDevice ? "SWIPE UP TO INSTALL" : "SCROLL DOWN TO INSTALL";
  }
  if (titleScrollCueMyanmar) {
    titleScrollCueMyanmar.textContent = isTouchDevice
      ? "အပေါ်သို့ ပွတ်ဆွဲပြီး ဂိမ်းကို ထည့်သွင်းပါ"
      : "အောက်သို့ ဆင်းပြီး ဂိမ်းကို ထည့်သွင်းပါ";
  }
  const installRow = document.querySelector<HTMLElement>(".title-install-row");
  const titleBounds = titleScreen.getBoundingClientRect();
  const installBounds = installRow?.getBoundingClientRect();
  const pageCanScroll = titleScreen.scrollHeight > titleScreen.clientHeight + 8;
  const installBelowViewport = Boolean(installBounds && installBounds.bottom > titleBounds.bottom + 8);
  titleScrollCue.toggleAttribute("hidden", !pageCanScroll || !installBelowViewport);
}

window.addEventListener("resize", updateTitleScrollCue);
titleScreen?.addEventListener("scroll", updateTitleScrollCue, { passive: true });
document.querySelector<HTMLImageElement>(".title-landscape-photo")?.addEventListener("load", updateTitleScrollCue);
window.addEventListener("foi-return-to-title", () => {
  if (!gameInstance) return;
  gameInstance.destroy(true);
  gameInstance = null;
  document.body.classList.remove("foi-in-game", "foi-launching", "foi-modal-open", "foi-mobile-fullscreen");
  appElement?.setAttribute("aria-hidden", "true");
  mobileHud?.setAttribute("aria-hidden", "true");
  if (mobileContextAction) mobileContextAction.hidden = true;
  titleScreen?.classList.remove("is-hidden");
  if (titleScreen) titleScreen.scrollTop = 0;
  renderSaveSlots();
  window.requestAnimationFrame(updateTitleScrollCue);
  if (document.fullscreenElement && document.exitFullscreen) {
    void document.exitFullscreen().catch(() => undefined);
  }
});

confirmationAccept?.addEventListener("click", confirmSaveAction);
confirmationCancel?.addEventListener("click", closeConfirmation);
saveNameSave?.addEventListener("click", saveRenamedSlot);
saveNameCancel?.addEventListener("click", closeSaveNameDialog);
saveNameDialog?.addEventListener("click", event => {
  if (event.target === saveNameDialog) closeSaveNameDialog();
});
saveNameInput?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveRenamedSlot();
  }
  event.stopPropagation();
});
confirmation?.addEventListener("click", event => {
  if (event.target === confirmation) closeConfirmation();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && document.body.classList.contains("foi-mobile-fullscreen")) {
    document.body.classList.remove("foi-mobile-fullscreen");
  }
  if (event.key === "Escape" && confirmation && !confirmation.hidden) closeConfirmation();
  if (event.key === "Escape" && saveNameDialog && !saveNameDialog.hidden) closeSaveNameDialog();
});

renderSaveSlots();
setupMobileHud();
window.requestAnimationFrame(updateTitleScrollCue);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(error => {
      console.warn("Offline install support could not be registered:", error);
    });
  }, { once: true });
}
