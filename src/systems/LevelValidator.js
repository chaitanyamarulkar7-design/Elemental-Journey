// PRD §11 — load-time validation. Pure logic, no Phaser, so the same code runs
// in the browser at startup and in tools/validate.mjs on the command line.

import { ROWS } from '../config/physicsConfig.js';
import { isKnownChar, SOLID_CHARS, ONEWAY_CHARS, GEM_CHARS } from '../config/tileLegend.js';

const STANDABLE = new Set(['#', 'B', '=', 'C']);

/** A maximal run of tiles the player can stand on, at one tile row. */
export function findLedges(tiles) {
  const h = tiles.length;
  const w = tiles[0].length;
  const ledges = [];
  for (let r = 0; r < h; r++) {
    let start = -1;
    for (let c = 0; c <= w; c++) {
      const ch = c < w ? tiles[r][c] : '.';
      const above = r > 0 && c < w ? tiles[r - 1][c] : '.';
      const standable = c < w && STANDABLE.has(ch) && !SOLID_CHARS.has(above);
      if (standable && start < 0) start = c;
      if (!standable && start >= 0) {
        ledges.push({ row: r, a: start, b: c - 1, id: ledges.length });
        start = -1;
      }
    }
  }
  return ledges;
}

/**
 * Can the player get from a ledge at row ra to one at row rb across a gap of
 * g empty columns? Derived from the jump-geometry caps in PRD §3, in tile rows
 * (one layer = 4 rows, a full jump peaks at about 5.1 tiles).
 */
export function jumpReaches(dRowsUp, gap) {
  if (gap > 6) return false;
  if (dRowsUp <= 0) return gap <= 5;       // dropping, including one layer down
  if (dRowsUp <= 2) return gap <= 4;       // small step up
  if (dRowsUp <= 4) return gap <= 3;       // one full layer up
  if (dRowsUp === 5) return gap <= 1;      // at the very limit of the arc
  return false;                            // two layers up needs a lift
}

function overlapGap(A, B) {
  if (B.a > A.b) return B.a - A.b - 1;
  if (A.a > B.b) return A.a - B.b - 1;
  return -1; // horizontally overlapping
}

/** Ledges connected by a lift column ('u') or a moving platform. */
function liftColumns(tiles) {
  const cols = new Set();
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < tiles[r].length; c++) if (tiles[r][c] === 'u') cols.add(c);
  }
  return cols;
}

export function buildReachability(tiles, movers) {
  const ledges = findLedges(tiles);
  const lifts = liftColumns(tiles);
  const adj = ledges.map(() => new Set());

  const near = (L, col) => col >= L.a - 2 && col <= L.b + 2;

  for (let i = 0; i < ledges.length; i++) {
    for (let j = 0; j < ledges.length; j++) {
      if (i === j) continue;
      const A = ledges[i], B = ledges[j];
      const gap = overlapGap(A, B);
      const dUp = A.row - B.row;
      if (gap < 0) {
        // Stacked or overlapping: jump straight up, or simply fall down.
        if (dUp <= 0 || dUp <= 5) adj[i].add(j);
        continue;
      }
      if (jumpReaches(dUp, gap)) adj[i].add(j);
    }
    // A lift column touching both ledges connects them at any height.
    for (const col of lifts) {
      if (!near(ledges[i], col)) continue;
      for (let j = 0; j < ledges.length; j++) {
        if (i !== j && near(ledges[j], col)) adj[i].add(j);
      }
    }
  }

  // Moving platforms bridge whatever their path endpoints touch.
  for (const mv of movers || []) {
    const pts = mv.path || [[mv.x, mv.y]];
    const touching = [];
    for (const [px, py] of pts) {
      for (let k = 0; k < ledges.length; k++) {
        const L = ledges[k];
        const dUp = L.row - py;
        if (px >= L.a - 5 && px <= L.b + 5 && dUp >= -5 && dUp <= 5) touching.push(k);
      }
    }
    for (const a of touching) for (const b of touching) if (a !== b) adj[a].add(b);
  }

  return { ledges, adj };
}

function findChar(tiles, ch) {
  const out = [];
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < tiles[r].length; c++) if (tiles[r][c] === ch) out.push({ r, c });
  }
  return out;
}

function ledgeUnder(ledges, col, row) {
  // The ledge whose surface the given tile sits on (search downward).
  let best = null;
  for (const L of ledges) {
    if (col < L.a || col > L.b) continue;
    if (L.row < row) continue;
    if (!best || L.row < best.row) best = L;
  }
  return best;
}

/**
 * Returns { errors: [], warnings: [] }. Errors fail the load in dev.
 */
