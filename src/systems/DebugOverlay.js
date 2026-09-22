// PRD §11 — F1 overlay, dev builds only. F2 test room, F3 next checkpoint.

import { TILE } from '../config/physicsConfig.js';
import { DEBUG_ENABLED } from '../config/gameConfig.js';
import { GameState } from './RunState.js';

export class DebugOverlay {
  constructor(scene) {
    this.scene = scene;
    this.on = false;
    this.session = 0;
    this.text = scene.add.text(8, 46, '', {
      fontFamily: 'ui-monospace, Consolas, monospace',
      fontSize: '12px',
      color: '#8affc1',
      backgroundColor: 'rgba(0,0,0,0.55)',
      padding: { x: 6, y: 5 },
      lineSpacing: 2,
    }).setScrollFactor(0).setDepth(1000).setVisible(false);
  }

  toggle() {
    if (!DEBUG_ENABLED) return;
    this.on = !this.on;
    this.text.setVisible(this.on);
    const world = this.scene.physics.world;
    if (this.on && !world.debugGraphic) world.createDebugGraphic();
    world.drawDebug = this.on;
    if (world.debugGraphic) {
      world.debugGraphic.setVisible(this.on).setDepth(999);
      if (!this.on) world.debugGraphic.clear();
    }
  }

  update(dt, info) {
    this.session += dt;
    if (!this.on) return;
    const p = info.player;
    const cam = this.scene.cameras.main;
    this.text.setText([
      `fps      ${Math.round(this.scene.game.loop.actualFps)}`,
      `state    ${GameState.current}`,
      `pos      ${p.x.toFixed(1)}, ${p.y.toFixed(1)}`,
      `vel      ${p.body.velocity.x.toFixed(1)}, ${p.body.velocity.y.toFixed(1)}`,
      `grounded ${p.grounded}   coyote ${p.coyote.toFixed(3)}  buffer ${p.buffer.toFixed(3)}`,
      `column   ${Math.floor(p.x / TILE)}  row ${Math.floor(p.y / TILE)}`,
      `wallet   ${info.gems}   lives ${info.lives}`,
      `camera   ${cam.scrollX.toFixed(0)} / ${info.worldW - cam.width}`,
      `session  ${this.session.toFixed(1)}s   level ${info.levelTime.toFixed(1)}s`,
      `F1 overlay  F2 test room  F3 next checkpoint`,
    ].join('\n'));
  }
}
