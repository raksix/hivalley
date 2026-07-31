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

// Map dimensions in tiles (16x16 each)
const MAP_COLS = 30;
const MAP_ROWS = 18;
const TILE = 16;
const MAP_W = MAP_COLS * TILE; // 480
const MAP_H = MAP_ROWS * TILE; // 288

// Player movement speed (pixels per second)
const PLAYER_SPEED = 80;

// Farm RPG tileset indices (12 cols x 20 rows = 240 tiles)
//
// Pixel analysis results — only solid, fully-filled tiles are used:
//   Frame 33 (R2C9): 256/256 visible, avg=(121,191,86) — PURE GREEN GRASS
//   Frame 225 (R18C9): 256/256 visible, avg=(121,191,86) — same green
//   Frame 116 (R9C8): 256/256 visible, avg=(195,155,79) — brown dirt
//   Frame 117 (R9C9): 256/256 visible, avg=(221,155,80) — brown dirt
//   Frame 106 (R8C10): 256/256 visible, avg=(195,155,79) — tilled soil
//   Frame 129 (R10C9): 256/256 visible, avg=(237,156,81) — tilled soil
//   Frame 130 (R10C10): 256/256 visible, avg=(221,155,80) — tilled soil
//
// Frames 0-7, 9, 12-19, 23-32 etc. are BLACK or transparent — NOT usable.
// Frames 8, 10, 11, 20, 21 have internal edge patterns causing maze-like
// appearance when tiled — AVOIDED.
const GRASS = 33;           // Solid green fill — the ONLY grass tile
const GRASS_ALT = 225;      // Same green, different row — for subtle variation
const PATH_A = 116;         // R9C8 — brown dirt
const PATH_B = 117;         // R9C9 — brown dirt
const TILLED_A = 106;       // R8C10 — brown tilled soil
const TILLED_B = 129;       // R10C9 — brown tilled soil
const TILLED_C = 130;       // R10C10 — brown tilled soil

