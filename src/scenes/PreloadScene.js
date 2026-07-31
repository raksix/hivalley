// HiValley — PreloadScene
//
// Loads the Farm RPG asset pack PNGs, generates fallback procedural textures,
// shows a cozy loading screen with a progress bar and rotating tips,
// then transitions to MainMenuScene.

import Phaser from 'phaser';
import { generateAllTextures } from '../utils/textures.js';
import { PALETTE } from '../utils/palette.js';
import { playHover, unlockAudio, setMuted } from '../utils/menuMusic.js';

// Farm RPG asset pack paths (relative to public/)
const ASSETS = {
  // Character spritesheets (16x32 tiles — half-width, full body)
  // Idle.png: 128x96 → 8 cols x 3 rows. Rows: down, left, right.
  // Walk.png: 192x96 → 12 cols x 3 rows. Rows: down, left, right.
  charIdle:   { key: 'farm:char-idle',    url: 'assets/farm-rpg/Character/Idle.png', frameWidth: 16, frameHeight: 32 },
  charWalk:   { key: 'farm:char-walk',    url: 'assets/farm-rpg/Character/Walk.png', frameWidth: 16, frameHeight: 32 },

  // Tileset (16x16 tiles)
  tileset:    { key: 'farm:tileset',      url: 'assets/farm-rpg/Tileset/Tileset Spring.png', frameWidth: 16, frameHeight: 16 },

  // Objects
  house:      { key: 'farm:house',        url: 'assets/farm-rpg/Objects/House.png' },
  interior:   { key: 'farm:interior',     url: 'assets/farm-rpg/Objects/Interior.png' },
  crops:      { key: 'farm:crops',        url: 'assets/farm-rpg/Objects/Spring Crops.png', frameWidth: 16, frameHeight: 16 },
  tree:       { key: 'farm:tree',         url: 'assets/farm-rpg/Objects/Maple Tree.png' },
  fence:      { key: 'farm:fence',        url: "assets/farm-rpg/Objects/Fence's copiar.png" },
  road:       { key: 'farm:road',         url: 'assets/farm-rpg/Objects/Road copiar.png' },
  chest:      { key: 'farm:chest',        url: 'assets/farm-rpg/Objects/chest.png' },

  // Farm animals
  chickYellow: { key: 'farm:chick-yellow', url: 'assets/farm-rpg/Farm Animals/Baby Chicken Yellow.png', frameWidth: 16, frameHeight: 16 },
  chickGreen:  { key: 'farm:chick-green',  url: 'assets/farm-rpg/Farm Animals/Chicken Blonde  Green.png', frameWidth: 16, frameHeight: 16 },
  chickRed:    { key: 'farm:chick-red',    url: 'assets/farm-rpg/Farm Animals/Chicken Red.png', frameWidth: 16, frameHeight: 16 },
  cowFemale:   { key: 'farm:cow-female',   url: 'assets/farm-rpg/Farm Animals/Female Cow Brown.png', frameWidth: 16, frameHeight: 16 },
  cowMale:     { key: 'farm:cow-male',     url: 'assets/farm-rpg/Farm Animals/Male Cow Brown.png', frameWidth: 16, frameHeight: 16 },
};

