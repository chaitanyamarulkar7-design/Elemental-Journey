// PRD §11 — everything is drawn at boot; nothing is loaded from disk.

import { VIEW_W, VIEW_H } from '../config/physicsConfig.js';
import { buildAllTextures } from '../systems/Textures.js';
import { InputManager } from '../systems/InputManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { RunState, GameState, State } from '../systems/RunState.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    SaveManager.load();
    buildAllTextures(this);
    InputManager.attach();
    RunState.assist = SaveManager.settings.assist;

    const note = document.getElementById('boot-note');
    if (note) note.remove();

    this.add.text(VIEW_W / 2, VIEW_H / 2 - 16, 'ELEMENTS', {
      fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '40px', color: '#ffe6a8',
    }).setOrigin(0.5);
    this.add.text(VIEW_W / 2, VIEW_H / 2 + 28, 'press any key', {
      fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '14px', color: '#7d86a0',
    }).setOrigin(0.5);

    GameState.set(State.BOOT);
    this.ready = false;
    this.time.delayedCall(220, () => { this.ready = true; InputManager.suppressHeld(); });
  }

  update() {
    // Audio contexts only start after a real key press, so the menu waits here.
    if (this.ready && InputManager.anyJustPressed()) {
      AudioManager.ensure();
      this.scene.start('Menu');
    }
    InputManager.flush();
  }
}
