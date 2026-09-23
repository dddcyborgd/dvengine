# Changelog — dvengine

## 0.0.2-alpha — 2026-09-23

- `input/`: DVJoystick · DVChords · DVMouseStick · DVSenseStick · DVControls — old-school joystick layouts (ESDF·A/C·Space / IJKL;, with K the core button of combinations / arrows), the mouse, the mic and the camera as sources, chords, gamepad, persisted custom layouts.
- `verse/field.js` (DVField, alias DVSphere) + `field.math.js`: the resizable field of influence — items (sceptre, orb) on its surface, arm reach, drivers (mouse arcball, right stick, XR), recognition (degree = r/max × outflow, the bound at extent − 1), the hierarchy's two dials, modes open · connected · private with links.
- components `sceptre`, `orb`; editors regenerated (47 schemas); dist lane `dvengine-input.js`.
- 92 tests.

## 0.0.1-alpha — 2026-09-23

The first complete alpha: a DeltaVerse can enter a cyborg space, edit it, and hand it to the triad.

- **engine/** — `DVEngine` (Space · register · lazy folder-is-module · events · `load(doc)` / `serialize()`), `DVScene` (cyborg-space/1: create · validate · fromLegacy · merge · canonical · keccak256 digest · toTokenURI / fromTokenURI), `DVLegacyScene`.
- **components/** — 37 awe ports + 8 DeltaVerse-native (`substrate · portal · zone · piece · aivatar · thot-memory · participant · remote-participant`); `components/README.md` (table · optional globals · the aivatar · the triad · protocol).
- **edit/** — `DVTransform` (selection · gizmo: three TransformControls or the own `edit/pivot` · TransformProxy · DragHandler → history), `DVCommands`, `DVHistory` (cap 200, auto-batch), `DVSnap`, `DVGrid`, `DVCapture`.
- **editors/** — `DVEditors` + 45 generated schemas (`scripts/gen-editors.mjs`, rows derived from the ports' `props.<key>` reads) + `registry.json`.
- **studio/** — `studio.html` / `DVStudio`: hierarchy · canvas · schema-driven inspector · history · scene JSON drawer · assets · read-only wallet; shortcuts G/R/S · X · D · Ctrl+Z/Y · F; save = download or `POST <cyborgd>/space/:id`; `?selftest=1`.
- **net/** — `DVNet` (cyborg/1, 20 Hz, reconnect, repoint), `TransformSync`, `DVPeer` (RTCDataChannel mesh, no default ICE), `DVHost` (the host role over `CyborgdCore`).
- **xr/** — `DVXR.probe` (asked, never inferred), `DVXR.teleport`, `DVXR.button`.
- **verse/** — `DVVerse.enter` (document → `world.ensure` → world → participant → net → senses → journey), rung (claims decoded, never verified), ArcballControls focus camera, holdings / iNFT / THOT readers with fallbacks. `world.ensure(doc)` registers every needed type through `DVEngine.lazy` before building — a lanes-only consumer page no longer hits `unknown component type "participant"`.
- **transform/** — the Node asset desk over the vendored glTF-Transform (optimize · inspect · validate · bake · vrm · gates); VRMC pass-through fixed in the test fixture (hand-packed GLB).
- **legacy/** — `legacy.html` + `awe-runtime/` + `static-scene.json`, the reflection beside the engine.
- **live/spaces/** — 7 documents (agora · journal · dojo · boardroom · treasury · warcouncil · sanctum).
- **scripts/** — `check-syntax` · `serve` (:8801) · `vendor-three` · `gen-editors` beside `fetch-upstream` · `library` · `doc-js` · `build` · `strip-types`.
- **docs** — `README.md`, `UPSTREAM.md`, `LIBRARY.md`, per-lane READMEs (edit · editors · studio · net · xr · verse · components · transform).
- Tests: 9 files / 55 tests green under `node --test test/*.test.mjs`; `scripts/check-syntax.mjs` parses every `.js`/`.mjs` outside archive/ vendor/ dist/.

## 0.1.0 — 2026-09-22

- Home created at github.com/dddcyborgd/dvengine (MIT). Upstream vendored by pinned sha (archive/SOURCES.json).
