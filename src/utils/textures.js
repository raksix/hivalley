// HiValley — procedural pixel-art texture generator.
// Creates and caches runtime textures (no external image assets).
//
// Uses Canvas 2D API for all texture generation (reliable across all
// browsers and WebGL backends). Phaser's built-in Graphics.generateTexture()
// and RenderTexture.saveTexture() produce corrupt artifacts in some
// environments, so we draw directly onto CanvasTexture instances.

import Phaser from 'phaser';
import { PALETTE } from './palette.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KEY_PREFIX = 'gen:';
const key = (name) => KEY_PREFIX + name;

/** Convert a 0xRRGGBB int to a CSS "rgb(r,g,b)" string. */
function hexToRgb(hex) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `rgb(${r},${g},${b})`;
}

/** Convert a 0xRRGGBB int + alpha (0-1) to a CSS "rgba(r,g,b,a)" string. */
function hexToRgba(hex, a) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}

/** Linearly interpolate between two 0xRRGGBB colors. */
function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const gC = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gC << 8) | bl;
}

/**
 * Create a CanvasTexture and return its 2D drawing context.
 * If the key already exists, returns the existing canvas context.
 */
const _canvasCache = new Map(); // name → CanvasRenderingContext2D

function openCanvas(scene, name, w, h) {
  const k = key(name);

  // If we already have the context cached from a previous call, reuse it
  if (_canvasCache.has(name)) {
    return { ctx: _canvasCache.get(name), k };
  }

  // If the texture already exists, try to get its canvas context.
  // Phaser CanvasTexture stores .canvas and .context.
  if (scene.textures.exists(k)) {
    const tex = scene.textures.get(k);
    if (tex.context) {
      _canvasCache.set(name, tex.context);
      return { ctx: tex.context, k };
    }
    if (tex.canvas && typeof tex.canvas.getContext === 'function') {
      const ctx = tex.canvas.getContext('2d');
      _canvasCache.set(name, ctx);
      return { ctx, k };
    }
    // Texture exists but is not a canvas — remove it and recreate
    scene.textures.remove(k);
  }

  const ct = scene.textures.createCanvas(k, w, h);
  _canvasCache.set(name, ct.context);
  return { ctx: ct.context, k, ct };
}

/** Finish a canvas texture so Phaser can use it. */
function closeCanvas(scene, name) {
  const tex = scene.textures.get(key(name));
  if (tex && tex.refresh) tex.refresh();
}

// ---------------------------------------------------------------------------
// Primitive draw helpers (Canvas 2D)
// ---------------------------------------------------------------------------

function cFillRect(ctx, x, y, w, h, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = hexToRgb(color);
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
}

function cStrokeRect(ctx, x, y, w, h, color, lineWidth = 1) {
  ctx.strokeStyle = hexToRgb(color);
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(x, y, w, h);
}

