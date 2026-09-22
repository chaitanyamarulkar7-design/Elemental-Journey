// Main menu, How to Play, Settings, and the end screens (PRD §10).

import { VIEW_W, VIEW_H } from '../config/physicsConfig.js';
import { LEVEL_ORDER, LEVEL_TITLES, THEMES } from '../config/gameConfig.js';
import { InputManager, prettyKey, LOCKED_ACTIONS } from '../systems/InputManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { GameState, State, RunState } from '../systems/RunState.js';
import { Menu, TITLE_STYLE, BODY_STYLE, DIM_STYLE } from '../systems/Menu.js';

function backdrop(scene, topColor, bottomColor) {
  const g = scene.add.graphics().setDepth(0);
  for (let i = 0; i < VIEW_H; i += 4) {
    const k = i / VIEW_H;
    g.fillStyle(blend(topColor, bottomColor, k), 1);
    g.fillRect(0, i, VIEW_W, 5);
  }
  return g;
}

function blend(a, b, k) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * k) << 16) |
         (Math.round(ag + (bg - ag) * k) << 8) |
         Math.round(ab + (bb - ab) * k);
}

function fmtTime(seconds) {
  if (seconds == null) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

// ============================================================ MAIN MENU
export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    GameState.set(State.MENU);
    AudioManager.stopMusic();
    backdrop(this, 0x120f1c, 0x2d2440);

    this.add.text(VIEW_W / 2, 66, 'ELEMENTS', { ...TITLE_STYLE, fontSize: '52px' })
      .setOrigin(0.5, 0);
    this.add.text(VIEW_W / 2, 124, 'T H E   F I V E   T R I A L S', {
      ...BODY_STYLE, color: '#9ad1ff', fontSize: '16px',
    }).setOrigin(0.5, 0);
    this.add.text(VIEW_W / 2, 154, 'An apprentice keeper relights five shrines.', DIM_STYLE)
      .setOrigin(0.5, 0);

    const save = SaveManager.load();
    this.selecting = false;

    this.menu = new Menu(this, VIEW_W / 2 - 130, 212, [
      { label: 'New Game', onPick: () => { RunState.newGame(); this.scene.start('Game', { levelKey: RunState.levelKey }); } },
      {
        label: 'Continue',
        value: () => save.unlockedLevel > 0 ? LEVEL_TITLES[LEVEL_ORDER[save.unlockedLevel]] : 'locked',
        enabled: () => save.unlockedLevel > 0,
        onPick: () => { RunState.continueGame(); this.scene.start('Game', { levelKey: RunState.levelKey }); },
      },
      { label: 'Level Select', onPick: () => this.scene.start('LevelSelect') },
      { label: 'How to Play', onPick: () => this.scene.start('HowToPlay') },
      { label: 'Settings', onPick: () => this.scene.start('Settings', { from: 'Menu' }) },
      { label: 'Credits', onPick: () => this.scene.start('Credits') },
    ], { width: 260 });

    this.add.text(VIEW_W / 2, VIEW_H - 40, 'Arrows / WASD to move · Enter to choose', DIM_STYLE)
      .setOrigin(0.5, 0);
    InputManager.suppressHeld();
  }

  update() {
    AudioManager.ensure();
    this.menu.update(InputManager);
    InputManager.flush();
  }
}

// ========================================================= LEVEL SELECT
export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelect'); }

  create() {
    backdrop(this, 0x101423, 0x24304a);
    this.add.text(VIEW_W / 2, 50, 'LEVEL SELECT', TITLE_STYLE).setOrigin(0.5, 0);
    this.add.text(VIEW_W / 2, 100, 'Record runs start with 3 lives and an empty wallet.', DIM_STYLE)
      .setOrigin(0.5, 0);

    const save = SaveManager.load();
    const items = LEVEL_ORDER.map((key, i) => ({
      label: `${i + 1}. ${LEVEL_TITLES[key]}`,
      value: () => i > save.unlockedLevel
        ? 'locked'
        : `${fmtTime(save.bestTime[i])}   ${save.bestGemCount[i] == null ? '--' : save.bestGemCount[i]} gems`,
      enabled: () => i <= save.unlockedLevel,
      onPick: () => { RunState.startLevel(i); this.scene.start('Game', { levelKey: key }); },
    }));
    items.push({ label: 'Back', onPick: () => this.scene.start('Menu') });

    this.menu = new Menu(this, 190, 160, items, { width: 480, spacing: 34 });
    InputManager.suppressHeld();
  }

  update() {
    if (InputManager.codeJustPressed('Escape')) { this.scene.start('Menu'); return; }
    this.menu.update(InputManager);
    InputManager.flush();
  }
}

