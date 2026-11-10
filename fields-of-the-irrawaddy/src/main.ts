import Phaser from "phaser";
import "./style.css";
import "./game/assets.css";
import { FarmScene } from "./game/scenes/FarmScene";
import {
  SAVE_SLOT_COUNT,
  deleteSaveSlot,
  migrateLegacySaveToFirstSlot,
  readSaveSlotSummary
} from "./game/systems/SaveSlotStorage";

interface SelectedSave {
  saveSlot: number;
  loadExisting: boolean;
  fromSaveSelect: true;
}

type ConfirmationKind = "overwrite" | "delete";

let selectedSaveForBoot: SelectedSave | null = null;
let gameInstance: Phaser.Game | null = null;

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
  render: {
    smoothPixelArt: true,
    roundPixels: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [SaveSlotBootScene, FarmScene]
};

const title = document.getElementById("title-screen");
const saveSlotGrid = document.getElementById("save-slot-grid");
const confirmation = document.getElementById("save-confirmation");
const confirmationTitle = document.getElementById("save-confirmation-title");
const confirmationMessage = document.getElementById("save-confirmation-message");
const confirmationAccept = document.getElementById("save-confirmation-accept");
const confirmationCancel = document.getElementById("save-confirmation-cancel");
const mobileHud = document.getElementById("mobile-game-hud");

const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0 ||
  window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(max-width: 900px)").matches;
if (isTouchDevice) document.body.classList.add("foi-touch-device");

let pendingConfirmation: { slot: number; kind: ConfirmationKind } | null = null;

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
    title.textContent = `SAVE SLOT ${slotNumber}`;
    card.append(title);

    const details = document.createElement("p");
    details.className = summary.occupied ? "save-slot-details" : "save-slot-details is-empty";
    if (!summary.occupied) {
      details.textContent = "EMPTY SLOT";
    } else if (summary.valid) {
      const player = summary.playerName ? `${summary.playerName} · ` : "";
      const savedDate = formatSavedDate(summary.savedAt);
      details.textContent = `${player}DAY ${summary.day}${savedDate ? ` · ${savedDate}` : ""}`;
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
      actions.append(secondaryActions);
    }

    card.append(actions);
    saveSlotGrid.append(card);
  }
}

function showConfirmation(slot: number, kind: ConfirmationKind): void {
  if (!confirmation || !confirmationTitle || !confirmationMessage) return;
  pendingConfirmation = { slot, kind };
  confirmationTitle.textContent = kind === "delete" ? "DELETE THIS SAVE?" : "START A NEW GAME?";
  confirmationMessage.textContent = kind === "delete"
    ? `Are you sure you want to permanently delete Save Slot ${slot}? This cannot be undone.`
    : `Save Slot ${slot} already contains progress. Starting a new game will permanently replace it.`;
  if (confirmationAccept) confirmationAccept.textContent = kind === "delete" ? "DELETE SAVE" : "OVERWRITE SAVE";
  confirmation.hidden = false;
  confirmationCancel?.focus();
}

function closeConfirmation(): void {
  pendingConfirmation = null;
  if (confirmation) confirmation.hidden = true;
}

function launchGame(slot: number, loadExisting: boolean): void {
  if (gameInstance) return;

  selectedSaveForBoot = {
    saveSlot: slot,
    loadExisting,
    fromSaveSelect: true
  };

  document.body.classList.add("foi-launching");
  try {
    gameInstance = new Phaser.Game(gameConfig);
  } catch (error) {
    selectedSaveForBoot = null;
    document.body.classList.remove("foi-launching");
    console.error("Could not start Fields of the Irrawaddy:", error);
    window.alert("The game could not start. Please refresh the page and try again.");
  }
}

function confirmSaveAction(): void {
  if (!pendingConfirmation) return;
  const { slot, kind } = pendingConfirmation;

  if (kind === "overwrite" && gameInstance) {
    // A game is already running; never wipe a slot without starting its replacement.
    closeConfirmation();
    return;
  }

  const deleted = deleteSaveSlot(slot);
  if (!deleted) {
    if (confirmationMessage) confirmationMessage.textContent = "The browser could not update this save. Check storage permissions and try again.";
    return;
  }

  closeConfirmation();
  if (kind === "delete") {
    renderSaveSlots();
  } else {
    launchGame(slot, false);
  }
}

function returnToTitle(): void {
  const game = gameInstance;
  if (game) {
    try {
      // Stopping the scene first runs its shutdown hooks (removes save listeners).
      game.scene.stop("FarmScene");
      game.destroy(true);
    } catch (error) {
      console.error("Could not close the game session cleanly:", error);
    }
  }
  gameInstance = null;
  selectedSaveForBoot = null;
  document.body.classList.remove("foi-in-game", "foi-launching");
  mobileHud?.setAttribute("aria-hidden", "true");
  title?.classList.remove("is-hidden");
  renderSaveSlots();
}

window.addEventListener("foi-quit-to-title", () => {
  // Defer so Phaser is not torn down from inside its own input handler.
  window.setTimeout(returnToTitle, 0);
});

function setupMobileHud(): void {
  mobileHud?.querySelectorAll<HTMLButtonElement>("button[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      if (!document.body.classList.contains("foi-in-game")) return;
      const action = button.dataset.action;
      if (!action) return;
      window.dispatchEvent(new CustomEvent("foi-mobile-hud-action", { detail: action }));
    });
  });
}

confirmationAccept?.addEventListener("click", confirmSaveAction);
confirmationCancel?.addEventListener("click", closeConfirmation);
confirmation?.addEventListener("click", event => {
  if (event.target === confirmation) closeConfirmation();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && confirmation && !confirmation.hidden) closeConfirmation();
});

renderSaveSlots();
setupMobileHud();
