// Authoring tool (dev only, never shipped to the browser).
// Paints the five ASCII tile maps from the beat tables in PRD §9 and writes
// src/levels/*.js. The generated files are plain text maps you can hand-edit
// afterwards; re-running this tool overwrites them.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'src', 'levels');

const ROWS = 17;
const GROUND = 15;
const L2 = 11;
const L3 = 7;

// ---------------------------------------------------------------- painting
class Map2D {
  constructor(width) {
    this.w = width;
    this.rows = [];
    for (let r = 0; r < ROWS; r++) this.rows.push(new Array(width).fill('.'));
  }
  set(r, c, ch) {
    if (r < 0 || r >= ROWS || c < 0 || c >= this.w) return;
    this.rows[r][c] = ch;
  }
  get(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= this.w) return '.';
    return this.rows[r][c];
  }
  /** Solid ground, rows 15 + 16, inclusive of both columns. */
  ground(a, b) {
    for (let c = a; c <= b; c++) { this.set(GROUND, c, '#'); this.set(GROUND + 1, c, '#'); }
  }
  /** An open pit: nothing to stand on, nothing to see. */
  pit(a, b) {
    for (let c = a; c <= b; c++) { this.set(GROUND, c, '.'); this.set(GROUND + 1, c, '.'); }
  }
  /** A pit filled with deep water or lava — lethal on contact. */
  liquid(a, b) {
    for (let c = a; c <= b; c++) { this.set(GROUND, c, '~'); this.set(GROUND + 1, c, '~'); }
  }
  /** A one-tile dip in the ground surface (safe to fall into). */
  dip(a, b) {
    for (let c = a; c <= b; c++) this.set(GROUND, c, '.');
  }
  /** A raised step on the ground. */
  step(a, b, height = 1) {
    for (let c = a; c <= b; c++) for (let h = 1; h <= height; h++) this.set(GROUND - h, c, '#');
  }
  plat(row, a, b, ch = '=') {
    for (let c = a; c <= b; c++) this.set(row, c, ch);
  }
  block(row, a, b, height = 1) {
    for (let c = a; c <= b; c++) for (let h = 0; h < height; h++) this.set(row - h, c, 'B');
  }
  spikes(a, b, surfaceRow = GROUND) {
    for (let c = a; c <= b; c++) this.set(surfaceRow - 1, c, '^');
  }
  /** Gems sit on the row directly above a surface. */
  gems(surfaceRow, a, b, ch, step = 2) {
    for (let c = a; c <= b; c += step) this.set(surfaceRow - 1, c, ch);
  }
  column(ch, col, rTop, rBottom) {
    for (let r = rTop; r <= rBottom; r++) this.set(r, col, ch);
  }
  zone(ch, a, b, rTop, rBottom) {
    for (let c = a; c <= b; c++) for (let r = rTop; r <= rBottom; r++) this.set(r, c, ch);
  }
  toStrings() { return this.rows.map(r => r.join('')); }
}

function gemValue(map) {
  let total = 0;
  for (const row of map.rows) {
    for (const ch of row) {
      if (ch === 'o') total += 1;
      else if (ch === 'd') total += 2;
      else if (ch === 'g') total += 3;
    }
  }
  return total;
}

