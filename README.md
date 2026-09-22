# Elements: The Five Trials

A short 2D side-scrolling platformer for desktop browsers, built to the
*Elements: The Five Trials — PRD v3* specification. Five levels (Trial → Earth →
Water → Air → Fire), three platform layers, a gem wallet that doubles as
ammunition, and one signature hazard per element.

**▶ Play it: <https://chaitanyamarulkar7-design.github.io/Elemental-Journey/>**

## Controls

| Action | Primary | Alternate |
| --- | --- | --- |
| Move | ← / → | A / D |
| Jump | ↑ | Space, W (hold for height) |
| Fire | Ctrl | X |
| Pause | P | Esc |

On macOS, Ctrl + arrows may switch desktops — use **X** to fire.

## The three rules that matter

- **1 gem = 1 bullet.** Shooting spends the same gems that buy lives.
- **100 gems = 1 extra life.** The HUD bar fills toward the next one.
- **No stomping, no HP.** Jump over enemies or shoot them; one hit is death.

Every level is completable from zero gems without firing a single bullet.

## Running it locally

The game is plain ES modules with no build step. It must be served over HTTP —
opening `index.html` from the filesystem will fail on module CORS.

```bash
python -m http.server 5173
```

Then open <http://localhost:5173>. Any static server works
(`npx serve`, `php -S`, …).

## Developer tools

Debug keys are active on `localhost` and on any URL with `?debug=1`:

| Key | Does |
| --- | --- |
| F1 | Debug overlay — position, velocity, grounded state, hitboxes, wallet |
| F2 | Test room — the standing check that physics still clears every gap |
| F3 | Skip to the next checkpoint |

```bash
node tools/validate.mjs    # run the load-time level checks on the CLI
node tools/genlevels.mjs   # repaint src/levels/*.js from the beat tables
```

`validate.mjs` runs exactly the same code the browser runs at startup: row
count and width, exactly one start and one gate, declared gem total matching
the placed gems, every enemy and hazard on a surface, and a reachability pass
over the jump caps so the gate can always be reached.

## Layout

```
index.html
vendor/phaser.min.js        Phaser 3.90, vendored so the game has no network deps
src/
  main.js                   Phaser config and the scene list
  config/                   physicsConfig.js, gameConfig.js, tileLegend.js
  scenes/                   Boot, menus and end screens, Game, TestRoom
  entities/                 Player, Enemy, Pickups, Hazards
  systems/                  LevelLoader, LevelValidator, RunState, SaveManager,
                            InputManager, AudioManager, Textures, Hud, Menu, DebugOverlay
  levels/                   trial.js, earth.js, water.js, air.js, fire.js
tools/                      genlevels.mjs, validate.mjs (dev only)
```

**Every physics number lives in `src/config/physicsConfig.js`.** No gameplay
file hard-codes one. Changing a value there must keep the geometry checks in
the test room true.

## Levels are plain text

Each level is a 17-row ASCII map you can edit by hand:

| Char | Meaning | Char | Meaning |
| --- | --- | --- | --- |
| `.` | Empty | `#` | Solid ground |
| `=` | One-way platform | `B` | Solid block |
| `o` | Base gem (1) | `d` | 2× gem |
| `g` | 3× gem | `^` | Spikes |
| `~` | Deep water or lava | `C` | Crumbling ledge |
| `u` | Updraft / bubble column | `W` | Wind zone |
| `P` | Player start | `K` | Checkpoint |
| `G` | Gate | `R` | Falling-rock trigger |

The world is exactly one screen tall, so the camera only ever scrolls
horizontally: ground at row 15, Layer 2 at row 11, Layer 3 at row 7.

## Assets

There are none. Every sprite and tile is drawn procedurally into a Phaser
texture at boot, every sound is generated with Web Audio, and the only
third-party file in the repository is the vendored Phaser build.

## Notes on the spec

- Built to the MVP scope in PRD §1. The stretch list in §14 — Fire guardian,
  relics, Time Attack, elemental bullets, gem-cost checkpoints, composed music
  — is deliberately not implemented. `checkpointCost` in `gameConfig.js` is the
  config flag for the gem-cost variant and ships at `0`.
- §11 specifies Vite. This repository drops the build step instead: `index.html`
  loads a vendored Phaser and the game's own ES modules directly, which is what
  makes it deployable to GitHub Pages as-is. The folder layout, the level data
  format, the validation rules and the `physicsConfig.js` rule are unchanged.
