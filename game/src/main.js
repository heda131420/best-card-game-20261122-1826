// main.js — Ember Court's bootstrap. Owns the live game, runs the Queen's
// turn with pauses so her plays are watchable, and stages the deterministic
// screenshot scenes (?shot=start|play|win|lose&seed=N).

import { makeRng } from './config.js';
import { newGame, startGame, endTurn, isOver, PHASE_WON, PHASE_LOST } from './state.js';
import { playAiTurn } from './ai.js';
import { render, floatNumber } from './render.js';
import { bindInput } from './input.js';
import { sfx } from './audio.js';
import { stageShot } from './shots.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let game = newGame({ rng: makeRng((Date.now() % 2147483647) || 1) });
let aiRunning = false;

/** Run the Queen's turn, then hand the table back to the player. */
async function runAiTurn() {
  if (aiRunning) return;
  aiRunning = true;
  sfx.queen();
  render(game);
  await sleep(650);
  await playAiTurn(
    game,
    () => sleep(750),
    (card) => {
      sfx.play();
      render(game);
    },
  );
  aiRunning = false;
  if (game.phase === 'play') {
    endTurn(game); // back to the player, new round, court turns
    sfx.turn();
    render(game);
  } else {
    render(game);
    if (game.phase === PHASE_WON) sfx.win();
    if (game.phase === PHASE_LOST) sfx.lose();
  }
}

function afterPlayerAction() {
  render(game);
  if (game.phase === PHASE_WON) { sfx.win(); return; }
  if (game.phase === PHASE_LOST) { sfx.lose(); return; }
}

const hooks = {
  getGame: () => game,
  onPlayerCard: () => afterPlayerAction(),
  onEndTurn: () => {
    endTurn(game);
    render(game);
    if (game.phase === 'play') void runAiTurn();
    else afterPlayerAction();
  },
  onStart: () => {
    startGame(game);
    render(game);
  },
  onRestart: () => {
    game = newGame({ rng: makeRng((Date.now() % 2147483647) || 1) });
    aiRunning = false;
    startGame(game);
    render(game);
  },
};

bindInput(hooks);

// Screenshot scenes: ?shot=start|play|win|lose&seed=1 stages a deterministic
// game from the real rules and renders it, so the screenshots are the game.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  const seed = Number(params.get('seed') || '1');
  game = newGame({ rng: makeRng(seed) });
  stageShot(shot, game);
  render(game);
  document.title = `Ember Court — ${shot}`;
} else {
  render(game);
}