// ========================================================== HOW TO PLAY
export class HowToPlayScene extends Phaser.Scene {
  constructor() { super('HowToPlay'); }

  create() {
    backdrop(this, 0x101423, 0x243044);
    this.add.text(VIEW_W / 2, 36, 'HOW TO PLAY', TITLE_STYLE).setOrigin(0.5, 0);

    const keys = SaveManager.settings.keys;
    const row = (a, b) => `${a.padEnd(22)}${b}`;
    this.add.text(110, 104, [
      row('Move left / right', `${prettyKey(keys.left[0])} ${prettyKey(keys.right[0])}   or  A D`),
      row('Jump', `${prettyKey(keys.jump[0])}   or  SPACE / W   (same height every press)`),
      row('Fire', `${prettyKey(keys.fire[0])}   or  X`),
      row('Pause', 'P   or  ESC'),
    ].join('\n'), BODY_STYLE);

    this.add.text(110, 214, [
      '1 gem  =  1 bullet.  Shooting spends the same gems that buy lives.',
      '100 gems  =  1 extra life.  The HUD bar fills toward the next one.',
      'No stomping. Jump over enemies or shoot them — landing on one kills you.',
      'One hit is death. Every hazard warns you before it can hurt you.',
      'Three layers: the ground is safest, the top pays three times as much.',
    ].join('\n'), { ...BODY_STYLE, color: '#dfe6f5' });

    this.add.text(110, 348,
      'On Mac, if Ctrl + arrows switches desktops, use X to fire.',
      { ...BODY_STYLE, color: '#ffd76a' });

    this.menu = new Menu(this, VIEW_W / 2 - 40, 418, [
      { label: 'Back', onPick: () => this.scene.start('Menu') },
    ], { width: 80 });
    InputManager.suppressHeld();
  }

  update() {
    if (InputManager.codeJustPressed('Escape')) { this.scene.start('Menu'); return; }
    this.menu.update(InputManager);
    InputManager.flush();
  }
}

// ============================================================== CREDITS
export class CreditsScene extends Phaser.Scene {
  constructor() { super('Credits'); }

  create() {
    backdrop(this, 0x0f0e1a, 0x241f36);
    this.add.text(VIEW_W / 2, 60, 'CREDITS', TITLE_STYLE).setOrigin(0.5, 0);
    this.add.text(VIEW_W / 2, 140, [
      'Elements: The Five Trials',
      '',
      'An original game. Every shape is drawn in code,',
      'every sound is generated with Web Audio,',
      'and there are no external asset files.',
      '',
      'Built on Phaser 3.',
    ].join('\n'), { ...BODY_STYLE, align: 'center' }).setOrigin(0.5, 0);

    this.menu = new Menu(this, VIEW_W / 2 - 40, 390, [
      { label: 'Back', onPick: () => this.scene.start('Menu') },
    ], { width: 80 });
    InputManager.suppressHeld();
  }

  update() {
    if (InputManager.codeJustPressed('Escape')) { this.scene.start('Menu'); return; }
    this.menu.update(InputManager);
    InputManager.flush();
  }
}

