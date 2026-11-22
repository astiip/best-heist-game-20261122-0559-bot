// shots.js — the four screenshot scenes plus the autopilot that genuinely plays
// the game to a win for the getaway shot. Staged scenes set real world state
// and let render.js draw it; nothing here fakes a pixel.
// The autopilot walks short hops and waits whenever a vision cone covers the
// next hop, the midpoint, or Wren herself — the same reading-a-patrol skill a
// human player needs.
import { TUNE } from './config.js';
import { pointBlocked } from './world.js';

function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function cameraAngleAt(cam, time) {
  return cam.baseAngle + cam.sweep * Math.sin(time * TUNE.camSweepSpeed * 2 + cam.phase * 2.4);
}

// Walk every guard along its patrol for `seconds` so a title screenshot shows
// the hall mid-patrol instead of everyone standing at a start line.
export function advancePatrol(world, seconds) {
  const step = 0.05;
  for (let t = 0; t < seconds; t += step) {
    for (const g of world.guards) {
      const wp = g.waypoints[g.wp];
      const d = dist(g.x, g.y, wp.x, wp.y);
      if (d < 6) {
        g.wp = (g.wp + 1) % g.waypoints.length;
        continue;
      }
      const ang = Math.atan2(wp.y - g.y, wp.x - g.x);
      g.facing = ang;
      g.x += Math.cos(ang) * g.speed * step;
      g.y += Math.sin(ang) * g.speed * step;
    }
  }
  for (const cam of world.cameras) cam.angle = cameraAngleAt(cam, seconds);
}

// --- staged scenes (frozen: main.js renders them without stepping the world) ---
export function applyShot(world, name) {
  if (name === 'start') {
    world.phase = 'title';
    world.time = 12;
    advancePatrol(world, 12);
    world.frozen = true;
    return;
  }
  if (name === 'play') {
    world.phase = 'playing';
    world.time = 95;
    world.dawnLeft = 140; // 2:20 left
    world.alarm = 12;
    world.maxAlarm = 12;
    world.lootPoints = 100;
    world.score = 100;
    world.level.loot[0].taken = true; // one gold bar already pocketed
    world.thief.x = 640;
    world.thief.y = 432; // crouched behind the middle crown case
    world.thief.crouch = true;
    world.coins.push({ x: 560, y: 455, sparkle: 0.4, lureLeft: 3 });
    const [g1, g2, g3] = world.guards;
    g1.x = 450; g1.y = 340; g1.facing = Math.PI / 2; // cone sweeps down, just past Wren
    g2.x = 200; g2.y = 400; g2.facing = -Math.PI / 2;
    g3.x = 1080; g3.y = 350; g3.facing = Math.PI / 2;
    world.cameras[0].angle = Math.PI / 2 - 0.7;
    world.cameras[1].angle = Math.PI + 0.35;
    world.frozen = true;
    return;
  }
  if (name === 'alarm') {
    world.phase = 'playing';
    world.time = 60;
    world.dawnLeft = 120; // 2:00 left
    world.alarm = 58;
    world.maxAlarm = 58;
    world.seenNow = true;
    world.seenBy = 'camera';
    world.spottedFlash = 0.5;
    world.lootPoints = 100;
    world.score = 100;
    world.level.loot[1].taken = true;
    world.thief.x = 700;
    world.thief.y = 300; // caught inside the top camera's red cone
    const [g1, g2, g3] = world.guards;
    g1.x = 560; g1.y = 260; g1.facing = Math.atan2(300 - 260, 700 - 560); // turning to Wren
    g2.x = 200; g2.y = 500; g2.facing = -Math.PI / 2;
    g3.x = 1080; g3.y = 250; g3.facing = Math.PI / 2;
    world.cameras[0].angle = Math.PI / 2; // staring straight down at Wren
    world.cameras[1].angle = Math.PI + 0.3;
    world.level.lanterns[1].dimUntil = world.time + 5; // one lantern out nearby
    world.frozen = true;
    return;
  }
  if (name === 'end') {
    world.phase = 'playing';
    world.time = 0;
    world.autopilot = createAutopilot();
    world.frozen = false;
  }
}

