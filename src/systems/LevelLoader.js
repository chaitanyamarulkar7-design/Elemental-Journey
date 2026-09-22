// PRD §11 — turns an ASCII tile map into a world: merged collision bodies,
// one render-texture pass for the tiles, and object lists for everything else.

import { PHYSICS, TILE, ROWS, VIEW_W, VIEW_H } from '../config/physicsConfig.js';
import { THEMES, DEBUG_ENABLED } from '../config/gameConfig.js';
import { SOLID_CHARS, GEM_CHARS } from '../config/tileLegend.js';
import { validateLevel } from './LevelValidator.js';

/** Horizontal runs of a predicate, per row. */
function runsPerRow(tiles, test) {
  const out = [];
  for (let r = 0; r < tiles.length; r++) {
    let start = -1;
    for (let c = 0; c <= tiles[r].length; c++) {
      const ok = c < tiles[r].length && test(tiles[r][c], r, c);
      if (ok && start < 0) start = c;
      if (!ok && start >= 0) { out.push({ r, a: start, b: c - 1 }); start = -1; }
    }
  }
  return out;
}

/** Merges runs that share a span in consecutive rows into one tall rectangle. */
function mergeVertical(runs) {
  const byRow = new Map();
  for (const run of runs) {
    if (!byRow.has(run.r)) byRow.set(run.r, []);
    byRow.get(run.r).push(run);
  }
  const used = new Set();
  const rects = [];
  const keyOf = (run) => `${run.r}:${run.a}:${run.b}`;
  for (const run of runs) {
    if (used.has(keyOf(run))) continue;
    let height = 1;
    let r = run.r + 1;
    for (;;) {
      const below = (byRow.get(r) || []).find(o => o.a === run.a && o.b === run.b && !used.has(keyOf(o)));
      if (!below) break;
      used.add(keyOf(below));
      height++;
      r++;
    }
    used.add(keyOf(run));
    rects.push({ x: run.a * TILE, y: run.r * TILE, w: (run.b - run.a + 1) * TILE, h: height * TILE });
  }
  return rects;
}

function makeParallax(scene, theme) {
  const t = THEMES[theme];
  for (const [key, shade, scale] of [[`px_far_${theme}`, t.far, 1], [`px_near_${theme}`, t.near, 0.8]]) {
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(shade, 1);
    if (theme === 'air') {
      for (let i = 0; i < 7; i++) {
        const x = i * 70 + (scale > 0.9 ? 0 : 35);
        const y = 120 + ((i * 53) % 160);
        g.fillEllipse(x, y, 150 * scale, 56 * scale);
        g.fillEllipse(x + 40, y - 14, 100 * scale, 46 * scale);
      }
    } else if (theme === 'water') {
      for (let i = 0; i < 8; i++) {
        const x = i * 62 + 14;
        g.fillRect(x, 150 + (i % 3) * 30, 26 * scale, 400);
        g.fillCircle(x + 13 * scale, 150 + (i % 3) * 30, 16 * scale);
      }
    } else if (theme === 'fire') {
      for (let i = 0; i < 6; i++) {
        const x = i * 84;
        g.fillTriangle(x, 540, x + 60 * scale, 150 + (i % 2) * 70, x + 120 * scale, 540);
      }
    } else if (theme === 'earth') {
      for (let i = 0; i < 9; i++) {
        const x = i * 56;
        g.fillRect(x, 190 + (i % 4) * 26, 36 * scale, 400);
      }
      g.fillRect(0, 150, 480, 26);
    } else {
      for (let i = 0; i < 6; i++) {
        const x = i * 84 + 10;
        g.fillRect(x, 170 + (i % 3) * 34, 46 * scale, 400);
        g.fillRect(x - 6, 164 + (i % 3) * 34, 58 * scale, 10);
      }
    }
    g.generateTexture(key, 480, VIEW_H);
    g.destroy();
  }
}

