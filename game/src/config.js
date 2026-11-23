// config.js — Ember Court: constants, the four elements, the card list, palette.
// Every number the rules engine and the renderer share lives here.

export const START_LIFE = 24;
export const MAX_ENERGY = 6;
export const OPENING_HAND = 4;
export const HAND_LIMIT = 7;
export const MAX_ROUNDS = 40;

/** The four elements. Colour AND shape tell them apart (never text alone). */
export const ELEMENTS = {
  ember: { key: 'ember', name: 'Ember', color: '#e2483d', dark: '#7a1d16', glow: '#ff7a4d', glyph: 'flame' },
  tide: { key: 'tide', name: 'Tide', color: '#2f7fe0', dark: '#123a6e', glow: '#6db3ff', glyph: 'wave' },
  gale: { key: 'gale', name: 'Gale', color: '#3fae6a', dark: '#14532d', glow: '#7ddb9a', glyph: 'wind' },
  stone: { key: 'stone', name: 'Stone', color: '#c99a2e', dark: '#6b4d0d', glow: '#f2c94c', glyph: 'peak' },
};
export const ELEMENT_ORDER = ['ember', 'tide', 'gale', 'stone'];

/** Court bonus: a card whose element matches the round's court element gets +2 power. */
export const COURT_BONUS = 2;
/** Resonance: a second card of the same element in one turn gets +1 power. */
export const RESONANCE_BONUS = 1;

/**
 * The deck every duellist brings: 24 cards, 6 per element.
 * damage / block / heal / draw are the card's base power; pierce ignores block.
 */
export const CARD_DEFS = [
  // Ember — the aggressive element.
  { id: 'cinder-slash', name: 'Cinder Slash', element: 'ember', cost: 1, damage: 3, text: 'Deal 3 damage.' },
  { id: 'flame-lash', name: 'Flame Lash', element: 'ember', cost: 2, damage: 5, text: 'Deal 5 damage.' },
  { id: 'inferno', name: 'Inferno', element: 'ember', cost: 4, damage: 9, text: 'Deal 9 damage.' },
  // Tide — the flowing element: damage that also draws.
  { id: 'tide-pull', name: 'Tide Pull', element: 'tide', cost: 1, damage: 2, draw: 1, text: 'Deal 2 damage. Draw a card.' },
  { id: 'deep-current', name: 'Deep Current', element: 'tide', cost: 2, damage: 3, draw: 1, text: 'Deal 3 damage. Draw a card.' },
  { id: 'moonwell', name: 'Moonwell', element: 'tide', cost: 2, heal: 4, text: 'Restore 4 life.' },
  // Gale — the fast element: cheap tempo.
  { id: 'swift-cut', name: 'Swift Cut', element: 'gale', cost: 1, damage: 2, text: 'Deal 2 damage.' },
  { id: 'storm-rush', name: 'Storm Rush', element: 'gale', cost: 3, damage: 6, text: 'Deal 6 damage.' },
  { id: 'second-wind', name: 'Second Wind', element: 'gale', cost: 2, heal: 3, draw: 1, text: 'Restore 3 life. Draw a card.' },
  // Stone — the patient element: block, and one piercing blow.
  { id: 'stone-wall', name: 'Stone Wall', element: 'stone', cost: 1, block: 5, text: 'Gain 5 block.' },
  { id: 'bastion', name: 'Bastion', element: 'stone', cost: 2, block: 8, text: 'Gain 8 block.' },
  { id: 'quake', name: 'Quake', element: 'stone', cost: 3, damage: 5, pierce: true, text: 'Deal 5 damage through block.' },
];

/** How many copies of each card a deck holds. */
export const DECK_COUNTS = {
  'cinder-slash': 3, 'flame-lash': 2, 'inferno': 1,
  'tide-pull': 2, 'deep-current': 2, 'moonwell': 2,
  'swift-cut': 3, 'storm-rush': 2, 'second-wind': 1,
  'stone-wall': 3, 'bastion': 2, 'quake': 1,
};

export const PLAYER_NAME = 'You';
export const OPPONENT_NAME = 'The Ashen Queen';

export const PALETTE = {
  table: '#1d3a2f',
  tableEdge: '#0f1f18',
  gold: '#d8b25c',
  parchment: '#f4e8cf',
  ink: '#241a12',
};

/** SVG glyph paths, one per element shape, drawn at any size. viewBox 0 0 64 64. */
export const GLYPHS = {
  flame: 'M32 6 C38 18 50 24 50 40 A18 18 0 1 1 14 40 C14 30 22 26 26 18 C28 24 30 26 32 26 C30 18 30 12 32 6 Z',
  wave: 'M6 26 C16 16 24 36 32 26 C40 16 48 36 58 26 L58 40 C48 50 40 30 32 40 C24 50 16 30 6 40 Z M6 44 C16 34 24 54 32 44 C40 34 48 54 58 44 L58 54 L6 54 Z',
  wind: 'M10 22 A12 12 0 1 1 34 22 L54 22 M14 34 A9 9 0 1 0 32 34 L54 34 M18 46 A6 6 0 1 0 30 46 L54 46',
  peak: 'M8 52 L26 14 L38 34 L46 22 L58 52 Z M26 52 L32 40 L38 52 Z',
};

/** mulberry32: a tiny seeded RNG so screenshots and tests replay exactly. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle with the given RNG; returns a new array. */
export function shuffle(array, rng) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