// ====================================================== LEVEL 1 — TRIAL
function trial() {
  const m = new Map2D(160);
  m.ground(0, 159);

  // 0-15 wide flat floor, nothing dangerous
  m.set(14, 2, 'P');
  m.gems(GROUND, 5, 9, 'o', 2);

  // 15-30 a step, then a shallow dip that costs nothing
  m.step(16, 18, 1);
  m.gems(GROUND - 1, 17, 17, 'o', 2);
  m.dip(22, 23);

  // 30-45 a line of ten base gems: gems are the path
  m.gems(GROUND, 31, 49, 'o', 2);

  // 45-60 first Walker on wide ground, plenty of headroom
  // 60-80 first Layer 2 shelf with 2x gems, a Walker patrolling underneath
  m.plat(L2, 62, 70);
  m.gems(L2, 63, 69, 'd', 2);
  m.plat(L2, 74, 80);
  m.gems(L2, 75, 79, 'd', 2);

  // 80-95 first real pit (3 tiles) and first spikes
  m.pit(84, 86);
  m.spikes(90, 92);
  m.gems(GROUND, 87, 89, 'o', 2);

  // 95-120 Layer 3 with 3x gems; a missed jump lands on Layer 2, never a pit
  m.plat(L2, 92, 124);
  m.plat(L3, 98, 104);
  m.gems(L3, 99, 103, 'g', 2);
  m.plat(L3, 108, 114);
  m.gems(L3, 109, 113, 'g', 2);
  m.plat(L3, 118, 122);
  m.gems(L3, 119, 121, 'g', 2);

  // 120-150 mixed test: one Walker, one pit, one layer change
  m.pit(130, 132);
  m.plat(L2, 134, 140);
  m.gems(L2, 135, 139, 'd', 2);
  m.gems(GROUND, 126, 128, 'o', 2);
  m.gems(GROUND, 144, 148, 'o', 2);

  // 150-160 Trial Gate on the ground
  m.set(14, 155, 'G');

  return {
    key: 'trial',
    name: 'TRIAL',
    theme: 'trial',
    parTime: 150,
    map: m,
    enemies: [
      { type: 'walker', x: 52, y: GROUND, patrol: [48, 58] },
      { type: 'walker', x: 66, y: GROUND, patrol: [60, 72] },
      { type: 'walker', x: 78, y: GROUND, patrol: [74, 82] },
      { type: 'walker', x: 100, y: L2, patrol: [95, 106] },
      { type: 'walker', x: 142, y: GROUND, patrol: [136, 148] },
    ],
    hazards: [],
    movers: [],
  };
}

// ====================================================== LEVEL 2 — EARTH
function earth() {
  const m = new Map2D(200);
  m.ground(0, 199);
  m.set(14, 2, 'P');

  // 0-20 safe cave entrance, gems, one Walker
  m.gems(GROUND, 4, 10, 'o', 2);
  m.block(GROUND - 1, 0, 0, 4);

  // 20-45 spike fields between short ground platforms
  m.spikes(22, 24); m.spikes(28, 30); m.spikes(34, 36); m.spikes(40, 42);
  m.gems(GROUND, 26, 26, 'o'); m.gems(GROUND, 32, 32, 'o'); m.gems(GROUND, 38, 38, 'o');

  // 45-70 crumbling ledges alone, over a floor you can survive on
  m.plat(L2, 47, 49, 'C'); m.plat(L2, 53, 55, 'C');
  m.plat(L2, 59, 61, 'C'); m.plat(L2, 65, 67, 'C');
  m.gems(L2, 48, 48, 'd'); m.gems(L2, 54, 54, 'd');
  m.gems(L2, 60, 60, 'd'); m.gems(L2, 66, 66, 'd');
  // a reward shelf above the crumble line
  m.plat(L3, 58, 66);
  m.gems(L3, 59, 65, 'g', 2);

  // 70-95 Jumper on wide ground, then a Jumper guarding Layer 2
  m.gems(GROUND, 72, 80, 'o', 2);
  m.plat(L2, 84, 92);
  m.gems(L2, 86, 90, 'd', 2);

  // 95-100 checkpoint shrine on safe, flat ground
  m.set(14, 97, 'K');

  // 100-130 falling-rock corridor; the Layer 2 route swaps rocks for crumble
  for (const c of [104, 110, 116, 122, 128]) m.column('R', c, 2, 2);
  m.gems(GROUND, 102, 126, 'o', 6);
  m.plat(L2, 103, 105, 'C'); m.plat(L2, 109, 111, 'C');
  m.plat(L2, 115, 117, 'C'); m.plat(L2, 121, 123, 'C');
  m.plat(L2, 127, 129, 'C');
  m.gems(L2, 104, 104, 'd'); m.gems(L2, 110, 110, 'd');
  m.gems(L2, 116, 116, 'd'); m.gems(L2, 122, 122, 'd');
  m.gems(L2, 128, 128, 'd');

  // 130-165 three layers: 3x gems on Layer 3 above a spike field
  m.spikes(134, 160);
  m.plat(L2, 132, 140); m.plat(L2, 144, 152); m.plat(L2, 156, 164);
  m.gems(L2, 133, 133, 'd'); m.gems(L2, 146, 146, 'd'); m.gems(L2, 158, 158, 'd');
  m.plat(L3, 136, 142); m.plat(L3, 148, 154);
  m.gems(L3, 137, 141, 'g', 2);
  m.gems(L3, 149, 153, 'g', 2);

  // 165-190 final test: crumbling ledges over spikes, a Jumper at the landing
  m.spikes(167, 185);
  m.plat(L2, 166, 168, 'C'); m.plat(L2, 172, 174, 'C');
  m.plat(L2, 178, 180, 'C'); m.plat(L2, 184, 186, 'C');
  m.gems(L2, 167, 167, 'd'); m.gems(L2, 173, 173, 'd');
  m.gems(L2, 179, 179, 'd'); m.gems(L2, 185, 185, 'd');

  // 190-200 Earth Gate
  m.gems(GROUND, 190, 194, 'o', 2);
  m.set(14, 196, 'G');

  return {
    key: 'earth',
    name: 'EARTH',
    theme: 'earth',
    parTime: 195,
    map: m,
    enemies: [
      { type: 'walker', x: 13, y: GROUND, patrol: [8, 18] },
      { type: 'walker', x: 68, y: GROUND, patrol: [63, 70] },
      { type: 'jumper', x: 76, y: GROUND, patrol: [72, 82] },
      { type: 'jumper', x: 88, y: L2, patrol: [85, 91] },
      { type: 'walker', x: 106, y: GROUND, patrol: [101, 112] },
      { type: 'walker', x: 119, y: GROUND, patrol: [114, 125] },
      { type: 'walker', x: 147, y: L2, patrol: [145, 151] },
      { type: 'walker', x: 160, y: L2, patrol: [157, 163] },
      { type: 'jumper', x: 191, y: GROUND, patrol: [188, 195] },
    ],
    hazards: [
      { type: 'fallingRock', x: 104, y: 2 },
      { type: 'fallingRock', x: 110, y: 2 },
      { type: 'fallingRock', x: 116, y: 2 },
      { type: 'fallingRock', x: 122, y: 2 },
      { type: 'fallingRock', x: 128, y: 2 },
    ],
    movers: [],
  };
}

