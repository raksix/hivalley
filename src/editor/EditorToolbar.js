// HiValley — World Editor Toolbar
//
// Üst bar: Araç seçimi, undo/redo, save/load, grid toggle, zoom kontrolü

import Phaser from 'phaser';
import { PALETTE } from '../utils/palette.js';

export class EditorToolbar {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.buttons = [];
    this.activeTool = 'paint'; // paint | eraser | select | move
    this.buttonsGroup = scene.add.container(0, 0);
    this.buttonsGroup.setDepth(1000);

    this._createToolbar();
  }

  _createToolbar() {
    const scene = this.scene;
    const W = scene.scale.width;

    // Arka plan paneli
    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(0, 0, W, 40, 0);
    bg.lineStyle(1, 0x3a3a5e);
    bg.strokeRoundedRect(0, 0, W, 40, 0);
    this.buttonsGroup.add(bg);

    // Araç butonları
    const tools = [
      { key: 'paint', icon: '🖌️', label: 'Boya', shortcut: 'B' },
      { key: 'eraser', icon: '🧹', label: 'Sil', shortcut: 'E' },
      { key: 'select', icon: '📦', label: 'Seç', shortcut: 'S' },
      { key: 'move', icon: '✋', label: 'Taşı', shortcut: 'M' },
      { key: 'fill', icon: '🪣', label: 'Doldur', shortcut: 'F' },
      { key: 'rect', icon: '⬜', label: 'Dikdörtgen', shortcut: 'R' },
    ];

    let xPos = 10;
    tools.forEach(tool => {
      const btn = this._createToolButton(xPos, 6, tool);
      this.buttons.push(btn);
      xPos += 50;
    });

    // Ayırıcı çizgi
    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x3a3a5e);
    sep.lineBetween(xPos, 8, xPos, 32);
    this.buttonsGroup.add(sep);
    xPos += 10;

    // Sol panel toggle
    this._createActionBtn(xPos, 6, '📋', 'Panel', () => {
      scene.events.emit('toggle-palette');
    });
    xPos += 50;

    // Grid toggle
    this.gridBtn = this._createActionBtn(xPos, 6, '🔲', 'Grid', () => {
      scene.events.emit('toggle-grid');
    });
    xPos += 50;

    // Snap toggle
    this.snapBtn = this._createActionBtn(xPos, 6, '🧲', 'Snap', () => {
      scene.events.emit('toggle-snap');
    });
    xPos += 50;

    // Undo
    this._createActionBtn(xPos, 6, '↩️', 'Geri Al', () => {
      scene.events.emit('undo');
    }, 'Ctrl+Z');
    xPos += 50;

    // Redo
    this._createActionBtn(xPos, 6, '↪️', 'İleri Al', () => {
      scene.events.emit('redo');
    }, 'Ctrl+Y');
    xPos += 55;

    // Ayırıcı
    const sep2 = scene.add.graphics();
    sep2.lineStyle(1, 0x3a3a5e);
    sep2.lineBetween(xPos, 8, xPos, 32);
    this.buttonsGroup.add(sep2);
    xPos += 10;

    // Kaydet
    this._createActionBtn(xPos, 6, '💾', 'Kaydet', () => {
      scene.events.emit('save-map');
    }, 'Ctrl+S');
    xPos += 50;

    // Yükle
    this._createActionBtn(xPos, 6, '📂', 'Yükle', () => {
      scene.events.emit('load-map');
    }, 'Ctrl+O');
    xPos += 50;

    // Export
    this._createActionBtn(xPos, 6, '📤', 'Export', () => {
      scene.events.emit('export-map');
    });
    xPos += 50;

    // Sağ tarafta: Zoom + Info
    const rightX = W - 10;

    // Zoom Controls
    const zoomLabel = scene.add.text(rightX - 100, 11, '🔍', {
      fontSize: '16px',
    });
    this.buttonsGroup.add(zoomLabel);

    const zoomOutBtn = scene.add.text(rightX - 75, 10, '➖', {
      fontSize: '14px',
      padding: { x: 4, y: 2 },
    }).setInteractive({ useHandCursor: true });
    zoomOutBtn.on('pointerdown', () => scene.events.emit('zoom-out'));
    this.buttonsGroup.add(zoomOutBtn);

    this.zoomText = scene.add.text(rightX - 52, 11, '100%', {
      fontSize: '11px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    });
    this.buttonsGroup.add(this.zoomText);

    const zoomInBtn = scene.add.text(rightX - 22, 10, '➕', {
      fontSize: '14px',
      padding: { x: 4, y: 2 },
    }).setInteractive({ useHandCursor: true });
    zoomInBtn.on('pointerdown', () => scene.events.emit('zoom-in'));
    this.buttonsGroup.add(zoomInBtn);
  }

  _createToolButton(x, y, tool) {
    const scene = this.scene;
    const container = scene.add.container(x, y);

    const bg = scene.add.graphics();
    const isActive = this.activeTool === tool.key;
    bg.fillStyle(isActive ? 0x4a4a8e : 0x2a2a4e, 0.8);
    bg.fillRoundedRect(0, 0, 44, 28, 4);
    container.add(bg);

    const icon = scene.add.text(6, 4, tool.icon, {
      fontSize: '14px',
    });
    container.add(icon);

    const label = scene.add.text(24, 6, tool.label, {
      fontSize: '8px',
      color: '#ccccee',
      fontFamily: 'monospace',
    });
    container.add(label);

    container.setSize(44, 28);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      this.setActiveTool(tool.key);
    });

    container.on('pointerover', () => {
      if (this.activeTool !== tool.key) {
        bg.clear();
        bg.fillStyle(0x3a3a6e, 0.8);
        bg.fillRoundedRect(0, 0, 44, 28, 4);
      }
    });

    container.on('pointerout', () => {
      if (this.activeTool !== tool.key) {
        bg.clear();
        bg.fillStyle(0x2a2a4e, 0.8);
        bg.fillRoundedRect(0, 0, 44, 28, 4);
      }
    });

    this.buttonsGroup.add(container);

    // Kısayol etiketi
    if (tool.shortcut) {
      const shortcut = scene.add.text(x + 36, y + 20, tool.shortcut, {
        fontSize: '7px',
        color: '#666688',
        fontFamily: 'monospace',
      });
      this.buttonsGroup.add(shortcut);
    }

    return { key: tool.key, container, bg };
  }

  _createActionBtn(x, y, icon, label, callback, shortcut = '') {
    const scene = this.scene;
    const container = scene.add.container(x, y);

    const bg = scene.add.graphics();
    bg.fillStyle(0x2a2a4e, 0.8);
    bg.fillRoundedRect(0, 0, 44, 28, 4);
    container.add(bg);

    const iconText = scene.add.text(10, 5, icon, {
      fontSize: '14px',
    });
    container.add(iconText);

    container.setSize(44, 28);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', callback);

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x3a3a6e, 0.8);
      bg.fillRoundedRect(0, 0, 44, 28, 4);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x2a2a4e, 0.8);
      bg.fillRoundedRect(0, 0, 44, 28, 4);
    });

    this.buttonsGroup.add(container);

    if (shortcut) {
      const sc = scene.add.text(x + 2, y + 20, shortcut, {
        fontSize: '6px',
        color: '#666688',
        fontFamily: 'monospace',
      });
      this.buttonsGroup.add(sc);
    }

    return container;
  }

  setActiveTool(toolKey) {
    this.activeTool = toolKey;

    // Tüm tool butonlarını güncelle
    this.buttons.forEach(btn => {
      const isActive = btn.key === toolKey;
      btn.bg.clear();
      btn.bg.fillStyle(isActive ? 0x4a4a8e : 0x2a2a4e, 0.8);
      btn.bg.fillRoundedRect(0, 0, 44, 28, 4);
    });

    this.scene.events.emit('tool-changed', toolKey);
  }

  updateZoom(level) {
    if (this.zoomText) {
      this.zoomText.setText(`${Math.round(level * 100)}%`);
    }
  }

  destroy() {
    this.buttonsGroup.destroy();
  }
}
