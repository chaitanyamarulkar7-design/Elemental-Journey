// Elements: The Five Trials — entry point.
// Phaser is loaded as a plain script in index.html, so it is a global here.

import { VIEW_W, VIEW_H, PHYSICS } from './config/physicsConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { TestRoomScene } from './scenes/TestRoomScene.js';
import {
  MenuScene, LevelSelectScene, HowToPlayScene, CreditsScene, SettingsScene,
  LevelCompleteScene, GameOverScene, GameCompleteScene,
} from './scenes/MenuScenes.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0a0910',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: PHYSICS.gravity },
      fps: 60,               // fixed 60 Hz physics step (PRD §3)
      fixedStep: true,
      debug: false,
      tileBias: 24,
    },
  },
  scene: [
    BootScene,
    MenuScene,
    LevelSelectScene,
    HowToPlayScene,
    CreditsScene,
    SettingsScene,
    GameScene,
    LevelCompleteScene,
    GameOverScene,
    GameCompleteScene,
    TestRoomScene,
  ],
};

const game = new Phaser.Game(config);

// Keep keyboard focus on the page so the player never has to click twice.
window.addEventListener('load', () => window.focus());
document.addEventListener('click', () => window.focus());

window.ELEMENTS = game;
