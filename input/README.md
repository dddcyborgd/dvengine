# input/ — old-school joysticks, the modern mouse, the mic and the camera as ONE joystick model

Every source feeds the same virtual joystick (`DVJoystick`), the merger (`DVControls`) sums axes and OR-s buttons across
sources with per-source edge detection, and the combination engine (`DVChords`) turns simultaneous presses, sequences and
holds into named actions — so the sphere, the items, the aivatar and the daemon never care where an axis came from.
The **core** button (`K`, or the mouse's right button, or a nod) acts **only through combinations**.

| module | global | what |
|---|---|---|
| `joystick.js` | `DVJoystick` | a virtual stick: axes x/y from four direction keys (diagonals normalised), buttons fire · sideLeft · sideRight · core, held-time, gamepad mapping, keys released on blur |
| `chords.js` | `DVChords` | combinations: simultaneous (`core+up`), sequences (`core,core` within 350 ms), holds (`core:hold` ≥ 600 ms); customisable map; pure and testable |
| `mouse.js` | `DVMouseStick` | the modern mouse as a joystick — the [ArcballControls model](https://threejs.org/examples/#misc_controls_arcball): the pointer extends onto the ball; position mode (dead zone 8 %), pointer-lock velocity mode, buttons → fire/core/sides, wheel → raise/lower (with core: prev/next; with a side: grow/shrink), touch |
| `senses.js` | `DVSenseStick` | the mic and the camera as joysticks, sourced from `DVParticipantInput.shared()` (else `DVDirector.Senses`, else inert): head yaw/pitch → the right stick, lean → forward, face gestures and voice onsets → button pulses the chord engine sees exactly like keys |
| `controls.js` | `DVControls` | the merger + the DEFAULT LAYOUTS (persisted in `localStorage['dv.controls']`, `DVControls.reset()`), `describe()` = the printable map below, `mount({participant, field, conn, verse})` |

## The default map (`DVControls.describe()`)

```
LEFT STICK — movement                   RIGHT STICK — the field of influence    ARROWS — joystick emulation
        [E]                                     [I]                                     [↑]
  [S] ◄  ●  ► [F]                         [J] ◄ (K) ► [L]                         [←] ◄  ●  ► [→]
        [D]                                     [,]                                     [↓]
fire [Space]  side [A] [C]              fire [·]  side [·] [;]                  fire [RCtrl]  side [RShift] [Num0]
side-left = strafe · side-right = run   core [K] — combinations only            side-left = strafe · side-right = run

CHORDS (the core acts only through these)
  core+up               sphere.raise
  core+down             sphere.lower
  core+left             sphere.prev
  core+right            sphere.next
  core+fire             item.use
  fire                  interact
  core,core             focus.toggle
  core:hold             menu
  left+right            reach
  fire:hold             gesture.greet
  sideRight:hold        field.grow
  sideRight,sideRight   field.shrink
  core+sideRight        field.shrink
  core+sideLeft         field.mode

MOUSE AS A JOYSTICK (https://threejs.org/examples/#misc_controls_arcball — the pointer extends onto the ball)
  left button           fire
  right button          core
  middle                sideLeft
  back (3)              sideRight
  forward (4)           sideLeft
  wheel                 raise / lower · +core: prev / next · +side: grow / shrink
  position              the right stick (dead zone 8 %)
  pointer lock          velocity → the sphere turns with the mouse
  touch                 one finger = stick · second finger = fire

MIC + CAMERA AS JOYSTICKS (after "enable senses")
  head yaw / pitch      right stick x / y (dead zone 4°, full at 30°)
  lean in / back        left stick y
  jawOpen · nod         fire tap · core tap
  browsUp · smile       sideLeft tap · sideRight tap
  voice onset · peak    fire tap · core tap
  speaking ≥ 400 ms     fire held · the field grows (relaxes in 10 s)
  inflection ↑ / ↓      raise / lower
  level                 energy → item glow

GAMEPAD
  axes 0 / 1            x / y
  button 0              fire
  4 / 5                 sideLeft / sideRight
  9                     core
  12–15                 up down left right

? / F1 toggles this map · click a slot, press a key to rebind · saved in localStorage[dv.controls] · DVControls.reset() restores
```

## Customising
Click a slot in the overlay (`?` / `F1`), press a key; or `DVControls.bind('right', { core: 'KeyK' })`; chords via
`DVChords.create(map)` or `DVControls.chords.map`. Every layout is validated (no duplicate codes across attached sticks).
Sources have `weight` and `enabled`; `mount({senses:true})` enables the mic/camera stick after the participant's
"enable senses" gesture. Upstream inspiration: the oncyberio awe input system
(https://github.com/oncyberio/awe/tree/main/packages/engine/src/input) — re-imagined here as joystick emulation.
