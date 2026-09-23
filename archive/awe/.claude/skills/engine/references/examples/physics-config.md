# Physics Configuration

## Static Physics Setup

Add a `collider` property to the component in `public/data/static-scene.json`:

```json
{
  "my-platform": {
    "id": "my-platform",
    "name": "Platform",
    "type": "mesh",
    "position": { "x": 0, "y": 0, "z": 0 },
    "geometry": { "type": "box", "width": 10, "height": 0.5, "depth": 10 },
    "collider": {
      "enabled": true,
      "rigidbodyType": "FIXED",
      "colliderType": "CUBE"
    }
  }
}
```

## Runtime Physics Setup

```typescript
const box = await space.components.create({
  type: "mesh",
  geometry: { type: "box" },
  position: { x: 0, y: 5, z: 0 },
  collider: {
    enabled: true,
    rigidbodyType: "DYNAMIC",
    colliderType: "CUBE",
    dynamicProps: {
      mass: 1,
      friction: 0.5,
      restitution: 0.3,
    },
  },
});
```

## Moving Kinematic Bodies

For kinematic bodies (e.g. NPCs, moving platforms), use the `rigidBody.position` setter. It internally dispatches to `setNextKinematicTranslation`, keeping the engine and physics in sync.

```typescript
const npc = space.components.byId("npc");
const rb = npc.rigidBody;

// Correct — uses the wrapper's position setter
rb.position = new Vector3(x, y, z);

// Wrong — bypasses engine sync, component transform won't update
rb.raw.setNextKinematicTranslation({ x, y, z });
```

## RigidBody Wrapper API

The engine's `RigidBody` wrapper provides convenience methods over raw Rapier. Always prefer these over `rb.raw.*`:

| Method | Notes |
|---|---|
| `applyImpulse({ x, y, z })` | No boolean 2nd arg (unlike raw Rapier) |
| `resetVelocities()` | Resets both linear and angular velocity |
| `teleport(pos, quat)` | Takes Three.js `Vector3` + `Quaternion` |
| `position` setter | Handles KINEMATIC vs DYNAMIC automatically |
| `setLinearDamping(value)` | Set linear damping directly |
| `setAngularDamping(value)` | Set angular damping directly |

For full `PhysicsData`, `RigidBody`, and `Collider` APIs, see `packages/engine/api/physics/types/`.
