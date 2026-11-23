// ai.js — the Ashen Queen's brain. A greedy heuristic she plays openly:
// take lethal when she sees it, heal when hurt, block when threatened,
// and otherwise spend energy on the best damage she can buy.
// She reads the same court and resonance bonuses the player does.

import { START_LIFE } from './config.js';
import { effectivePower } from './cards.js';
import { playBlocker, playCard } from './state.js';

/** Score one playable card for the AI, in the current game state. */
export function scoreCard(game, card) {
  const ai = game.opponent;
  const player = game.player;
  const power = effectivePower(card, game.courtElement, game.lastElementPlayed);
  let score = 0;
  // Damage is worth its face value, more when it ends the duel.
  if (power.damage > 0) {
    score += power.damage;
    if (power.damage >= player.life + player.block) score += 100;
  }
  // Block matters when the player can hit back hard next turn.
  if (power.block > 0) {
    const threatened = player.life > 0 && ai.life <= 12;
    score += power.block * (threatened ? 0.9 : 0.45);
  }
  // Healing matters most when hurt.
  if (power.heal > 0) {
    const missing = START_LIFE - ai.life;
    score += Math.min(power.heal, missing) * (ai.life <= 10 ? 1.3 : 0.6);
  }
  // A drawn card is worth about half an energy of value.
  if (card.draw > 0) score += 1.2;
  // Value per energy spent: cheap efficient cards win ties.
  return score / Math.max(1, card.cost);
}

/**
 * The Queen's best playable card right now, or null when nothing earns its
 * energy. Pure: no state changes, so the screenshot scenes can drive her
 * synchronously with the same brain the live game uses.
 */
export function chooseAiCard(game) {
  const ai = game.opponent;
  let best = null;
  let bestScore = 0;
  for (const card of ai.hand) {
    if (playBlocker(game, ai, card)) continue;
    const score = scoreCard(game, card);
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  if (!best || bestScore < 1.4) return null;
  return best;
}

/**
 * The AI's whole turn, played one card at a time with a pause between
 * cards so the player can watch her hand shrink. `pause` is awaited
 * between plays; `onPlay` is called after each card for the renderer.
 * Returns when she has nothing good left to play.
 */
export async function playAiTurn(game, pause, onPlay) {
  for (;;) {
    if (game.phase !== 'play') return;
    const best = chooseAiCard(game);
    if (!best) return;
    playCard(game, game.opponent, best);
    if (onPlay) onPlay(best);
    await pause();
    if (game.phase !== 'play') return;
  }
}

/** The Queen's whole turn with no pauses, for tests and screenshot scenes. */
export function playAiTurnSync(game) {
  for (;;) {
    if (game.phase !== 'play') return;
    const best = chooseAiCard(game);
    if (!best) return;
    playCard(game, game.opponent, best);
  }
}
