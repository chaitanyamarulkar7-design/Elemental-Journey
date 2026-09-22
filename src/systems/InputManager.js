// PRD §2 — one input layer for the whole game.
//  * every game key calls preventDefault, so arrows and Space never scroll
//  * keys held when a state begins are ignored until released
//  * bindings come from save data; P and Esc can never be reassigned

import { SaveManager, DEFAULT_KEYS } from './SaveManager.js';

// Keys the browser must never act on while the game has focus.
const ALWAYS_SWALLOW = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab',
]);

export const LOCKED_ACTIONS = new Set(['pause']);

class Input {
  constructor() {
    this.down = new Set();
    this.edge = new Set();       // went down since the last frame flush
    this.ignored = new Set();    // held across a state change; dead until released
    this.bindings = DEFAULT_KEYS;
    this.attached = false;
    this.lastKeyCode = null;     // for the remapping screen
    this.captureNext = null;     // callback while remapping
  }

  attach() {
    if (this.attached) return;
    this.attached = true;
    this.refreshBindings();

    window.addEventListener('keydown', (e) => this.onKeyDown(e), { passive: false });
    window.addEventListener('keyup', (e) => this.onKeyUp(e), { passive: false });
    window.addEventListener('blur', () => { this.down.clear(); this.edge.clear(); this.ignored.clear(); });
    // Keep focus on the page so the player never has to click the canvas twice.
    window.addEventListener('mousedown', () => { window.focus(); });
  }

  refreshBindings() {
    const keys = SaveManager.settings.keys;
    this.bindings = { ...DEFAULT_KEYS, ...keys, pause: DEFAULT_KEYS.pause };
    this.bound = new Set();
    for (const list of Object.values(this.bindings)) for (const c of list) this.bound.add(c);
  }

  onKeyDown(e) {
    if (this.captureNext) {
      e.preventDefault();
      const cb = this.captureNext;
      this.captureNext = null;
      cb(e.code);
      return;
    }
    if (this.bound.has(e.code) || ALWAYS_SWALLOW.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (!this.down.has(e.code)) {
      this.down.add(e.code);
      if (!this.ignored.has(e.code)) this.edge.add(e.code);
    }
  }

  onKeyUp(e) {
    if (this.bound.has(e.code) || ALWAYS_SWALLOW.has(e.code)) e.preventDefault();
    this.down.delete(e.code);
    this.ignored.delete(e.code);
  }

  /** Any key currently held is dead until the player releases it (PRD §2). */
  suppressHeld() {
    for (const c of this.down) this.ignored.add(c);
    this.edge.clear();
  }

  isDown(action) {
    const list = this.bindings[action];
    if (!list) return false;
    for (const c of list) if (this.down.has(c) && !this.ignored.has(c)) return true;
    return false;
  }

  justPressed(action) {
    const list = this.bindings[action];
    if (!list) return false;
    for (const c of list) if (this.edge.has(c)) return true;
    return false;
  }

  codeJustPressed(code) { return this.edge.has(code); }
  anyJustPressed() { return this.edge.size > 0; }

  /** Called once at the end of every scene update. */
  flush() { this.edge.clear(); }

  /** Remapping: the next keydown is handed to cb instead of the game. */
  capture(cb) { this.captureNext = cb; }

  setBinding(action, code) {
    if (LOCKED_ACTIONS.has(action)) return false;
    const d = SaveManager.load();
    // A key can only drive one action at a time.
    for (const a of Object.keys(d.settings.keys)) {
      if (a === action) continue;
      d.settings.keys[a] = d.settings.keys[a].filter(c => c !== code);
      if (d.settings.keys[a].length === 0) d.settings.keys[a] = DEFAULT_KEYS[a].slice();
    }
    d.settings.keys[action] = [code];
    SaveManager.save();
    this.refreshBindings();
    return true;
  }

  resetBindings() {
    const d = SaveManager.load();
    d.settings.keys = JSON.parse(JSON.stringify(DEFAULT_KEYS));
    SaveManager.save();
    this.refreshBindings();
  }
}

export const InputManager = new Input();

export function prettyKey(code) {
  if (!code) return '—';
  return code
    .replace(/^Key/, '')
    .replace(/^Digit/, '')
    .replace('ArrowLeft', '←').replace('ArrowRight', '→')
    .replace('ArrowUp', '↑').replace('ArrowDown', '↓')
    .replace('ControlLeft', 'CTRL').replace('ControlRight', 'CTRL')
    .replace('ShiftLeft', 'SHIFT').replace('ShiftRight', 'SHIFT')
    .replace('Space', 'SPACE').replace('Escape', 'ESC')
    .toUpperCase();
}
