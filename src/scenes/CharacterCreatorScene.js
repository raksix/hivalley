// HiValley — CharacterCreatorScene
//
// Lets the player pick name, gender, hair, skin tone, shirt & pants colors.
// Persists to PlayerState + writes a save slot. Then transitions to a
// "you're ready to start" interstitial that fades into the (future) gameplay
// scene. For now, the interstitial offers "Back to Title" + a preview of
// what the world would look like.
//
// Modes:
//   - 'new': reset PlayerState, then run creator, then save to slot.
//   - 'continue': incoming save passed in; we just confirm and head off.

import Phaser from 'phaser';
import { PlayerState } from '../state/PlayerState.js';
import { SaveManager } from '../utils/SaveManager.js';
import { Button } from '../ui/Button.js';
import { ParallaxBackground } from '../ui/ParallaxBackground.js';
import { PALETTE } from '../utils/palette.js';
import {
  playClick,
  playHover,
  playConfirm,
} from '../utils/menuMusic.js';
import { TEXTURES } from '../utils/textures.js';

// Skin tones (0–3)
const SKIN_TONES = [0xefb88a, 0xd9986a, 0xa86a45, 0x6b3e23];
const SKIN_NAMES = ['Sunlit', 'Tan', 'Bronze', 'Mahogany'];

// Hair colors
const HAIR_COLORS = [0x6b3e23, 0xc54a3a, 0x1a1a1a, 0xfff1c2, 0x8a6a3a, 0x6cba4a];
const HAIR_NAMES = ['Auburn', 'Crimson', 'Raven', 'Wheat', 'Hazel', 'Forest'];

// Shirt colors
const SHIRT_COLORS = [0xc54a3a, 0x6cba4a, 0x4f8fba, 0xc97cdb, 0xffc857, 0xe94e60];
const SHIRT_NAMES = ['Crimson', 'Moss', 'River', 'Lilac', 'Saffron', 'Rose'];

// Pants colors
const PANTS_COLORS = [0x3f4a60, 0x6b3e23, 0x2e5e1c, 0x4a2f1a, 0x000000, 0x7a2a20];
const PANTS_NAMES = ['Indigo', 'Cocoa', 'Olive', 'Walnut', 'Onyx', 'Maroon'];

// Hair styles (0–3): short, long, ponytail, buzzed
const HAIR_STYLES = ['Short', 'Long', 'Ponytail', 'Buzzed'];
const GENDERS = ['male', 'female'];

