# Installation and distribution

Technical direction checked against primary documentation on 15 November 2026. Native installers are a future milestone; v0.4 ships a static browser game and a self-contained HTML download.

## Decision

Keep one simulation and Three.js renderer. Ship and test the web build first, then wrap the same built assets for each operating system. `.exe` is a Windows executable/installer; `.apk` is an Android package, not a PC format. Preserve the no-account offline game as the baseline.

| Target | Preferred next experiment | Reason and release gate |
| --- | --- | --- |
| Windows | Tauri 2 shell, NSIS `setup.exe` | Tauri supports Windows installers and uses the platform webview. Verify WebGL2 performance and controls on Windows/WebView2; build in Windows CI and sign a public release. |
| macOS | Tauri `.app` / `.dmg`; Safari web app as a simpler option | Reuse the WebKit compatibility work. Public app distribution requires a signing/notarization plan. Safari can also add a website to the Dock without us shipping a native binary. |
| Android | Compare a Tauri Android build with a Capacitor wrapper | Both can package web content, but actual WebGL performance, touch controls, memory and pause/resume must be tested on devices. Distribute a signed APK for direct testers; use an AAB if later publishing through Google Play. |
| Browser installation | Small PWA milestone after stable hosted updates | A manifest and carefully versioned offline cache can provide an installed window on supporting browsers. Do not introduce stale asset/checkpoint mismatches during a flight. The portable HTML already supplies offline play. |

Tauri is the initial desktop recommendation, not a dependency installed in this release. Electron Forge remains the fallback if a consistent bundled Chromium engine materially improves graphics compatibility enough to justify the larger distribution. Electron's tooling packages and distributes desktop applications; it does not produce the Android version.

## Work before installers

- Establish a minimum GPU/WebGL2 and memory budget, and add selectable rendering quality.
- Test landscape touch flight and legible small-screen instruments on real Android hardware. A responsive page alone does not prove mobile playability.
- Define save export/import and migration between browser storage and native app storage. Existing browser saves will not automatically follow an installer.
- Build deterministic release artifacts in an OS matrix, publish checksums and keep rollback builds.
- Handle focus loss, suspend/resume and context loss without running a hidden mission or losing a checkpoint.
- Add native capabilities only for a real product need; the game currently needs no remote backend, paid API or broad device permissions.

No platform SDK, signing identity, paid service or app-store submission was configured by this research. The next implementation decision should follow actual Windows and Android graphics measurements.

## Primary references

- [Tauri: Windows Installer](https://tauri.app/distribute/windows-installer/) — NSIS setup executables, MSI and build-host constraints.
- [Tauri: process model](https://tauri.app/concept/process-model/) — platform webviews rather than a bundled browser engine.
- [Tauri: Google Play](https://tauri.app/distribute/google-play/) — Android distribution.
- [Capacitor: Android](https://capacitorjs.com/docs/android) — Android Studio and Android WebView runtime.
- [Electron: Electron Forge](https://www.electronjs.org/docs/latest/tutorial/forge-overview) — desktop packaging and distribution.
- [Microsoft: use installed PWAs](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/ux) — installed browser applications on Windows.
- [Apple: Safari web apps](https://support.apple.com/en-ie/104996) — Add to Dock on macOS. Some older general PWA articles incorrectly describe current Safari desktop support; Apple's current documentation is authoritative here.
