// PRD §11 — the standing check that physics changes have not broken geometry.
// Dev only: F2 from a level, F2 or Esc to leave.

import { PHYSICS, TILE, ROWS, VIEW_W } from '../config/physicsConfig.js';
import { buildWorld } from '../systems/LevelLoader.js';
import { InputManager } from '../systems/InputManager.js';
import { DebugOverlay } from '../systems/DebugOverlay.js';
import { Player } from '../entities/Player.js';
import { GameState, State } from '../systems/RunState.js';

const WIDTH = 96;

function buildTestMap() {
  const rows = [];
  for (let r = 0; r < ROWS; r++) rows.push(new Array(WIDTH).fill('.'));
  const set = (r, c, ch) => { if (c >= 0 && c < WIDTH) rows[r][c] = ch; };
  const ground = (a, b) => { for (let c = a; c <= b; c++) { set(15, c, '#'); set(16, c, '#'); } };
  const plat = (row, a, b, ch) => { for (let c = a; c <= b; c++) set(row, c, ch || '='); };

  ground(0, 19);              // run-up
  ground(24, 57);             // after the 4-tile flat gap (20-23)
  ground(63, 95);             // after the 5-tile drop gap (58-62)

  plat(11, 37, 45);           // 3-tile gap while jumping up one layer, from col 33
  plat(11, 49, 57);           // walk off here for the 5-tile drop to the ground
  plat(7, 66, 74);            // Layer 3, so all three layers are present
  plat(11, 68, 69);           // a 2-tile platform
  for (let r = 11; r <= 14; r++) set(r, 76, 'B');   // a wall, 4 tiles tall
  plat(11, 84, 90);           // a one-way platform to jump up through

  set(14, 2, 'P');
  set(14, 93, 'G');
  return rows.map(r => r.join(''));
}

export const TEST_LEVEL = {
  name: 'TEST ROOM',
  theme: 'trial',
  parTime: 999,
  totalGemValue: 0,
  tiles: buildTestMap(),
  enemies: [],
  hazards: [],
  movers: [],
  checkpoints: [],
  gate: { x: 93, y: 15 },
};

const LABELS = [
  [20, '4-tile flat gap'],
  [34, '3-tile gap, one layer up'],
  [58, '5-tile gap, one layer down'],
  [66, 'Layer 3'],
  [68, '2-tile platform'],
  [76, 'wall'],
  [84, 'one-way: jump up through it'],
];

export class TestRoomScene extends Phaser.Scene {
  constructor() { super('TestRoom'); }

  create() {
    this.world = buildWorld(this, TEST_LEVEL, 'testroom');
    const W = this.world;
    this.physics.world.gravity.y = PHYSICS.gravity;
    this.physics.world.setBounds(0, 0, W.worldW, W.worldH + 400);

    this.player = new Player(this, W.start.col * TILE + TILE / 2, (W.start.row + 1) * TILE);
    this.physics.add.collider(this.player, W.solids);
    this.physics.add.collider(this.player, W.oneWays, null, (player, plat) => {
      const pb = player.body;
      return pb.velocity.y >= 0 && pb.prev.y + pb.height <= plat.body.top + 8;
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W.worldW, W.worldH);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setDeadzone(VIEW_W * 0.15, W.worldH);

    for (const [col, label] of LABELS) {
      this.add.text(col * TILE, 60, label, {
        fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '12px', color: '#ffe6a8',
        backgroundColor: 'rgba(0,0,0,0.45)', padding: { x: 4, y: 3 },
      }).setDepth(100);
    }

    this.add.text(8, 8, 'TEST ROOM   F1 debug overlay   F2 / ESC leave', {
      fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '13px', color: '#9ad167',
      backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(1001);

    this.debug = new DebugOverlay(this);
    this.debug.toggle();
    GameState.set(State.PLAYING);
    InputManager.suppressHeld();
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (InputManager.codeJustPressed('F1')) this.debug.toggle();
    if (InputManager.codeJustPressed('F2') || InputManager.codeJustPressed('Escape')) {
      GameState.set(State.MENU);
      this.scene.start('Menu');
      InputManager.flush();
      return;
    }
    this.player.update(dt, InputManager, { solidAt: this.world.solidAt });
    if (this.player.y > PHYSICS.deathLineY) {
      this.player.respawnAt(this.world.start.col * TILE + TILE / 2, (this.world.start.row + 1) * TILE);
    }
    this.world.far.tilePositionX = this.cameras.main.scrollX * 0.2;
    this.world.near.tilePositionX = this.cameras.main.scrollX * 0.5;
    this.debug.update(dt, {
      player: this.player, gems: 0, lives: 0,
      worldW: this.world.worldW, levelTime: 0,
    });
    InputManager.flush();
  }
}
