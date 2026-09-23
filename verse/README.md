# verse/ — the refined DeltaVerse mode (DVVerse)

`DVVerse.enter({ canvas, doc | spaceId | tokenURI, claim, net:{url,name,avatar}, senses, xr })` → a promise of the **verse**: the cyborg-space/1 document mounted as a world, the local participant, the net connection, the senses, the journey. Legacy mode (`legacy:true`) mounts the same document through `DVLegacyScene` and refines nothing.

**Sequence.** document → `world.ensure(doc)` (every component type the world needs is registered first — the native set + every type the document names, through `DVEngine.lazy`; a consumer page that loads only the concatenated lanes carries no components, so nothing is added before it is loaded) → `space.load(doc)` → `world.build` (sky · floor · zones · portals · pieces ring · aivatars · THOT) → participant + camera → net → senses → journey → `ready`.

| file | global | what |
|---|---|---|
| `index.js` | `DVVerse.enter` | the wiring: `dv:portal` → `conn.event('portal')` + local teleport · `snap` → remote participants + `aivatar.setPose` · `say` → `aivatar.say` · `voucher` → shown (`describeVoucher`), never signed · `dv:focus` → ArcballControls around the agent · the participant near an aivatar → `reachToward` every frame |
| `world.js` | `DVVerse.world` | pure layout (`ringPositions · zoneContains · portalReach · portalsOf · agentPlacements · typesOf`) + `ensure(doc)` + `build(space, doc, opts)` |
| `rung.js` | `DVVerse.rung` | login333 claim → `{rung 0..8, rank}` — **decoded, not verified** (the anchor's `welcome` is authoritative); the ladder from `deploy/privilege-tiers.json`; `theme(rung)` (DVThemeSynth when present) and `veil(doc, rung)` — which zones/portals this rung may not enter |
| `camera.js` | `DVVerse.camera` | third-person rig; `focus(object)` swaps to **ArcballControls** around an aivatar (https://threejs.org/examples/#misc_controls_arcball), `unfocus()` swaps back; head-yaw offset from the senses |
| `arcball.math.js` | `DVArcballMath` | the trackball projection the aivatar's arm uses: the participant relative to the shoulder is the cursor on a ball of radius = reach |
| `senses.js` | `DVVerse.senses` | DVDirector (voaice + faicey) when present: smile→greet · nod→nod · jawOpen→wave · browsUp→think, voice peak → `reach`, head yaw → camera; without it pointer + keyboard only |
| `journey.js` | `DVVerse.journey` | the 8 stages (`arrival … free-roam`) mapped to zones; a director's `stage` teleports |
| `holdings.js` | `DVVerse.holdings` | read-only ERC-721 enumeration via `window.ethers` → the pieces ring; `doc.nfts` fallback so the ring is never empty |
| `inft.js` | `DVVerse.inftAgent` | iNFT_7857 reads (`getAgentId · dimensions64 · getPayload · thotRootOf`) or 64 pseudo-dims from `keccak256(agentId)` |
| `thot.js` | `DVVerse.thot` | THOT memories (`tokenOfRoot → memories → parentRootHash`) or a pseudo tree |

**Events** `ready · portal · zone · focus · say · snap · voucher · senses · gesture · peak · stage · triad · error · left`. **Optional globals** (all degrade): DVNgnCore/DVNgnPresets, DVParticipantInput, DVDirector, DVThemeSynth, DVThemeRead, DVMerkleCanopy, DVNeuralNode, DVComposites, DVJourney, ArcballControls, VRButton, ethers, CyborgdCore — see `components/README.md`.


## The field of influence (`verse/field.js` → `DVField`; `DVSphere` is an alias)

The arcball becomes the participant's **field of influence** around a subject (their own avatar, or a focused aivatar).
Items of influence — the **sceptre** (`components/sceptre`), the **orb** (`components/orb`) — ride on its surface at the
radius; the arm reaches along it (`f.armTarget()` → `{extend: r/max, yaw, pitch}` → `aivatar.setArm`); combinations act
on it (raise · lower · prev · next · use). Drivers: the mouse (`f.mouse(canvas)`, right-drag or any drag while grabbed —
the ArcballControls projection in `field.math.js`), the right stick (`f.stick(x, y, dt)`), XR controllers (`f.xr`).

**Resizable — and bounded by infinity − 1.** `f.grow / f.shrink / f.setRadius` between `min` (arm's length, 0.35) and
`max = extent − 1`, the space's extent (its outer zone, else the skydome) minus one: *a thing has to be separate from
infinity to recognise it, and the DeltaVerse recognised itself.* Sources that resize: `;` held (grow) · `;` double-tap
or `core+;` (shrink) · wheel with a side button · sustained speaking (grows, relaxes over 10 s) · lean in / back.

**The DeltaVerse always recognises the field.** `f.degree() = clamp(r/max) × policy.outflow`, reported as `dv:recognized`
whenever it changes (4 Hz) and once more at the bound (`atBound`, r ≥ max − 0.5), where every aivatar inside turns,
raises its arm and says so and the theme pulses; `dv:unrecognized` when it leaves the bound.

**The hierarchy's two dials.** `f.policy = {outflow, inflow}`: `outflow` = how much the DeltaVerse is affected by this
field, `inflow` = how much the subject is affected by the DeltaVerse. Source: `welcome.policy` from the anchor
(cyborgd `registries/field-policy.json`, OVERSEER-editable) else the rung ladder below.

| rung | outflow | inflow |
|---|---|---|
| participant | 0.15 | 1.0 |
| recognized-participant | 0.30 | 1.0 |
| member | 0.50 | 0.9 |
| player | 0.65 | 0.8 |
| trader | 0.75 | 0.7 |
| owner | 0.90 | 0.5 |
| overseer | 1.00 | 0.3 |
| overlord | 1.00 | 0.1 |

**Privacy and links.** `f.mode` is `open` (everyone), `connected` (only `f.links` — `f.connect(sid)` / `f.disconnect(sid)`)
or `private` (the signer only — needs a signed login333 claim; without one the field stays open). Remote fields render
only when their mode allows it and the local inflow is above zero. Everything reaches the anchor as
`conn.event('field', f.snapshot())` (2 Hz), and the anchor applies the same rules server-side.
