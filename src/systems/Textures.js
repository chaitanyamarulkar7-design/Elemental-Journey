// PRD §11 — all art is drawn procedurally into Phaser textures at boot.
// No external asset files anywhere in the project.

import { THEMES } from '../config/gameConfig.js';

const T = 32;

function tex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function outlineRect(g, x, y, w, h, fill, line) {
  g.fillStyle(line, 1);
  g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle(fill, 1);
  g.fillRect(x, y, w, h);
}

// ---------------------------------------------------------------- player
function drawPlayer(g, frame) {
  const OUT = 0x14121c;
  const ROBE = 0x3f6fd8;
  const ROBE_D = 0x2a4c9c;
  const TRIM = 0xffd76a;
  const SKIN = 0xf0c9a0;
  const lean = frame === 'run' ? 1 : 0;

  // silhouette pass (1 px dark outline: PRD §10)
  g.fillStyle(OUT, 1);
  g.fillRect(8 + lean, 3, 16, 14);      // head block
  g.fillRect(6, 16, 20, 20);            // torso
  g.fillRect(7, 35, 8, 12);             // left leg
  g.fillRect(17, 35, 8, 12);            // right leg

  // head
  g.fillStyle(SKIN, 1);
  g.fillRect(10 + lean, 6, 12, 10);
  // hood
  g.fillStyle(ROBE, 1);
  g.fillRect(9 + lean, 4, 14, 4);
  g.fillRect(9 + lean, 4, 3, 11);
  g.fillRect(20 + lean, 4, 3, 11);
  // eye
  g.fillStyle(0x1b1b28, 1);
  g.fillRect(17 + lean, 9, 2, 3);

  // torso robe
  g.fillStyle(ROBE, 1);
  g.fillRect(7, 17, 18, 18);
  g.fillStyle(ROBE_D, 1);
  g.fillRect(7, 28, 18, 7);
  // elemental sash
  g.fillStyle(TRIM, 1);
  g.fillRect(7, 22, 18, 3);
  g.fillRect(14, 17, 4, 12);

  // legs
  g.fillStyle(ROBE_D, 1);
  if (frame === 'run') {
    g.fillRect(6, 36, 8, 10);
    g.fillRect(18, 36, 8, 7);
  } else if (frame === 'air') {
    g.fillRect(8, 36, 7, 8);
    g.fillRect(17, 36, 7, 11);
  } else {
    g.fillRect(8, 36, 7, 11);
    g.fillRect(17, 36, 7, 11);
  }
  // boots
  g.fillStyle(0x2b2438, 1);
  g.fillRect(7, 44, 9, 3);
  g.fillRect(16, 44, 9, 3);
}

// ------------------------------------------------------------------ gems
function drawGemBase(g) {
  g.fillStyle(0x11121a, 1); g.fillCircle(8, 8, 6.5);
  g.fillStyle(0xd9e6f2, 1); g.fillCircle(8, 8, 5.2);
  g.fillStyle(0xffffff, 1); g.fillCircle(6.3, 6.3, 1.6);
}

function drawGemTwo(g) {
  const pts = (s) => [8, 8 - s, 8 + s, 8, 8, 8 + s, 8 - s, 8];
  g.fillStyle(0x0d1420, 1);
  g.fillPoints(toPts(pts(8)), true);
  g.fillStyle(0x6fd3ff, 1);
  g.fillPoints(toPts(pts(6.4)), true);
  g.fillStyle(0xd8f6ff, 1);
  g.fillPoints(toPts([8, 3, 10.5, 7, 8, 8, 5.5, 7]), true);
}

function drawGemThree(g) {
  const star = (r1, r2) => {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i - Math.PI / 2;
      const r = i % 2 === 0 ? r1 : r2;
      pts.push(11 + Math.cos(a) * r, 11 + Math.sin(a) * r);
    }
    return pts;
  };
  g.fillStyle(0x3a2a06, 1); g.fillPoints(toPts(star(10.5, 4.6)), true);
  g.fillStyle(0xffd34d, 1); g.fillPoints(toPts(star(9, 3.8)), true);
  g.fillStyle(0xfff3c0, 1); g.fillCircle(11, 11, 2.6);
}

