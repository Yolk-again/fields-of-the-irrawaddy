
import Phaser from "phaser";

export type ModalId =
  | "market"
  | "inventory"
  | "crafting"
  | "dialogue"
  | "profile"
  | "help";

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

  private closeCallbacks = new Map<
    ModalId,
    () => void
  >();

  private hudElements: Phaser.GameObjects.GameObject[] = [];

  private hudSnapshot: {
    element: Phaser.GameObjects.GameObject;
    wasVisible: boolean;
  }[] = [];

  private activeModal: ModalId | null = null;

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
  }

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
    onForceClose: () => void
  ): void {
    this.panels.set(id, panel);
    this.closeCallbacks.set(id, onForceClose);

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

    if (!newPanel || this.activeModal === id) {
      return;
    }

    if (this.activeModal === null) {
      this.hideHud();
    } else {
      const oldId = this.activeModal;

      this.panels.get(oldId)?.setVisible(false);
      this.closeCallbacks.get(oldId)?.();
    }

    this.activeModal = id;

    this.backdrop.setVisible(true);
    newPanel.setVisible(true);
  }

  close(id: ModalId): void {
    if (this.activeModal !== id) {
      return;
    }

    this.panels.get(id)?.setVisible(false);

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
