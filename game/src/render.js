// render.js — draws everything and nothing else: the marble hall, the cases and
// pillars, the amber guard cones and red camera cones, the thief, the loot, the
// HUD alarm meter, and the title / pause / end panels. It never changes state.
import { FIELD, PALETTE, TUNE } from './config.js';

function conePath(ctx, x, y, facing, range) {
  const half = TUNE.coneAngle / 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - half, facing + half);
  ctx.closePath();
}

function drawCone(ctx, x, y, facing, range, fill, edge) {
  conePath(ctx, x, y, facing, range);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function render(ctx, world) {
  const L = world.level;
  const b = L.bounds;
  ctx.clearRect(0, 0, FIELD.w, FIELD.h);

  // --- marble floor: indigo checker ---
  const tile = 64;
  for (let y = 0; y < FIELD.h / tile; y++) {
    for (let x = 0; x < FIELD.w / tile; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x * tile, y * tile, tile, tile);
    }
  }
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  for (let x = 0; x <= FIELD.w; x += tile) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.h); ctx.stroke();
  }
  for (let y = 0; y <= FIELD.h; y += tile) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.w, y); ctx.stroke();
  }

  // --- walls ---
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, FIELD.w, b.y);
  ctx.fillRect(0, FIELD.h - b.y, FIELD.w, b.y);
  ctx.fillRect(0, 0, b.x, FIELD.h);
  ctx.fillRect(FIELD.w - b.x, 0, b.x, FIELD.h);
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(0, b.y - 4, FIELD.w, 4);
  ctx.fillRect(0, FIELD.h - b.y, FIELD.w, 4);
  ctx.fillRect(b.x - 4, 0, 4, FIELD.h);
  ctx.fillRect(FIELD.w - b.x, 0, 4, FIELD.h);

  // --- velvet ropes (decoration) ---
  ctx.strokeStyle = PALETTE.velvet;
  ctx.lineWidth = 4;
  for (const r of L.ropes) {
    ctx.beginPath();
    ctx.moveTo(r.x1, r.y1);
    ctx.quadraticCurveTo((r.x1 + r.x2) / 2, r.y1 + 14, r.x2, r.y2);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.gold;
  for (const r of L.ropes) {
    for (const [px, py] of [[r.x1, r.y1], [r.x2, r.y2]]) {
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // --- entrance + exit zones ---
  ctx.fillStyle = 'rgba(45, 212, 191, 0.18)';
  ctx.fillRect(L.entrance.x - 34, L.entrance.y - 18, 68, 36);
  ctx.fillStyle = PALETTE.thief;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('◈ ' + L.entrance.label, L.entrance.x, L.entrance.y + 34);
  ctx.fillStyle = 'rgba(242, 193, 78, 0.16)';
  ctx.beginPath(); ctx.arc(L.exit.x, L.exit.y, L.exit.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(L.exit.x, L.exit.y, L.exit.r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('⬈ ' + L.exit.label, L.exit.x - 8, L.exit.y + 48);

  // --- dimmed lantern pools: darkness that cuts vision cones ---
  for (const l of L.lanterns) {
    if (world.time < l.dimUntil) {
      ctx.fillStyle = PALETTE.shadowTeal;
      ctx.beginPath(); ctx.arc(l.x, l.y, TUNE.lanternRadius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.5)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(l.x, l.y, TUNE.lanternRadius, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // --- display cases ---
  for (const c of L.cases) {
    ctx.fillStyle = '#10142a';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = PALETTE.caseGlass;
    ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
    ctx.strokeStyle = PALETTE.caseFrame;
    ctx.lineWidth = 3;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '9px sans-serif';
    ctx.fillText(c.label, c.x + c.w / 2, c.y + c.h / 2 + 3);
  }

  // --- pillars ---
  for (const p of L.pillars) {
    ctx.fillStyle = PALETTE.pillar;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#55619f';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#4a5590';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r - 8, 0, Math.PI * 2); ctx.fill();
  }

  // --- lanterns on the walls ---
  for (const l of L.lanterns) {
    const dimmed = world.time < l.dimUntil;
    ctx.fillStyle = dimmed ? '#3a3f5e' : PALETTE.gold;
    ctx.beginPath(); ctx.arc(l.x, l.y, 8, 0, Math.PI * 2); ctx.fill();
    if (!dimmed) {
      const glow = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, 46);
      glow.addColorStop(0, 'rgba(242, 193, 78, 0.35)');
      glow.addColorStop(1, 'rgba(242, 193, 78, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(l.x, l.y, 46, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '9px sans-serif';
      ctx.fillText('DIMMED', l.x, l.y + 22);
    }
  }

  // --- vision cones: guards amber, cameras red (drawn under the characters) ---
  for (const g of world.guards) {
    drawCone(ctx, g.x, g.y, g.facing, TUNE.coneRange, PALETTE.guardCone, PALETTE.guardConeEdge);
  }
  for (const cam of world.cameras) {
    drawCone(ctx, cam.x, cam.y, cam.angle, TUNE.camRange, PALETTE.camCone, PALETTE.camConeEdge);
  }

  // --- side loot ---
  for (const loot of L.loot) {
    if (loot.taken) continue;
    const pulse = 0.75 + 0.25 * Math.sin(world.time * 3 + loot.x);
    if (loot.kind === 'gold') {
      ctx.fillStyle = `rgba(242, 193, 78, ${pulse})`;
      ctx.fillRect(loot.x - 11, loot.y - 5, 22, 10);
      ctx.strokeStyle = PALETTE.goldDeep;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(loot.x - 11, loot.y - 5, 22, 10);
    } else {
      ctx.fillStyle = `rgba(240, 230, 255, ${pulse})`;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.arc(loot.x + i * 6, loot.y + Math.abs(i) * 2, 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = '9px sans-serif';
    ctx.fillText(loot.label, loot.x, loot.y - 12);
  }

  // --- Aurora Coin pedestal ---
  const a = L.aurora;
  ctx.fillStyle = '#2a2113';
  ctx.beginPath(); ctx.arc(a.x, a.y, a.r + 12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = PALETTE.caseFrame;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(a.x, a.y, a.r + 12, 0, Math.PI * 2); ctx.stroke();
  if (!world.auroraTaken) {
    const pulse = 0.7 + 0.3 * Math.sin(world.time * 4);
    const glow = ctx.createRadialGradient(a.x, a.y, 4, a.x, a.y, 64);
    glow.addColorStop(0, `rgba(242, 193, 78, ${0.55 * pulse})`);
    glow.addColorStop(1, 'rgba(242, 193, 78, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(a.x, a.y, 64, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath(); ctx.arc(a.x, a.y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6d8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('✦', a.x, a.y + 5);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(a.label + ' · 500', a.x, a.y - a.r - 20);
    if (world.crack > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r + 20, -Math.PI / 2, -Math.PI / 2 + world.crack * Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('BREAKING GLASS…', a.x, a.y + a.r + 34);
    }
  } else {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '10px sans-serif';
    ctx.fillText('EMPTY PEDESTAL', a.x, a.y - a.r - 16);
  }

  // --- thrown Hush Coins, sparkling on the floor ---
  for (const coin of world.coins) {
    const tw = 0.6 + 0.4 * Math.sin(coin.sparkle * 10);
    ctx.fillStyle = `rgba(255, 235, 150, ${tw})`;
    ctx.beginPath(); ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PALETTE.goldDeep;
    ctx.beginPath(); ctx.arc(coin.x, coin.y, 10, 0, Math.PI * 2); ctx.stroke();
  }

  // --- guards ---
  for (const g of world.guards) {
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath(); ctx.arc(g.x, g.y, TUNE.guardRadius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a5b12';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(g.x, g.y, TUNE.guardRadius, 0, Math.PI * 2); ctx.stroke();
    // nose: where the guard is looking
    ctx.fillStyle = '#3a2c05';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.facing) * 10, g.y + Math.sin(g.facing) * 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = '9px sans-serif';
    ctx.fillText(g.mode === 'chase' ? '!' : g.name, g.x, g.y - TUNE.guardRadius - 6);
  }

  // --- cameras on the walls ---
  for (const cam of world.cameras) {
    ctx.fillStyle = '#2a0d0d';
    ctx.fillRect(cam.x - 10, cam.y - 8, 20, 16);
    ctx.fillStyle = PALETTE.camera;
    ctx.beginPath(); ctx.arc(cam.x, cam.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.camera;
    ctx.font = '9px sans-serif';
    ctx.fillText('CAM', cam.x, cam.y + 24);
  }

  // --- the thief, Wren ---
  const t = world.thief;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(t.x + 3, t.y + 5, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = t.crouch ? '#1f8a7d' : PALETTE.thief;
  ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = PALETTE.thiefTrim;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#0b2e2a';
  ctx.beginPath(); ctx.arc(t.x - 4, t.y - 2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(t.x + 4, t.y - 2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('WREN', t.x, t.y - t.r - 6);

  drawHud(ctx, world);
  if (world.spottedFlash > 0 && world.phase === 'playing') {
    ctx.strokeStyle = `rgba(239, 68, 68, ${Math.min(1, world.spottedFlash * 2)})`;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, FIELD.w - 8, FIELD.h - 8);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('SPOTTED!', FIELD.w / 2, 150);
  }
  if (world.phase === 'title') drawTitle(ctx, world);
  if (world.phase === 'paused') drawPaused(ctx);
  if (world.phase === 'escaped' || world.phase === 'caught' || world.phase === 'dawn') {
    drawEnd(ctx, world);
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, 0, FIELD.w, 52);
  ctx.fillStyle = PALETTE.text;
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('MERIDIAN MINT — GRAND HALL', 16, 21);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '11px sans-serif';
  ctx.fillText('Steal the AURORA COIN, then escape through the EXIT WINDOW.', 16, 38);

  // Alarm meter, centre.
  const bx = 500;
  const bw = 280;
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', bx, 21);
  ctx.fillStyle = '#2a1020';
  ctx.fillRect(bx + 62, 10, bw, 16);
  const frac = world.alarm / 100;
  ctx.fillStyle = frac < 0.5 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(bx + 62, 10, bw * frac, 16);
  ctx.strokeStyle = PALETTE.text;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 62, 10, bw, 16);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`${Math.round(world.alarm)}%`, bx + 62 + bw + 8, 22);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '11px sans-serif';
  ctx.fillText('Hide to let it fall · 100% = CAUGHT', bx, 40);

  // Right side: loot, tools, dawn timer.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`LOOT ${world.lootPoints}`, 1080, 21);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '12px sans-serif';
  const coins = '●'.repeat(world.hushCoins) + '○'.repeat(Math.max(0, TUNE.hushCoins - world.hushCoins));
  ctx.fillText(`HUSH ${coins}  ·  DIM ${world.lanternCharges}×  ·  DAWN ${fmtTime(Math.max(0, world.dawnLeft))}`, 1080, 39);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '11px sans-serif';
  ctx.fillText(world.auroraTaken ? 'AURORA ✓ TAKEN — RUN!' : 'AURORA ✦ NOT YET TAKEN', 1264, 21);
  ctx.textAlign = 'center';
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(5, 7, 18, 0.72)';
  ctx.fillRect(0, 0, FIELD.w, FIELD.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('MIDNIGHT MINT', FIELD.w / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px Georgia, serif';
  ctx.fillText('Wren is going to steal the Aurora Coin from the Meridian Mint.', FIELD.w / 2, 292);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Three wardens patrol with amber vision cones. Two cameras sweep red cones.', FIELD.w / 2, 326);
  ctx.fillText('Read the cones, throw Hush Coins to lure guards, dim lanterns to cut the light.', FIELD.w / 2, 350);
  ctx.fillText('Break the Aurora glass (stand by it 1.2s), grab side loot, escape before dawn.', FIELD.w / 2, 374);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('WASD / Arrows — move      Click / Q — throw Hush Coin      E — dim lantern', FIELD.w / 2, 420);
  ctx.fillText('P / Esc — pause      Space — start', FIELD.w / 2, 446);
  const blink = 0.6 + 0.4 * Math.sin(world.time * 4);
  ctx.fillStyle = `rgba(242, 193, 78, ${blink})`;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('— PRESS SPACE TO BEGIN —', FIELD.w / 2, 500);
  ctx.textAlign = 'left';
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(5, 7, 18, 0.66)';
  ctx.fillRect(0, 0, FIELD.w, FIELD.h);
  ctx.fillStyle = PALETTE.text;
  ctx.textAlign = 'center';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('PAUSED', FIELD.w / 2, 340);
  ctx.font = '16px sans-serif';
  ctx.fillText('P / Esc to resume · Space to restart the run', FIELD.w / 2, 380);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, world) {
  ctx.fillStyle = 'rgba(5, 7, 18, 0.78)';
  ctx.fillRect(0, 0, FIELD.w, FIELD.h);
  ctx.textAlign = 'center';
  const conf = {
    escaped: ['ESCAPED!', PALETTE.gold],
    caught: ['CAUGHT!', '#ef4444'],
    dawn: ['DAWN BREAKS', '#7aa2ff'],
  }[world.phase];
  ctx.fillStyle = conf[1];
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText(conf[0], FIELD.w / 2, 280);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '17px sans-serif';
  ctx.fillText(world.endReason, FIELD.w / 2, 322);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`SCORE ${world.score}   ·   LOOT ${world.lootPoints}`, FIELD.w / 2, 368);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '15px sans-serif';
  ctx.fillText(`Peak alarm ${Math.round(world.maxAlarm)}%${world.maxAlarm <= TUNE.ghostThreshold ? ' — GHOST bonus earned (+300)' : ''} · Dawn left ${fmtTime(Math.max(0, world.dawnLeft))}`, FIELD.w / 2, 400);
  const blink = 0.6 + 0.4 * Math.sin(world.time * 4);
  ctx.fillStyle = `rgba(242, 193, 78, ${blink})`;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('— PRESS SPACE TO PLAY AGAIN —', FIELD.w / 2, 452);
  ctx.textAlign = 'left';
}
