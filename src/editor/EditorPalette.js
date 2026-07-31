// HiValley — World Editor Palette Panel
//
// Sol taraftaki asset paleti paneli: kategori sekmeleri, arama kutusu,
// asset grid'i, preview ve seçim sistemi.
// Responsive: Ekran boyutuna göre otomatik uyum sağlar

import Phaser from 'phaser';
import { ASSET_CATEGORIES, searchAssets, getAllAssets } from './AssetRegistry.js';

const PANEL_W = 156;
const ITEM_SIZE = 28;
const ITEM_GAP = 2;
const SEARCH_H = 22;
const TAB_H = 20;
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
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.itemContainers = [];

    this.container = scene.add.container(0, 0);
    this.container.setDepth(900);

    this._createPanel();
    this._createSearchBar();
    this._createCategoryTabs();
    this._createAssetGrid();
    this._createPreview();
  }

  _createPanel() {
    const scene = this.scene;
    const W = scene.scale.width;
    const H = scene.scale.height;
    const toolbarH = 34;
    const statusH = 22;
    const panelH = H - toolbarH - statusH;

    // Panel arka planı
    this.panelBg = scene.add.graphics();
    this.panelBg.fillStyle(0x12122a, 0.95);
    this.panelBg.fillRect(0, toolbarH, PANEL_W, panelH);
    this.panelBg.lineStyle(1, 0x3a3a5e, 0.5);
    this.panelBg.lineBetween(PANEL_W, toolbarH, PANEL_W, toolbarH + panelH);
    this.container.add(this.panelBg);

    this._panelH = panelH;
    this._toolbarH = toolbarH;
  }

  _createSearchBar() {
    const scene = this.scene;
    const y = this._toolbarH + 6;

    // Arama kutusu arka planı
    const searchBg = scene.add.graphics();
    searchBg.fillStyle(0x1a1a36, 0.9);
    searchBg.fillRoundedRect(6, y, PANEL_W - 12, SEARCH_H, 4);
    searchBg.lineStyle(1, 0x3a3a5e, 0.4);
    searchBg.strokeRoundedRect(6, y, PANEL_W - 12, SEARCH_H, 4);
    this.container.add(searchBg);

    // Arama ikonu
    const searchIcon = scene.add.text(12, y + SEARCH_H / 2, '🔍', {
      fontSize: '10px',
    }).setOrigin(0, 0.5);
    this.container.add(searchIcon);

    // Arama metni
    this.searchText = scene.add.text(26, y + SEARCH_H / 2, 'Ara...', {
      fontSize: '9px',
      color: '#666688',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
    this.container.add(this.searchText);

    // Tıklama alanı
    const hitArea = scene.add.rectangle(PANEL_W / 2, y + SEARCH_H / 2, PANEL_W - 12, SEARCH_H);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => {
      // Browser prompt ile arama
      const query = prompt('Asset ara:');
      if (query !== null) {
        this._filterAssets(query);
      }
    });
    this.container.add(hitArea);
  }

  _createCategoryTabs() {
    const scene = this.scene;
    const y = this._toolbarH + 6 + SEARCH_H + 4;
    const categories = Object.entries(ASSET_CATEGORIES);
    const tabW = Math.floor((PANEL_W - 12) / Math.min(categories.length, 3));

    this.tabButtons = [];

    categories.forEach(([key, cat], i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const tx = 6 + col * tabW;
      const ty = y + row * TAB_H;

      const container = scene.add.container(tx, ty);

      const bg = scene.add.graphics();
      const isActive = key === this.currentCategory;
      bg.fillStyle(isActive ? 0x3a3a6e : 0x1a1a36, 0.9);
      bg.fillRoundedRect(0, 0, tabW - 2, TAB_H - 2, 3);
      container.add(bg);

      // Emoji + Kısa isim
      const parts = cat.name.split(' ');
      const shortName = parts.length > 1 ? parts[0] : cat.name.substring(0, 4);
      const label = scene.add.text((tabW - 2) / 2, (TAB_H - 2) / 2, shortName, {
        fontSize: '8px',
        color: isActive ? '#e8d5a3' : '#8888aa',
        align: 'center',
      }).setOrigin(0.5);
      container.add(label);

      container.setSize(tabW - 2, TAB_H - 2);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerdown', () => {
        this.currentCategory = key;
        this.scrollY = 0;
        this._refreshTabs();
        this._refreshGrid();
      });

      container.on('pointerover', () => {
        if (key !== this.currentCategory) {
          bg.clear();
          bg.fillStyle(0x2a2a5e, 0.9);
          bg.fillRoundedRect(0, 0, tabW - 2, TAB_H - 2, 3);
        }
      });

      container.on('pointerout', () => {
        this._refreshTabs();
      });

      this.container.add(container);
      this.tabButtons.push({ key, container, bg, label });
    });

    this._tabsEndY = y + Math.ceil(categories.length / 3) * TAB_H + 4;
  }

  _refreshTabs() {
    this.tabButtons.forEach(tab => {
      const isActive = tab.key === this.currentCategory;
      tab.bg.clear();
      tab.bg.fillStyle(isActive ? 0x3a3a6e : 0x1a1a36, 0.9);
      tab.bg.fillRoundedRect(0, 0, tab.container.width || 48, TAB_H - 2, 3);
      tab.label.setColor(isActive ? '#e8d5a3' : '#8888aa');
    });
  }

  _createAssetGrid() {
    const scene = this.scene;
    const gridY = this._tabsEndY;
    const gridH = this._panelH - (gridY - this._toolbarH) - 60;
    const cols = Math.floor((PANEL_W - GRID_PADDING * 2) / (ITEM_SIZE + ITEM_GAP));

    // Scroll maskesi
    this.gridContainer = scene.add.container(0, gridY);
    this.container.add(this.gridContainer);

    // Scroll çubuğu arka planı
    this.scrollTrackBg = scene.add.graphics();
    this.scrollTrackBg.fillStyle(0x0e0e1a, 0.8);
    this.scrollTrackBg.fillRect(PANEL_W - 6, gridY, 4, gridH);
    this.container.add(this.scrollTrackBg);

    this._gridY = gridY;
    this._gridH = gridH;
    this._cols = cols;

    this._renderGridItems();

    // Scroll tekerleği
    scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      if (pointer.x < PANEL_W && pointer.y > gridY && pointer.y < gridY + gridH) {
        this.scrollY = Phaser.Math.Clamp(
          this.scrollY + (deltaY > 0 ? 20 : -20),
          0,
          Math.max(0, this.maxScrollY)
        );
        this._updateScroll();
      }
    });
  }

  _renderGridItems() {
    // Mevcut itemları temizle
    this.itemContainers.forEach(c => c.destroy());
    this.itemContainers = [];

    const scene = this.scene;
    const category = ASSET_CATEGORIES[this.currentCategory];
    if (!category) return;

    const items = this._filteredItems || category.items;
    const cols = this._cols;

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = GRID_PADDING + col * (ITEM_SIZE + ITEM_GAP);
      const y = row * (ITEM_SIZE + ITEM_GAP);

      const container = scene.add.container(x, y);

      // Item arka planı
      const bg = scene.add.graphics();
      const isSelected = this.selectedAsset && this.selectedAsset.id === item.id;
      bg.fillStyle(isSelected ? 0x3a3a7e : 0x1a1a36, 0.8);
      bg.fillRoundedRect(0, 0, ITEM_SIZE, ITEM_SIZE, 3);
      bg.lineStyle(1, isSelected ? 0x6a6aae : 0x2a2a4e, 0.5);
      bg.strokeRoundedRect(0, 0, ITEM_SIZE, ITEM_SIZE, 3);
      container.add(bg);

      // Thumbnail
      if (item.textureKey && scene.textures.exists(item.textureKey)) {
        try {
          const img = scene.add.image(ITEM_SIZE / 2, ITEM_SIZE / 2, item.textureKey, item.frame || 0);
          img.setDisplaySize(ITEM_SIZE - 6, ITEM_SIZE - 6);
          container.add(img);
        } catch (e) {
          this._addPlaceholder(container);
        }
      } else {
        // Renk swatch
        const color = Phaser.Display.Color.HexStringToColor(item.color || '#444466');
        const swatch = scene.add.graphics();
        swatch.fillStyle(color.color, 0.9);
        swatch.fillRoundedRect(4, 4, ITEM_SIZE - 8, ITEM_SIZE - 8, 2);
        container.add(swatch);
      }

      // Tıklama
      container.setSize(ITEM_SIZE, ITEM_SIZE);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerdown', () => {
        this.selectedAsset = item;
        this.scene.events.emit('asset-selected', item);
        this._refreshGrid();
      });

      container.on('pointerover', () => {
        if (!isSelected) {
          bg.clear();
          bg.fillStyle(0x2a2a5e, 0.8);
          bg.fillRoundedRect(0, 0, ITEM_SIZE, ITEM_SIZE, 3);
          bg.lineStyle(1, 0x4a4a7e, 0.5);
          bg.strokeRoundedRect(0, 0, ITEM_SIZE, ITEM_SIZE, 3);
        }
      });

      container.on('pointerout', () => {
        this._refreshGrid();
      });

      this.gridContainer.add(container);
      this.itemContainers.push(container);
    });

    // Scroll limit hesapla
    const totalRows = Math.ceil(items.length / cols);
    const totalH = totalRows * (ITEM_SIZE + ITEM_GAP);
    this.maxScrollY = Math.max(0, totalH - this._gridH);

    // Scroll bar thumb
    this._updateScrollBar();
  }

  _refreshGrid() {
    this._renderGridItems();
  }

  _filterAssets(query) {
    if (!query || query.trim() === '') {
      this._filteredItems = null;
      this.searchText.setText('Ara...');
    } else {
      this._filteredItems = searchAssets(query);
      this.searchText.setText(query);
    }
    this.scrollY = 0;
    this._refreshGrid();
  }

  _updateScroll() {
    if (this.gridContainer) {
      this.gridContainer.y = this._gridY - this.scrollY;
    }
    this._updateScrollBar();
  }

  _updateScrollBar() {
    // Scroll bar thumb güncelle
    if (this.scrollThumb) this.scrollThumb.destroy();

    if (this.maxScrollY <= 0) return;

    const scene = this.scene;
    const thumbH = Math.max(16, (this._gridH / (this._gridH + this.maxScrollY)) * this._gridH);
    const thumbY = this._gridY + (this.scrollY / this.maxScrollY) * (this._gridH - thumbH);

    this.scrollThumb = scene.add.graphics();
    this.scrollThumb.fillStyle(0x4a4a6e, 0.6);
    this.scrollThumb.fillRoundedRect(PANEL_W - 6, thumbY, 4, thumbH, 2);
    this.container.add(this.scrollThumb);
  }

  _createPreview() {
    const scene = this.scene;
    const previewY = this._toolbarH + this._panelH - 56;

    // Preview arka planı
    const previewBg = scene.add.graphics();
    previewBg.fillStyle(0x0e0e1a, 0.9);
    previewBg.fillRect(0, previewY, PANEL_W, 56);
    previewBg.lineStyle(1, 0x2a2a4e, 0.4);
    previewBg.lineBetween(0, previewY, PANEL_W, previewY);
    this.container.add(previewBg);

    // Preview image
    this.previewImage = scene.add.image(PANEL_W / 2 - 20, previewY + 28, '__DEFAULT');
    this.previewImage.setDisplaySize(32, 32);
    this.previewImage.setAlpha(0.8);
    this.container.add(this.previewImage);

    // Preview text
    this.previewName = scene.add.text(PANEL_W / 2 + 6, previewY + 14, 'Seçilmedi', {
      fontSize: '8px',
      color: '#aaaacc',
      fontFamily: 'monospace',
      wordWrap: { width: PANEL_W / 2 - 12 },
    });
    this.container.add(this.previewName);

    this.previewInfo = scene.add.text(PANEL_W / 2 + 6, previewY + 30, '', {
      fontSize: '7px',
      color: '#666688',
      fontFamily: 'monospace',
    });
    this.container.add(this.previewInfo);

    // Asset seçildiğinde preview güncelle
    this.scene.events.on('asset-selected', (asset) => {
      if (asset) {
        this.previewName.setText(asset.name || asset.id);
        this.previewInfo.setText(asset.type || '');
        if (asset.textureKey && scene.textures.exists(asset.textureKey)) {
          this.previewImage.setTexture(asset.textureKey, asset.frame || 0);
          this.previewImage.setDisplaySize(32, 32);
          this.previewImage.setAlpha(0.8);
        }
      } else {
        this.previewName.setText('Seçilmedi');
        this.previewInfo.setText('');
      }
    });
  }

  _addPlaceholder(container) {
    const placeholder = this.scene.add.graphics();
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

  getWidth() {
    return this.visible ? PANEL_W : 0;
  }

  destroy() {
    this.container.destroy();
  }
}