function cFillCircle(ctx, cx, cy, r, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = hexToRgb(color);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function cFillTriangle(ctx, x1, y1, x2, y2, x3, y3, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = hexToRgb(color);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Pixel-grid texture (used by cursor, heart, coin, sparkle, logo, cloud …)
// ---------------------------------------------------------------------------

function drawPixelGrid(scene, name, w, h, grid) {
  const { ctx } = openCanvas(scene, name, w, h);

  for (let y = 0; y < h; y++) {
    const row = grid[y];
    if (!row) continue;
    for (let x = 0; x < w; x++) {
      const v = row[x];
      if (v == null) continue;
      ctx.fillStyle = hexToRgb(v);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  closeCanvas(scene, name);
}

// Simple solid-color rectangle texture
function fillRect(scene, name, w, h, color) {
  const { ctx } = openCanvas(scene, name, w, h);
  ctx.fillStyle = hexToRgb(color);
  ctx.fillRect(0, 0, w, h);
  closeCanvas(scene, name);
}

// ---------------------------------------------------------------------------
// Sky gradient (full-screen)
// ---------------------------------------------------------------------------

function buildSky(scene) {
  const W = 960;
  const H = 540;
  const { ctx } = openCanvas(scene, 'sky-bg', W, H);

  for (let y = 0; y < H; y++) {
    const t = y / H;
    let c;
    if (t < 0.5) {
      c = lerpColor(PALETTE.skyTop, PALETTE.skyMid, t / 0.5);
    } else {
      c = lerpColor(PALETTE.skyMid, PALETTE.skyBot, (t - 0.5) / 0.5);
    }
    ctx.fillStyle = hexToRgb(c);
    ctx.fillRect(0, y, W, 1);
  }

  closeCanvas(scene, 'sky-bg');
}

// ---------------------------------------------------------------------------
// Sun
// ---------------------------------------------------------------------------

function buildSun(scene) {
  const { ctx } = openCanvas(scene, 'sun', 32, 32);

  cFillCircle(ctx, 16, 16, 14, 0xfff1a8, 0.35);
  cFillCircle(ctx, 16, 16, 16, 0xfff1a8, 0.2);
  cFillCircle(ctx, 16, 16, 10, 0xfff1a8, 1);
  cFillCircle(ctx, 16, 16, 6, PALETTE.white, 0.85);
  cFillCircle(ctx, 14, 14, 3, PALETTE.white, 1);

  closeCanvas(scene, 'sun');
}

// ---------------------------------------------------------------------------
// Cloud
// ---------------------------------------------------------------------------

function buildCloud(scene) {
  const W = 64;
  const H = 24;
  const grid = [];
  for (let y = 0; y < H; y++) grid.push(new Array(W).fill(null));

  const place = (x, y, c) => {
    if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = c;
  };

  // Bottom shadow
  for (let x = 6; x < 58; x++) place(x, 19, PALETTE.cloudShadow);
  for (let x = 10; x < 54; x++) place(x, 20, PALETTE.cloudShadow);

  // Body blobs
  const drawBlob = (cx, cy, rx, ry) => {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        if (d <= 1) place(cx + x, cy + y, PALETTE.cloud);
      }
    }
  };
  drawBlob(10, 14, 6, 5);
  drawBlob(20, 10, 8, 7);
  drawBlob(32, 8, 10, 8);
  drawBlob(44, 10, 8, 7);
  drawBlob(54, 14, 6, 5);
  for (let x = 6; x < 58; x++) {
    place(x, 16, PALETTE.cloud);
    place(x, 17, PALETTE.cloud);
    place(x, 18, PALETTE.cloud);
  }

  drawPixelGrid(scene, 'cloud', W, H, grid);
}

// ---------------------------------------------------------------------------
// Mountain
// ---------------------------------------------------------------------------

function buildMountain(scene) {
  const W = 960;
  const H = 200;
  const { ctx } = openCanvas(scene, 'mountain', W, H);

  // Far mountains
  ctx.fillStyle = hexToRgb(PALETTE.mountainFar);
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, 140);
  ctx.lineTo(80, 60);
  ctx.lineTo(160, 100);
  ctx.lineTo(240, 40);
  ctx.lineTo(360, 80);
  ctx.lineTo(440, 30);
  ctx.lineTo(540, 70);
  ctx.lineTo(620, 50);
  ctx.lineTo(720, 90);
  ctx.lineTo(800, 45);
  ctx.lineTo(880, 75);
  ctx.lineTo(960, 55);
  ctx.lineTo(960, H);
  ctx.closePath();
  ctx.fill();

  // Snow caps (far)
  ctx.fillStyle = hexToRgb(PALETTE.mountainSnow);
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(230, 50);
  ctx.lineTo(240, 40);
  ctx.lineTo(250, 50);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(430, 40);
  ctx.lineTo(440, 30);
  ctx.lineTo(450, 40);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(790, 55);
  ctx.lineTo(800, 45);
  ctx.lineTo(810, 55);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Near mountains
  ctx.fillStyle = hexToRgb(PALETTE.mountainNear);
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, 160);
  ctx.lineTo(120, 100);
  ctx.lineTo(200, 130);
  ctx.lineTo(320, 80);
  ctx.lineTo(480, 110);
  ctx.lineTo(560, 70);
  ctx.lineTo(680, 100);
  ctx.lineTo(780, 85);
  ctx.lineTo(880, 110);
  ctx.lineTo(960, 95);
  ctx.lineTo(960, H);
  ctx.closePath();
  ctx.fill();

  // Snow caps (near)
  ctx.fillStyle = hexToRgb(PALETTE.mountainSnow);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(310, 90);
  ctx.lineTo(320, 80);
  ctx.lineTo(330, 90);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(550, 80);
  ctx.lineTo(560, 70);
  ctx.lineTo(570, 80);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  closeCanvas(scene, 'mountain');
}

// ---------------------------------------------------------------------------
// Grass tile (32x32)
// ---------------------------------------------------------------------------

function buildGrassTile(scene) {
  const W = 32;
  const H = 32;
  const { ctx } = openCanvas(scene, 'grass-tile', W, H);

  ctx.fillStyle = hexToRgb(PALETTE.grassDark);
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = hexToRgb(PALETTE.grassLight);
  for (let x = 0; x < W; x += 2) {
    ctx.fillRect(x, Math.floor(Math.random() * H), 1, 1);
  }

  ctx.fillStyle = hexToRgba(PALETTE.grassShadow, 0.6);
  for (let x = 0; x < W; x += 4) {
    ctx.fillRect(x, (x * 7) % H, 1, 1);
  }

  closeCanvas(scene, 'grass-tile');
}

// ---------------------------------------------------------------------------
// Path tile (32x32)
// ---------------------------------------------------------------------------