// ====================================================== LEVEL 3 — WATER
function water() {
  const m = new Map2D(240);
  m.ground(0, 239);
  m.set(14, 2, 'P');

  // 0-20 dry ruins, a shell crab, the first sight of water
  m.gems(GROUND, 4, 12, 'o', 2);

  // 20-45 deep-water pits crossed by moving platforms
  m.liquid(24, 30);
  m.liquid(36, 41);
  m.gems(GROUND, 32, 34, 'o', 2);

  // 45-65 the first bubble column lifts to a Layer 3 gem shelf
  m.column('u', 47, L3, 14);
  m.column('u', 48, L3, 14);
  m.plat(L3, 44, 54);
  m.gems(L3, 45, 53, 'g', 2);
  m.plat(L2, 56, 62);
  m.gems(L2, 57, 61, 'd', 2);

  // 65-90 the jelly drifter over wide ground
  m.gems(GROUND, 68, 86, 'o', 3);

  // 90-120 the first tide basin: the ground route only works at low tide
  m.plat(L2, 92, 100); m.plat(L2, 104, 112); m.plat(L2, 116, 122);
  m.gems(L2, 94, 98, 'd', 2);
  m.gems(L2, 106, 110, 'd', 4);
  m.gems(GROUND, 96, 112, 'o', 4);

  // 120-125 checkpoint shrine on dry ground past the basin
  m.set(14, 126, 'K');

  // 125-170 leaping fish across tide pools, 3x gems up a bubble column
  m.liquid(132, 134); m.liquid(142, 144); m.liquid(152, 154);
  m.gems(GROUND, 137, 139, 'o', 2);
  m.gems(GROUND, 147, 149, 'o', 2);
  m.column('u', 160, L3, 14);
  m.column('u', 161, L3, 14);
  m.plat(L3, 157, 167);
  m.gems(L3, 158, 166, 'g', 2);
  m.plat(L2, 168, 174);
  m.gems(L2, 169, 173, 'd', 2);

  // 170-225 final test: tide, moving platform and Flyer, with a Layer 2 escape
  m.liquid(184, 190);
  m.liquid(198, 204);
  m.plat(L2, 178, 186); m.plat(L2, 190, 198); m.plat(L2, 202, 210);
  m.gems(L2, 180, 184, 'd', 2);
  m.gems(L2, 192, 196, 'd', 2);
  m.gems(L2, 204, 208, 'd', 2);
  m.gems(GROUND, 194, 196, 'o', 2);
  m.gems(GROUND, 212, 220, 'o', 4);

  // 225-240 Water Gate
  m.set(14, 234, 'G');

  return {
    key: 'water',
    name: 'WATER',
    theme: 'water',
    parTime: 225,
    map: m,
    enemies: [
      { type: 'walker', x: 14, y: GROUND, patrol: [8, 20] },
      { type: 'walker', x: 66, y: GROUND, patrol: [64, 72] },
      { type: 'flyer', x: 76, y: 12, path: 'sine', amp: 3, span: 8 },
      { type: 'flyer', x: 108, y: 9, path: 'sine', amp: 2, span: 7 },
      { type: 'jumper', x: 133, y: GROUND, patrol: [132, 134], water: true },
      { type: 'jumper', x: 143, y: GROUND, patrol: [142, 144], water: true },
      { type: 'jumper', x: 153, y: GROUND, patrol: [152, 154], water: true },
      { type: 'walker', x: 172, y: L2, patrol: [169, 174] },
      { type: 'flyer', x: 188, y: 12, path: 'sine', amp: 3, span: 8 },
      { type: 'flyer', x: 206, y: 9, path: 'loop', amp: 3, span: 7 },
      { type: 'walker', x: 218, y: GROUND, patrol: [212, 224] },
    ],
    hazards: [
      // Water level cycles between two marked heights; never above Layer 2.
      { type: 'tide', x: 90, x2: 122, lowRow: 17, highRow: 12 },
      { type: 'tide', x: 176, x2: 212, lowRow: 17, highRow: 12 },
    ],
    movers: [
      { x: 23, y: GROUND, path: [[23, GROUND], [31, GROUND]], speed: 64 },
      { x: 35, y: GROUND, path: [[35, GROUND], [42, GROUND]], speed: 64 },
      { x: 130, y: 13, path: [[130, 13], [136, 13]], speed: 64 },
      { x: 196, y: 13, path: [[194, 13], [206, 13]], speed: 64 },
    ],
  };
}

