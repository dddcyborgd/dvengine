# studio/ — the dvengine studio (DVStudio)

A framework-free editor over one `DVEngine.Space` with `DVTransform` attached — the twengine `ui/` pattern (plain UMD `.js`, `window.DVStudio`, no bundler). Open **http://127.0.0.1:8801/studio/studio.html** after `node scripts/serve.mjs` (from the repo root; `node scripts/vendor-three.mjs` first when `vendor/three/` is missing). three.js r182 + OrbitControls + TransformControls are set on `window` by the page's importmap module; everything else is a classic `<script>`.

## Panels

| panel | file | what |
|---|---|---|
| toolbar (top) | `panels/toolbar.js` | modes G/R/S · snap toggle (grid 0.5 · 15° · bbox gap 0.2) + grid · **add** a component type (from `components/manifest.json` ∪ `editors/registry.json`, loaded lazily by `DVEngine.lazy`) · open / paste / legacy / agora · save ↓ (download `space.json`) · save → cyborgd (`POST <cyborgd>/space/:id` with `localStorage['dv.claim']`) · capture (thumbnail → `doc.image` via `edit/capture.js`) · wallet bar |
| hierarchy (left) | `panels/hierarchy.js` | the tree by `parentId`; click selects through `DVTransform.select` (shift = additive); right-click → duplicate · delete · frame · group · ungroup · unparent (all `edit/commands.js` through history) |
| canvas (centre) | `studio.js` | `DVEngine.Space` + `DVTransform.attach` (three/addons TransformControls when present, else the own `edit/pivot`); drop a `.glb/.vrm/image` here to add it |
| inspector (right) | `panels/inspector.js` | schema-driven from `DVEditors` (`editors/<type>/index.js`, lazy); name + id + rows grouped transform / look / motion / props; every change is `commands.update(id, patch)` — undoable |
| assets (right, below) | `panels/assets.js` | every asset url the document references (click selects); the desk hint |
| history (bottom-left) | `panels/history.js` | `edit/history.js` entries, undo / redo, auto-batched transform streams |
| scene JSON (bottom-right) | `panels/scene-json.js` | live `space.serialize()` + `DVScene.validate` + digest; copy · download · apply pasted JSON · open a file · `../legacy/static-scene.json` (through `DVLegacyScene`) · `../live/spaces/agora.json` · copy the tokenURI |
| wallet (toolbar, right) | `panels/wallet.js` | read-only: `eth_requestAccounts` + address + chainId. **Nothing is signed in the studio.** |

## Shortcuts

`G` move · `R` rotate · `S` scale · `X` / `Delete` delete · `D` duplicate · `Ctrl+Z` undo · `Ctrl+Y` / `Ctrl+Shift+Z` redo · `F` frame the selection · `Esc` deselect · shift-click multi-select (a TransformProxy box drives the group).

## Saving to cyborgd

`save → cyborgd` posts `{ doc, claim }` to `<cyborgd>/space/<doc.id>` (`x-dv-claim` header carries the same claim). The anchor is `localStorage['dv.cyborgd']` (default `http://127.0.0.1:8790`); the claim is the login333 claim the participant pasted (`localStorage['dv.claim']`) — it is parsed, never verified, on this side. The document that leaves the studio is the cyborg-space/1 document that IS the token (`DVScene.toTokenURI`).

## Palette

`studio.css` carries the `--dv-*` tokens copied from the DeltaVerse `pages/deltaverse.css` `:root` (abyss backgrounds, the shadow-overlord violet/gold/cyan, the role hierarchy colours, ink). Dark, minimal, phone-width safe (the grid collapses to one column under 640px).

Upstream: https://github.com/oncyberio/awe/tree/main/packages/studio (MIT) — the concepts (hierarchy · inspector · undo manager · assets) — realized here as data-driven panels without React.
