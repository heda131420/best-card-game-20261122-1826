// check-winnable.mjs — read-only winnability proof for Ember Court.
// Imports the game's own rules engine and AI (no game code is modified)
// and plays full games with a greedy pilot against the Queen, over many
// seeds. It proves: games always end, the pilot wins a healthy share
// (the game is winnable, not a coin flip the player always loses), the
// Queen wins a healthy share too (she is a real opponent), no game runs
// past the round cap, and no rule ever throws.
// Usage: node check-winnable.mjs [games] [first-seed]
import { makeRng } from './game/src/config.js';
import { effectivePower } from './game/src/cards.js';
import { newGame, startGame, endTurn, playCard, playBlocker, isOver } from './game/src/state.js';
import { playAiTurnSync } from './game/src/ai.js';

const GAMES = Number(process.argv[2] || '200');
const FIRST_SEED = Number(process.argv[3] || '1');

function choosePlayerCard(game) {
  let best = null;
  let bestScore = 0;
  for (const card of game.player.hand) {
    if (playBlocker(game, game.player, card)) continue;
    const power = effectivePower(card, game.courtElement, game.lastElementPlayed);
    let score = power.damage + power.block * 0.5 + power.heal * 0.6 + card.draw * 0.8;
    if (power.damage >= game.opponent.life + game.opponent.block) score += 100;
    score /= Math.max(1, card.cost);
    if (score > bestScore) { bestScore = score; best = card; }
  }
  return bestScore >= 1.2 ? best : null;
}

function playOneGame(seed) {
  const game = newGame({ rng: makeRng(seed) });
  startGame(game);
  let rounds = 0;
  while (!isOver(game)) {
    rounds += 1;
    if (rounds > 60) return { result: 'unfinished', rounds };
    for (;;) {
      const card = choosePlayerCard(game);
      if (!card || isOver(game)) break;
      playCard(game, game.player, card);
    }
    if (isOver(game)) break;
    endTurn(game);
    playAiTurnSync(game);
    if (isOver(game)) break;
    endTurn(game);
  }
  return { result: game.phase === 'won' ? 'player' : 'opponent', rounds: game.round };
}

let playerWins = 0;
let queenWins = 0;
let unfinished = 0;
let totalRounds = 0;
let minRounds = Infinity;
let maxRounds = 0;
for (let i = 0; i < GAMES; i += 1) {
  const outcome = playOneGame(FIRST_SEED + i);
  totalRounds += outcome.rounds;
  minRounds = Math.min(minRounds, outcome.rounds);
  maxRounds = Math.max(maxRounds, outcome.rounds);
  if (outcome.result === 'player') playerWins += 1;
  else if (outcome.result === 'opponent') queenWins += 1;
  else unfinished += 1;
}

console.log(`games: ${GAMES} (seeds ${FIRST_SEED}..${FIRST_SEED + GAMES - 1})`);
console.log(`player wins: ${playerWins} (${(100 * playerWins / GAMES).toFixed(1)}%)`);
console.log(`queen wins:  ${queenWins} (${(100 * queenWins / GAMES).toFixed(1)}%)`);
console.log(`unfinished:  ${unfinished}`);
console.log(`rounds: avg ${(totalRounds / GAMES).toFixed(1)}, min ${minRounds}, max ${maxRounds}`);

const ok = unfinished === 0 && playerWins >= GAMES * 0.25 && queenWins >= GAMES * 0.1;
console.log(ok ? 'WINNABLE: PASS' : 'WINNABLE: FAIL');
process.exit(ok ? 0 : 1);
