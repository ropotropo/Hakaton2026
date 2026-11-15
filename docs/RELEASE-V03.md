# Kinetic Core v0.3

## Playable changes

- Team/game branding is Kinetic Core. Personal attribution was removed from the game UI. The site menu opens an English Creator biography page marked Under development.
- Mercury and Mars join twelve moon descent exercises. Radii and gravity references: https://ssd.jpl.nasa.gov/planets/phys_par.html and gravitational parameters https://ssd.jpl.nasa.gov/astro_par.html. Mercury uses vacuum descent; Mars uses a simple exponential near-surface atmosphere (0.020 kg/m³ sea-level reference, 11 km scale height), not atmospheric entry or parachutes. Training hardware remains fictional.
- Landing guidance shows pad bearing, drift, descent speed and estimated full-thrust stopping distance. It is advisory, not an autopilot.
- Earth/cloud shell separation and matching tessellation reduce depth interference; procedural cloud opacity is reduced. Earth is reframed in orbital views. The high-ascent station model is a visual reference, not physically simulated ISS rendezvous or an ephemeris.
- Online Earth uses MapLibre GL JS 5.6.1 and OpenFreeMap Liberty with OpenStreetMap roads/building extrusions. Inspect manual coordinates, pin a site and navigate the camera. Internet is required. Data and building heights vary by location; there is no promise of photorealism, complete building coverage, terrain collision or physical spacecraft touchdown in cities. Keep map attribution visible. Sources: https://openfreemap.org/quick_start/ and https://maplibre.org/projects/gl-js/.
- A separate custom workshop adds independently sized/reordered components, save/load and JSON import/export with a 100-part validation limit. It is an engineering sandbox. Custom designs are not fed into the original two-stage flight simulation.
- A manually controlled crawler rollout precedes the original launch. Fixed-step low-speed ground handling gates launch confirmation on distance, speed and heading. It is a fictional procedural transport scenario, not a structural/suspension simulation or an accurate launch facility reconstruction.

## Verification

43 existing and added numerical/checkpoint tests passed, including descent feasibility tests across all fourteen destinations and adequate braking thrust for Mercury/Mars. Regular and portable builds were produced. Browser checked custom capsule/tank/engine assembly and changing estimates; rollout throttle moved the platform and launch confirmation was initially disabled; online NYC roads/buildings loaded and W moved the camera; site menu and biography routing were exercised. The final English biography copy replaces an earlier Russian placeholder.

No full end-to-end crawler-to-orbit mission, manual Mars touchdown, all-city coverage or Safari pass is claimed for this revision. Remaining work: launch custom workshop vehicles, shared Earth map/spacecraft physics, terrain/building contact, continuous transfers and full mission playthroughs.
