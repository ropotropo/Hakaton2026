# Kinetic Core - 280-second rehearsal

## 1. Kinetic Core (20 s)

Hello, I'm Mykyta Borisov, the author of Kinetic Core. This is my space mission design game for NASA Space Apps Challenge 2026. I wanted the spacecraft you build to matter throughout the mission.

## 2. For curious minds (35 s)

Kinetic Core is designed for students, curious learners and space enthusiasts. It gives them a place to explore engineering choices before seeing those choices in motion. The central question is simple: what happens when I change my spacecraft? The aim is to make mass, thrust, fuel and the consequences of a decision visible through interaction with the game.

## 3. Spacecraft builder (45 s)

The mission starts in the workshop. Players assemble a spacecraft using typed attachment points, so components must fit compatible places. Changing dimensions changes the vehicle's geometry and the values used by the flight model, including loaded fuel and mass. The workshop shows mass, thrust and an ideal delta-v budget. That budget helps compare designs, with gravity, drag and steering losses outside the ideal calculation. A saved design then becomes the spacecraft used in flight, connecting construction with its consequences.

## 4. The Moon mission (55 s)

The main continuous route takes that same spacecraft from Earth to the Moon. The player launches, separates stages and manages burns. During coasting, engines can be off while the spacecraft keeps moving. The Moon approach, capture and descent continue the same mass and fuel accounting. The recorded Moon demonstration uses powered guidance and explicit pilot staging. Stating that assist mode keeps the demonstration clear. Other destinations are available as labelled local landing rehearsals. They are separate exercises, so they do not imply a complete Earth-to-every-world mission.

## 5. Landing and docking (45 s)

Landing and docking turn the mission into precise control. A safe landing depends on contact conditions: vertical and sideways speed, pad offset, tilt and suitable hardware. Docking is a separate local three-dimensional exercise. The player reads range, closing speed and alignment, then uses body-axis thrusters to correct the approach. Powered braking and attitude assistance help, while propellant remains limited. These interactions give small corrections a visible cost and make the final moments understandable through instruments.

## 6. Physics with clear limits (55 s)

Four choices make the physics inspectable: SI units, double-precision state, finite fuel with shared mass accounting, and explicit model boundaries. The Moon route uses two-dimensional patched conics with a synthetic circular Moon and idealized engine pointing. Docking uses a separate local three-dimensional model with quaternion attitude. Existing project QA records eighty-six passing tests. Those records cover defined fixtures, including conservation, resource accounting, reference-frame changes and contact. They are earlier evidence, not a new test run. The useful claim is a transparent educational model whose assumptions and checks can be inspected.

## 7. Thank you (25 s)

Thank you for looking at Kinetic Core. My goal is to make spacecraft design and critical flight decisions tangible through play. I'm Mykyta Borisov, and I'd be happy to show the game and answer questions.