// ======================================================== LEVEL 4 — AIR
function air() {
  const m = new Map2D(270);
  m.set(14, 2, 'P');

  // 0-20 one large island
  m.ground(0, 20);
  m.gems(GROUND, 5, 15, 'o', 2);

  // 20-45 gaps of 3-4 tiles between islands; everything below is a pit
  m.ground(24, 28); m.ground(32, 37); m.ground(41, 46); m.ground(50, 56);
  m.gems(GROUND, 25, 27, 'o', 2);
  m.gems(GROUND, 33, 36, 'o', 2);
  m.gems(GROUND, 42, 45, 'o', 2);

  // 45-70 the first updraft lifts to Layer 3
  m.column('u', 58, L3, 14);
  m.column('u', 59, L3, 14);
  m.ground(57, 62);
  m.plat(L3, 55, 66);
  m.gems(L3, 56, 65, 'g', 3);
  m.ground(66, 70);
  m.gems(GROUND, 67, 69, 'o', 2);

  // 70-100 moving platforms and fraying-cloud crumble ledges
  m.plat(L2, 73, 75, 'C'); m.plat(L2, 79, 81, 'C');
  m.plat(L2, 85, 87, 'C'); m.plat(L2, 91, 93, 'C');
  m.gems(L2, 74, 74, 'd'); m.gems(L2, 80, 80, 'd');
  m.gems(L2, 86, 86, 'd'); m.gems(L2, 92, 92, 'd');
  m.ground(97, 103);

  // 100-130 a wind zone on wide ground, then over a gap that the wind helps
  m.ground(104, 126);
  m.zone('W', 108, 120, 12, 14);
  m.gems(GROUND, 106, 124, 'o', 3);
  m.plat(L2, 110, 118);
  m.gems(L2, 112, 116, 'd', 2);

  // 130-135 checkpoint shrine
  m.ground(130, 139);
  m.set(14, 134, 'K');

  // 135-180 kite birds between the layers, wind pushing back
  m.ground(143, 148); m.ground(152, 158); m.ground(162, 168); m.ground(172, 178);
  m.zone('W', 150, 170, 12, 14);
  m.gems(GROUND, 144, 147, 'o', 2);
  m.gems(GROUND, 153, 157, 'o', 2);
  m.gems(GROUND, 163, 167, 'o', 2);
  m.plat(L2, 152, 158);
  m.gems(L2, 154, 156, 'd', 2);
  m.plat(L2, 172, 178);
  m.gems(L2, 174, 176, 'd', 2);

  // 180-230 the precision run: 2-tile platforms, never more than three in a row
  m.plat(L2, 182, 183); m.plat(L2, 187, 188); m.plat(L2, 192, 193);
  m.plat(L2, 197, 199);
  m.plat(L2, 203, 204); m.plat(L2, 208, 209); m.plat(L2, 213, 214);
  m.plat(L2, 218, 220);
  m.plat(L2, 224, 225); m.plat(L2, 229, 231);
  m.gems(L2, 182, 182, 'd'); m.gems(L2, 187, 187, 'd'); m.gems(L2, 192, 192, 'd');
  m.gems(L2, 198, 198, 'd'); m.gems(L2, 203, 203, 'd'); m.gems(L2, 208, 208, 'd');
  m.gems(L2, 213, 213, 'd'); m.gems(L2, 219, 219, 'd'); m.gems(L2, 224, 224, 'd');
  // the hardest line: 3x gems on Layer 3 straight above the narrowest steps
  m.plat(L3, 186, 189); m.plat(L3, 192, 195); m.plat(L3, 207, 210);
  m.gems(L3, 187, 188, 'g'); m.gems(L3, 193, 194, 'g'); m.gems(L3, 208, 209, 'g');

  // 230-260 the final climb on updrafts
  m.column('u', 233, L3, L2 + 1);
  m.column('u', 234, L3, L2 + 1);
  m.plat(L3, 231, 242);
  m.gems(L3, 236, 241, 'g', 2);
  m.plat(L3, 246, 256);
  m.gems(L3, 247, 255, 'g', 4);
  m.plat(L3, 259, 269);
  m.gems(L3, 260, 262, 'g', 2);

  // 260-270 Air Gate on Layer 3
  m.set(L3 - 1, 265, 'G');

  return {
    key: 'air',
    name: 'AIR',
    theme: 'air',
    parTime: 255,
    map: m,
    enemies: [
      { type: 'walker', x: 12, y: GROUND, patrol: [6, 18] },
      { type: 'walker', x: 52, y: GROUND, patrol: [50, 56] },
      { type: 'walker', x: 112, y: GROUND, patrol: [105, 125] },
      { type: 'jumper', x: 134, y: GROUND, patrol: [131, 138] },
      { type: 'flyer', x: 146, y: 12, path: 'sine', amp: 3, span: 6 },
      { type: 'flyer', x: 156, y: 9, path: 'loop', amp: 3, span: 6 },
      { type: 'flyer', x: 166, y: 12, path: 'sine', amp: 4, span: 7 },
      { type: 'flyer', x: 176, y: 9, path: 'sine', amp: 3, span: 6 },
      { type: 'walker', x: 198, y: L2, patrol: [197, 199] },
      { type: 'walker', x: 219, y: L2, patrol: [218, 220] },
      { type: 'flyer', x: 244, y: 5, path: 'sine', amp: 2, span: 6 },
      { type: 'flyer', x: 257, y: 5, path: 'loop', amp: 2, span: 5 },
    ],
    hazards: [],
    movers: [
      { x: 70, y: 13, path: [[70, 13], [78, 13]], speed: 64 },
      { x: 82, y: 13, path: [[82, 13], [90, 13]], speed: 64 },
      { x: 94, y: 13, path: [[94, 13], [98, 13]], speed: 64 },
      { x: 128, y: 13, path: [[127, 13], [131, 13]], speed: 64 },
      ],
  };
}

