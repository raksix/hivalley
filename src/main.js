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

window.__game = new Phaser.Game(config);