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

// Map sabitleri — başlangıç boyutu (editor'da dinamik olarak değiştirilebilir)
const INITIAL_COLS = 30;
const INITIAL_ROWS = 18;
const TILE = 16;

// Maksimum undo sayısı
const MAX_UNDO = 50;

export class WorldEditor extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldEditor' });
  }

  create() {
    // ─── CANVAS RESIZE ──────────────────────────────
    // Editor için canvas'ı tam ekran yap, kapatınca geri küçült
    this._originalWidth = this.scale.width;
    this._originalHeight = this.scale.height;
    this._prevScaleMode = this.scale.scaleMode;
    this._prevAutoCenter = this.scale.autoCenter;

    // RESIZE moduna geç — FIT modda canvas CSS tarafından küçültülüyor,
    // bu da palette'nin görünmemesine neden oluyor
    this.scale.setGameSize(Math.max(window.innerWidth, 960), Math.max(window.innerHeight, 600));
    this.scale.mode = Phaser.Scale.RESIZE;
    this.scale.autoCenter = Phaser.Scale.NO_CENTER;
    this.scale.refresh();

    const w = this.scale.width;
    const h = this.scale.height;

    // Tam canvas arka planı — diğer sahnelerin görünmemesi için
    this.cameras.main.setBackgroundColor('#0e0e1a');

    // Fare imlecini göster (CSS cursor: none'ı override et)
    this.input.setDefaultCursor('default');
    // Canvas element'ine de cursor ata — CSS cascade'i override et
    const canvas = this.game.canvas;
    if (canvas) {
      canvas.style.cursor = 'default';
    }

    // CSS'i fullscreen yap — flex centering'i kaldır, canvas'ı tam ekran yap
    const gameEl = document.getElementById('game');
    if (gameEl) {
      this._prevGameStyle = gameEl.style.cssText;
      gameEl.style.cssText = 'width:100vw;height:100vh;overflow:hidden;position:relative;cursor:default;';
    }

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

    // ─── DİNAMİK MAP BOYUTU ──────────────────────────
    this.mapCols = INITIAL_COLS;
    this.mapRows = INITIAL_ROWS;
    this.mapW = this.mapCols * TILE;
    this.mapH = this.mapRows * TILE;

    // Map data (2D array)
    this.mapData = this._createEmptyMap();

    // Object placement list
    this.objects = [];

    // Selection state
    this.selectionRect = null;
    this.selectedTiles = [];

    // Object selection state (rotation için)
    this.selectedObject = null;
    this._selectionHighlight = null;

    // ─── SETUP SCENE ───────────────────────────────
    this._setupCamera();
    this._createMapBackground();
    this._createGridOverlay();
    this._createCursor();
    this._setupUI();
    this._setupInput();
    this._setupEvents();

    // Kamera ignore listelerini uygula — main kamera UI'ı,
    // UI kamerası world'ü görmezden gelir
    this._applyCameraIgnoreLists();

    // Başlangıç mesajı
    this._showNotification('World Editor yüklendi! Sol panelden asset seçin.', 3000);
  }

  // ═══════════════════════════════════════════════════
  // CAMERA & ZOOM
  // ═══════════════════════════════════════════════════

  _setupCamera() {
    const cx = this.mapW / 2;
    const cy = this.mapH / 2;

    this.cameras.main.setBounds(
      -200, -200,
      this.mapW + 400, this.mapH + 400
    );
    this.cameras.main.centerOn(cx, cy);
    this.cameras.main.setZoom(this.zoom);

    // UI için ayrı kamera — zoom=1 ile render eder,
    // Container + scrollFactor(0) + zoom etkileşimini çözer
    this._uiElements = [];
    const W = this.scale.width;
    const H = this.scale.height;
    this.uiCamera = this.cameras.add(0, 0, W, H);
    this.uiCamera.setZoom(1);
    this.uiCamera.setBackgroundColor('rgba(0,0,0,0)');
    // UI kamera scrollsuz, bounds'suz çalışır
    this.uiCamera.setBounds(0, 0, W, H);
  }

  /**
   * UI element'ini hem scene'e ekler hem de _uiElements listesine kaydeder.
   * Döndürülen obje camera ignore listesi için kullanılır.
   */
  _addUIElement(obj) {
    if (obj) this._uiElements.push(obj);
    return obj;
  }

  /**
   * Tüm UI ve world elementlerini ilgili kameralara böler.
   * _setupUI tamamlandıktan sonra çağrılır.
   */
  _applyCameraIgnoreLists() {
    if (!this.uiCamera) return;

    // Main kamera: UI elementlerini göz ardı etsin
    if (this._uiElements.length > 0) {
      this.cameras.main.ignore(this._uiElements);
    }

    // UI kamera: World elementlerini göz ardı etsin
    const worldElements = [
      this.mapBg, this.gridGraphics,
      this.cursorGraphics, this.cursorPreview,
    ].filter(Boolean);

    // Tile sprites'ları ve object sprites'ları da world element
    if (this.tileSprites) {
      this.tileSprites.forEach(row => {
        if (row) row.forEach(s => { if (s) worldElements.push(s); });
      });
    }
    this.objects.forEach(obj => {
      if (obj && obj.sprite) worldElements.push(obj.sprite);
    });

    if (worldElements.length > 0) {
      this.uiCamera.ignore(worldElements);
    }
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
    this.mapBg.fillRect(0, 0, this.mapW, this.mapH);

    // Dış sınır çizgisi
    this.mapBg.lineStyle(2, 0xff4444);
    this.mapBg.strokeRect(0, 0, this.mapW, this.mapH);
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
    for (let x = 0; x <= this.mapW; x += TILE) {
      this.gridGraphics.lineBetween(x, 0, x, this.mapH);
    }

    // Yatay çizgiler
    for (let y = 0; y <= this.mapH; y += TILE) {
      this.gridGraphics.lineBetween(0, y, this.mapW, y);
    }

    // Her 5 tile'da bir koyu çizgi
    this.gridGraphics.lineStyle(1, 0xffffff, 0.25);
    for (let x = 0; x <= this.mapW; x += TILE * 5) {
      this.gridGraphics.lineBetween(x, 0, x, this.mapH);
    }
    for (let y = 0; y <= this.mapH; y += TILE * 5) {
      this.gridGraphics.lineBetween(0, y, this.mapW, y);
    }
  }

  // ═══════════════════════════════════════════════════
  // MAP RESIZE (DİNAMİK BOYUTLANDIRMA)
  // ═══════════════════════════════════════════════════

  _resizeMap(newCols, newRows) {
    newCols = Math.max(1, Math.min(newCols, 500));
    newRows = Math.max(1, Math.min(newRows, 500));

    if (newCols === this.mapCols && newRows === this.mapRows) return;

    // Mevcut tile verisini koruyarak yeni 2D array oluştur
    const oldData = this.mapData;
    const newData = [];

    for (let y = 0; y < newRows; y++) {
      newData[y] = [];
      for (let x = 0; x < newCols; x++) {
        if (oldData[y] && oldData[y][x]) {
          newData[y][x] = oldData[y][x];
        } else {
          newData[y][x] = null;
        }
      }
    }

    // Boyutları güncelle
    this.mapCols = newCols;
    this.mapRows = newRows;
    this.mapW = newCols * TILE;
    this.mapH = newRows * TILE;

    // Map data'yı güncelle
    this.mapData = newData;

    // Camera sınırlarını ve arka planı yeniden çiz
    this.cameras.main.setBounds(-200, -200, this.mapW + 400, this.mapH + 400);
    this.mapBg.clear();
    this.mapBg.fillStyle(0x2a2a2a);
    this.mapBg.fillRect(0, 0, this.mapW, this.mapH);
    this.mapBg.lineStyle(2, 0xff4444);
    this.mapBg.strokeRect(0, 0, this.mapW, this.mapH);

    // Grid'i yeniden çiz
    this._drawGrid();

    // Tüm tile'ları yeniden render et
    this._renderAllTiles();
    this._updateTileCount();

    this.events.emit('map-resized', { cols: newCols, rows: newRows });
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
    const W = this.scale.width;
    const H = this.scale.height;

    // Toolbar
    this.toolbar = new EditorToolbar(this);
    if (this.toolbar.container) {
      this.toolbar.container.setScrollFactor(0);
      this.toolbar.container.setDepth(1000);
      this._addUIElement(this.toolbar.container);
    }

    // Palette panel
    this.palette = new EditorPalette(this);
    if (this.palette.container) {
      this.palette.container.setScrollFactor(0);
      this.palette.container.setDepth(900);
      this._addUIElement(this.palette.container);
    }

    // Status bar (alt)
    this._createStatusBar();
    if (this.statusBar) {
      this.statusBar.setScrollFactor(0);
      this.statusBar.setDepth(1000);
      this._addUIElement(this.statusBar);
    }
    if (this.statusText) {
      this.statusText.setScrollFactor(0);
      this.statusText.setDepth(1001);
      this._addUIElement(this.statusText);
    }

    // Koordinat göstergesi
    this.coordText = this.add.text(W - 10, H - 24, '', {
      fontSize: '10px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(1100).setScrollFactor(0);
    this._addUIElement(this.coordText);

    // Tile count
    this.tileCountText = this.add.text(16, H - 24, '', {
      fontSize: '10px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setDepth(1100).setScrollFactor(0);
    this._addUIElement(this.tileCountText);

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

    // Object rotation
    k.on('keydown-T', () => this._rotateSelectedObject());

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

    // Escape - seçim iptal
    k.on('keydown-ESC', () => {
      this._clearObjectSelection();
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
    if (tileX >= 0 && tileX < this.mapCols && tileY >= 0 && tileY < this.mapRows) {
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
        // Object tıklama kontrolü
        const clickedObj = this._findObjectAt(pointer.worldX, pointer.worldY);
        if (clickedObj) {
          this.selectedObject = clickedObj;
          this._highlightObject(clickedObj);
          this._showNotification('Nesne seçildi [T ile döndür]', 1200);
          return;
        }
        this._clearObjectSelection();
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
    if (tileX < 0 || tileY < 0) return;
    if (!this.selectedAsset) return;

    // Otomatik genişletme: harita sınırlarının dışına çıkıldıysa büyüt
    if (tileX >= this.mapCols || tileY >= this.mapRows) {
      const newCols = Math.max(this.mapCols, tileX + 1);
      const newRows = Math.max(this.mapRows, tileY + 1);
      this._resizeMap(newCols, newRows);
    }

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
    if (tileX < 0 || tileX >= this.mapCols || tileY < 0 || tileY >= this.mapRows) return;

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
        if (this.selectedObject === obj) {
          this._clearObjectSelection();
        }
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
      // Tile sprite'ı sadece main kamerada render edilsin
      if (this.uiCamera) this.uiCamera.ignore(sprite);
    } catch (e) {
      console.warn(`Tile render hatası (${tileX},${tileY}):`, e);
    }
  }

  _renderAllTiles() {
    // Tüm tile render'larını temizle
    for (let y = 0; y < this.mapRows; y++) {
      for (let x = 0; x < this.mapCols; x++) {
        const key = `tile_${x}_${y}`;
        const existing = this.children.getByName(key);
        if (existing) existing.destroy();
      }
    }

    // Tüm tile'ları yeniden render et
    for (let y = 0; y < this.mapRows; y++) {
      for (let x = 0; x < this.mapCols; x++) {
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
      // Object sprite'ı sadece main kamerada render edilsin
      if (this.uiCamera) this.uiCamera.ignore(sprite);
      // Object listesine ekle
      this.objects.push({
        sprite,
        assetId: asset.id,
        textureKey: asset.textureKey,
        tileX,
        tileY,
        rotation: 0,
      });
    } catch (e) {
      console.warn(`Object placement hatası:`, e);
    }
  }

  // ═══════════════════════════════════════════════════
  // OBJECT SELECTION & ROTATION
  // ═══════════════════════════════════════════════════

  _findObjectAt(worldX, worldY) {
    // Object'leri tersten iterate et (üstteki önce)
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      const s = obj.sprite;
      const halfW = (s.displayWidth || 32) / 2;
      const halfH = (s.displayHeight || 32) / 2;
      if (worldX >= s.x - halfW && worldX <= s.x + halfW &&
          worldY >= s.y - halfH && worldY <= s.y + halfH) {
        return obj;
      }
    }
    return null;
  }

  _highlightObject(obj) {
    if (this._selectionHighlight) {
      this._selectionHighlight.destroy();
    }
    const s = obj.sprite;
    this._selectionHighlight = this.add.rectangle(
      s.x, s.y, s.displayWidth + 6, s.displayHeight + 6
    );
    this._selectionHighlight.setStrokeStyle(2, 0x00ff88);
    this._selectionHighlight.setFillStyle(0x00ff88, 0.15);
    this._selectionHighlight.setDepth(4);
    this._selectionHighlight.setAngle(obj.sprite.angle);
  }

  _rotateSelectedObject() {
    if (!this.selectedObject) {
      this._showNotification('Önce bir nesne seç! [S tool + tıkla]', 1500);
      return;
    }
    this._saveUndoState();
    const obj = this.selectedObject;
    obj.rotation = (obj.rotation + 1) % 4;
    obj.sprite.setAngle(obj.rotation * 90);
    if (this._selectionHighlight) {
      this._selectionHighlight.setAngle(obj.rotation * 90);
    }
    this._showNotification(`Döndürüldü: ${obj.rotation * 90}°`, 1000);
  }

  _clearObjectSelection() {
    this.selectedObject = null;
    if (this._selectionHighlight) {
      this._selectionHighlight.destroy();
      this._selectionHighlight = null;
    }
  }

  _floodFill(startX, startY) {
    if (startX < 0 || startX >= this.mapCols || startY < 0 || startY >= this.mapRows) return;

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
    const maxIterations = this.mapCols * this.mapRows;

    while (queue.length > 0 && iterations < maxIterations) {
      iterations++;
      const [cx, cy] = queue.shift();
      const key = `${cx},${cy}`;

      if (visited.has(key)) continue;
      if (cx < 0 || cx >= this.mapCols || cy < 0 || cy >= this.mapRows) continue;

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

    if (tileX < 0 || tileX >= this.mapCols || tileY < 0 || tileY >= this.mapRows) {
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
        if (x >= 0 && x < this.mapCols && y >= 0 && y < this.mapRows) {
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
    for (let y = 0; y < this.mapRows; y++) {
      for (let x = 0; x < this.mapCols; x++) {
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
        if (x >= 0 && x < this.mapCols && y >= 0 && y < this.mapRows) {
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
        rotation: obj.rotation || 0,
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
        rotation: obj.rotation || 0,
      })),
    };
    this.redoStack.push(currentState);

    // Undo state'ini yükle
    const prevState = this.undoStack.pop();
    this.mapData = prevState.mapData;

    // Object'leri temizle ve yeniden oluştur
    this._clearObjectSelection();
    this.objects.forEach(obj => obj.sprite.destroy());
    this.objects = [];
    prevState.objects.forEach(objData => {
      const asset = findAssetByTexture(objData.textureKey);
      if (asset) {
        this._placeObject(objData.tileX, objData.tileY, asset);
        if (objData.rotation) {
          const lastObj = this.objects[this.objects.length - 1];
          lastObj.rotation = objData.rotation;
          lastObj.sprite.setAngle(objData.rotation * 90);
        }
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
        rotation: obj.rotation || 0,
      })),
    };
    this.undoStack.push(currentState);

    // Redo state'ini yükle
    const nextState = this.redoStack.pop();
    this.mapData = nextState.mapData;

    this._clearObjectSelection();
    this.objects.forEach(obj => obj.sprite.destroy());
    this.objects = [];
    nextState.objects.forEach(objData => {
      const asset = findAssetByTexture(objData.textureKey);
      if (asset) {
        this._placeObject(objData.tileX, objData.tileY, asset);
        if (objData.rotation) {
          const lastObj = this.objects[this.objects.length - 1];
          lastObj.rotation = objData.rotation;
          lastObj.sprite.setAngle(objData.rotation * 90);
        }
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
      if (x >= 0 && x < this.mapCols && y >= 0 && y < this.mapRows && tile.data) {
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
      cols: this.mapCols,
      rows: this.mapRows,
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
        rotation: obj.rotation || 0,
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
    // Boyut bilgisi varsa haritayı yeniden boyutlandır
    const newCols = data.cols || INITIAL_COLS;
    const newRows = data.rows || INITIAL_ROWS;

    // Object'leri temizle
    this.objects.forEach(obj => obj.sprite.destroy());
    this.objects = [];

    // Haritayı yeniden boyutlandır (mevcut tile verisi korunarak)
    this._resizeMap(newCols, newRows);

    // Map data'yı yükle
    if (data.tiles && Array.isArray(data.tiles)) {
      this.mapData = data.tiles;
    }

    // Object'leri yeniden oluştur
    if (data.objects && Array.isArray(data.objects)) {
      data.objects.forEach(objData => {
        const asset = findAssetByTexture(objData.textureKey);
        if (asset) {
          this._placeObject(objData.tileX, objData.tileY, asset);
          if (objData.rotation) {
            const lastObj = this.objects[this.objects.length - 1];
            lastObj.rotation = objData.rotation;
            lastObj.sprite.setAngle(objData.rotation * 90);
          }
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
      cols: this.mapCols,
      rows: this.mapRows,
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
        rotation: obj.rotation || 0,
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

    // Harita boyutu değiştirme (toolbar'dan doğrudan gelir)
    this.events.on('resize-map', (data) => {
      if (data && typeof data.cols === 'number' && typeof data.rows === 'number') {
        this._resizeMap(data.cols, data.rows);
        this._showNotification(`Harita boyutu: ${this.mapCols}x${this.mapRows}`, 2000);
      }
    });

    // Boyut değişince toolbar'daki display'leri güncelle (auto-expansion durumunda)
    this.events.on('map-resized', (data) => {
      if (this.toolbar) {
        this.toolbar.updateMapSize(data.cols, data.rows);
      }
    });

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
        case 'resize-map':
          if (action.data && typeof action.data.cols === 'number' && typeof action.data.rows === 'number') {
            this._resizeMap(action.data.cols, action.data.rows);
            this._showNotification('Harita boyutu: ' + this.mapCols + 'x' + this.mapRows, 2000);
          }
          break;
      }
    });
  }

  // ═══════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════

  _createEmptyMap() {
    const map = [];
    for (let y = 0; y < this.mapRows; y++) {
      map[y] = [];
      for (let x = 0; x < this.mapCols; x++) {
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
    for (let y = 0; y < this.mapRows; y++) {
      for (let x = 0; x < this.mapCols; x++) {
        if (this.mapData[y][x]) count++;
      }
    }
    this.tileCountText.setText(`Tiles: ${count}/${this.mapCols * this.mapRows}`);
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
    bg.setScrollFactor(0);

    const text = this.add.text(W / 2, H / 2, message, {
      fontSize: '11px',
      color: '#e8d5a3',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5).setDepth(2001);
    text.setScrollFactor(0);

    // Bildirim elementleri sadece UI kamerada render edilsin
    if (this.cameras && this.cameras.main) {
      this.cameras.main.ignore([bg, text]);
    }

    this.time.delayedCall(duration, () => {
      bg.destroy();
      text.destroy();
    });
  }

  // Sahne kapanınca canvas'ı eski boyutuna geri al
  shutdown() {
    // Scale modunu geri yükle
    if (this._prevScaleMode != null) {
      this.scale.mode = this._prevScaleMode;
    }
    if (this._prevAutoCenter != null) {
      this.scale.autoCenter = this._prevAutoCenter;
    }
    if (this._originalWidth && this._originalHeight) {
      this.scale.resize(this._originalWidth, this._originalHeight);
    }
    this.scale.refresh();
    // CSS'i geri yükle
    const gameEl = document.getElementById('game');
    if (gameEl && this._prevGameStyle != null) {
      gameEl.style.cssText = this._prevGameStyle;
    }
    // Toolbar ve palette temizle
    if (this.toolbar) this.toolbar.destroy();
    if (this.palette) this.palette.destroy();
    // UI kamerayı temizle
    if (this.uiCamera) {
      this.cameras.remove(this.uiCamera);
      this.uiCamera = null;
    }
  }
}
