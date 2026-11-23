// render.js — every pixel of Ember Court's table. Builds card faces from the
// game's own data, paints life bars, energy, hands, the played zone and the
// chronicle, and runs the title / victory / defeat overlays.

import { ELEMENTS, GLYPHS, START_LIFE } from './config.js';
import { elementOf, effectivePower, powerLine } from './cards.js';
import { PHASE_TITLE, PHASE_WON, PHASE_LOST } from './state.js';

const $ = (id) => document.getElementById(id);

/** An inline SVG of an element's shape, in the given colour. */
export function glyphSvg(elementKey, color) {
  const glyph = GLYPHS[ELEMENTS[elementKey].glyph];
  return `<svg viewBox="0 0 64 64" fill="${color}" aria-hidden="true"><path d="${glyph}"/></svg>`;
}

/** A card face. `opts`: mini (small, for the played zone), state for the player's hand. */
export function cardElement(card, courtElement, lastElementPlayed, opts = {}) {
  const el = elementOf(card);
  const power = effectivePower(card, courtElement, lastElementPlayed);
  const div = document.createElement('div');
  div.className = 'card' + (opts.mini ? ' mini' : '');
  if (opts.playable) div.classList.add('playable');
  if (opts.unaffordable) div.classList.add('unaffordable');
  if (opts.selected) div.classList.add('selected');
  if (opts.justPlayed) div.classList.add('just-played');
  div.dataset.uid = card.uid;
  div.setAttribute('role', 'button');
  div.setAttribute('aria-label', `${card.name}, cost ${card.cost}, ${card.text}`);
  div.innerHTML = `
    <div class="cost">${card.cost}</div>
    <div class="element-band" style="background:${el.color}">${glyphSvg(card.element, '#ffffff')}${el.name}</div>
    <div class="art" style="background:radial-gradient(circle at 50% 60%, ${el.glow}55, ${el.dark} 78%)">${glyphSvg(card.element, el.glow)}</div>
    <div class="card-name">${card.name}</div>
    <div class="card-text">${card.text}</div>
    <div class="power">${powerLine(card, courtElement, lastElementPlayed)}${power.bonus > 0 ? `  (+${power.bonus})` : ''}</div>`;
  return div;
}

/** A face-down card back for the Queen's hand. */
export function cardBackElement() {
  const div = document.createElement('div');
  div.className = 'card back';
  div.innerHTML = `<div class="back-inner">${glyphSvg('ember', '#f2c94c')}</div>`;
  return div;
}

function renderFighter(prefix, side) {
  $(`${prefix}-life`).textContent = `${side.life} ❤`;
  const fill = $(`${prefix}-life-fill`);
  fill.style.width = `${Math.max(0, (side.life / START_LIFE) * 100)}%`;
  fill.classList.toggle('low', side.life <= 8);
  const block = $(`${prefix}-block`);
  block.hidden = side.block <= 0;
  block.textContent = `🛡 ${side.block}`;
  const energy = $(`${prefix}-energy`);
  energy.innerHTML = '';
  for (let i = 0; i < side.maxEnergy; i += 1) {
    const gem = document.createElement('span');
    gem.className = 'energy-gem' + (i < side.energy ? '' : ' spent');
    energy.appendChild(gem);
  }
  const label = document.createElement('span');
  label.textContent = `${side.energy}/${side.maxEnergy} energy`;
  energy.appendChild(label);
  $(`${prefix}-deck`).textContent = `Deck ${side.deck.length} · Discard ${side.discard.length}`;
}

function renderHands(game) {
  const oppHand = $('opponent-hand');
  oppHand.innerHTML = '';
  for (const _card of game.opponent.hand) oppHand.appendChild(cardBackElement());

  const hand = $('player-hand');
  hand.innerHTML = '';
  const myTurn = game.turn === 'player' && game.phase === 'play';
  for (const card of game.player.hand) {
    const affordable = card.cost <= game.player.energy;
    const el = cardElement(card, game.courtElement, game.lastElementPlayed, {
      playable: myTurn && affordable,
      unaffordable: myTurn && !affordable,
    });
    hand.appendChild(el);
  }
}

function renderPlayedZone(game) {
  const zone = $('played-zone');
  zone.innerHTML = '';
  const recent = game.playedThisTurn.slice(-3);
  if (recent.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = game.turn === 'player'
      ? 'Your move — play a card, or end your turn.'
      : 'The Queen is thinking…';
    zone.appendChild(hint);
    return;
  }
  const label = document.createElement('div');
  label.className = 'played-label';
  label.textContent = 'Last played:';
  zone.appendChild(label);
  for (const entry of recent) {
    zone.appendChild(cardElement(entry.card, game.courtElement, null, { mini: true, justPlayed: true }));
  }
}

function renderLog(game) {
  const lines = $('log-lines');
  lines.innerHTML = '';
  for (const line of game.log.slice(-30)) {
    const div = document.createElement('div');
    if (line.startsWith('You ')) div.className = 'log-you';
    else if (line.startsWith('The Ashen Queen')) div.className = 'log-queen';
    div.textContent = line;
    lines.appendChild(div);
  }
  const panel = $('log-panel');
  panel.scrollTop = panel.scrollHeight;
}

/** Paint the whole table from the game state. */
export function render(game) {
  const court = ELEMENTS[game.courtElement];
  const banner = $('court-banner');
  banner.innerHTML = `${glyphSvg(game.courtElement, court.glow)} Court: ${court.name} · +2 power`;
  banner.style.borderColor = court.color;
  $('round-label').textContent = `Round ${game.round}`;
  renderFighter('player', game.player);
  renderFighter('opp', game.opponent);
  renderHands(game);
  renderPlayedZone(game);
  renderLog(game);

  $('end-turn').disabled = game.turn !== 'player' || game.phase !== 'play';
  $('title-overlay').classList.toggle('hidden', game.phase !== PHASE_TITLE);
  const over = game.phase === PHASE_WON || game.phase === PHASE_LOST;
  $('end-overlay').classList.toggle('hidden', !over);
  if (over) {
    $('end-title').textContent = game.phase === PHASE_WON ? 'VICTORY' : 'DEFEAT';
    $('end-text').textContent = game.phase === PHASE_WON
      ? 'The Ashen Queen kneels. The Ember Court is yours — every flame in the hall bows to its new keeper.'
      : 'Your last ember fades to ash. The Queen keeps her throne — for now. The court remembers a good duel.';
    $('end-stats').innerHTML = `Rounds: <b>${game.round}</b> · Cards played: <b>${game.stats.cardsPlayed}</b> · Damage dealt: <b>${game.stats.damageDealt}</b>`;
  }
  $('status').textContent = game.phase === PHASE_WON
    ? 'Victory. You won the duel.'
    : game.phase === PHASE_LOST
      ? 'Defeat. The Queen won the duel.'
      : `Round ${game.round}, ${game.turn === 'player' ? 'your turn' : "the Queen's turn"}. You have ${game.player.life} life, the Queen has ${game.opponent.life}.`;
}

/** A floating damage/heal number over a fighter's portrait. */
export function floatNumber(side, text, color) {
  const target = side === 'player' ? $('player-fighter') : $('opponent-fighter');
  const rect = target.getBoundingClientRect();
  const span = document.createElement('span');
  span.className = 'float-num';
  span.textContent = text;
  span.style.color = color;
  span.style.left = `${rect.left + rect.width / 2}px`;
  span.style.top = `${rect.top + 10}px`;
  document.body.appendChild(span);
  setTimeout(() => span.remove(), 1150);
}

let toastTimer = null;
/** A short message at the bottom of the screen. */
export function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}