function buildPath(scene) {
  const W = 32;
  const H = 32;
  const { ctx } = openCanvas(scene, 'path-tile', W, H);

  ctx.fillStyle = hexToRgb(PALETTE.dirt);
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = hexToRgb(PALETTE.dirtDark);
  for (let i = 0; i < 12; i++) {
    ctx.fillRect(Math.floor(Math.random() * W), Math.floor(Math.random() * H), 1, 1);
  }

  ctx.fillStyle = hexToRgba(PALETTE.star, 0.18);
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(Math.floor(Math.random() * W), Math.floor(Math.random() * H), 1, 1);
  }

  closeCanvas(scene, 'path-tile');
}

// ---------------------------------------------------------------------------
// Water tile (32x32)
// ---------------------------------------------------------------------------

function buildWaterTile(scene) {
  const W = 32;
  const H = 32;
  const { ctx } = openCanvas(scene, 'water-tile', W, H);

  ctx.fillStyle = hexToRgb(PALETTE.waterBot);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = hexToRgb(PALETTE.waterMid);
  ctx.fillRect(0, 0, W, H / 2);
  ctx.fillStyle = hexToRgb(PALETTE.waterTop);
  for (let x = 0; x < W; x += 4) {
    ctx.fillRect(x, 4, 2, 1);
    ctx.fillRect(x + 2, 12, 2, 1);
    ctx.fillRect(x, 20, 2, 1);
    ctx.fillRect(x + 2, 28, 2, 1);
  }
  ctx.fillStyle = hexToRgba(PALETTE.waterFoam, 0.5);
  ctx.fillRect(2, 4, 4, 1);
  ctx.fillRect(12, 12, 4, 1);
  ctx.fillRect(20, 20, 4, 1);

  closeCanvas(scene, 'water-tile');
}

// ---------------------------------------------------------------------------
// Tree (oak, 64x80)
// ---------------------------------------------------------------------------