// --- the autopilot: left lane, middle gold bar, Aurora case, exit window ---
// The route is split into segments. A segment is only started when EVERY
// point in it is out of every vision cone right now, and the thief then
// sprints the whole segment without stopping — because the one thing that
// gets a thief caught is waiting in the open. Waiting happens only at
// staging points (the left lane and the pillar-shadowed gold bar), which are
// out of every cone at all times. If the alarm climbs past 55 while seen,
// the autopilot aborts to the last staging point and tries again.
const SEGMENTS = [
  { pts: [[150, 600], [150, 480], [150, 300], [150, 200], [330, 260]], gate: true, stage: true },
  { pts: [[500, 240], [650, 300]], gate: false, stage: true }, // gold bar, shadowed by a pillar
  // The Aurora run goes SOUTH, under the hall, not along Warden Hale's top
  // edge: the old northern sprint ran parallel to his patrol, ahead of his
  // cone, and he chased the thief the whole way to the glass. The southern
  // route is out of camera A's range and off Hale's patrol. Pike is handled
  // with the Hush Coin (see the lure in autopilotStep): a coin dropped just
  // south of him pulls him away from the glass for 4 seconds.
  { pts: [[750, 300], [750, 460]], gate: false, stage: true },
  // The climb up the right side is gated on camera B's sweep, not on every
  // point being safe at once: the two lower points have opposite camera-B
  // windows (bearings 164° vs 212°), so they are never safe together except
  // in a 4° sliver. Instead the climb starts when camera B is at the TOP of
  // its sweep (angle 200-235°): the (1000, 430) leg is clean, the
  // (1150, 300) leg takes ~0.7s of camera exposure (+25 alarm), and the
  // crack runs while camera B falls back down. The wait happens at
  // (750, 460), which is out of both cameras' range and off every patrol.
  { pts: [[1000, 430], [1150, 300], [1120, 180], [1075, 145]], gate: false, gateCamB: true, stage: false, crack: true },
  { pts: [[1200, 250], [1200, 450], [1200, 630]], gate: false, stage: false }, // sprint out
];
// Staging points, in route order: where the autopilot may wait and retreat to.
const STAGES = [
  { seg: 0, pt: 4 }, // (330, 260)
  { seg: 1, pt: 1 }, // (650, 300)
  { seg: 2, pt: 1 }, // (750, 460)
];

export function createAutopilot() {
  return { seg: 0, pt: 0, waitT: 0, elapsed: 0, failed: false, retreating: false, stageIdx: -1 };
}

function coneCovers(world, eyeX, eyeY, facing, range, tx, ty) {
  const d = dist(eyeX, eyeY, tx, ty);
  if (d > range) return false;
  let diff = Math.atan2(ty - eyeY, tx - eyeX) - facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= TUNE.coneAngle / 2;
}

// Is (x, y) inside any live vision cone with a clear line of sight, or
// dangerously close to a guard? Imported losClear lives in world.js; to keep
// this file dependency-light we re-check line of sight through the same
// obstacles by reusing the world's own helper via a lazy import-free path:
// the world object carries level data, and losClear is attached by main.js.
export function guardByName(world, name) {
  for (const g of world.guards) if (g.name === name) return g;
  return world.guards[2];
}

// Warden Pike's cone: the right-side guard. A Hush Coin dropped just south
// of him is always nearest to him (no other guard patrols the right side),
// so it pulls him away from the glass for 4 seconds.
function pikeCovers(world, x, y) {
  const pike = guardByName(world, 'Warden Pike');
  const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  return pike.mode !== 'chase'
    && dist(pike.x, pike.y, x, y) <= TUNE.coneRange
    && coneCovers(pike.x, pike.y, pike.facing, TUNE.coneRange, x, y)
    && world.__los(pike.x, pike.y, x, y);
}

function throwPikeLure(world, input) {
  const pike = guardByName(world, 'Warden Pike');
  input.throwTarget = { x: 1080, y: Math.min(620, pike.y + 120) };
}

function dangerAt(world, x, y) {
  for (const g of world.guards) {
    // 45px: a guard right on top of the point. Any wider and the left lane
    // deadlocks — Warden Moss walks 50px from it, cone pointing away.
    if (dist(g.x, g.y, x, y) < 45) return true;
    if (coneCovers(world, g.x, g.y, g.facing, TUNE.coneRange, x, y) && world.__los(g.x, g.y, x, y)) {
      return true;
    }
  }
  for (const cam of world.cameras) {
    if (coneCovers(world, cam.x, cam.y, cam.angle, TUNE.camRange, x, y) && world.__los(cam.x, cam.y, x, y)) {
      return true;
    }
  }
  return false;
}

function setMove(input, tx, ty, fromX, fromY) {
  const dx = tx - fromX;
  const dy = ty - fromY;
  const d = Math.hypot(dx, dy);
  stopMove(input);
  if (d < 4) return false;
  // Proportional steering: the thief walks straight at the target instead of
  // a 45-degree diagonal that overshoots and wedges against pillars.
  input.moveX = dx / d;
  input.moveY = dy / d;
  return true;
}

