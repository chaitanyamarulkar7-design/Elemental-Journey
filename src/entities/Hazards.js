// PRD §8 — every hazard is deterministic, telegraphed, and resets on death.

import { PHYSICS, TILE } from '../config/physicsConfig.js';
import { AudioManager } from '../systems/AudioManager.js';

/**
 * A ledge that shakes for 0.8 s after the player lands, falls, and regrows
 * 3 s later — so it can never strand anyone (PRD §4, §8).
 */
export class CrumbleLedge extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, col, row, theme, runId) {
    super(scene, col * TILE + TILE / 2, row * TILE + 6, `crumble_${theme}`);
    this.runId = runId;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(20);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(TILE, 20);
    this.body.setOffset(0, 0);
    this.homeX = this.x;
    this.homeY = this.y;
    this.state = 'idle';
    this.timer = 0;
  }

  touchedByPlayer() {
    if (this.state !== 'idle') return;
    this.state = 'shaking';
    this.timer = PHYSICS.crumbleShake;
    AudioManager.crumbleWarn();
  }

  resetHazard() {
    this.state = 'idle';
    this.timer = 0;
    this.setPosition(this.homeX, this.homeY);
    this.body.reset(this.homeX, this.homeY);
    this.body.enable = true;
    this.setVisible(true);
    this.setAlpha(1);
  }

  update(dt) {
    if (this.state === 'shaking') {
      this.timer -= dt;
      this.x = this.homeX + Math.sin(this.timer * 60) * 2.5;
      if (this.timer <= 0) {
        this.state = 'falling';
        this.timer = PHYSICS.crumbleRegrow;
        this.body.enable = false;
        this.x = this.homeX;
        this.fallV = 0;
      }
    } else if (this.state === 'falling') {
      this.fallV += PHYSICS.gravity * dt;
      this.y += this.fallV * dt;
      this.setAlpha(Math.max(0, this.alpha - dt * 1.6));
      this.timer -= dt;
      if (this.timer <= 0) this.resetHazard();
    }
  }
}

