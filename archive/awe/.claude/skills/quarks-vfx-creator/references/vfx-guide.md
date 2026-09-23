# three.quarks JSON Format Reference

This guide documents the JSON format used by the [three.quarks](https://github.com/Alchemist0823/three.quarks) particle system library.

## Table of Contents

- [Overview](#overview)
- [Top-Level Structure](#top-level-structure)
- [Particle System Parameters](#particle-system-parameters)
- [Value Generators](#value-generators)
- [Color Generators](#color-generators)
- [Emitter Shapes](#emitter-shapes)
- [Behaviors](#behaviors)
- [Render Modes](#render-modes)
- [Emission Bursts](#emission-bursts)
- [Examples](#examples)

---

## Overview

three.quarks effects are stored as JSON files compatible with the Three.js Object3D format. Effects can be:

1. **Created visually** using the [quarks.art](https://quarks.art) online editor
2. **Authored programmatically** by writing JSON directly
3. **Exported** from effects created in code using `particleSystem.toJSON()`

Loading an effect:

```js
import { QuarksLoader, BatchedRenderer, QuarksUtil } from "three.quarks";

const batchRenderer = new BatchedRenderer();
scene.add(batchRenderer);

const loader = new QuarksLoader();
loader.load("effect.json", (object) => {
  QuarksUtil.addToBatchRenderer(object, batchRenderer);
  scene.add(object);
});

// In animation loop
batchRenderer.update(delta);
```

---

## Top-Level Structure

The JSON file follows the Three.js Object3D JSON format:

```json
{
  "metadata": {
    "version": 4.6,
    "type": "Object",
    "generator": "Object3D.toJSON"
  },
  "geometries": [
    {
      "uuid": "geom-uuid",
      "type": "PlaneGeometry",
      "width": 1,
      "height": 1
    }
  ],
  "materials": [
    {
      "uuid": "mat-uuid",
      "type": "MeshBasicMaterial",
      "color": 16777215,
      "map": "texture-uuid",
      "transparent": true,
      "blending": 2,
      "side": 2,
      "depthWrite": false
    }
  ],
  "textures": [
    {
      "uuid": "texture-uuid",
      "image": "image-uuid"
    }
  ],
  "images": [
    {
      "uuid": "image-uuid",
      "url": "data:image/png;base64,..."
    }
  ],
  "object": {
    "type": "Group",
    "name": "MyEffect",
    "children": [
      {
        "type": "ParticleEmitter",
        "uuid": "emitter-uuid",
        "ps": { /* ParticleSystem parameters */ }
      }
    ]
  }
}
```

---

## Particle System Parameters

The `ps` object defines a single particle system:

```json
{
  "version": "3.0",

  // Timing
  "duration": 1.0,
  "looping": true,
  "prewarm": false,
  "autoDestroy": false,

  // Initial particle properties
  "startLife": { "type": "ConstantValue", "value": 2.0 },
  "startSpeed": { "type": "IntervalValue", "a": 1, "b": 3 },
  "startSize": { "type": "ConstantValue", "value": 0.5 },
  "startRotation": { "type": "ConstantValue", "value": 0 },
  "startColor": { "type": "ConstantColor", "color": { "r": 1, "g": 1, "b": 1, "a": 1 } },

  // Emission
  "emissionOverTime": { "type": "ConstantValue", "value": 10 },
  "emissionOverDistance": { "type": "ConstantValue", "value": 0 },
  "emissionBursts": [],

  // Shape
  "shape": { "type": "sphere", "radius": 1, "arc": 6.283, "thickness": 1 },

  // Rendering
  "material": "mat-uuid",
  "instancingGeometry": "geom-uuid",
  "renderMode": 0,
  "renderOrder": 0,
  "rendererEmitterSettings": {},
  "uTileCount": 1,
  "vTileCount": 1,
  "startTileIndex": { "type": "ConstantValue", "value": 0 },
  "blendTiles": false,
  "softParticles": false,
  "softNearFade": 0,
  "softFarFade": 0,
  "layers": 1,

  // Behaviors
  "behaviors": [],

  // Space
  "worldSpace": false,
  "onlyUsedByOther": false
}
```

> **⚠️ Important:** Fields like `startLife`, `startSpeed`, `startSize`, `startRotation`, `startTileIndex`, `emissionOverTime`, and `emissionOverDistance` **must be value generator objects** (e.g., `{ "type": "ConstantValue", "value": 0 }`), not plain numbers. Using plain numbers causes `Cannot read properties of undefined (reading 'type')` errors.

### Parameter Reference

| Parameter              | Type          | Default | Description                                      |
| ---------------------- | ------------- | ------- | ------------------------------------------------ |
| `version`              | string        | "3.0"   | Format version                                   |
| `duration`             | number        | 1       | System duration in seconds                       |
| `looping`              | boolean       | true    | Whether to restart after duration                |
| `prewarm`              | boolean       | false   | Simulate one loop before first render            |
| `autoDestroy`          | boolean       | false   | Dispose system when emission ends                |
| `startLife`            | ValueGen      | 5       | Particle lifetime in seconds                     |
| `startSpeed`           | ValueGen      | 0       | Initial velocity magnitude                       |
| `startSize`            | ValueGen      | 1       | Initial particle size                            |
| `startRotation`        | ValueGen      | 0       | Initial rotation (radians)                       |
| `startColor`           | ColorGen      | white   | Initial particle color                           |
| `emissionOverTime`     | ValueGen      | 10      | Particles emitted per second                     |
| `emissionOverDistance` | ValueGen      | 0       | Particles emitted per unit distance traveled     |
| `emissionBursts`       | BurstParams[] | []      | Burst emission events                            |
| `shape`                | ShapeJSON     | sphere  | Emitter shape configuration                      |
| `material`             | string        | -       | UUID reference to material                       |
| `instancingGeometry`   | string        | -       | UUID reference to geometry                       |
| `renderMode`           | number        | 0       | How particles are rendered (see Render Modes)    |
| `renderOrder`          | number        | 0       | Render priority                                  |
| `uTileCount`           | number        | 1       | Horizontal sprite sheet tiles                    |
| `vTileCount`           | number        | 1       | Vertical sprite sheet tiles                      |
| `startTileIndex`       | ValueGen      | 0       | Starting sprite tile index                       |
| `blendTiles`           | boolean       | false   | Blend between sprite tiles                       |
| `softParticles`        | boolean       | false   | Fade near geometry intersections                 |
| `worldSpace`           | boolean       | false   | Emit in world space vs local space               |
| `onlyUsedByOther`      | boolean       | false   | Used as sub-emitter only                         |

---

## Value Generators

Value generators produce numeric values for particle properties. They can be constant, random, or animated over time.

### ConstantValue

Returns a fixed value.

```json
{
  "type": "ConstantValue",
  "value": 5.0
}
```

### IntervalValue

Returns a random value between `a` and `b` (determined once per particle at spawn).

```json
{
  "type": "IntervalValue",
  "a": 1.0,
  "b": 5.0
}
```

### PiecewiseBezier

Returns a value that changes over time using bezier curves. The `t` parameter (0-1) represents either:
- Particle lifetime ratio (for behaviors like `SizeOverLife`)
- Emission time ratio (for spawn properties)

```json
{
  "type": "PiecewiseBezier",
  "functions": [
    {
      "function": {
        "p0": 0,
        "p1": 0.33,
        "p2": 0.66,
        "p3": 1.0
      },
      "start": 0
    }
  ]
}
```

The four control points `p0`, `p1`, `p2`, `p3` define a cubic bezier curve:
- `p0`: Start value (at t=0)
- `p1`, `p2`: Control points that shape the curve
- `p3`: End value (at t=1)

**Common curves:**

| Curve    | p0  | p1   | p2   | p3  | Description                    |
| -------- | --- | ---- | ---- | --- | ------------------------------ |
| Linear   | 0   | 0.33 | 0.66 | 1   | Constant rate of change        |
| Ease-in  | 0   | 0    | 0.5  | 1   | Starts slow, accelerates       |
| Ease-out | 0   | 0.5  | 1    | 1   | Starts fast, decelerates       |
| Fade out | 1   | 0.66 | 0.33 | 0   | Linear decrease from 1 to 0    |

**Multiple segments:**

```json
{
  "type": "PiecewiseBezier",
  "functions": [
    {
      "function": { "p0": 0, "p1": 0.5, "p2": 1, "p3": 1 },
      "start": 0
    },
    {
      "function": { "p0": 1, "p1": 1, "p2": 0.5, "p3": 0 },
      "start": 0.5
    }
  ]
}
```

---

## Color Generators

Color generators produce RGBA color values. Colors use values from 0 to 1.

### ConstantColor

Returns a fixed color.

```json
{
  "type": "ConstantColor",
  "color": { "r": 1.0, "g": 0.5, "b": 0.0, "a": 1.0 }
}
```

### RandomColor

Returns a random color interpolated between two colors (same as `ColorRange`).

```json
{
  "type": "RandomColor",
  "a": { "r": 1, "g": 0, "b": 0, "a": 1 },
  "b": { "r": 0, "g": 0, "b": 1, "a": 1 }
}
```

### ColorRange

Returns a random color interpolated between two colors.

```json
{
  "type": "ColorRange",
  "a": { "r": 1, "g": 0, "b": 0, "a": 1 },
  "b": { "r": 1, "g": 1, "b": 0, "a": 1 }
}
```

### Gradient

Returns a color that changes over time (t = 0 to 1). Separate controls for RGB and alpha.

```json
{
  "type": "Gradient",
  "color": {
    "type": "ContinuousLinear",
    "subType": "Color",
    "keys": [
      { "value": { "r": 1, "g": 1, "b": 1 }, "pos": 0 },
      { "value": { "r": 1, "g": 0, "b": 0 }, "pos": 0.5 },
      { "value": { "r": 0, "g": 0, "b": 0 }, "pos": 1 }
    ]
  },
  "alpha": {
    "type": "ContinuousLinear",
    "subType": "Number",
    "keys": [
      { "value": 0, "pos": 0 },
      { "value": 1, "pos": 0.1 },
      { "value": 1, "pos": 0.8 },
      { "value": 0, "pos": 1 }
    ]
  }
}
```

### RandomColorBetweenGradient

Interpolates between two gradients randomly per particle.

```json
{
  "type": "RandomColorBetweenGradient",
  "a": { /* Gradient */ },
  "b": { /* Gradient */ }
}
```

---

## Emitter Shapes

Emitter shapes define where and how particles spawn.

### PointEmitter

Emits from a single point.

```json
{
  "type": "point"
}
```

### SphereEmitter

Emits from a sphere surface or volume.

```json
{
  "type": "sphere",
  "radius": 1.0,
  "arc": 6.283185,
  "thickness": 1.0,
  "mode": 0,
  "spread": 0,
  "speed": { "type": "ConstantValue", "value": 1 }
}
```

| Property    | Type     | Default | Description                                     |
| ----------- | -------- | ------- | ----------------------------------------------- |
| `radius`    | number   | 10      | Sphere radius                                   |
| `arc`       | number   | 2π      | Arc angle in radians (2π = full sphere)         |
| `thickness` | number   | 1       | 0 = surface only, 1 = full volume               |
| `mode`      | number   | 0       | Emission mode (see below)                       |
| `spread`    | number   | 0       | Convergence length for Loop/PingPong modes      |
| `speed`     | ValueGen | 1       | Speed of emission point for Loop/PingPong       |

**Emission modes:**

| Value | Mode     | Description                              |
| ----- | -------- | ---------------------------------------- |
| 0     | Random   | Random positions                         |
| 1     | Loop     | Sequential positions, looping            |
| 2     | PingPong | Sequential positions, reversing          |
| 3     | Burst    | Sequential within burst                  |

### ConeEmitter

Emits in a cone shape.

```json
{
  "type": "cone",
  "radius": 1.0,
  "arc": 6.283185,
  "thickness": 0,
  "angle": 0.7854,
  "mode": 0,
  "spread": 0,
  "speed": { "type": "ConstantValue", "value": 1 }
}
```

| Property | Type   | Default | Description                |
| -------- | ------ | ------- | -------------------------- |
| `angle`  | number | 0       | Cone angle in radians      |

### CircleEmitter

Emits from a circle (2D ring).

```json
{
  "type": "circle",
  "radius": 1.0,
  "arc": 6.283185,
  "thickness": 0,
  "mode": 0,
  "spread": 0,
  "speed": { "type": "ConstantValue", "value": 1 }
}
```

### HemisphereEmitter

Emits from a hemisphere (half sphere).

```json
{
  "type": "hemisphere",
  "radius": 1.0,
  "arc": 6.283185,
  "thickness": 1.0,
  "mode": 0,
  "spread": 0,
  "speed": { "type": "ConstantValue", "value": 1 }
}
```

### DonutEmitter

Emits from a torus/donut shape.

```json
{
  "type": "donut",
  "radius": 2.0,
  "donutRadius": 0.5,
  "arc": 6.283185,
  "thickness": 0,
  "mode": 0,
  "spread": 0,
  "speed": { "type": "ConstantValue", "value": 1 }
}
```

| Property      | Type   | Default | Description              |
| ------------- | ------ | ------- | ------------------------ |
| `donutRadius` | number | 0.5     | Radius of the tube       |

### RectangleEmitter

Emits from a rectangle.

```json
{
  "type": "rectangle",
  "width": 2.0,
  "height": 2.0,
  "thickness": 0,
  "mode": 0,
  "spread": 0,
  "speed": { "type": "ConstantValue", "value": 1 }
}
```

### GridEmitter

Emits from grid points.

```json
{
  "type": "grid",
  "width": 4.0,
  "height": 4.0,
  "rows": 4,
  "column": 4
}
```

---

## Behaviors

Behaviors modify particles over their lifetime.

### ColorOverLife

Changes particle color based on lifetime (t = 0 at birth, t = 1 at death).

```json
{
  "type": "ColorOverLife",
  "color": {
    "type": "Gradient",
    "color": {
      "type": "ContinuousLinear",
      "subType": "Color",
      "keys": [
        { "value": { "r": 1, "g": 1, "b": 0 }, "pos": 0 },
        { "value": { "r": 1, "g": 0, "b": 0 }, "pos": 1 }
      ]
    },
    "alpha": {
      "type": "ContinuousLinear",
      "subType": "Number",
      "keys": [
        { "value": 1, "pos": 0 },
        { "value": 0, "pos": 1 }
      ]
    }
  }
}
```

### SizeOverLife

Changes particle size based on lifetime. Value is a multiplier of `startSize`.

```json
{
  "type": "SizeOverLife",
  "size": {
    "type": "PiecewiseBezier",
    "functions": [
      {
        "function": { "p0": 1, "p1": 1, "p2": 0, "p3": 0 },
        "start": 0
      }
    ]
  }
}
```

### RotationOverLife

Rotates particles over their lifetime.

```json
{
  "type": "RotationOverLife",
  "angularVelocity": { "type": "ConstantValue", "value": 3.14159 }
}
```

| Property          | Type     | Description                    |
| ----------------- | -------- | ------------------------------ |
| `angularVelocity` | ValueGen | Rotation speed in radians/sec  |

### Rotation3DOverLife

Rotates particles in 3D over their lifetime.

```json
{
  "type": "Rotation3DOverLife",
  "angularVelocity": {
    "type": "AxisAngle",
    "axis": { "x": 0, "y": 1, "z": 0 },
    "angle": { "type": "ConstantValue", "value": 3.14159 }
  }
}
```

### SpeedOverLife

Multiplies particle speed over lifetime.

```json
{
  "type": "SpeedOverLife",
  "speed": {
    "type": "PiecewiseBezier",
    "functions": [
      {
        "function": { "p0": 1, "p1": 1, "p2": 0.5, "p3": 0 },
        "start": 0
      }
    ]
  }
}
```

### FrameOverLife

Animates through sprite sheet frames over lifetime.

```json
{
  "type": "FrameOverLife",
  "frame": {
    "type": "PiecewiseBezier",
    "functions": [
      {
        "function": { "p0": 0, "p1": 5, "p2": 10, "p3": 15 },
        "start": 0
      }
    ]
  }
}
```

### ApplyForce

Applies a constant force to particles.

```json
{
  "type": "ApplyForce",
  "direction": { "x": 0, "y": -1, "z": 0 },
  "magnitude": { "type": "ConstantValue", "value": 9.8 }
}
```

### GravityForce

Applies gravitational pull toward a point.

```json
{
  "type": "GravityForce",
  "center": { "x": 0, "y": 0, "z": 0 },
  "magnitude": 10
}
```

### ForceOverLife

Applies force that varies over lifetime.

```json
{
  "type": "ForceOverLife",
  "x": { "type": "ConstantValue", "value": 0 },
  "y": { "type": "PiecewiseBezier", "functions": [...] },
  "z": { "type": "ConstantValue", "value": 0 }
}
```

### OrbitOverLife

Makes particles orbit around an axis.

```json
{
  "type": "OrbitOverLife",
  "orbitSpeed": { "type": "ConstantValue", "value": 2 },
  "axis": { "x": 0, "y": 1, "z": 0 }
}
```

### TurbulenceField

Adds turbulent noise-based movement.

```json
{
  "type": "TurbulenceField",
  "scale": { "x": 1, "y": 1, "z": 1 },
  "octaves": 3,
  "velocityMultiplier": { "x": 1, "y": 1, "z": 1 },
  "timeScale": { "x": 1, "y": 1, "z": 1 }
}
```

### Noise

Adds noise to position and rotation.

```json
{
  "type": "Noise",
  "frequency": { "type": "ConstantValue", "value": 1 },
  "power": { "type": "ConstantValue", "value": 1 },
  "positionAmount": { "type": "ConstantValue", "value": 1 },
  "rotationAmount": { "type": "ConstantValue", "value": 0 }
}
```

### LimitSpeedOverLife

Limits particle speed with damping.

```json
{
  "type": "LimitSpeedOverLife",
  "speed": { "type": "ConstantValue", "value": 5 },
  "dampen": 0.1
}
```

### WidthOverLength

For trail particles, changes width over trail length.

```json
{
  "type": "WidthOverLength",
  "width": {
    "type": "PiecewiseBezier",
    "functions": [
      {
        "function": { "p0": 1, "p1": 0.66, "p2": 0.33, "p3": 0 },
        "start": 0
      }
    ]
  }
}
```

### ChangeEmitDirection

Randomizes emission direction within an angle.

```json
{
  "type": "ChangeEmitDirection",
  "angle": { "type": "ConstantValue", "value": 0.5 }
}
```

### EmitSubParticleSystem

Emits particles from another particle system.

```json
{
  "type": "EmitSubParticleSystem",
  "subParticleSystem": "uuid-reference",
  "useVelocityAsBasis": false,
  "mode": 0,
  "emitProbability": 1
}
```

| Property             | Type    | Description                              |
| -------------------- | ------- | ---------------------------------------- |
| `subParticleSystem`  | string  | UUID of the sub-particle system          |
| `useVelocityAsBasis` | boolean | Orient sub-particles to velocity         |
| `mode`               | number  | 0=OnDeath, 1=OnBirth, 2=WhileAlive       |
| `emitProbability`    | number  | Probability of emission (0-1)            |

---

## Render Modes

The `renderMode` property controls how particles are rendered:

| Value | Mode               | Description                                    |
| ----- | ------------------ | ---------------------------------------------- |
| 0     | BillBoard          | Always faces camera                            |
| 1     | StretchedBillBoard | Stretched in velocity direction                |
| 2     | Mesh               | 3D mesh geometry                               |
| 3     | Trail              | Trail following particle path                  |
| 4     | HorizontalBillBoard| Faces up (Y-axis)                              |
| 5     | VerticalBillBoard  | Rotates only around Y-axis                     |

### StretchedBillBoard Settings

```json
{
  "renderMode": 1,
  "rendererEmitterSettings": {
    "speedFactor": 0.5,
    "lengthFactor": 2
  }
}
```

| Property       | Description                                      |
| -------------- | ------------------------------------------------ |
| `speedFactor`  | Stretch amount based on velocity                 |
| `lengthFactor` | Stretch amount based on particle size            |

### Trail Settings

```json
{
  "renderMode": 3,
  "rendererEmitterSettings": {
    "startLength": { "type": "ConstantValue", "value": 30 },
    "followLocalOrigin": false
  }
}
```

| Property            | Description                                    |
| ------------------- | ---------------------------------------------- |
| `startLength`       | Number of trail segments                       |
| `followLocalOrigin` | Trail follows emitter movement                 |

---

## Emission Bursts

Burst emissions spawn particles at specific times:

```json
{
  "emissionBursts": [
    {
      "time": 0,
      "count": 50,
      "probability": 1,
      "interval": 0.1,
      "cycle": 1
    },
    {
      "time": 0.5,
      "count": { "type": "IntervalValue", "a": 10, "b": 20 },
      "probability": 0.8,
      "interval": 0.1,
      "cycle": 3
    }
  ]
}
```

| Property      | Type            | Description                              |
| ------------- | --------------- | ---------------------------------------- |
| `time`        | number          | Time in seconds to trigger burst         |
| `count`       | number/ValueGen | Number of particles to emit              |
| `probability` | number          | Chance of burst occurring (0-1)          |
| `interval`    | number          | Time between cycles                      |
| `cycle`       | number          | Number of times to repeat                |

---

## Examples

### Simple Explosion

```json
{
  "metadata": { "version": 4.6, "type": "Object", "generator": "Object3D.toJSON" },
  "geometries": [
    { "uuid": "geom-1", "type": "PlaneGeometry", "width": 1, "height": 1 }
  ],
  "materials": [
    {
      "uuid": "mat-1",
      "type": "MeshBasicMaterial",
      "color": 16777215,
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
          "duration": 0.5,
          "looping": false,
          "autoDestroy": true,
          "startLife": { "type": "IntervalValue", "a": 0.3, "b": 0.8 },
          "startSpeed": { "type": "IntervalValue", "a": 5, "b": 15 },
          "startSize": { "type": "IntervalValue", "a": 0.2, "b": 0.5 },
          "startRotation": { "type": "IntervalValue", "a": 0, "b": 6.28 },
          "startColor": {
            "type": "ColorRange",
            "a": { "r": 1, "g": 0.8, "b": 0.2, "a": 1 },
            "b": { "r": 1, "g": 0.3, "b": 0.1, "a": 1 }
          },
          "emissionOverTime": { "type": "ConstantValue", "value": 0 },
          "emissionOverDistance": { "type": "ConstantValue", "value": 0 },
          "emissionBursts": [
            { "time": 0, "count": 50, "probability": 1, "interval": 0.1, "cycle": 1 }
          ],
          "shape": { "type": "sphere", "radius": 0.5, "thickness": 1 },
          "material": "mat-1",
          "instancingGeometry": "geom-1",
          "renderMode": 0,
          "uTileCount": 1,
          "vTileCount": 1,
          "startTileIndex": { "type": "ConstantValue", "value": 0 },
          "behaviors": [
            {
              "type": "SizeOverLife",
              "size": {
                "type": "PiecewiseBezier",
                "functions": [
                  { "function": { "p0": 1, "p1": 0.8, "p2": 0.2, "p3": 0 }, "start": 0 }
                ]
              }
            },
            {
              "type": "ColorOverLife",
              "color": {
                "type": "Gradient",
                "color": {
                  "type": "ContinuousLinear",
                  "subType": "Color",
                  "keys": [
                    { "value": { "r": 1, "g": 0.8, "b": 0.2 }, "pos": 0 },
                    { "value": { "r": 1, "g": 0.3, "b": 0.1 }, "pos": 1 }
                  ]
                },
                "alpha": {
                  "type": "ContinuousLinear",
                  "subType": "Number",
                  "keys": [
                    { "value": 1, "pos": 0 },
                    { "value": 0, "pos": 1 }
                  ]
                }
              }
            }
          ],
          "worldSpace": true
        }
      }
    ]
  }
}
```

### Continuous Smoke

```json
{
  "ps": {
    "version": "3.0",
    "duration": 5,
    "looping": true,
    "startLife": { "type": "IntervalValue", "a": 1.5, "b": 2.5 },
    "startSpeed": { "type": "IntervalValue", "a": 0.5, "b": 1.5 },
    "startSize": { "type": "IntervalValue", "a": 0.1, "b": 0.3 },
    "startColor": { "type": "ConstantColor", "color": { "r": 0.5, "g": 0.5, "b": 0.5, "a": 0.8 } },
    "emissionOverTime": { "type": "ConstantValue", "value": 20 },
    "emissionOverDistance": { "type": "ConstantValue", "value": 0 },
    "shape": { "type": "cone", "radius": 0.1, "angle": 0.2 },
    "behaviors": [
      {
        "type": "SizeOverLife",
        "size": {
          "type": "PiecewiseBezier",
          "functions": [
            { "function": { "p0": 0.5, "p1": 1, "p2": 2, "p3": 3 }, "start": 0 }
          ]
        }
      },
      {
        "type": "ColorOverLife",
        "color": {
          "type": "Gradient",
          "color": {
            "type": "ContinuousLinear",
            "subType": "Color",
            "keys": [
              { "value": { "r": 0.5, "g": 0.5, "b": 0.5 }, "pos": 0 },
              { "value": { "r": 0.3, "g": 0.3, "b": 0.3 }, "pos": 1 }
            ]
          },
          "alpha": {
            "type": "ContinuousLinear",
            "subType": "Number",
            "keys": [
              { "value": 0.8, "pos": 0 },
              { "value": 0.5, "pos": 0.5 },
              { "value": 0, "pos": 1 }
            ]
          }
        }
      },
      {
        "type": "ApplyForce",
        "direction": { "x": 0, "y": 1, "z": 0 },
        "magnitude": { "type": "ConstantValue", "value": 0.5 }
      }
    ],
    "worldSpace": true
  }
}
```

### Sparkle Trail

```json
{
  "ps": {
    "version": "3.0",
    "duration": 2,
    "looping": true,
    "startLife": { "type": "ConstantValue", "value": 1 },
    "startSpeed": { "type": "ConstantValue", "value": 0 },
    "startSize": { "type": "IntervalValue", "a": 0.05, "b": 0.15 },
    "startColor": {
      "type": "ColorRange",
      "a": { "r": 1, "g": 0.9, "b": 0.5, "a": 1 },
      "b": { "r": 0.5, "g": 0.8, "b": 1, "a": 1 }
    },
    "emissionOverDistance": { "type": "ConstantValue", "value": 50 },
    "emissionOverTime": { "type": "ConstantValue", "value": 0 },
    "shape": { "type": "point" },
    "behaviors": [
      {
        "type": "SizeOverLife",
        "size": {
          "type": "PiecewiseBezier",
          "functions": [
            { "function": { "p0": 0, "p1": 1, "p2": 1, "p3": 0 }, "start": 0 }
          ]
        }
      },
      {
        "type": "ColorOverLife",
        "color": {
          "type": "Gradient",
          "alpha": {
            "type": "ContinuousLinear",
            "subType": "Number",
            "keys": [
              { "value": 0, "pos": 0 },
              { "value": 1, "pos": 0.2 },
              { "value": 1, "pos": 0.8 },
              { "value": 0, "pos": 1 }
            ]
          }
        }
      },
      {
        "type": "ApplyForce",
        "direction": { "x": 0, "y": -1, "z": 0 },
        "magnitude": { "type": "ConstantValue", "value": 2 }
      }
    ],
    "worldSpace": true
  }
}
```

---

## Resources

- [three.quarks GitHub](https://github.com/Alchemist0823/three.quarks)
- [quarks.art Visual Editor](https://quarks.art)
- [three.quarks Documentation](https://docs.quarks.art)
