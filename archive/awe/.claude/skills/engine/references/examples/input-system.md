# Input System

For gameplay input handling, The engine provides a declarative Input System with multi-device support (keyboard, gamepad, mouse, touch).

## Quick Example

```typescript
import {
  createInputs,
  Keyboard,
  Gamepad,
  Mouse,
  Interactions,
} from "@oncyberio/engine";

// Define input config (can be at module scope - configs are pure data)
const GAMEPLAY_INPUTS = {
  Move: { type: "vector2", bindings: [Keyboard.wasd(), Gamepad.leftStick()] },
  Look: { type: "vector2", bindings: [Mouse.delta(), Gamepad.rightStick()] },
  Jump: {
    type: "button",
    bindings: [Keyboard.button("Space"), Gamepad.button("A")],
    interactions: [Interactions.press()],
  },
  Sprint: {
    type: "button",
    bindings: [Keyboard.button("ShiftLeft"), Gamepad.button("LB")],
  },
} as const;

// Create inputs - each call creates fresh instances with independent state
const inputs = createInputs(GAMEPLAY_INPUTS);

// Event-driven callbacks (button actions)
inputs.Jump.onPerformed(() => player.jump());

// In game loop
function update(dt: number) {
  inputs.update(dt);

  // Polling (value actions)
  const dir = inputs.Move.readValue(); // { x, y }
  const look = inputs.Look.readValue();
  const isSprinting = inputs.Sprint.isPressed;

  // Edge detection
  if (inputs.Jump.wasJustPressed) {
    /* ... */
  }
}

// Cleanup
inputs.dispose();
```

For full API details (input types, binding factories, interactions, processors, `InputAction`/`InputValue` APIs), see `packages/engine/api/input/`.