function buildTree(scene) {
  const W = 64;
  const H = 80;
  const { ctx } = openCanvas(scene, 'tree-oak', W, H);

  // Trunk
  ctx.fillStyle = hexToRgb(PALETTE.trunk);
  ctx.fillRect(28, 44, 8, 36);
  ctx.fillStyle = hexToRgb(PALETTE.trunkDark);
  ctx.fillRect(28, 44, 2, 36);
  ctx.fillRect(34, 48, 2, 8);

  // Shadow on ground
  ctx.fillStyle = hexToRgba(PALETTE.grassShadow, 0.3);
  ctx.beginPath();
  ctx.ellipse(32, 78, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Leaf canopy (layered circles)
  cFillCircle(ctx, 32, 30, 22, PALETTE.leafMid);
  cFillCircle(ctx, 22, 32, 16, PALETTE.leafLight);
  cFillCircle(ctx, 42, 28, 14, PALETTE.leafLight);
  cFillCircle(ctx, 32, 22, 12, PALETTE.leafLight, 0.8);
  cFillCircle(ctx, 18, 38, 10, PALETTE.leafDark, 0.5);
  cFillCircle(ctx, 46, 36, 8, PALETTE.leafDark, 0.5);

  closeCanvas(scene, 'tree-oak');
}

// ---------------------------------------------------------------------------
// Pine tree (48x96)
// ---------------------------------------------------------------------------

function buildPineTree(scene) {
  const W = 48;
  const H = 96;
  const { ctx } = openCanvas(scene, 'tree-pine', W, H);

  // Trunk
  ctx.fillStyle = hexToRgb(PALETTE.trunk);
  ctx.fillRect(21, 60, 6, 36);
  ctx.fillStyle = hexToRgb(PALETTE.trunkDark);
  ctx.fillRect(21, 60, 2, 36);

  // Shadow
  ctx.fillStyle = hexToRgba(PALETTE.grassShadow, 0.3);
  ctx.beginPath();
  ctx.ellipse(24, 94, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Three tiers of foliage
  cFillTriangle(ctx, 24, 8, 4, 44, 44, 44, PALETTE.leafDark);
  cFillTriangle(ctx, 24, 16, 8, 42, 40, 42, PALETTE.leafMid);
  cFillTriangle(ctx, 24, 24, 10, 40, 38, 40, PALETTE.leafLight, 0.7);

  cFillTriangle(ctx, 24, 34, 0, 64, 48, 64, PALETTE.leafDark);
  cFillTriangle(ctx, 24, 40, 4, 62, 44, 62, PALETTE.leafMid);
  cFillTriangle(ctx, 24, 46, 8, 60, 40, 60, PALETTE.leafLight, 0.7);

  closeCanvas(scene, 'tree-pine');
}

// ---------------------------------------------------------------------------
// House (96x96)
// ---------------------------------------------------------------------------

function buildHouse(scene) {
  const W = 96;
  const H = 96;
  const { ctx } = openCanvas(scene, 'house', W, H);

  // Shadow
  ctx.fillStyle = hexToRgba(PALETTE.black, 0.35);
  ctx.fillRect(8, 78, 80, 8);

  // Walls
  ctx.fillStyle = hexToRgb(PALETTE.wallLight);
  ctx.fillRect(14, 44, 68, 38);
  ctx.fillStyle = hexToRgb(PALETTE.wallDark);
  ctx.fillRect(78, 44, 4, 38);
  ctx.fillStyle = hexToRgb(PALETTE.uiBorderDark);
  ctx.fillRect(14, 80, 68, 2);

  // Roof
  cFillTriangle(ctx, 48, 8, 6, 50, 90, 50, PALETTE.roofDark);
  cFillTriangle(ctx, 48, 12, 18, 48, 78, 48, PALETTE.roofLight);
  ctx.fillStyle = hexToRgb(0x8a3225);
  ctx.fillRect(48, 12, 2, 36);

  // Roof tile lines
  ctx.strokeStyle = hexToRgba(0x4a1810, 0.6);
  ctx.lineWidth = 1;
  for (let y = 24; y < 48; y += 4) {
    const halfW = y - 12;
    ctx.beginPath();
    ctx.moveTo(48 - halfW, y);
    ctx.lineTo(48 + halfW, y);
    ctx.stroke();
  }

  // Door
  ctx.fillStyle = hexToRgb(PALETTE.door);
  ctx.fillRect(42, 62, 14, 20);
  ctx.fillStyle = hexToRgb(PALETTE.uiBorderDark);
  ctx.fillRect(42, 62, 14, 2);
  ctx.fillStyle = hexToRgb(PALETTE.uiAccent);
  ctx.fillRect(54, 71, 1, 2);

  // Window
  ctx.fillStyle = hexToRgb(PALETTE.window);
  ctx.fillRect(22, 54, 12, 12);
  ctx.fillStyle = hexToRgb(PALETTE.windowLit);
  ctx.fillRect(24, 56, 8, 8);
  ctx.strokeStyle = hexToRgb(PALETTE.uiBorderDark);
  ctx.lineWidth = 1;
  ctx.strokeRect(22, 54, 12, 12);
  ctx.beginPath();
  ctx.moveTo(28, 54);
  ctx.lineTo(28, 66);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(22, 60);
  ctx.lineTo(34, 60);
  ctx.stroke();

  // Chimney
  ctx.fillStyle = hexToRgb(PALETTE.uiBorderDark);
  ctx.fillRect(64, 20, 8, 14);
  ctx.fillStyle = hexToRgba(PALETTE.star, 0.4);
  ctx.fillRect(66, 12, 4, 2);
  ctx.fillRect(64, 14, 6, 2);
  ctx.fillRect(62, 16, 8, 2);

  closeCanvas(scene, 'house');
}

// ---------------------------------------------------------------------------
// Fence (32x16)
// ---------------------------------------------------------------------------

function buildFence(scene) {
  const W = 32;
  const H = 16;
  const { ctx } = openCanvas(scene, 'fence', W, H);

  ctx.fillStyle = hexToRgb(PALETTE.trunk);
  ctx.fillRect(0, 0, 4, 16);
  ctx.fillRect(28, 0, 4, 16);
  ctx.fillStyle = hexToRgb(PALETTE.trunkDark);
  ctx.fillRect(0, 0, 4, 2);
  ctx.fillRect(28, 0, 4, 2);
  // Rails
  ctx.fillStyle = hexToRgb(PALETTE.uiPanelLight);
  ctx.fillRect(0, 5, 32, 2);
  ctx.fillRect(0, 10, 32, 2);

  closeCanvas(scene, 'fence');
}

// ---------------------------------------------------------------------------
// Grass tuft (16x12)
// ---------------------------------------------------------------------------

function buildGrassTuft(scene) {
  const W = 16;
  const H = 12;
  const { ctx } = openCanvas(scene, 'grass-tuft', W, H);

  ctx.fillStyle = hexToRgb(PALETTE.grassDark);
  ctx.fillRect(2, 9, 1, 3);
  ctx.fillRect(7, 8, 1, 4);
  ctx.fillRect(12, 10, 1, 2);

  ctx.fillStyle = hexToRgb(PALETTE.grassLight);
  ctx.fillRect(2, 7, 1, 3);
  ctx.fillRect(4, 9, 1, 3);
  ctx.fillRect(7, 5, 1, 4);
  ctx.fillRect(9, 8, 1, 3);
  ctx.fillRect(12, 7, 1, 4);

  ctx.fillStyle = hexToRgba(PALETTE.star, 0.4);
  ctx.fillRect(7, 3, 1, 1);

  closeCanvas(scene, 'grass-tuft');
}

// ---------------------------------------------------------------------------
// Flower (10x12)
// ---------------------------------------------------------------------------

function pickFlowerColor() {
  const palette = [0xe94e60, 0xffc857, 0xc97cdb, 0xf3e9c8, 0xff7a59];
  return palette[Math.floor(Math.random() * palette.length)];
}

function buildFlower(scene) {
  const W = 10;
  const H = 12;
  const { ctx } = openCanvas(scene, 'flower', W, H);

  // Stem
  ctx.fillStyle = hexToRgb(PALETTE.leafDark);
  ctx.fillRect(4, 6, 1, 6);
  // Petals
  const petalColor = pickFlowerColor();
  ctx.fillStyle = hexToRgb(petalColor);
  ctx.fillRect(3, 3, 4, 1);
  ctx.fillRect(2, 4, 1, 2);
  ctx.fillRect(7, 4, 1, 2);
  ctx.fillRect(3, 6, 4, 1);
  ctx.fillStyle = hexToRgb(PALETTE.star);
  ctx.fillRect(4, 4, 2, 2);

  closeCanvas(scene, 'flower');
}

// ---------------------------------------------------------------------------
// Player preview (32x48)
// ---------------------------------------------------------------------------

function buildPlayerPreview(scene) {
  const W = 32;
  const H = 48;
  const { ctx } = openCanvas(scene, 'player-preview', W, H);

  // Boots
  ctx.fillStyle = hexToRgb(0x3b2410);
  ctx.fillRect(8, 42, 6, 4);
  ctx.fillRect(18, 42, 6, 4);
  // Pants
  ctx.fillStyle = hexToRgb(0x3f4a60);
  ctx.fillRect(9, 34, 6, 10);
  ctx.fillRect(17, 34, 6, 10);
  // Body
  ctx.fillStyle = hexToRgb(0xc54a3a);
  ctx.fillRect(8, 22, 16, 14);
  ctx.fillStyle = hexToRgb(0x7a2a20);
  ctx.fillRect(8, 34, 16, 2);
  // Arms
  ctx.fillStyle = hexToRgb(0xefb88a);
  ctx.fillRect(6, 24, 2, 10);
  ctx.fillRect(24, 24, 2, 10);
  // Head
  ctx.fillRect(10, 8, 12, 14);
  ctx.fillStyle = hexToRgb(0xb88a5e);
  ctx.fillRect(10, 18, 12, 2);
  // Hair
  ctx.fillStyle = hexToRgb(0x6b3e23);
  ctx.fillRect(9, 6, 14, 4);
  ctx.fillRect(9, 6, 2, 6);
  ctx.fillRect(21, 6, 2, 6);
  // Eyes
  ctx.fillStyle = hexToRgb(0x1a0f08);
  ctx.fillRect(13, 14, 1, 2);
  ctx.fillRect(18, 14, 1, 2);
  // Cheek
  ctx.fillStyle = hexToRgba(0xe94e60, 0.4);
  ctx.fillRect(11, 16, 2, 1);
  ctx.fillRect(19, 16, 2, 1);

  closeCanvas(scene, 'player-preview');
}

// ---------------------------------------------------------------------------
// Cursor textures
// ---------------------------------------------------------------------------

function buildCursorTextures(scene) {
  // 12x16 little hand-pointer.
  const W = 12;
  const H = 16;
  const grid = [
    [null, null, null, null, null, null, null, PALETTE.uiText, null, null, null, null],
    [null, null, null, null, null, null, PALETTE.uiText, PALETTE.uiText, null, null, null, null],
    [null, null, null, null, null, PALETTE.uiText, PALETTE.uiText, PALETTE.uiText, PALETTE.uiText, PALETTE.uiText, null, null],
    [null, null, null, null, null, PALETTE.uiText, PALETTE.uiHover, PALETTE.uiText, PALETTE.uiText, PALETTE.uiText, null, null],
    [null, null, null, null, null, PALETTE.uiText, PALETTE.uiHover, PALETTE.uiText, PALETTE.uiText, null, null, null],
    [null, null, null, null, null, PALETTE.uiText, PALETTE.uiHover, PALETTE.uiText, PALETTE.uiText, null, null, null],
    [null, null, null, null, null, PALETTE.uiText, PALETTE.uiHover, PALETTE.uiText, PALETTE.uiText, PALETTE.uiText, null, null],
    [null, null, null, null, null, PALETTE.uiText, PALETTE.uiText, PALETTE.uiHover, PALETTE.uiText, PALETTE.uiText, PALETTE.uiText, null],
    [null, null, null, null, null, null, null, PALETTE.uiHover, PALETTE.uiText, PALETTE.uiText, null, null],
    [null, null, null, null, null, null, null, PALETTE.uiHover, PALETTE.uiText, null, null, null],
    [null, null, null, null, null, null, null, PALETTE.uiText, PALETTE.uiText, null, null, null],
    [null, null, null, null, null, null, null, PALETTE.uiText, null, null, null, null],
  ];
  drawPixelGrid(scene, 'cursor-pointer', W, H, grid);

  // Default crosshair-ish cursor dot (4x4)
  fillRect(scene, 'cursor-dot', 4, 4, PALETTE.uiText);
}

// ---------------------------------------------------------------------------
// Heart (10x9)
// ---------------------------------------------------------------------------

function buildHeart(scene) {
  const W = 10;
  const H = 9;
  const grid = [
    [null, null, PALETTE.heart, PALETTE.heart, null, null, PALETTE.heart, PALETTE.heart, null, null],
    [null, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, null],
    [null, PALETTE.heart, PALETTE.star, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.star, PALETTE.heart, null],
    [null, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, null],
    [null, null, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, null, null],
    [null, null, null, PALETTE.heart, PALETTE.heart, PALETTE.heart, PALETTE.heart, null, null, null],
    [null, null, null, null, PALETTE.heart, PALETTE.heart, null, null, null, null],
    [null, null, null, null, PALETTE.heart, PALETTE.heart, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null],
  ];
  drawPixelGrid(scene, 'icon-heart', W, H, grid);
}

// ---------------------------------------------------------------------------
// Coin (10x10)
// ---------------------------------------------------------------------------

function buildCoin(scene) {
  const W = 10;
  const H = 10;
  const grid = [
    [null, null, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, null, null],
    [null, PALETTE.uiAccent, PALETTE.star, PALETTE.star, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.star, PALETTE.star, PALETTE.uiAccent, null],
    [PALETTE.uiAccent, PALETTE.star, PALETTE.star, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.star, PALETTE.star, PALETTE.uiAccent],
    [PALETTE.uiAccent, PALETTE.star, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.star, PALETTE.uiAccent],
    [PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent],
    [PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent],
    [PALETTE.uiAccent, PALETTE.star, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.star, PALETTE.uiAccent],
    [PALETTE.uiAccent, PALETTE.star, PALETTE.star, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.star, PALETTE.star, PALETTE.uiAccent],
    [null, PALETTE.uiAccent, PALETTE.star, PALETTE.star, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.star, PALETTE.star, PALETTE.uiAccent, null],
    [null, null, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, PALETTE.uiAccent, null, null],
  ];
  drawPixelGrid(scene, 'icon-coin', W, H, grid);
}

// ---------------------------------------------------------------------------
// Sparkle (8x8)
// ---------------------------------------------------------------------------

function buildSparkle(scene) {
  const W = 8;
  const H = 8;
  const grid = [
    [null, null, null, PALETTE.star, null, null, null, null],
    [null, null, null, PALETTE.star, null, null, null, null],
    [null, null, PALETTE.uiHover, PALETTE.star, PALETTE.uiHover, null, null, null],
    [PALETTE.star, PALETTE.star, PALETTE.star, PALETTE.white, PALETTE.star, PALETTE.star, PALETTE.star, PALETTE.star],
    [null, null, PALETTE.uiHover, PALETTE.star, PALETTE.uiHover, null, null, null],
    [null, null, null, PALETTE.star, null, null, null, null],
    [null, null, null, PALETTE.star, null, null, null, null],
    [null, null, null, null, null, null, null, null],
  ];
  drawPixelGrid(scene, 'sparkle', W, H, grid);
}

// ---------------------------------------------------------------------------
// Logo leaf (16x16)
// ---------------------------------------------------------------------------

function buildLogo(scene) {
  const W = 16;
  const H = 16;
  const grid = [
    [null, null, null, null, null, null, null, PALETTE.leafMid, PALETTE.leafLight, PALETTE.leafMid, null, null, null, null, null, null],
    [null, null, null, null, null, null, PALETTE.leafMid, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafMid, null, null, null, null, null],
    [null, null, null, null, null, PALETTE.leafMid, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafMid, null, null, null, null],
    [null, null, null, null, PALETTE.leafMid, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafMid, null, null, null],
    [null, null, null, null, PALETTE.leafMid, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafDark, PALETTE.leafDark, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafMid, null, null, null],
    [null, null, null, null, PALETTE.leafMid, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafDark, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafMid, null, null, null],
    [null, null, null, null, null, PALETTE.leafMid, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafMid, null, null, null, null],
    [null, null, null, null, null, PALETTE.leafMid, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafMid, null, null, null, null, null],
    [null, null, null, null, null, null, PALETTE.leafMid, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafLight, PALETTE.leafMid, null, null, null, null, null],
    [null, null, null, null, null, null, null, PALETTE.trunk, PALETTE.trunk, PALETTE.trunk, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, PALETTE.trunk, PALETTE.trunkDark, PALETTE.trunk, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, PALETTE.trunk, PALETTE.trunk, PALETTE.trunk, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, PALETTE.trunk, PALETTE.trunk, PALETTE.trunk, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, PALETTE.trunk, PALETTE.trunk, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, PALETTE.trunk, PALETTE.trunk, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  ];
  drawPixelGrid(scene, 'logo-leaf', W, H, grid);
}

// ---------------------------------------------------------------------------
// Button textures (96x32 each, scaled 3× on screen)
// ---------------------------------------------------------------------------

function buildButtonTextures(scene) {
  const W = 96;
  const H = 32;

  function drawBtn(name, opts) {
    const { ctx } = openCanvas(scene, name, W, H);

    // Outer border fill
    cFillRect(ctx, 0, 0, W, H, PALETTE.uiPanelLight);

    // Inner body
    cFillRect(ctx, 2, 2, W - 4, H - 6, PALETTE.uiPanel);

    // Highlight band
    if (opts.highlightAlpha) {
      cFillRect(ctx, 2, 2, W - 4, opts.highlightH ?? 4, PALETTE.uiAccent, opts.highlightAlpha);
    }

    // Accent band
    if (opts.accentAlpha) {
      cFillRect(ctx, 2, 2, W - 4, opts.accentH ?? (H - 6), PALETTE.uiAccent, opts.accentAlpha);
    }

    // Outer border
    cStrokeRect(ctx, 0.5, 0.5, W - 1, H - 1, PALETTE.uiBorder, 1);
    // Inner border
    cStrokeRect(ctx, 1.5, 1.5, W - 3, H - 3, PALETTE.uiBorderDark, 1);

    closeCanvas(scene, name);
  }

  // Idle
  drawBtn('btn-idle', { highlightAlpha: 0.18, highlightH: 4 });

  // Hover
  drawBtn('btn-hover', {
    highlightAlpha: 0.55,
    highlightH: H - 6,
    accentAlpha: 1,
    accentH: 3,
  });
  // overwrite the hover body and borders
  const hoverCtx = openCanvas(scene, 'btn-hover', W, H).ctx;
  cStrokeRect(hoverCtx, 0.5, 0.5, W - 1, H - 1, PALETTE.uiHover, 1);
  cStrokeRect(hoverCtx, 1.5, 1.5, W - 3, H - 3, PALETTE.uiBorderDark, 1);
  closeCanvas(scene, 'btn-hover');

  // Pressed
  drawBtn('btn-pressed', { highlightAlpha: 0.35, highlightH: 2 });
  // overwrite inner body
  const pressCtx = openCanvas(scene, 'btn-pressed', W, H).ctx;
  cFillRect(pressCtx, 2, 2, W - 4, H - 6, 0x1a0e07);
  cFillRect(pressCtx, 2, 2, W - 4, 2, PALETTE.uiAccent, 0.35);
  closeCanvas(scene, 'btn-pressed');

  // Disabled
  drawBtn('btn-disabled', { highlightAlpha: 0.25, highlightH: 2 });
  const disCtx = openCanvas(scene, 'btn-disabled', W, H).ctx;
  cFillRect(disCtx, 2, 2, W - 4, H - 6, 0x2a1d12);
  cFillRect(disCtx, 2, 2, W - 4, 2, PALETTE.uiDisabled, 0.25);
  cStrokeRect(disCtx, 0.5, 0.5, W - 1, H - 1, PALETTE.uiDisabled, 1);
  closeCanvas(scene, 'btn-disabled');
}

// ---------------------------------------------------------------------------
// Panel textures
// ---------------------------------------------------------------------------

function buildPanelTextures(scene) {
  const W = 320;
  const H = 180;

  // --- Wood panel ---
  const { ctx: wCtx } = openCanvas(scene, 'panel-wood', W, H);

  // Drop shadow
  cFillRect(wCtx, 4, 6, W, H, PALETTE.black, 0.55);

  // Wooden body
  cFillRect(wCtx, 0, 0, W, H, PALETTE.uiPanelLight);
  cFillRect(wCtx, 2, 2, W - 4, H - 4, PALETTE.uiPanel);

  // Wood plank seams
  wCtx.strokeStyle = hexToRgba(0x1a0e07, 0.6);
  wCtx.lineWidth = 1;
  for (let y = 24; y < H - 4; y += 14) {
    wCtx.beginPath();
    wCtx.moveTo(2, y);
    wCtx.lineTo(W - 2, y);
    wCtx.stroke();
  }

  // Borders
  cStrokeRect(wCtx, 1, 1, W - 2, H - 2, PALETTE.uiBorder, 2);
  cStrokeRect(wCtx, 3, 3, W - 6, H - 6, PALETTE.uiBorderDark, 1);

  // Top header band
  cFillRect(wCtx, 2, 2, W - 4, 10, PALETTE.uiAccent);
  cFillRect(wCtx, 2, 2, W - 4, 3, PALETTE.uiAccentHot, 0.6);

  closeCanvas(scene, 'panel-wood');

  // --- Parchment panel ---
  const { ctx: pCtx } = openCanvas(scene, 'panel-parchment', W, H);

  cFillRect(pCtx, 4, 6, W, H, PALETTE.black, 0.55);
  cFillRect(pCtx, 0, 0, W, H, 0xf3e3b0);
  cFillRect(pCtx, 2, 2, W - 4, H - 4, 0xd9c389);

  // Speckle
  pCtx.fillStyle = hexToRgba(0x8a6a3a, 0.18);
  for (let i = 0; i < 80; i++) {
    pCtx.fillRect(
      2 + Math.floor(Math.random() * (W - 4)),
      2 + Math.floor(Math.random() * (H - 4)),
      1, 1
    );
  }

  cStrokeRect(pCtx, 1, 1, W - 2, H - 2, 0x6b4a23, 2);
  cStrokeRect(pCtx, 3, 3, W - 6, H - 6, 0x3b2410, 1);

  closeCanvas(scene, 'panel-parchment');
}

// ---------------------------------------------------------------------------
// Title plate (420x96)
// ---------------------------------------------------------------------------

function buildTitleTexture(scene) {
  const W = 420;
  const H = 96;
  const { ctx } = openCanvas(scene, 'title-plate', W, H);

  // Shadow
  cFillRect(ctx, 6, 8, W, H, PALETTE.black, 0.6);

  // Plank
  cFillRect(ctx, 0, 0, W, H, PALETTE.uiPanelLight);
  cFillRect(ctx, 3, 3, W - 6, H - 6, PALETTE.uiPanel);

  // Plank seams
  ctx.strokeStyle = hexToRgba(0x1a0e07, 0.6);
  ctx.lineWidth = 1;
  for (let y = 26; y < H - 3; y += 16) {
    ctx.beginPath();
    ctx.moveTo(3, y);
    ctx.lineTo(W - 3, y);
    ctx.stroke();
  }

  // Nail heads
  ctx.fillStyle = hexToRgb(PALETTE.uiBorderDark);
  ctx.fillRect(8, 8, 2, 2);
  ctx.fillRect(W - 10, 8, 2, 2);
  ctx.fillRect(8, H - 10, 2, 2);
  ctx.fillRect(W - 10, H - 10, 2, 2);

  // Borders
  cStrokeRect(ctx, 1, 1, W - 2, H - 2, PALETTE.uiBorder, 2);
  cStrokeRect(ctx, 3, 3, W - 6, H - 6, PALETTE.uiBorderDark, 1);

  closeCanvas(scene, 'title-plate');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateAllTextures(scene) {
  // Order matters only for readability — all textures are independent.
  buildSky(scene);
  buildSun(scene);
  buildCloud(scene);
  buildMountain(scene);
  buildGrassTile(scene);
  buildPath(scene);
  buildWaterTile(scene);
  buildTree(scene);
  buildPineTree(scene);
  buildHouse(scene);
  buildFence(scene);
  buildGrassTuft(scene);
  buildFlower(scene);
  buildPlayerPreview(scene);
  buildCursorTextures(scene);
  buildHeart(scene);
  buildCoin(scene);
  buildSparkle(scene);
  buildLogo(scene);
  buildButtonTextures(scene);
  buildPanelTextures(scene);
  buildTitleTexture(scene);
}

export const TEXTURES = {
  sky: () => 'gen:sky-bg',
  sun: () => 'gen:sun',
  cloud: () => 'gen:cloud',
  mountain: () => 'gen:mountain',
  grassTile: () => 'gen:grass-tile',
  pathTile: () => 'gen:path-tile',
  waterTile: () => 'gen:water-tile',
  treeOak: () => 'gen:tree-oak',
  treePine: () => 'gen:tree-pine',
  house: () => 'gen:house',
  fence: () => 'gen:fence',
  grassTuft: () => 'gen:grass-tuft',
  flower: () => 'gen:flower',
  playerPreview: () => 'gen:player-preview',
  cursorPointer: () => 'gen:cursor-pointer',
  cursorDot: () => 'gen:cursor-dot',
  heart: () => 'gen:icon-heart',
  coin: () => 'gen:icon-coin',
  sparkle: () => 'gen:sparkle',
  logo: () => 'gen:logo-leaf',
  titlePlate: () => 'gen:title-plate',
  panelWood: () => 'gen:panel-wood',
  panelParchment: () => 'gen:panel-parchment',
  btnIdle: () => 'gen:btn-idle',
  btnHover: () => 'gen:btn-hover',
  btnPressed: () => 'gen:btn-pressed',
  btnDisabled: () => 'gen:btn-disabled',
};

export { key as textureKey };
