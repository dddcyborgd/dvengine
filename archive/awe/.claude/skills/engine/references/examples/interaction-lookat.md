# Interaction System

Use the `interaction` component to show a proximity-triggered prompt in 3D space. When the player is within range, an icon appears; pressing the configured key fires the interaction event.

## Basic Usage

```typescript
const interact = await space.components.create({
  type: "interaction",
  position: { x: 5, y: 1, z: 0 },
  distance: 8, // activation range (world units)
  atlas: "keyboard_e", // icon displayed (defaults to "keyboard_e" on desktop, "tap-outline" on mobile)
  key: "KeyE", // trigger key (KeyboardEvent.code format)
  billboard: true, // always face camera (default: true)
});

// Fired when key pressed while in range
const unsub = interact.onInteraction(() => {
  console.log("Interaction triggered!");
});

// Range enter/exit
interact.onInteractEnter(() => {
  console.log("Entered interaction range");
});

interact.onInteractExit(() => {
  console.log("Left interaction range");
});

// Cleanup
unsub();
```

For runtime properties (`active`, `atlas`, `key`, `color`, `opacity`, `distanceTarget`), see `packages/engine/api/space/components/interaction/`.