// Water tiles (Farm RPG tileset has NO blue tiles)
// Using a solid teal-green tile to represent water visually
// Frame 47 (R3C11) — we'll tint it blue via setTint on the sprite
const WATER_FILL = 33;      // Reuse green base, will tint blue

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
    this.cameras.main.setBackgroundColor('#4a8c3f');

    // --- Tile map ---
    this.buildMap();

    // --- Player character ---
    this.buildPlayer();

    // --- HUD ---
    this.buildHUD(player);

    // --- Camera setup ---
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

    // Helper: place a Farm RPG tileset tile
    const placeTile = (col, row, frame, depth = 0) => {
      const x = col * TILE + TILE / 2;
      const y = row * TILE + TILE / 2;
      const img = this.add.image(x, y, 'farm:tileset', frame)
        .setOrigin(0.5, 0.5)
        .setDepth(depth);
      this.mapContainer.add(img);
      return img;
    };

    // Seeded PRNG for subtle grass variation
    let seed = 12345;
    const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };

    // ---- 1. Grass ground (entire map) ----
    // Uses ONLY solid green frames (33 and 225) to avoid maze-like patterns.
    // ~90% GRASS (frame 33), ~10% GRASS_ALT (frame 225) for subtle variation.
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const v = rng();
        const frame = (v % 10 === 0) ? GRASS_ALT : GRASS;
        placeTile(c, r, frame, 0);
      }
    }

    // ---- 2. Dirt path (row 9, cols 4–25) ----
    for (let c = 4; c <= 25; c++) {
      placeTile(c, 9, PATH_A, 0);
    }

    // ---- 3. Tilled soil (rows 5–7, two farm plots) ----
    const tilledFrames = [TILLED_A, TILLED_B, TILLED_C];
    for (let r = 5; r <= 7; r++) {
      let idx = 0;
      for (let c = 6; c <= 12; c++) {
        placeTile(c, r, tilledFrames[idx % tilledFrames.length], 0);
        idx++;
      }
      for (let c = 17; c <= 23; c++) {
        placeTile(c, r, tilledFrames[idx % tilledFrames.length], 0);
        idx++;
      }
    }

    // ---- 4. Water pond (rows 13–16, cols 24–28) ----
    // Farm RPG tileset has no blue tiles. We tint green tiles blue to
    // represent water visually.
    for (let r = 13; r <= 16; r++) {
      for (let c = 24; c <= 28; c++) {
        const x = c * TILE + TILE / 2;
        const y = r * TILE + TILE / 2;
        const img = this.add.image(x, y, 'farm:tileset', GRASS)
          .setOrigin(0.5, 0.5)
          .setDepth(0)
          .setTint(0x3388cc);
        this.mapContainer.add(img);
      }
    }

    // ---- 5. Farm objects ----
    this.house = this.add.image(400, 32, 'farm:house').setOrigin(0.5, 1).setDepth(1);
    this.mapContainer.add(this.house);

    this.tree = this.add.image(60, 24, 'farm:tree').setOrigin(0.5, 1).setDepth(1);
    this.mapContainer.add(this.tree);

    this.fence = this.add.image(160, 70, 'farm:fence').setOrigin(0.5, 1).setDepth(1);
    this.mapContainer.add(this.fence);

    this.chest = this.add.image(360, 55, 'farm:chest').setOrigin(0.5, 1).setDepth(2);
    this.mapContainer.add(this.chest);
  }

  // ===================== PLAYER =====================
  buildPlayer() {
    const startX = 240;
    const startY = 150;

    this.player = this.add.sprite(startX, startY, 'farm:char-idle', 0)
      .setDepth(10);

    this.mapContainer.add(this.player);

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
    this.add.rectangle(0, 0, 200, 36, PALETTE.uiPanel, 0.85)
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
      color: '#f3e9c8',
      stroke: '#1a0f08',
      strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);

    // Controls hint
    this.add.text(w - 8, 8, 'WASD / Arrows', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#7a6a55',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
  }

  // ===================== INTERACTION =====================
  handleInteract() {
    // Check proximity to interactable objects
    if (this.chest && Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this.chest.x, this.chest.y) < 40) {
      this.showMessage('You found a rusty chest! It\'s locked...');
      return;
    }
    if (this.house && Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this.house.x, this.house.y) < 50) {
      this.showMessage('The farmhouse. It looks cozy inside.');
      return;
    }
  }

  showMessage(text) {
    if (this.msgText) this.msgText.destroy();
    if (this.msgBg) this.msgBg.destroy();

    const w = this.scale.width;
    const h = this.scale.height;

    this.msgBg = this.add.rectangle(w / 2, h - 50, w - 40, 30, PALETTE.uiPanel, 0.9)
      .setScrollFactor(0).setDepth(200);
    this.msgText = this.add.text(w / 2, h - 50, text, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#f3e9c8',
      wordWrap: { width: w - 60 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.time.delayedCall(3000, () => {
      if (this.msgText) this.msgText.destroy();
      if (this.msgBg) this.msgBg.destroy();
      this.msgText = null;
      this.msgBg = null;
    });
  }

  // ===================== SLEEP UTILITY =====================
  sleep(ms) {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }

  // ===================== UPDATE =====================
  update(_time, delta) {
    let vx = 0;
    let vy = 0;
    let newFacing = this.facing;
    let moving = false;

    // Horizontal
    if (this.cursors.left.isDown || this.keys.a.isDown) {
      vx = -PLAYER_SPEED;
      newFacing = 'left';
      moving = true;
    } else if (this.cursors.right.isDown || this.keys.d.isDown) {
      vx = PLAYER_SPEED;
      newFacing = 'right';
      moving = true;
    }

    // Vertical
    if (this.cursors.up.isDown || this.keys.w.isDown) {
      vy = -PLAYER_SPEED;
      newFacing = 'up';
      moving = true;
    } else if (this.cursors.down.isDown || this.keys.s.isDown) {
      vy = PLAYER_SPEED;
      newFacing = 'down';
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
      const walkKey = `farm:walk-${newFacing}`;
      if (this.anims.exists(walkKey) && (!this.isMoving || this.player.anims.currentAnim?.key !== walkKey)) {
        this.player.play(walkKey);
      }
      this.isMoving = true;
    } else {
      if (this.isMoving) {
        const idleKey = `farm:idle-${newFacing}`;
        if (this.anims.exists(idleKey)) {
          this.player.play(idleKey);
        }
        this.isMoving = false;
      }
    }

    // Update name tag position
    this.nameTag.setPosition(this.player.x, this.player.y - 20);

    // Show interaction hint when near objects
    const nearAny =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, this.chest.x, this.chest.y) < 40 ||
      Phaser.Math.Distance.Between(this.player.x, this.player.y, this.house.x, this.house.y) < 50;
    this.interactHint.setAlpha(nearAny ? 1 : 0);
  }
}