export class CharacterCreatorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterCreatorScene' });
  }

  init(data) {
    this.mode = data?.mode ?? 'new';
    this.save = data?.save ?? null;
    this.player = data?.player ?? PlayerState.get();
  }

  create() {
    this.cameras.main.fadeIn(360, 0, 0, 0);

    // Background — keeps the parallax alive.
    this.bg = new ParallaxBackground(this);

    // Local working copy of the player so we can preview before saving.
    if (this.mode === 'continue' && this.save) {
      this.draft = { ...this.save.player };
    } else {
      this.draft = {
        name: '',
        gender: 'male',
        skinTone: 0,
        hairStyle: 0,
        hairColor: 0,
        shirtColor: 0,
        pantsColor: 0,
      };
    }

    this._buildUI();

    if (this.mode === 'continue' && this.save) {
      // Skip the creator, head to a brief "welcome back" interstitial.
      this._showReadyScreen();
    }
  }

  _buildUI() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Title
    this.add
      .text(w / 2, 40, this.mode === 'continue' ? 'Welcome back' : 'Customize Your Farmer', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#f3e9c8',
        stroke: '#1a0f08',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Left panel — preview (left side, taller for full character visibility)
    const leftX = w * 0.18;
    const leftY = h / 2 + 10;
    const left = this.add.container(leftX, leftY);
    left.add(this.add.image(0, 0, 'gen:panel-wood').setScale(1.4, 1.8));
    this.preview = new CharacterPreview(this, leftX, leftY - 10);

    // Right panel — background image only (no container for text elements
    // because Phaser containers don't render text children reliably)
    this.rx = w * 0.66;  // right panel center x (world)
    this.ry = h / 2 + 10;  // right panel center y (world)
    this.add.image(this.rx, this.ry, 'gen:panel-wood').setScale(1.7, 2.0);

    // Helper to convert local offset to world coords
    const rx = (lx) => this.rx + lx;
    const ry = (ly) => this.ry + ly;

    // Name input (Phaser text + keyboard)
    this.nameText = this.add
      .text(rx(-80), ry(-175), 'Name:', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#c9b98a',
      })
      .setOrigin(0, 0.5);
    this.nameBox = this.add
      .rectangle(rx(50), ry(-175), 160, 22, 0x1a0e07, 1)
      .setStrokeStyle(2, PALETTE.uiBorder, 1)
      .setOrigin(0, 0.5);
    this.nameInput = this.add
      .text(rx(58), ry(-175), this.draft.name || 'Farmer', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#f3e9c8',
      })
      .setOrigin(0, 0.5);

    // Gender
    this.genderText = this.add
      .text(rx(-80), ry(-130), 'Gender:', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#c9b98a',
      })
      .setOrigin(0, 0.5);
    this.genderToggle = new Button(this, rx(10), ry(-130), {
      text: cap(this.draft.gender),
      scale: 2.0,
      onClick: () => {
        const idx = GENDERS.indexOf(this.draft.gender);
        this.draft.gender = GENDERS[(idx + 1) % GENDERS.length];
        this.genderToggle.label.setText(cap(this.draft.gender));
        this.preview.update(this.draft);
        playClick();
      },
    });

    // Skin / Hair / Hair color / Shirt / Pants
    this.cycleRows = [];
    this._addCycleRow(0, -75, 'Skin', SKIN_NAMES, 'skinTone', () => this.preview.update(this.draft));
    this._addCycleRow(0, -30, 'Hair', HAIR_STYLES, 'hairStyle', () => this.preview.update(this.draft));
    this._addCycleRow(0, 15, 'Hair color', HAIR_NAMES, 'hairColor', () => this.preview.update(this.draft));
    this._addCycleRow(0, 60, 'Shirt', SHIRT_NAMES, 'shirtColor', () => this.preview.update(this.draft));
    this._addCycleRow(0, 105, 'Pants', PANTS_NAMES, 'pantsColor', () => this.preview.update(this.draft));

    // Randomize + Done buttons
    this.randomBtn = new Button(this, rx(-80), ry(160), {
      text: 'Random',
      scale: 2.2,
      onClick: () => {
        this.draft = {
          name: this.draft.name,
          gender: GENDERS[Math.floor(Math.random() * GENDERS.length)],
          skinTone: Math.floor(Math.random() * SKIN_TONES.length),
          hairStyle: Math.floor(Math.random() * HAIR_STYLES.length),
          hairColor: Math.floor(Math.random() * HAIR_COLORS.length),
          shirtColor: Math.floor(Math.random() * SHIRT_COLORS.length),
          pantsColor: Math.floor(Math.random() * PANTS_COLORS.length),
        };
        this.genderToggle.label.setText(cap(this.draft.gender));
        for (const c of this.cycleRows) c.refresh();
        this.preview.update(this.draft);
        playClick();
      },
    });

    this.doneBtn = new Button(this, rx(80), ry(160), {
      text: 'Start!',
      scale: 2.2,
      onClick: () => this._commit(),
    });

    // Back — below both panels
    this.backBtn = new Button(this, w / 2, h - 30, {
      text: 'Back to Title',
      scale: 2.4,
      onClick: () => this.scene.start('MainMenuScene'),
    });
    this.backBtn.on('pointerover', () => playHover());

    // Tab focus order
    this.focusables = [
      { kind: 'input', node: this.nameInput },
      { kind: 'btn', node: this.genderToggle },
      ...this.cycleRows.flatMap((c) => [c.leftBtn, c.rightBtn]),
      { kind: 'btn', node: this.randomBtn },
      { kind: 'btn', node: this.doneBtn },
      { kind: 'btn', node: this.backBtn },
    ];
    this.focusIndex = this.focusables.findIndex(
      (f) => f.kind === 'btn' && f.node === this.doneBtn
    );
    if (this.focusIndex < 0) this.focusIndex = 0;

    // Listen for text entry to update nameInput/nameBox + draft.
    // Use document-level listener so keyboard works even when canvas lacks focus.
    this._boundKeyDown = this._onKeyDown;
    document.addEventListener('keydown', this._boundKeyDown);
    this.events.on('shutdown', () => {
      document.removeEventListener('keydown', this._boundKeyDown);
    });

    // Auto-attach mouse hover focus for buttons
    for (const f of this.focusables) {
      if (f.kind === 'btn') {
        f.node.on('pointerover', () => {
          this._setFocus(this.focusables.indexOf(f));
          playHover();
        });
      }
    }

    this._setFocus(this.focusIndex);
    this.preview.update(this.draft);
    this._buildCursor();
  }

  _buildCursor() {
    this.input.setDefaultCursor('none');
    this.cursorImg = this.add
      .image(0, 0, TEXTURES.cursorPointer())
      .setScale(2)
      .setDepth(9999);
    this.input.on('pointermove', (p) => {
      this.cursorImg.setPosition(p.worldX + 2, p.worldY + 2);
    });
    this.input.on('pointerdown', () => {
      this.cursorImg.setTexture('gen:btn-hover');
      setTimeout(() => this.cursorImg.setTexture(TEXTURES.cursorPointer()), 90);
    });
    this.events.on('shutdown', () => {
      this.input.setDefaultCursor('default');
    });
  }

  _addCycleRow(lx, ly, label, options, key, onChange) {
    // Convert local offset to world coords
    const wx = this.rx + lx;
    const wy = this.ry + ly;

    this.add
      .text(wx - 80, wy, label + ':', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#c9b98a',
      })
      .setOrigin(0, 0.5);

    const row = { key, options, refresh: () => {} };
    this.cycleRows = this.cycleRows || [];
    this.cycleRows.push(row);

    const valueText = this.add
      .text(wx - 15, wy, options[this.draft[key] % options.length], {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#f3e9c8',
      })
      .setOrigin(0.5, 0.5);

    const leftBtn = new Button(this, wx - 80, wy, {
      text: '<',
      scale: 1.3,
      onClick: () => {
        this.draft[key] = (this.draft[key] - 1 + options.length) % options.length;
        valueText.setText(options[this.draft[key]]);
        onChange && onChange();
        playClick();
      },
    });
    const rightBtn = new Button(this, wx + 45, wy, {
      text: '>',
      scale: 1.3,
      onClick: () => {
        this.draft[key] = (this.draft[key] + 1) % options.length;
        valueText.setText(options[this.draft[key]]);
        onChange && onChange();
        playClick();
      },
    });

    row.leftBtn = leftBtn;
    row.rightBtn = rightBtn;
    row.valueText = valueText;
    row.refresh = () => {
      valueText.setText(options[this.draft[key]]);
    };
  }

  _onKeyDown = (e) => {
    if (!this.focusables || !this.focusables.length) return;
    const cur = this.focusables[this.focusIndex];

    // Name input special handling
    if (cur && cur.kind === 'input') {
      if (e.key === 'Backspace') {
        this.draft.name = this.draft.name.slice(0, -1);
        this.nameInput.setText(this.draft.name || 'Farmer');
        e.preventDefault?.();
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        this._setFocus((this.focusIndex + 1) % this.focusables.length);
        return;
      }
      if (e.key.length === 1 && this.draft.name.length < 12) {
        this.draft.name += e.key;
        this.nameInput.setText(this.draft.name);
        e.preventDefault?.();
        return;
      }
    }

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this._setFocus((this.focusIndex - 1 + this.focusables.length) % this.focusables.length);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this._setFocus((this.focusIndex + 1) % this.focusables.length);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this._stepFocusedCycle(-1);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this._stepFocusedCycle(1);
        break;
      case 'Enter':
      case ' ':
        this._activateFocused();
        break;
      case 'Escape':
        this.scene.start('MainMenuScene');
        break;
    }
  };

  _stepFocusedCycle(dir) {
    const cur = this.focusables[this.focusIndex];
    if (!cur) return;
    if (cur.kind === 'btn' && cur.node.cfg && cur.node.cfg.text === '<') {
      cur.node.bg.emit('pointerup');
    } else if (cur.kind === 'btn' && cur.node.cfg && cur.node.cfg.text === '>') {
      cur.node.bg.emit('pointerup');
    }
  }

  _setFocus(idx) {
    this.focusIndex = idx;
    const cur = this.focusables[idx];
    for (const f of this.focusables) {
      if (f.kind === 'btn') f.node.setFocused(false);
    }
    if (cur && cur.kind === 'btn') cur.node.setFocused(true);

    if (cur && cur.kind === 'input') {
      this.nameBox.setStrokeStyle(2, PALETTE.uiAccent, 1);
    } else {
      this.nameBox.setStrokeStyle(2, PALETTE.uiBorder, 1);
    }
  }

  _activateFocused() {
    const cur = this.focusables[this.focusIndex];
    if (!cur) return;
    if (cur.kind === 'btn') {
      cur.node.bg.emit('pointerup');
    }
  }

  _commit() {
    PlayerState.set({ ...this.draft, name: this.draft.name || 'Wanderer' });

    let slotName;
    if (this.mode === 'new') {
      slotName = SaveManager.firstEmptySlot() || 'slot1';
    } else {
      slotName = this.save?.__slotName || 'slot1';
    }

    const save =
      this.save && this.mode === 'continue'
        ? { ...this.save, player: { ...this.draft }, updatedAt: Date.now() }
        : SaveManager.createNew(slotName);
    save.player = { ...this.draft };
    SaveManager.write(slotName, save);
    SaveManager.autosave(save);
    save.__slotName = slotName;

    playConfirm();
    this._showReadyScreen(save);
  }

  _showReadyScreen(save) {
    this.children.removeAll(true);
    this.bg = new ParallaxBackground(this);

    const w = this.scale.width;
    const h = this.scale.height;

    const player = (save && save.player) || this.draft;
    const preview = new CharacterPreview(this, w / 2, h / 2 - 80);
    preview.update(player);
    preview.sprite.setScale(4);

    this.add
      .text(w / 2, 80, 'Ready to Begin', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#f3e9c8',
        stroke: '#1a0f08',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(
        w / 2,
        h / 2 + 20,
        `Welcome to HiValley, ${player.name || 'Wanderer'}.`,
        {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#ffc857',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        w / 2,
        h / 2 + 44,
        'Press Start when you’re ready — the world is loading.',
        {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#c9b98a',
        }
      )
      .setOrigin(0.5);

    const back = new Button(this, w / 2 - 80, h - 60, {
      text: 'Back to Title',
      scale: 2.4,
      onClick: () => this.scene.start('MainMenuScene'),
    });
    const start = new Button(this, w / 2 + 80, h - 60, {
      text: 'Begin Day 1',
      scale: 2.4,
      onClick: () => this._enterGame(save),
    });
    back.on('pointerover', () => playHover());
    start.on('pointerover', () => playHover());

    this._readyButtons = [back, start];
    back.setFocused(true);
    this._readyFocus = 0;

    // Remove the old document listener from _buildUI
    document.removeEventListener('keydown', this._boundKeyDown);

    const readyHandler = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault?.();
        this._readyFocus = 0;
        back.setFocused(true);
        start.setFocused(false);
        playHover();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault?.();
        this._readyFocus = 1;
        back.setFocused(false);
        start.setFocused(true);
        playHover();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault?.();
        if (this._readyFocus === 0) this.scene.start('MainMenuScene');
        else this._enterGame(save);
      }
    };
    document.addEventListener('keydown', readyHandler);
    this.events.on('shutdown', () => {
      document.removeEventListener('keydown', readyHandler);
    });
  }

  _enterGame(save) {
    this.cameras.main.fadeOut(360, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { save });
    });
  }

  update(time, delta) {
    this.bg?.update(time, delta, this._pointer);
  }
}

