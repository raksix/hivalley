// HiValley — World Editor Palette Panel
//
// Sol taraftaki asset paleti paneli: kategori sekmeleri, arama kutusu,
// asset grid'i, preview ve seçim sistemi.

import Phaser from 'phaser';
import { ASSET_CATEGORIES, searchAssets, getAllAssets } from './AssetRegistry.js';

const PANEL_W = 220;
const ITEM_SIZE = 40;
const ITEM_GAP = 4;
const SEARCH_H = 30;
const TAB_H = 28;
const GRID_PADDING = 8;

export class EditorPalette {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.visible = true;
    this.selectedAsset = null;
    this.currentCategory = 'tiles';
    this.searchQuery = '';
    this.container = scene.add.container(0, 40);
    this.container.setDepth(900);

    this._createPanel();
    this._populateGrid();
  }

  _createPanel() {
    const scene = this.scene;
    const H = scene.scale.height - 40;

    // Panel arka planı
    const bg = scene.add.graphics();
    bg.fillStyle(0x12122a, 0.95);
    bg.fillRoundedRect(0, 0, PANEL_W, H, { tl: 0, tr: 8, bl: 0, br: 8 });
    bg.lineStyle(1, 0x3a3a5e);
    bg.strokeRoundedRect(0, 0, PANEL_W, H, { tl: 0, tr: 8, bl: 0, br: 8 });
    this.container.add(bg);

    // Başlık
    const title = scene.add.text(PANEL_W / 2, 8, '🎨 ASSET PALETTE', {
      fontSize: '11px',
      color: '#e8d5a3',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // Arama kutusu
    this._createSearchBox();

    // Kategori sekmeleri
    this._createCategoryTabs();

    // Grid alanı - tab'ların bittiği yerden başla (max 2 satır tab)
    const tabRows = Math.ceil(Object.keys(ASSET_CATEGORIES).length / 5);
    const gridY = SEARCH_H + 34 + tabRows * (TAB_H + 2) + 4;
    this.gridContainer = scene.add.container(0, gridY);
    this.container.add(this.gridContainer);

    // Seçili asset preview
    this.previewContainer = scene.add.container(0, H - 90);
    this.container.add(this.previewContainer);
    this._createPreview();
  }

  _createSearchBox() {
    const scene = this.scene;
    const y = 28;

    // Arama arka planı
    const searchBg = scene.add.graphics();
    searchBg.fillStyle(0x1e1e3a, 0.9);
    searchBg.fillRoundedRect(GRID_PADDING, y, PANEL_W - GRID_PADDING * 2, SEARCH_H, 4);
    searchBg.lineStyle(1, 0x3a3a5e);
    searchBg.strokeRoundedRect(GRID_PADDING, y, PANEL_W - GRID_PADDING * 2, SEARCH_H, 4);
    this.container.add(searchBg);

    // Arama ikonu
    const searchIcon = scene.add.text(GRID_PADDING + 6, y + 6, '🔍', {
      fontSize: '12px',
    });
    this.container.add(searchIcon);

    // Arama input alanı
    this.searchText = scene.add.text(GRID_PADDING + 28, y + 7, 'Asset ara...', {
      fontSize: '10px',
      color: '#666688',
      fontFamily: 'monospace',
    });
    this.container.add(this.searchText);

    // Tıklama alanı
    const hitArea = scene.add.rectangle(
      PANEL_W / 2, y + SEARCH_H / 2,
      PANEL_W - GRID_PADDING * 2, SEARCH_H
    ).setInteractive({ useHandCursor: true });
    hitArea.setAlpha(0.001);
    this.container.add(hitArea);

    // Click handler - input moda geç
    hitArea.on('pointerdown', () => {
      this._activateSearch();
    });

    // ESC ile aramayı temizle
    scene.input.keyboard.on('keydown-ESC', () => {
      if (this.searchActive) {
        this._deactivateSearch();
      }
    });

    this.searchActive = false;
  }

  _activateSearch() {
    if (this.searchActive) return;
    this.searchActive = true;

    const scene = this.scene;
    this.searchText.setText('');
    this.searchText.setColor('#eeeeee');

    // Basit text input: klavye olaylarını yakala
    this._searchInputHandler = (event) => {
      if (event.key === 'Escape') {
        this._deactivateSearch();
        return;
      }
      if (event.key === 'Backspace') {
        this.searchQuery = this.searchQuery.slice(0, -1);
      } else if (event.key === 'Enter') {
        this._deactivateSearch();
        return;
      } else if (event.key.length === 1) {
        this.searchQuery += event.key;
      }

      this.searchText.setText(this.searchQuery || 'Asset ara...');
      this.searchText.setColor(this.searchQuery ? '#eeeeee' : '#666688');
      this._populateGrid();
    };

    scene.input.keyboard.on('keydown', this._searchInputHandler);
  }

  _deactivateSearch() {
    this.searchActive = false;
    const scene = this.scene;
    if (this._searchInputHandler) {
      scene.input.keyboard.off('keydown', this._searchInputHandler);
      this._searchInputHandler = null;
    }
    if (!this.searchQuery) {
      this.searchText.setText('Asset ara...');
      this.searchText.setColor('#666688');
    }
  }

  _createCategoryTabs() {
    const scene = this.scene;
    const y = SEARCH_H + 34;
    const categories = Object.keys(ASSET_CATEGORIES);
    // Her satırda5 kategori sığdır (daha geniş tab)
    const cols = 5;
    const tabWidth = (PANEL_W - GRID_PADDING * 2) / cols;

    this.tabButtons = [];

    // Kısa etiketler - emoji yerine düz text
    const SHORT_LABELS = {
      tiles: 'Tiles',
      kenneyTiles: 'Kenney',
      buildings: 'Bldg',
      nature: 'Nature',
      fences: 'Fence',
      roads: 'Roads',
      items: 'Items',
      crops: 'Crops',
      animals: 'Animal',
      character: 'Char',
    };

    const rows = Math.ceil(categories.length / cols);
    for (let r = 0; r < rows; r++) {
      const row = categories.slice(r * cols, (r + 1) * cols);
      row.forEach((key, i) => {
        const cat = ASSET_CATEGORIES[key];
        const x = GRID_PADDING + i * tabWidth;
        const label = SHORT_LABELS[key] || cat.name;
        const btn = this._createTab(x, y + r * (TAB_H + 2), tabWidth, key, label);
        this.tabButtons.push({ key, btn });
      });
    }
  }

  _createTab(x, y, width, key, label) {
    const scene = this.scene;
    const isActive = this.currentCategory === key;

    const container = scene.add.container(x, y);

    const bg = scene.add.graphics();
    bg.fillStyle(isActive ? 0x3a3a6e : 0x1e1e3a, 0.9);
    bg.fillRoundedRect(1, 0, width - 2, TAB_H, 3);
    container.add(bg);

    const text = scene.add.text(width / 2, TAB_H / 2, label, {
      fontSize: '8px',
      color: isActive ? '#e8d5a3' : '#8888aa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    container.add(text);

    container.setSize(width, TAB_H);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      this.currentCategory = key;
      this.searchQuery = '';
      this.searchText.setText('Asset ara...');
      this.searchText.setColor('#666688');
      this._updateTabs();
      this._populateGrid();
    });

    container.on('pointerover', () => {
      if (this.currentCategory !== key) {
        bg.clear();
        bg.fillStyle(0x2a2a5e, 0.9);
        bg.fillRoundedRect(1, 0, width - 2, TAB_H, 3);
      }
    });

    container.on('pointerout', () => {
      if (this.currentCategory !== key) {
        bg.clear();
        bg.fillStyle(0x1e1e3a, 0.9);
        bg.fillRoundedRect(1, 0, width - 2, TAB_H, 3);
      }
    });

    this.container.add(container);
    return { container, bg, text };
  }

  _updateTabs() {
    this.tabButtons.forEach(({ key, btn }) => {
      const isActive = this.currentCategory === key;
      btn.bg.clear();
      btn.bg.fillStyle(isActive ? 0x3a3a6e : 0x1e1e3a, 0.9);
      btn.bg.fillRoundedRect(1, 0, btn.container.width - 2, TAB_H, 3);
      btn.text.setColor(isActive ? '#e8d5a3' : '#8888aa');
    });
  }

  _populateGrid() {
    // Eski grid içeriğini temizle
    this.gridContainer.removeAll(true);

    const scene = this.scene;
    let items;

    if (this.searchQuery) {
      items = searchAssets(this.searchQuery);
    } else {
      items = (ASSET_CATEGORIES[this.currentCategory]?.items || []).map(item => ({
        ...item,
        categoryName: ASSET_CATEGORIES[this.currentCategory].name,
      }));
    }

    const cols = Math.floor((PANEL_W - GRID_PADDING * 2) / (ITEM_SIZE + ITEM_GAP));
    const startY = 4;

    items.forEach((asset, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = GRID_PADDING + col * (ITEM_SIZE + ITEM_GAP);
      const y = startY + row * (ITEM_SIZE + ITEM_GAP);

      this._createGridItem(x, y, asset);
    });

    // Scroll alanı için toplam yükseklik
    const totalRows = Math.ceil(items.length / cols);
    const totalHeight = totalRows * (ITEM_SIZE + ITEM_GAP);
    this.gridContainer.setCrop(0, 0, PANEL_W, this.scene.scale.height - 200);
  }

  _createGridItem(x, y, asset) {
    const scene = this.scene;

    const container = scene.add.container(x, y);

    // Arka plan
    const bg = scene.add.graphics();
    const isSelected = this.selectedAsset?.id === asset.id;
    bg.fillStyle(isSelected ? 0x4a4a8e : 0x1e1e3a, 0.8);
    bg.fillRoundedRect(0, 0, ITEM_SIZE, ITEM_SIZE, 4);
    bg.lineStyle(isSelected ? 2 : 1, isSelected ? 0x7a7ade : 0x3a3a5e);
    bg.strokeRoundedRect(0, 0, ITEM_SIZE, ITEM_SIZE, 4);
    container.add(bg);

    // Thumbnail - texture yüklü mü kontrol et
    const texExists = scene.textures.exists(asset.textureKey);
    if (texExists) {
      try {
        if (asset.type === 'tile' || asset.type === 'spritesheet') {
          const thumb = scene.add.image(ITEM_SIZE / 2, ITEM_SIZE / 2, asset.textureKey, asset.frame ?? 0);
          thumb.setDisplaySize(ITEM_SIZE - 8, ITEM_SIZE - 8);
          container.add(thumb);
        } else if (asset.type === 'object') {
          const thumb = scene.add.image(ITEM_SIZE / 2, ITEM_SIZE / 2, asset.textureKey);
          thumb.setDisplaySize(ITEM_SIZE - 8, ITEM_SIZE - 8);
          container.add(thumb);
        }
      } catch (e) {
        this._addPlaceholder(container);
      }
    } else {
      this._addPlaceholder(container);
    }

    // Tooltip (hover'da göster)
    const tooltip = scene.add.text(ITEM_SIZE / 2, ITEM_SIZE + 2, asset.name, {
      fontSize: '7px',
      color: '#ccccdd',
      fontFamily: 'monospace',
      backgroundColor: '#1a1a2e',
      padding: { x: 2, y: 1 },
    }).setOrigin(0.5, 0).setAlpha(0).setDepth(1100);
    container.add(tooltip);

    container.setSize(ITEM_SIZE, ITEM_SIZE);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      tooltip.setAlpha(1);
      if (this.selectedAsset?.id !== asset.id) {
        bg.clear();
        bg.fillStyle(0x2a2a5e, 0.8);
        bg.fillRoundedRect(0, 0, ITEM_SIZE, ITEM_SIZE, 4);
        bg.lineStyle(1, 0x5a5a8e);
        bg.strokeRoundedRect(0, 0, ITEM_SIZE, ITEM_SIZE, 4);
      }
    });

    container.on('pointerout', () => {
      tooltip.setAlpha(0);
      if (this.selectedAsset?.id !== asset.id) {
        bg.clear();
        bg.fillStyle(0x1e1e3a, 0.8);
        bg.fillRoundedRect(0, 0, ITEM_SIZE, ITEM_SIZE, 4);
        bg.lineStyle(1, 0x3a3a5e);
        bg.strokeRoundedRect(0, 0, ITEM_SIZE, ITEM_SIZE, 4);
      }
    });

    container.on('pointerdown', () => {
      this.selectAsset(asset);
    });

    this.gridContainer.add(container);
  }

  selectAsset(asset) {
    this.selectedAsset = asset;

    // Preview güncelle
    this._updatePreview(asset);

    // Grid'de seçimi vurgula
    this._populateGrid();

    // Editor scene'e bildir
    this.scene.events.emit('asset-selected', asset);
  }

  _createPreview() {
    const scene = this.scene;
    const y = 8;

    // Preview arka planı
    this.previewBg = scene.add.graphics();
    this.previewBg.fillStyle(0x1a1a2e, 0.9);
    this.previewBg.fillRoundedRect(GRID_PADDING, y, PANEL_W - GRID_PADDING * 2, 70, 4);
    this.previewBg.lineStyle(1, 0x3a3a5e);
    this.previewBg.strokeRoundedRect(GRID_PADDING, y, PANEL_W - GRID_PADDING * 2, 70, 4);
    this.previewContainer.add(this.previewBg);

    // Preview icon
    this.previewIcon = scene.add.image(PANEL_W / 2 - 40, y + 35, '__DEFAULT');
    this.previewIcon.setVisible(false);
    this.previewContainer.add(this.previewIcon);

    // Preview text
    this.previewName = scene.add.text(PANEL_W / 2 + 10, y + 12, 'Asset Seç', {
      fontSize: '10px',
      color: '#e8d5a3',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.previewContainer.add(this.previewName);

    this.previewType = scene.add.text(PANEL_W / 2 + 10, y + 28, 'Tür: -', {
      fontSize: '8px',
      color: '#8888aa',
      fontFamily: 'monospace',
    });
    this.previewContainer.add(this.previewType);

    this.previewTags = scene.add.text(PANEL_W / 2 + 10, y + 42, 'Etiketler: -', {
      fontSize: '7px',
      color: '#666688',
      fontFamily: 'monospace',
      wordWrap: { width: PANEL_W - 80 },
    });
    this.previewContainer.add(this.previewTags);
  }

  _updatePreview(asset) {
    if (!asset) return;

    this.previewName.setText(asset.name);
    this.previewType.setText(`Tür: ${asset.type} | Kategori: ${asset.categoryName || '-'}`);
    this.previewTags.setText(`Etiketler: ${(asset.tags || []).join(', ')}`);

    // Thumbnail - texture yüklü mü kontrol et
    const texExists = this.scene.textures.exists(asset.textureKey);
    if (texExists) {
      try {
        if (asset.type === 'tile' || asset.type === 'spritesheet') {
          this.previewIcon.setTexture(asset.textureKey, asset.frame ?? 0);
        } else {
          this.previewIcon.setTexture(asset.textureKey, 0);
        }
        this.previewIcon.setDisplaySize(48, 48);
        this.previewIcon.setPosition(PANEL_W / 2 - 50, 44);
        this.previewIcon.setVisible(true);
      } catch (e) {
        this.previewIcon.setVisible(false);
      }
    } else {
      this.previewIcon.setVisible(false);
    }
  }

  _addPlaceholder(container) {
    const placeholder = this.scene.add.graphics();
    // Yeşil diagonal cross - texture yüklenmediğini belirtir
    placeholder.fillStyle(0x2a2a4e, 0.8);
    placeholder.fillRect(4, 4, ITEM_SIZE - 8, ITEM_SIZE - 8);
    placeholder.lineStyle(1, 0x4a4a6e);
    placeholder.strokeRect(4, 4, ITEM_SIZE - 8, ITEM_SIZE - 8);
    placeholder.lineStyle(1, 0x3a6a3a);
    placeholder.lineBetween(6, 6, ITEM_SIZE - 6, ITEM_SIZE - 6);
    placeholder.lineBetween(ITEM_SIZE - 6, 6, 6, ITEM_SIZE - 6);
    container.add(placeholder);
  }

  toggle() {
    this.visible = !this.visible;
    this.container.setVisible(this.visible);
    this.scene.events.emit('palette-toggled', this.visible);
  }

  destroy() {
    this.container.destroy();
  }
}
