# edit/ — the transform tools (DVTransform)

The awe **engine-edit** package (https://github.com/oncyberio/awe/tree/main/packages/engine-edit, MIT) realized over a `DVEngine.Space`: raycast selection, a gizmo, a transform proxy for multi-selection, a drag handler that turns pointer streams into history commands, snapping, the grid, thumbnail capture. Zero-dependency UMD; `window.THREE` is read at use time.

| file | global | what |
|---|---|---|
| `index.js` | `DVTransform` | `attach(space, { gizmo:'auto'\|'three'\|'pivot', mode, snap:{grid, angle, mode:'off'\|'2d'\|'3d', gap}, grid })` → `ed` with `select · selection · hover · setMode · setSnap · frame · history · commands · grid · gizmo · proxy · detach`. Events on the space: `dv:select {ids}` · `dv:transform {ids, phase, changes}` · `dv:command` · `dv:hover` · `dv:mode` · `dv:snap` |
| `commands.js` | `DVCommands` | `add · remove · duplicate · group · ungroup · update · transform · transformMany · reparent` — each edits the cyborg-space/1 document (`space._doc`) first and re-mounts only the ids it touched, so `space.serialize()` always round-trips |
| `history.js` | `DVHistory` | undo/redo stack (cap 200) with auto-batching of rapid same-key commands inside 300 ms (pointer-driven transform streams collapse to one entry) |
| `snap.js` | `DVSnap` | pure snapping maths — `Snap3D` (bbox face contact / edge alignment), `snap2d` (artwork alignment + spacing), `snapAngle`, `snapGrid`, `snapToBounds` — node-tested in `test/snap.test.mjs` |
| `grid.js` | `DVGrid` | the editor grid + axes (XZ / XY / YZ), flagged `userData.dvGizmo` so selection and capture ignore it; reads the `--dv-*` palette |
| `capture.js` | `DVCapture` | `captureThumbnail(space, {w,h})` → data URL (offscreen render, gizmos hidden, size restored) |
| `pivot/*.js` | `DVPivot` | the own gizmo when three/addons TransformControls is absent: 3 axis arrows · 3 plane sliders · 3 rotators · 8 corner scalers · a box slider, TransformControls-compatible surface |

**Gizmo choice.** `gizmo:'auto'` takes `window.TransformControls` (three/addons) when the page set it, otherwise `DVPivot.Controls`. Both attach to the TransformProxy (an invisible AABB around the selection); the proxy drives the objects in local space, the DragHandler records `{ id, changes, undo }` per object and pushes one `transformMany` command per drag (merged by history).

**Use.** `var ed = DVTransform.attach(space, { grid:true }); ed.select('mesh'); ed.setMode('rotate'); ed.commands.update('mesh', { color: 0xff0000 }); ed.commands.undo();` — the studio (`studio/`) is the reference consumer; the inspector schemas live in `editors/`.
