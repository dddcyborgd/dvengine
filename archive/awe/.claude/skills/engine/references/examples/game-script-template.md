# Basic Game Script Template

Template for implementing game logic in a script file

```typescript
import { Engine, type Space } from "@oncyber/engine";

export class MainGameScript {
  private space: Space | null = null;
  private cleanup: (() => void) | null = null;

  async init() {
    const engine = Engine.getInstance();

    // Create and load space - returns when fully loaded
    const { space, reveal } = await engine.createSpace(opts);
    this.space = space;

    // Components are immediately available after await
    // Typical setup order before revealing:
    // 1. Get player avatar: space.components.byId<AvatarComponent>("player")
    // 2. Create mover: new Mover({ body: avatar, ... })
    // 3. Set up camera rig: new ThirdPersonCameraRig(avatar, { ... })
    // 4. Bind inputs: createInputs(inputDefinitions)

    // Reveal the scene (fades out the intro/loading screen)
    await reveal();

    // Register event handlers
    this.cleanup = space.use({
      onUpdate: this.onUpdate,
      onLateUpdate: this.onLateUpdate,
      onFixedUpdate: this.onFixedUpdate,
      onFrame: this.onFrame,
      onStart: this.onStart,
      onStop: this.onStop,
      onDispose: this.onDispose,
    });

    // Start the game loop
    space.start();
  }

  dispose() {
    this.cleanup?.();
    this.cleanup = null;
  }

  onStart = () => {
    // Called when space.start() is invoked
  };

  onStop = () => {
    // Called when space.stop() is invoked
  };

  onUpdate = (dt: number, absTimer: number) => {
    // Variable timestep - called each frame while running
    // Use for: AI logic, UI timers, visual smoothing, game state checks
  };

  onLateUpdate = (dt: number, absTimer: number) => {
    // Called after onUpdate - use for cameras, state sync, etc.
  };

  onFixedUpdate = (dt: number, absTimer: number) => {
    // Fixed timestep - consistent dt every tick
    // Use for: input polling, Mover physics, collisions, animation state machines
    // Putting physics here prevents jitter from variable frame rates
  };

  onFrame = (dt: number, absTimer: number) => {
    // Called every frame, even before space.start()
  };

  onDispose = () => {
    // Cleanup when space is destroyed
  };
}
```
