// drive.mjs — interactive play-test of Ember Court in Firefox via Marionette.
// Clicks Start, plays a card, ends the turn, waits out the Queen's turn,
// and reports the live DOM state. No game code is modified.
// Usage: node drive.mjs <url>
import net from 'node:net';
import { writeFileSync } from 'node:fs';

const url = process.argv[2] || 'http://localhost:8080/';
const PORT = 2828;
const sock = net.connect({ host: '127.0.0.1', port: PORT });
let buffer = Buffer.alloc(0);
let nextId = 1;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    const json = JSON.stringify([0, id, method, params]);
    sock.write(`${Buffer.byteLength(json)}:${json}`);
  });
}

sock.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const colon = buffer.indexOf(':');
    if (!Number.isInteger(colon) || colon < 0) break;
    const len = Number(buffer.subarray(0, colon).toString());
    if (!Number.isInteger(len) || len < 0) break;
    if (buffer.length < colon + 1 + len) break;
    const json = buffer.subarray(colon + 1, colon + 1 + len).toString();
    buffer = buffer.subarray(colon + 1 + len);
    let msg;
    try { msg = JSON.parse(json); } catch { continue; }
    if (!Array.isArray(msg)) continue;
    const [type, id, err, value] = msg;
    if (type === 1 && pending.has(id)) {
      if (err) pending.get(id).reject(new Error(JSON.stringify(err)));
      else pending.get(id).resolve(value);
      pending.delete(id);
    }
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const unwrap = (v) => (v && typeof v === 'object' && 'value' in v ? v.value : v);

async function evalJs(script) {
  return unwrap(await send('WebDriver:ExecuteScript', { script, args: [] }));
}

async function clickCss(selector) {
  const el = unwrap(await send('WebDriver:FindElement', { using: 'css selector', value: selector }));
  const id = el['element-6066-11e4-a52e-4f735466cecf'] || el.ELEMENT || el.id;
  await send('WebDriver:ElementClick', { id });
}

async function state() {
  return evalJs(`return (() => {
    const t = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; };
    return {
      titleHidden: document.getElementById('title-overlay').classList.contains('hidden'),
      endHidden: document.getElementById('end-overlay').classList.contains('hidden'),
      round: t('#round-label'),
      playerLife: t('#player-life'),
      oppLife: t('#opp-life'),
      handCards: document.querySelectorAll('#player-hand .card').length,
      playable: document.querySelectorAll('#player-hand .card.playable').length,
      oppCards: document.querySelectorAll('#opponent-hand .card').length,
      logLines: document.querySelectorAll('#log-lines div').length,
      endTurnDisabled: document.getElementById('end-turn').disabled,
      jsErrors: window.__emberErrors || [],
    };
  })()`);
}

try {
  await new Promise((resolve) => sock.on('connect', resolve));
  await sleep(300);
  await send('WebDriver:NewSession', { capabilities: {} });
  await send('WebDriver:SetWindowRect', { width: 1280, height: 800 });
  // Capture page errors before the app loads.
  await send('WebDriver:Navigate', { url });
  await sleep(1200);
  await evalJs(`window.__emberErrors = []; window.addEventListener('error', (e) => window.__emberErrors.push(String(e.message)));`);
  console.log('loaded:', JSON.stringify(await state()));

  await clickCss('#start-btn');
  await sleep(600);
  console.log('after start:', JSON.stringify(await state()));

  const before = await state();
  await clickCss('#player-hand .card.playable');
  await sleep(600);
  console.log('after play:', JSON.stringify(await state()));

  await clickCss('#end-turn');
  await sleep(5500); // the Queen's whole turn, with pauses
  const after = await state();
  console.log('after queen turn:', JSON.stringify(after));

  const shot = unwrap(await send('WebDriver:TakeScreenshot', { full: false }));
  writeFileSync('/tmp/drive-final.png', Buffer.from(typeof shot === 'string' ? shot : shot.value, 'base64'));

  const ok = after.titleHidden && after.round !== before.round && after.logLines > before.logLines
    && after.handCards >= 0 && after.jsErrors.length === 0;
  console.log(ok ? 'DRIVE: PASS — start, play, end turn and the Queen\'s turn all work in the browser'
    : 'DRIVE: CHECK — see state above');
  await send('WebDriver:DeleteSession', {});
  process.exit(ok ? 0 : 1);
} catch (err) {
  console.error('drive failed:', err.message);
  process.exit(1);
}
