export type InventoryItemId =
  | "hoe"
  | "seeds"
  | "water"
  | "harvest"
  | "rice"
  | "fish"
  | "meals"
  | "rod"
  | "goldenWheat";

export interface InventoryItemDefinition {
  nameKey: string;
  texture: string;
  tool?: "hoe" | "seeds" | "water" | "harvest";
}

export const INVENTORY_ITEM_DEFINITIONS: Record<InventoryItemId, InventoryItemDefinition> = {
  hoe: { nameKey: "farm.hoe", texture: "hoe_asset", tool: "hoe" },
  seeds: { nameKey: "farm.seedTool", texture: "rice_seed_bag_asset", tool: "seeds" },
  water: { nameKey: "farm.water", texture: "watering_can_asset", tool: "water" },
  harvest: { nameKey: "farm.harvest", texture: "sickle_asset", tool: "harvest" },
  rice: { nameKey: "inventory.rice", texture: "rice_bowl_asset" },
  fish: { nameKey: "inventory.fishVariety", texture: "fish_catfish_asset" },
  meals: { nameKey: "inventory.meals", texture: "meal_fish_rice_asset" },
  rod: { nameKey: "inventory.rod", texture: "fishing_rod_asset" },
  goldenWheat: { nameKey: "inventory.goldenWheat", texture: "rice_grain_asset" }
};
