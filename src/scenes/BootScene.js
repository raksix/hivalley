// HiValley — BootScene
//
// Tiny init pass. Loads PlayerState from localStorage, then immediately
// hands off to PreloadScene. Keeping it distinct from PreloadScene so
// future boot logic (version checks, telemetry, default options) can go
// here without touching asset generation.

import Phaser from 'phaser';
import { PlayerState } from '../state/PlayerState.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    // Load any persisted player choices so they're available game-wide.
    PlayerState.load();

    // Optional first-run flag — UI surfaces a "New Farmer?" greeting later.
    try {
      const seen = localStorage.getItem('hivalley.seenIntro');
      if (!seen) {
        this.firstRun = true;
        localStorage.setItem('hivalley.seenIntro', '1');
      }
    } catch (_) {}

    this.cameras.main.fadeIn(220, 0, 0, 0);
    this.time.delayedCall(220, () => {
      this.scene.start('PreloadScene');
    });
  }
}