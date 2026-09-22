// PRD §11 — the fixed ASCII legend. One character per tile column.

export const LEGEND = {
  '.': { name: 'empty',    kind: 'empty' },
  '#': { name: 'ground',   kind: 'solid' },      // blocks from every side
  '=': { name: 'oneway',   kind: 'oneway' },     // pass up through, land on top
  'B': { name: 'block',    kind: 'solid' },      // wall / pillar, stops bullets
  'o': { name: 'gem base', kind: 'gem', tier: 'base' },
  'd': { name: 'gem 2x',   kind: 'gem', tier: 'two' },
  'g': { name: 'gem 3x',   kind: 'gem', tier: 'three' },
  '^': { name: 'spikes',   kind: 'hazard', hazard: 'spikes' },
  '~': { name: 'liquid',   kind: 'hazard', hazard: 'liquid' },   // deep water or lava
  'C': { name: 'crumble',  kind: 'crumble' },
  'u': { name: 'lift',     kind: 'lift' },       // bubble column / updraft
  'W': { name: 'wind',     kind: 'wind' },
  'P': { name: 'start',    kind: 'start' },
  'K': { name: 'checkpoint', kind: 'checkpoint' },
  'G': { name: 'gate',     kind: 'gate' },
  'R': { name: 'rock',     kind: 'rock' },       // falling-rock trigger column
};

export const SOLID_CHARS = new Set(['#', 'B']);
export const ONEWAY_CHARS = new Set(['=']);
export const GEM_CHARS = { o: 'base', d: 'two', g: 'three' };

export function isKnownChar(c) {
  return Object.prototype.hasOwnProperty.call(LEGEND, c);
}
