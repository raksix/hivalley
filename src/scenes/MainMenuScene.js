// HiValley — MainMenuScene
//
// The first thing the player sees. Stardew-Valley-inspired:
//   * warm pastoral parallax backdrop (sky, mountains, farm, house)
//   * big chunky title plate with the HiValley wordmark
//   * hand-drawn-ish wood buttons: New Game / Continue / Load / Options / Credits / Quit
//   * drifting clouds, twinkling sparkles, gentle bobbing title
//   * ambient chord pad (procedural) with hover/click SFX
//   * full keyboard & gamepad navigation
//
// Sub-screens (rendered as overlays in the same scene so the parallax
// keeps animating underneath):
//   - SaveSlotModal    (pick or create a save)
//   - OptionsModal     (volume sliders, etc.)
//   - CreditsModal     (static credits)

import Phaser from 'phaser';
import { PlayerState } from '../state/PlayerState.js';
import { SaveManager } from '../utils/SaveManager.js';
import { Button } from '../ui/Button.js';
import { ParallaxBackground } from '../ui/ParallaxBackground.js';
import { TEXTURES } from '../utils/textures.js';
import { PALETTE } from '../utils/palette.js';
import {
  startMenuMusic,
  stopMenuMusic,
  playClick,
  playHover,
  playConfirm,
  playCancel,
  unlockAudio,
  setMuted,
} from '../utils/menuMusic.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    // Ensure canvas has keyboard focus so keydown events reach Phaser.
    if (this.game.canvas) this.game.canvas.focus();

    const w = this.scale.width;
    const h = this.scale.height;

    // --- Backdrop ---
    this.bg = new ParallaxBackground(this);

    // --- Title ---
    this._buildTitle(w, h);

    // --- Buttons ---
    this.buttons = [];
    this._buildButtons(w, h);

    // --- Footer ---
    this._buildFooter(w, h);

    // --- Custom cursor (pointer sprite follows mouse) ---
    this._buildCursor();

    // --- Inputs ---
    this._wireInputs();

    // Initial focus: the most-relevant first button
    const def = this._defaultFocusButton();
    if (def) def.setFocused(true);
    this.focusedIndex = this.buttons.indexOf(def);

    // --- Music ---
    startMenuMusic();

    // --- Fade in ---
    this.cameras.main.fadeIn(420, 0, 0, 0);

    // Pointer for parallax halo reactivity
    this.input.on('pointermove', (p) => {
      this._pointer = { x: p.worldX, y: p.worldY };
    });
  }

  // -----------------------------------------------------------------------
  // UI construction
  // -----------------------------------------------------------------------

  _buildTitle(w, _h) {
    // Plate
    this.titlePlate = this.add
      .image(w / 2, 110, TEXTURES.titlePlate())
      .setScale(2.2)
      .setOrigin(0.5, 0.5);

    // Wordmark text
    this.titleText = this.add
      .text(w / 2, 110, 'HIVALLEY', {
        fontFamily: 'monospace',
        fontSize: '46px',
        color: '#f3e9c8',
        stroke: '#1a0f08',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5)
      .setShadow(2, 2, '#000000', 4, false, true);

    // Subtitle
    this.subtitleText = this.add
      .text(w / 2, 168, 'A cozy little valley', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffc857',
        align: 'center',
      })
      .setOrigin(0.5);

    // Decorative leaf sprite
    this.add
      .image(w / 2 - 250, 110, TEXTURES.logo())
      .setScale(3)
      .setOrigin(0.5)
      .setAlpha(0.95);
    this.add
      .image(w / 2 + 250, 110, TEXTURES.logo())
      .setScale(3)
      .setOrigin(0.5)
      .setAlpha(0.95)
      .setFlipX(true);

    // Gentle bob
    this.tweens.add({
      targets: [this.titlePlate, this.titleText],
      y: '+=4',
      duration: 2200,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: this.subtitleText,
      y: '+=2',
      duration: 2400,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  _buildButtons(w, h) {
    // "Continue" is only enabled if at least one save slot has data.
    const hasSave = SaveManager.list().some((s) => !!s.save);
    const labels = [
      { text: 'New Game', key: 'new', subtitle: 'Begin a fresh story' },
      {
        text: 'Continue',
        key: 'continue',
        subtitle: hasSave ? 'Pick up where you left off' : 'No saved game yet',
        disabled: !hasSave,
      },
      { text: 'Load Game', key: 'load', subtitle: '3 save slots' },
      { text: 'Options', key: 'options', subtitle: 'Sound & display' },
      { text: 'Credits', key: 'credits', subtitle: 'The folks behind HiValley' },
      { text: 'Quit', key: 'quit', subtitle: 'See you soon' },
    ];

    const startY = 260;
    const gap = 14;
    const btnW = 96;
    const btnH = 32;
    const scale = 3;
    const stride = btnH * scale + gap;

    labels.forEach((l, i) => {
      const y = startY + i * stride;
      const btn = new Button(this, w / 2, y, {
        text: l.text,
        subtitle: l.subtitle,
        scale,
        disabled: !!l.disabled,
        onClick: () => this._handleAction(l.key),
      });
      btn.on('pointerover', () => {
        if (btn.disabled) return;
        this._setFocus(btn);
        playHover();
      });
      btn.on('pointerdown', () => {
        if (btn.disabled) return;
        playClick();
      });
      this.buttons.push(btn);
    });
  }

  _buildFooter(w, h) {
    // Bottom-left version
    this.add
      .text(12, h - 12, 'v0.1.0  •  HiValley', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#7a6a55',
      })
      .setOrigin(0, 1);

    // Bottom-right controls hint
    this.add
      .text(w - 12, h - 12, '[Arrows] Move   [Enter] Select   [Esc] Back', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#7a6a55',
      })
      .setOrigin(1, 1);

    // Music toggle (top-right corner)
    this.musicToggle = this.add
      .text(w - 12, 10, this._musicLabel(), {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffc857',
        backgroundColor: '#2a1a0e',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    this.musicToggle.on('pointerover', () => this.musicToggle.setColor('#fff1c2'));
    this.musicToggle.on('pointerout', () => this.musicToggle.setColor('#ffc857'));
    this.musicToggle.on('pointerdown', () => {
      this._musicOn = !this._musicOn;
      setMuted(!this._musicOn);
      this.musicToggle.setText(this._musicLabel());
      if (this._musicOn) {
        unlockAudio();
        startMenuMusic();
      } else {
        stopMenuMusic();
      }
      playClick();
    });
  }

  _musicLabel() {
    return this._musicOn ? '♪ Music  On' : '♪ Music  Off';
  }

  _defaultFocusButton() {
    const idx = this.buttons.findIndex(
      (b) => b.cfg && b.cfg.subtitle && b.cfg.subtitle.includes('left off') && !b.disabled
    );
    if (idx >= 0) return this.buttons[idx];
    return this.buttons.find((b) => !b.disabled) || this.buttons[0];
  }

  _buildCursor() {
    // Replace default system cursor with our arrow sprite so the menu has
    // a unified feel. Origin is set to (0,0) so the arrow tip aligns with
    // the actual mouse position.
    this.input.setDefaultCursor('none');
    this.cursorImg = this.add
      .image(0, 0, TEXTURES.cursorPointer())
      .setOrigin(0, 0)
      .setScale(3)
      .setDepth(9999);
    this.input.on('pointermove', (p) => {
      this.cursorImg.setPosition(p.x, p.y);
    });
    this.input.on('pointerdown', () => {
      this.cursorImg.setTexture('gen:btn-hover');
      this.cursorImg.setOrigin(0.5, 0.5);
      setTimeout(() => {
        this.cursorImg.setTexture(TEXTURES.cursorPointer());
        this.cursorImg.setOrigin(0, 0);
      }, 90);
    });
  }

  // -----------------------------------------------------------------------
  // Input
  // -----------------------------------------------------------------------

  _wireInputs() {
    // Keyboard — use document-level listener so input works even when
    // the canvas element doesn't have focus (e.g. headless / automated browsers).
    this._menuKeyHandler = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this._navigateFocus(0, -1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this._navigateFocus(0, 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this._navigateFocus(-1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this._navigateFocus(1, 0);
          break;
        case 'w': case 'W':
          this._navigateFocus(0, -1);
          break;
        case 's': case 'S':
          this._navigateFocus(0, 1);
          break;
        case 'a': case 'A':
          this._navigateFocus(-1, 0);
          break;
        case 'd': case 'D':
          this._navigateFocus(1, 0);
          break;
        case 'Enter':
          this._activateFocused();
          break;
        case ' ':
          e.preventDefault();
          this._activateFocused();
          break;
      }
    };
    document.addEventListener('keydown', this._menuKeyHandler);
    this.events.on('shutdown', () => {
      document.removeEventListener('keydown', this._menuKeyHandler);
    });

    // Gamepad (best-effort polling)
    this.input.gamepad?.on('down', (_pad, btn) => {
      if (btn.index === Phaser.Input.Gamepad.Configs.DPAD_UP)
        this._navigateFocus(0, -1);
      else if (btn.index === Phaser.Input.Gamepad.Configs.DPAD_DOWN)
        this._navigateFocus(0, 1);
      else if (btn.index === Phaser.Input.Gamepad.Configs.DPAD_LEFT)
        this._navigateFocus(-1, 0);
      else if (btn.index === Phaser.Input.Gamepad.Configs.DPAD_RIGHT)
        this._navigateFocus(1, 0);
      else if (btn.index === Phaser.Input.Gamepad.Configs.BUTTON_A)
        this._activateFocused();
      else if (btn.index === Phaser.Input.Gamepad.Configs.BUTTON_B)
        this._cancelFocused();
    });
  }

  _setFocus(target) {
    for (const b of this.buttons) {
      b.setFocused(b === target);
    }
    this.focusedIndex = this.buttons.indexOf(target);
  }

  _navigateFocus(dx, dy) {
    if (this.overlay) return; // don't navigate while a modal is open
    const cur = this.buttons[this.focusedIndex];
    if (!cur) return;
    let next;
    if (dx === 0 && dy !== 0) {
      // Vertical: just go up/down by index.
      const dir = dy > 0 ? 1 : -1;
      let i = this.focusedIndex + dir;
      while (i >= 0 && i < this.buttons.length) {
        if (!this.buttons[i].disabled) {
          next = this.buttons[i];
          break;
        }
        i += dir;
      }
    } else {
      next = cur.focusSibling(dx, dy, this.buttons) || cur;
    }
    if (next && next !== cur) {
      this._setFocus(next);
      playHover();
    }
  }

  _activateFocused() {
    const b = this.buttons[this.focusedIndex];
    if (!b || b.disabled) return;
    playConfirm();
    this._handleAction(b.cfg.key);
  }

  _cancelFocused() {
    if (this.overlay) {
      this._closeOverlay();
      playCancel();
    }
  }

  _handleAction(key) {
    switch (key) {
      case 'new':
        this._openNewGameFlow();
        break;
      case 'continue':
        // Continue = pick most-recent save, or first non-empty.
        const saves = SaveManager.list().filter((s) => s.save);
        if (saves.length) {
          // Pick the slot with the most-recent updatedAt.
          saves.sort((a, b) => b.save.updatedAt - a.save.updatedAt);
          this._gotoCharacterCreator('continue', saves[0].save);
        }
        break;
      case 'load':
        this._openLoadModal();
        break;
      case 'options':
        this._openOptionsModal();
        break;
      case 'credits':
        this._openCreditsModal();
        break;
      case 'quit':
        this._quit();
        break;
    }
  }

  // -----------------------------------------------------------------------
  // New Game flow
  // -----------------------------------------------------------------------

  _openNewGameFlow() {
    // Auto-pick the first empty slot, or the first slot (overwriting on confirm).
    const empty = SaveManager.firstEmptySlot();
    if (empty) {
      this._openConfirmModal({
        title: 'Start a New Game?',
        message: 'A blank farm awaits. Choose your look and we’ll get started.',
        confirmText: 'Customize',
        onConfirm: () => {
          PlayerState.reset();
          this._closeOverlay();
          this._gotoCharacterCreator('new', null);
        },
      });
    } else {
      this._openSaveSlotModal({
        title: 'Choose a slot to overwrite',
        mode: 'overwrite',
        onPick: (slotName) => {
          SaveManager.delete(slotName);
          PlayerState.reset();
          this._closeOverlay();
          this._gotoCharacterCreator('new', null);
        },
      });
    }
  }

  _openLoadModal() {
    this._openSaveSlotModal({
      title: 'Load a Saved Game',
      mode: 'load',
      onPick: (slotName) => {
        const save = SaveManager.read(slotName);
        this._closeOverlay();
        if (save) this._gotoCharacterCreator('continue', save);
      },
    });
  }

  _gotoCharacterCreator(mode, save) {
    this.cameras.main.fadeOut(360, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('CharacterCreatorScene', {
        mode,
        save,
        player: save?.player ?? null,
      });
    });
  }

  // -----------------------------------------------------------------------
  // Overlay modals (rendered on top of the parallax)
  // -----------------------------------------------------------------------

  _openOverlay(content) {
    this.overlay = this.add.container(0, 0).setDepth(500);

    // Dimmer
    const dim = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, PALETTE.black, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.overlay.add(dim);

    // Body container (panel + content) so we can pop-in nicely.
    this.overlayBody = this.add.container(this.scale.width / 2, this.scale.height / 2);
    this.overlay.add(this.overlayBody);
    this.overlayBody.add(content);

    // Pop-in tween
    this.overlayBody.setScale(0.85);
    this.overlayBody.alpha = 0;
    this.tweens.add({
      targets: this.overlayBody,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });

    // Escape closes overlay
    this._escHandler = () => this._closeOverlay();
    this.input.keyboard.on('keydown-ESC', this._escHandler);
  }

  _closeOverlay() {
    if (!this.overlay) return;
    this.tweens.add({
      targets: this.overlayBody,
      alpha: 0,
      scale: 0.95,
      duration: 160,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.input.keyboard.off('keydown-ESC', this._escHandler);
        this.overlay.destroy();
        this.overlay = null;
        this.overlayBody = null;
      },
    });
  }

  _openConfirmModal({ title, message, confirmText = 'OK', cancelText = 'Cancel', onConfirm, onCancel }) {
    const w = 380;
    const h = 200;

    const c = this.add.container(0, 0);
    c.add(this.add.image(0, 0, 'gen:panel-wood').setScale(1.4));

    const titleT = this.add
      .text(0, -h / 2 + 30, title, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#f3e9c8',
        align: 'center',
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5);
    c.add(titleT);

    const msgT = this.add
      .text(0, -10, message, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#c9b98a',
        align: 'center',
        wordWrap: { width: w - 60 },
      })
      .setOrigin(0.5);
    c.add(msgT);

    const confirmBtn = new Button(this, -100, h / 2 - 28, {
      text: confirmText,
      scale: 2,
      onClick: () => onConfirm && onConfirm(),
    });
    const cancelBtn = new Button(this, 100, h / 2 - 28, {
      text: cancelText,
      scale: 2,
      onClick: () => {
        if (onCancel) onCancel();
        else this._closeOverlay();
      },
    });

    // Default focus = confirm
    confirmBtn.setFocused(true);
    this._modalFocus = [confirmBtn, cancelBtn];

    const wireModalNav = (btns) => {
      const handler = (e) => {
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
          btns[1].setFocused(false);
          btns[0].setFocused(true);
          this._modalFocus = [btns[0], btns[1]];
          playHover();
        } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
          btns[0].setFocused(false);
          btns[1].setFocused(true);
          this._modalFocus = [btns[1], btns[0]];
          playHover();
        } else if (k === 'Enter' || k === ' ') {
          const focused = btns.find((b) => b._isFocused) || btns[0];
          playConfirm();
          // Simulate click on the button
          if (focused === confirmBtn) onConfirm && onConfirm();
          else if (onCancel) onCancel();
          else this._closeOverlay();
        }
      };
      this.input.keyboard.on('keydown', handler);
      c.once('destroy', () => this.input.keyboard.off('keydown', handler));
    };
    wireModalNav(this._modalFocus);

    c.add([confirmBtn, cancelBtn]);

    this._openOverlay(c);
  }

  _openSaveSlotModal({ title, mode, onPick }) {
    const w = 520;
    const h = 360;

    const c = this.add.container(0, 0);
    c.add(this.add.image(0, 0, 'gen:panel-wood').setScale(w / 320, h / 180));

    const titleT = this.add
      .text(0, -h / 2 + 30, title, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#f3e9c8',
        align: 'center',
      })
      .setOrigin(0.5);
    c.add(titleT);

    const items = SaveManager.list();

    const slotNodes = [];
    items.forEach((item, i) => {
      const slotY = -h / 2 + 80 + i * 56;
      const node = this._buildSlotRow(0, slotY, w - 60, item, mode);
      c.add(node);
      slotNodes.push(node);
      node.on('pointerdown', () => {
        playClick();
        onPick && onPick(item.name);
      });
      node.on('pointerover', () => {
        for (const s of slotNodes) s.setSelected(s === node);
        playHover();
      });
    });

    // Default-select first non-empty when loading, first when overwriting.
    if (mode === 'load') {
      const first = slotNodes.find((s) => s.save);
      if (first) first.setSelected(true);
      else slotNodes[0].setSelected(true);
    } else {
      slotNodes[0].setSelected(true);
    }

    // Keyboard nav
    const handler = (e) => {
      const k = e.key;
      if (k === 'ArrowDown' || k === 's' || k === 'S') {
        const cur = slotNodes.findIndex((s) => s._selected);
        const next = slotNodes[(cur + 1) % slotNodes.length];
        for (const s of slotNodes) s.setSelected(s === next);
        playHover();
      } else if (k === 'ArrowUp' || k === 'w' || k === 'W') {
        const cur = slotNodes.findIndex((s) => s._selected);
        const next = slotNodes[(cur - 1 + slotNodes.length) % slotNodes.length];
        for (const s of slotNodes) s.setSelected(s === next);
        playHover();
      } else if (k === 'Enter' || k === ' ') {
        const sel = slotNodes.find((s) => s._selected);
        if (sel) {
          if (mode === 'load' && !sel.save) {
            playCancel();
            return;
          }
          playConfirm();
          onPick && onPick(sel.slotName);
        }
      }
    };
    this.input.keyboard.on('keydown', handler);
    c.once('destroy', () => this.input.keyboard.off('keydown', handler));

    this._openOverlay(c);
  }

  _buildSlotRow(x, y, width, item, mode) {
    // A custom container acting like a "save slot" button.
    const row = this.add.container(x, y);
    const W = width;
    const H = 48;

    const bg = this.add.image(0, 0, 'gen:panel-parchment').setScale(W / 320, H / 180);
    row.add(bg);

    const label = this.add
      .text(-W / 2 + 16, -8, item.label, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#5e3b25',
      })
      .setOrigin(0, 0.5);
    row.add(label);

    if (item.save) {
      const p = item.save.player || {};
      const meta = `${p.name || 'Wanderer'}  •  Day ${item.save.world?.day ?? 1}  •  ${item.save.world?.season ?? 'spring'}`;
      const money = item.save.world?.money ?? 0;
      const right = `${money}g`;
      this.add.text(-W / 2 + 16, 8, meta, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#5e3b25',
      }).setOrigin(0, 0.5);

      this.add.text(W / 2 - 16, 0, right, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#7a5a23',
      }).setOrigin(1, 0.5);

      // Player preview sprite
      this.add
        .image(W / 2 - 60, 0, TEXTURES.playerPreview())
        .setScale(1.3)
        .setOrigin(0.5);
    } else {
      this.add
        .text(-W / 2 + 16, 8, mode === 'overwrite' ? 'Empty — will be overwritten' : 'Empty', {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#7a6a55',
        })
        .setOrigin(0, 0.5);

      // Plus icon
      const plus = this.add.text(W / 2 - 16, 0, '+', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#5e3b25',
      }).setOrigin(1, 0.5);
      row.add(plus);
    }

    // Selection ring
    const ring = this.add
      .rectangle(0, 0, W - 4, H - 4, PALETTE.uiAccent, 0)
      .setStrokeStyle(3, PALETTE.uiAccent, 0)
      .setOrigin(0.5);
    row.add(ring);
    row.ring = ring;
    row._selected = false;
    row.slotName = item.name;
    row.save = !!item.save;

    const hit = this.add
      .rectangle(0, 0, W, H, 0xffffff, 0)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    row.add(hit);

    row.setSelected = (v) => {
      row._selected = !!v;
      ring.setStrokeStyle(3, PALETTE.uiAccent, v ? 1 : 0);
      bg.setTint(v ? 0xfff1c2 : 0xffffff);
    };

    return row;
  }

  _openOptionsModal() {
    const w = 460;
    const h = 320;

    const c = this.add.container(0, 0);
    c.add(this.add.image(0, 0, 'gen:panel-wood').setScale(w / 320, h / 180));

    c.add(
      this.add
        .text(0, -h / 2 + 30, 'Options', {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#f3e9c8',
        })
        .setOrigin(0.5)
    );

    // Music toggle (live)
    const musicToggle = new Button(this, -100, -50, {
      text: 'Music',
      subtitle: this._musicOn ? 'On' : 'Off',
      scale: 2,
      onClick: () => {
        this._musicOn = !this._musicOn;
        setMuted(!this._musicOn);
        this.musicToggle.setText(this._musicLabel());
        if (this._musicOn) startMenuMusic();
        else stopMenuMusic();
        musicToggle.subtitle.setText(this._musicOn ? 'On' : 'Off');
        playClick();
      },
    });
    c.add(musicToggle);

    // SFX toggle (procedural toggle; effects use master gain so it follows music)
    let sfxOn = true;
    const sfxToggle = new Button(this, 100, -50, {
      text: 'SFX',
      subtitle: sfxOn ? 'On' : 'Off',
      scale: 2,
      onClick: () => {
        sfxOn = !sfxOn;
        setMuted(!sfxOn || !this._musicOn);
        // Actually we don't have separate channels — keep this as a cosmetic toggle
        sfxToggle.subtitle.setText(sfxOn ? 'On' : 'Off');
        playClick();
      },
    });
    c.add(sfxToggle);

    // Display mode (decorative — wired to scale mode)
    const displayToggle = new Button(this, 0, 0, {
      text: 'Display',
      subtitle: 'Fit',
      scale: 2,
      onClick: () => {
        const order = ['Fit', 'Fill', 'Native'];
        const cur = displayToggle.subtitle.text;
        const next = order[(order.indexOf(cur) + 1) % order.length];
        displayToggle.subtitle.setText(next);
        if (next === 'Fit') this.scale.setMode(Phaser.Scale.FIT);
        else if (next === 'Fill') this.scale.setMode(Phaser.Scale.FILL);
        else this.scale.setMode(Phaser.Scale.NONE);
        playClick();
      },
    });
    c.add(displayToggle);

    // Delete all saves
    const deleteBtn = new Button(this, 0, 50, {
      text: 'Delete Saves',
      subtitle: 'All 4',
      scale: 2,
      onClick: () => {
        this._openConfirmModal({
          title: 'Delete all saves?',
          message: 'This wipes every slot. There is no undo.',
          confirmText: 'Delete',
          onConfirm: () => {
            for (const s of SaveManager.list()) SaveManager.delete(s.name);
            this._closeOverlay();
            playConfirm();
          },
        });
      },
    });
    c.add(deleteBtn);

    // Back button
    const back = new Button(this, 0, h / 2 - 28, {
      text: 'Back',
      scale: 2.6,
      onClick: () => {
        this._closeOverlay();
        playCancel();
      },
    });
    c.add(back);

    // Default focus
    musicToggle.setFocused(true);
    const focusables = [musicToggle, sfxToggle, displayToggle, deleteBtn, back];
    focusables.forEach((b, i) => {
      b.on('pointerover', () => {
        for (const f of focusables) f.setFocused(f === b);
        playHover();
      });
    });

    const handler = (e) => {
      const k = e.key;
      if (k === 'ArrowDown' || k === 's' || k === 'S') {
        const i = focusables.findIndex((f) => f._isFocused);
        const next = focusables[(i + 1) % focusables.length];
        for (const f of focusables) f.setFocused(f === next);
        playHover();
      } else if (k === 'ArrowUp' || k === 'w' || k === 'W') {
        const i = focusables.findIndex((f) => f._isFocused);
        const next = focusables[(i - 1 + focusables.length) % focusables.length];
        for (const f of focusables) f.setFocused(f === next);
        playHover();
      } else if (k === 'Enter' || k === ' ') {
        const f = focusables.find((x) => x._isFocused);
        if (f) {
          playConfirm();
          f.bg.emit('pointerup');
        }
      }
    };
    this.input.keyboard.on('keydown', handler);
    c.once('destroy', () => this.input.keyboard.off('keydown', handler));

    this._openOverlay(c);
  }

  _openCreditsModal() {
    const w = 540;
    const h = 380;

    const c = this.add.container(0, 0);
    c.add(this.add.image(0, 0, 'gen:panel-wood').setScale(w / 320, h / 180));

    c.add(
      this.add
        .text(0, -h / 2 + 28, 'Credits', {
          fontFamily: 'monospace',
          fontSize: '22px',
          color: '#f3e9c8',
        })
        .setOrigin(0.5)
    );

    const lines = [
      'HiValley',
      'A cozy pixel farm sim',
      '',
      'Game Design  •  HiValley Team',
      'Programming  •  Phaser 3 + Vite',
      'Art  •  Procedurally generated',
      'Music  •  Procedural chord pad',
      '',
      'Special thanks to every farmer',
      'who tends their virtual crops.',
      '',
      'Press ESC to close',
    ];

    const text = this.add
      .text(0, -10, lines.join('\n'), {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#c9b98a',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    c.add(text);

    // Bobbing logo on either side of the title
    const left = this.add
      .image(-w / 2 + 32, -h / 2 + 28, TEXTURES.logo())
      .setScale(2)
      .setOrigin(0.5);
    const right = this.add
      .image(w / 2 - 32, -h / 2 + 28, TEXTURES.logo())
      .setScale(2)
      .setOrigin(0.5)
      .setFlipX(true);
    c.add([left, right]);

    this.tweens.add({
      targets: [left, right],
      y: '-=4',
      duration: 1500,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1,
    });

    this._openOverlay(c);
  }

  _quit() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      stopMenuMusic();
      // Best-effort "quit" — disables RAFs and lets the page idle.
      this.game.loop.sleep();
      this.add
        .text(this.scale.width / 2, this.scale.height / 2, 'Thanks for visiting HiValley.\nRefresh to come back.', {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#f3e9c8',
          align: 'center',
        })
        .setOrigin(0.5);
    });
  }

  // -----------------------------------------------------------------------
  // Loop
  // -----------------------------------------------------------------------

  update(time, delta) {
    this.bg?.update(time, delta, this._pointer);
  }
}