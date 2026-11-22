// main.js — boot + the fixed-step loop. It wires input, world, render and audio
// together, handles title / pause / restart keys, and drives the ?shot= scenes:
// staged scenes render frozen, the end scene plays the autopilot for real and
// raises window.__shotReady when the escape panel is on screen.
import { FIELD } from './config.js';
import { createWorld, updateWorld, startRun, losClear } from './world.js';
import { render } from './render.js';
import { createInput } from './input.js';
import { sfx } from './audio.js';
import { applyShot, autopilotStep } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? '1') || 1;

const canvas = document.getElementById('game');
canvas.width = FIELD.w;
canvas.height = FIELD.h;
const ctx = canvas.getContext('2d');

let world = createWorld(seed);
// The autopilot's cone checks need line-of-sight from the world module.
world.__los = (x1, y1, x2, y2) => losClear(world, x1, y1, x2, y2);
const input = createInput(canvas);

let shotReady = false;
let shotStatus = 'none';

if (shotName) {
  applyShot(world, shotName);
  if (shotName === 'end') shotStatus = 'autopilot';
}

const statusEl = document.getElementById('status');

function playEvents() {
  for (const e of world.events) {
    if (e === 'loot') sfx.loot();
    else if (e === 'crack') sfx.crack();
    else if (e === 'coin') sfx.coin();
    else if (e === 'dim') sfx.dim();
    else if (e === 'spotted') sfx.spotted();
    else if (e === 'escape') sfx.escape();
    else if (e === 'caught' || e === 'dawn') sfx.caught();
  }
}

function handleMetaKeys() {
  if (input.pauseQueued) {
    input.pauseQueued = false;
    if (world.phase === 'playing' && !world.frozen) {
      world.phase = 'paused';
    } else if (world.phase === 'paused') {
      world.phase = 'playing';
    }
  }
  if (input.confirmQueued) {
    input.confirmQueued = false;
    sfx.unlock();
    if (world.phase === 'title' || world.phase === 'escaped' || world.phase === 'caught' || world.phase === 'dawn') {
      if (shotName) return; // screenshots never restart themselves
      const seedNext = world.seed;
      world = startRun(createWorld(seedNext));
      world.__los = (x1, y1, x2, y2) => losClear(world, x1, y1, x2, y2);
    }
  }
}

const STEP = 1 / 60;
let acc = 0;
let last = performance.now();
let shotTimer = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  handleMetaKeys();

  if (world.phase === 'playing' && !world.frozen) {
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 5) {
      if (world.autopilot) {
        shotStatus = autopilotStep(world, world.autopilot, STEP, input) || shotStatus;
      }
      updateWorld(world, STEP, input);
      playEvents();
      acc -= STEP;
      guard += 1;
      if (world.phase !== 'playing') break;
    }
    if (guard >= 5) acc = 0;
  } else if (world.frozen) {
    // Staged scenes still breathe: pulses and the blinking prompt animate.
    world.time += dt;
  }

  render(ctx, world);
  if (statusEl) {
    statusEl.textContent =
      world.phase === 'title'
        ? 'MIDNIGHT MINT — press Space to begin'
        : world.phase === 'playing'
          ? `Alarm ${Math.round(world.alarm)}% · Loot ${world.lootPoints} · Dawn ${Math.max(0, world.dawnLeft).toFixed(0)}s`
          : world.endReason || world.phase;
  }

  // Screenshot readiness: staged scenes are ready on the second frame; the
  // getaway waits for the real ESCAPED panel, then holds it a beat.
  if (shotName && !shotReady) {
    if (shotName === 'end') {
      if (world.phase === 'escaped') {
        shotTimer += dt;
        if (shotTimer > 0.6) {
          shotReady = true;
          shotStatus = 'escaped';
        }
      } else if (world.autopilot && world.autopilot.failed) {
        shotReady = true;
        shotStatus = 'autopilot-failed';
      }
    } else if (now - frame.t0 > 100) {
      shotReady = true;
      shotStatus = 'staged';
    }
  }
  window.__shotReady = shotReady;
  window.__shotStatus = shotStatus;
  window.__game = { world, input };
  requestAnimationFrame(frame);
}
frame.t0 = performance.now();
requestAnimationFrame(frame);
