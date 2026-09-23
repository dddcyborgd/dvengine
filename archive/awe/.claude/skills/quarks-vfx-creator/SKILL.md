---
name: quarks-vfx-creator
description: |
  Generate three.quarks particle system JSON specifications from natural language descriptions.
  Use when users request: (1) particle effects like fire, smoke, explosions, sparkles, trails
  (2) VFX JSON for three.quarks library (3) any visual effect described in words that needs
  to become a quarks JSON spec. Triggers: "create vfx", "particle effect", "quarks json",
  "make an effect for", "explosion effect", "smoke effect", "fire particles", etc.
disable-model-invocation: true
---

# Quarks VFX Creator

Generate three.quarks particle system JSON from user descriptions and add to the game scene.

## Workflow

Creating a VFX requires TWO parts:

1. **Create the VFX JSON file** - The particle system definition
2. **Add a quarks component** - Host the VFX in `static-scene.json`

### Step-by-Step

1. Understand the effect the user wants (fire, smoke, explosion, sparkles, trail, etc.)
2. Create a directory under `/<game-project>/public/assets/vfx/<effect-name>/`
3. Copy or add required textures (circle.png, spark.png, smoke.png, etc.)
4. Generate valid three.quarks JSON following the format in references/vfx-guide.md
5. **Add a quarks component to `/<game-project>/public/data/static-scene.json`** to host the effect

### Quarks Component Format

Add this to the `components` object in `static-scene.json`:

```json
"quarks-<effect-name>": {
  "type": "quarks",
  "id": "quarks-<effect-name>",
  "kit": "cyber",
  "name": "<Effect Display Name>",
  "position": { "x": 0, "y": 2, "z": 0 },
  "rotation": { "x": 0, "y": 0, "z": 0 },
  "scale": { "x": 1, "y": 1, "z": 1 },
  "url": "/assets/vfx/<effect-name>/<effect-name>.json",
  "autoPlay": true,
  "looping": true,
  "speed": 1
}
```

**Component properties:**

- `type`: Always `"quarks"`
- `id`: Unique identifier, typically `"quarks-<effect-name>"`
- `url`: Path to the VFX JSON file (relative to `/<game-project>/public/`)
- `autoPlay`: `true` to start immediately, `false` to trigger via script
- `looping`: `true` for continuous effects, `false` for one-shot effects
- `speed`: Playback speed multiplier

## Quick Reference

### Render Modes

| Value | Mode               | Use for                              |
| ----- | ------------------ | ------------------------------------ |
| 0     | BillBoard          | Most effects (always faces camera)   |
| 1     | StretchedBillBoard | Fast-moving particles (sparks, rain) |
| 3     | Trail              | Trails, ribbons                      |

### Common Effect Patterns

**Burst effect** (explosion, pop):

- `looping: false`, `autoDestroy: true`
- `emissionOverTime: 0`, use `emissionBursts`
- High `startSpeed` with `IntervalValue`

**Continuous effect** (fire, smoke):

- `looping: true`
- Use `emissionOverTime`
- Lower `startSpeed`

**Trail effect**:

- `renderMode: 3`
- `emissionOverDistance` instead of `emissionOverTime`

### Minimal Template

```json
{
  "metadata": {
    "version": 4.6,
    "type": "Object",
    "generator": "Object3D.toJSON"
  },
  "geometries": [
    { "uuid": "geom-1", "type": "PlaneGeometry", "width": 1, "height": 1 }
  ],
  "images": [{ "uuid": "img-1", "url": "circle.png" }],
  "textures": [{ "uuid": "tex-1", "image": "img-1" }],
  "materials": [
    {
      "uuid": "mat-1",
      "type": "MeshBasicMaterial",
      "color": 16777215,
      "map": "tex-1",
      "transparent": true,
      "blending": 2,
      "side": 2,
      "depthWrite": false
    }
  ],
  "object": {
    "type": "Group",
    "children": [
      {
        "type": "ParticleEmitter",
        "ps": {
          "version": "3.0",
          "duration": 1,
          "looping": true,
          "startLife": { "type": "ConstantValue", "value": 1 },
          "startSpeed": { "type": "ConstantValue", "value": 1 },
          "startSize": { "type": "ConstantValue", "value": 0.5 },
          "startRotation": { "type": "ConstantValue", "value": 0 },
          "startColor": {
            "type": "ConstantColor",
            "color": { "r": 1, "g": 1, "b": 1, "a": 1 }
          },
          "emissionOverTime": { "type": "ConstantValue", "value": 10 },
          "emissionOverDistance": { "type": "ConstantValue", "value": 0 },
          "shape": { "type": "point" },
          "material": "mat-1",
          "instancingGeometry": "geom-1",
          "renderMode": 0,
          "uTileCount": 1,
          "vTileCount": 1,
          "startTileIndex": { "type": "ConstantValue", "value": 0 },
          "behaviors": [],
          "worldSpace": false
        }
      }
    ]
  }
}
```

**Note:** Place a `circle.png` texture (soft radial gradient) in the same directory as the JSON file.

### Required Fields Warning

**CRITICAL:** The following fields **must be value generator objects**, not plain numbers. Using plain numbers (e.g., `"startTileIndex": 0`) causes `Cannot read properties of undefined (reading 'type')` errors at runtime.

