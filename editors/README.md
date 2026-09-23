# editors/ — the inspector schemas (DVEditors)

**What.** One schema per component type, driving the studio inspector (`studio/panels/inspector.js`). `editors/index.js` is the registry (`window.DVEditors` = `{ register(type, schema), get(type), types(), has, defaults(type), coerce(row, raw), hex, lazy(type) }`); every `editors/<type>/index.js` registers its schema at load and also `module.exports` it for Node. `editors/registry.json` is the same 45 schemas in one file (the studio's list of addable types when the per-type files are not loaded).

**Generated, not hand-written.** `node scripts/gen-editors.mjs` derives the rows from the `props.<key>` reads in each `components/<type>/index.js` — the port is authoritative, the schema follows it. Kinds are guessed from the default the port falls back to: `props.color`/`*Color`/`tint`/`bg` or a `0x…` literal → `color`; `{x,y,z}` → `vec3`; `!== false` / `!!` → `bool`; a number → `number` (or `int` for `count`/`rows`/`cols`/`seed`/`segments`…) with a min/max/step from the default's magnitude (0..1 for opacity/metalness/roughness/intensity, ±π for yaw); a string that the port compares against `=== '…'` or switches over → `enum`; `url`/`src`/`model`/`texture`… → `asset`; arrays/objects (`dims`, `say`, `points`, `nft`, `bounds`) → `string` with `json: true` (the inspector parses them). `position`/`rotation`/`scale` are always the first three rows (group `transform`). Re-run the generator after changing a component's props.

## Row shape

```
{ key, kind: 'number'|'int'|'bool'|'string'|'color'|'vec3'|'enum'|'asset'|'range',
  min, max, step, options[], default, label, group: 'transform'|'look'|'motion'|'props', json? }
```

`DVEditors.coerce(row, raw)` turns an `<input>` string into the typed value (`color` → a 0xRRGGBB number, `vec3` → `{x,y,z}`, `json` → parsed). `DVEditors.defaults(type)` is what a freshly added component starts from.

## Upstream mapping

awe keeps its editors at https://github.com/oncyberio/awe/tree/main/packages/engine-edit/src/editors — one React/TypeScript editor per component with typed fields. Here the same idea is data: a row list a framework-free panel renders. The 37 ports point at `https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/<type>`; the 8 DeltaVerse-native types (`substrate` · `portal` · `zone` · `piece` · `aivatar` · `thot-memory` · `participant` · `remote-participant`) carry `upstream: "DeltaVerse-native"`.
