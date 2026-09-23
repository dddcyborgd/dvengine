# Adding an Avatar from vrms.json

`packages/studio/src/data/vrms.json` is a map of pre-built VRM avatars keyed by ID. Each entry has `url` (full quality) and `urlCompressed` (optimized version).

## Add to static-scene.json

Look up the avatar in `vrms.json`, then add a component to `public/data/static-scene.json`:

```json
{
  "my-npc": {
    "id": "my-npc",
    "name": "Guard NPC",
    "type": "avatar",
    "position": { "x": 5, "y": 0, "z": 3 },
    "url": "https://cyber.mypinata.cloud/ipfs/...",
    "urlCompressed": "https://cyber.mypinata.cloud/ipfs/...",
    "animation": "IDLE",
    "opacity": 1
  }
}
```

Copy both `url` and `urlCompressed` from the vrms.json entry for the chosen avatar.
