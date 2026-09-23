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
