// world.js — the rules of the heist: thief movement and collision, guard patrols
// with vision cones, sweeping cameras, the alarm meter, loot, the Aurora glass
// case, Hush Coins, Lantern Dim, and the win/lose conditions. Rendering lives
// in render.js; this file only moves numbers around.
import { FIELD, TUNE } from './config.js';
import { buildLevel } from './level.js';

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
// Does segment (x1,y1)-(x2,y2) cross a circle?
function segHitsCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const px = x1 + dx * t;
  const py = y1 + dy * t;
  return Math.hypot(px - cx, py - cy) < r;
}
// Does segment cross a rectangle? (Slab test.)
function segHitsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < rx || x1 > rx + rw) return false;
  } else {
    let t1 = (rx - x1) / dx;
    let t2 = (rx + rw - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < ry || y1 > ry + rh) return false;
  } else {
    let t1 = (ry - y1) / dy;
    let t2 = (ry + rh - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function createWorld(seed) {
  const level = buildLevel();
  const guards = level.guards.map((g, i) => ({
    name: g.name,
    waypoints: g.waypoints,
    speed: g.speed,
    x: g.waypoints[0].x,
    y: g.waypoints[0].y,
    wp: 1,
    facing: Math.PI / 2,
    mode: 'patrol', // patrol | pause | investigate | chase | return
    modeT: 0,
    pauseScan: 0,
    target: null,
    index: i,
  }));
  const cameras = level.cameras.map((c) => ({
    x: c.x,
    y: c.y,
    baseAngle: c.baseAngle,
    sweep: c.sweep,
    phase: c.phase,
    angle: c.baseAngle,
  }));
  return {
    seed,
    level,
    time: 0, // seconds since the run started
    phase: 'title', // title | playing | paused | escaped | caught | dawn
    thief: { x: level.entrance.x, y: level.entrance.y, r: TUNE.thiefRadius, crouch: false },
    guards,
    cameras,
    alarm: 0,
    maxAlarm: 0,
    spottedFlash: 0,
    seenNow: false,
    seenBy: null, // 'guard' | 'camera' | null
    score: 0,
    lootPoints: 0,
    auroraTaken: false,
    crack: 0, // 0..1 progress breaking the Aurora glass
    hushCoins: TUNE.hushCoins,
    coins: [], // thrown Hush Coins on the floor
    lanternCharges: TUNE.lanternCharges,
    lanternCooldown: 0,
    dawnLeft: TUNE.dawnSeconds,
    endReason: '',
    events: [],
    autopilot: null,
  };
}

// Would a circle of radius r centred at (x, y) overlap a wall, a case or a
// pillar? The autopilot's flee lookahead uses this to skip unreachable spots.
export function pointBlocked(world, x, y, r) {
  return circleHitsSolids(world, x, y, r);
}

// Line of sight: blocked by a display case, a pillar, or a dimmed lantern's
// pool of darkness. Walls never block inside the hall.
export function losClear(world, x1, y1, x2, y2) {
  for (const c of world.level.cases) {
    if (segHitsRect(x1, y1, x2, y2, c.x, c.y, c.w, c.h)) return false;
  }
  for (const p of world.level.pillars) {
    if (segHitsCircle(x1, y1, x2, y2, p.x, p.y, p.r)) return false;
  }
  for (const l of world.level.lanterns) {
    if (world.time < l.dimUntil && segHitsCircle(x1, y1, x2, y2, l.x, l.y, TUNE.lanternRadius)) {
      return false;
    }
  }
  return true;
}

function inCone(eyeX, eyeY, facing, range, tx, ty) {
  const d = dist(eyeX, eyeY, tx, ty);
  if (d > range) return false;
  const ang = Math.atan2(ty - eyeY, tx - eyeX);
  return Math.abs(angleDiff(ang, facing)) <= TUNE.coneAngle / 2;
}

function circleHitsSolids(world, x, y, r) {
  const b = world.level.bounds;
  if (x - r < b.x || x + r > b.x + b.w || y - r < b.y || y + r > b.y + b.h) return true;
  for (const c of world.level.cases) {
    if (x + r > c.x && x - r < c.x + c.w && y + r > c.y && y - r < c.y + c.h) return true;
  }
  for (const p of world.level.pillars) {
    if (dist(x, y, p.x, p.y) < r + p.r) return true;
  }
  return false;
}

function moveCircle(world, body, dx, dy) {
  const nx = body.x + dx;
  if (!circleHitsSolids(world, nx, body.y, body.r)) body.x = nx;
  const ny = body.y + dy;
  if (!circleHitsSolids(world, body.x, ny, body.r)) body.y = ny;
}

export function updateWorld(world, dt, input) {
  if (world.phase !== 'playing') return;
  world.time += dt;
  world.events.length = 0;

  // --- dawn timer ---
  world.dawnLeft -= dt;
  if (world.dawnLeft <= 0) {
    world.dawnLeft = 0;
    world.phase = 'dawn';
    world.endReason = 'DAWN BREAKS — the sun rose over the Meridian Mint.';
    world.events.push('dawn');
    return;
  }
  if (world.lanternCooldown > 0) world.lanternCooldown -= dt;
  if (world.spottedFlash > 0) world.spottedFlash -= dt;

  // --- thief movement ---
  // The autopilot steers with proportional moveX/moveY (-1..1); the keyboard
  // path uses the boolean keys. Proportional steering matters: boolean keys
  // only move at 45-degree diagonals, which overshoots a target's minor axis
  // and wedges the thief against pillars.
  const t = world.thief;
  let mx = input.moveX !== undefined && input.moveX !== null
    ? input.moveX
    : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = input.moveY !== undefined && input.moveY !== null
    ? input.moveY
    : (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const mLen = Math.hypot(mx, my);
  if (mLen > 1) {
    mx /= mLen;
    my /= mLen;
  }
  moveCircle(world, t, mx * TUNE.thiefSpeed * dt, my * TUNE.thiefSpeed * dt);
  t.crouch = mx === 0 && my === 0;

  // --- Hush Coin throw (Q or right-click / click) ---
  if (input.throwTarget && world.hushCoins > 0) {
    world.hushCoins -= 1;
    const tx = clamp(input.throwTarget.x, 40, FIELD.w - 40);
    const ty = clamp(input.throwTarget.y, 40, FIELD.h - 40);
    world.coins.push({ x: tx, y: ty, sparkle: 0, lureLeft: TUNE.hushLureSeconds });
    world.events.push('coin');
    input.throwTarget = null;
  } else {
    input.throwTarget = null;
  }

  // --- Lantern Dim (E) ---
  if (input.dimQueued) {
    input.dimQueued = false;
    if (world.lanternCharges > 0 && world.lanternCooldown <= 0) {
      let best = null;
      let bestD = 170;
      for (const l of world.level.lanterns) {
        const d = dist(t.x, t.y, l.x, l.y);
        if (d < bestD) {
          bestD = d;
          best = l;
        }
      }
      if (best) {
        best.dimUntil = world.time + TUNE.lanternDimSeconds;
        best.cooldownUntil = world.time + TUNE.lanternCooldownSeconds;
        world.lanternCharges -= 1;
        world.lanternCooldown = TUNE.lanternCooldownSeconds;
        world.events.push('dim');
      }
    }
  }

  // --- thrown coins lure the nearest guard ---
  for (const coin of world.coins) {
    coin.sparkle += dt;
    if (coin.lureLeft > 0) {
      coin.lureLeft -= dt;
      let best = null;
      let bestD = TUNE.hushLureRadius;
      for (const g of world.guards) {
        const d = dist(g.x, g.y, coin.x, coin.y);
        if (d < bestD) {
          bestD = d;
          best = g;
        }
      }
      // Re-assigned every frame while the coin is live: a guard that has
      // reached the coin stays put, examining it, until the lure expires —
      // that standing distraction is what the coin is for.
      if (best && best.mode !== 'chase') {
        best.mode = 'investigate';
        best.target = { x: coin.x, y: coin.y };
        best.modeT = TUNE.hushLureSeconds;
      }
    }
  }
  world.coins = world.coins.filter((c) => c.lureLeft > -2);

  // --- cameras sweep ---
  for (const cam of world.cameras) {
    cam.angle = cam.baseAngle + cam.sweep * Math.sin(world.time * TUNE.camSweepSpeed * 2 + cam.phase * 2.4);
  }

  // --- guards patrol / investigate / chase ---
  for (const g of world.guards) {
    if (g.mode === 'patrol' || g.mode === 'return') {
      const wp = g.waypoints[g.wp];
      const d = dist(g.x, g.y, wp.x, wp.y);
      if (d < 6) {
        g.mode = 'pause';
        g.modeT = 0.9;
        g.pauseScan = 0;
        g.wp = (g.wp + 1) % g.waypoints.length;
      } else {
        const ang = Math.atan2(wp.y - g.y, wp.x - g.x);
        g.facing = ang;
        const body = { x: g.x, y: g.y, r: TUNE.guardRadius };
        moveCircle(world, body, Math.cos(ang) * g.speed * dt, Math.sin(ang) * g.speed * dt);
        g.x = body.x;
        g.y = body.y;
      }
    } else if (g.mode === 'pause') {
      g.modeT -= dt;
      g.pauseScan += dt;
      g.facing += Math.sin(g.pauseScan * 2.2) * 0.9 * dt;
      if (g.modeT <= 0) g.mode = 'patrol';
    } else if (g.mode === 'investigate' && g.target) {
      g.modeT -= dt;
      const d = dist(g.x, g.y, g.target.x, g.target.y);
      if (d < 10 || g.modeT <= 0) {
        g.mode = 'return';
        g.target = null;
      } else {
        const ang = Math.atan2(g.target.y - g.y, g.target.x - g.x);
        g.facing = ang;
        const body = { x: g.x, y: g.y, r: TUNE.guardRadius };
        moveCircle(world, body, Math.cos(ang) * g.speed * 1.15 * dt, Math.sin(ang) * g.speed * 1.15 * dt);
        g.x = body.x;
        g.y = body.y;
      }
    } else if (g.mode === 'chase') {
      g.modeT -= dt;
      const ang = Math.atan2(t.y - g.y, t.x - g.x);
      g.facing = ang;
      const body = { x: g.x, y: g.y, r: TUNE.guardRadius };
      moveCircle(world, body, Math.cos(ang) * TUNE.guardChaseSpeed * dt, Math.sin(ang) * TUNE.guardChaseSpeed * dt);
      g.x = body.x;
      g.y = body.y;
      if (g.modeT <= 0) g.mode = 'return';
    }
  }

  // --- detection: guards first, then cameras ---
  let seen = false;
  let seenBy = null;
  for (const g of world.guards) {
    if (inCone(g.x, g.y, g.facing, TUNE.coneRange, t.x, t.y) && losClear(world, g.x, g.y, t.x, t.y)) {
      seen = true;
      seenBy = 'guard';
      g.facing = Math.atan2(t.y - g.y, t.x - g.x);
      if (world.alarm > 60 && g.mode !== 'chase') {
        g.mode = 'chase';
        g.modeT = TUNE.chaseSeconds;
      }
      break;
    }
  }
  if (!seen) {
    for (const cam of world.cameras) {
      if (inCone(cam.x, cam.y, cam.angle, TUNE.camRange, t.x, t.y) && losClear(world, cam.x, cam.y, t.x, t.y)) {
        seen = true;
        seenBy = 'camera';
        break;
      }
    }
  }
  if (seen && !world.seenNow) {
    world.spottedFlash = TUNE.spottedFlashSeconds;
    world.events.push('spotted');
  }
  world.seenNow = seen;
  world.seenBy = seen ? seenBy : null;
  if (seen) {
    world.alarm += (seenBy === 'camera' ? TUNE.alarmCamPerSec : TUNE.alarmGuardPerSec) * dt;
  } else {
    world.alarm -= TUNE.alarmDecayPerSec * dt;
  }
  world.alarm = clamp(world.alarm, 0, 100);
  if (world.alarm > world.maxAlarm) world.maxAlarm = world.alarm;
  if (world.alarm >= TUNE.alarmCaughtAt) {
    world.phase = 'caught';
    world.endReason = 'CAUGHT — the alarm hit 100% and the wardens closed in.';
    world.events.push('caught');
    return;
  }

  // --- side loot: touch to take ---
  for (const loot of world.level.loot) {
    if (!loot.taken && dist(t.x, t.y, loot.x, loot.y) < 28) {
      loot.taken = true;
      world.lootPoints += loot.points;
      world.score += loot.points;
      world.events.push('loot');
    }
  }

  // --- Aurora Coin: stand by the glass case to break it ---
  const a = world.level.aurora;
  if (!world.auroraTaken && dist(t.x, t.y, a.x, a.y) < 78) {
    world.crack += dt / TUNE.crackSeconds;
    if (world.crack >= 1) {
      world.crack = 1;
      world.auroraTaken = true;
      world.lootPoints += TUNE.auroraPoints;
      world.score += TUNE.auroraPoints;
      world.events.push('crack');
    }
  } else if (!world.auroraTaken) {
    world.crack = Math.max(0, world.crack - dt * 0.5);
  }

  // --- escape: reach the exit window carrying the Aurora Coin ---
  const e = world.level.exit;
  if (world.auroraTaken && dist(t.x, t.y, e.x, e.y) < e.r + 6) {
    const timeBonus = Math.round(world.dawnLeft) * TUNE.timeBonusPerSecond;
    const ghost = world.maxAlarm <= TUNE.ghostThreshold ? TUNE.ghostBonus : 0;
    world.score += timeBonus + ghost;
    world.phase = 'escaped';
    world.endReason = `ESCAPED — Wren slipped out the window with the Aurora Coin. Loot ${world.lootPoints} + time ${timeBonus}${ghost ? ` + Ghost ${ghost}` : ''}.`;
    world.events.push('escape');
  }
}

export function startRun(world) {
  const fresh = createWorld(world.seed);
  fresh.phase = 'playing';
  return fresh;
}
