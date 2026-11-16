# Kinetic Core

**Design a mission. Fly its critical moments.**

An original spaceflight game by **Mykyta Borisov (ropotropo), the sole game author**.
Andrii coordinates feedback; Codex and specialist agents assist development.
See [authorship](AUTHORS.md).
The site menu's **About the author** page shows **Микита Борисов**, Ukraine,
with the project spacesuit portrait.

## Play v0.5.0

Open **[the browser game](https://ropotropo.github.io/Hakaton2026/kinetic-core/)**
or download the portable HTML from the
**[v0.5.0 release](https://github.com/ropotropo/Hakaton2026/releases/tag/v0.5.0)**.
The portable `dist/Kineti-Core.html` includes the renderer and local textures;
open the downloaded file directly. The core game needs no account or backend.
The optional **Earth / free flight** map mode needs internet.

The opening **Missions** screen gives the Moon expedition one primary action,
with the spacecraft workshop, separate maneuver practice and exploration below.
A live journey shows physical flight phases; the local flight log records only
completed milestones. Camera, map and detailed instruments stay out of the way
until needed. See the [v0.5 UX audit](docs/UX-AUDIT-V05.md).

The final **KC** brand appears in the game, menu and landing flag. Open **How to play** from the header or site menu for a short first-flight guide.

## Your first Moon mission

1. Open **Missions → Prepare expedition**. The Lunar demonstrator is ready
   to fly. For a custom vehicle, choose **Build a spacecraft**, place compatible
   hardware and use **Plan flight**. Dimensions change geometry and performance.
2. Select **Moon · full expedition** and one of four Apollo-reference approaches.
   Other destinations are explicitly labelled surface rehearsals.
3. Start the mission: a skippable 12 s rollout cinematic and 5 s countdown precede a
   real powered ascent. The flight director hands over at actual 100 m altitude.
4. Keep **Powered guidance** on for the first run. Power is an engine ceiling.
   At core depletion the game pauses: choose **Separate booster** or press
   **Space** to release it and continue.
5. In the confirmed Earth orbit, choose **Plan departure**. Coast to the
   burn window and separate the depleted upper stage when asked. All burns
   use the retained craft's finite propellant.
6. Time warp compresses the actual Earth–Moon coast. Guidance performs lunar
   approach, capture, coast to the chosen longitude and powered descent. You
   can change power, disable guidance or pause. The live map follows the actual
   trajectory; a dashed bearing is not a collision-free flight plan.
7. Safe contact produces the Moon crew/flag finale and physical debrief.
   Surface samples, lunar ascent, return and atmospheric entry are future work.

The named approaches use real reference coordinates; latitude is metadata in
this **2D** model and surface terrain is illustrative. The model uses a synthetic
circular Moon epoch and patched conics, not live ephemerides.

## Docking and landing controls

**Missions → Docking** starts a separate 70 m terminal approach. Choose
**External chase**, **Docking camera** or **Cockpit** above the command surface.
The nose camera supplies alignment optics; the crew-eye camera follows actual
craft attitude. External views support mouse inspection. Changing cameras does
not align, brake or move the craft.

| Input | Manual docking | Surface landing exercise |
| --- | --- | --- |
| W / S | Approach / retreat | Engine power |
| A / D | Translate left / right | Tilt left / right |
| R / F | Translate up / down | — |
| Arrow keys | Pitch / yaw | Left/right tilt |
| Q / E | Roll | — |
| Shift | Fine RCS, 20% thrust | — |
| Space | Hold powered translation brake | Cut engine |
| B | Powered attitude hold | Powered upright hold |
| Esc | Pause | Pause |

Every docking assist spends RCS fuel. No passive vacuum braking or automatic
forward motion. Keep contact below 0.15 m/s, lateral alignment within 0.35 m,
axis error below 5° and rotation below 1°/s; these are game tolerances.

**Missions → Surface landing** opens the standard training lander with an obvious
**Landing assist** toggle. It is powered descent guidance, separate from upright
hold. Commands obey the power ceiling and use fuel. Manual controls, a readable
throttle slider and descent camera remain available.

Phone flight uses a bounded viewport: three critical readings, the scene and
touch controls remain together. Docking has Translate/Rotate groups, Fine RCS,
three mounted cameras and a separate inspection state. Optional sheets pause
flight and release held controls. See [v0.5 verification](docs/QA-V05.md) for
checked viewports, scenarios and remaining real-device limits.

Fourteen destinations are available: Moon, Phobos, Deimos, Io, Europa, Ganymede,
Callisto, Titan, Enceladus, Rhea, Iapetus, Triton, Mercury and Mars. The workshop
also starts **your own retained spacecraft** in local surface rehearsals; it
does not simulate interplanetary transfers there. Some designs lack sufficient
thrust on higher-gravity bodies. The planner warns rather than changing hardware.

## Develop and transfer

Node.js **22.12+** and npm are required. Run in the extracted project folder:

```sh
npm ci
npm test
npm run build
npm run preview
```

`npm run dev` starts development. Build outputs are static `dist/` and portable
`dist/Kineti-Core.html`. Relative assets support root or subpath hosting. No
private service or developer-machine path is required.

After committing a tested version, `npm run export` creates a source ZIP and
SHA-256 manifest from that commit, without Git history or scratch files. Follow
[REPOSITORY-TRANSFER.md](docs/REPOSITORY-TRANSFER.md) before moving repositories.
Browser saves remain origin/device-local; a new URL does not inherit them.

## Evidence and next milestone

- [v0.4 changes and limits](docs/RELEASE-V04.md)
- [Independent QA](docs/QA-V04.md), with numerical and browser evidence separated
- [North Star and v1 gates](docs/NORTH-STAR.md)
- [Physical models](docs/PHYSICS.md) and [Europa research](docs/EUROPA.md)
- [Design language](docs/DESIGN.md) and [reusable skill](skills/kineti-design/SKILL.md)
- [Windows/macOS/Android plan](docs/DISTRIBUTION.md)

NASA/JPL/USGS data and images retain credits in
[public/assets/SOURCES.md](public/assets/SOURCES.md). Dependency notices ship in
`dist/THIRD_PARTY_NOTICES.txt` and the portable HTML. Spacecraft, pad and surface
geometry are illustrative fictional hardware. No NASA affiliation or endorsement.

Completed versions are tested, built, committed and pushed with a portable build
and a pull request requesting **@ropotropo** review, without automatic merging.
Windows `.exe` and Android `.apk` previews are available in the [v0.5.0 release](https://github.com/ropotropo/Hakaton2026/releases/tag/v0.5.0). See [installation and platform limits](docs/DISTRIBUTION.md); these initial native packages have not been acceptance-tested on Windows or an Android device.
