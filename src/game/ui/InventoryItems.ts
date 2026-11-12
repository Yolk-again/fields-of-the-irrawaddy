import type { FarmCropKind } from "../systems/FarmingSystem";
import type { FishingBaitKind } from "../systems/FishingSystem";

export type InventoryItemId =
  | "hoe"
  | "seeds"
  | "tomatoSeeds"
  | "greenBeanSeeds"
  | "water"
  | "harvest"
  | "rice"
  | "tomatoes"
  | "greenBeans"
  | "silverBarb"
  | "catfish"
  | "goldenCarp"
  | "meals"
  | "rod"
  | "wormBait"
  | "shrimpBait"
  | "goldenCricketBait";

export interface InventoryItemDefinition {
  nameKey: string;
  texture: string;
  tool?: "hoe" | "seeds" | "water" | "harvest";
  cropSeed?: FarmCropKind;
  fishingBait?: FishingBaitKind;
}

export const INVENTORY_ITEM_DEFINITIONS: Record<InventoryItemId, InventoryItemDefinition> = {
  hoe: { nameKey: "farm.hoe", texture: "hoe_asset", tool: "hoe" },
  seeds: { nameKey: "inventory.seeds", texture: "rice_seed_bag_asset", tool: "seeds", cropSeed: "rice" },
  tomatoSeeds: { nameKey: "inventory.tomatoSeeds", texture: "tomato_seed_bag_asset", tool: "seeds", cropSeed: "tomato" },
  greenBeanSeeds: { nameKey: "inventory.greenBeanSeeds", texture: "green_bean_seed_bag_asset", tool: "seeds", cropSeed: "greenBean" },
  water: { nameKey: "farm.water", texture: "watering_can_asset", tool: "water" },
  harvest: { nameKey: "farm.harvest", texture: "sickle_asset", tool: "harvest" },
  rice: { nameKey: "inventory.wheat", texture: "wheat_basket_asset" },
  tomatoes: { nameKey: "inventory.tomatoes", texture: "tomato_basket_asset" },
  greenBeans: { nameKey: "inventory.greenBeans", texture: "green_bean_basket_asset" },
  silverBarb: { nameKey: "inventory.silverBarb", texture: "fish_silver_barb_asset" },
  catfish: { nameKey: "inventory.catfish", texture: "fish_catfish_asset" },
  goldenCarp: { nameKey: "inventory.goldenCarp", texture: "fish_golden_carp_asset" },
  meals: { nameKey: "inventory.meals", texture: "meal_fish_rice_asset" },
  rod: { nameKey: "inventory.rod", texture: "fishing_rod_asset" },
  wormBait: { nameKey: "inventory.wormBait", texture: "worm_bait_asset", fishingBait: "worm" },
  shrimpBait: { nameKey: "inventory.shrimpBait", texture: "shrimp_bait_asset", fishingBait: "shrimp" },
  goldenCricketBait: { nameKey: "inventory.goldenCricketBait", texture: "golden_cricket_bait_asset", fishingBait: "goldenCricket" }
};