function toPts(flat) {
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push({ x: flat[i], y: flat[i + 1] });
  return out;
}

// --------------------------------------------------------------- enemies
function drawWalker(g, theme) {
  const c = enemyColors(theme);
  g.fillStyle(0x12101a, 1); g.fillRect(2, 8, 28, 22);
  g.fillStyle(c.body, 1); g.fillRect(3, 9, 26, 20);
  g.fillStyle(c.dark, 1); g.fillRect(3, 22, 26, 7);
  // carapace ridge
  g.fillStyle(c.light, 1);
  g.fillRect(6, 11, 20, 4);
  g.fillRect(12, 9, 8, 3);
  // eyes
  g.fillStyle(0xfff0c0, 1); g.fillRect(21, 16, 4, 4); g.fillRect(7, 16, 4, 4);
  g.fillStyle(0x151018, 1); g.fillRect(22, 17, 2, 2); g.fillRect(8, 17, 2, 2);
  // legs
  g.fillStyle(c.dark, 1);
  g.fillRect(5, 29, 4, 3); g.fillRect(14, 29, 4, 3); g.fillRect(23, 29, 4, 3);
}

function drawJumper(g, theme) {
  const c = enemyColors(theme);
  g.fillStyle(0x12101a, 1); g.fillPoints(toPts([16, 2, 30, 18, 24, 30, 8, 30, 2, 18]), true);
  g.fillStyle(c.body, 1); g.fillPoints(toPts([16, 4, 28, 18, 23, 28, 9, 28, 4, 18]), true);
  g.fillStyle(c.light, 1); g.fillPoints(toPts([16, 6, 23, 16, 9, 16]), true);
  g.fillStyle(0xfff0c0, 1); g.fillRect(10, 19, 5, 4); g.fillRect(18, 19, 5, 4);
  g.fillStyle(0x151018, 1); g.fillRect(12, 20, 2, 3); g.fillRect(20, 20, 2, 3);
  g.fillStyle(c.dark, 1); g.fillRect(6, 28, 7, 3); g.fillRect(19, 28, 7, 3);
}

function drawFlyer(g, theme) {
  const c = enemyColors(theme);
  g.fillStyle(0x12101a, 1); g.fillCircle(16, 14, 11);
  g.fillStyle(c.body, 1); g.fillCircle(16, 14, 9.6);
  g.fillStyle(c.light, 1); g.fillCircle(13, 11, 3.4);
  // wings / tendrils
  g.fillStyle(c.dark, 1);
  g.fillPoints(toPts([3, 10, 12, 14, 3, 19]), true);
  g.fillPoints(toPts([29, 10, 20, 14, 29, 19]), true);
  g.fillRect(9, 22, 3, 8); g.fillRect(15, 22, 3, 9); g.fillRect(21, 22, 3, 7);
  g.fillStyle(0x151018, 1); g.fillRect(13, 13, 3, 3); g.fillRect(19, 13, 3, 3);
}

function drawSpitter(g) {
  g.fillStyle(0x140a08, 1); g.fillRect(1, 5, 30, 27);
  g.fillStyle(0x4a2b22, 1); g.fillRect(2, 6, 28, 25);
  g.fillStyle(0x6d3d2c, 1); g.fillRect(2, 6, 28, 6);
  g.fillStyle(0x1d1210, 1); g.fillRect(4, 26, 24, 5);
  // muzzle
  g.fillStyle(0x2a1a15, 1); g.fillRect(0, 14, 32, 9);
  g.fillStyle(0xff7a35, 1); g.fillCircle(16, 18, 4.5);
  g.fillStyle(0xffd9a0, 1); g.fillCircle(16, 18, 2.2);
}

function enemyColors(theme) {
  const map = {
    trial: { body: 0x8a7150, light: 0xc0a271, dark: 0x5c4a32 },
    earth: { body: 0x5f7a3a, light: 0x8fb45c, dark: 0x3d4f25 },
    water: { body: 0x2f8f9c, light: 0x66d0d8, dark: 0x1d5b66 },
    air: { body: 0xdfe9f5, light: 0xffffff, dark: 0x9fb2c9 },
    fire: { body: 0xb8402a, light: 0xff8a4a, dark: 0x6d2015 },
  };
  return map[theme] || map.trial;
}