// ============================================================= SETTINGS
export class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }

  init(data) {
    this.from = (data && data.from) || 'Menu';
    this.levelKey = data && data.levelKey;
  }

  create() {
    backdrop(this, 0x121020, 0x2a2440);
    this.add.text(VIEW_W / 2, 34, 'SETTINGS', TITLE_STYLE).setOrigin(0.5, 0);

    const s = SaveManager.settings;
    const pct = (v) => `${Math.round(v * 100)}%`;
    const bump = (field, d) => {
      s[field] = Math.max(0, Math.min(1, Math.round((s[field] + d) * 20) / 20));
      SaveManager.save();
      AudioManager.applyVolumes();
    };

    this.remapping = null;
    this.hint = this.add.text(VIEW_W / 2, VIEW_H - 46, '', DIM_STYLE).setOrigin(0.5, 0);

    const keyItem = (action, label) => ({
      label: `  ${label}`,
      value: () => this.remapping === action
        ? 'press a key…'
        : SaveManager.settings.keys[action].map(prettyKey).join(' / '),
      onPick: () => {
        if (LOCKED_ACTIONS.has(action)) return;
        this.remapping = action;
        this.menu.refresh();
        InputManager.capture((code) => {
          if (code !== 'Escape' && code !== 'KeyP') InputManager.setBinding(action, code);
          this.remapping = null;
          this.menu.refresh();
        });
      },
    });

    this.menu = new Menu(this, 220, 92, [
      { label: 'Music volume', value: () => pct(s.volumeMusic), onLeft: () => bump('volumeMusic', -0.05), onRight: () => bump('volumeMusic', 0.05) },
      { label: 'Effects volume', value: () => pct(s.volumeSfx), onLeft: () => bump('volumeSfx', -0.05), onRight: () => bump('volumeSfx', 0.05) },
      {
        label: 'Reduce effects', value: () => s.reduceEffects ? 'on' : 'off',
        onPick: () => { s.reduceEffects = !s.reduceEffects; SaveManager.save(); },
        onLeft: () => { s.reduceEffects = !s.reduceEffects; SaveManager.save(); },
        onRight: () => { s.reduceEffects = !s.reduceEffects; SaveManager.save(); },
      },
      {
        label: 'Assist Mode (0.75x, no record)', value: () => s.assist ? 'on' : 'off',
        onPick: () => { s.assist = !s.assist; SaveManager.save(); },
        onLeft: () => { s.assist = !s.assist; SaveManager.save(); },
        onRight: () => { s.assist = !s.assist; SaveManager.save(); },
      },
      { label: 'Keys — Enter to rebind', value: () => '' },
      keyItem('left', 'Move left'),
      keyItem('right', 'Move right'),
      keyItem('jump', 'Jump'),
      keyItem('fire', 'Fire'),
      { label: '  Pause (fixed)', value: () => 'P / ESC' },
      { label: 'Reset keys to defaults', onPick: () => { InputManager.resetBindings(); this.menu.refresh(); } },
      { label: 'Back', onPick: () => this.leave() },
    ], { width: 420, spacing: 28 });

    this.hint.setText('Assist Mode changes lives and speed, so its runs are never saved as records.');
    InputManager.suppressHeld();
  }

  leave() {
    RunState.assist = SaveManager.settings.assist;
    if (this.from === 'Game' && this.levelKey) this.scene.start('Game', { levelKey: this.levelKey });
    else this.scene.start('Menu');
  }

  update() {
    if (this.remapping) { return; }
    if (InputManager.codeJustPressed('Escape')) { this.leave(); return; }
    this.menu.update(InputManager);
    InputManager.flush();
  }
}

// ======================================================= LEVEL COMPLETE
export class LevelCompleteScene extends Phaser.Scene {
  constructor() { super('LevelComplete'); }
  init(data) { this.data_ = data; }

