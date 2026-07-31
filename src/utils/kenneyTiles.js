// HiValley — Kenney Tiny Farm tile index constants.
//
// Source: "Tiny Farm" by Kenney (www.kenney.nl)
// License: Creative Commons CC0 (https://creativecommons.org/publicdomain/zero/1.0/)
// URL: https://kenney.nl/assets/tiny-farm
//
// Tilemap is 12 columns × 11 rows = 132 tiles, 16×16 each, packed
// in `Tilemap/tilemap_packed.png` (192×176 px). Indices below are
// derived from the file's Preview.png reference layout.
//
// All decorative object tiles use anchor (0.5, 1) so they "stand on"
// their tile position (e.g. trees, crates).

/**
 * Tile index → spritesheet frame index.
 * Grouped by category for readability.
 */
export const KENNEY_TILES = {
  // -------- Row 0–2: Grass variations (cols 0–11 = 0–35) --------
  GRASS_LIGHT:          0,
  GRASS_DARK:           1,
  GRASS_FLOWER_A:       2,
  GRASS_FLOWER_B:       3,
  GRASS_FLOWER_C:       4,
  GRASS_FLOWER_D:       5,
  GRASS_TUFT_A:         6,
  GRASS_TUFT_B:         7,
  GRASS_TUFT_C:         8,
  GRASS_SPARSE:         9,
  GRASS_PATH_EDGE:     10,
  GRASS_DIRT_EDGE:     11,

  // Row 1 — 12–23
  GRASS_GREEN_A:       12,
  GRASS_GREEN_B:       13,
  GRASS_GREEN_C:       14,
  GRASS_GREEN_D:       15,
  GRASS_FLOWER_RED:    16,
  GRASS_FLOWER_YELLOW: 17,
  GRASS_FLOWER_BLUE:   18,
  GRASS_FLOWER_PURPLE: 19,
  GRASS_TUFT_D:        20,
  GRASS_ROCK_A:        21,
  GRASS_ROCK_B:        22,
  GRASS_PATH_DIRT:     23,

  // -------- Row 2: edge/corner tiles (24–35) --------
  GRASS_CORNER_NW:     24,
  GRASS_CORNER_NE:     25,
  GRASS_CORNER_SW:     26,
  GRASS_CORNER_SE:     27,
  GRASS_EDGE_N:        28,
  GRASS_EDGE_S:        29,
  GRASS_EDGE_W:        30,
  GRASS_EDGE_E:        31,
  GRASS_PATH_CONNECTOR: 32,
  GRASS_PATH_END:      33,
  GRASS_GRASS_OVERLAY: 34,
  GRASS_FLOWER_MIX:    35,

  // -------- Row 3: Tilled soil variations (36–47) --------
  TILLED_A:            36,
  TILLED_B:            37,
  TILLED_C:            38,
  TILLED_D:            39,
  TILLED_E:            40,
  TILLED_F:            41,
  TILLED_G:            42,
  TILLED_H:            43,
  TILLED_HOE_A:        44,
  TILLED_HOE_B:        45,
  TILLED_HOE_C:        46,
  TILLED_SEED:         47,

  // -------- Row 4: Crops & produce (48–59) --------
  CROP_SPROUT_A:       48,
  CROP_SPROUT_B:       49,
  CROP_GROW_A:         50,
  CROP_GROW_B:         51,
  CROP_GROW_C:         52,
  CROP_GROW_D:         53,
  CROP_READY_A:        54,
  CROP_READY_B:        55,
  CROP_READY_C:        56,
  CROP_READY_D:        57,
  CROP_PUMPKIN:        58,
  CROP_MELON:          59,

  // -------- Row 5: Stone path (60–71) --------
  PATH_HORIZ:          60,
  PATH_VERT:           61,
  PATH_CROSS:          62,
  PATH_T_N:            63,
  PATH_T_S:            64,
  PATH_T_W:            65,
  PATH_T_E:            66,
  PATH_CORNER_NW:      67,
  PATH_CORNER_NE:      68,
  PATH_CORNER_SW:      69,
  PATH_CORNER_SE:      70,
  PATH_END:            71,

  // -------- Row 6: Water (72–83) --------
  WATER_A:             72,
  WATER_B:             73,
  WATER_C:             74,
  WATER_D:             75,
  WATER_E:             76,
  WATER_F:             77,
  WATER_G:             78,
  WATER_H:             79,
  WATER_EDGE_N:        80,
  WATER_EDGE_S:        81,
  WATER_EDGE_W:        82,
  WATER_EDGE_E:        83,

  // -------- Row 7: Wood floor (84–95) --------
  WOOD_A:              84,
  WOOD_B:              85,
  WOOD_C:              86,
  WOOD_D:              87,
  WOOD_E:              88,
  WOOD_F:              89,
  WOOD_G:              90,
  WOOD_H:              91,
  WOOD_PLANK_H:        92,
  WOOD_PLANK_V:        93,
  WOOD_DOOR:           94,
  WOOD_RUG:            95,

  // -------- Row 8: Fence & decoration (96–107) --------
  FENCE_H:             96,
  FENCE_V:             97,
  FENCE_POST:          98,
  FENCE_GATE:          99,
  BUSH_GREEN_A:       100,
  BUSH_GREEN_B:       101,
  BUSH_FLOWER:        102,
  BUSH_BERRY:         103,
  ROCK_SMALL:         104,
  ROCK_LARGE:         105,
  MUSHROOM:           106,
  FLOWER_POT:         107,

  // -------- Row 9: Crates & barrels (108–119) --------
  CRATE_WOOD:         108,
  CRATE_OPEN:         109,
  BARREL:             110,
  BARREL_LIE:         111,
  BASKET:             112,
  BASKET_FRUIT:       113,
  BAG_SACK:           114,
  WHEELBARROW:        115,
  SCARECROW:          116,
  WELL:               117,
  SIGN:               118,
  LANTERN:            119,

  // -------- Row 10: Big decorations (120–131) --------
  TREE_BIG:           120,
  TREE_PINE:          121,
  TREE_FRUIT:         122,
  TREE_STUMP:         123,
  HOUSE_CORNER:       124,
  ROOF_TILE:          125,
  CHIMNEY:            126,
  HAY_BALE:           127,
  CART:               128,
  FENCE_GATE_BIG:     129,
  SIGN_ARROW:         130,
  BRIDGE:             131,
};

/**
 * Decorative tile bindings for the farmhouse overlay.
 * Maps GameScene positions to (tile-index, origin) pairs.
 */
export const KENNEY_DECOR = {
  // Anchor (0.5, 1) = stand on the tile (trees, crates, etc.)
  STAND: { x: 0.5, y: 1 },
  // Anchor (0.5, 0.5) = center on the tile (floor decorations)
  CENTER: { x: 0.5, y: 0.5 },
};
