# Kineti Core design language

## Optical bench

A black instrument bench surrounding a sunlit spacecraft. The ship, planetary
limb and moment of contact carry the drama; the interface provides calm,
precise control. This direction follows Andrii's brief for Apple-like clarity
combined with aerospace technology and restrained science fiction. It is a
working direction for Nikita's game, not a claim of final author approval.

Kineti Core has its own identity. Do not import Malibu Wired's brass, TRD's
dashboard components, a generic neon cockpit, or a marketing-site hero.

## Palette

| Token | Value | Purpose |
| --- | --- | --- |
| Vacuum | `#000000` | Page, space and workstation foundation |
| Carbon | `#0a0a0b` | Recessed controls and command surface |
| Titanium | `#303034` | Necessary boundaries and inactive mechanisms |
| Ceramic | `#f5f5f7` | Text, selected hardware and primary actions |
| Silver | `#a1a1a8` | Supporting labels and secondary information |
| Navigation | `#9bcaff` | Focus, reference axes and powered navigation assists |

Success green `#a8d8bd`, caution amber `#edb96d`, and failure red `#ff8b83`
communicate physical state. None is a decorative brand accent. Large
backgrounds stay neutral black. Celestial bodies supply their own natural color.

## Type and geometry

Use the Apple system sans on Apple platforms, with the platform system sans as
the portable fallback. This is an intentional response to the brief and works
offline without a remote font service. Main values use tabular sans numerals;
reserve monospace for elapsed time, keycaps and log timestamps.

Typical scale: 10–12 px instrument labels, 12–13 px controls, 21–26 px command
headings, 30–37 px assembly headings, and 30–35 px instrument values. An outcome
can use one 40–58 px statement. Display copy has tight tracking; labels use
normal tracking and sentence case. Do not accent an isolated headline word.

Controls have a 7 px radius, module choices 5 px, dialogs 14–17 px. These
different radii describe function rather than making every container a card.
Use fewer boundaries: a rule separates a stage, a recessed field contains an
input, and a small white selection rail identifies installed hardware. There
are no decorative grids, scan lines or repeated glowing borders.

## Composition

```
Kineti Core / original game by Nikita                   Guide / pause
Assembly                 Ascent                 Docking / landing
Destination        Sunlit vehicle or world        SI instruments
Module sequence    Real maneuver / real contact    Readiness / fuel
                   Command surface                Checkpoints
```

The main 3D viewport is the largest uninterrupted surface. Its heading and
reference controls stay at the edges. A small segmented view control switches
between vehicle inspection and the chosen world. It never changes simulation
state silently. The selected destination appears as an itinerary plate in the
assembly column; choosing a moon should feel like setting the mission.

Align controls and narrative left. Values align with their units on a common
baseline. The instrument column is a continuous panel of related readings,
not a stack of tiles. The command surface has one obvious next action. White
is the primary action color. Safety actions use amber or red only when their
meaning warrants it.

On narrow screens, the scene and active controls come first, followed by
configuration and instruments. Module options can use two columns. Inputs
remain reachable and touch controls are at least 44 px high. Desktop sidebars
scroll independently so the command surface stays visible.

During descent, keep altitude, vertical speed and landing-zone offset inside
the viewport as a quiet three-value strip. A player must be able to read the
flight state while adjusting throttle on a phone. In the destination atlas,
keep the close control stationary; desktop destination choices and long
mission details scroll independently instead of stretching the choice rows.

## Worlds and evidence

Use NASA/JPL surface imagery where available, lit as a sphere rather than
painted as a flat glowing icon. Preserve correct visual distinctions such as
Earth's thin atmosphere, an airless Moon and Titan's haze. Label procedural
globes, terrain, fictional hardware and training approximations honestly.
Do not let an attractive render imply a simulated mission capability.

## Motion and outcomes

Motion answers a physical event or a player's action. Thruster visuals follow
actual applied force. Success begins with contact or confirmed physical state,
then reveals a short debrief over the still-visible 3D scene. Failure shows
the impact/abort and explains the violated condition with a useful retry.
Avoid confetti, screen-wide neon, continuous pulse effects, artificial camera
shake during delicate control, and timers masquerading as mission progress.

Debrief text fades in once. The renderer should reduce camera motion and
particle intensity when reduced motion is requested; CSS removes interface
transitions and debrief animation. Never hide essential warnings behind an
effect. Focus stays visible in Navigation blue.

## Critique of the direction

The first version's orange identity, blue-gray panels, all-cap eyebrows and
identical module cards were familiar template cues. This revision changes the
composition through more space for the scene, neutral black surfaces, white
actions, proportional instrument values and physically meaningful selection
marks. Apple influence is in clarity and restraint, not copied product chrome.
The science-fiction element belongs to vehicle materials, lighting, reference
geometry and consequences, rather than ornamental UI decoration.

For later additions, review assembly, the destination atlas, an active
maneuver and both outcomes together. A new control should earn its space by
helping a player make a flight decision. If an accessory competes with the
spacecraft or makes data harder to read, remove it.
