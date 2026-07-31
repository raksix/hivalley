// HiValley — shared color palette.
// Cozy, warm Stardew-ish palette used across procedurally generated art
// and UI chrome. Centralized so every scene pulls the same hues.

export const PALETTE = {
  // Sky / atmosphere
  skyTop: 0x4ea1d3,
  skyMid: 0x8cc7e8,
  skyBot: 0xf6d59a,
  cloud: 0xfdf6e8,
  cloudShadow: 0xcfd9d6,

  // Mountains
  mountainFar: 0x6f7d92,
  mountainNear: 0x3f4a60,
  mountainSnow: 0xeef0f4,

  // Grass / ground
  grassLight: 0x86c152,
  grassDark: 0x4f8a2b,
  grassShadow: 0x2e5e1c,
  dirt: 0x8b5a3c,
  dirtDark: 0x5e3b25,

  // Trees
  leafLight: 0x6cba4a,
  leafMid: 0x3f8c33,
  leafDark: 0x225e1f,
  trunk: 0x6b3e23,
  trunkDark: 0x3b2010,

  // Water
  waterTop: 0x6fb3d8,
  waterMid: 0x4f8fba,
  waterBot: 0x2d5f88,
  waterFoam: 0xeaf5fb,

  // Buildings
  wallLight: 0xe8c994,
  wallDark: 0xb98e5e,
  roofLight: 0xc54a3a,
  roofDark: 0x7a2a20,
  door: 0x6b3e23,
  window: 0x8fcde8,
  windowLit: 0xffe082,

  // UI
  uiPanel: 0x2a1a0e,
  uiPanelLight: 0x4a2f1a,
  uiBorder: 0xf3e9c8,
  uiBorderDark: 0x6b3e23,
  uiText: 0xf3e9c8,
  uiTextShadow: 0x1a0f08,
  uiAccent: 0xffc857,
  uiAccentHot: 0xff7a59,
  uiDisabled: 0x7a6a55,
  uiHover: 0xfff1c2,
  uiShadow: 0x000000,

  // Misc
  black: 0x000000,
  white: 0xffffff,
  heart: 0xe94e60,
  star: 0xfff1a8,
};

// Convert a 0xRRGGBB int to CSS rgba() for DOM-overlaid HTML when needed.
export const toCss = (n) => '#' + n.toString(16).padStart(6, '0');