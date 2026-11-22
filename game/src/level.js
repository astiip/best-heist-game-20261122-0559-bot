// level.js — the Meridian Mint grand hall: one room, its walls, display cases,
// pillars, velvet ropes, lanterns, guard patrols, cameras and loot. Pure data:
// no update logic lives here, so the room can be drawn, patrolled and shot
// from the same single definition.
export function buildLevel() {
  const W = 1280;
  const H = 720;
  const WALL = 24;

  return {
    bounds: { x: WALL, y: WALL, w: W - WALL * 2, h: H - WALL * 2 },
    name: 'MERIDIAN MINT — GRAND HALL',
    entrance: { x: 70, y: 650, label: 'SKYLIGHT DOOR' },
    exit: { x: 1210, y: 650, r: 30, label: 'EXIT WINDOW' },

    // Solid rectangles: block the thief, block guard/camera line of sight.
    cases: [
      { x: 280, y: 150, w: 120, h: 70, label: 'COIN CASE' },
      { x: 580, y: 320, w: 140, h: 80, label: 'CROWN CASE' },
      { x: 880, y: 120, w: 120, h: 70, label: 'MEDAL CASE' },
      { x: 420, y: 520, w: 140, h: 70, label: 'RELIC CASE' },
      { x: 900, y: 480, w: 120, h: 70, label: 'JEWEL CASE' },
    ],

    // Solid circles: block movement and line of sight.
    pillars: [
      { x: 400, y: 300, r: 22 },
      { x: 880, y: 300, r: 22 },
      { x: 640, y: 180, r: 22 },
      { x: 640, y: 560, r: 22 },
    ],

    // Decoration only: red velvet rope runs the thief can slip under visually,
    // they never block movement.
    ropes: [
      { x1: 240, y1: 250, x2: 560, y2: 250 },
      { x1: 720, y1: 250, x2: 1040, y2: 250 },
      { x1: 240, y1: 460, x2: 560, y2: 460 },
      { x1: 720, y1: 460, x2: 1040, y2: 460 },
    ],

    // Wall lanterns. Dimming one (E) cuts any vision cone passing through it.
    lanterns: [
      { x: 300, y: 40, dimUntil: 0, cooldownUntil: 0 },
      { x: 960, y: 40, dimUntil: 0, cooldownUntil: 0 },
      { x: 40, y: 360, dimUntil: 0, cooldownUntil: 0 },
    ],

    guards: [
      {
        name: 'WARDEN HALE',
        waypoints: [
          { x: 450, y: 250 },
          { x: 830, y: 250 },
          { x: 830, y: 430 },
          { x: 450, y: 430 },
        ],
        speed: 58,
      },
      {
        name: 'WARDEN MOSS',
        waypoints: [
          { x: 200, y: 150 },
          { x: 200, y: 550 },
        ],
        speed: 50,
      },
      {
        name: 'WARDEN PIKE',
        waypoints: [
          { x: 1080, y: 200 },
          { x: 1080, y: 520 },
        ],
        speed: 50,
      },
    ],

    cameras: [
      // Top wall, sweeps its red cone across the middle of the hall.
      { x: 640, y: 36, baseAngle: Math.PI / 2, sweep: (55 * Math.PI) / 180, phase: 0 },
      // Right wall, sweeps across the Aurora pedestal approach.
      { x: 1244, y: 360, baseAngle: Math.PI, sweep: (55 * Math.PI) / 180, phase: 1.7 },
    ],

    aurora: { x: 1120, y: 110, r: 26, label: 'AURORA COIN' },

    loot: [
      { id: 'gold1', kind: 'gold', x: 650, y: 300, points: 100, taken: false, label: 'GOLD BAR' },
      { id: 'gold2', kind: 'gold', x: 340, y: 130, points: 100, taken: false, label: 'GOLD BAR' },
      { id: 'gold3', kind: 'gold', x: 940, y: 100, points: 100, taken: false, label: 'GOLD BAR' },
      { id: 'pearl', kind: 'pearl', x: 490, y: 500, points: 150, taken: false, label: 'PEARL NECKLACE' },
    ],

    routes: [
      'LEFT LANE — behind the tall display cases, slow but safe',
      'MIDDLE MARBLE — open floor, fast, crosses two vision cones',
      'RIGHT BALCONY — time the red camera sweep, medium risk',
    ],
  };
}