// ---------------------------------------------------------------------------
// CharacterPreview — draws a tiny pixel farmer based on draft values.
// ---------------------------------------------------------------------------

class CharacterPreview {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    // Character sprite — added directly to scene.
    // The idle sheet is 16x32 per frame (full body), so scale 5 = 80x160 px.
    this.sprite = scene.add.sprite(x, y + 10, 'farm:char-idle', 0);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(5);

    // Start the idle-down animation so the character breathes/animates.
    // Wrap in try-catch because the animation manager may not be ready yet
    // if the scene starts before PreloadScene finishes creating animations.
    try {
      this.sprite.play('farm:idle-down');
    } catch (_e) {
      // anims not ready — fine, it's a preview-only visual
    }

    // Gender label — added directly to scene (not inside a container)
    this.genderLabel = scene.add.text(x, y + 10, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffc857',
    }).setOrigin(0.5);
  }

  update(draft) {
    const skin = SKIN_TONES[draft.skinTone % SKIN_TONES.length];

    // Tint sprite with skin tone for visual feedback
    this.sprite.setTint(skin);

    // Show gender
    this.genderLabel.setText(cap(draft.gender));
  }
}

function darken(c) {
  const r = Math.max(0, ((c >> 16) & 0xff) - 40);
  const gC = Math.max(0, ((c >> 8) & 0xff) - 40);
  const b = Math.max(0, (c & 0xff) - 40);
  return (r << 16) | (gC << 8) | b;
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}