const LOADING_TIPS = [
  'Tip: Talk to everyone — even the quiet ones have stories.',
  'Tip: Crops grow faster when the soil is watered daily.',
  'Tip: Try fishing on rainy days for rare catches.',
  'Tip: Press ESC in-game to open the journal.',
  'Tip: Your dog loves you. Pet them.',
];

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    const totalAssets = Object.keys(ASSETS).length;
    let loaded = 0;

    // Progress bar driven by Phaser's actual loader
    this.load.on('progress', (value) => {
      if (this.progressFill) {
        this.progressFill.width = Math.max(1, Math.round(value * (this.barW - 2)));
      }
    });

    this.load.on('filecomplete', () => {
      loaded++;
    });

    // Load all Farm RPG assets
    for (const asset of Object.values(ASSETS)) {
      if (asset.frameWidth) {
        this.load.spritesheet(asset.key, asset.url, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
        });
      } else {
        this.load.image(asset.key, asset.url);
      }
    }
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Sky backdrop
    this.add.rectangle(w / 2, h / 2, w, h, PALETTE.skyMid, 1).setDepth(-10);

    // Title plate
    this.add.rectangle(w / 2, h / 2 - 80, 460, 96, PALETTE.uiPanel, 1)
      .setStrokeStyle(3, PALETTE.uiBorder, 1);
    this.add.text(w / 2, h / 2 - 80, 'HIVALLEY', {
      fontFamily: 'monospace',
      fontSize: '42px',
      color: '#f3e9c8',
      align: 'center',
      stroke: '#1a0f08',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Loading bar background
    this.barW = 360;
    const barH = 18;
    const barX = (w - this.barW) / 2;
    const barY = h / 2 + 40;

    this.add.rectangle(barX - 2, barY - 2, this.barW + 4, barH + 4, 0x1a0f08, 1)
      .setOrigin(0, 0);
    this.add.rectangle(barX, barY, this.barW, barH, 0x2a1a0e, 1)
      .setOrigin(0, 0);

    this.progressFill = this.add
      .rectangle(barX + 1, barY + 1, 1, barH - 2, PALETTE.uiAccent, 1)
      .setOrigin(0, 0);

    this.add.text(w / 2, barY + barH + 12, 'Loading the farm...', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#f3e9c8',
    }).setOrigin(0.5);

    // Rotating tip
    this.tipText = this.add.text(w / 2, h - 30, LOADING_TIPS[0], {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffc857',
      align: 'center',
      wordWrap: { width: w - 60 },
    }).setOrigin(0.5);

    let tipIdx = 0;
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        tipIdx = (tipIdx + 1) % LOADING_TIPS.length;
        this.tweens.add({
          targets: this.tipText,
          alpha: 0,
          duration: 200,
          onComplete: () => {
            this.tipText.setText(LOADING_TIPS[tipIdx]);
            this.tweens.add({ targets: this.tipText, alpha: 1, duration: 200 });
          },
        });
      },
    });

    // ----- Post-load setup -----
    // Create character animations now that spritesheets are loaded.
    this.createAnimations();

    // Also generate procedural fallback textures (in case some assets failed).
    try {
      generateAllTextures(this);
    } catch (err) {
      console.warn('Procedural texture generation failed (non-fatal):', err);
    }

    // Transition to menu
    this.time.delayedCall(500, () => {
      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MainMenuScene');
      });
    });

    // Hint the user that a click will enable music
    const soundHint = this.add.text(w / 2, h - 12, 'Click anywhere to enable music', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#7a6a55',
    }).setOrigin(0.5);

    this.input.once('pointerdown', () => {
      unlockAudio();
      setMuted(false);
      playHover();
      soundHint.setVisible(false);
    });
  }

  // Create reusable sprite animations from the loaded Farm RPG sheets.
  createAnimations() {
    const anims = this.anims;

    // --- Character idle (128x96 = 8 cols x 3 rows, frame 16x32) ---
    // Row 0: down, Row 1: left, Row 2: right. Each row has 4 frames.
    if (!anims.exists('farm:idle-down')) {
      anims.create({ key: 'farm:idle-down',   frames: anims.generateFrameNumbers('farm:char-idle', { start: 0, end: 3 }),  frameRate: 4, repeat: -1 });
      anims.create({ key: 'farm:idle-left',   frames: anims.generateFrameNumbers('farm:char-idle', { start: 8, end: 11 }), frameRate: 4, repeat: -1 });
      anims.create({ key: 'farm:idle-right',  frames: anims.generateFrameNumbers('farm:char-idle', { start: 16, end: 19 }), frameRate: 4, repeat: -1 });
    }

    // --- Character walk (192x96 = 12 cols x 3 rows, frame 16x32) ---
    // Row 0: down, Row 1: left, Row 2: right. Each row has 6 frames.
    if (!anims.exists('farm:walk-down')) {
      anims.create({ key: 'farm:walk-down',  frames: anims.generateFrameNumbers('farm:char-walk', { start: 0, end: 5 }),  frameRate: 8, repeat: -1 });
      anims.create({ key: 'farm:walk-left',  frames: anims.generateFrameNumbers('farm:char-walk', { start: 12, end: 17 }), frameRate: 8, repeat: -1 });
      anims.create({ key: 'farm:walk-right', frames: anims.generateFrameNumbers('farm:char-walk', { start: 24, end: 29 }), frameRate: 8, repeat: -1 });
    }

    // --- Chicken idle (64x32 = 4 cols x 2 rows) ---
    if (!anims.exists('farm:chick-green-idle')) {
      anims.create({ key: 'farm:chick-green-idle',  frames: anims.generateFrameNumbers('farm:chick-green',  { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
      anims.create({ key: 'farm:chick-red-idle',    frames: anims.generateFrameNumbers('farm:chick-red',    { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
    }

    // --- Baby chicken (64x48 = 4 cols x 3 rows) ---
    if (!anims.exists('farm:chick-yellow-idle')) {
      anims.create({ key: 'farm:chick-yellow-idle', frames: anims.generateFrameNumbers('farm:chick-yellow', { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
    }

    // --- Cow idle (128x96 = 8 cols x 6 rows, similar to character) ---
    if (!anims.exists('farm:cow-female-idle')) {
      anims.create({ key: 'farm:cow-female-idle', frames: anims.generateFrameNumbers('farm:cow-female', { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
      anims.create({ key: 'farm:cow-male-idle',   frames: anims.generateFrameNumbers('farm:cow-male',   { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
    }

    // --- Crops growth stages (224x128 = 14 cols x 8 rows, 16x16 each) ---
    // We'll create per-stage keys for farming logic later.
    // For now just confirm the texture loaded.
  }
}
