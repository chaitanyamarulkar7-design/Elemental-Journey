// PRD §11 — one JSON object in localStorage.
// Lives and the wallet are never saved. Assist runs write no records.
// Corrupt or missing data resets to defaults without an error screen.

const KEY = 'elements-five-trials-v1';

export const DEFAULT_KEYS = {
  left:  ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump:  ['ArrowUp', 'Space', 'KeyW'],
  fire:  ['ControlLeft', 'ControlRight', 'KeyX'],
  pause: ['KeyP', 'Escape'],
};

function defaults() {
  return {
    unlockedLevel: 0,                       // index into LEVEL_ORDER
    bestTime: [null, null, null, null, null],
    bestGemCount: [null, null, null, null, null],
    settings: {
      volumeMusic: 0.5,
      volumeSfx: 0.7,
      keys: JSON.parse(JSON.stringify(DEFAULT_KEYS)),
      reduceEffects: false,
      assist: false,
    },
  };
}

let cache = null;

function sanitise(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const out = d;
  if (Number.isInteger(raw.unlockedLevel)) {
    out.unlockedLevel = Math.max(0, Math.min(4, raw.unlockedLevel));
  }
  if (Array.isArray(raw.bestTime)) {
    for (let i = 0; i < 5; i++) {
      const v = raw.bestTime[i];
      out.bestTime[i] = typeof v === 'number' && isFinite(v) && v > 0 ? v : null;
    }
  }
  if (Array.isArray(raw.bestGemCount)) {
    for (let i = 0; i < 5; i++) {
      const v = raw.bestGemCount[i];
      out.bestGemCount[i] = Number.isInteger(v) && v >= 0 ? v : null;
    }
  }
  const s = raw.settings;
  if (s && typeof s === 'object') {
    if (typeof s.volumeMusic === 'number') out.settings.volumeMusic = clamp01(s.volumeMusic);
    if (typeof s.volumeSfx === 'number') out.settings.volumeSfx = clamp01(s.volumeSfx);
    out.settings.reduceEffects = !!s.reduceEffects;
    out.settings.assist = !!s.assist;
    if (s.keys && typeof s.keys === 'object') {
      for (const action of Object.keys(DEFAULT_KEYS)) {
        const list = s.keys[action];
        if (Array.isArray(list) && list.length && list.every(k => typeof k === 'string')) {
          out.settings.keys[action] = list.slice(0, 4);
        }
      }
    }
  }
  return out;
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

export const SaveManager = {
  load() {
    if (cache) return cache;
    let raw = null;
    try {
      const text = localStorage.getItem(KEY);
      if (text) raw = JSON.parse(text);
    } catch (e) {
      raw = null;
    }
    cache = sanitise(raw);
    return cache;
  },

  save() {
    if (!cache) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch (e) {
      // Private mode or a full quota: play on without records.
    }
  },

  get settings() { return this.load().settings; },

  unlock(levelIndex) {
    const d = this.load();
    if (levelIndex > d.unlockedLevel) {
      d.unlockedLevel = Math.min(4, levelIndex);
      this.save();
    }
  },

  // Records are skipped entirely while Assist Mode is on (PRD §10).
  recordRun(levelIndex, timeSeconds, gemCount, assistOn) {
    if (assistOn) return { newTime: false, newGems: false };
    const d = this.load();
    let newTime = false, newGems = false;
    if (d.bestTime[levelIndex] == null || timeSeconds < d.bestTime[levelIndex]) {
      d.bestTime[levelIndex] = timeSeconds; newTime = true;
    }
    if (d.bestGemCount[levelIndex] == null || gemCount > d.bestGemCount[levelIndex]) {
      d.bestGemCount[levelIndex] = gemCount; newGems = true;
    }
    this.save();
    return { newTime, newGems };
  },

  reset() {
    cache = defaults();
    this.save();
  },
};
