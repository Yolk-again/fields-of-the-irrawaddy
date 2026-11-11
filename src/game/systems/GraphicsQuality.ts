export type GraphicsQuality = "high" | "balanced" | "low";

const STORAGE_KEY = "foi-graphics-quality";

export function getGraphicsQuality(): GraphicsQuality {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "high" || stored === "balanced" || stored === "low") return stored;
  } catch {
    // Use a device-appropriate default when browser storage is unavailable.
  }

  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
    ? "balanced"
    : "high";
}

export function saveGraphicsQuality(quality: GraphicsQuality): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, quality);
  } catch {
    // The current session can still use the selected quality without persistence.
  }
}
