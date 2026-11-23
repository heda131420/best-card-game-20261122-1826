// state.js — the rules engine of Ember Court. No DOM here: pure game state,
// so the browser game, the screenshot scenes and the winnability check all
// play the same rules. Every mutating step appends events the renderer reads.

import {
  START_LIFE, MAX_ENERGY, OPENING_HAND, HAND_LIMIT, MAX_ROUNDS,
  ELEMENT_ORDER, COURT_BONUS, RESONANCE_BONUS,
} from './config.js';
import { buildDeck, effectivePower } from './cards.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_WON = 'won';
export const PHASE_LOST = 'lost';

function newSide(name, deck) {
  return {
    name, life: START_LIFE, block: 0, energy: 0, maxEnergy: 0,
    deck, hand: [], discard: [],
  };
}

/** A fresh game. `rng` decides shuffles; `seed` is recorded for replay. */
export function newGame(seed) {
  const game = {
    seed,
    round: 1,
    courtElement: ELEMENT_ORDER[0],
    phase: PHASE_TITLE,
    turn: 'player', // 'player' | 'opponent'
    player: newSide('You', buildDeck(seed.rng)),
    opponent: newSide('The Ashen Queen', buildDeck(seed.rng)),
    lastElementPlayed: null, // element of the last card played this turn (resonance)
    playedThisTurn: [], // cards played this turn, for the table display
    log: [],
    events: [], // consumed by the renderer, then cleared
    winner: null,
    stats: { cardsPlayed: 0, damageDealt: 0 },
  };
  return game;
}

/** Draw `n` cards for a side; reshuffles the discard pile when the deck runs out. */
export function drawCards(game, side, n) {
  for (let i = 0; i < n; i += 1) {
    if (side.hand.length >= HAND_LIMIT) return;
    if (side.deck.length === 0) {
      if (side.discard.length === 0) return;
      side.deck = side.discard;
      side.discard = [];
      // Reshuffle with the game's RNG through a fresh shuffle of the pile.
      for (let a = side.deck.length - 1; a > 0; a -= 1) {
        const b = Math.floor(game.seed.rng() * (a + 1));
        [side.deck[a], side.deck[b]] = [side.deck[b], side.deck[a]];
      }
      game.log.push(`${side.name} reshuffles the discard pile into the deck.`);
    }
    side.hand.push(side.deck.pop());
  }
}

/** Deal the opening hands and start round 1. */
export function startGame(game) {
  game.phase = PHASE_PLAY;
  game.turn = 'player';
  drawCards(game, game.player, OPENING_HAND);
  drawCards(game, game.opponent, OPENING_HAND);
  beginTurn(game, game.player);
  game.log.push('The court is Ember. Ember cards deal +2 this round.');
  return game;
}

/** Refill energy, draw a card, clear the turn's resonance chain. */
export function beginTurn(game, side) {
  side.maxEnergy = Math.min(game.round, MAX_ENERGY);
  side.energy = side.maxEnergy;
  side.block = 0; // block does not carry between turns
  game.lastElementPlayed = null;
  game.playedThisTurn = [];
  drawCards(game, side, 1);
  game.events.push({ type: 'turn', side: side === game.player ? 'player' : 'opponent', round: game.round });
}

/** The court element for the current round. */
export function courtElementFor(round) {
  return ELEMENT_ORDER[(round - 1) % ELEMENT_ORDER.length];
}

/** Can this side play this card right now? Returns a reason string or null. */
export function playBlocker(game, side, card) {
  if (game.phase !== PHASE_PLAY) return 'The duel has ended.';
  if ((side === game.player ? 'player' : 'opponent') !== game.turn) return 'It is not your turn.';
  if (!side.hand.some((c) => c.uid === card.uid)) return 'That card is not in hand.';
  if (card.cost > side.energy) return `Needs ${card.cost} energy — you have ${side.energy}.`;
  return null;
}

/** Apply damage to a side: block absorbs first, unless the hit pierces. */
export function applyDamage(game, target, amount, pierce) {
  let remaining = amount;
  if (!pierce && target.block > 0) {
    const absorbed = Math.min(target.block, remaining);
    target.block -= absorbed;
    remaining -= absorbed;
  }
  target.life -= remaining;
  return remaining; // life damage actually dealt
}

