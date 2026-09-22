// PRD §10 — menus are fully keyboard-navigable. One reusable list widget.

import { AudioManager } from './AudioManager.js';

export class Menu {
  constructor(scene, x, y, items, opts) {
    const o = opts || {};
    this.scene = scene;
    this.items = items;
    this.index = 0;
    this.spacing = o.spacing || 30;
    this.depth = o.depth || 800;
    this.width = o.width || 420;
    this.texts = [];
    this.values = [];
    this.cursor = scene.add.text(x - 26, y, '>', {
      fontFamily: 'ui-monospace, Consolas, monospace',
      fontSize: '18px', color: '#ffd76a',
    }).setScrollFactor(0).setDepth(this.depth + 1);

    items.forEach((item, i) => {
      const t = scene.add.text(x, y + i * this.spacing, item.label, {
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: '18px', color: '#dfe6f5',
      }).setScrollFactor(0).setDepth(this.depth);
      this.texts.push(t);
      const v = scene.add.text(x + this.width, y + i * this.spacing, '', {
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: '18px', color: '#9ad167',
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(this.depth);
      this.values.push(v);
    });
    this.refresh();
  }

  refresh() {
    this.items.forEach((item, i) => {
      const disabled = item.enabled && !item.enabled();
      this.texts[i].setText(item.label);
      this.texts[i].setColor(disabled ? '#5a5a70' : (i === this.index ? '#ffffff' : '#a9b2c9'));
      this.values[i].setText(item.value ? item.value() : '');
    });
    this.cursor.y = this.texts[this.index].y;
  }

  move(delta) {
    const n = this.items.length;
    for (let step = 0; step < n; step++) {
      this.index = (this.index + delta + n) % n;
      const item = this.items[this.index];
      if (!item.enabled || item.enabled()) break;
    }
    AudioManager.menuMove();
    this.refresh();
  }

  update(input) {
    if (input.codeJustPressed('ArrowUp') || input.codeJustPressed('KeyW')) this.move(-1);
    if (input.codeJustPressed('ArrowDown') || input.codeJustPressed('KeyS')) this.move(1);

    const item = this.items[this.index];
    if (input.codeJustPressed('ArrowLeft') || input.codeJustPressed('KeyA')) {
      if (item.onLeft) { item.onLeft(); AudioManager.menuMove(); this.refresh(); }
    }
    if (input.codeJustPressed('ArrowRight') || input.codeJustPressed('KeyD')) {
      if (item.onRight) { item.onRight(); AudioManager.menuMove(); this.refresh(); }
    }
    if (input.codeJustPressed('Enter') || input.codeJustPressed('Space')) {
      if (item.enabled && !item.enabled()) return;
      AudioManager.menuPick();
      if (item.onPick) item.onPick();
    }
  }

  destroy() {
    this.cursor.destroy();
    for (const t of this.texts) t.destroy();
    for (const v of this.values) v.destroy();
  }
}

export const TITLE_STYLE = {
  fontFamily: 'ui-monospace, Consolas, monospace',
  fontSize: '40px', color: '#ffe6a8',
};

export const BODY_STYLE = {
  fontFamily: 'ui-monospace, Consolas, monospace',
  fontSize: '15px', color: '#c2cade', lineSpacing: 6,
};

export const DIM_STYLE = {
  fontFamily: 'ui-monospace, Consolas, monospace',
  fontSize: '13px', color: '#7d86a0', lineSpacing: 5,
};
