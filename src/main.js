import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { CharacterCreatorScene } from './scenes/CharacterCreatorScene.js';
import { GameScene } from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0b0f14',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  scene: [BootScene, PreloadScene, MainMenuScene, CharacterCreatorScene, GameScene],
};

const game = new Phaser.Game(config);

// Debug helper: ?scene=GameScene jumps straight to that scene after preload.
window.__game = game;
window.__skipToScene = (sceneName) => {
  const url = new URL(window.location.href);
  url.searchParams.set('scene', sceneName);
  window.location.href = url.toString();
};

const params = new URLSearchParams(window.location.search);
const target = params.get('scene');
if (target) {
  // Wait until PreloadScene finishes, then jump.
  game.events.once('ready', () => {
    // Make sure assets are ready (PreloadScene creates animations on create).
    setTimeout(() => {
      game.scene.stop('MainMenuScene');
      game.scene.stop('CharacterCreatorScene');
      game.scene.start(target);
    }, 400);
  });
}
