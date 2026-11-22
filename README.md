# MIDNIGHT MINT

[![make.fun bounty](https://make.fun/bounty/best-heist-game-20261122-0559/badge)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![competition](https://make.fun/c/best-heist-game-20261122-0559/badge)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![status](https://make.fun/bounty/best-heist-game-20261122-0559/status)](https://make.fun/bounty/best-heist-game-20261122-0559)

**MIDNIGHT MINT** — Wren is going to steal the Aurora Coin from the Meridian Mint.
A top-down stealth heist in a single grand hall: three night wardens patrol with
amber vision cones, two iris cameras sweep red cones across the marble, and the
alarm meter climbs every second you are seen. Read the cones, pick your route,
break the glass, and slip out the window before dawn.

Built for the make.fun bounty [“Make the best heist game”](https://make.fun/bounty/best-heist-game-20261122-0559) — an original, complete, playable game in static files with no network requests.

## How to play

Serve the game locally and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

**Goal:** steal the **Aurora Coin** (500 points, glowing on its pedestal top-right)
and escape through the **Exit Window** (bottom-right) before the 3:00 dawn timer
runs out. Side loot — three gold bars (100 each) and a pearl necklace (150) — is
worth grabbing on the way. Finish with peak alarm under 25% for the **Ghost
bonus (+300)**.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrow keys | Move Wren |
| Click / Q | Throw a Hush Coin at the cursor (lures the nearest guard, 3 in stock) |
| E | Dim the nearest wall lantern for 6s — its dark pool cuts vision cones (2 charges, 10s cooldown) |
| P / Esc | Pause |
| Space | Start / play again |

## The hall

- **Three routes** across one room, all visible in a single frame: the left lane
  behind the tall display cases (slow, safe), the open middle marble (fast,
  crosses two cones), and the right balcony (time the camera sweep).
- **Alarm meter (0–100%):** guards raise it ~25%/s, cameras ~35%/s; hiding
  drops it ~6%/s. At 100% you are **CAUGHT**. A “SPOTTED!” flash gives you a
  fair half-second to break line of sight before a warden gives chase.
- **The Aurora glass:** stand beside the pedestal for 1.2s to break it — the
  progress ring shows the crack spreading.
- **Sound:** WebAudio oscillators only (loot chime, coin ping, glass crack,
  alarm pulse, escape fanfare). No audio files.

## Layout

```
game/
  index.html        canvas + status line
  src/config.js     tuning numbers + palette
  src/random.js     seeded RNG (mulberry32)
  src/level.js      the hall: cases, pillars, ropes, lanterns, patrols, cameras, loot
  src/world.js      rules: movement, cones, alarm, loot, cracking, win/lose
  src/render.js     all drawing: floor, cones, thief, guards, HUD, panels
  src/input.js      keyboard + mouse
  src/audio.js      WebAudio bleeps
  src/shots.js      screenshot scenes + the autopilot that plays to a win
  src/main.js       boot + fixed-step 1/60 loop + ?shot= scenes
```

## Screenshots

1. `1-title.jpg` — title over the living hall: guards mid-patrol, cameras
   sweeping, Aurora glowing, alarm at 0%.
2. `2-sneak.jpg` — mid-heist: Wren crouched behind the crown case, a guard cone
   sweeping past, a Hush Coin sparkling, one gold bar pocketed.
3. `3-spotted.jpg` — caught in the camera's red cone: SPOTTED!, alarm 58% and
   climbing, a warden turning, one lantern dimmed.
4. `4-getaway.jpg` — ESCAPED!: the autopilot's real winning run, out the window
   with the Aurora Coin.

## License

MIT — see [LICENSE](LICENSE).
