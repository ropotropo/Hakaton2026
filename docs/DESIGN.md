# Kineti Core visual direction

## Intent

A spacecraft workbench that becomes a flight deck. The vehicle is the main image; controls, resource accounting and prompts surround it without obscuring it. Preserve Nikita's authorship and the existing Kineti Core name. Do not apply Malibu Wired or TRD branding to this game.

## Tokens

- Space: `#080c11`; instrument panels: `#111820`; separators: `#29343f`.
- Warm hardware white: `#edf1f4`; secondary type: `#a2b1be`.
- Safety orange: `#ff784b`; orbital navigation blue: `#8cc8f2`.
- Typography: system sans with compact 14px controls; large, tightly set mission title only where it introduces the vehicle. Tabular monospace reserved for instrument values and units.
- Radius: 5px controls, 10px necessary bounded panels. No repeated glossy card stacks.

## Layout

Desktop: header with identity and flight actions; a thin sequenced mission navigation; module library at left, large 3D view in the center, resource/flight instruments at right. A command strip below the view holds the current action and input controls. Left alignment throughout; numerical instruments align their values and units.

```
Identity / flight name                         Guide · pause
Assembly                   Ascent                      Docking
Module library       Detailed spacecraft view       Instruments
                     Current flight command
```

During ascent and docking the module library gives way to the flight plan and controls. The 3D view retains a stable center and enough room for orientation cues. Narrow screens stack the instruments and library below the 3D view; controls remain reachable.

## Review of the direction

Avoid the generic neon space-shooter HUD: orange marks actions and warnings, blue marks navigation, and the hardware carries the visual detail. Do not place a landing-page hero above the game. The memorable element is a detailed, lit vehicle, not a wall of metric cards. Transitions explain a change of flight phase; avoid ambient UI animations. Respect reduced motion, visible focus and sufficiently large touch targets.