// ----------------------------------------------------------------- tiles
function drawGroundTop(g, theme) {
  const c = THEMES[theme];
  g.fillStyle(c.groundBody, 1); g.fillRect(0, 0, T, T);
  g.fillStyle(c.groundTop, 1); g.fillRect(0, 0, T, 7);
  g.fillStyle(c.groundDark, 1);
  g.fillRect(0, 7, T, 2);
  g.fillRect(5, 14, 8, 3);
  g.fillRect(20, 22, 9, 3);
  g.fillRect(2, 26, 6, 2);
}

function drawGroundFill(g, theme) {
  const c = THEMES[theme];
  g.fillStyle(c.groundBody, 1); g.fillRect(0, 0, T, T);
  g.fillStyle(c.groundDark, 1);
  g.fillRect(3, 5, 10, 3);
  g.fillRect(18, 13, 8, 3);
  g.fillRect(8, 22, 12, 3);
}

function drawBlock(g, theme) {
  const c = THEMES[theme];
  g.fillStyle(c.groundDark, 1); g.fillRect(0, 0, T, T);
  g.fillStyle(c.block, 1); g.fillRect(1, 1, T - 2, T - 2);
  g.fillStyle(c.groundTop, 0.35); g.fillRect(1, 1, T - 2, 3);
  g.fillStyle(c.groundDark, 1); g.fillRect(1, 15, T - 2, 2);
}

function drawOneWay(g, theme) {
  const c = THEMES[theme];
  g.fillStyle(c.groundDark, 1); g.fillRect(0, 0, T, 12);
  g.fillStyle(c.oneway, 1); g.fillRect(0, 0, T, 5);
  g.fillStyle(c.groundBody, 1); g.fillRect(0, 5, T, 6);
  g.fillStyle(c.groundDark, 0.8); g.fillRect(6, 7, 6, 2); g.fillRect(20, 7, 6, 2);
}

function drawCrumble(g, theme) {
  const c = THEMES[theme];
  g.fillStyle(c.groundDark, 1); g.fillRect(0, 0, T, 12);
  g.fillStyle(c.oneway, 1); g.fillRect(0, 0, T, 5);
  g.fillStyle(c.groundBody, 1); g.fillRect(0, 5, T, 6);
  // cracks — the shape tell, not just colour (PRD §8)
  g.lineStyle(1, 0x1a1418, 0.9);
  g.beginPath();
  g.moveTo(5, 0); g.lineTo(9, 5); g.lineTo(6, 11);
  g.moveTo(17, 0); g.lineTo(14, 6); g.lineTo(19, 11);
  g.moveTo(26, 0); g.lineTo(28, 7);
  g.strokePath();
}

function drawSpikes(g) {
  g.fillStyle(0x1a1620, 1);
  for (let i = 0; i < 4; i++) {
    const x = i * 8;
    g.fillPoints(toPts([x, 32, x + 4, 11, x + 8, 32]), true);
  }
  g.fillStyle(0x8f97a8, 1);
  for (let i = 0; i < 4; i++) {
    const x = i * 8;
    g.fillPoints(toPts([x + 1, 32, x + 4, 13, x + 7, 32]), true);
  }
  g.fillStyle(0xe8edf5, 1);
  for (let i = 0; i < 4; i++) g.fillPoints(toPts([i * 8 + 2.5, 21, i * 8 + 4, 13, i * 8 + 5.5, 21]), true);
  g.fillStyle(0x3a3448, 1); g.fillRect(0, 29, T, 3);
}

function drawLiquid(g, kind) {
  const water = kind === 'water';
  const top = water ? 0x2f9fd0 : 0xff6a1e;
  const mid = water ? 0x1b6f9c : 0xc23608;
  const deep = water ? 0x103f5c : 0x6d1604;
  g.fillStyle(mid, 1); g.fillRect(0, 0, T, T);
  g.fillStyle(top, 1); g.fillRect(0, 0, T, 5);
  g.fillStyle(water ? 0x9fe8ff : 0xffd06a, 0.85); g.fillRect(0, 0, T, 2);
  g.fillStyle(deep, 1); g.fillRect(0, 22, T, 10);
  g.fillStyle(water ? 0x7fd8f0 : 0xffb04a, 0.28);
  g.fillRect(4, 9, 9, 2); g.fillRect(19, 15, 8, 2);
}

