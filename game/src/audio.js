// audio.js — all sound is synthesized with WebAudio; no audio files.
// A soft click for cards, a thud for damage, a chime for healing,
// a low swell for the Queen's turn, and a short fanfare for victory.

let ctx = null;
let muted = false;

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; return muted; }

/** One oscillator note: frequency, seconds, shape, gain. */
function tone(freq, seconds, shape = 'sine', gain = 0.12, when = 0) {
  if (muted) return;
  const ac = audioCtx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = shape;
  osc.frequency.setValueAtTime(freq, t0);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + seconds + 0.05);
}

export const sfx = {
  click() { tone(660, 0.07, 'triangle', 0.08); },
  deal() { tone(520, 0.06, 'triangle', 0.07); tone(780, 0.06, 'triangle', 0.05, 0.05); },
  play() { tone(440, 0.09, 'triangle', 0.1); tone(660, 0.1, 'triangle', 0.09, 0.06); },
  hit() { tone(140, 0.18, 'sawtooth', 0.14); tone(90, 0.22, 'square', 0.08, 0.02); },
  heal() { tone(523, 0.16, 'sine', 0.1); tone(784, 0.2, 'sine', 0.08, 0.08); },
  block() { tone(220, 0.12, 'square', 0.06); },
  turn() { tone(330, 0.1, 'triangle', 0.07); tone(392, 0.12, 'triangle', 0.07, 0.09); },
  queen() { tone(196, 0.3, 'sawtooth', 0.05); tone(147, 0.35, 'sawtooth', 0.05, 0.1); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.11, i * 0.12)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, 'sine', 0.1, i * 0.14)); },
  denied() { tone(160, 0.12, 'square', 0.07); },
};