// Move toward a target, with a stuck detector: if the thief commanded motion
// but barely moved for half a second (wedged flat against a case or pillar
// edge), sidestep perpendicular for a beat to slide around the corner.
function moveToward(world, ap, input, tx, ty, dt) {
  const t = world.thief;
  ap._trackT = (ap._trackT || 0) + dt;
  if (ap._lx === undefined) {
    // First call: seed the tracker instead of reporting zero movement.
    ap._lx = t.x;
    ap._ly = t.y;
    ap._trackT = 0;
  }
  if (ap._trackT >= 0.5) {
    const moved = dist(t.x, t.y, ap._lx ?? t.x, ap._ly ?? t.y);
    if (ap._cmdMove && moved < 10) {
      ap._stuckN = (ap._stuckN || 0) + 1;
      const dx = tx - t.x;
      const dy = ty - t.y;
      const len = Math.hypot(dx, dy) || 1;
      const s = ap._stuckN % 2 === 0 ? 1 : -1;
      ap._side = { x: t.x + (-dy / len) * 80 * s, y: t.y + (dx / len) * 80 * s };
      ap._sideT = 0.9;
    }
    ap._lx = t.x;
    ap._ly = t.y;
    ap._trackT = 0;
    ap._cmdMove = false;
  }
  let gx = tx;
  let gy = ty;
  if (ap._sideT > 0 && ap._side) {
    ap._sideT -= dt;
    gx = ap._side.x;
    gy = ap._side.y;
  }
  const ok = setMove(input, gx, gy, t.x, t.y);
  if (ok) ap._cmdMove = true;
  return ok;
}

function stopMove(input) {
  input.up = false;
  input.down = false;
  input.left = false;
  input.right = false;
  input.moveX = 0;
  input.moveY = 0;
}