function drawLift(g, kind) {
  const c = kind === 'bubble' ? 0x8fe8ff : 0xdff0ff;
  g.fillStyle(c, 0.16); g.fillRect(0, 0, T, T);
  g.fillStyle(c, 0.55);
  if (kind === 'bubble') {
    g.fillCircle(8, 26, 3); g.fillCircle(20, 18, 4); g.fillCircle(12, 8, 2.5); g.fillCircle(25, 5, 2);
  } else {
    g.fillRect(6, 2, 2, 12); g.fillRect(15, 10, 2, 16); g.fillRect(24, 4, 2, 10);
  }
}

function drawWind(g) {
  g.fillStyle(0xffffff, 0.10); g.fillRect(0, 0, T, T);
  g.fillStyle(0xffffff, 0.45);
  g.fillRect(2, 7, 18, 2); g.fillRect(10, 16, 20, 2); g.fillRect(4, 25, 14, 2);
}

// ------------------------------------------------------- props & effects
function drawShrine(g, lit, theme) {
  const c = THEMES[theme];
  const glow = lit ? c.accent : 0x5b5670;
  g.fillStyle(0x14121c, 1); g.fillRect(4, 10, 24, 38);
  g.fillStyle(c.block, 1); g.fillRect(5, 11, 22, 36);
  g.fillStyle(c.groundTop, 1); g.fillRect(2, 44, 28, 4);
  g.fillStyle(0x14121c, 1); g.fillRect(2, 43, 28, 1);
  // bowl
  g.fillStyle(glow, lit ? 1 : 0.6);
  g.fillPoints(toPts([9, 18, 23, 18, 20, 30, 12, 30]), true);
  if (lit) {
    g.fillStyle(0xfff6d0, 0.95);
    g.fillPoints(toPts([16, 2, 22, 16, 16, 12, 10, 16]), true);
  }
}

function drawGate(g, theme) {
  const c = THEMES[theme];
  g.fillStyle(0x14121c, 1); g.fillRect(0, 0, 64, 96);
  g.fillStyle(c.block, 1); g.fillRect(2, 2, 60, 92);
  g.fillStyle(c.groundTop, 1);
  g.fillRect(2, 2, 60, 8);
  g.fillRect(2, 86, 60, 8);
  g.fillStyle(0x0d0b12, 1); g.fillRect(12, 14, 40, 72);
  g.fillStyle(c.gate, 0.85); g.fillRect(15, 17, 34, 66);
  g.fillStyle(0xffffff, 0.5); g.fillRect(20, 24, 6, 52);
  g.fillStyle(c.accent, 1); g.fillCircle(32, 50, 9);
  g.fillStyle(0xffffff, 0.9); g.fillCircle(32, 50, 4);
}

function drawRock(g) {
  g.fillStyle(0x100d14, 1); g.fillPoints(toPts([16, 0, 31, 10, 28, 28, 6, 30, 1, 12]), true);
  g.fillStyle(0x6b5f55, 1); g.fillPoints(toPts([16, 2, 29, 11, 26, 26, 7, 28, 3, 13]), true);
  g.fillStyle(0x8b7d70, 1); g.fillPoints(toPts([16, 4, 24, 12, 14, 16, 8, 12]), true);
  g.fillStyle(0x3f362f, 1); g.fillRect(10, 20, 12, 4);
}

function drawBullet(g) {
  g.fillStyle(0x1a1420, 1); g.fillRect(0, 0, 14, 8);
  g.fillStyle(0xffe27a, 1); g.fillRect(1, 1, 12, 6);
  g.fillStyle(0xffffff, 1); g.fillRect(8, 2, 5, 4);
}

function drawEnemyShot(g) {
  g.fillStyle(0x2a0d05, 1); g.fillCircle(10, 10, 9);
  g.fillStyle(0xff7a2a, 1); g.fillCircle(10, 10, 7.4);
  g.fillStyle(0xffd88a, 1); g.fillCircle(10, 10, 3.6);
}

