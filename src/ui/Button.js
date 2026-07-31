// HiValley — pixel-art UI button.
//
// Renders a chunky wood button with idle/hover/pressed/disabled states.
// Supports keyboard navigation (Space/Enter activate; arrows move focus
// across siblings), hover via Phaser input events, and an optional
// `subtitle` line below the label.

import Phaser from 'phaser';

export class Button extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} cfg
   * @param {string} cfg.text
   * @param {string} [cfg.subtitle]
   * @param {() => void} [cfg.onClick]
   * @param {string} [cfg.idleKey]
   * @param {string} [cfg.hoverKey]
   * @param {string} [cfg.pressedKey]
   * @param {string} [cfg.disabledKey]
   * @param {number} [cfg.scale]
   * @param {boolean} [cfg.disabled]
   * @param {Phaser.GameObjects.Container[]} [cfg.siblings] other focusable buttons
   * @param {number} [cfg.focusIndex]
   */
  constructor(scene, x, y, cfg) {
    super(scene, x, y);
    this.cfg = cfg;
    this._btnScale = cfg.scale ?? 3;
    this.disabled = !!cfg.disabled;
    this._isFocused = false;

    // Background image — swap on state change.
    this.bg = scene.add.image(0, 0, cfg.idleKey || 'gen:btn-idle').setOrigin(0.5);
    this.add(this.bg);

    // Label
    const labelY = cfg.subtitle ? -4 : 0;
    this.label = scene.add
      .text(0, labelY, cfg.text, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#f3e9c8',
        align: 'center',
        resolution: 4,
      })
      .setOrigin(0.5);
    this.add(this.label);

    if (cfg.subtitle) {
      this.subtitle = scene.add
        .text(0, 8, cfg.subtitle, {
          fontFamily: 'monospace',
          fontSize: '5px',
          color: '#ffc857',
          align: 'center',
          resolution: 4,
        })
        .setOrigin(0.5);
      this.add(this.subtitle);
    }

    // Press/hover shadow text — slightly offset for chunky press feel.
    this.shadowLabel = scene.add
      .text(0, labelY, cfg.text, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#1a0f08',
        align: 'center',
        resolution: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0.55);
    this.add(this.shadowLabel);
    this.sendToBack(this.shadowLabel);

    this.bg.setScale(this._btnScale);
    this.shadowLabel.setScale(this._btnScale);
    this.label.setScale(this._btnScale);

    const w = this.bg.displayWidth;
    const h = this.bg.displayHeight;

    // Interactive on the Container (not the bg Image) so the entire bounding
    // rect receives pointer events — including areas overlapped by the label
    // and shadow text. Using the bg Image alone means the center of the button
    // (where the text sits) cannot register pointerover/click reliably, and
    // because Container.scale isn't always honored by the bg's hit area after
    // a texture swap, you'd see clicks landing offset from the visible rect.
    this.setSize(w, h);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );

    // Disable the bg's own interactive so the Container is the sole hit-test
    // target — events then go through `this` exactly once.
    this.bg.disableInteractive();

    this.on('pointerover', () => {
      if (this.disabled) return;
      this._isHover = true;
      this._refresh();
    });

    this.on('pointerout', () => {
      if (this.disabled) return;
      this._isHover = false;
      // Reset pressed state when leaving the button area
      this._setPressed(false);
      if (!this._isFocused) this._refresh();
    });

    this.on('pointerdown', () => {
      if (this.disabled) return;
      this._setPressed(true);
    });

    this.on('pointerup', () => {
      if (this.disabled) return;
      this._setPressed(false);
      if (cfg.onClick) cfg.onClick();
    });

    this.on('pointerupoutside', () => this._setPressed(false));

    // No-op: do NOT call _setPressed on destroy — the scene is shutting
    // down and Text internals (canvas) may already be null.

    scene.add.existing(this);
    this._refresh();
  }

  setDisabled(v) {
    this.disabled = !!v;
    this._refresh();
    return this;
  }

  setFocused(v) {
    this._isFocused = !!v;
    this._refresh();
    return this;
  }

  _setPressed(v) {
    this._isPressed = !!v;
    if (this.label) this.label.y = (this.cfg.subtitle ? -4 : 0) + (v ? 1 : 0);
    if (this.shadowLabel) this.shadowLabel.y = (this.cfg.subtitle ? -4 : 0) + (v ? 1 : 0);
    this._refresh();
  }

  _refresh() {
    // Bail if the scene is shutting down — Text internals (canvas) may be null.
    if (!this.scene?.sys?.isActive()) return;
    let key;
    if (this.disabled) key = this.cfg.disabledKey || 'gen:btn-disabled';
    else if (this._isPressed) key = this.cfg.pressedKey || 'gen:btn-pressed';
    else if (this._isFocused || this._isHover)
      key = this.cfg.hoverKey || 'gen:btn-hover';
    else key = this.cfg.idleKey || 'gen:btn-idle';
    if (this.bg.texture.key !== key) this.bg.setTexture(key);
    const c = this.disabled
      ? '#7a6a55'
      : this._isFocused || this._isHover
        ? '#fff1c2'
        : '#f3e9c8';
    if (this.label) this.label.setColor(c);
  }

  /** Returns focusable sibling to navigate to with arrow keys. */
  focusSibling(dx, dy, siblings) {
    if (!siblings || !siblings.length) return null;
    const me = this;
    let best = null;
    let bestScore = Infinity;
    for (const s of siblings) {
      if (!s || s === me || s.disabled) continue;
      const dxs = s.x - me.x;
      const dys = s.y - me.y;
      // Must align with direction (or be neutral)
      if (dx !== 0 && Math.sign(dxs) !== Math.sign(dx)) continue;
      if (dy !== 0 && Math.sign(dys) !== Math.sign(dy)) continue;
      const dist = Math.abs(dxs) + Math.abs(dys);
      if (dist < bestScore) {
        bestScore = dist;
        best = s;
      }
    }
    return best;
  }
}
