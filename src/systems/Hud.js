// PRD §5, §10 — one translucent band over the top of play. Drawn icons only.

import { VIEW_W } from '../config/physicsConfig.js';
import { GAME } from '../config/gameConfig.js';

const FONT = {
  fontFamily: 'ui-monospace, Consolas, monospace',
  fontSize: '16px',
  color: '#ffffff',
};

export class Hud {
  constructor(scene, levelName, assist) {
    this.scene = scene;
    this.depth = 900;

    this.band = scene.add.graphics().setScrollFactor(0).setDepth(this.depth);
    this.band.fillStyle(0x0b0a12, 0.55);
    this.band.fillRect(0, 0, VIEW_W, 40);
    this.band.fillStyle(0xffffff, 0.08);
    this.band.fillRect(0, 39, VIEW_W, 1);

    this.icons = scene.add.graphics().setScrollFactor(0).setDepth(this.depth + 1);
    this.drawIcons();

    this.livesText = scene.add.text(40, 12, '3', FONT).setScrollFactor(0).setDepth(this.depth + 2);
    this.gemText = scene.add.text(126, 12, '0', FONT).setScrollFactor(0).setDepth(this.depth + 2);

    this.bar = scene.add.graphics().setScrollFactor(0).setDepth(this.depth + 2);

    this.levelText = scene.add.text(VIEW_W - 220, 12, levelName, {
      ...FONT, color: '#ffe6a8',
    }).setScrollFactor(0).setDepth(this.depth + 2);

    this.timeText = scene.add.text(VIEW_W - 86, 12, '00:00', FONT)
      .setScrollFactor(0).setDepth(this.depth + 2);

    this.assistText = null;
    if (assist) {
      this.assistText = scene.add.text(VIEW_W / 2 - 26, 12, 'ASSIST', {
        ...FONT, fontSize: '13px', color: '#9ad167',
      }).setScrollFactor(0).setDepth(this.depth + 2);
    }

    this.flash = scene.add.graphics().setScrollFactor(0).setDepth(this.depth + 3);
    this.flashT = 0;
  }

  drawIcons() {
    const g = this.icons;
    g.clear();
    // life: a small keeper sigil
    g.fillStyle(0x1b1a26, 1);
    g.fillRect(14, 10, 18, 20);
    g.fillStyle(0x3f6fd8, 1);
    g.fillRect(16, 12, 14, 16);
    g.fillStyle(0xffd76a, 1);
    g.fillRect(16, 18, 14, 3);
    g.fillRect(21, 12, 4, 12);
    // gem: a small diamond
    g.fillStyle(0x0d1420, 1);
    g.fillPoints([{ x: 102, y: 11 }, { x: 113, y: 20 }, { x: 102, y: 29 }, { x: 91, y: 20 }], true);
    g.fillStyle(0x6fd3ff, 1);
    g.fillPoints([{ x: 102, y: 13 }, { x: 111, y: 20 }, { x: 102, y: 27 }, { x: 93, y: 20 }], true);
  }

  update(lives, gems, seconds) {
    this.livesText.setText(String(lives));
    this.gemText.setText(String(gems));

    // The bar fills toward the next life.
    const segs = 10;
    const filled = Math.min(segs, Math.floor((gems % GAME.lifeThreshold) / (GAME.lifeThreshold / segs)));
    const full = gems >= GAME.lifeThreshold ? segs : filled;
    const x0 = 180;
    this.bar.clear();
    for (let i = 0; i < segs; i++) {
      const x = x0 + i * 13;
      this.bar.fillStyle(i < full ? 0x6fd3ff : 0x2a2b3a, 1);
      this.bar.fillRect(x, 14, 10, 13);
    }

    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    this.timeText.setText(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);

    if (this.flashT > 0) {
      this.flashT -= 1 / 60;
      this.flash.clear();
      this.flash.fillStyle(0xffffff, Math.max(0, this.flashT) * 0.8);
      this.flash.fillRect(0, 0, VIEW_W, 40);
      if (this.flashT <= 0) this.flash.clear();
    }
  }

  extraLifeFlash() { this.flashT = 0.45; }
}
