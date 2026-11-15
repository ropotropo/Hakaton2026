# Kineti Core

**Build a rocket. Reach Earth orbit. Dock by hand.**

An original spaceflight game concept by **Nikita**, developed in collaboration with Andrii. The first playable contains modular vehicle selection, a physically integrated two-stage launch, manual stage separation and a six-degree-of-freedom terminal docking scenario.

## Play the built version

Download **[dist/Kineti-Core.html](dist/Kineti-Core.html)** using GitHub's **Download raw file** button, then open the downloaded HTML file in Safari, Chrome or Edge. The portable build includes the game, graphics library and Earth texture; it needs no account, installation or local server.

Alternatively, serve `dist/` as a static website. `dist/index.html` is the normal optimized web build. No external API or runtime asset requests are required. The existing `.openai/hosting.json` continues to point to `dist`.

## Develop

Node.js **22.12 or newer** is required.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite.

```sh
npm test
npm run build
npm run preview
```

The build produces both the regular static web app and `dist/Kineti-Core.html` for portable testing.

## First flight

1. Choose a capsule, service module, core and upper stage. Launch mass, liftoff thrust-to-weight and ideal delta-v are computed from the design. Hardware specifications are plausible **fictional inputs**, not NASA vehicle specifications.
2. Begin the launch sequence. Leave guidance on for the first flight. Guidance steers using actual thrust and is limited by the player's throttle ceiling.
3. Separate the depleted core with **Space** or the staging button. The upper stage continues toward orbit. An early separation discards remaining propellant.
4. After the engine cuts off in a confirmed bound orbit, release the upper stage.
5. Begin the **separate terminal-approach scenario**, or enter docking practice directly from assembly. Full long-range orbital rendezvous is not simulated in this version.

| Controls | Ascent | Docking |
| --- | --- | --- |
| W / S | Throttle up / down | Approach / retreat |
| A / D | Pitch trim / manual pitch | Translate left / right |
| R / F | — | Translate up / down |
| Arrow keys | Left/right pitch | Pitch / yaw |
| Q / E | — | Roll |
| Space | Separate stage | Hold powered translation brake |
| Shift | — | Fine RCS (20% thrust) |
| G | Toggle ascent guidance | — |
| B | — | Toggle powered attitude hold |
| Esc | Pause | Pause |

Touch translation and rotation controls are available on narrow screens. Desktop keyboard is the primary flight control scheme.

Checkpoints are stored locally in your browser. They are versioned and validated; physical constants are rebuilt from trusted catalog entries when restoring. The game pauses and releases all held inputs when the browser loses focus.

## Physical model and limits

- Fixed-step Newtonian integration in SI units, independent of rendering FPS.
- Inverse-square Earth gravity using a NASA/JPL gravitational parameter, rotating-atmosphere launch approximation, layered density model, aerodynamic drag and mass-flow propellant accounting.
- Real stage mass changes and finite fuel. Orbit confirmation uses energy and apsides, not a timer or altitude-only check.
- Local Hill relative dynamics, quaternion attitude, inertial rotation, powered RCS assists and explicit capture limits in docking. No passive vacuum damping or automatic forward approach.
- The 2D launch, circular reference orbit, geometric capture plane, synthetic design limits and scenario handoff are deliberate first-version approximations. This is a game, not a certified mission-analysis tool.

See **[docs/PHYSICS.md](docs/PHYSICS.md)** for sources, equations, numerical verification and limitations, **[docs/QA.md](docs/QA.md)** for browser checks, and **[docs/PLAYABLE-V1.md](docs/PLAYABLE-V1.md)** for scope.

## Sources, assets and assistance

NASA/JPL physical references and the local NASA Blue Marble Earth image are credited in [docs/PHYSICS.md](docs/PHYSICS.md) and [public/assets/SOURCES.md](public/assets/SOURCES.md). Three.js is MIT licensed. Dependency notices are included in dist/THIRD_PARTY_NOTICES.txt and inside the portable HTML build. NASA is not affiliated with this game and does not endorse it.

The original idea belongs to Nikita. Code, procedural graphics and documentation were assisted by Codex and specialist agents. The project does not use AI-generated NASA branding.

## Version review

Each completed, checked version is committed and pushed. Development versions use a feature branch and a pull request requesting review from **@ropotropo**. The playable portable build is included so Nikita can download and test without a development environment. Feature branches are not merged automatically.
