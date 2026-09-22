// PRD §5 — gems and bullets. One gem is one bullet; one hundred gems is a life.

import { PHYSICS, TILE } from '../config/physicsConfig.js';
import { GEM_TIERS } from '../config/gameConfig.js';
import { GAME } from '../config/gameConfig.js';

const TEX = { base: 'gem_base', two: 'gem_two', three: 'gem_three' };

/** A gem placed in the level data. Never respawns except through rollback. */
export class Gem extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, col, row, tier) {
    super(scene, col * TILE + TILE / 2, row * TILE + TILE / 2 + 4, TEX[tier]);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.gemId = `${row}:${col}`;
    this.tier = tier;
    this.value = GEM_TIERS[tier].value;
    this.setDepth(40);
    this.body.setAllowGravity(false);
    this.body.setSize(this.width - 2, this.height - 2);
    this.baseY = this.y;
    this.bob = Math.random() * Math.PI * 2;
    if (tier === 'three') this.setScale(1);
  }

  update(dt) {
    this.bob += dt * 3;
    this.y = this.baseY + Math.sin(this.bob) * 2.5;
    if (this.tier !== 'base') this.rotation = Math.sin(this.bob * 0.6) * 0.25;
  }
}

/**
 * An enemy drop: a physical pickup that falls, can be lost in a pit, blinks
 * after 6 s and vanishes at 8 s (PRD §5).
 */
export class DropGem extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, value) {
    super(scene, x, y, value >= 2 ? TEX.two : TEX.base);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(41);
    this.value = value;
    this.tier = value >= 2 ? 'two' : 'base';
    this.life = 0;
    this.body.setSize(this.width - 2, this.height - 2);
    this.body.setVelocity(Phaser.Math.Between(-40, 40), -220);
    this.body.setBounce(0.35, 0.35);
    this.body.setDragX(90);
  }

  update(dt) {
    this.life += dt;
    if (this.life > GAME.dropBlinkAt) {
      this.setAlpha(Math.floor(this.life * 10) % 2 === 0 ? 0.25 : 1);
    }
    if (this.life > GAME.dropLifetime) this.destroy();
  }
}

/** One gem spent, one bullet fired. Stops at the first enemy or solid. */
export class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, dir) {
    super(scene, x, y, 'bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(58);
    this.body.setAllowGravity(false);
    this.body.setSize(12, 6);
    this.body.setVelocityX(PHYSICS.bulletSpeed * dir);
    this.setFlipX(dir < 0);
    this.spawnX = x;
  }

  update() {
    if (Math.abs(this.x - this.spawnX) >= PHYSICS.bulletRange) this.destroy();
  }
}
