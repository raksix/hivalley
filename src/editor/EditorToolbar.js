// HiValley — World Editor Toolbar
//
// Üst bar: Araç seçimi, undo/redo, save/load, grid toggle, zoom kontrolü
// Responsive: Ekran boyutuna göre otomatik uyum sağlar

import Phaser from 'phaser';

export class EditorToolbar {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.buttons = [];
    this.actionButtons = [];
    this.activeTool = 'paint';
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1000);

    this._createToolbar();
  }

  _createToolbar() {
    const scene = this.scene;
    const W = scene.scale.width;
    const TOOLBAR_H = 34;
    const BTN_SIZE = 28;
    const ICON_SIZE = 16;

    // Arka plan
    const bg = scene.add.graphics();
    bg.fillStyle(0x12122a, 0.95);
    bg.fillRect(0, 0, W, TOOLBAR_H);
    bg.lineStyle(1, 0x3a3a5e, 0.6);
    bg.lineBetween(0, TOOLBAR_H, W, TOOLBAR_H);
    this.container.add(bg);
    this._bg = bg;
    this._toolbarH = TOOLBAR_H;

    // Sol taraf: Araç butonları
    const tools = [
      { key: 'paint', icon: '🖌', label: 'B', tip: 'Boya [B]' },
      { key: 'eraser', icon: '✕', label: 'E', tip: 'Sil [E]' },
      { key: 'fill', icon: '▣', label: 'F', tip: 'Doldur [F]' },
      { key: 'rect', icon: '□', label: 'R', tip: 'Dikdörtgen [R]' },
      { key: 'select', icon: '⊡', label: 'S', tip: 'Seç [S]' },
      { key: 'move', icon: '✥', label: 'M', tip: 'Taşı [M]' },
    ];

    let x = 6;
    const y = (TOOLBAR_H - BTN_SIZE) / 2;

    tools.forEach(tool => {
      const btn = this._createToolButton(x, y, BTN_SIZE, tool);
      x += BTN_SIZE + 3;
    });

    // Ayırıcı çizgi
    const sep1 = scene.add.graphics();
    sep1.lineStyle(1, 0x3a3a5e, 0.4);
    sep1.lineBetween(x + 2, 6, x + 2, TOOLBAR_H - 6);
    this.container.add(sep1);
    x += 10;

    // Orta: Aksiyon butonları
    const actions = [
      { key: 'undo', label: '↩', tip: 'Geri Al [Ctrl+Z]' },
      { key: 'redo', label: '↪', tip: 'İleri Al [Ctrl+Y]' },
      { key: 'grid', label: '#', tip: 'Izgara [G]' },
      { key: 'save', label: '💾', tip: 'Kaydet [Ctrl+S]' },
      { key: 'load', label: '📂', tip: 'Yükle [Ctrl+O]' },
      { key: 'clear', label: '🗑', tip: 'Temizle' },
    ];

    actions.forEach(action => {
      const btn = this._createActionButton(x, y, BTN_SIZE, action);
      x += BTN_SIZE + 3;
    });

    // Ayırıcı çizgi
    const sep2 = scene.add.graphics();
    sep2.lineStyle(1, 0x3a3a5e, 0.4);
    sep2.lineBetween(x + 2, 6, x + 2, TOOLBAR_H - 6);
    this.container.add(sep2);
    x += 10;

    // Harita boyutu kontrolü (Sütun / Satır / Uygula)
    this._resizeX = x;
    this._resizeY = y;

    const colsLabel = scene.add.text(x, y + 6, 'S:', { fontSize: '10px', color: '#aaa', fontFamily: 'monospace' });
    this.container.add(colsLabel);
    x += colsLabel.width + 2;

    const colsBg = scene.add.graphics();
    colsBg.fillStyle(0x1a1a3a, 0.9);
    colsBg.fillRoundedRect(x, y + 2, 32, 20, 3);
    colsBg.lineStyle(1, 0x4a4a6e, 0.6);
    colsBg.strokeRoundedRect(x, y + 2, 32, 20, 3);
    this.container.add(colsBg);
    this._colsValue = 30;
    this._colsText = scene.add.text(x + 4, y + 6, '30', { fontSize: '11px', color: '#fff', fontFamily: 'monospace' });
    this.container.add(this._colsText);
    this._colsBgX = x;
    x += 36;

    const rowsLabel = scene.add.text(x, y + 6, 'Sat:', { fontSize: '10px', color: '#aaa', fontFamily: 'monospace' });
    this.container.add(rowsLabel);
    x += rowsLabel.width + 2;

    const rowsBg = scene.add.graphics();
    rowsBg.fillStyle(0x1a1a3a, 0.9);
    rowsBg.fillRoundedRect(x, y + 2, 32, 20, 3);
    rowsBg.lineStyle(1, 0x4a4a6e, 0.6);
    rowsBg.strokeRoundedRect(x, y + 2, 32, 20, 3);
    this.container.add(rowsBg);
    this._rowsValue = 18;
    this._rowsText = scene.add.text(x + 4, y + 6, '18', { fontSize: '11px', color: '#fff', fontFamily: 'monospace' });
    this.container.add(this._rowsText);
    this._rowsBgX = x;
    x += 36;

    // Boyutu uygula butonu
    const applyBg = scene.add.graphics();
    applyBg.fillStyle(0x2a4a2a, 0.9);
    applyBg.fillRoundedRect(x, y + 2, 60, 20, 3);
    applyBg.lineStyle(1, 0x4a8a4a, 0.6);
    applyBg.strokeRoundedRect(x, y + 2, 60, 20, 3);
    this.container.add(applyBg);
    const applyText = scene.add.text(x + 30, y + 12, '📐 Uygula', { fontSize: '10px', color: '#aaffaa', fontFamily: 'monospace' }).setOrigin(0.5);
    this.container.add(applyText);
    applyBg.setInteractive(new Phaser.Geom.Rectangle(x, y + 2, 60, 20), Phaser.Geom.Rectangle.Contains);
    applyBg.on('pointerdown', () => {
      this.scene.events.emit('resize-map', { cols: this._colsValue, rows: this._rowsValue });
    });
    applyBg.on('pointerover', () => { applyBg.clear(); applyBg.fillStyle(0x3a6a3a, 0.9); applyBg.fillRoundedRect(x, y + 2, 60, 20, 3); applyBg.lineStyle(1, 0x6aaa6a, 0.8); applyBg.strokeRoundedRect(x, y + 2, 60, 20, 3); });
    applyBg.on('pointerout', () => { applyBg.clear(); applyBg.fillStyle(0x2a4a2a, 0.9); applyBg.fillRoundedRect(x, y + 2, 60, 20, 3); applyBg.lineStyle(1, 0x4a8a4a, 0.6); applyBg.strokeRoundedRect(x, y + 2, 60, 20, 3); });
    x += 66;

    // Kolon/Satır tıklama ile düzenleme
    this._makeClickableValue(this._colsText, this._colsBgX, y, 32, (v) => { this._colsValue = v; this._colsText.setText(String(v)); });
    this._makeClickableValue(this._rowsText, this._rowsBgX, y, 32, (v) => { this._rowsValue = v; this._rowsText.setText(String(v)); });

    // Sağ taraf: Zoom kontrolü
    const zoomX = W - 120;
    this._createZoomControls(zoomX, y, BTN_SIZE);

    // Tooltip text
    this.tooltipText = scene.add.text(W / 2, TOOLBAR_H + 2, '', {
      fontSize: '9px',
      color: '#aaaacc',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5, 0).setDepth(1001).setAlpha(0);

    this.container.add(this.tooltipText);
  }

  _createToolButton(x, y, size, tool) {
    const scene = this.scene;

    const container = scene.add.container(x, y);

    const bg = scene.add.graphics();
    const isActive = tool.key === this.activeTool;
    bg.fillStyle(isActive ? 0x4a4a8e : 0x1e1e3a, 0.9);
    bg.fillRoundedRect(0, 0, size, size, 4);
    bg.lineStyle(1, isActive ? 0x6a6aae : 0x3a3a5e, 0.6);
    bg.strokeRoundedRect(0, 0, size, size, 4);
    container.add(bg);

    const icon = scene.add.text(size / 2, size / 2, tool.icon, {
      fontSize: '13px',
      align: 'center',
    }).setOrigin(0.5);
    container.add(icon);

    // Hover efekti
    container.setSize(size, size);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      if (tool.key !== this.activeTool) {
        bg.clear();
        bg.fillStyle(0x2a2a5e, 0.9);
        bg.fillRoundedRect(0, 0, size, size, 4);
        bg.lineStyle(1, 0x5a5a8e, 0.6);
        bg.strokeRoundedRect(0, 0, size, size, 4);
      }
      this._showTooltip(tool.tip);
    });

    container.on('pointerout', () => {
      const isActive = tool.key === this.activeTool;
      bg.clear();
      bg.fillStyle(isActive ? 0x4a4a8e : 0x1e1e3a, 0.9);
      bg.fillRoundedRect(0, 0, size, size, 4);
      bg.lineStyle(1, isActive ? 0x6a6aae : 0x3a3a5e, 0.6);
      bg.strokeRoundedRect(0, 0, size, size, 4);
      this._hideTooltip();
    });

    container.on('pointerdown', () => {
      this.setActiveTool(tool.key);
    });

    this.container.add(container);

    this.buttons.push({
      key: tool.key,
      bg,
      container,
    });

    return container;
  }

  _createActionButton(x, y, size, action) {
    const scene = this.scene;

    const container = scene.add.container(x, y);

    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a36, 0.8);
    bg.fillRoundedRect(0, 0, size, size, 4);
    bg.lineStyle(1, 0x2a2a4e, 0.4);
    bg.strokeRoundedRect(0, 0, size, size, 4);
    container.add(bg);

    const label = scene.add.text(size / 2, size / 2, action.label, {
      fontSize: '12px',
      align: 'center',
    }).setOrigin(0.5);
    container.add(label);

    container.setSize(size, size);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x2a2a5e, 0.9);
      bg.fillRoundedRect(0, 0, size, size, 4);
      bg.lineStyle(1, 0x5a5a8e, 0.6);
      bg.strokeRoundedRect(0, 0, size, size, 4);
      this._showTooltip(action.tip);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x1a1a36, 0.8);
      bg.fillRoundedRect(0, 0, size, size, 4);
      bg.lineStyle(1, 0x2a2a4e, 0.4);
      bg.strokeRoundedRect(0, 0, size, size, 4);
      this._hideTooltip();
    });

    container.on('pointerdown', () => {
      this.scene.events.emit('toolbar-action', action.key);
    });

    this.container.add(container);
    this.actionButtons.push({ key: action.key, container });

    return container;
  }

  _createZoomControls(x, y, btnSize) {
    const scene = this.scene;

    // Zoom -
    const zoomOut = scene.add.container(x, y);
    const zbg1 = scene.add.graphics();
    zbg1.fillStyle(0x1a1a36, 0.8);
    zbg1.fillRoundedRect(0, 0, btnSize, btnSize, 4);
    zoomOut.add(zbg1);
    const zLabel1 = scene.add.text(btnSize / 2, btnSize / 2, '−', {
      fontSize: '14px', color: '#ccccdd',
    }).setOrigin(0.5);
    zoomOut.add(zLabel1);
    zoomOut.setSize(btnSize, btnSize);
    zoomOut.setInteractive({ useHandCursor: true });
    zoomOut.on('pointerdown', () => {
      this.scene.events.emit('toolbar-action', 'zoom-out');
    });
    this.container.add(zoomOut);

    // Zoom text
    this.zoomText = scene.add.text(x + btnSize + 4, y + btnSize / 2, '200%', {
      fontSize: '10px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
    this.container.add(this.zoomText);

    // Zoom +
    const zoomIn = scene.add.container(x + btnSize + 44, y);
    const zbg2 = scene.add.graphics();
    zbg2.fillStyle(0x1a1a36, 0.8);
    zbg2.fillRoundedRect(0, 0, btnSize, btnSize, 4);
    zoomIn.add(zbg2);
    const zLabel2 = scene.add.text(btnSize / 2, btnSize / 2, '+', {
      fontSize: '14px', color: '#ccccdd',
    }).setOrigin(0.5);
    zoomIn.add(zLabel2);
    zoomIn.setSize(btnSize, btnSize);
    zoomIn.setInteractive({ useHandCursor: true });
    zoomIn.on('pointerdown', () => {
      this.scene.events.emit('toolbar-action', 'zoom-in');
    });
    this.container.add(zoomIn);
  }

  _showTooltip(text) {
    if (this.tooltipText) {
      this.tooltipText.setText(text);
      this.tooltipText.setAlpha(1);
    }
  }

  _hideTooltip() {
    if (this.tooltipText) {
      this.tooltipText.setAlpha(0);
    }
  }

  setActiveTool(toolKey) {
    this.activeTool = toolKey;

    // Tüm tool butonlarını güncelle
    this.buttons.forEach(btn => {
      const isActive = btn.key === toolKey;
      btn.bg.clear();
      btn.bg.fillStyle(isActive ? 0x4a4a8e : 0x1e1e3a, 0.9);
      btn.bg.fillRoundedRect(0, 0, 28, 28, 4);
      btn.bg.lineStyle(1, isActive ? 0x6a6aae : 0x3a3a5e, 0.6);
      btn.bg.strokeRoundedRect(0, 0, 28, 28, 4);
    });

    this.scene.events.emit('tool-changed', toolKey);
  }

  updateZoom(level) {
    if (this.zoomText) {
      this.zoomText.setText(`${Math.round(level * 100)}%`);
    }
  }

  getHeight() {
    return this._toolbarH || 34;
  }

  _makeClickableValue(textObj, bgX, bgY, bgW, onChange) {
    const scene = this.scene;
    const hitArea = scene.add.zone(bgX, bgY + 2, bgW, 20).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => {
      // Basit artır/azalt: sol tık +10, sağ tık -10
      const step = scene.input.mouse && scene.input.mouse.manager && scene.input.mouse.manager.event && scene.input.mouse.manager.event.button === 2 ? -10 : 10;
      const current = parseInt(textObj.text) || 10;
      const newVal = Math.max(1, Math.min(500, current + 10));
      onChange(newVal);
    });
    hitArea.on('pointerdown', (pointer) => {
      const step = pointer.button === 2 ? -10 : 10;
      const current = parseInt(textObj.text) || 10;
      const newVal = Math.max(1, Math.min(500, current + step));
      onChange(newVal);
    });
    this.container.add(hitArea);
  }

  updateMapSize(cols, rows) {
    this._colsValue = cols;
    this._rowsValue = rows;
    if (this._colsText) this._colsText.setText(String(cols));
    if (this._rowsText) this._rowsText.setText(String(rows));
  }

  destroy() {
    this.container.destroy();
  }
}
