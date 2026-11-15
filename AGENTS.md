# Kineti Core project instructions

- Nikita is the author of the game concept; Andrii relays his ideas and feedback.
- Use specialist agents for substantial independent physics, visuals and QA work. Assign disjoint file ownership when agents edit concurrently.
- Keep the game interface, submission materials and repository documentation in English. Conversation with Andrii may be Ukrainian.
- Use SI units and a fixed simulation step. A graphical engine is not an orbital solver. Never replace a physical condition with a progress timer or silently apply vacuum damping.
- Distinguish NASA/JPL source data from fictional hardware parameters, illustrative assets and game-specific safety limits. Document important model approximations.
- Preserve checkpoint validation, reconstruct trusted constants on restore, and release held inputs on pause/blur.
- Each completed version must be tested, built, committed and pushed so Nikita can try it. Include the portable `dist/Kineti-Core.html` build. Request pull-request review from `ropotropo` when a version is ready; do not merge automatically.
- Keep scratch files in `work/`, screenshots/results in `outputs/`; both are ignored. Do not commit node_modules or credentials.
- Run `npm test` and `npm run build` for physics/logic changes. Verify the playable in a real browser, including Safari for the final version, and state any unverified scenarios accurately.
