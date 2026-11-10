/**
 * Village layout – every static prop in the world, grouped by neighbourhood.
 * Coordinates are world pixels; (x, y) is the prop's feet (bottom-centre).
 * `solid` = blocking footprint (width, height) measured up from the feet.
 */
export interface PropDef {
  texture: string;
  x: number;
  y: number;
  solid?: [number, number];
  depth?: number;
}

export const HOMES = {
  player: { x: 190, y: 250 },
  ko: { x: 735, y: 250 },
  ma: { x: 865, y: 250 }
};

/** Matching 5x3 farming plots for the two village farmers. Coordinates are
 * the top-left of the first 32px tile, matching the player's plot geometry. */
export const NPC_FARM_PLOTS = {
  ma: { x: 1080, y: 356, columns: 5, rows: 3 },
  ko: { x: 830, y: 356, columns: 5, rows: 3 }
};

export const LOTUS_POND = { x: 1340, y: 450 };

// North side of the main road: homes, coop, market square, pot stand
export const NORTH_ROW: PropDef[] = [
  { texture: "player_home_asset", x: HOMES.player.x, y: HOMES.player.y, solid: [168, 150] },
  { texture: "banana_plant_asset", x: 58, y: 262, solid: [18, 14] },
  { texture: "flower_bush_pink", x: 128, y: 270 },
  { texture: "flower_bush_yellow", x: 252, y: 270 },
  { texture: "chicken_coop", x: 312, y: 262, solid: [64, 26] },
  { texture: "laundry_line", x: 330, y: 176 },
  { texture: "stilt_house_01_asset", x: 430, y: 165, solid: [108, 96] },
  { texture: "produce_crates", x: 648, y: 278 },
  { texture: "flower_bush_white", x: 806, y: 270 },
  { texture: "flower_bush_pink", x: 932, y: 270 },
  { texture: "fruit_tree_round", x: 985, y: 238, solid: [16, 28] },
  { texture: "bench", x: 948, y: 282 },
  { texture: "stilt_house_02_asset", x: 1005, y: 140, solid: [108, 90] },
  { texture: "water_pot_stand", x: 1064, y: 264, solid: [64, 26] }
];

// Edge-of-village trees (backdrop)
export const BACKDROP_TREES: PropDef[] = [
  { texture: "fruit_tree_round", x: 40, y: 150, solid: [16, 26] },
  { texture: "palm_tree_small", x: 250, y: 88, solid: [14, 22] },
  { texture: "palm_tree_small", x: 560, y: 100, solid: [14, 22] },
  { texture: "fruit_tree_large", x: 676, y: 134, solid: [16, 26] },
  { texture: "palm_tree_small", x: 812, y: 90, solid: [14, 22] },
  { texture: "palm_tree_tall", x: 905, y: 148, solid: [14, 26] },
  { texture: "fruit_tree_round", x: 1096, y: 132, solid: [16, 26] }
];

// Monastery compound (east): wall, gate, hall, golden zedi, bell
export const MONASTERY = {
  hall: { texture: "monastery_asset", x: 1240, y: 215, solid: [140, 145] as [number, number] },
  pagoda: { texture: "pagoda_asset", x: 1385, y: 225, solid: [46, 55] as [number, number] },
  bell: { texture: "monastery_bell", x: 1176, y: 232, solid: [26, 16] as [number, number] },
  // The compound is laid out on 32px world tiles. The 96px front opening
  // aligns with complete wall tiles and leaves a clear 36px walk corridor
  // between the two gate pillars.
  backWallY: 96,
  frontWallY: 256,
  wallX: 1120,
  gate: { left: 1232, right: 1296 },
  leafPiles: [
    // Keep the gate centre clear; the removed centre pile used to visually
    // overlap the monk's passage even though it was not a solid collider.
    { x: 1196, y: 252 }, { x: 1340, y: 250 }
  ]
};

// South-west: farm district
export const FARM_DISTRICT: PropDef[] = [
  { texture: "vegetable_bed_asset", x: 125, y: 448, solid: [150, 62] },
  { texture: "scarecrow_asset", x: 222, y: 432, solid: [14, 18] },
  { texture: "village_well", x: 62, y: 352, solid: [50, 30] },
  { texture: "bench", x: 112, y: 372 },
  { texture: "shrub", x: 40, y: 410 },
  { texture: "hay_bale", x: 480, y: 506 },
  { texture: "boulder_small", x: 560, y: 505, solid: [40, 14] }
];

// South-centre / east: compact rice harvest yard and granary
export const HARVEST_YARD: PropDef[] = [
  { texture: "granary_asset", x: 720, y: 520, solid: [100, 70] },
  { texture: "drying_mat_asset", x: 890, y: 510 },
  { texture: "rice_sacks", x: 1002, y: 518 },
  { texture: "signpost", x: 758, y: 330, solid: [18, 14] }
];

// South-east: bamboo grove, flower garden, lotus pond reeds
export const GARDEN_EAST: PropDef[] = [
  { texture: "bamboo_clump_asset", x: 1300, y: 330, solid: [32, 18] },
  { texture: "bamboo_clump_asset", x: 1360, y: 332, solid: [32, 18] },
  { texture: "flower_bush_pink", x: 1274, y: 374 },
  { texture: "flower_bush_yellow", x: 1320, y: 380 },
  { texture: "flower_bush_white", x: 1400, y: 376 },
  { texture: "banana_plant_asset", x: 1390, y: 370, solid: [18, 14] },
  { texture: "reeds", x: 1268, y: 414 },
  { texture: "reeds", x: 1400, y: 418 }
];

// Reed beds along the canal bank (decor only)
export const CANAL_REEDS: PropDef[] = [
  { texture: "reeds", x: 40, y: 524 }, { texture: "reeds", x: 180, y: 526 },
  { texture: "reeds", x: 330, y: 523 }, { texture: "reeds", x: 610, y: 525 },
  { texture: "reeds", x: 1280, y: 523 }, { texture: "reeds", x: 1400, y: 525 }
];

export const WORLD_LABELS = [
  { x: 1240, y: 60, key: "world.monastery", radius: 220 },
  { x: 1340, y: 365, key: "world.lotusPond", radius: 170 },
  { x: 1360, y: 300, key: "world.bambooGrove", radius: 130 }
];
