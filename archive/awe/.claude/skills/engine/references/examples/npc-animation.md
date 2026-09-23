# NPC Animation with AnimationStateMachine

The `AnimationStateMachine` from `@oncyberio/engine/controls` works standalone for NPC animation — no `Mover` needed.

Use it for stable animation phases such as locomotion or jump/fall/landing. The machine persists avatar animation state by default, so it is the right tool for "what animation should this character currently be in?".

```typescript
import { AnimationStateMachine } from "@oncyberio/engine/controls";

// Get or create an avatar component for the NPC
const npcAvatar = space.components.byId("npc-avatar");

// Define a state machine with context-driven transitions
const anim = new AnimationStateMachine<{ moving: boolean }>({
  body: npcAvatar,
  initial: "idle",
  context: { moving: false },
  states: {
    idle: { clip: "idle" },
    run: { clip: "run" },
  },
  transitions: [
    { from: "idle", to: "run", when: (ctx) => ctx.moving },
    { from: "run", to: "idle", when: (ctx) => !ctx.moving },
  ],
});

// In your game loop, update context and tick the state machine
space.use({
  onUpdate: (dt) => {
    // Update context based on NPC logic
    anim.context.moving = isNpcMoving();

    // Tick evaluates transitions and plays the correct animation
    anim.tick(dt);
  },
});
```

## Adding More States

```typescript
const anim = new AnimationStateMachine<{ moving: boolean; kicking: boolean }>({
  body: npcAvatar,
  initial: "idle",
  context: { moving: false, kicking: false },
  states: {
    idle: { clip: "idle" },
    run: { clip: "run" },
    kick: { clip: "kick", loop: "once" }, // one-shot animation
  },
  transitions: [
    { from: "idle", to: "kick", when: (ctx) => ctx.kicking },
    { from: "run", to: "kick", when: (ctx) => ctx.kicking },
    { from: "kick", to: "idle", when: (ctx) => !ctx.kicking && !ctx.moving },
    { from: "kick", to: "run", when: (ctx) => !ctx.kicking && ctx.moving },
    { from: "idle", to: "run", when: (ctx) => ctx.moving },
    { from: "run", to: "idle", when: (ctx) => !ctx.moving },
  ],
});
```

## Transient Reactions

For brief reactions such as `hit`, `attack`, or short emotes, prefer direct transient playback instead of making that clip the avatar's new default state:

```typescript
npcAvatar.play("hit", {
  loop: "once",
  fadeIn: 0.04,
  stopAll: true,
});
```

Use `persist: true` only if the reaction should become the avatar's new durable/base animation state. That is uncommon for `hit`/`attack`, but common for something terminal like `death`.

> **Note**: `AnimationStateMachine` is the same system used for player avatar animation (see `examples/starter`). Using it directly gives you full control over NPC animation without touching private avatar internals.
