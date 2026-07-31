// HiValley — GameScene
//
// The main gameplay scene. Renders a tile map from the Farm RPG tileset,
// spawns the player character with walk/idle animations, and provides
// WASD / arrow-key movement. Includes a basic HUD with day counter and
// a small farm plot area the player can interact with.

import Phaser from 'phaser';
import { PlayerState } from '../state/PlayerState.js';
import { Button } from '../ui/Button.js';
import {
  startMenuMusic,
  stopMenuMusic,
  playHover,
  playConfirm,
  playCancel,
  playClick,
} from '../utils/menuMusic.js';
import { PALETTE } from '../utils/palette.js';
import { KENNEY_TILES, KENNEY_DECOR } from '../utils/kenneyTiles.js';

// Map dimensions in tiles (16x16 each)
const MAP_COLS = 30;
const MAP_ROWS = 18;
const TILE = 16;
const MAP_W = MAP_COLS * TILE; // 480
const MAP_H = MAP_ROWS * TILE; // 288

// Player movement speed (pixels per second)
const PLAYER_SPEED = 80;

// Tile indices from the tileset spritesheet (12 cols x 20 rows)
// Row 0-1: grass variations
// Row 2: dirt / tilled soil
// Row 3: water edge
// Row 4+: trees, flowers, etc.
const TILE_GRASS = 0;
const TILE_GRASS_ALT = 1;
const TILE_DIRT = 24;     // row 2, col 0
const TILE_TILLED = 25;   // row 2, col 1
const TILE_FLOWER = 48;   // row 4, col 0

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.save = data?.save ?? null;
  }

  create() {
    // Ensure canvas has keyboard focus so keydown events reach Phaser.
    if (this.game.canvas) this.game.canvas.focus();

    stopMenuMusic();

    const w = this.scale.width;
    const h = this.scale.height;

    const player = this.save?.player ?? PlayerState.get();
    this.playerData = player;

    // --- Background ---
    // ParallaxBackground is designed for menus and overlays the tile map.
    // Use a simple solid-color background for gameplay instead.
    this.cameras.main.setBackgroundColor('#4a8c3f');

    // --- Tile map ---
    this.buildMap();

    // --- Kenney Tiny Farm overlay (enriched ground & decorations) ---
    this.buildKenneyOverlay();

    // --- Player character ---
    this.buildPlayer();

    // --- HUD ---
    this.buildHUD(player);

    // --- Camera setup ---
    // Center camera on the player and constrain to map bounds.
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(Math.min(w / MAP_W, h / MAP_H) * 1.2);

    // --- Keyboard input ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // --- Interaction ---
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.interactKey.on('down', () => this.handleInteract());

    // ESC → back to menu
    this.input.keyboard.on('keydown-ESC', () => {
      startMenuMusic();
      this.scene.start('MainMenuScene');
    });

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  // ===================== MAP =====================
  buildMap() {
    this.mapContainer = this.add.container(0, 0);

    // Generate a simple procedural farmland layout
    // Grass everywhere, with a dirt path, farm plots, and some decorations.
    this.tileSprites = [];

    for (let row = 0; row < MAP_ROWS; row++) {
      this.tileSprites[row] = [];
      for (let col = 0; col < MAP_COLS; col++) {
        const x = col * TILE + TILE / 2;
        const y = row * TILE + TILE / 2;
        let frame = TILE_GRASS;

        // Dirt path (horizontal, row 9)
        if (row === 9 && col >= 4 && col <= 25) {
          frame = TILE_DIRT;
        }
        // Farm plots (rows 5-7, cols 6-12)
        else if (row >= 5 && row <= 7 && col >= 6 && col <= 12) {
          frame = TILE_TILLED;
        }
        // Second farm plot (rows 5-7, cols 17-23)
        else if (row >= 5 && row <= 7 && col >= 17 && col <= 23) {
          frame = TILE_TILLED;
        }
        // Scattered flowers
        else if (
          (row === 3 && col === 8) ||
          (row === 4 && col === 15) ||
          (row === 12 && col === 22) ||
          (row === 14 && col === 5)
        ) {
          frame = TILE_FLOWER;
        }
        // Grass variation
        else if ((row + col) % 5 === 0) {
          frame = TILE_GRASS_ALT;
        }

        const tile = this.add.image(x, y, 'farm:tileset', frame);
        tile.setOrigin(0.5);
        tile.setDepth(0);
        this.mapContainer.add(tile);
        this.tileSprites[row][col] = tile;
      }
    }

    // --- Farm objects ---
    // House (top-right area)
    this.house = this.add.image(400, 32, 'farm:house').setOrigin(0.5, 1).setDepth(1);
    this.mapContainer.add(this.house);

    // Tree (left side)
    this.tree = this.add.image(60, 24, 'farm:tree').setOrigin(0.5, 1).setDepth(1);
    this.mapContainer.add(this.tree);

    // Fence near farm plots
    this.fence = this.add.image(160, 70, 'farm:fence').setOrigin(0.5, 1).setDepth(1);
    this.mapContainer.add(this.fence);

    // Chest near house
    this.chest = this.add.image(360, 55, 'farm:chest').setOrigin(0.5, 1).setDepth(2);
    this.mapContainer.add(this.chest);
  }

  // ===================== KENNEY OVERLAY =====================
  // Overlay adds richness on top of the base Farm RPG tiles:
  //  - Stone path (instead of plain dirt path)
  //  - Tilled-soil variations with hoe lines
  //  - A small pond in the SE corner
  //  - Wood plank border at top/bottom edges
  //  - Decorative flowers & tufts scattered on grass
  //  - New objects: bush, crate, big tree, barrel, lantern, well
  //
  // Source: Kenney Tiny Farm (CC0) — https://kenney.nl/assets/tiny-farm
  buildKenneyOverlay() {
    if (!this.textures.exists('farm:kenney-tiles')) return;

    const K = KENNEY_TILES;
    const place = (col, row, frame, origin = KENNEY_DECOR.CENTER) => {
      const x = col * TILE + TILE / 2;
      const y = row * TILE + TILE / 2;
      const img = this.add.image(x, y, 'farm:kenney-tiles', frame).setOrigin(origin.x, origin.y);
      img.setDepth(0);
      this.mapContainer.add(img);
      return img;
    };
    const placeStand = (col, row, frame) => place(col, row, frame, KENNEY_DECOR.STAND);

    // ---- Wood plank border (top + bottom rows) ----
    for (let c = 0; c < MAP_COLS; c++) {
      place(c, 0, K.WOOD_PLANK_H);
      place(c, MAP_ROWS - 1, K.WOOD_PLANK_H);
    }
    // Vertical wood edges
    for (let r = 1; r < MAP_ROWS - 1; r++) {
      place(0, r, K.WOOD_PLANK_V);
      place(MAP_COLS - 1, r, K.WOOD_PLANK_V);
    }

    // ---- Stone path (replace base dirt at row 9) ----
    for (let c = 4; c <= 25; c++) {
      let frame = K.PATH_HORIZ;
      if (c === 4) frame = K.PATH_CORNER_NW === undefined ? K.PATH_HORIZ : K.PATH_HORIZ;
      place(c, 9, frame);
    }

    // ---- Tilled soil variations (rows 5–7, cols 6–12) ----
    const tilledSeq = [K.TILLED_A, K.TILLED_B, K.TILLED_C, K.TILLED_D, K.TILLED_E];
    for (let r = 5; r <= 7; r++) {
      for (let c = 6; c <= 12; c++) {
        const idx = (r * 7 + c) % tilledSeq.length;
        place(c, r, tilledSeq[idx]);
      }
    }

    // ---- Tilled soil (rows 5–7, cols 17–23) ----
    const tilledSeq2 = [K.TILLED_F, K.TILLED_G, K.TILLED_H, K.TILLED_A, K.TILLED_B];
    for (let r = 5; r <= 7; r++) {
      for (let c = 17; c <= 23; c++) {
        const idx = (r * 5 + c) % tilledSeq2.length;
        place(c, r, tilledSeq2[idx]);
      }
    }

    // ---- Pond in the SE corner (rows 13–15, cols 24–28) ----
    for (let r = 13; r <= 15; r++) {
      for (let c = 24; c <= 28; c++) {
        const frame =
          K.WATER_A + ((r * 5 + c) % 8); // cycle through WATER_A..WATER_H
        place(c, r, frame);
      }
    }

    // ---- Grass detail (decorative flowers & tufts) ----
    // Avoid placing them on path (row 9), planks (rows 0/17), water (rows 13-15 cols 24-28),
    // tilled-soil areas, or where objects sit.
    const skipRows = new Set([0, 9, 17]);
    const inTilled = (r, c) =>
      (r >= 5 && r <= 7 && ((c >= 6 && c <= 12) || (c >= 17 && c <= 23)));
    const inWater = (r, c) => r >= 13 && r <= 15 && c >= 24 && c <= 28;
    const reserved = new Set([
      ['3', '15'], ['4', '5'], ['12', '22'], ['14', '5'], // base flower spots
      ['2', '26'], ['2', '27'], ['2', '28'], ['2', '29'], // house/shrubs area
    ]);

    const decorFlowers = [
      K.GRASS_FLOWER_A, K.GRASS_FLOWER_B, K.GRASS_FLOWER_C,
      K.GRASS_FLOWER_RED, K.GRASS_FLOWER_YELLOW, K.GRASS_FLOWER_BLUE,
      K.GRASS_TUFT_A, K.GRASS_TUFT_B, K.GRASS_TUFT_C, K.GRASS_TUFT_D,
      K.GRASS_ROCK_A, K.GRASS_ROCK_B, K.MUSHROOM,
    ];
    let decorSeed = 7;
    for (let r = 1; r < MAP_ROWS - 1; r++) {
      if (skipRows.has(r)) continue;
      for (let c = 1; c < MAP_COLS - 1; c++) {
        if (inTilled(r, c) || inWater(r, c)) continue;
        if (reserved.has(`${r},${c}`)) continue;
        // Sparse deterministic placement (~ every 5 tiles)
        decorSeed = (decorSeed * 1103515245 + 12345) & 0x7fffffff;
        if (decorSeed % 5 !== 0) continue;
        const frame = decorFlowers[decorSeed % decorFlowers.length];
        place(c, r, frame);
      }
    }

    // ---- New decorations (decorative objects) ----
    // Bush (right side, row 4)
    this.bush1 = placeStand(26, 4, K.BUSH_GREEN_A);
    this.bush2 = placeStand(27, 4, K.BUSH_FLOWER);
    this.bush3 = placeStand(2, 11, K.BUSH_BERRY);

    // Crate (next to house)
    this.crate1 = placeStand(22, 10, K.CRATE_WOOD);
    this.crate2 = placeStand(5, 10, K.BARREL);

    // Barrel near path
    this.barrel1 = placeStand(13, 10, K.BARREL_LIE);

    // Lantern (decorative lighting) near house
    this.lantern1 = placeStand(20, 9, K.LANTERN);

    // Well (center of farm plots)
    this.well1 = placeStand(14, 6, K.WELL);

    // Sapling pine (top-left corner area)
    this.pineYoung = placeStand(4, 2, K.TREE_PINE);

    // ---- Fence segments along the tilled plots ----
    // South fence of the first plot (row 8, cols 6–12)
    for (let c = 6; c <= 12; c++) {
      place(c, 8, K.FENCE_H, KENNEY_DECOR.STAND);
    }
    // North fence of the second plot (row 4, cols 17–23)
    for (let c = 17; c <= 23; c++) {
      place(c, 4, K.FENCE_H, KENNEY_DECOR.STAND);
    }
  }

  // ===================== PLAYER =====================
  buildPlayer() {
    const startX = MAP_W / 2;
    const startY = 9 * TILE + TILE / 2; // On the dirt path

    this.player = this.add.sprite(startX, startY, 'farm:char-idle', 0);
    this.player.setOrigin(0.5);
    this.player.setDepth(10);
    this.player.setScale(2);

    // Start with idle-down animation
    this.player.play('farm:idle-down');

    // Track facing direction
    this.facing = 'down';
    this.isMoving = false;

    // Name tag above character
    this.nameTag = this.add.text(startX, startY - 20, this.playerData.name || 'Farmer', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#f3e9c8',
      stroke: '#1a0f08',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11);
  }

  // ===================== HUD =====================
  buildHUD(player) {
    const w = this.scale.width;
    const h = this.scale.height;

    // Day / season / time display (top-left)
    const day = this.save?.world?.day ?? 1;
    const hudBg = this.add.rectangle(0, 0, 200, 36, PALETTE.uiPanel, 0.85)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(100);
    this.add.rectangle(0, 0, 200, 36)
      .setOrigin(0, 0).setStrokeStyle(2, PALETTE.uiBorder, 1).setScrollFactor(0).setDepth(100);

    this.add.text(10, 6, `Day ${day}`, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#f3e9c8',
      stroke: '#1a0f08',
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(101);

    this.add.text(10, 22, `Spring  •  ${player.name || 'Wanderer'}`, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#ffc857',
    }).setScrollFactor(0).setDepth(101);

    // Interaction hint (bottom)
    this.interactHint = this.add.text(w / 2, h - 16, '[E] Interact', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffc857',
      stroke: '#1a0f08',
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setAlpha(0);

    // Sleep button (top-right)
    this.sleepBtn = new Button(this, w - 80, 18, {
      text: 'Sleep',
      scale: 2,
      onClick: () => this.sleep(),
    });
    this.sleepBtn.setScrollFactor(0).setDepth(101);
  }

  // ===================== INTERACTION =====================
  handleInteract() {
    const px = this.player.x;
    const py = this.player.y;

    // Check proximity to objects
    const nearChest = Phaser.Math.Distance.Between(px, py, this.chest.x, this.chest.y) < 40;
    const nearHouse = Phaser.Math.Distance.Between(px, py, this.house.x, this.house.y) < 50;

    if (nearChest) {
      this.showMessage('You found some seeds in the chest!');
      playConfirm();
    } else if (nearHouse) {
      this.showMessage('Your cozy farmhouse. Rest awaits inside.');
      playHover();
    } else {
      this.showMessage('Nothing to interact with here.');
      playCancel();
    }
  }

  showMessage(text) {
    if (this.msgText) this.msgText.destroy();
    if (this.msgBg) this.msgBg.destroy();

    const w = this.scale.width;
    const h = this.scale.height;

    this.msgBg = this.add.rectangle(w / 2, h - 50, 400, 28, PALETTE.uiPanel, 0.9)
      .setScrollFactor(0).setDepth(200);
    this.msgText = this.add.text(w / 2, h - 50, text, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#f3e9c8',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    // Auto-hide after 2.5 seconds
    this.time.delayedCall(2500, () => {
      if (this.msgText) {
        this.tweens.add({ targets: [this.msgText, this.msgBg], alpha: 0, duration: 300, onComplete: () => {
          this.msgText?.destroy();
          this.msgBg?.destroy();
          this.msgText = null;
          this.msgBg = null;
        }});
      }
    });
  }

  sleep() {
    playConfirm();
    if (this.save) {
      this.save.world.day = (this.save.world.day ?? 1) + 1;
      this.save.updatedAt = Date.now();
      try {
        const KEY = 'hivalley.save.' + (this.save.__slotName || 'slot1');
        localStorage.setItem(KEY, JSON.stringify(this.save));
      } catch (_) {}
    }
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ save: this.save });
    });
  }

  // ===================== UPDATE =====================
  update(time, delta) {
    // Parallax background
    this.bg?.update(time, delta, this._pointer);

    // Player movement
    let vx = 0;
    let vy = 0;
    let moving = false;
    let newFacing = this.facing;

    if (this.cursors.left.isDown || this.keys.a.isDown) {
      vx = -PLAYER_SPEED;
      newFacing = 'left';
      moving = true;
    } else if (this.cursors.right.isDown || this.keys.d.isDown) {
      vx = PLAYER_SPEED;
      newFacing = 'right';
      moving = true;
    }

    if (this.cursors.up.isDown || this.keys.w.isDown) {
      vy = -PLAYER_SPEED;
      newFacing = 'up';
      moving = true;
    } else if (this.cursors.down.isDown || this.keys.s.isDown) {
      vy = PLAYER_SPEED;
      newFacing = 'down';
      moving = true;
    }

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    // Apply velocity
    this.player.x += vx * (delta / 1000);
    this.player.y += vy * (delta / 1000);

    // Clamp to map bounds
    this.player.x = Phaser.Math.Clamp(this.player.x, 8, MAP_W - 8);
    this.player.y = Phaser.Math.Clamp(this.player.y, 8, MAP_H - 8);

    // Update facing and animation
    this.facing = newFacing;
    if (moving) {
      if (!this.isMoving || this.player.anims.currentAnim?.key !== `farm:walk-${newFacing}`) {
        this.player.play(`farm:walk-${newFacing}`);
      }
      this.isMoving = true;
    } else {
      if (this.isMoving) {
        this.player.play(`farm:idle-${newFacing}`);
        this.isMoving = false;
      }
    }

    // Update name tag position
    this.nameTag.setPosition(this.player.x, this.player.y - 20);

    // Show interaction hint when near objects (base objects + Kenney additions)
    const nearAny =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, this.chest.x, this.chest.y) < 40 ||
      Phaser.Math.Distance.Between(this.player.x, this.player.y, this.house.x, this.house.y) < 50 ||
      (this.crate1 && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.crate1.x, this.crate1.y) < 32) ||
      (this.well1 && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.well1.x, this.well1.y) < 32) ||
      (this.lantern1 && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.lantern1.x, this.lantern1.y) < 32);
    this.interactHint.setAlpha(nearAny ? 1 : 0);
  }
}
