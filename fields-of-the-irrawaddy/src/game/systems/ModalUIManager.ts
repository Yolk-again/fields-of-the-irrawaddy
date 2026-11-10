
import Phaser from "phaser";

export type ModalId =
  | "market"
  | "inventory"
  | "board"
  | "dialogue"
  | "profile"
  | "help"
  | "cooking"
  | "house"
  | "chest"
  | "audio";

interface DisplayAccess {
  visible: boolean;
  setVisible(visible: boolean): unknown;
  setDepth(depth: number): unknown;
}

export class ModalUIManager {
  private scene: Phaser.Scene;

  private backdrop: Phaser.GameObjects.Rectangle;

  private panels = new Map<
    ModalId,
    Phaser.GameObjects.Container
  >();

  private closeCallbacks = new Map<ModalId, () => void>();

  private closeButtons = new Map<ModalId, Phaser.GameObjects.Container>();

  private closeAreas = new Map<ModalId, { x: number; y: number; width: number; height: number }>();

  private hudElements: Phaser.GameObjects.GameObject[] = [];

  private hudSnapshot: {
    element: Phaser.GameObjects.GameObject;
    wasVisible: boolean;
  }[] = [];

  private activeModal: ModalId | null = null;

  /** Modal panels opened from a room (for example chest/cooker inside the house). */
  private modalStack: ModalId[] = [];

  private readonly HUD_DEPTH = 5000;
  private readonly BACKDROP_DEPTH = 9000;
  private readonly PANEL_DEPTH = 10000;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.backdrop = this.scene.add.rectangle(
      320,
      180,
      640,
      360,
      0x1b120d,
      0.72
    );

    this.backdrop
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(this.BACKDROP_DEPTH)
      .setVisible(false);

    this.backdrop.setInteractive();

    this.scene.input.on("pointerdown", this.handleClosePointerDown, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.input.off("pointerdown", this.handleClosePointerDown, this);
    });
  }

  private requestClose(id: ModalId): void {
    if (this.activeModal !== id) return;
    this.closeCallbacks.get(id)?.();
    if (this.activeModal === id) this.close(id);
  }

  private handleClosePointerDown = (pointer: Phaser.Input.Pointer): void => {
    const id = this.activeModal;
    if (id === null) return;

    const area = this.closeAreas.get(id);
    if (!area) return;

    const inside = pointer.x >= area.x - area.width / 2 &&
      pointer.x <= area.x + area.width / 2 &&
      pointer.y >= area.y - area.height / 2 &&
      pointer.y <= area.y + area.height / 2;

    if (!inside) return;

    // Fallback hit test for scaled canvases; the close object also calls this
    // directly from its own pointer event.
    this.requestClose(id);
  };

  private getAccess(
    element: Phaser.GameObjects.GameObject
  ): DisplayAccess {
    return element as unknown as DisplayAccess;
  }

  private getElementVisible(
    element: Phaser.GameObjects.GameObject
  ): boolean {
    return this.getAccess(element).visible;
  }

  private setElementVisible(
    element: Phaser.GameObjects.GameObject,
    visible: boolean
  ): void {
    this.getAccess(element).setVisible(visible);
  }

  private setElementDepth(
    element: Phaser.GameObjects.GameObject,
    depth: number
  ): void {
    this.getAccess(element).setDepth(depth);
  }

  registerPanel(
    id: ModalId,
    panel: Phaser.GameObjects.Container,
    depth: number,
    onForceClose: () => void,
    closeButton?: Phaser.GameObjects.Container
  ): void {
    this.panels.set(id, panel);
    this.closeCallbacks.set(id, onForceClose);

    if (closeButton) {
      this.closeButtons.set(id, closeButton);
      this.closeAreas.set(id, {
        x: closeButton.x,
        y: closeButton.y,
        width: 40,
        height: 40
      });
      closeButton.on("pointerdown", () => this.requestClose(id));
    }

    panel
      .setScrollFactor(0)
      .setDepth(this.PANEL_DEPTH + depth)
      .setVisible(false);
  }

  registerHud(
    ...elements: Phaser.GameObjects.GameObject[]
  ): void {
    for (const element of elements) {
      if (this.hudElements.includes(element)) {
        continue;
      }

      this.hudElements.push(element);

      this.setElementDepth(
        element,
        this.HUD_DEPTH + this.hudElements.length
      );

      if (this.activeModal !== null) {
        this.setElementVisible(element, false);
      }
    }
  }

  private hideHud(): void {
    this.hudSnapshot = this.hudElements.map(element => ({
      element,
      wasVisible: this.getElementVisible(element)
    }));

    for (const element of this.hudElements) {
      this.setElementVisible(element, false);
    }
  }

  private restoreHud(): void {
    for (const entry of this.hudSnapshot) {
      this.setElementVisible(
        entry.element,
        entry.wasVisible
      );
    }

    this.hudSnapshot = [];
  }

  open(id: ModalId): void {
    const newPanel = this.panels.get(id);
    if (!newPanel || this.activeModal === id) return;

    // A normal modal replaces the current screen and clears any nested room UI.
    if (this.activeModal === null) {
      this.hideHud();
    } else {
      const openIds = [this.activeModal, ...this.modalStack.slice().reverse()];
      for (const oldId of openIds) {
        this.panels.get(oldId)?.setVisible(false);
        this.closeButtons.get(oldId)?.setVisible(true);
        this.closeCallbacks.get(oldId)?.();
      }
    }
    this.modalStack = [];

    this.activeModal = id;
    this.backdrop.setVisible(true);
    newPanel.setVisible(true);
  }

  /** Opens a sub-panel while preserving the previous room/menu underneath it. */
  openOver(id: ModalId): void {
    const newPanel = this.panels.get(id);
    if (!newPanel || this.activeModal === id) return;
    if (this.activeModal === null) {
      this.open(id);
      return;
    }

    const parentId = this.activeModal;
    // Keep the room visible underneath storage/cooking. Hide its close control
    // so a click cannot accidentally close the house while a child panel is up.
    this.closeButtons.get(parentId)?.setVisible(false);
    this.modalStack.push(parentId);
    this.activeModal = id;
    this.backdrop.setVisible(true);
    newPanel.setDepth(this.PANEL_DEPTH + 1000 + this.modalStack.length * 100);
    newPanel.setVisible(true);
  }

  close(id: ModalId): void {
    if (this.activeModal !== id) return;
    this.panels.get(id)?.setVisible(false);

    const previous = this.modalStack.pop();
    if (previous) {
      this.activeModal = previous;
      this.panels.get(previous)?.setVisible(true);
      this.closeButtons.get(previous)?.setVisible(true);
      this.backdrop.setVisible(true);
      return;
    }

    this.activeModal = null;
    this.backdrop.setVisible(false);
    this.restoreHud();
  }

  getActiveModal(): ModalId | null {
    return this.activeModal;
  }

  hasActiveModal(): boolean {
    return this.activeModal !== null;
  }

  isOpen(id: ModalId): boolean {
    return this.activeModal === id;
  }
}
