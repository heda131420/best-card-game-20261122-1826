// cards.js — the deck: build it, draw from it, and price each card's power.
// A card is a plain object { uid, def, element, cost, damage, block, heal, draw, pierce }.

import { CARD_DEFS, DECK_COUNTS, ELEMENTS, COURT_BONUS, RESONANCE_BONUS, shuffle } from './config.js';

let uidCounter = 1;

/** One fresh copy of a card definition, with its own identity. */
export function makeCard(defId) {
  const def = CARD_DEFS.find((d) => d.id === defId);
  return {
    uid: `c${uidCounter++}`,
    defId: def.id,
    name: def.name,
    element: def.element,
    cost: def.cost,
    damage: def.damage ?? 0,
    block: def.block ?? 0,
    heal: def.heal ?? 0,
    draw: def.draw ?? 0,
    pierce: def.pierce ?? false,
    text: def.text,
  };
}

/** A fresh 24-card deck, shuffled with the given RNG. */
export function buildDeck(rng) {
  const ids = [];
  for (const [id, count] of Object.entries(DECK_COUNTS)) {
    for (let i = 0; i < count; i += 1) ids.push(id);
  }
  return shuffle(ids, rng).map((id) => makeCard(id));
}

/** The element of a card, as its full element record. */
export function elementOf(card) {
  return ELEMENTS[card.element];
}

/**
 * A card's effective power once court and resonance bonuses apply.
 * Court match: +2. Same element as the previous card played this turn: +1.
 * Returns { damage, block, heal } with the bonuses folded in.
 */
export function effectivePower(card, courtElement, lastElementPlayed) {
  const bonus = (card.element === courtElement ? COURT_BONUS : 0)
    + (lastElementPlayed !== null && card.element === lastElementPlayed ? RESONANCE_BONUS : 0);
  return {
    damage: card.damage + (card.damage > 0 ? bonus : 0),
    block: card.block + (card.block > 0 ? bonus : 0),
    heal: card.heal + (card.heal > 0 ? bonus : 0),
    bonus,
  };
}

/** The one-line power summary shown on a card face, e.g. "5 damage · draw 1". */
export function powerLine(card, courtElement, lastElementPlayed) {
  const p = effectivePower(card, courtElement, lastElementPlayed);
  const parts = [];
  if (p.damage > 0) parts.push(`${p.damage} damage${card.pierce ? ' through block' : ''}`);
  if (p.block > 0) parts.push(`${p.block} block`);
  if (p.heal > 0) parts.push(`heal ${p.heal}`);
  if (card.draw > 0) parts.push(`draw ${card.draw}`);
  return parts.join(' · ');
}
