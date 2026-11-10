export const SAVE_SLOT_COUNT = 3;

export interface SaveSlotSummary {
  occupied: boolean;
  valid: boolean;
  day: number;
  savedAt: string | null;
  playerName: string | null;
  farmName: string | null;
}

function normalizeSlotNumber(slotNumber: number): number {
  const requestedSlot = Number.isFinite(slotNumber) ? Math.floor(slotNumber) : 1;
  return Math.min(SAVE_SLOT_COUNT, Math.max(1, requestedSlot));
}

export function getSaveSlotStorageKey(slotNumber: number): string {
  return `fields_of_irrawaddy_save_slot_${normalizeSlotNumber(slotNumber)}`;
}

export function getSaveSlotNameStorageKey(slotNumber: number): string {
  return `fields_of_irrawaddy_slot_name_${normalizeSlotNumber(slotNumber)}`;
}

export function getSaveSlotName(slotNumber: number): string {
  const safeSlot = normalizeSlotNumber(slotNumber);
  const fallback = `FARM ${safeSlot}`;
  try {
    const stored = window.localStorage.getItem(getSaveSlotNameStorageKey(safeSlot));
    const cleaned = typeof stored === "string" ? stored.trim().replace(/[<>]/g, "").slice(0, 24) : "";
    return cleaned || fallback;
  } catch {
    return fallback;
  }
}

export function setSaveSlotName(slotNumber: number, name: string): boolean {
  const safeSlot = normalizeSlotNumber(slotNumber);
  const cleaned = name.trim().replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, 24);
  if (!cleaned) return false;
  try {
    window.localStorage.setItem(getSaveSlotNameStorageKey(safeSlot), cleaned);
    return true;
  } catch {
    return false;
  }
}

export function migrateLegacySaveToFirstSlot(): void {
  const legacyKeys = [
    "fields_of_irrawaddy_save_v3",
    "fields_of_irrawaddy_save_v1"
  ];

  try {
    const legacySave = legacyKeys
      .map(key => window.localStorage.getItem(key))
      .find((value): value is string => value !== null);

    if (!legacySave) return;

    for (let slotNumber = 1; slotNumber <= SAVE_SLOT_COUNT; slotNumber++) {
      const slotKey = getSaveSlotStorageKey(slotNumber);
      if (window.localStorage.getItem(slotKey)) continue;

      window.localStorage.setItem(slotKey, legacySave);
      for (const legacyKey of legacyKeys) {
        window.localStorage.removeItem(legacyKey);
      }
      return;
    }
  } catch {
    // Storage may be disabled; the title screen still offers empty slots.
  }
}

export function readSaveSlotSummary(slotNumber: number): SaveSlotSummary {
  const empty: SaveSlotSummary = {
    occupied: false,
    valid: false,
    day: 1,
    savedAt: null,
    playerName: null,
    farmName: null
  };

  try {
    const raw = window.localStorage.getItem(getSaveSlotStorageKey(slotNumber));
    if (!raw) return empty;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { ...empty, occupied: true };
    }

    const data = parsed as {
      version?: unknown;
      savedAt?: unknown;
      player?: { x?: unknown; y?: unknown };
      farming?: { day?: unknown; tiles?: unknown };
      market?: unknown;
      inventory?: { items?: unknown; collected?: unknown };
      board?: unknown;
      village?: unknown;
      profile?: { name?: unknown; farmName?: unknown };
    };

    const supportedVersions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const version = typeof data.version === "number" ? data.version : NaN;
    const valid = supportedVersions.includes(version) &&
      !!data.player && Number.isFinite(Number(data.player.x)) && Number.isFinite(Number(data.player.y)) &&
      !!data.farming && Array.isArray(data.farming.tiles) &&
      !!data.market && !!data.inventory && !!data.inventory.items &&
      Array.isArray(data.inventory.collected) &&
      (version < 4 || !!data.board) && !!data.village;

    return {
      occupied: true,
      valid,
      day: Math.max(1, Math.floor(Number(data.farming?.day) || 1)),
      savedAt: typeof data.savedAt === "string" ? data.savedAt : null,
      playerName: typeof data.profile?.name === "string" ? data.profile.name : null,
      farmName: typeof data.profile?.farmName === "string" ? data.profile.farmName : "My Farm"
    };
  } catch {
    return { ...empty, occupied: true };
  }
}

export function deleteSaveSlot(slotNumber: number, clearName = true): boolean {
  try {
    window.localStorage.removeItem(getSaveSlotStorageKey(slotNumber));
    if (clearName) window.localStorage.removeItem(getSaveSlotNameStorageKey(slotNumber));
    return true;
  } catch {
    return false;
  }
}
