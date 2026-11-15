# Nikita navigation branch

This independent development line is based on v0.2.0. Use Flight map to select a planetary system and one of its catalog moons. The itinerary is schematic, not an ephemeris or a computed transfer. Surface and docking exercises remain separate scenarios.

Local maps show actual simulation positions, target and velocity: X/altitude for landing, X/Z for docking. Docking vertical offset remains in the flight instruments. The map pauses flight and releases held controls; closing it restores the previous pause state. Destination changes are restricted to assembly.

Drag the 3D canvas horizontally and vertically to orbit the spacecraft or globe. Scroll to zoom. Reset camera restores the normal view. The camera changes presentation only and never steers the vehicle or spends fuel.

Validation: 42 existing numerical/checkpoint tests passed, regular and portable builds completed. Browser checks verified Earth/Saturn system selection, applying Titan to assembly, and horizontal/vertical camera orbit. Safari and full maneuver outcomes have not been independently retested for this branch. Continuous interplanetary flight is not implemented by this change.
