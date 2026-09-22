// PRD §6 — four behaviour archetypes, re-skinned per element.
// All MVP enemies have 1 HP, none can be stomped, all are avoidable.

import { PHYSICS, TILE } from '../config/physicsConfig.js';
import { AudioManager } from '../systems/AudioManager.js';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, def, id, theme) {
    const texture = def.type === 'spitter' ? 'spitter_fire' : `${def.type}_${theme}`;
    const startX = def.x * TILE + TILE / 2;
    const startY = def.type === 'flyer'
      ? def.y * TILE + TILE / 2
      : def.y * TILE;
    super(scene, startX, startY, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.def = def;
    this.enemyId = id;
    this.kind = def.type;
    this.theme = theme;
    this.setDepth(50);
    this.setOrigin(0.5, def.type === 'flyer' ? 0.5 : 1);

    const inset = PHYSICS.enemyHitboxInset;
    this.body.setSize(32 - inset * 2, 32 - inset * 2);
    this.body.setOffset(inset, def.type === 'flyer' ? inset : inset * 2);
    this.body.setAllowGravity(def.type === 'walker' || def.type === 'jumper');
    this.body.setImmovable(def.type === 'spitter');

    this.homeX = startX;
    this.homeY = startY;
    this.active_ = false;
    this.alive_ = true;
    this.t = def.phase || 0;
    this.dir = def.facing || 1;
    this.hopTimer = 0;
    this.squatting = false;
    this.shotTimer = def.phase || 0;
    this.glowing = false;
    this.glowFx = null;

    this.speed = def.type === 'walker'
      ? (theme === 'fire' ? PHYSICS.walkerSpeedFire : PHYSICS.walkerSpeed)
      : def.type === 'jumper' ? PHYSICS.jumperSpeed
      : PHYSICS.flyerSpeed;

    if (def.type === 'flyer') this.trail = null;
    this.resetToStart();
  }

  get patrolMin() { return this.def.patrol ? this.def.patrol[0] * TILE : this.homeX - 64; }
  get patrolMax() { return this.def.patrol ? (this.def.patrol[1] + 1) * TILE : this.homeX + 64; }

  resetToStart() {
    this.alive_ = true;
    this.active_ = false;
    this.setActive(true).setVisible(true);
    this.body.enable = true;
    this.setPosition(this.homeX, this.homeY);
    this.body.reset(this.homeX, this.homeY);
    this.setAlpha(1);
    this.setScale(1);
    this.t = this.def.phase || 0;
    this.dir = this.def.facing || 1;
    this.hopTimer = 0;
    this.squatting = false;
    this.shotTimer = this.def.phase || 0;
    this.glowing = false;
    this.setTint(0xffffff);
    this.clearTint();
  }

  kill(scene) {
    if (!this.alive_) return false;
    this.alive_ = false;
    this.body.enable = false;
    this.setActive(false).setVisible(false);
    return true;
  }

  isAlive() { return this.alive_; }

  /**
   * Wakes only when close to the visible area, and never within 200 px of the
   * player, so nothing ever appears on top of them (PRD §6).
   */
  tryActivate(cam, playerX) {
    if (this.active_) return;
    const left = cam.scrollX - PHYSICS.enemyActivationPad;
    const right = cam.scrollX + cam.width + PHYSICS.enemyActivationPad;
    if (this.x < left || this.x > right) return;
    if (Math.abs(this.x - playerX) < 200 && !this.wasSeen) return;
    this.active_ = true;
    this.wasSeen = true;
  }

  update(dt, ctx) {
    if (!this.alive_) return;
    this.tryActivate(ctx.camera, ctx.player.x);
    if (!this.active_) {
      if (this.body.allowGravity) this.body.setVelocityX(0);
      return;
    }
    this.t += dt;

    switch (this.kind) {
      case 'walker': this.updateWalker(dt, ctx); break;
      case 'jumper': this.updateJumper(dt, ctx); break;
      case 'flyer': this.updateFlyer(dt, ctx); break;
      case 'spitter': this.updateSpitter(dt, ctx); break;
    }
  }

  updateWalker(dt, ctx) {
    const min = this.patrolMin;
    const max = this.patrolMax;
    if (this.x <= min + 8) this.dir = 1;
    if (this.x >= max - 8) this.dir = -1;
    if (this.body.blocked.left) this.dir = 1;
    if (this.body.blocked.right) this.dir = -1;

    // Never walk off an edge.
    if (this.body.blocked.down && ctx.standableAt) {
      const aheadCol = Math.floor((this.x + this.dir * 18) / TILE);
      const footRow = Math.floor((this.body.bottom + 4) / TILE);
      if (!ctx.standableAt(aheadCol, footRow)) this.dir *= -1;
    }
    this.body.setVelocityX(this.speed * this.dir);
    this.setFlipX(this.dir < 0);
  }

  updateJumper(dt, ctx) {
    const grounded = this.body.blocked.down;
    const inWater = !!this.def.water;

    if (inWater) {
      // A leaping fish rises out of the water on a fixed beat.
      this.hopTimer -= dt;
      if (this.hopTimer <= 0 && this.y >= this.homeY - 4) {
        this.hopTimer = PHYSICS.jumperInterval;
        this.body.setVelocityY(-PHYSICS.jumperHopVelocity);
        this.squatting = false;
      }
      if (this.y > this.homeY) {
        this.setPosition(this.x, this.homeY);
        this.body.reset(this.x, this.homeY);
      }
      this.body.setVelocityX(0);
      return;
    }

    if (grounded) {
      this.hopTimer -= dt;
      if (!this.squatting && this.hopTimer <= PHYSICS.jumperSquat) {
        this.squatting = true;
        this.setScale(1.15, 0.8);  // the 0.3 s tell before every hop
      }
      if (this.hopTimer <= 0) {
        this.hopTimer = PHYSICS.jumperInterval;
        this.squatting = false;
        this.setScale(1, 1);
        this.body.setVelocityY(-PHYSICS.jumperHopVelocity);
        const min = this.patrolMin, max = this.patrolMax;
        if (this.x <= min + 8) this.dir = 1;
        if (this.x >= max - 8) this.dir = -1;
        this.body.setVelocityX(this.speed * this.dir);
      } else if (this.squatting) {
        this.body.setVelocityX(0);
      } else {
        this.body.setVelocityX(0);
      }
    }
    this.setFlipX(this.dir < 0);
  }

  updateFlyer(dt, ctx) {
    const amp = (this.def.amp || 3) * TILE;
    const span = (this.def.span || 6) * TILE;
    const period = (span * 2) / this.speed;
    const phase = (this.t / period) * Math.PI * 2;
    if (this.def.path === 'loop') {
      this.setPosition(
        this.homeX + Math.cos(phase) * span * 0.5,
        this.homeY + Math.sin(phase) * amp
      );
    } else {
      this.setPosition(
        this.homeX + Math.sin(phase) * span * 0.5,
        this.homeY + Math.sin(phase * 2) * amp * 0.5
      );
    }
    this.body.updateFromGameObject();
    this.setFlipX(Math.cos(phase) < 0);
  }

  updateSpitter(dt, ctx) {
    const cam = ctx.camera;
    const onScreen = this.x > cam.scrollX - 32 && this.x < cam.scrollX + cam.width + 32;
    if (!onScreen) { this.glowing = false; this.clearTint(); return; }

    this.shotTimer += dt;
    const cycle = PHYSICS.spitterInterval;
    const phase = this.shotTimer % cycle;
    const glowFrom = cycle - PHYSICS.spitterGlow;

    if (phase >= glowFrom) {
      if (!this.glowing) {
        this.glowing = true;
        AudioManager.spitterGlow();
      }
      const k = (phase - glowFrom) / PHYSICS.spitterGlow;
      this.setTint(Phaser.Display.Color.GetColor(255, 200 - k * 140, 120 - k * 100));
    } else if (this.glowing) {
      this.glowing = false;
      this.clearTint();
      ctx.spawnEnemyShot(this.x + this.dir * 18, this.y - 16, this.dir);
      AudioManager.spitterShot();
    }
    this.setFlipX(this.dir < 0);
  }
}

/** Enemy projectiles: large, bright, slow, and they cannot be shot down. */
export class EnemyShot extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, dir) {
    super(scene, x, y, 'enemy_shot');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(55);
    this.body.setAllowGravity(false);
    this.body.setCircle(8, 2, 2);
    this.body.setVelocityX(PHYSICS.spitterProjectile * dir);
    this.spawnX = x;
  }

  update(dt) {
    this.rotation += dt * 6;
    if (Math.abs(this.x - this.spawnX) > 900) this.destroy();
  }
}
