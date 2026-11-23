// shots.js — the deterministic screenshot scenes behind ?shot=start|play|win|lose.
// Each one drives the real rules forward from a fresh game with a seeded RNG,
// steered by a simple greedy pilot, so every frame is what a real game looks
// like and the same seed always gives the same frame.

import { effectivePower } from './cards.js';
import {
  PHASE_TITLE, startGame, endTurn, playCard, playBlocker, isOver, drawCards,
} from './state.js';
import { playAiTurnSync } from './ai.js';

/** The pilot's pick: the affordable card with the best damage-per-energy. */
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

/** One full round: the pilot plays, then the Queen answers. */
function playRound(game, pilotPlays) {
  if (isOver(game)) return;
  if (pilotPlays) {
    for (;;) {
      const card = choosePlayerCard(game);
      if (!card || isOver(game)) break;
      playCard(game, game.player, card);
    }
  }
  if (isOver(game)) return;
  endTurn(game); // to the Queen
  playAiTurnSync(game);
  if (isOver(game)) return;
  endTurn(game); // new round, back to the player
}

/** Deal opening hands but keep the title screen up. */
function stageTitle(game) {
  startGame(game);
  game.phase = PHASE_TITLE;
}

/** A lively mid-game: three rounds in, partway through the player's turn. */
function stagePlay(game) {
  startGame(game);
  for (let round = 0; round < 3; round += 1) playRound(game, true);
  if (isOver(game)) return; // a fast game: the frame is still a real one
  // Play one card this turn so the played zone is full and the hand stays rich.
  let played = 0;
  for (;;) {
    const card = choosePlayerCard(game);
    if (!card || played >= 1 || isOver(game)) break;
    playCard(game, game.player, card);
    played += 1;
  }
}

/** A real win: pilot to victory, staging the endgame only if it drags. */
function stageWin(game) {
  startGame(game);
  for (let round = 0; round < 25 && !isOver(game); round += 1) playRound(game, true);
  if (isOver(game)) return;
  // Stage the endgame: the Queen is one blow from falling.
  game.opponent.life = 2;
  game.opponent.block = 0;
  let strike = game.player.hand.find((c) => c.damage > 0);
  if (!strike) {
    drawCards(game, game.player, 3);
    strike = game.player.hand.find((c) => c.damage > 0);
  }
  if (strike && !playBlocker(game, game.player, strike)) playCard(game, game.player, strike);
}

/** A real loss: a passive player who never plays a card. */
function stageLose(game) {
  startGame(game);
  for (let round = 0; round < 25 && !isOver(game); round += 1) playRound(game, false);
  if (isOver(game)) return;
  // Stage the endgame: one blow from the Queen ends it.
  game.player.life = 2;
  game.player.block = 0;
  endTurn(game);
  playAiTurnSync(game);
}

/**
 * Set `game` to the named scene (start, play, win or lose; any other name
 * is start). The game is fresh; the seed was fixed by the caller.
 */
export function stageShot(name, game) {
  if (name === 'play') stagePlay(game);
  else if (name === 'win') stageWin(game);
  else if (name === 'lose') stageLose(game);
  else stageTitle(game);
  return game;
}
