# Adding a Custom VRM Animation

Add custom animations from Mixamo FBX files. Bake the FBX, then register it in the `vrm-anims` scene component.

## Usage

```bash
pnpm bake-anim <path-to-file.fbx> [name]
```

Path is relative to `public/`. Returns JSON:
```json
{
  "name": "zombie_attack",
  "url": "/assets/anims/zombie_attack.json",
  "hash": "a1b2c3...",
  "trackCount": 52,
  "loop": true,
  "timeScale": 1
}
```

## Add to static-scene.json

Add or update the `vrm-anims` component. Custom animations use `custom-N` keys:

```json
{
  "vrm-anims": {
    "id": "vrm-anims",
    "type": "vrm-anims",
    "anims": {
      "custom-1": {
        "fileName": "zombie_attack.fbx",
        "name": "zombie_attack",
        "url": "/assets/anims/zombie_attack.json",
        "hash": "a1b2c3...",
        "loop": true,
        "timeScale": 1
      }
    }
  }
}
```

If a `vrm-anims` component already exists, add to its `anims` map with the next available `custom-N` key.

### Animation entry fields

| Field | Description |
| --- | --- |
| `fileName` | Original FBX filename (for display) |
| `name` | Animation name used to trigger it on avatars |
| `url` | Path to the baked JSON file |
| `hash` | Content hash for deduplication |
| `loop` | Whether to loop (default: true) |
| `timeScale` | Playback speed, 0.01–4 (default: 1) |

### Overriding built-in animations

Six built-in slots exist: `idle`, `walk`, `jump`, `run`, `fly`, `sitting`. To override one, use the slot name as key instead of `custom-N`:

```json
{
  "idle": {
    "fileName": "custom_idle.fbx",
    "name": "idle",
    "url": "/assets/anims/custom_idle.json",
    "hash": "...",
    "loop": true,
    "timeScale": 1
  }
}
```

## Use in game script

Requires `useCpuAnimation: true` on the avatar component:

```typescript
// Durable/default state
avatar.play("run", { fadeIn: 0.15, persist: true });

// Transient one-shot
avatar.play("zombie_attack", {
  fadeIn: 0.2,
  loop: "once",
  stopAll: true,
});

// Stop a transient one-shot early
avatar.stop("zombie_attack", { fadeOut: 0.2 });
```

### Choosing Persistent vs Transient

- Use `persist: true` for locomotion or any animation that should become the avatar's new durable/default state.
- Leave `persist` off for short reactions such as hit, attack, recoil, or emotes.
- Persisting a non-looping clip means it can become the avatar's resting pose after it finishes. That is often correct for `death`, but usually wrong for `hit` or `attack`.
