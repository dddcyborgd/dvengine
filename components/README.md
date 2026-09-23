# components/ — folder-is-module (45 types)

Every component is one file, `components/<type>/index.js`: a zero-dependency UMD that calls `DVEngine.register(type, factory)` at load. `factory(props)` returns `{ type, init(ctx) → Object3D?, update(dt, t), dispose() }` — the awe component contract (register → create → init → update → dispose) kept 1:1, so `DVEngine.lazy(type)` can load any of them on first use. 37 are ports of the awe engine components (design © oncyberio, MIT); 8 are DeltaVerse-native. `manifest.json` lists the ports (what `scripts/library.mjs` seeds), `registry.json` their props; the inspector schemas derived from these files live in `editors/`.

## The 45

| type | props (besides position · rotation · scale) | upstream |
|---|---|---|
| `aivatar` | `facePreset` `tint` `dims` `say` `seed` `yaw` | DeltaVerse-native |
| `audio` | `color` `freq` `range` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/audio) |
| `avatar` | `color` `height` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/avatar) |
| `background` | `color` `bottom` `top` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/background) |
| `batch` | `color` `spread` `count` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/batch) |
| `bird` | `color` `radius` `speed` `count` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/bird) |
| `camera` | `color` `height` `radius` `speed` `drive` `target` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/camera) |
| `cloud` | `color` `height` `spread` `drift` `puffs` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/cloud) |
| `destination` | `color` `height` `count` `label` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/destination) |
| `dialog` | `bg` `color` `width` `text` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/dialog) |
| `dust` | `area` `color` `size` `count` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/dust) |
| `envmap` | `intensity` `background` `bottom` `top` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/envmap) |
| `fog` | `color` `density` `far` `near` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/fog) |
| `godray` | `color` `opacity` `length` `origin` `rays` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/godray) |
| `grass` | `color` `size` `windStrength` `count` `ground` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/grass) |
| `group` | `color` `radius` `spin` `count` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/group) |
| `iframe` | `color` `height` `width` `title` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/iframe) |
| `image` | `color` `height` `width` `billboard` `text` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/image) |
| `impact` | `color` `size` `period` `sparks` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/impact) |
| `instancedmesh` | `color` `shape` `animate` `cols` `gap` `rows` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/instancedmesh) |
| `interaction` | `color` `hoverColor` `size` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/interaction) |
| `lighting` | `ambientColor` `ambientIntensity` `intensity` `sunColor` `animate` `hemisphere` `sunPosition` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/lighting) |
| `mesh` | `color` `metalness` `roughness` `shape` `spin` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/mesh) |
| `model` | `color` `spin` `url` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/model) |
| `navmesh` | `color` `pathColor` `size` `cells` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/navmesh) |
| `object` | `color` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/object) |
| `participant` | `height` `tint` `speed` `run` `seed` | DeltaVerse-native |
| `particles` | `area` `color` `size` `speed` `count` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/particles) |
| `piece` | `frameColor` `size` `nft` | DeltaVerse-native |
| `portal` | `color` `height` `label` `locked` `minRole` `r` `seed` `to` | DeltaVerse-native |
| `postprocessing` | `tint` `grain` `vignette` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/postprocessing) |
| `quarks` | `color` `size` `spread` `life` `rate` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/quarks) |
| `rain` | `area` `color` `size` `speed` `count` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/rain) |
| `reflector` | `color` `opacity` `size` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/reflector) |
| `remote-participant` | `avatar` | DeltaVerse-native |
| `spline` | `color` `radius` `speed` `points` `segments` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/spline) |
| `substrate` | `height` `opacity` `preset` `radius` `shape` `width` `fps` `seed` | DeltaVerse-native |
| `terrain` | `height` `size` `flat` `high` `low` `mid` `segments` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/terrain) |
| `text` | `bg` `color` `size` `billboard` `face` `text` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/text) |
| `thot-memory` | `size` `depth` `fps` `label` `nodes` `root` | DeltaVerse-native |
| `video` | `color` `height` `width` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/video) |
| `vrmanims` | `color` `speed` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/vrmanims) |
| `water` | `color` `size` `deep` `segments` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/water) |
| `wave` | `color` `size` `amplitude` `segments` | [awe](https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/wave) |
| `sceptre` | `length` `color` `tint` `glow` `name` `position` | DeltaVerse-native — the first item of influence: a rod with a glowing head; `use()` pulses and emits `dv:item` |
| `orb` | `radius` `color` `glow` `float` `name` `position` | DeltaVerse-native — a floating item of influence |
| `zone` | `bounds` `locked` `minRole` | DeltaVerse-native |

Upstream base: https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/`<type>`. The `vrm-anims` component of upstream is the `vrmanims` folder here (folder names carry no dash for the 37 ports; the natives keep theirs).

## Optional globals (everything degrades)

