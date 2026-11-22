// audio.js — all sound is WebAudio oscillators, no audio files, no network.
// The context is created lazily on the first user gesture so browsers allow it.
let ctx = null;

function ensure() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function blip(freq, dur, type, gain, when = 0) {
  const ac = ensure();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  unlock() {
    ensure();
  },
  // A coin picked up: bright two-note chime.
  loot() {
    blip(880, 0.12, 'sine', 0.12);
    blip(1318, 0.18, 'sine', 0.1, 0.07);
  },
  // Glass breaking on the Aurora case.
  crack() {
    blip(2400, 0.08, 'square', 0.05);
    blip(1800, 0.12, 'square', 0.05, 0.05);
    blip(1200, 0.2, 'triangle', 0.08, 0.1);
  },
  // Hush Coin landing: a soft metallic ping.
  coin() {
    blip(1568, 0.25, 'sine', 0.1);
    blip(2093, 0.2, 'sine', 0.05, 0.03);
  },
  // Lantern going dark: a low falling tone.
  dim() {
    blip(320, 0.3, 'triangle', 0.09);
    blip(180, 0.35, 'triangle', 0.08, 0.08);
  },
  // Spotted: a short alarm pulse.
  spotted() {
    blip(440, 0.15, 'sawtooth', 0.07);
    blip(440, 0.15, 'sawtooth', 0.07, 0.18);
  },
  // Escape: a little rising fanfare.
  escape() {
    [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'sine', 0.1, i * 0.09));
  },
  // Caught or dawn: a low descending line.
  caught() {
    [392, 330, 262, 196].forEach((f, i) => blip(f, 0.25, 'sawtooth', 0.06, i * 0.11));
  },
};
