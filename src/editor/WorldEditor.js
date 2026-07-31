// HiValley — World Editor Scene
//
// Profesyonel world edit tool. Tile placement, object placement, undo/redo,
// save/load, search, grid, zoom, copy/paste, layer management dahil.
//
// Kullanım: ?scene=WorldEditor ile açılır.

import Phaser from 'phaser';
import { EditorToolbar } from './EditorToolbar.js';
import { EditorPalette } from './EditorPalette.js';
import {
  ASSET_CATEGORIES,
  getAllAssets,
  searchAssets,
  findAssetByTexture,
} from './AssetRegistry.js';

// Map sabitleri (GameScene ile aynı)
const MAP_COLS = 30;
const MAP_ROWS = 18;
const TILE = 16;
const MAP_W = MAP_COLS * TILE;
const MAP_H = MAP_ROWS * TILE;

// Maksimum undo sayısı
const MAX_UNDO = 50;

export class WorldEditor extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldEditor' });
  }

  create() {
    // ─── CANVAS RESIZE ──────────────────────────────
    // Editor için canvas'ı büyüt, kapatınca geri küçült
    this._originalWidth = this.scale.width;
    this._originalHeight = this.scale.height;
    this.scale.resize(1280, 720);

    // Tam canvas arka planı — diğer sahnelerin görünmemesi için
    this.cameras.main.setBackgroundColor('#0e0e1a');

    // ─── STATE ─────────────────────────────────────
    this.currentTool = 'paint';
    this.selectedAsset = null;
    this.zoom = 2; // Editor'de 2x zoom ile başla
    this.showGrid = true;
    this.showSnap = true;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.cameraStart = { x: 0, y: 0 };

    // Undo/Redo stack
    this.undoStack = [];
    this.redoStack = [];

    // Clipboard
    this.clipboard = null;
    this.clipboardOrigin = null;

    // Map data (2D array)
    this.mapData = this._createEmptyMap();

    // Object placement list
    this.objects = [];

    // Selection state
    this.selectionRect = null;
    this.selectedTiles = [];

    // ─── SETUP SCENE ───────────────────────────────
    this._setupCamera();
    this._createMapBackground();
    this._createGridOverlay();
    this._createCursor();
    this._setupUI();
    this._setupInput();
    this._setupEvents();

    // Başlangıç mesajı
    this._showNotification('World Editor yüklendi! Sol panelden asset seçin.', 3000);
  }

  // ═══════════════════════════════════════════════════
  // CAMERA & ZOOM
  // ═══════════════════════════════════════════════════

  _setupCamera() {
    const cx = MAP_W / 2;
    const cy = MAP_H / 2;

    this.cameras.main.setBounds(
      -200, -200,
      MAP_W + 400, MAP_H + 400
    );
    this.cameras.main.centerOn(cx, cy);
    this.cameras.main.setZoom(this.zoom);
  }

  _setZoom(newZoom) {
    this.zoom = Phaser.Math.Clamp(newZoom, 0.5, 5);
    this.cameras.main.setZoom(this.zoom);
    this.events.emit('zoom-changed', this.zoom);

    if (this.toolbar) {
      this.toolbar.updateZoom(this.zoom);
    }
  }

  // ═══════════════════════════════════════════════════
  // MAP BACKGROUND & GRID
  // ═══════════════════════════════════════════════════

  _createMapBackground() {
    // Harita arka planı
    this.mapBg = this.add.graphics();
    this.mapBg.fillStyle(0x2a2a2a);
    this.mapBg.fillRect(0, 0, MAP_W, MAP_H);

    // Dış sınır çizgisi
    this.mapBg.lineStyle(2, 0xff4444);
    this.mapBg.strokeRect(0, 0, MAP_W, MAP_H);
  }

  _createGridOverlay() {
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(10);
    this._drawGrid();
  }

  _drawGrid() {
    this.gridGraphics.clear();

    if (!this.showGrid) return;

    this.gridGraphics.lineStyle(0.5, 0xffffff, 0.15);

    // Dikey çizgiler
    for (let x = 0; x <= MAP_W; x += TILE) {
      this.gridGraphics.lineBetween(x, 0, x, MAP_H);
    }

    // Yatay çizgiler
    for (let y = 0; y <= MAP_H; y += TILE) {
      this.gridGraphics.lineBetween(0, y, MAP_W, y);
    }

    // Her 5 tile'da bir koyu çizgi
    this.gridGraphics.lineStyle(1, 0xffffff, 0.25);
    for (let x = 0; x <= MAP_W; x += TILE * 5) {
      this.gridGraphics.lineBetween(x, 0, x, MAP_H);
    }
    for (let y = 0; y <= MAP_H; y += TILE * 5) {
      this.gridGraphics.lineBetween(0, y, MAP_W, y);
    }
  }

  _createCursor() {
    // Cursor highlight
    this.cursorGraphics = this.add.graphics();
    this.cursorGraphics.setDepth(100);

    // Cursor preview (seçili asset'in thumbnail'i)
    this.cursorPreview = this.add.image(0, 0, '__DEFAULT');
    this.cursorPreview.setDepth(101);
    this.cursorPreview.setAlpha(0.6);
    this.cursorPreview.setVisible(false);
  }

  // ═══════════════════════════════════════════════════
  // UI SETUP
  // ═══════════════════════════════════════════════════

  _setupUI() {
    // Toolbar
    this.toolbar = new EditorToolbar(this);

    // Palette panel
    this.palette = new EditorPalette(this);

    // Status bar (alt)
    this._createStatusBar();

    // Koordinat göstergesi
    this.coordText = this.add.text(this.scale.width - 10, this.scale.height - 24, '', {
      fontSize: '10px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(1100);

    // Tile count
    this.tileCountText = this.add.text(16, this.scale.height - 24, '', {
      fontSize: '10px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setDepth(1100);

    this._updateTileCount();
  }

  _createStatusBar() {
    const W = this.scale.width;
    const H = this.scale.height;
    const barH = 24;

    this.statusBar = this.add.graphics();
    this.statusBar.fillStyle(0x12122a, 0.95);
    this.statusBar.fillRect(0, H - barH, W, barH);
    this.statusBar.lineStyle(1, 0x3a3a5e);
    this.statusBar.lineBetween(0, H - barH, W, H - barH);
    this.statusBar.setDepth(1000);

    this.statusText = this.add.text(16, H - barH + 5, 'Hazır', {
      fontSize: '9px',
      color: '#8888aa',
      fontFamily: 'monospace',
    }).setDepth(1001);
  }

  // ═══════════════════════════════════════════════════
  // INPUT HANDLING
  // ═══════════════════════════════════════════════════

  _setupInput() {
    // Mouse move - cursor güncelleme
    this.input.on('pointermove', (pointer) => {
      this._handleMouseMove(pointer);
    });

    // Mouse down - boyama/seçim
    this.input.on('pointerdown', (pointer) => {
      this._handleMouseDown(pointer);
    });

    // Mouse up
    this.input.on('pointerup', (pointer) => {
      this._handleMouseUp(pointer);
    });

    // Klavye kısayolları
    this._setupKeyboardShortcuts();

    // Fare tekerleği ile zoom
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const zoomDelta = deltaY > 0 ? -0.2 : 0.2;
      this._setZoom(this.zoom + zoomDelta);
    });
  }

  _setupKeyboardShortcuts() {
    const k = this.input.keyboard;

    // Tool kısayolları
    k.on('keydown-B', () => this.toolbar.setActiveTool('paint'));
    k.on('keydown-E', () => this.toolbar.setActiveTool('eraser'));
    k.on('keydown-S', () => {
      if (!k.addKey('CONTROL').isDown) {
        this.toolbar.setActiveTool('select');
      }
    });
    k.on('keydown-M', () => this.toolbar.setActiveTool('move'));
    k.on('keydown-F', () => this.toolbar.setActiveTool('fill'));
    k.on('keydown-R', () => this.toolbar.setActiveTool('rect'));

    // Undo/Redo
    k.on('keydown-Z', () => {
      if (k.addKey('CONTROL').isDown || k.addKey('META').isDown) {
        if (k.addKey('SHIFT').isDown) {
          this._redo();
        } else {
          this._undo();
        }
      }
    });
    k.on('keydown-Y', () => {
      if (k.addKey('CONTROL').isDown || k.addKey('META').isDown) {
        this._redo();
      }
    });

    // Save/Load
    k.on('keydown-S', () => {
      if (k.addKey('CONTROL').isDown || k.addKey('META').isDown) {
        this._saveMap();
      }
    });
    k.on('keydown-O', () => {
      if (k.addKey('CONTROL').isDown || k.addKey('META').isDown) {
        this._loadMap();
      }
    });

    // Copy/Paste
    k.on('keydown-C', () => {
      if (k.addKey('CONTROL').isDown || k.addKey('META').isDown) {
        this._copySelection();
      }
    });
    k.on('keydown-V', () => {
      if (k.addKey('CONTROL').isDown || k.addKey('META').isDown) {
        this._pasteClipboard();
      }
    });

    // Grid toggle
    k.on('keydown-G', () => this._toggleGrid());

    // Delete selected
    k.on('keydown-DELETE', () => this._deleteSelected());
    k.on('keydown-BACKSPACE', () => this._deleteSelected());

    // Escape - seçimiptal
    k.on('keydown-ESC', () => {
      this.selectedTiles = [];
      this._clearSelection();
      this.palette.selectedAsset = null;
      this.events.emit('asset-selected', null);
    });

    // Select all
    k.on('keydown-A', () => {
      if (k.addKey('CONTROL').isDown || k.addKey('META').isDown) {
        this._selectAll();
      }
    });
  }

  _handleMouseMove(pointer) {
    // Dünya koordinatlarına çevir
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / TILE);
    const tileY = Math.floor(worldPoint.y / TILE);

    // Koordinat güncelle
    if (tileX >= 0 && tileX < MAP_COLS && tileY >= 0 && tileY < MAP_ROWS) {
      this.coordText.setText(`X:${tileX} Y:${tileY} | PX:${Math.floor(worldPoint.x)},${Math.floor(worldPoint.y)}`);
    }

    // Cursor çizimi
    this._drawCursor(tileX, tileY);

    // Sürüklediğimiz yerde boyama yap (paint tool)
    if (this.isDragging && this.currentTool === 'paint' && this.selectedAsset) {
      this._paintTile(tileX, tileY);
    }

    // Kamera sürükleme (orta tuş veya sağ tık ile)
    if (pointer.middleButtonDown() || pointer.rightButtonDown()) {
      const dx = pointer.x - this.dragStart.x;
      const dy = pointer.y - this.dragStart.y;
      this.cameras.main.scrollX = this.cameraStart.x - dx / this.zoom;
      this.cameras.main.scrollY = this.cameraStart.y - dy / this.zoom;
    }

    // Selection rect (select tool ile)
    if (this.isDragging && this.currentTool === 'select' && this.selectionRect) {
      this._updateSelectionRect(worldPoint.x, worldPoint.y);
    }
  }

  _handleMouseDown(pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / TILE);
    const tileY = Math.floor(worldPoint.y / TILE);

    // Sağ tık veya orta tık - kamera sürükleme
    if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
      this.isDragging = true;
      this.dragStart = { x: pointer.x, y: pointer.y };
      this.cameraStart = {
        x: this.cameras.main.scrollX,
        y: this.cameras.main.scrollY,
      };
      return;
    }

    // Sol tık - araç kullan
    this.isDragging = true;

    switch (this.currentTool) {
      case 'paint':
        if (this.selectedAsset) {
          this._saveUndoState();
          this._paintTile(tileX, tileY);
        }
        break;

      case 'eraser':
        this._saveUndoState();
        this._eraseTile(tileX, tileY);
        break;

      case 'select':
        this._startSelection(worldPoint.x, worldPoint.y);
        break;

      case 'fill':
        if (this.selectedAsset) {
          this._saveUndoState();
          this._floodFill(tileX, tileY);
        }
        break;

      case 'rect':
        if (this.selectedAsset) {
          this._saveUndoState();
          this._startRectPaint(worldPoint.x, worldPoint.y);
        }
        break;
    }
  }

  _handleMouseUp(pointer) {
    if (this.currentTool === 'rect' && this.isDragging && this.selectedAsset) {
      this._finishRectPaint();
    }

    if (this.currentTool === 'select' && this.isDragging) {
      this._finishSelection();
    }

    this.isDragging = false;
  }

  // ═══════════════════════════════════════════════════
  // TILE OPERATIONS
  // ═══════════════════════════════════════════════════

  _paintTile(tileX, tileY) {
    if (tileX < 0 || tileX >= MAP_COLS || tileY < 0 || tileY >= MAP_ROWS) return;
    if (!this.selectedAsset) return;

    const asset = this.selectedAsset;

    if (asset.type === 'tile') {
      // Tile'ı map data'ya kaydet
      this.mapData[tileY][tileX] = {
        textureKey: asset.textureKey,
        frame: asset.frame,
        assetId: asset.id,
      };

      // Tile'ı render et
      this._renderTile(tileX, tileY);
    } else {
      // Object placement
      this._placeObject(tileX, tileY, asset);
    }

    this._updateTileCount();
  }

  _eraseTile(tileX, tileY) {
    if (tileX < 0 || tileX >= MAP_COLS || tileY < 0 || tileY >= MAP_ROWS) return;

    // Tile'ı temizle
    this.mapData[tileY][tileX] = null;

    // Render'ı temizle
    const key = `tile_${tileX}_${tileY}`;
    const existing = this.children.getByName(key);
    if (existing) {
      existing.destroy();
    }

    // Object'leri de kontrol et
    this.objects = this.objects.filter(obj => {
      const objTileX = Math.floor(obj.sprite.x / TILE);
      const objTileY = Math.floor(obj.sprite.y / TILE);
      if (objTileX === tileX && objTileY === tileY) {
        obj.sprite.destroy();
        return false;
      }
      return true;
    });

    this._updateTileCount();
  }

  _renderTile(tileX, tileY) {
    const data = this.mapData[tileY][tileX];
    if (!data) return;

    const key = `tile_${tileX}_${tileY}`;
    const x = tileX * TILE + TILE / 2;
    const y = tileY * TILE + TILE / 2;

    // Mevcut tile'ı kaldır
    const existing = this.children.getByName(key);
    if (existing) {
      existing.destroy();
    }

    // Yeni tile ekle
    try {
      const sprite = this.add.image(x, y, data.textureKey, data.frame);
      sprite.setName(key);
      sprite.setDisplaySize(TILE, TILE);
      sprite.setDepth(1); // Grid'in altında
    } catch (e) {
      console.warn(`Tile render hatası (${tileX},${tileY}):`, e);
    }
  }

  _renderAllTiles() {
    // Tüm tile render'larını temizle
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        const key = `tile_${x}_${y}`;
        const existing = this.children.getByName(key);
        if (existing) existing.destroy();
      }
    }

    // Tüm tile'ları yeniden render et
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        if (this.mapData[y][x]) {
          this._renderTile(x, y);
        }
      }
    }
  }

  _placeObject(tileX, tileY, asset) {
    const x = tileX * TILE + TILE / 2;
    const y = tileY * TILE + TILE / 2;

    try {
      const sprite = this.add.image(x, y, asset.textureKey, 0);
      sprite.setDepth(5);
      sprite.setDisplaySize(asset.width || 32, asset.height || 32);

      // Object listesine ekle
      this.objects.push({
        sprite,
        assetId: asset.id,
        textureKey: asset.textureKey,
        tileX,
        tileY,
      });
    } catch (e) {
      console.warn(`Object placement hatası:`, e);
    }
  }

  _floodFill(startX, startY) {
    if (startX < 0 || startX >= MAP_COLS || startY < 0 || startY >= MAP_ROWS) return;

    const targetData = this.mapData[startY][startX];
    const fillData = {
      textureKey: this.selectedAsset.textureKey,
      frame: this.selectedAsset.frame,
      assetId: this.selectedAsset.id,
    };

    // Aynı tile ise doldurma
    if (targetData && targetData.assetId === fillData.assetId) return;

    const queue = [[startX, startY]];
    const visited = new Set();
    let iterations = 0;
    const maxIterations = MAP_COLS * MAP_ROWS;

    while (queue.length > 0 && iterations < maxIterations) {
      iterations++;
      const [cx, cy] = queue.shift();
      const key = `${cx},${cy}`;

      if (visited.has(key)) continue;
      if (cx < 0 || cx >= MAP_COLS || cy < 0 || cy >= MAP_ROWS) continue;

      const currentData = this.mapData[cy][cx];
      const sameType = (!currentData && !targetData) ||
        (currentData && targetData && currentData.assetId === targetData.assetId);

      if (!sameType) continue;

      visited.add(key);
      this.mapData[cy][cx] = { ...fillData };
      this._renderTile(cx, cy);

      queue.push([cx + 1, cy]);
      queue.push([cx - 1, cy]);
      queue.push([cx, cy + 1]);
      queue.push([cx, cy - 1]);
    }

    this._updateTileCount();
  }

  // ═══════════════════════════════════════════════════
  // CURSOR
  // ═══════════════════════════════════════════════════

  _drawCursor(tileX, tileY) {
    this.cursorGraphics.clear();

    if (tileX < 0 || tileX >= MAP_COLS || tileY < 0 || tileY >= MAP_ROWS) {
      this.cursorPreview.setVisible(false);
      return;
    }

    const x = tileX * TILE;
    const y = tileY * TILE;

    // Cursor highlight
    let color = 0x4a9eff;
    if (this.currentTool === 'eraser') color = 0xff4444;
    else if (this.currentTool === 'select') color = 0x44ff44;
    else if (this.currentTool === 'fill') color = 0xffaa00;
    else if (this.currentTool === 'rect') color = 0xaa44ff;

    this.cursorGraphics.lineStyle(2, color, 0.8);
    this.cursorGraphics.strokeRect(x, y, TILE, TILE);
    this.cursorGraphics.fillStyle(color, 0.15);
    this.cursorGraphics.fillRect(x, y, TILE, TILE);

    // Seçili asset'in preview'i
    if (this.selectedAsset && this.currentTool !== 'eraser') {
      try {
        if (this.selectedAsset.type === 'tile') {
          this.cursorPreview.setTexture(this.selectedAsset.textureKey, this.selectedAsset.frame);
        } else {
          this.cursorPreview.setTexture(this.selectedAsset.textureKey, 0);
        }
        this.cursorPreview.setPosition(x + TILE / 2, y + TILE / 2);
        this.cursorPreview.setDisplaySize(TILE, TILE);
        this.cursorPreview.setVisible(true);
      } catch (e) {
        this.cursorPreview.setVisible(false);
      }
    } else {
      this.cursorPreview.setVisible(false);
    }
  }

  // ═══════════════════════════════════════════════════
  // SELECTION
  // ═══════════════════════════════════════════════════

  _startSelection(worldX, worldY) {
    this.selectionStart = { x: worldX, y: worldY };
    this.selectionRect = this.add.graphics();
    this.selectionRect.setDepth(50);
  }

  _updateSelectionRect(worldX, worldY) {
    if (!this.selectionRect || !this.selectionStart) return;

    this.selectionRect.clear();

    const x1 = Math.min(this.selectionStart.x, worldX);
    const y1 = Math.min(this.selectionStart.y, worldY);
    const x2 = Math.max(this.selectionStart.x, worldX);
    const y2 = Math.max(this.selectionStart.y, worldY);

    this.selectionRect.lineStyle(2, 0x44ff44, 0.8);
    this.selectionRect.strokeRect(x1, y1, x2 - x1, y2 - y1);
    this.selectionRect.fillStyle(0x44ff44, 0.1);
    this.selectionRect.fillRect(x1, y1, x2 - x1, y2 - y1);
  }

  _finishSelection() {
    if (!this.selectionStart || !this.selectionRect) return;

    const worldPoint = this.cameras.main.getWorldPoint(
      this.input.activePointer.x,
      this.input.activePointer.y
    );

    const x1 = Math.floor(Math.min(this.selectionStart.x, worldPoint.x) / TILE);
    const y1 = Math.floor(Math.min(this.selectionStart.y, worldPoint.y) / TILE);
    const x2 = Math.floor(Math.max(this.selectionStart.x, worldPoint.x) / TILE);
    const y2 = Math.floor(Math.max(this.selectionStart.y, worldPoint.y) / TILE);

    this.selectedTiles = [];
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (x >= 0 && x < MAP_COLS && y >= 0 && y < MAP_ROWS) {
          this.selectedTiles.push({ x, y });
        }
      }
    }

    this._showNotification(`${this.selectedTiles.length} tile seçildi`, 2000);
  }

  _clearSelection() {
    if (this.selectionRect) {
      this.selectionRect.destroy();
      this.selectionRect = null;
    }
    this.selectedTiles = [];
  }

  _selectAll() {
    this.selectedTiles = [];
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        this.selectedTiles.push({ x, y });
      }
    }
    this._showNotification(`Tüm ${this.selectedTiles.length} tile seçildi`, 2000);
  }

  // ═══════════════════════════════════════════════════
  // RECT PAINT
  // ═══════════════════════════════════════════════════

  _startRectPaint(worldX, worldY) {
    this.rectStart = { x: worldX, y: worldY };
    this.rectPreview = this.add.graphics();
    this.rectPreview.setDepth(50);
  }

  _finishRectPaint() {
    if (!this.rectStart || !this.rectPreview) return;

    const worldPoint = this.cameras.main.getWorldPoint(
      this.input.activePointer.x,
      this.input.activePointer.y
    );

    const x1 = Math.floor(Math.min(this.rectStart.x, worldPoint.x) / TILE);
    const y1 = Math.floor(Math.min(this.rectStart.y, worldPoint.y) / TILE);
    const x2 = Math.floor(Math.max(this.rectStart.x, worldPoint.x) / TILE);
    const y2 = Math.floor(Math.max(this.rectStart.y, worldPoint.y) / TILE);

    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (x >= 0 && x < MAP_COLS && y >= 0 && y < MAP_ROWS) {
          this._paintTile(x, y);
        }
      }
    }

    this.rectPreview.destroy();
    this.rectPreview = null;
    this.rectStart = null;
  }

  // ═══════════════════════════════════════════════════
  // UNDO / REDO
  // ═══════════════════════════════════════════════════

  _saveUndoState() {
    const state = {
      mapData: JSON.parse(JSON.stringify(this.mapData)),
      objects: this.objects.map(obj => ({
        assetId: obj.assetId,
        textureKey: obj.textureKey,
        tileX: obj.tileX,
        tileY: obj.tileY,
      })),
    };

    this.undoStack.push(state);
    if (this.undoStack.length > MAX_UNDO) {
      this.undoStack.shift();
    }

    // Yeni undo yapıldığında redo stack'ini temizle
    this.redoStack = [];
  }

  _undo() {
    if (this.undoStack.length === 0) {
      this._showNotification('Geri alınacak işlem yok', 1500);
      return;
    }

    // Mevcut state'i redo stack'ine kaydet
    const currentState = {
      mapData: JSON.parse(JSON.stringify(this.mapData)),
      objects: this.objects.map(obj => ({
        assetId: obj.assetId,
        textureKey: obj.textureKey,
        tileX: obj.tileX,
        tileY: obj.tileY,
      })),
    };
    this.redoStack.push(currentState);

    // Undo state'ini yükle
    const prevState = this.undoStack.pop();
    this.mapData = prevState.mapData;

    // Object'leri temizle ve yeniden oluştur
    this.objects.forEach(obj => obj.sprite.destroy());
    this.objects = [];
    prevState.objects.forEach(objData => {
      const asset = findAssetByTexture(objData.textureKey);
      if (asset) {
        this._placeObject(objData.tileX, objData.tileY, asset);
      }
    });

    this._renderAllTiles();
    this._updateTileCount();
    this._showNotification('Geri alındı', 1000);
  }

  _redo() {
    if (this.redoStack.length === 0) {
      this._showNotification('İleri alınacak işlem yok', 1500);
      return;
    }

    // Mevcut state'i undo stack'ine kaydet
    const currentState = {
      mapData: JSON.parse(JSON.stringify(this.mapData)),
      objects: this.objects.map(obj => ({
        assetId: obj.assetId,
        textureKey: obj.textureKey,
        tileX: obj.tileX,
        tileY: obj.tileY,
      })),
    };
    this.undoStack.push(currentState);

    // Redo state'ini yükle
    const nextState = this.redoStack.pop();
    this.mapData = nextState.mapData;

    this.objects.forEach(obj => obj.sprite.destroy());
    this.objects = [];
    nextState.objects.forEach(objData => {
      const asset = findAssetByTexture(objData.textureKey);
      if (asset) {
        this._placeObject(objData.tileX, objData.tileY, asset);
      }
    });

    this._renderAllTiles();
    this._updateTileCount();
    this._showNotification('İleri alındı', 1000);
  }

  // ═══════════════════════════════════════════════════
  // COPY / PASTE
  // ═══════════════════════════════════════════════════

  _copySelection() {
    if (this.selectedTiles.length === 0) {
      this._showNotification('Kopyalanacak tile seçin', 1500);
      return;
    }

    // Seçim bounding box'ını bul
    const minX = Math.min(...this.selectedTiles.map(t => t.x));
    const minY = Math.min(...this.selectedTiles.map(t => t.y));

    this.clipboard = {
      tiles: this.selectedTiles.map(t => ({
        relX: t.x - minX,
        relY: t.y - minY,
        data: this.mapData[t.y][t.x] ? { ...this.mapData[t.y][t.x] } : null,
      })),
      width: Math.max(...this.selectedTiles.map(t => t.x)) - minX + 1,
      height: Math.max(...this.selectedTiles.map(t => t.y)) - minY + 1,
    };

    this._showNotification(`${this.clipboard.tiles.length} tile kopyalandı`, 1500);
  }

  _pasteClipboard() {
    if (!this.clipboard) {
      this._showNotification('Yapıştırılacak veri yok', 1500);
      return;
    }

    this._saveUndoState();

    // Cursor pozisyonuna yapıştır
    const worldPoint = this.cameras.main.getWorldPoint(
      this.input.activePointer.x,
      this.input.activePointer.y
    );
    const startX = Math.floor(worldPoint.x / TILE);
    const startY = Math.floor(worldPoint.y / TILE);

    this.clipboard.tiles.forEach(tile => {
      const x = startX + tile.relX;
      const y = startY + tile.relY;
      if (x >= 0 && x < MAP_COLS && y >= 0 && y < MAP_ROWS && tile.data) {
        this.mapData[y][x] = { ...tile.data };
        this._renderTile(x, y);
      }
    });

    this._updateTileCount();
    this._showNotification('Yapıştırıldı', 1000);
  }

  _deleteSelected() {
    if (this.selectedTiles.length === 0) return;

    this._saveUndoState();

    this.selectedTiles.forEach(t => {
      this._eraseTile(t.x, t.y);
    });

    this._clearSelection();
    this._showNotification('Seçili tilelar silindi', 1000);
  }

  // ═══════════════════════════════════════════════════
  // SAVE / LOAD
  // ═══════════════════════════════════════════════════

  _saveMap() {
    const mapExport = {
      version: 1,
      name: 'HiValley Map',
      cols: MAP_COLS,
      rows: MAP_ROWS,
      tileSize: TILE,
      timestamp: new Date().toISOString(),
      tiles: this.mapData,
      objects: this.objects.map(obj => ({
        assetId: obj.assetId,
        textureKey: obj.textureKey,
        x: obj.sprite.x,
        y: obj.sprite.y,
        tileX: obj.tileX,
        tileY: obj.tileY,
      })),
    };

    const json = JSON.stringify(mapExport, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `hivalley-map-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this._showNotification('Harita kaydedildi! 📁', 2000);

    // LocalStorage'a da kaydet
    try {
      localStorage.setItem('hivalley:editor:lastMap', json);
    } catch (e) {
      console.warn('LocalStorage kayıt hatası:', e);
    }
  }

  _loadMap() {
    // LocalStorage'dan son haritayı yükle
    try {
      const saved = localStorage.getItem('hivalley:editor:lastMap');
      if (saved) {
        this._importMapData(JSON.parse(saved));
        this._showNotification('Son harita yüklendi! 📂', 2000);
        return;
      }
    } catch (e) {
      console.warn('LocalStorage yükleme hatası:', e);
    }

    // Dosya input ile yükle
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          this._importMapData(data);
          this._showNotification('Harita yüklendi! 📂', 2000);
        } catch (err) {
          this._showNotification('Harita yükleme hatası! ❌', 2000);
          console.error(err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  _importMapData(data) {
    // Map data'yı yükle
    if (data.tiles && Array.isArray(data.tiles)) {
      this.mapData = data.tiles;
    }

    // Object'leri temizle ve yeniden oluştur
    this.objects.forEach(obj => obj.sprite.destroy());
    this.objects = [];

    if (data.objects && Array.isArray(data.objects)) {
      data.objects.forEach(objData => {
        const asset = findAssetByTexture(objData.textureKey);
        if (asset) {
          this._placeObject(objData.tileX, objData.tileY, asset);
        }
      });
    }

    this._renderAllTiles();
    this._updateTileCount();
  }

  _exportMap() {
    const mapExport = {
      version: 1,
      name: 'HiValley Map',
      cols: MAP_COLS,
      rows: MAP_ROWS,
      tileSize: TILE,
      timestamp: new Date().toISOString(),
      tiles: this.mapData,
      objects: this.objects.map(obj => ({
        assetId: obj.assetId,
        textureKey: obj.textureKey,
        x: obj.sprite.x,
        y: obj.sprite.y,
        tileX: obj.tileX,
        tileY: obj.tileY,
      })),
    };

    // Konsola yazdır (debug)
    console.log('Map Export:', JSON.stringify(mapExport));
    this._showNotification('Harita konsola export edildi! 📋', 2000);
  }

  // ═══════════════════════════════════════════════════
  // EVENT LISTENERS
  // ═══════════════════════════════════════════════════

  _setupEvents() {
    this.events.on('tool-changed', (tool) => {
      this.currentTool = tool;
      this.statusText.setText(`Araç: ${tool}`);

      if (tool !== 'select') {
        this._clearSelection();
      }
    });

    this.events.on('asset-selected', (asset) => {
      this.selectedAsset = asset;
      if (asset) {
        this.statusText.setText(`Seçili: ${asset.name}`);
      } else {
        this.statusText.setText('Hazır');
      }
    });

    this.events.on('toggle-grid', () => this._toggleGrid());
    this.events.on('toggle-snap', () => {
      this.showSnap = !this.showSnap;
      this._showNotification(`Snap: ${this.showSnap ? 'Açık' : 'Kapalı'}`, 1000);
    });
    this.events.on('toggle-palette', () => this.palette.toggle());

    this.events.on('zoom-in', () => this._setZoom(this.zoom + 0.3));
    this.events.on('zoom-out', () => this._setZoom(this.zoom - 0.3));

    this.events.on('undo', () => this._undo());
    this.events.on('redo', () => this._redo());
    this.events.on('save-map', () => this._saveMap());
    this.events.on('load-map', () => this._loadMap());
    this.events.on('export-map', () => this._exportMap());

    // Toolbar action events (yeni compact toolbar'dan gelir)
    this.events.on('toolbar-action', (action) => {
      switch (action) {
        case 'undo': this._undo(); break;
        case 'redo': this._redo(); break;
        case 'grid': this._toggleGrid(); break;
        case 'save': this._saveMap(); break;
        case 'load': this._loadMap(); break;
        case 'clear':
          this._saveUndoState();
          this.mapData = this._createEmptyMap();
          this._renderAllTiles();
          this._updateTileCount();
          this._showNotification('Harita temizlendi', 1500);
          break;
        case 'zoom-in': this._setZoom(this.zoom + 0.3); break;
        case 'zoom-out': this._setZoom(this.zoom - 0.3); break;
      }
    });
  }

  // ═══════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════

  _createEmptyMap() {
    const map = [];
    for (let y = 0; y < MAP_ROWS; y++) {
      map[y] = [];
      for (let x = 0; x < MAP_COLS; x++) {
        map[y][x] = null;
      }
    }
    return map;
  }

  _toggleGrid() {
    this.showGrid = !this.showGrid;
    this._drawGrid();
    this._showNotification(`Grid: ${this.showGrid ? 'Açık' : 'Kapalı'}`, 1000);
  }

  _updateTileCount() {
    let count = 0;
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        if (this.mapData[y][x]) count++;
      }
    }
    this.tileCountText.setText(`Tiles: ${count}/${MAP_COLS * MAP_ROWS}`);
  }

  _showNotification(message, duration = 2000) {
    const W = this.scale.width;
    const H = this.scale.height;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(W / 2 - 150, H / 2 - 20, 300, 40, 8);
    bg.lineStyle(1, 0x4a4a8e);
    bg.strokeRoundedRect(W / 2 - 150, H / 2 - 20, 300, 40, 8);
    bg.setDepth(2000);

    const text = this.add.text(W / 2, H / 2, message, {
      fontSize: '11px',
      color: '#e8d5a3',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5).setDepth(2001);

    this.time.delayedCall(duration, () => {
      bg.destroy();
      text.destroy();
    });
  }

  // Sahne kapanınca canvas'ı eski boyutuna geri al
  shutdown() {
    if (this._originalWidth && this._originalHeight) {
      this.scale.resize(this._originalWidth, this._originalHeight);
    }
    // Toolbar ve palette temizle
    if (this.toolbar) this.toolbar.destroy();
    if (this.palette) this.palette.destroy();
  }
}