// ======================================================= LEVEL 5 — FIRE
function fire() {
  const m = new Map2D(320);
  m.ground(0, 319);
  m.set(14, 2, 'P');

  // 0-25 entrance, ember hounds, the first lava pits
  m.gems(GROUND, 4, 10, 'o', 2);
  m.liquid(16, 18);
  m.gems(GROUND, 21, 23, 'o', 2);

  // 25-55 fire pillars on the ground; the Layer 2 route trades them for rocks
  m.plat(L2, 28, 36); m.plat(L2, 40, 48);
  m.gems(L2, 30, 34, 'd', 4);
  m.gems(L2, 42, 46, 'd', 4);
  m.gems(GROUND, 26, 52, 'o', 6);
  for (const c of [32, 44]) m.column('R', c, 2, 2);

  // 55-85 basalt rafts over a lava lake
  m.liquid(57, 68);
  m.liquid(72, 82);
  m.plat(L2, 66, 74);
  m.gems(L2, 68, 72, 'd', 4);

  // 85-90 Checkpoint 1
  m.set(14, 87, 'K');

  // 90-130 the Spitter alone, then Spitters covering a Layer 2 route
  m.gems(GROUND, 92, 100, 'o', 4);
  m.plat(L2, 104, 112); m.plat(L2, 116, 124);
  m.gems(L2, 106, 110, 'd', 2);
  m.gems(L2, 118, 122, 'd', 4);
  m.plat(L3, 106, 114);
  m.gems(L3, 107, 113, 'g', 4);

  // 130-190 the mixed gauntlet
  m.liquid(134, 137);
  m.liquid(146, 149);
  m.spikes(156, 160);
  m.liquid(166, 170);
  m.plat(L2, 132, 140); m.plat(L2, 144, 152); m.plat(L2, 156, 164);
  m.plat(L2, 168, 176);
  m.gems(L2, 134, 138, 'd', 4);
  m.gems(L2, 146, 150, 'd', 4);
  m.gems(L2, 158, 162, 'd', 4);
  m.plat(L3, 140, 148); m.plat(L3, 152, 160);
  m.gems(L3, 141, 147, 'g', 4);
  m.gems(L3, 153, 159, 'g', 4);
  m.gems(GROUND, 178, 186, 'o', 4);

  // 190-200 breather, then Checkpoint 2
  m.gems(GROUND, 190, 193, 'o', 3);
  m.set(14, 196, 'K');

  // 200-240 the final hazard mix across all three layers
  m.liquid(206, 210);
  m.liquid(220, 224);
  m.plat(L2, 204, 212); m.plat(L2, 216, 226); m.plat(L2, 230, 240);
  m.gems(L2, 206, 210, 'd', 4);
  m.gems(L2, 218, 224, 'd', 4);
  m.plat(L3, 210, 218); m.plat(L3, 222, 230);
  m.gems(L3, 211, 217, 'g', 4);
  m.gems(L3, 223, 229, 'g', 4);
  m.gems(GROUND, 232, 238, 'o', 3);

  // 240-310 the rising-lava finale: ground, then Layer 2, then Layer 3 only
  m.plat(L2, 244, 254); m.plat(L2, 258, 268); m.plat(L2, 272, 280);
  m.gems(L2, 246, 252, 'd', 3);
  m.gems(L2, 260, 266, 'd', 3);
  m.plat(L3, 250, 258); m.plat(L3, 262, 270); m.plat(L3, 274, 284);
  m.plat(L3, 288, 298); m.plat(L3, 302, 316);
  m.gems(L3, 252, 256, 'g', 4);
  m.gems(L3, 264, 268, 'g', 4);
  m.gems(L3, 276, 282, 'g', 4);
  m.gems(L3, 290, 296, 'g', 4);
  m.gems(GROUND, 242, 250, 'o', 4);

  // 310-320 the Fire Gate on Layer 3
  m.set(L3 - 1, 310, 'G');

  return {
    key: 'fire',
    name: 'FIRE',
    theme: 'fire',
    parTime: 290,
    map: m,
    enemies: [
      { type: 'walker', x: 10, y: GROUND, patrol: [5, 14] },
      { type: 'walker', x: 23, y: GROUND, patrol: [21, 26] },
      { type: 'walker', x: 32, y: L2, patrol: [29, 35] },
      { type: 'walker', x: 45, y: L2, patrol: [41, 47] },
      { type: 'flyer', x: 62, y: 12, path: 'sine', amp: 3, span: 7 },
      { type: 'flyer', x: 78, y: 12, path: 'loop', amp: 3, span: 7 },
      { type: 'spitter', x: 97, y: GROUND, facing: -1 },
      { type: 'spitter', x: 112, y: L2, facing: -1 },
      { type: 'spitter', x: 124, y: L2, facing: -1 },
      { type: 'jumper', x: 146, y: L2, patrol: [145, 151] },
      { type: 'flyer', x: 155, y: 9, path: 'sine', amp: 3, span: 7 },
      { type: 'jumper', x: 172, y: L2, patrol: [169, 175] },
      { type: 'walker', x: 182, y: GROUND, patrol: [178, 188] },
      { type: 'spitter', x: 205, y: L2, facing: 1 },
      { type: 'flyer', x: 214, y: 9, path: 'loop', amp: 3, span: 6 },
      { type: 'walker', x: 236, y: L2, patrol: [232, 239] },
      { type: 'flyer', x: 266, y: 5, path: 'sine', amp: 2, span: 6 },
      { type: 'flyer', x: 292, y: 5, path: 'sine', amp: 2, span: 6 },
    ],
    hazards: [
      { type: 'firePillar', x: 30, y: GROUND },
      { type: 'firePillar', x: 38, y: GROUND, phase: 1.0 },
      { type: 'firePillar', x: 46, y: GROUND, phase: 2.0 },
      { type: 'fallingRock', x: 32, y: 2 },
      { type: 'fallingRock', x: 44, y: 2 },
      { type: 'firePillar', x: 154, y: GROUND, phase: 0.5 },
      { type: 'firePillar', x: 162, y: GROUND, phase: 1.8 },
      { type: 'firePillar', x: 190, y: GROUND, phase: 0.9 },
      { type: 'firePillar', x: 228, y: GROUND, phase: 1.4 },
      // Rising lava: arms at tile 240, stage two once the player passes 280.
      { type: 'risingLava', x: 240, midX: 280 },
    ],
    movers: [
      { x: 58, y: 14, path: [[57, 14], [65, 14]], speed: 64 },
      { x: 74, y: 14, path: [[73, 14], [81, 14]], speed: 64 },
      { x: 135, y: 14, path: [[134, 14], [138, 14]], speed: 64 },
      { x: 147, y: 14, path: [[146, 14], [150, 14]], speed: 64 },
      { x: 208, y: 14, path: [[206, 14], [211, 14]], speed: 64 },
      { x: 222, y: 14, path: [[220, 14], [225, 14]], speed: 64 },
      { x: 286, y: L3, path: [[285, L3], [289, L3]], speed: 64 },
    ],
  };
}

