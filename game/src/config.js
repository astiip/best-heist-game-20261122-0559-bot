// config.js — every tunable number and the whole palette for MIDNIGHT MINT.
// Nothing else in the game hard-codes a speed, a range or a colour: change it here.
export const FIELD = { w: 1280, h: 720 };

export const PALETTE = {
  floorA: '#1b2340', // dark indigo marble, light tile
  floorB: '#151b31', // dark indigo marble, dark tile
  floorLine: '#232c52',
  wall: '#2c3560',
  wallTop: '#3d4a7d',
  gold: '#f2c14e',
  goldDeep: '#c8932a',
  velvet: '#8e1f2f',
  caseGlass: 'rgba(150, 200, 255, 0.10)',
  caseFrame: '#6b5a2e',
  pillar: '#39427a',
  shadowTeal: 'rgba(20, 90, 90, 0.55)',
  guardCone: 'rgba(245, 176, 65, 0.20)',
  guardConeEdge: 'rgba(245, 176, 65, 0.55)',
  camCone: 'rgba(235, 64, 64, 0.16)',
  camConeEdge: 'rgba(235, 64, 64, 0.5)',
  thief: '#2dd4bf',
  thiefTrim: '#f2c14e',
  guard: '#e8b23a',
  camera: '#e5484d',
  alarm: '#ef4444',
  hudBg: 'rgba(8, 10, 24, 0.82)',
  text: '#f3ead3',
  muted: '#9aa5c8',
};

export const TUNE = {
  thiefSpeed: 175, // px per second
  thiefRadius: 13,
  guardSpeed: 58,
  guardChaseSpeed: 96,
  guardRadius: 15,
  coneAngle: (70 * Math.PI) / 180, // vision cone half-angle is half of this
  coneRange: 265,
  camRange: 305,
  camSweepSpeed: 0.45, // radians per second of sweep
  alarmGuardPerSec: 25,
  alarmCamPerSec: 35,
  alarmDecayPerSec: 6,
  alarmCaughtAt: 100,
  ghostThreshold: 25, // alarm must never pass this for the Ghost bonus
  crackSeconds: 1.2, // seconds beside the Aurora case to break the glass
  hushCoins: 3,
  hushThrowSpeed: 520,
  hushLureSeconds: 4,
  hushLureRadius: 420,
  lanternCharges: 2,
  lanternDimSeconds: 6,
  lanternCooldownSeconds: 10,
  lanternRadius: 115,
  dawnSeconds: 180, // 3:00 until sunrise
  spottedFlashSeconds: 0.6,
  chaseSeconds: 3,
  ghostBonus: 300,
  auroraPoints: 500,
  goldBarPoints: 100,
  necklacePoints: 150,
  timeBonusPerSecond: 5,
};