function drawPillar(g) {
  g.fillStyle(0xff4a10, 0.9); g.fillRect(2, 0, 28, 96);
  g.fillStyle(0xff9a3a, 1); g.fillRect(6, 0, 20, 96);
  g.fillStyle(0xffe6a0, 1); g.fillRect(12, 0, 8, 96);
}

function drawVent(g) {
  g.fillStyle(0x1a1010, 1); g.fillRect(0, 20, 32, 12);
  g.fillStyle(0x4a2a20, 1); g.fillRect(2, 22, 28, 8);
  g.fillStyle(0xff7a35, 1); g.fillRect(8, 24, 16, 4);
}

function drawMover(g, theme) {
  const c = THEMES[theme];
  g.fillStyle(0x14121c, 1); g.fillRect(0, 0, 96, 16);
  g.fillStyle(c.block, 1); g.fillRect(1, 1, 94, 14);
  g.fillStyle(c.groundTop, 1); g.fillRect(1, 1, 94, 5);
  g.fillStyle(c.groundDark, 1); g.fillRect(10, 8, 16, 3); g.fillRect(56, 8, 16, 3);
}

export function buildAllTextures(scene) {
  tex(scene, 'player_idle', 32, 48, (g) => drawPlayer(g, 'idle'));
  tex(scene, 'player_run', 32, 48, (g) => drawPlayer(g, 'run'));
  tex(scene, 'player_air', 32, 48, (g) => drawPlayer(g, 'air'));

  tex(scene, 'gem_base', 16, 16, drawGemBase);
  tex(scene, 'gem_two', 16, 16, drawGemTwo);
  tex(scene, 'gem_three', 22, 22, drawGemThree);

  tex(scene, 'bullet', 14, 8, drawBullet);
  tex(scene, 'enemy_shot', 20, 20, drawEnemyShot);
  tex(scene, 'rock', 32, 30, drawRock);
  tex(scene, 'pillar', 32, 96, drawPillar);
  tex(scene, 'vent', 32, 32, drawVent);
  tex(scene, 'spikes', 32, 32, drawSpikes);
  tex(scene, 'liquid_water', 32, 32, (g) => drawLiquid(g, 'water'));
  tex(scene, 'liquid_lava', 32, 32, (g) => drawLiquid(g, 'lava'));
  tex(scene, 'lift_bubble', 32, 32, (g) => drawLift(g, 'bubble'));
  tex(scene, 'lift_updraft', 32, 32, (g) => drawLift(g, 'updraft'));
  tex(scene, 'wind', 32, 32, drawWind);

  tex(scene, 'dot', 6, 6, (g) => { g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 6, 6); });
  tex(scene, 'spark', 4, 4, (g) => { g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 4, 4); });

  for (const theme of Object.keys(THEMES)) {
    tex(scene, `ground_top_${theme}`, T, T, (g) => drawGroundTop(g, theme));
    tex(scene, `ground_fill_${theme}`, T, T, (g) => drawGroundFill(g, theme));
    tex(scene, `block_${theme}`, T, T, (g) => drawBlock(g, theme));
    tex(scene, `oneway_${theme}`, T, 12, (g) => drawOneWay(g, theme));
    tex(scene, `crumble_${theme}`, T, 12, (g) => drawCrumble(g, theme));
    tex(scene, `shrine_off_${theme}`, 32, 48, (g) => drawShrine(g, false, theme));
    tex(scene, `shrine_on_${theme}`, 32, 48, (g) => drawShrine(g, true, theme));
    tex(scene, `gate_${theme}`, 64, 96, (g) => drawGate(g, theme));
    tex(scene, `mover_${theme}`, 96, 16, (g) => drawMover(g, theme));
    tex(scene, `walker_${theme}`, 32, 32, (g) => drawWalker(g, theme));
    tex(scene, `jumper_${theme}`, 32, 32, (g) => drawJumper(g, theme));
    tex(scene, `flyer_${theme}`, 32, 32, (g) => drawFlyer(g, theme));
  }
  tex(scene, 'spitter_fire', 32, 32, drawSpitter);
}

export { outlineRect };
