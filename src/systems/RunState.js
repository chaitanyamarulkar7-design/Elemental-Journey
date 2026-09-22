// PRD §7 — the run: one wallet, lives, the two snapshots and the state machine.

import { GAME, LEVEL_ORDER } from '../config/gameConfig.js';
import { SaveManager } from './SaveManager.js';

export const State = {
  BOOT: 'BOOT',
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  PLAYER_DIED: 'PLAYER_DIED',
  GAME_OVER: 'GAME_OVER',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  GAME_COMPLETE: 'GAME_COMPLETE',
};

/**
 * Every transition goes through set(), which ignores a repeat of the state it
 * is already in — so a gate touched twice can never complete a level twice.
 */
class StateMachine {
  constructor() {
    this.current = State.BOOT;
    this.listeners = [];
  }
  set(next) {
    if (next === this.current) return false;
    const prev = this.current;
    this.current = next;
    for (const fn of this.listeners) fn(next, prev);
    return true;
  }
  is(s) { return this.current === s; }
  onChange(fn) { this.listeners.push(fn); }
}

export const GameState = new StateMachine();

class Run {
  constructor() {
    this.reset();
  }

  reset() {
    this.lives = GAME.livesStart;
    this.gems = 0;
    this.levelIndex = 0;
    this.entry = { lives: GAME.livesStart, gems: 0 };
    this.assist = SaveManager.settings.assist;
    this.stats = { deaths: 0, totalTime: 0, totalGems: 0, enemiesDefeated: 0 };
    this.pendingLifeFx = false;
  }

  /** New Game: lives 3, gems 0, start at Trial (PRD §7). */
  newGame() {
    this.reset();
    this.assist = SaveManager.settings.assist;
    this.levelIndex = 0;
    this.takeEntrySnapshot();
  }

  /** Continue: highest unlocked level, lives 3, gems 0 (PRD §7). */
  continueGame() {
    this.reset();
    this.assist = SaveManager.settings.assist;
    this.levelIndex = SaveManager.load().unlockedLevel;
    this.takeEntrySnapshot();
  }

  /** Level Select for record runs — same rules as Continue. */
  startLevel(index) {
    this.reset();
    this.assist = SaveManager.settings.assist;
    this.levelIndex = index;
    this.takeEntrySnapshot();
  }

  takeEntrySnapshot() {
    this.entry = { lives: this.lives, gems: this.gems };
  }

  get levelKey() { return LEVEL_ORDER[this.levelIndex]; }
  get isLastLevel() { return this.levelIndex >= LEVEL_ORDER.length - 1; }

  // ---------------------------------------------------------- the wallet
  /**
   * Adds gems and pays out every extra life the wallet can afford.
   * Returns how many lives were awarded.
   */
  addGems(value) {
    this.gems += value;
    return this.payOutLives();
  }

  payOutLives() {
    let awarded = 0;
    while (this.gems >= GAME.lifeThreshold && this.lives < GAME.livesMax) {
      this.gems -= GAME.lifeThreshold;
      this.lives += 1;
      awarded += 1;
    }
    return awarded;
  }

  /** One bullet costs one gem. Returns false when the wallet is empty. */
  spendForBullet(cost) {
    if (this.gems < cost) return false;
    this.gems -= cost;
    return true;
  }

  // --------------------------------------------------------- level flow
  /** Completing a level carries current lives and gems into the next one. */
  advanceLevel() {
    this.levelIndex += 1;
    this.takeEntrySnapshot();
  }

  /** Game Over -> Retry Level: 3 lives, the level's entry gems (PRD §7). */
  retryLevel() {
    this.lives = GAME.livesStart;
    this.gems = this.entry.gems;
    this.entry = { lives: this.lives, gems: this.gems };
  }

  /** Pause -> Restart Level: restarting can never bank lives (PRD §7). */
  restartLevel() {
    this.gems = this.entry.gems;
    this.lives = Math.min(this.lives, this.entry.lives);
  }

  get unlimitedLives() { return this.assist; }
}

export const RunState = new Run();

/**
 * The respawn snapshot S (PRD §7). Death rolls the level back to it and then
 * subtracts one life, so nothing gained since S — gems, drops or extra lives —
 * survives a death.
 */
export class RespawnSnapshot {
  constructor(x, y, lives, gems) {
    this.x = x;
    this.y = y;
    this.lives = lives;
    this.gems = gems;
    this.collectedGems = new Set();
    this.killedEnemies = new Set();
    this.litCheckpoints = new Set();
  }

  static from(x, y, run, collected, killed, lit) {
    const s = new RespawnSnapshot(x, y, run.lives, run.gems);
    s.collectedGems = new Set(collected);
    s.killedEnemies = new Set(killed);
    s.litCheckpoints = new Set(lit);
    return s;
  }
}
