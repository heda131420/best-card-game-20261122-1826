// input.js — mouse and keyboard for Ember Court. Click a card to play it,
// Space to end the turn, Enter to start or play again, M to mute, R to restart.
// All rules questions go to state.js; this file only translates gestures.

import { playBlocker, playCard, endTurn, isOver } from './state.js';
import { sfx, toggleMute } from './audio.js';
import { floatNumber, toast } from './render.js';

/**
 * Wire up the table. `hooks` supplies the live game and the callbacks the
 * host (main.js) owns: getGame, onPlayerCard, onEndTurn, onStart, onRestart.
 */
export function bindInput(hooks) {
  const $ = (id) => document.getElementById(id);

  $('player-hand').addEventListener('click', (event) => {
    const cardEl = event.target.closest('.card');
    if (!cardEl) return;
    const game = hooks.getGame();
    if (game.phase !== 'play' || game.turn !== 'player') return;
    const card = game.player.hand.find((c) => c.uid === cardEl.dataset.uid);
    if (!card) return;
    const blocker = playBlocker(game, game.player, card);
    if (blocker) {
      sfx.denied();
      toast(blocker);
      return;
    }
    const result = playCard(game, game.player, card);
    sfx.play();
    if (result.damage > 0) {
      sfx.hit();
      floatNumber('opponent', `-${result.dealt}`, '#ff6b5e');
    }
    if (result.heal > 0) { sfx.heal(); floatNumber('player', `+${result.heal}`, '#7ddb9a'); }
    if (result.block > 0) sfx.block();
    hooks.onPlayerCard(card, result);
  });

  $('end-turn').addEventListener('click', () => {
    const game = hooks.getGame();
    if (game.phase !== 'play' || game.turn !== 'player') return;
    sfx.turn();
    hooks.onEndTurn();
  });

  $('start-btn').addEventListener('click', () => { sfx.deal(); hooks.onStart(); });
  $('again-btn').addEventListener('click', () => { sfx.deal(); hooks.onRestart(); });
  $('restart-btn').addEventListener('click', () => { hooks.onRestart(); });
  $('mute-btn').addEventListener('click', () => {
    const muted = toggleMute();
    $('mute-btn').textContent = muted ? 'Sound: off' : 'Sound: on';
  });

  document.addEventListener('keydown', (event) => {
    const game = hooks.getGame();
    if (event.key === 'm' || event.key === 'M') {
      const muted = toggleMute();
      $('mute-btn').textContent = muted ? 'Sound: off' : 'Sound: on';
      return;
    }
    if (event.key === 'r' || event.key === 'R') { hooks.onRestart(); return; }
    if (event.key === 'Enter') {
      if (game.phase === 'title') { sfx.deal(); hooks.onStart(); }
      else if (isOver(game)) { sfx.deal(); hooks.onRestart(); }
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (game.phase === 'play' && game.turn === 'player') {
        sfx.turn();
        hooks.onEndTurn();
      }
    }
    // Number keys 1-7 play the card in that hand slot.
    if (/^[1-7]$/.test(event.key) && game.phase === 'play' && game.turn === 'player') {
      const card = game.player.hand[Number(event.key) - 1];
      if (!card) return;
      const blocker = playBlocker(game, game.player, card);
      if (blocker) { sfx.denied(); toast(blocker); return; }
      const result = playCard(game, game.player, card);
      sfx.play();
      if (result.damage > 0) { sfx.hit(); floatNumber('opponent', `-${result.dealt}`, '#ff6b5e'); }
      if (result.heal > 0) { sfx.heal(); floatNumber('player', `+${result.heal}`, '#7ddb9a'); }
      if (result.block > 0) sfx.block();
      hooks.onPlayerCard(card, result);
    }
  });
}
