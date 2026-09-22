// PRD §3 — every physics number in the game lives here.
// No gameplay file may hard-code a physics value.

export const TILE = 32;
export const VIEW_W = 960;
export const VIEW_H = 540;
export const ROWS = 17;

export const PHYSICS = {
  // Player body (PRD §3)
  playerW: 20,
  playerH: 40,
  spriteW: 32,
  spriteH: 48,

  runSpeed: 220,          // px/s max
  accelGround: 1400,      // px/s^2
  decelGround: 1600,      // px/s^2
  airControl: 0.80,       // fraction of ground acceleration
  gravity: 1800,          // px/s^2
  jumpVelocity: 770,      // px/s  -> peak = v^2 / 2g ~= 165 px
  earlyReleaseCut: 0.45,  // vy *= this when jump released while rising
  maxFall: 900,           // px/s
  coyoteTime: 0.10,       // s
  jumpBuffer: 0.10,       // s
  respawnInvuln: 1.5,     // s
  cornerForgiveness: 6,   // px of head-corner nudge

  // Shooting (PRD §5)
  bulletSpeed: 600,       // px/s
  bulletRange: 620,       // px
  bulletCooldown: 0.25,   // s
  maxBullets: 3,
  bulletCost: 1,

  // Lifts: bubble column + updraft share numbers (PRD §8)
  liftAccel: 2600,        // px/s^2 upward
  liftMaxSpeed: 320,      // px/s upward cap

  // Wind zone (PRD §8)
  windPush: 90,           // px/s added horizontally
  windWalkAgainst: 130,   // px/s the player can still make against it

  // Enemies (PRD §6)
  walkerSpeed: 60,
  walkerSpeedFire: 80,
  jumperSpeed: 70,
  jumperHopVelocity: 784, // ~96 px hop apex under gravity 1800
  jumperInterval: 1.6,    // s between hops
  jumperSquat: 0.3,       // s tell before a hop
  flyerSpeed: 70,
  spitterInterval: 2.5,   // s between shots
  spitterGlow: 0.6,       // s tell before firing
  spitterProjectile: 180, // px/s
  enemyActivationPad: 160,// px beyond camera view before an enemy wakes
  enemyHitboxInset: 4,    // px inset on every side

  // Hazards (PRD §8)
  moverSpeed: 64,
  moverPause: 0.5,
  fallingRockTriggerTiles: 3,
  fallingRockWarn: 0.7,
  crumbleShake: 0.8,
  crumbleRegrow: 3.0,
  tideLow: 3.0,
  tideRise: 1.5,
  tideHigh: 3.0,
  tideFall: 1.5,
  firePillarOff: 2.0,
  firePillarGlow: 0.6,
  firePillarErupt: 1.0,
  firePillarTiles: 3,
  risingLavaSpeed: 16,    // px/s
  risingLavaWarn: 3.0,    // s of banner + rumble

  // World geometry (PRD §4)
  deathLineY: 560,
  groundRow: 15,
  layer2Row: 11,
  layer3Row: 7,
};

// Derived, for the debug overlay and the load-time reachability check (PRD §3).
export const JUMP_GEOMETRY = {
  peakHeight: (PHYSICS.jumpVelocity ** 2) / (2 * PHYSICS.gravity), // ~= 164.7 px
  flatGapTiles: 4,
  upGapTiles: 3,
  downGapTiles: 5,
};

export const LAYER_Y = {
  1: (PHYSICS.groundRow) * TILE,  // 480
  2: (PHYSICS.layer2Row) * TILE,  // 352
  3: (PHYSICS.layer3Row) * TILE,  // 224
};
