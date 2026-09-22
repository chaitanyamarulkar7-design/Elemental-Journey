// The level scene: PRD §3-§10 assembled.

import { PHYSICS, TILE, VIEW_W, VIEW_H } from '../config/physicsConfig.js';
import { GAME, THEMES, DEBUG_ENABLED, LEVEL_ORDER } from '../config/gameConfig.js';
import { LEVELS } from '../levels/index.js';
import { buildWorld, rectOverlap } from '../systems/LevelLoader.js';
import { InputManager } from '../systems/InputManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { GameState, State, RunState, RespawnSnapshot } from '../systems/RunState.js';
import { DebugOverlay } from '../systems/DebugOverlay.js';
import { Hud } from '../systems/Hud.js';
import { Menu } from '../systems/Menu.js';
import { Player } from '../entities/Player.js';
import { Enemy, EnemyShot } from '../entities/Enemy.js';
import { Gem, DropGem, Bullet } from '../entities/Pickups.js';
import {
  CrumbleLedge, MovingPlatform, FallingRock, FirePillar,
  Tide, RisingLava, Checkpoint, ElementalGate,
} from '../entities/Hazards.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.levelKey = (data && data.levelKey) || RunState.levelKey;
    this.levelIndex = LEVEL_ORDER.indexOf(this.levelKey);
  }

  create() {
    const settings = SaveManager.settings;
    this.reduceEffects = settings.reduceEffects;
    this.assist = RunState.assist;

    const level = LEVELS[this.levelKey];
    this.level = level;
    this.world = buildWorld(this, level, this.levelKey);
    const W = this.world;

    this.physics.world.gravity.y = PHYSICS.gravity;
    this.physics.world.setBounds(0, 0, W.worldW, W.worldH + 400);
    this.physics.world.timeScale = this.assist ? 1 / GAME.assistTimeScale : 1;
    this.tweens.timeScale = this.assist ? GAME.assistTimeScale : 1;

    // ---- player ------------------------------------------------------
    this.player = new Player(this, W.start.col * TILE + TILE / 2, (W.start.row + 1) * TILE);

    // ---- groups ------------------------------------------------------
    this.bullets = this.add.group({ runChildUpdate: false });
    this.enemyShots = this.add.group();
    this.drops = this.add.group();
    this.gemGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.gemById = new Map();
    for (const def of W.gemDefs) {
      const gem = new Gem(this, def.col, def.row, def.tier);
      this.gemGroup.add(gem);
      this.gemById.set(gem.gemId, gem);
    }

    this.enemies = [];
    level.enemies.forEach((def, i) => {
      this.enemies.push(new Enemy(this, def, i, W.theme));
    });

    this.crumbles = W.crumbles.map(c => new CrumbleLedge(this, c.col, c.row, W.theme, c.runId));
    this.movers = (level.movers || []).map(def => new MovingPlatform(this, def, W.theme));

    this.rocks = [];
    this.pillars = [];
    this.tides = [];
    this.risingLava = null;
    for (const h of level.hazards || []) {
      if (h.type === 'fallingRock') this.rocks.push(new FallingRock(this, h));
      else if (h.type === 'firePillar') this.pillars.push(new FirePillar(this, h));
      else if (h.type === 'tide') this.tides.push(new Tide(this, h, W.theme));
      else if (h.type === 'risingLava') this.risingLava = new RisingLava(this, h, W.worldW);
    }

    this.checkpoints = (level.checkpoints || []).map((cp, i) => new Checkpoint(this, cp, i, W.theme));
    this.gate = new ElementalGate(this, level.gate, W.theme);

    this.setupColliders();

    // ---- camera (PRD §10) --------------------------------------------
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W.worldW, W.worldH);
    cam.startFollow(this.player, true, GAME.cameraLerp, GAME.cameraLerp);
    cam.setDeadzone(VIEW_W * (GAME.cameraDeadzoneTo - GAME.cameraDeadzoneFrom), VIEW_H);
    cam.setFollowOffset(VIEW_W * 0.06, -30);
    this.camLeftLimit = 0;

    // ---- run bookkeeping ---------------------------------------------
    this.collected = new Set();
    this.killed = new Set();
    this.lit = new Set();
    this.gemsCollectedValue = 0;
    this.enemiesDefeated = 0;
    this.levelTime = 0;
    this.deathTimer = 0;
    this.playerMover = null;

    this.snapshot = RespawnSnapshot.from(
      this.player.x, this.player.y, RunState, this.collected, this.killed, this.lit);

    this.hud = new Hud(this, level.name, this.assist);
    this.debug = new DebugOverlay(this);
    this.particles = this.add.particles(0, 0, 'spark', {
      lifespan: 420, speed: { min: 40, max: 160 }, scale: { start: 1, end: 0 },
      emitting: false, blendMode: 'ADD',
    }).setDepth(70);

    this.ambient = this.makeAmbient(W.theme);
    this.banner = null;
    this.pauseMenu = null;

    this.fade = this.add.graphics().setScrollFactor(0).setDepth(950);
    this.cameras.main.fadeIn(280, 0, 0, 0);

    AudioManager.startMusic(W.theme);
    GameState.set(State.PLAYING);
    InputManager.suppressHeld();

    // Each scene owns its own Arcade world and tween manager, so there is
    // nothing to restore here beyond the audio.
    this.events.on('shutdown', () => AudioManager.stopMusic());
  }

  // ------------------------------------------------------------ colliders
  setupColliders() {
    const W = this.world;
    const p = this.player;

    const fromAbove = (player, plat) => {
      const pb = player.body;
      const top = plat.body ? plat.body.top : plat.y;
      return pb.velocity.y >= 0 && pb.prev.y + pb.height <= top + 8;
    };

    this.physics.add.collider(p, W.solids);
    this.physics.add.collider(p, W.oneWays, null, fromAbove, this);

    this.physics.add.collider(p, this.crumbles, (player, ledge) => {
      if (player.body.touching.down) {
        for (const c of this.crumbles) if (c.runId === ledge.runId) c.touchedByPlayer();
      }
    }, fromAbove, this);

    this.physics.add.collider(p, this.movers, (player, mover) => {
      if (player.body.touching.down) this.playerMover = mover;
    }, fromAbove, this);

    for (const e of this.enemies) {
      if (e.kind === 'walker' || e.kind === 'jumper') {
        this.physics.add.collider(e, W.solids);
        this.physics.add.collider(e, W.oneWays, null, (enemy, plat) =>
          enemy.body.velocity.y >= 0 && enemy.body.prev.y + enemy.body.height <= plat.body.top + 8);
      }
    }

    // Landing on an enemy kills the player, not the enemy (PRD §6).
    this.physics.add.overlap(p, this.enemies, (player, enemy) => {
      if (enemy.isAlive()) this.killPlayer('enemy');
    });
    this.physics.add.overlap(p, this.enemyShots, () => this.killPlayer('projectile'));

    this.physics.add.overlap(p, this.gemGroup, (player, gem) => this.collectGem(gem));
    this.physics.add.overlap(p, this.drops, (player, drop) => this.collectDrop(drop));

    this.physics.add.collider(this.drops, W.solids);
    this.physics.add.collider(this.drops, W.oneWays, null, (drop, plat) =>
      drop.body.velocity.y >= 0 && drop.body.prev.y + drop.body.height <= plat.body.top + 8);

    this.physics.add.overlap(p, this.checkpoints, (player, cp) => this.touchCheckpoint(cp));
    this.physics.add.overlap(p, this.gate, () => this.completeLevel());

    this.physics.add.collider(this.bullets, W.solids, (bullet) => this.popBullet(bullet));
    this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
      if (!enemy.isAlive()) return;
      this.popBullet(bullet);
      this.killEnemy(enemy);
    });
    this.physics.add.collider(this.enemyShots, W.solids, (shot) => shot.destroy());

    for (const rock of this.rocks) {
      this.physics.add.collider(rock, W.solids, () => this.shatterRock(rock));
      this.physics.add.collider(rock, W.oneWays, () => this.shatterRock(rock));
      this.physics.add.overlap(p, rock, () => {
        if (rock.state === 'falling') this.killPlayer('rock');
      });
    }
  }

  makeAmbient(theme) {
    const conf = {
      trial: { tint: 0xe8d2a0, speedY: { min: 6, max: 20 }, quantity: 1, freq: 340 },
      earth: { tint: 0xa8b98a, speedY: { min: -12, max: -30 }, quantity: 1, freq: 300 },
      water: { tint: 0xa6f0ff, speedY: { min: -40, max: -90 }, quantity: 1, freq: 180 },
      air: { tint: 0xffffff, speedY: { min: -8, max: -24 }, quantity: 1, freq: 260 },
      fire: { tint: 0xffae5c, speedY: { min: -60, max: -120 }, quantity: 2, freq: 120 },
    }[theme];
    if (this.reduceEffects) return null;
    return this.add.particles(0, 0, 'spark', {
      x: { min: 0, max: VIEW_W },
      y: { min: 0, max: VIEW_H },
      lifespan: 2600,
      speedY: conf.speedY,
      speedX: { min: -12, max: 12 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: conf.tint,
      frequency: conf.freq,
      quantity: conf.quantity,
    }).setScrollFactor(0).setDepth(5);
  }

  // --------------------------------------------------------------- update
  update(time, delta) {
    const raw = Math.min(delta, 50) / 1000;
    const dt = this.assist ? raw * GAME.assistTimeScale : raw;
    const input = InputManager;

    if (DEBUG_ENABLED) this.handleDebugKeys();

    if (GameState.is(State.PAUSED)) {
      if (this.pauseMenu) this.pauseMenu.update(input);
      if (input.justPressed('pause')) this.resumeGame();
      input.flush();
      return;
    }

    if (GameState.is(State.PLAYER_DIED)) {
      this.deathTimer -= raw;
      this.updateWorldVisuals(dt);
      if (this.deathTimer <= 0) this.resolveDeath();
      input.flush();
      return;
    }

    if (!GameState.is(State.PLAYING)) { input.flush(); return; }

    if (input.justPressed('pause')) { this.pauseGame(); input.flush(); return; }

    this.levelTime += dt;

    // ---- environment the player is standing in -----------------------
    const pb = this.player.body;
    let wind = 0;
    let lift = false;
    for (const r of this.world.windRects) if (rectOverlap(pb, r)) wind += PHYSICS.windPush * r.dir;
    for (const r of this.world.liftRects) if (rectOverlap(pb, r)) lift = true;

    this.player.update(dt, input, {
      wind, lift,
      solidAt: this.world.solidAt,
      reduceEffects: this.reduceEffects,
    });

    if (input.justPressed('fire')) this.tryFire();

    // A moving platform carries whoever is standing on it.
    if (this.playerMover) {
      this.playerMover.update(dt);
      this.player.x += this.playerMover.dx;
      this.player.y += this.playerMover.dy;
      this.player.body.updateFromGameObject();
    }
    for (const m of this.movers) if (m !== this.playerMover) m.update(dt);
    this.playerMover = null;

    this.updateWorldVisuals(dt);

    const ctx = {
      camera: this.cameras.main,
      player: this.player,
      standableAt: this.world.standableAt,
      spawnEnemyShot: (x, y, dir) => this.enemyShots.add(new EnemyShot(this, x, y, dir)),
    };
    for (const e of this.enemies) e.update(dt, ctx);
    for (const s of this.enemyShots.getChildren()) s.update(dt);
    for (const b of this.bullets.getChildren()) b.update();
    for (const g of this.gemGroup.getChildren()) g.update(dt);
    for (const d of this.drops.getChildren()) d.update(dt);
    for (const c of this.crumbles) c.update(dt);
    for (const rock of this.rocks) {
      rock.update(dt, this.player, (x, y) => this.dust(x, y));
    }

    this.checkLethal();
    this.clampPlayerToCamera();
    this.updateParallax();

    this.hud.update(RunState.lives, RunState.gems, this.levelTime);
    this.debug.update(raw, {
      player: this.player, gems: RunState.gems, lives: RunState.lives,
      worldW: this.world.worldW, levelTime: this.levelTime,
    });
    input.flush();
  }

  updateWorldVisuals(dt) {
    for (const p of this.pillars) p.update(dt);
    for (const t of this.tides) t.update(dt);
    if (this.risingLava) {
      this.risingLava.update(dt, this.player, () => this.lavaWarning());
    }
  }

  updateParallax() {
    const cam = this.cameras.main;
    this.world.far.tilePositionX = cam.scrollX * 0.2;
    this.world.near.tilePositionX = cam.scrollX * 0.5;
  }

  clampPlayerToCamera() {
    const cam = this.cameras.main;
    const minX = Math.max(12, cam.scrollX + 14);
    if (this.player.x < minX) {
      this.player.x = minX;
      if (this.player.body.velocity.x < 0) this.player.body.setVelocityX(0);
      this.player.body.updateFromGameObject();
    }
    const maxX = this.world.worldW - 14;
    if (this.player.x > maxX) {
      this.player.x = maxX;
      this.player.body.updateFromGameObject();
    }
  }

  // ------------------------------------------------------------- hazards
  checkLethal() {
    const p = this.player;
    if (p.dead || p.invuln > 0) {
      if (p.y > PHYSICS.deathLineY && !p.dead) this.killPlayer('pit');
      return;
    }
    if (p.y > PHYSICS.deathLineY) { this.killPlayer('pit'); return; }

    const b = p.body;
    for (const r of this.world.spikeRects) if (rectOverlap(b, r)) return this.killPlayer('spikes');
    for (const r of this.world.liquidRects) if (rectOverlap(b, r)) return this.killPlayer('liquid');
    for (const t of this.tides) {
      const r = t.lethalRect;
      if (r && rectOverlap(b, r)) return this.killPlayer('tide');
    }
    for (const pil of this.pillars) {
      const r = pil.lethalRect;
      if (r && rectOverlap(b, r)) return this.killPlayer('pillar');
    }
    if (this.risingLava && this.risingLava.active) {
      const r = this.risingLava.lethalRect;
      if (r && rectOverlap(b, r)) return this.killPlayer('lava');
    }
  }

  lavaWarning() {
    AudioManager.lavaRumble();
    if (!this.reduceEffects) this.cameras.main.shake(700, 0.006);
    this.cameras.main.flash(180, 120, 20, 0);
    const bg = this.add.graphics().setScrollFactor(0).setDepth(880);
    bg.fillStyle(0x3a0d06, 0.85);
    bg.fillRect(0, 210, VIEW_W, 58);
    const text = this.add.text(VIEW_W / 2, 228, 'THE LAVA IS RISING — CLIMB', {
      fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '22px', color: '#ffc27a',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(881);
    this.time.delayedCall(2600, () => { bg.destroy(); text.destroy(); });
  }

  shatterRock(rock) {
    rock.shatter((x, y) => this.burst(x, y, 0x8b7d70, 10));
    if (!this.reduceEffects) this.cameras.main.shake(90, 0.003);
  }

  // ------------------------------------------------------ gems and firing
  collectGem(gem) {
    if (!gem.active || this.collected.has(gem.gemId)) return;
    this.collected.add(gem.gemId);
    gem.disableBody(true, true);
    this.gemsCollectedValue += gem.value;
    this.award(gem.value, gem.x, gem.y, gem.tier);
  }

  collectDrop(drop) {
    if (!drop.active) return;
    const v = drop.value;
    const x = drop.x, y = drop.y;
    drop.destroy();
    this.award(v, x, y, v >= 2 ? 'two' : 'base');
  }

  award(value, x, y, tier) {
    const lives = RunState.addGems(value);
    AudioManager.gem(tier);
    this.popup(x, y, `+${value}`);
    if (!this.reduceEffects) this.burst(x, y, 0x9fe8ff, 6);
    if (lives > 0) {
      AudioManager.extraLife();
      this.hud.extraLifeFlash();
      this.popup(this.player.x, this.player.y - 56, '1UP');
    }
  }

  tryFire() {
    const p = this.player;
    if (!p.canFire()) return;
    if (this.bullets.countActive(true) >= PHYSICS.maxBullets) return;
    if (!RunState.spendForBullet(PHYSICS.bulletCost)) {
      AudioManager.emptyClick();
      p.markFired();
      return;
    }
    p.markFired();
    const bullet = new Bullet(this, p.x + p.facing * 14, p.y - 26, p.facing);
    this.bullets.add(bullet);
    AudioManager.fire();
  }

  popBullet(bullet) {
    if (!bullet.active) return;
    this.burst(bullet.x, bullet.y, 0xffe27a, 4);
    bullet.destroy();
  }

  killEnemy(enemy) {
    if (!enemy.kill(this)) return;
    this.killed.add(enemy.enemyId);
    this.enemiesDefeated += 1;
    AudioManager.enemyDeath();
    this.burst(enemy.x, enemy.y - 14, 0xffffff, 12);
    if (!this.reduceEffects) this.cameras.main.shake(100, 0.002);
    const value = enemy.kind === 'spitter' ? 2 : 1;
    this.drops.add(new DropGem(this, enemy.x, enemy.y - 18, value));
  }

  touchCheckpoint(cp) {
    if (cp.lit) return;
    if (GAME.checkpointCost > 0) {
      if (RunState.gems < GAME.checkpointCost) return;
      RunState.gems -= GAME.checkpointCost;
    }
    cp.light();
    this.lit.add(cp.cpIndex);
    AudioManager.checkpoint();
    this.burst(cp.x, cp.y - 30, 0xfff6d0, 14);
    this.snapshot = RespawnSnapshot.from(
      cp.x, cp.y, RunState, this.collected, this.killed, this.lit);
    // The camera never scrolls back past the active checkpoint (PRD §10).
    this.camLeftLimit = Math.max(this.camLeftLimit, cp.x - VIEW_W * 0.5);
    this.cameras.main.setBounds(
      this.camLeftLimit, 0, this.world.worldW - this.camLeftLimit, this.world.worldH);
    this.popup(cp.x, cp.y - 64, 'CHECKPOINT');
  }

  // ---------------------------------------------------------------- death
  killPlayer(cause) {
    if (!GameState.is(State.PLAYING)) return;
    if (this.player.invuln > 0 || this.player.dead) return;
    GameState.set(State.PLAYER_DIED);
    RunState.stats.deaths += 1;
    this.player.dead = true;
    this.player.freeze(true);
    this.player.body.setAllowGravity(false);
    this.player.setTint(0xff6b6b);
    AudioManager.playerDeath();
    if (!this.reduceEffects) {
      this.cameras.main.shake(200, 0.008);
      this.burst(this.player.x, this.player.y - 20, 0xff8a8a, 16);
    }
    this.bullets.clear(true, true);
    this.enemyShots.clear(true, true);
    this.deathTimer = GAME.deathFreeze + GAME.deathFade;
    this.cameras.main.fadeOut(GAME.deathFade * 1000, 0, 0, 0);
  }

  resolveDeath() {
    const S = this.snapshot;

    if (!RunState.unlimitedLives) {
      RunState.lives = S.lives - 1;
      if (RunState.lives <= 0) {
        RunState.lives = 0;
        AudioManager.stopMusic();
        AudioManager.gameOver();
        GameState.set(State.GAME_OVER);
        this.scene.start('GameOver', {
          levelKey: this.levelKey,
          time: this.levelTime,
          gems: this.gemsCollectedValue,
          total: this.level.totalGemValue,
        });
        return;
      }
    }

    // Roll the level back to the snapshot, then keep counting down.
    RunState.gems = S.gems;
    for (const [id, gem] of this.gemById) {
      const taken = S.collectedGems.has(id);
      if (taken) { if (gem.active) gem.disableBody(true, true); }
      else if (!gem.active) gem.enableBody(true, gem.x, gem.baseY, true, true);
    }
    this.collected = new Set(S.collectedGems);
    this.gemsCollectedValue = 0;
    for (const [id, gem] of this.gemById) {
      if (this.collected.has(id)) this.gemsCollectedValue += gem.value;
    }

    this.enemiesDefeated = 0;
    for (const e of this.enemies) {
      if (S.killedEnemies.has(e.enemyId)) { e.kill(this); this.enemiesDefeated += 1; }
      else e.resetToStart();
    }
    this.killed = new Set(S.killedEnemies);

    for (const cp of this.checkpoints) cp.setLit(S.litCheckpoints.has(cp.cpIndex));
    this.lit = new Set(S.litCheckpoints);

    this.drops.clear(true, true);
    this.bullets.clear(true, true);
    this.enemyShots.clear(true, true);
    for (const c of this.crumbles) c.resetHazard();
    for (const m of this.movers) m.resetHazard();
    for (const r of this.rocks) r.resetHazard();
    for (const p of this.pillars) p.resetHazard();
    for (const t of this.tides) t.resetHazard();
    if (this.risingLava) this.risingLava.resetHazard();
    this.playerMover = null;

    S.lives = RunState.lives;
    RunState.payOutLives();

    this.player.clearTint();
    this.player.body.setAllowGravity(true);
    this.player.respawnAt(S.x, S.y);
    this.cameras.main.fadeIn(260, 0, 0, 0);
    GameState.set(State.PLAYING);
    InputManager.suppressHeld();
  }

  // ------------------------------------------------------------ level end
  completeLevel() {
    if (!GameState.set(State.LEVEL_COMPLETE)) return;
    AudioManager.stopMusic();
    AudioManager.gate();
    SaveManager.unlock(Math.min(4, this.levelIndex + 1));
    const record = SaveManager.recordRun(
      this.levelIndex, this.levelTime, this.gemsCollectedValue, this.assist);
    RunState.stats.totalTime += this.levelTime;
    RunState.stats.totalGems += this.gemsCollectedValue;
    RunState.stats.enemiesDefeated += this.enemiesDefeated;
    this.scene.start('LevelComplete', {
      levelKey: this.levelKey,
      levelIndex: this.levelIndex,
      time: this.levelTime,
      gems: this.gemsCollectedValue,
      total: this.level.totalGemValue,
      enemies: this.enemiesDefeated,
      lives: RunState.lives,
      record,
    });
  }

  // ---------------------------------------------------------------- pause
  pauseGame() {
    if (!GameState.set(State.PAUSED)) return;
    AudioManager.stopMusic();
    this.physics.world.pause();
    const shade = this.add.graphics().setScrollFactor(0).setDepth(890);
    shade.fillStyle(0x07060c, 0.78);
    shade.fillRect(0, 0, VIEW_W, VIEW_H);
    const title = this.add.text(VIEW_W / 2, 120, 'PAUSED', {
      fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '34px', color: '#ffe6a8',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(891);

    this.pauseMenu = new Menu(this, VIEW_W / 2 - 110, 210, [
      { label: 'Resume', onPick: () => this.resumeGame() },
      { label: 'Restart Level', onPick: () => { RunState.restartLevel(); this.restart(); } },
      { label: 'Settings', onPick: () => { this.cleanupPause(); this.scene.start('Settings', { from: 'Game', levelKey: this.levelKey }); } },
      { label: 'Main Menu', onPick: () => { this.cleanupPause(); AudioManager.stopMusic(); this.scene.start('Menu'); } },
    ], { depth: 892, width: 220 });
    this.pauseProps = [shade, title];
    InputManager.suppressHeld();
  }

  cleanupPause() {
    if (this.pauseMenu) { this.pauseMenu.destroy(); this.pauseMenu = null; }
    if (this.pauseProps) { for (const o of this.pauseProps) o.destroy(); this.pauseProps = null; }
    this.physics.world.resume();
  }

  resumeGame() {
    this.cleanupPause();
    GameState.set(State.PLAYING);
    AudioManager.startMusic(this.world.theme);
    InputManager.suppressHeld();
  }

  restart() {
    this.cleanupPause();
    AudioManager.stopMusic();
    GameState.set(State.MENU);
    this.scene.start('Game', { levelKey: this.levelKey });
  }

  // ----------------------------------------------------------- dev tools
  handleDebugKeys() {
    if (InputManager.codeJustPressed('F1')) this.debug.toggle();
    if (InputManager.codeJustPressed('F2')) {
      AudioManager.stopMusic();
      this.scene.start('TestRoom');
    }
    if (InputManager.codeJustPressed('F3')) {
      const next = this.checkpoints.find(c => !c.lit && c.x > this.player.x) ||
        { x: this.gate.x - 60, y: this.gate.y };
      this.player.respawnAt(next.x, next.y - 4);
    }
  }

  // -------------------------------------------------------------- effects
  burst(x, y, tint, count) {
    if (this.reduceEffects) return;
    this.particles.setParticleTint(tint);
    this.particles.emitParticleAt(x, y, count);
  }

  dust(x, y) {
    if (this.reduceEffects) return;
    if (Math.random() > 0.25) return;
    this.particles.setParticleTint(0xbbaa99);
    this.particles.emitParticleAt(x + Phaser.Math.Between(-8, 8), y, 1);
  }

  popup(x, y, label) {
    const t = this.add.text(x, y - 18, label, {
      fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5, 1).setDepth(80);
    this.tweens.add({
      targets: t, y: y - 46, alpha: 0, duration: 700, ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }
}
