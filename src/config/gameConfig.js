// PRD §1, §5, §7, §10 — tuning values that are not physics.

export const GAME = {
  livesStart: 3,
  livesMax: 9,
  lifeThreshold: 100,     // gems per extra life (PRD §5)
  checkpointCost: 0,      // MVP is free (PRD §7). Set to 10 for the STRETCH variant.
  assistTimeScale: 0.75,  // PRD §10
  dropLifetime: 8.0,      // s before an enemy drop vanishes
  dropBlinkAt: 6.0,       // s before it starts blinking
  deathFreeze: 0.4,       // s of frozen input on death
  deathFade: 0.5,         // s fade out
  cameraLerp: 0.12,
  cameraDeadzoneFrom: 0.35,
  cameraDeadzoneTo: 0.50,
  cameraLookAhead: 64,
};

export const LEVEL_ORDER = ['trial', 'earth', 'water', 'air', 'fire'];

export const LEVEL_TITLES = {
  trial: 'TRIAL',
  earth: 'EARTH',
  water: 'WATER',
  air: 'AIR',
  fire: 'FIRE',
};

// Palettes. Every hazard also has a distinct shape and motion (PRD §8),
// so nothing here is load-bearing for readability — it is mood only.
export const THEMES = {
  trial: {
    skyTop: 0x2a2233, skyBottom: 0x6b5a48,
    far: 0x3b3040, near: 0x554438,
    groundTop: 0xc9a86a, groundBody: 0x8a6f42, groundDark: 0x5d4a2c,
    oneway: 0xd8bc84, block: 0x7d6440,
    accent: 0xffd98a, particle: 0xe8d2a0, gate: 0xffe6a8,
  },
  earth: {
    skyTop: 0x14100e, skyBottom: 0x33291f,
    far: 0x241d19, near: 0x3a2f24,
    groundTop: 0x6f8a4a, groundBody: 0x5b4632, groundDark: 0x3a2c1f,
    oneway: 0x7d6246, block: 0x4a3a29,
    accent: 0x9ad167, particle: 0xa8b98a, gate: 0xbfe38a,
  },
  water: {
    skyTop: 0x0b2740, skyBottom: 0x1b5b6e,
    far: 0x12384f, near: 0x1b5061,
    groundTop: 0x4fbfa8, groundBody: 0x2d6b70, groundDark: 0x1c4450,
    oneway: 0x63cfc0, block: 0x27585f,
    accent: 0x7ff0dd, particle: 0xa6f0ff, gate: 0x9ef7e8,
  },
  air: {
    skyTop: 0x7fb6e0, skyBottom: 0xd6ecf7,
    far: 0xa9d2ea, near: 0xc4e2f2,
    groundTop: 0xe8eef5, groundBody: 0x9aa7bb, groundDark: 0x6f7c90,
    oneway: 0xf2f6fb, block: 0x8896aa,
    accent: 0xffffff, particle: 0xffffff, gate: 0xdff0ff,
  },
  fire: {
    skyTop: 0x1a0708, skyBottom: 0x4a1410,
    far: 0x2a0c0c, near: 0x3d1210,
    groundTop: 0x4b3a3a, groundBody: 0x2e2222, groundDark: 0x1a1212,
    oneway: 0x5c4442, block: 0x2a1e1d,
    accent: 0xff7a35, particle: 0xffae5c, gate: 0xffc27a,
  },
};

// Enemy skin names per theme (PRD §6). Purely cosmetic naming + shape tweaks.
export const ENEMY_SKINS = {
  trial: { walker: 'stone beetle' },
  earth: { walker: 'mossback', jumper: 'rock hopper' },
  water: { walker: 'shell crab', jumper: 'leaping fish', flyer: 'jelly drifter' },
  air:   { walker: 'cloud puff', flyer: 'kite bird' },
  fire:  { walker: 'ember hound', flyer: 'cinder wisp', spitter: 'magma turret' },
};

export const GEM_TIERS = {
  base: { value: 1, key: 'gem1', color: 0xd9e6f2 },
  two:  { value: 2, key: 'gem2', color: 0x6fd3ff },
  three:{ value: 3, key: 'gem3', color: 0xffd34d },
};

export const DEBUG_ENABLED =
  typeof location !== 'undefined' &&
  (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ||
   location.protocol === 'file:' ||
   new URLSearchParams(location.search).has('debug'));
