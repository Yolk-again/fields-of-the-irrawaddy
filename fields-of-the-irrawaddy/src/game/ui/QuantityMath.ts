/** Shared quantity rules for every buy, sell, store, and withdraw selector. */
export function maximumQuantity(available: number): number {
  return Math.max(0, Math.floor(Number(available) || 0));
}

export function normalizeQuantity(value: number, available: number): number {
  const maximum = maximumQuantity(available);
  if (maximum <= 0) return 1;
  return Math.min(maximum, Math.max(1, Math.floor(Number(value) || 1)));
}

export function adjustQuantity(value: number, delta: number, available: number): number {
  return normalizeQuantity(value + delta, available);
}

export function maximumQuantitySelection(available: number): number {
  return Math.max(1, maximumQuantity(available));
}

export function quantityAdjustmentStep(shiftHeld: boolean): number {
  return shiftHeld ? 10 : 1;
}