| Field                  | ❌ Wrong | ✅ Correct                                  |
| ---------------------- | -------- | ------------------------------------------- |
| `startLife`            | `1`      | `{ "type": "ConstantValue", "value": 1 }`   |
| `startSpeed`           | `1`      | `{ "type": "ConstantValue", "value": 1 }`   |
| `startSize`            | `0.5`    | `{ "type": "ConstantValue", "value": 0.5 }` |
| `startRotation`        | `0`      | `{ "type": "ConstantValue", "value": 0 }`   |
| `startTileIndex`       | `0`      | `{ "type": "ConstantValue", "value": 0 }`   |
| `emissionOverTime`     | `10`     | `{ "type": "ConstantValue", "value": 10 }`  |
| `emissionOverDistance` | `0`      | `{ "type": "ConstantValue", "value": 0 }`   |

**Important:** Even if you don't use sprite sheets or distance-based emission, `startTileIndex` and `emissionOverDistance` **must be present** as value generator objects.

## Full Reference

See [references/vfx-guide.md](references/vfx-guide.md) for complete documentation on:

- All value generators (ConstantValue, IntervalValue, PiecewiseBezier)
- All color generators (ConstantColor, RandomColor, ColorRange, Gradient)
- All emitter shapes (point, sphere, cone, circle, hemisphere, donut, rectangle, grid)
- All behaviors (ColorOverLife, SizeOverLife, ApplyForce, etc.)
- Emission bursts configuration
- Complete examples

## Textures

**Important:** Without textures, particles render as solid colored rectangles (often black). Always include textures for proper visual effects.

### Directory Convention

Each VFX should be self-contained in its own directory under `/<game-project>/public/assets/vfx/`:

```
/<game-project>/public/assets/vfx/explosion/
├── explosion.json
├── circle.png      # soft glow for fire/flash
├── smoke.png       # cloudy texture for smoke
└── spark.png       # small bright dot for sparks
```

**Tip:** Copy textures from existing VFX directories rather than creating new ones.

### Adding Textures to JSON

Add `images` and `textures` arrays, then reference in materials via `map`:

```json
{
  "images": [{ "uuid": "img-circle", "url": "circle.png" }],
  "textures": [{ "uuid": "tex-circle", "image": "img-circle" }],
  "materials": [
    {
      "uuid": "mat-fire",
      "type": "MeshBasicMaterial",
      "color": 16777215,
      "map": "tex-circle",
      "transparent": true,
      "blending": 2,
      "side": 2,
      "depthWrite": false
    }
  ]
}
```

### URL Path Resolution

**Gotcha:** Image URLs are resolved relative to the JSON file's directory, not the web root.

- If JSON is at `/assets/vfx/explosion/explosion.json`
- Use `"url": "circle.png"` (same directory)
- NOT `"url": "/assets/vfx/explosion/circle.png"` (will double up paths)

### Texture Sources

**Existing project textures** (copy from existing VFX)

**External:**

- [Kenney Particle Pack](https://www.kenney.nl/assets/particle-pack) (CC0 license - free to use):
  - 80+ particle sprites including fire, smoke, sparks, magic effects
  - Download and resize to 64x64 for smaller file sizes: `sips -z 64 64 input.png --out output.png`

Common textures needed:
| Effect | Texture Type |
|--------|--------------|
| Fire, glow, flash | Soft radial gradient (circle) |
| Smoke, clouds | Puffy/cloudy blob |
| Sparks, debris | Small bright dot |
| Magic, sparkles | Star or cross shape |

### Blending Modes

| Value | Mode             | Use for                                    |
| ----- | ---------------- | ------------------------------------------ |
| 0     | NoBlending       | Opaque particles                           |
| 1     | NormalBlending   | Standard transparency                      |
| 2     | AdditiveBlending | Fire, glow, sparks (bright, additive)      |
| 4     | MultiplyBlending | Shadows (use carefully - can appear black) |

**Gotcha:** Smoke with `blending: 4` (MultiplyBlending) often appears too dark/black. Use `blending: 2` (AdditiveBlending) or `blending: 1` (NormalBlending) instead.

## Output Requirements

### VFX JSON File

1. Always output complete, valid JSON (not just the `ps` object)
2. Include `metadata`, `geometries`, `materials`, and `object` sections
3. Use unique UUIDs for references between sections
4. Match `material` and `instancingGeometry` UUIDs to defined resources
5. Include `images` and `textures` arrays with proper texture references
6. Use relative URLs for textures (same directory as JSON)

### Quarks Component in static-scene.json

7. **Always add a quarks component** to `/<game-project>/public/data/static-scene.json`
8. Use the correct `url` path pointing to the VFX JSON file
9. Set `autoPlay` and `looping` based on effect type:
   - Continuous effects (fire, smoke, ambient): `autoPlay: true`, `looping: true`
   - One-shot effects (explosion, impact): `autoPlay: false`, `looping: false`

### Directory Structure

```
/<game-project>/public/assets/vfx/<effect-name>/
├── <effect-name>.json    # VFX definition
├── circle.png            # soft glow texture
├── spark.png             # spark/debris texture
└── smoke.png             # (if needed) smoke texture
```

Textures can be copied from existing VFX directories like `/<game-project>/public/assets/vfx/explosion/`.