export function validateLevel(level, key) {
  const errors = [];
  const warnings = [];
  const tiles = level.tiles;
  const where = key || level.name || 'level';

  if (!Array.isArray(tiles) || tiles.length !== ROWS) {
    errors.push(`${where}: map must be exactly ${ROWS} rows, got ${tiles ? tiles.length : 0}`);
    return { errors, warnings };
  }
  const w = tiles[0].length;
  tiles.forEach((row, i) => {
    if (row.length !== w) errors.push(`${where}: row ${i} is ${row.length} wide, expected ${w}`);
    for (const ch of row) {
      if (!isKnownChar(ch)) errors.push(`${where}: unknown tile character "${ch}" in row ${i}`);
    }
  });

  const starts = findChar(tiles, 'P');
  const gates = findChar(tiles, 'G');
  if (starts.length !== 1) errors.push(`${where}: expected exactly one P, found ${starts.length}`);
  if (gates.length !== 1) errors.push(`${where}: expected exactly one G, found ${gates.length}`);

  let placed = 0;
  for (const row of tiles) {
    for (const ch of row) {
      const tier = GEM_CHARS[ch];
      if (tier) placed += tier === 'three' ? 3 : tier === 'two' ? 2 : 1;
    }
  }
  if (placed !== level.totalGemValue) {
    errors.push(`${where}: placed gem value ${placed} does not match totalGemValue ${level.totalGemValue}`);
  }

  const { ledges, adj } = buildReachability(tiles, level.movers);

  // Reachability: the gate must be reachable from the start.
  if (starts.length === 1 && gates.length === 1 && ledges.length) {
    const s = ledgeUnder(ledges, starts[0].c, starts[0].r);
    const g = ledgeUnder(ledges, gates[0].c, gates[0].r);
    if (!s) errors.push(`${where}: the player start at column ${starts[0].c} is not above a surface`);
    if (!g) errors.push(`${where}: the gate at column ${gates[0].c} is not above a surface`);
    if (s && g) {
      const seen = new Set([s.id]);
      const stack = [s.id];
      while (stack.length) {
        const n = stack.pop();
        for (const m of adj[n]) if (!seen.has(m)) { seen.add(m); stack.push(m); }
      }
      if (!seen.has(g.id)) {
        errors.push(`${where}: the gate is not reachable from the start within the jump caps in PRD §3`);
      }
      // Every gem should be collectable from somewhere reachable.
      let stranded = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < w; c++) {
          if (!GEM_CHARS[tiles[r][c]]) continue;
          const L = ledgeUnder(ledges, c, r);
          if (!L || !seen.has(L.id)) stranded++;
        }
      }
      if (stranded) warnings.push(`${where}: ${stranded} gem(s) sit above no reachable surface`);
    }
  }

  // Mandatory-gap check: a same-row gap wider than the flat cap is only a
  // problem when nothing else — a lower layer, a lift, a raft, an upper route —
  // gets the player across it.
  const reachFrom = (from, to) => {
    const seen = new Set([from]);
    const stack = [from];
    while (stack.length) {
      const n = stack.pop();
      if (n === to) return true;
      for (const m of adj[n]) if (!seen.has(m)) { seen.add(m); stack.push(m); }
    }
    return false;
  };
  for (const L of ledges) {
    const right = ledges
      .filter(o => o.row === L.row && o.a > L.b)
      .sort((a, b) => a.a - b.a)[0];
    if (!right) continue;
    const gap = right.a - L.b - 1;
    if (gap > 4 && gap <= 16 && !reachFrom(L.id, right.id)) {
      warnings.push(
        `${where}: ${gap}-tile gap at row ${L.row}, column ${L.b + 1} exceeds the 4-tile flat cap ` +
        `with no alternative route`);
    }
  }

  // Enemies and static hazards must sit on or above a surface.
  for (const e of level.enemies || []) {
    if (e.type === 'flyer') continue; // flyers follow a fixed air path
    if (e.water) continue;            // leaping fish rise out of the water itself
    const L = ledgeUnder(ledges, e.x, e.y - 1);
    if (!L || L.row !== e.y) {
      errors.push(`${where}: ${e.type} at column ${e.x} has no surface at row ${e.y}`);
    }
  }
  for (const h of level.hazards || []) {
    if (h.type === 'firePillar') {
      const L = ledgeUnder(ledges, h.x, h.y - 1);
      if (!L) errors.push(`${where}: fire pillar at column ${h.x} has no surface beneath it`);
    }
  }
  for (const cp of level.checkpoints || []) {
    const L = ledgeUnder(ledges, cp.x, cp.y - 1);
    if (!L) errors.push(`${where}: checkpoint at column ${cp.x} is not above a surface`);
  }

  return { errors, warnings };
}
