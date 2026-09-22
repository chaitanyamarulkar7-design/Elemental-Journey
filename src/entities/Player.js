// PRD §3 — the player. Every number comes from physicsConfig.js.

import { PHYSICS, TILE } from '../config/physicsConfig.js';
import { AudioManager } from '../systems/AudioManager.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player_idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(60);
    this.setOrigin(0.5, 1);

    const body = this.body;
    body.setSize(PHYSICS.playerW, PHYSICS.playerH);
    // The hitbox is centred at the feet inside the 32x48 sprite.
    body.setOffset((PHYSICS.spriteW - PHYSICS.playerW) / 2, PHYSICS.spriteH - PHYSICS.playerH);
    body.setMaxVelocity(1000, PHYSICS.maxFall);
    body.setGravityY(0); // world gravity supplies it

    this.facing = 1;
    this.coyote = 0;
    this.buffer = 0;
    this.jumpHeld = false;
    this.wasGrounded = false;
    this.invuln = 0;
    this.dead = false;
    this.frozen = false;
    this.fireCooldown = 0;
    this.lastVelY = 0;
    this.carryX = 0;      // horizontal carry from a moving platform
    this.env = { wind: 0, lift: false };
  }

  get grounded() {
    return this.body.blocked.down || this.body.touching.down || this.onMover;
  }

  freeze(on) {
    this.frozen = on;
    if (on) this.body.setVelocity(0, 0);
  }

  respawnAt(x, y) {
    this.dead = false;
    this.frozen = false;
    this.setPosition(x, y);
    this.body.reset(x, y);
    this.setAlpha(1);
    this.setVisible(true);
    this.invuln = PHYSICS.respawnInvuln;
    this.coyote = 0;
    this.buffer = 0;
    this.setScale(1, 1);
  }

  update(dt, input, opts) {
    if (this.dead) return;
    const body = this.body;
    const o = opts || {};
    const reduce = o.reduceEffects;

    if (this.invuln > 0) {
      this.invuln -= dt;
      // blink
      this.setAlpha(Math.floor(this.invuln * 14) % 2 === 0 ? 0.35 : 1);
      if (this.invuln <= 0) this.setAlpha(1);
    }

    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    if (this.frozen) {
      body.setVelocityX(0);
      this.setTexture('player_idle');
      return;
    }

    const grounded = this.grounded;

    // --- coyote time and jump buffering (PRD §3) ----------------------
    if (grounded) this.coyote = PHYSICS.coyoteTime;
    else if (this.coyote > 0) this.coyote -= dt;

    const jumpDown = input.isDown('jump');
    if (input.justPressed('jump')) this.buffer = PHYSICS.jumpBuffer;
    else if (this.buffer > 0) this.buffer -= dt;

    if (this.buffer > 0 && this.coyote > 0) {
      body.setVelocityY(-PHYSICS.jumpVelocity);
      this.buffer = 0;
      this.coyote = 0;
      this.jumpHeld = true;
      this.onMover = null;
      AudioManager.jump();
      if (!reduce) this.stretch();
    }

    // Variable height: releasing jump while rising cuts upward speed.
    if (this.jumpHeld && !jumpDown && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * PHYSICS.earlyReleaseCut);
      this.jumpHeld = false;
    }
    if (body.velocity.y >= 0) this.jumpHeld = false;

    // --- horizontal movement -----------------------------------------
    let dir = 0;
    if (input.isDown('left')) dir -= 1;
    if (input.isDown('right')) dir += 1;
    if (dir !== 0) this.facing = dir;

    const wind = o.wind || 0;
    const accel = (grounded ? PHYSICS.accelGround : PHYSICS.accelGround * PHYSICS.airControl);
    const decel = (grounded ? PHYSICS.decelGround : PHYSICS.decelGround * PHYSICS.airControl);

    // A wind zone shifts the reachable speed window. Walking into the wind
    // still makes headway (PRD §8).
    const targetBase = dir * PHYSICS.runSpeed;
    const target = targetBase + wind;
    let vx = body.velocity.x - this.carryX;

    if (dir !== 0) {
      const rate = (Math.sign(target - vx) === Math.sign(dir) || vx === 0) ? accel : decel;
      vx = approach(vx, target, rate * dt);
    } else {
      vx = approach(vx, wind, decel * dt);
    }
    const cap = PHYSICS.runSpeed + Math.abs(wind);
    vx = Math.max(-cap, Math.min(cap, vx));
    body.setVelocityX(vx + this.carryX);

    // --- lifts: bubble column and updraft share one rule (PRD §8) -----
    if (o.lift) {
      const v = body.velocity.y - PHYSICS.liftAccel * dt;
      body.setVelocityY(Math.max(v, -PHYSICS.liftMaxSpeed));
    }

    // --- corner forgiveness (PRD §3) ---------------------------------
    if (body.blocked.up && this.lastVelY < 0 && o.solidAt) {
      this.nudgeOffCorner(o.solidAt);
    }

    // --- landing feel -------------------------------------------------
    if (grounded && !this.wasGrounded) {
      AudioManager.land();
      if (!reduce) this.squash();
      if (o.onLand) o.onLand(this);
    }
    this.wasGrounded = grounded;

    // --- texture ------------------------------------------------------
    if (!grounded) this.setTexture('player_air');
    else if (Math.abs(vx) > 20) this.setTexture('player_run');
    else this.setTexture('player_idle');
    this.setFlipX(this.facing < 0);

    this.lastVelY = body.velocity.y;
  }

  /**
   * If the head clipped a platform corner by 6 px or less, slide the player
   * sideways past it instead of killing the jump.
   */
  nudgeOffCorner(solidAt) {
    const body = this.body;
    const headY = body.top - 1;
    const row = Math.floor(headY / TILE);
    const leftCol = Math.floor(body.left / TILE);
    const rightCol = Math.floor((body.right - 1) / TILE);
    if (leftCol === rightCol) return;

    const leftBlocked = solidAt(leftCol, row);
    const rightBlocked = solidAt(rightCol, row);
    if (leftBlocked === rightBlocked) return;

    if (leftBlocked) {
      const overlap = (leftCol + 1) * TILE - body.left;
      if (overlap > 0 && overlap <= PHYSICS.cornerForgiveness) {
        this.x += overlap + 1;
        body.setVelocityY(this.lastVelY);
      }
    } else {
      const overlap = body.right - rightCol * TILE;
      if (overlap > 0 && overlap <= PHYSICS.cornerForgiveness) {
        this.x -= overlap + 1;
        body.setVelocityY(this.lastVelY);
      }
    }
  }

  squash() {
    this.scene.tweens.killTweensOf(this);
    this.setScale(1.18, 0.82);
    this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 130, ease: 'Quad.easeOut' });
  }

  stretch() {
    this.scene.tweens.killTweensOf(this);
    this.setScale(0.84, 1.18);
    this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 160, ease: 'Quad.easeOut' });
  }

  canFire() { return this.fireCooldown <= 0 && !this.dead && !this.frozen; }
  markFired() { this.fireCooldown = PHYSICS.bulletCooldown; }
}

function approach(value, target, step) {
  if (value < target) return Math.min(value + step, target);
  if (value > target) return Math.max(value - step, target);
  return value;
}