export function buildWorld(scene, level, key) {
  const { errors, warnings } = validateLevel(level, key);
  if (DEBUG_ENABLED) {
    for (const w of warnings) console.warn('[level]', w);
    if (errors.length) {
      for (const e of errors) console.error('[level]', e);
      throw new Error(`Level "${key}" failed validation:\n  ${errors.join('\n  ')}`);
    }
  }

  const tiles = level.tiles;
  const theme = level.theme;
  const cols = tiles[0].length;
  const worldW = cols * TILE;
  const worldH = ROWS * TILE;
  const palette = THEMES[theme];

  // ---- background: flat sky + two parallax layers (PRD §10) ----------
  const sky = scene.add.graphics().setScrollFactor(0).setDepth(0);
  for (let i = 0; i < VIEW_H; i += 4) {
    const k = i / VIEW_H;
    sky.fillStyle(blend(palette.skyTop, palette.skyBottom, k), 1);
    sky.fillRect(0, i, VIEW_W, 5);
  }
  makeParallax(scene, theme);
  const far = scene.add.tileSprite(0, 0, VIEW_W, VIEW_H, `px_far_${theme}`)
    .setOrigin(0, 0).setScrollFactor(0).setDepth(1).setAlpha(0.75);
  const near = scene.add.tileSprite(0, 0, VIEW_W, VIEW_H, `px_near_${theme}`)
    .setOrigin(0, 0).setScrollFactor(0).setDepth(2).setAlpha(0.85);

  // ---- tile visuals in a single render texture -----------------------
  const rt = scene.add.renderTexture(0, 0, worldW, worldH).setOrigin(0, 0).setDepth(10);
  rt.beginDraw();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = tiles[r][c];
      const x = c * TILE;
      const y = r * TILE;
      if (ch === '#') {
        const above = r > 0 ? tiles[r - 1][c] : '.';
        rt.batchDraw(SOLID_CHARS.has(above) ? `ground_fill_${theme}` : `ground_top_${theme}`, x, y);
      } else if (ch === 'B') {
        rt.batchDraw(`block_${theme}`, x, y);
      } else if (ch === '=') {
        rt.batchDraw(`oneway_${theme}`, x, y);
      } else if (ch === '^') {
        rt.batchDraw('spikes', x, y);
      } else if (ch === '~') {
        rt.batchDraw(theme === 'fire' ? 'liquid_lava' : 'liquid_water', x, y);
      } else if (ch === 'u') {
        rt.batchDraw(theme === 'water' ? 'lift_bubble' : 'lift_updraft', x, y);
      } else if (ch === 'W') {
        rt.batchDraw('wind', x, y);
      }
    }
  }
  rt.endDraw();

  // ---- collision ------------------------------------------------------
  const solids = scene.physics.add.staticGroup();
  for (const rect of mergeVertical(runsPerRow(tiles, ch => SOLID_CHARS.has(ch)))) {
    const body = scene.add.rectangle(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h);
    body.setVisible(false);
    scene.physics.add.existing(body, true);
    solids.add(body);
  }

  const oneWays = scene.physics.add.staticGroup();
  for (const run of runsPerRow(tiles, ch => ch === '=')) {
    const w = (run.b - run.a + 1) * TILE;
    const body = scene.add.rectangle(run.a * TILE + w / 2, run.r * TILE + 10, w, 20);
    body.setVisible(false);
    scene.physics.add.existing(body, true);
    oneWays.add(body);
  }

  // ---- crumbling ledges: one sprite per tile, one run falls together --
  const crumbleRuns = runsPerRow(tiles, ch => ch === 'C');
  const crumbles = [];
  crumbleRuns.forEach((run, i) => {
    for (let c = run.a; c <= run.b; c++) {
      crumbles.push({ col: c, row: run.r, runId: i });
    }
  });

  // ---- lethal and environmental rectangles ----------------------------
  const spikeRects = [];
  for (const run of runsPerRow(tiles, ch => ch === '^')) {
    // The hitbox is the lower 60% of the tile, inset from the art.
    spikeRects.push({
      x: run.a * TILE + 4, y: run.r * TILE + TILE * 0.4,
      w: (run.b - run.a + 1) * TILE - 8, h: TILE * 0.6,
    });
  }
  const liquidRects = mergeVertical(runsPerRow(tiles, ch => ch === '~'))
    .map(r => ({ x: r.x + 2, y: r.y + 8, w: r.w - 4, h: r.h - 8 }));
  const liftRects = mergeVertical(runsPerRow(tiles, ch => ch === 'u'));
  const windRects = mergeVertical(runsPerRow(tiles, ch => ch === 'W'))
    .map(r => ({ ...r, dir: 1 }));

  // ---- pickups and objects -------------------------------------------
  const gemDefs = [];
  let start = { col: 1, row: 14 };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = tiles[r][c];
      const tier = GEM_CHARS[ch];
      if (tier) gemDefs.push({ col: c, row: r, tier });
      else if (ch === 'P') start = { col: c, row: r };
    }
  }

  // ---- fast tile lookups used by the player and enemies ---------------
  const solidAt = (c, r) => {
    if (r < 0 || r >= ROWS || c < 0 || c >= cols) return false;
    return SOLID_CHARS.has(tiles[r][c]);
  };
  const standableAt = (c, r) => {
    if (r < 0 || r >= ROWS || c < 0 || c >= cols) return false;
    const ch = tiles[r][c];
    return ch === '#' || ch === 'B' || ch === '=' || ch === 'C';
  };

  return {
    tiles, theme, cols, worldW, worldH, palette,
    sky, far, near, rt,
    solids, oneWays, crumbles,
    spikeRects, liquidRects, liftRects, windRects,
    gemDefs, start,
    solidAt, standableAt,
  };
}

function blend(a, b, k) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * k);
  const g = Math.round(ag + (bg - ag) * k);
  const bl = Math.round(ab + (bb - ab) * k);
  return (r << 16) | (g << 8) | bl;
}

export function rectOverlap(body, rect) {
  return body.right > rect.x && body.left < rect.x + rect.w &&
         body.bottom > rect.y && body.top < rect.y + rect.h;
}