// One fixed step of autopilot: fills the movement keys. Returns a status
// string the test harness can read.
export function autopilotStep(world, ap, dt, input) {
  ap.elapsed += dt;
  if (ap.elapsed > 175) {
    ap.failed = true;
    return 'timeout';
  }
  const t = world.thief;
  if (world.phase !== 'playing') return world.phase;

  // Caught in the open with the alarm climbing: abort the plan. A chase
  // always aborts it; otherwise a high alarm with a staging point banked
  // does. The thief flees a chasing guard first — regrouping at a fixed
  // point while a warden follows is how the last run died.
  const chaser = world.guards.find((g) => g.mode === 'chase');
  if (chaser && !ap.retreating && ap.seg !== 2 && ap.seg !== 3 && ap.seg !== 4) ap.retreating = true;
  if (world.seenNow && world.alarm > 45 && !ap.retreating && ap.stageIdx >= 0 && ap.seg !== 2 && ap.seg !== 3 && ap.seg !== 4) {
    ap.retreating = true;
  }
  if (ap.retreating) {
    if (chaser && dist(chaser.x, chaser.y, t.x, t.y) < 260) {
      // Flee with a one-step lookahead: pick the open direction that puts
      // the most distance between the thief and the chaser. Fleeing blindly
      // away once ran the thief into the top-right corner and got it caught.
      let best = null;
      let bestScore = -Infinity;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const px = Math.max(60, Math.min(1220, t.x + Math.cos(a) * 200));
        const py = Math.max(60, Math.min(660, t.y + Math.sin(a) * 200));
        // Skip spots the thief's circle cannot stand on: fleeing at an
        // unreachable point wedges the thief flat against a case edge.
        if (pointBlocked(world, px, py, TUNE.thiefRadius)) continue;
        const dChaser = dist(px, py, chaser.x, chaser.y);
        const dWall = Math.min(px - 40, 1240 - px, py - 40, 680 - py);
        const danger = dangerAt(world, px, py) ? -200 : 0;
        const score = dChaser + dWall * 2 + danger;
        if (score > bestScore) {
          bestScore = score;
          best = { x: px, y: py };
        }
      }
      if (best) moveToward(world, ap, input, best.x, best.y, dt);
      return 'fleeing';
    }
    if (ap.stageIdx < 0) {
      // No safe point banked yet: hold still until the heat dies, then resume.
      if (!world.seenNow && world.alarm < 40) {
        ap.retreating = false;
        return 'regrouped';
      }
      stopMove(input);
      return 'hiding';
    }
    const s = STAGES[ap.stageIdx];
    const [sx, sy] = SEGMENTS[s.seg].pts[s.pt];
    if (dist(t.x, t.y, sx, sy) < 14 && !world.seenNow && world.alarm < 40) {
      ap.retreating = false;
      ap.seg = s.seg;
      ap.pt = s.pt;
      return 'regrouped';
    }
    moveToward(world, ap, input, sx, sy, dt);
    return 'retreat';
  }

  const seg = SEGMENTS[ap.seg];
  if (!seg) return 'done';

  // The Aurora sprint opens with a Hush Coin: dropped just south of
  // Warden Pike, it is always nearest to him, so he turns away from the
  // glass for 4 seconds while the thief sprints the southern route.
  if (ap.seg === 2 && ap.pt === 0 && !ap._lure1 && world.hushCoins > 0) {
    throwPikeLure(world, input);
    ap._lure1 = true;
  }

  const [tx, ty] = seg.pts[ap.pt];

  // At the Aurora pedestal (the LAST point of a crack segment): stand still
  // and break the glass. Any moment of being seen aborts the crack at once
  // — a 1.2s crack is only attempted in a genuinely unseen window, and the
  // thief falls back to the balcony nook (950, 230) instead of drifting on
  // in the open. Earlier points of the segment are plain transit.
  const isCrackPoint = seg.crack && ap.pt === seg.pts.length - 1;
  if (isCrackPoint) {
    if (dist(t.x, t.y, tx, ty) > 14) {
      // A lure just thrown needs a beat for Pike to turn south.
      if (ap._lureWaitT > 0) {
        ap._lureWaitT -= dt;
        moveToward(world, ap, input, 950, 230, dt);
        return 'waiting';
      }
      // If Pike himself is covering the glass, lure him away instead of
      // waiting for his patrol to drift: a coin south of him buys a
      // 4-second window. A camera-only block is just waited out.
      if (pikeCovers(world, tx, ty) && world.hushCoins > 0 && !ap._lure2) {
        throwPikeLure(world, input);
        ap._lure2 = true;
        ap._lureWaitT = 0.7;
        moveToward(world, ap, input, 950, 230, dt);
        return 'waiting';
      }
      // Approach only from an unseen spot: stepping out while a cone is
      // already on the thief just carries the alarm to the glass.
      if (dangerAt(world, tx, ty) || dangerAt(world, t.x, t.y)) {
        moveToward(world, ap, input, 950, 230, dt);
        ap.waitT += dt;
        return 'waiting';
      }
      moveToward(world, ap, input, tx, ty, dt);
      return 'moving';
    }
    if (world.seenNow) {
      moveToward(world, ap, input, 950, 230, dt);
      return 'waiting';
    }
    stopMove(input);
    if (world.auroraTaken) {
      ap.seg += 1;
      ap.pt = 0;
      return 'cracked';
    }
    return 'cracking';
  }

  // The climb's own gate: camera B at the top of its sweep (200-235°,
  // radians). The plain all-points-safe gate cannot open here — see the
  // segment comment — so this gate reads the sweep directly. The thief
  // waits at (750, 460) until it opens.
  if (ap.pt === 0 && seg.gateCamB) {
    const camB = world.cameras[1];
    const lo = (200 * Math.PI) / 180;
    const hi = (235 * Math.PI) / 180;
    if (!camB || camB.angle < lo || camB.angle > hi) {
      stopMove(input);
      ap.waitT += dt;
      return 'waiting';
    }
  }

  // Segment gate: every point of a gated segment must be out of every cone
  // before we start it; then we sprint it without stopping.
  // Segment 0 has one more rule: Warden Moss must be in the upper half of
  // his patrol. Starting the left-lane climb while he ascends behind the
  // thief puts the thief in his forward cone for the whole lane — the last
  // run died exactly that way (alarm 100 at 13s).
  if (ap.pt === 0 && seg.gate) {
    if (ap.seg === 0) {
      const moss = world.guards.find((g) => g.name === 'WARDEN MOSS');
      if (moss && moss.y >= 320) {
        stopMove(input);
        ap.waitT += dt;
        return 'waiting';
      }
    }
    // Never start the first segment with a hot alarm: let it cool at the
    // entrance first. (Later segments sprint on; waiting mid-route under a
    // sweeping cone is worse than the alarm they carry.)
    if (ap.seg === 0 && world.alarm > 10) {
      stopMove(input);
      ap.waitT += dt;
      return 'waiting';
    }
    for (const [gx, gy] of seg.pts) {
      if (dangerAt(world, gx, gy)) {
        stopMove(input);
        ap.waitT += dt;
        return 'waiting';
      }
    }
  }

  if (dist(t.x, t.y, tx, ty) < 14) {
    // Reached a staging point: remember it as the retreat target.
    if (seg.stage) ap.stageIdx = STAGES.findIndex((s) => s.seg === ap.seg && s.pt === ap.pt);
    ap.pt += 1;
    if (ap.pt >= seg.pts.length) {
      ap.seg += 1;
      ap.pt = 0;
    }
    return 'waypoint';
  }
  moveToward(world, ap, input, tx, ty, dt);
  return 'moving';
}
