# Kineti Core: direction of flight

Working product direction, 15 November 2026. Original concept: Nikita. Andrii's brief and this implementation establish a proposal for Nikita to review, not a claim of his approval of every design choice.

## North Star

**Design a mission, understand the consequences of its engineering choices, and personally fly its critical moments.**

The defining experience is a chain of decisions: a heavier sample package changes the launch; a landing target changes the vehicle and sampling method; a hurried approach spends the reserve needed to return home. Beauty makes the spacecraft believable. Consistent physics makes success earned.

Our product measure is the share of first-time players who complete a critical maneuver and can explain one engineering tradeoff they made. Supporting measures: a successful launch-to-docking run, a safe manual landing, retries that improve contact speed or fuel reserve, and whether players distinguish a training handoff from a continuous flight. These are proposed measures; no analytics or player results are fabricated or collected by this build.

## Play loop

Choose a scientific objective → select a destination → design and budget the spacecraft → launch and stage → transfer and rendezvous → land → collect a sample → ascend and dock → return and debrief.

Only the implemented portions below are playable today. A destination picker does not imply that transfer, surface survival, sampling or return already exists.

| Version | Player outcome | Exit criteria | Deliberate boundary |
| --- | --- | --- | --- |
| v0.1, released | Assemble a two-stage rocket, reach a bound Earth orbit, dock manually | Fuel and mass accounting, physical orbit check, safe capture and checkpoint restore | 2D ascent; terminal docking starts as a separate scenario |
| v0.2, this stage | Inspect 12 moon destinations and manually land a standard training lander in their local gravity | NASA image maps for Earth, 12 moons and their parent planets, distinctive black instrument design, finite-fuel descent, explicit contact limits, success/failure debrief and effects | Training lander is independent of launch design; local surface exercises do not simulate transfers, radiation or sampling |
| v0.3, proposed | Fly one coherent Moon mission from Earth orbit to landing | Shared spacecraft state and resource ledger; translunar injection, time warp for coast, lunar sphere transition and a readable map; checkpoints at maneuvers; controllable landing hardware chosen in assembly | Moon first; no instantaneous interplanetary travel disguised as continuous physics |
| v0.4, proposed | Collect a lunar sample, launch from the surface, rendezvous and return | Sample tool and mass budget, ascent stage, rendezvous targeting, oxygen/power reserves, entry/heat and recovery; failure explanation traces back to a decision | An achievable lunar campaign before adding many deep-space routes |
| v0.5, proposed | Plan a genuinely different mission to an outer-system moon | Transfer windows, finite energy and propulsion, body-specific instrument packages; radiation around Jupiter, Titan atmosphere and icy sample handling; compare mission budgets | Research and validate environments individually; label speculative hardware |
| Distribution milestone | Install the tested game on a PC or Android device | Windows/macOS/Android smoke matrix, appropriate inputs, stable saves, signed packages where required | Packaging is not a replacement for mobile performance work |

Version numbers describe order, not promised delivery dates. The next gate is a coherent lunar mission, not a longer list of decorative destinations.

## Physics contract

Use SI units, fixed steps, finite resources and observable state. Time warp changes elapsed simulation time during allowed phases; it does not remove delta-v requirements. Keep presentation coordinates separate from physical coordinates. State every scenario handoff and important approximation. Build references and numerical tests before expanding the claims of the model.

The current surface scenarios are deliberate exercises using each body's mean-radius spherical gravity. Phobos and Deimos need much lower, slower starts and limited thrust; a future operational mission also needs irregular shape, local gravity and parent-body effects. Titan's simplified drag is not an entry or parachute model. A rendered icy crust is not an implemented subsurface-ocean sampling mission.

## Design contract

The game is an optical mission instrument: true black, disciplined white type, quiet controls and detailed spacecraft under physical light. Real engineering information earns space; decorative telemetry does not. Read [DESIGN.md](DESIGN.md) and the reusable [Kineti design skill](../skills/kineti-design/SKILL.md) for the actual language. No Malibu Wired or TRD visual system is inherited.

## What to test next with Nikita

1. Does the destination survey make a different landing feel worth trying?
2. Can a new player distinguish throttle, drift and attitude, and recover after a failed landing?
3. Does the globe and spacecraft detail support believable scale without hiding the flight instruments?
4. After one safe touchdown, is a complete Moon return mission the strongest next step?

Review through the version pull request. Keep a portable build and browser link with each completed version so feedback refers to a reproducible release.