/**
 * Play a card. Assumes playBlocker returned null. Returns the resolution
 * { damage, block, heal, draw, bonus } for the renderer and the log.
 */
export function playCard(game, side, card) {
  const other = side === game.player ? game.opponent : game.player;
  const prevElement = game.lastElementPlayed;
  const power = effectivePower(card, game.courtElement, prevElement);
  const resonated = prevElement !== null && card.element === prevElement;
  side.energy -= card.cost;
  side.hand = side.hand.filter((c) => c.uid !== card.uid);
  side.discard.push(card);
  game.lastElementPlayed = card.element;
  game.playedThisTurn.push({ card, by: side === game.player ? 'player' : 'opponent', power });
  game.stats.cardsPlayed += 1;

  let dealt = 0;
  if (power.damage > 0) {
    dealt = applyDamage(game, other, power.damage, card.pierce);
    if (side === game.player) game.stats.damageDealt += dealt;
  }
  if (power.block > 0) side.block += power.block;
  if (power.heal > 0) side.life = Math.min(START_LIFE, side.life + power.heal);
  if (card.draw > 0) drawCards(game, side, card.draw);

  const who = side.name;
  const bits = [];
  if (power.damage > 0) bits.push(`deals ${power.damage} damage${card.pierce ? ' through block' : ''}`);
  if (power.block > 0) bits.push(`gains ${power.block} block`);
  if (power.heal > 0) bits.push(`restores ${power.heal} life`);
  if (card.draw > 0) bits.push('draws a card');
  const bonusNote = power.bonus > 0 ? ` (+${power.bonus}${resonated ? ' resonance' : ' court'})` : '';
  game.log.push(`${who} plays ${card.name}${bonusNote} — ${bits.join(', ')}.`);
  game.events.push({ type: 'play', by: side === game.player ? 'player' : 'opponent', card, power, dealt });

  checkEnd(game);
  return { damage: power.damage, block: power.block, heal: power.heal, draw: card.draw, bonus: power.bonus, dealt };
}

/** End the current side's turn; hand over to the other side (or a new round). */
export function endTurn(game) {
  if (game.phase !== PHASE_PLAY) return;
  if (game.turn === 'player') {
    game.turn = 'opponent';
    beginTurn(game, game.opponent);
  } else {
    game.round += 1;
    if (game.round > MAX_ROUNDS) {
      // A duel that runs the full 40 rounds goes to the higher life total.
      game.winner = game.player.life >= game.opponent.life ? 'player' : 'opponent';
      game.phase = game.winner === 'player' ? PHASE_WON : PHASE_LOST;
      game.log.push(`Forty rounds pass — the higher life total takes the court.`);
      game.events.push({ type: 'end', winner: game.winner });
      return;
    }
    game.courtElement = courtElementFor(game.round);
    game.turn = 'player';
    beginTurn(game, game.player);
    const names = { ember: 'Ember', tide: 'Tide', gale: 'Gale', stone: 'Stone' };
    game.log.push(`Round ${game.round} — the court turns ${names[game.courtElement]}. ${names[game.courtElement]} cards gain +2.`);
  }
}

/** Set the phase when a life total hits zero. */
export function checkEnd(game) {
  if (game.phase !== PHASE_PLAY) return;
  if (game.opponent.life <= 0) {
    game.opponent.life = 0;
    game.phase = PHASE_WON;
    game.winner = 'player';
    game.log.push('The Ashen Queen falls. The court is yours.');
    game.events.push({ type: 'end', winner: 'player' });
  } else if (game.player.life <= 0) {
    game.player.life = 0;
    game.phase = PHASE_LOST;
    game.winner = 'opponent';
    game.log.push('Your last ember fades. The Queen keeps the court.');
    game.events.push({ type: 'end', winner: 'opponent' });
  }
}

/** Is the game over? */
export function isOver(game) {
  return game.phase === PHASE_WON || game.phase === PHASE_LOST;
}