  create() {
    const d = this.data_;
    const theme = THEMES[d.levelKey];
    backdrop(this, theme.skyTop, theme.skyBottom);
    AudioManager.levelComplete();

    this.add.text(VIEW_W / 2, 70, `${LEVEL_TITLES[d.levelKey]} GATE`, TITLE_STYLE).setOrigin(0.5, 0);
    this.add.text(VIEW_W / 2, 122, 'The shrine is lit.', DIM_STYLE).setOrigin(0.5, 0);

    const rows = [
      ['Time', fmtTime(d.time) + (d.record && d.record.newTime ? '   BEST' : '')],
      ['Gems', `${d.gems} / ${d.total}` + (d.record && d.record.newGems ? '   BEST' : '')],
      ['Enemies defeated', String(d.enemies)],
      ['Lives', String(d.lives)],
    ];
    this.add.text(VIEW_W / 2 - 170, 176,
      rows.map(r => `${r[0].padEnd(20)}${r[1]}`).join('\n'),
      { ...BODY_STYLE, fontSize: '17px', lineSpacing: 10 });

    const last = d.levelIndex >= LEVEL_ORDER.length - 1;
    this.menu = new Menu(this, VIEW_W / 2 - 110, 320, [
      {
        label: last ? 'Finish' : 'Continue',
        onPick: () => {
          if (last) { this.scene.start('GameComplete'); return; }
          RunState.advanceLevel();
          this.scene.start('Game', { levelKey: RunState.levelKey });
        },
      },
      { label: 'Main Menu', onPick: () => this.scene.start('Menu') },
    ], { width: 220 });
    InputManager.suppressHeld();
  }

  update() { this.menu.update(InputManager); InputManager.flush(); }
}

// ============================================================ GAME OVER
export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }
  init(data) { this.data_ = data; }

  create() {
    const d = this.data_;
    backdrop(this, 0x1a0a0e, 0x3a1620);
    this.add.text(VIEW_W / 2, 90, 'GAME OVER', { ...TITLE_STYLE, color: '#ff9a8a' }).setOrigin(0.5, 0);
    this.add.text(VIEW_W / 2, 156,
      `${LEVEL_TITLES[d.levelKey]}    ${fmtTime(d.time)}    ${d.gems} / ${d.total} gems`,
      { ...BODY_STYLE, fontSize: '17px' }).setOrigin(0.5, 0);

    this.menu = new Menu(this, VIEW_W / 2 - 110, 240, [
      {
        label: 'Retry Level',
        onPick: () => { RunState.retryLevel(); this.scene.start('Game', { levelKey: d.levelKey }); },
      },
      { label: 'Main Menu', onPick: () => this.scene.start('Menu') },
    ], { width: 220 });

    this.add.text(VIEW_W / 2, 350,
      'Retrying gives you three lives and the gems you entered the level with.',
      DIM_STYLE).setOrigin(0.5, 0);
    InputManager.suppressHeld();
  }

  update() { this.menu.update(InputManager); InputManager.flush(); }
}

// ======================================================== GAME COMPLETE
export class GameCompleteScene extends Phaser.Scene {
  constructor() { super('GameComplete'); }

  create() {
    GameState.set(State.GAME_COMPLETE);
    backdrop(this, 0x0d1020, 0x2a3a5a);
    this.add.text(VIEW_W / 2, 56, 'ALL FIVE SHRINES LIT', TITLE_STYLE).setOrigin(0.5, 0);
    this.add.text(VIEW_W / 2, 108, 'The keeper walks home through five quiet gates.', DIM_STYLE)
      .setOrigin(0.5, 0);

    const s = RunState.stats;
    const rows = [
      ['Total time', fmtTime(s.totalTime)],
      ['Gems collected', String(s.totalGems)],
      ['Enemies defeated', String(s.enemiesDefeated)],
      ['Lives left', String(RunState.lives)],
      ['Deaths', String(s.deaths)],
    ];
    this.add.text(VIEW_W / 2 - 170, 160,
      rows.map(r => `${r[0].padEnd(20)}${r[1]}`).join('\n'),
      { ...BODY_STYLE, fontSize: '17px', lineSpacing: 10 });

    this.menu = new Menu(this, VIEW_W / 2 - 110, 330, [
      { label: 'Play Again', onPick: () => { RunState.newGame(); this.scene.start('Game', { levelKey: RunState.levelKey }); } },
      { label: 'Main Menu', onPick: () => this.scene.start('Menu') },
    ], { width: 220 });
    InputManager.suppressHeld();
  }

  update() { this.menu.update(InputManager); InputManager.flush(); }
}