| global | from | what it enables | without it |
|---|---|---|---|
| `DVNgnCore` + `DVNgnPresets` | DeltaVerse `engine/ngn` | the `substrate` component mounts a real nGn preset (the 512) on an offscreen canvas as a live texture; the aivatar's face | a procedural gradient / a drawn face |
| `DVParticipantInput` | DeltaVerse substrate interaction lane | the pointer-held input ladder drives the `participant` walk (heading + speed) | W/A/S/D + arrows, Shift runs |
| `DVDirector` | DeltaVerse director (voaice ears + faicey eyes) | `verse/senses.js`: gestures → the nearest aivatar + the net, voice peak → reach, head yaw → camera | pointer + keyboard only; `enable()` resolves `{audio:false, video:false}` |
| `DVThemeSynth` · `DVThemeRead` | DeltaVerse theme algebra | `verse/rung.js` emerges the rung's theme and applies it to the page | a fixed per-rung colour table |
| `DVComposites` | DeltaVerse composites | composite substrate skins for the sky | the single preset / gradient |
| `DVNeuralNode` | DeltaVerse bubblerooms | `loadRoom(doc)` reads the document's room-token fields (skin · theme · traits · nfts) | the document is still valid and mounted |
| `DVMerkleCanopy` | DeltaVerse `engine/ngn/merkle-canopy.js` | the `thot-memory` panel hosts a real SHA-256d merkle canopy field | a procedural rooted tree with hash labels |
| `DVJourney` | DeltaVerse journey | the 8-stage participant journey drives `verse/journey.js` | stages advance on `next()` / a director only |
| `ArcballControls` · `VRButton` · `TransformControls` · `OrbitControls` | three/addons (set on `window` by the page) | focus mode · WebXR entry · the three gizmo · the demo orbit | third-person only · no XR button · the own `edit/pivot` gizmo · no orbit |
| `ethers` | vendored by the consumer | `holdings` · `inftAgent` · `thot` chain reads | `doc.nfts` / pseudo-dims / pseudo tree |
| `CyborgdCore` | cyborgd `dist/cyborgd-core.js` | the host role of the triad | everyone stays a client of the anchor |

## The aivatar (`components/aivatar`)

The cyborg AI avatar: a primitive humanoid rig with a substrate face, a breath, a walk, gestures, an arm on an arcball, speech and focus. `dims[0]` → hue, `1 + 0.2·dims[1]` → scale, `dims[2]` → idle speed (the seed decides without dims).

| lane | behaviour |
|---|---|
| motion | breathing (torso) · head tracking toward the nearest participant · walk cycle when the position changes (legs swing, bob) · turn-to-face by the shortest arc (`turnToward`, `yawTo`) |
| gesture | `greet` (1.6 s) · `nod` (1.0) · `wave` (2.6) · `think` (2.2) — `gesture(name)`; the senses map smile/nod/jawOpen/browsUp onto them |
| response | `say(text, emotion)` → a speech-bubble sprite for 4 s (queued) + an emotion tint pulse (`neutral · joy · calm · curious · alert · warm · think`); `setPose({p,r,a,arm})` from the server snapshot |
| trigger | a click on any part of the rig → `focus(true)`: turn to the local participant + greet + `dv:focus` on the space; entering reach → the arm; a portal/zone event → the verse |
| the arcball arm | the participant relative to the SHOULDER is the cursor on a trackball of radius = reach (`verse/arcball.math.js`): the arm's yaw/pitch/extend follow the projected point. `reachToward(worldPos)` predicts it locally (local wins for 300 ms), `setArm(arm)` takes the server's value (`snap.agents[id].arm`) |
| the focus camera | `dv:focus` → `verse/camera.js` swaps to three's **ArcballControls** orbiting the agent (gizmo visible, cursor zoom — https://threejs.org/examples/#misc_controls_arcball); `Esc` / `focus(null)` swaps back to the third-person rig |

## The triad

```
                      anchor — cyborgd daemon (:8790/ws)
                      rendezvous · claims · vouchers · canonical snap
                   ▲ ws                          ▲ ws  mirror{tick,snap}
   client ────────┘                              └──────── host
   (participant / remote-participant)  ◄── RTCDataChannel cyborg/1 ──►  (a participant running CyborgdCore)
```

`participant` produces `pose()` → `conn.state(p, r, a, s, txt)`; `remote-participant` consumes `snap.players[sid]` through `DVNet.TransformSync`; `aivatar` consumes `snap.agents[id]` (`setPose`) and `say`.

## Protocol messages the client sends / handles

sends `hello · state · cmd · msg · event(portal|gesture|reach) · ping · rtc · mirror` — handles `welcome · denied · joined · left · snap · ack · msg · say · voucher · pong · error · peers · host · repoint`. Fields per message: `net/README.md`.