/** A platform on a fixed path that pauses at each end and carries the player. */
export class MovingPlatform extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, def, theme) {
    const path = def.path || [[def.x, def.y], [def.x, def.y]];
    super(scene, path[0][0] * TILE, path[0][1] * TILE, `mover_${theme}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0, 0);
    this.setDepth(22);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(96, 16);
    this.def = def;
    this.pathPx = path.map(p => ({ x: p[0] * TILE, y: p[1] * TILE }));
    this.speed = def.speed || PHYSICS.moverSpeed;
    this.resetHazard();
  }

  resetHazard() {
    this.leg = 0;
    this.progress = 0;
    this.pause = 0;
    this.dx = 0;
    this.dy = 0;
    const p = this.pathPx[0];
    this.setPosition(p.x, p.y);
    this.body.reset(p.x, p.y);
  }

  update(dt) {
    const from = this.pathPx[this.leg];
    const to = this.pathPx[(this.leg + 1) % this.pathPx.length];
    const dist = Math.hypot(to.x - from.x, to.y - from.y) || 1;

    if (this.pause > 0) {
      this.pause -= dt;
      this.dx = 0; this.dy = 0;
      return;
    }

    this.progress += (this.speed * dt) / dist;
    let t = this.progress;
    if (t >= 1) {
      t = 1;
      this.progress = 0;
      this.leg = (this.leg + 1) % this.pathPx.length;
      this.pause = PHYSICS.moverPause;
    }
    const nx = from.x + (to.x - from.x) * t;
    const ny = from.y + (to.y - from.y) * t;
    this.dx = nx - this.x;
    this.dy = ny - this.y;
    this.setPosition(nx, ny);
    this.body.updateFromGameObject();
  }
}

/** Drops when the player is within 3 tiles, after a 0.7 s dust-and-rattle tell. */
export class FallingRock extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, def) {
    super(scene, def.x * TILE + TILE / 2, def.y * TILE + 16, 'rock');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(45);
    this.body.setAllowGravity(false);
    this.body.setSize(24, 24);
    this.body.setOffset(4, 4);
    this.def = def;
    this.homeX = this.x;
    this.homeY = this.y;
    this.dust = null;
    this.resetHazard();
  }

  resetHazard() {
    this.state = 'armed';
    this.timer = 0;
    this.setPosition(this.homeX, this.homeY);
    this.body.reset(this.homeX, this.homeY);
    this.body.setAllowGravity(false);
    this.setVisible(true);
    this.setAlpha(1);
    this.rotation = 0;
  }

  update(dt, player, emitDust) {
    if (this.state === 'armed') {
      if (Math.abs(player.x - this.x) < PHYSICS.fallingRockTriggerTiles * TILE) {
        this.state = 'warning';
        this.timer = PHYSICS.fallingRockWarn;
        AudioManager.rockWarn();
      }
    } else if (this.state === 'warning') {
      this.timer -= dt;
      this.x = this.homeX + Math.sin(this.timer * 70) * 1.5;
      if (emitDust) emitDust(this.x, this.y + 16);
      if (this.timer <= 0) {
        this.state = 'falling';
        this.x = this.homeX;
        this.body.setAllowGravity(true);
      }
    } else if (this.state === 'falling') {
      this.rotation += dt * 3;
    }
  }

  shatter(burst) {
    if (this.state === 'gone') return;
    this.state = 'gone';
    this.body.enable = false;
    this.setVisible(false);
    AudioManager.rockShatter();
    if (burst) burst(this.x, this.y);
  }
}

/** 2 s off, 0.6 s glow, 1 s eruption three tiles tall (PRD §8). */
export class FirePillar {
  constructor(scene, def) {
    this.def = def;
    this.x = def.x * TILE + TILE / 2;
    this.surfaceY = def.y * TILE;
    this.vent = scene.add.image(this.x, this.surfaceY, 'vent').setOrigin(0.5, 1).setDepth(18);
    this.flame = scene.add.image(this.x, this.surfaceY, 'pillar').setOrigin(0.5, 1).setDepth(46);
    this.flame.setVisible(false);
    this.flame.displayHeight = PHYSICS.firePillarTiles * TILE;
    this.cycle = PHYSICS.firePillarOff + PHYSICS.firePillarGlow + PHYSICS.firePillarErupt;
    this.phase0 = def.phase || 0;
    this.resetHazard();
  }

  resetHazard() {
    this.t = this.phase0;
    this.flame.setVisible(false);
    this.wasErupting = false;
    this.wasGlowing = false;
  }

  update(dt) {
    this.t += dt;
    const p = this.t % this.cycle;
    const glowFrom = PHYSICS.firePillarOff;
    const eruptFrom = glowFrom + PHYSICS.firePillarGlow;

    if (p < glowFrom) {
      this.vent.setTint(0x888888);
      this.flame.setVisible(false);
      this.wasErupting = false;
      this.wasGlowing = false;
    } else if (p < eruptFrom) {
      if (!this.wasGlowing) { this.wasGlowing = true; AudioManager.pillarWarn(); }
      const k = (p - glowFrom) / PHYSICS.firePillarGlow;
      this.vent.setTint(Phaser.Display.Color.GetColor(255, 180 - k * 120, 80));
      this.flame.setVisible(false);
    } else {
      if (!this.wasErupting) { this.wasErupting = true; AudioManager.pillarErupt(); }
      this.vent.setTint(0xffffff);
      this.flame.setVisible(true);
      const k = (p - eruptFrom) / PHYSICS.firePillarErupt;
      const h = PHYSICS.firePillarTiles * TILE * Math.min(1, k * 4) * (1 - Math.max(0, k - 0.8) * 3);
      this.flame.displayHeight = Math.max(4, h);
      this.flame.setAlpha(0.85 + Math.sin(this.t * 40) * 0.15);
    }
  }

  get lethalRect() {
    if (!this.flame.visible) return null;
    const h = this.flame.displayHeight;
    return { x: this.x - 10, y: this.surfaceY - h, w: 20, h };
  }
}

/** Water level cycling between two marked heights (PRD §8). */
export class Tide {
  constructor(scene, def, theme) {
    this.def = def;
    this.x1 = def.x * TILE;
    this.x2 = (def.x2 + 1) * TILE;
    this.lowY = def.lowRow * TILE;
    this.highY = def.highRow * TILE;
    this.cycle = PHYSICS.tideLow + PHYSICS.tideRise + PHYSICS.tideHigh + PHYSICS.tideFall;
    this.surface = scene.add.tileSprite(
      this.x1, this.lowY, this.x2 - this.x1, PHYSICS.deathLineY - this.highY, 'liquid_water');
    this.surface.setOrigin(0, 0).setDepth(30).setAlpha(0.75);
    // A gauge on the wall marks both heights, so the cycle is readable.
    this.gauge = scene.add.graphics().setDepth(31);
    this.gauge.lineStyle(2, 0xdff6ff, 0.5);
    this.gauge.strokeRect(this.x1 + 2, this.highY, 6, this.lowY - this.highY);
    this.gauge.lineStyle(2, 0xdff6ff, 0.5);
    this.gauge.strokeRect(this.x2 - 8, this.highY, 6, this.lowY - this.highY);
    this.resetHazard();
  }

  resetHazard() {
    this.t = 0;
    this.level = this.lowY;
    this.warned = false;
  }

  update(dt) {
    this.t += dt;
    const p = this.t % this.cycle;
    const a = PHYSICS.tideLow;
    const b = a + PHYSICS.tideRise;
    const c = b + PHYSICS.tideHigh;
    if (p < a) {
      this.level = this.lowY;
      this.warned = false;
      if (p > a - 1.0 && !this.warned) { this.warned = true; AudioManager.tideWarn(); }
    } else if (p < b) {
      this.level = this.lowY + (this.highY - this.lowY) * ((p - a) / PHYSICS.tideRise);
    } else if (p < c) {
      this.level = this.highY;
    } else {
      this.level = this.highY + (this.lowY - this.highY) * ((p - c) / PHYSICS.tideFall);
    }
    this.surface.y = this.level;
    this.surface.height = Math.max(1, PHYSICS.deathLineY - this.level);
    this.surface.tilePositionX += dt * 12;
  }

  get lethalRect() {
    if (this.level >= this.lowY - 1) return null;
    return { x: this.x1, y: this.level + 6, w: this.x2 - this.x1, h: PHYSICS.deathLineY - this.level };
  }
}

/** The Fire finale: lava rises in two fixed stages, never a random chase. */
export class RisingLava {
  constructor(scene, def, worldW) {
    this.def = def;
    this.triggerX = def.x * TILE;
    this.midX = def.midX * TILE;
    this.stage1Y = PHYSICS.layer2Row * TILE + 16;  // just below Layer 2
    this.stage2Y = PHYSICS.layer3Row * TILE + 16;  // just below Layer 3
    this.restY = PHYSICS.deathLineY + 40;
    this.surface = scene.add.tileSprite(0, this.restY, worldW, 240, 'liquid_lava');
    this.surface.setOrigin(0, 0).setDepth(32).setAlpha(0.95);
    this.scene = scene;
    this.resetHazard();
  }

  resetHazard() {
    this.stage = 0;
    this.level = this.restY;
    this.target = this.restY;
    this.warn = 0;
    this.surface.y = this.level;
  }

  update(dt, player, onWarn) {
    if (this.stage === 0 && player.x >= this.triggerX) {
      this.stage = 1;
      this.warn = PHYSICS.risingLavaWarn;
      if (onWarn) onWarn();
    }
    if (this.stage === 1) {
      if (this.warn > 0) { this.warn -= dt; return; }
      this.target = this.stage1Y;
      if (player.x >= this.midX) this.stage = 2;
    }
    if (this.stage === 2) this.target = this.stage2Y;

    if (this.level > this.target) {
      this.level = Math.max(this.target, this.level - PHYSICS.risingLavaSpeed * dt);
      this.surface.y = this.level;
    }
    this.surface.tilePositionX += dt * 18;
  }

  get active() { return this.stage > 0 && this.warn <= 0; }

  get lethalRect() {
    if (this.level >= this.restY - 1) return null;
    return { x: 0, y: this.level + 6, w: this.surface.width, h: 400 };
  }
}

/** An elemental shrine that lights when touched. Free in MVP (PRD §7). */
export class Checkpoint extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, def, index, theme) {
    super(scene, def.x * TILE + TILE / 2, def.y * TILE, `shrine_off_${theme}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(25);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(28, 46);
    this.body.setOffset(2, 2);
    this.cpIndex = index;
    this.theme = theme;
    this.lit = false;
  }

  light() {
    if (this.lit) return false;
    this.lit = true;
    this.setTexture(`shrine_on_${this.theme}`);
    return true;
  }

  setLit(on) {
    this.lit = on;
    this.setTexture(on ? `shrine_on_${this.theme}` : `shrine_off_${this.theme}`);
  }
}

/** The elemental gate that ends the level. */
export class ElementalGate extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, def, theme) {
    super(scene, def.x * TILE + TILE / 2, def.y * TILE, `gate_${theme}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(24);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(40, 80);
    this.body.setOffset(12, 14);
  }
}