// ------------------------------------------------------------------ write
function emit(def) {
  const tiles = def.map.toStrings();
  const total = gemValue(def.map);
  const checkpoints = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < def.map.w; c++) {
      if (def.map.get(r, c) === 'K') checkpoints.push({ x: c, y: r + 1 });
    }
  }
  let gate = null;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < def.map.w; c++) {
      if (def.map.get(r, c) === 'G') gate = { x: c, y: r + 1 };
    }
  }

  const j = (v) => JSON.stringify(v);
  const lines = [];
  lines.push(`// ${def.name} — generated by tools/genlevels.mjs from PRD §9.`);
  lines.push('// The tile map below is plain text and can be hand-edited; the loader');
  lines.push('// validates it at startup (PRD §11).');
  lines.push('');
  lines.push('export default {');
  lines.push(`  name: ${j(def.name)},`);
  lines.push(`  theme: ${j(def.theme)},`);
  lines.push(`  parTime: ${def.parTime},`);
  lines.push(`  totalGemValue: ${total},`);
  lines.push('  tiles: [');
  for (const row of tiles) lines.push(`    ${j(row)},`);
  lines.push('  ],');
  lines.push(`  enemies: [`);
  for (const e of def.enemies) lines.push(`    ${j(e)},`);
  lines.push(`  ],`);
  lines.push(`  hazards: [`);
  for (const h of def.hazards) lines.push(`    ${j(h)},`);
  lines.push(`  ],`);
  lines.push(`  movers: [`);
  for (const mv of def.movers) lines.push(`    ${j(mv)},`);
  lines.push(`  ],`);
  lines.push(`  checkpoints: ${j(checkpoints)},`);
  lines.push(`  gate: ${j(gate)},`);
  lines.push('};');
  lines.push('');

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${def.key}.js`), lines.join('\n'), 'utf8');
  console.log(
    `${def.name.padEnd(6)} width ${String(def.map.w).padStart(3)}  gems ${String(total).padStart(3)}` +
    `  enemies ${String(def.enemies.length).padStart(2)}  checkpoints ${checkpoints.length}`
  );
}

for (const def of [trial(), earth(), water(), air(), fire()]) emit(def);
