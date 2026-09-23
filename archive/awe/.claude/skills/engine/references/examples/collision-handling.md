# Collision and Sensor Event Handling

```typescript
// space obtained from engine.createSpace() - see game-script-template.md

// --- Collision Events (physical contact) ---

const ball = space.components.byId("ball");

ball.onCollisionEnter((event) => {
  // Check what we collided with using identifier or tag
  if (event.other.tag === "obstacle") {
    console.log("Ball hit an obstacle!");
  }

  // Access contact info
  event.contactPoints.forEach((point) => {
    console.log("Contact at:", point.position);
    console.log("Normal:", point.normal);
  });
});

ball.onCollisionExit((event) => {
  console.log("Stopped touching:", event.other.data.id);
});

// --- Sensor Events (trigger zones, no physical response) ---

// Create an invisible sensor zone:
// - opacity: 0 makes it invisible
// - isSensor: true means no physical collision
// - script.tag identifies this sensor in callbacks
const triggerZone = await space.components.create({
  type: "mesh",
  id: "goal-zone",
  geometry: { type: "box" },
  position: { x: 0, y: 1, z: -10 },
  scale: { x: 5, y: 2, z: 1 },
  opacity: 0, // invisible — sensors should not be visible
  script: { tag: "goal" }, // used to identify this sensor in events
  collider: {
    enabled: true,
    rigidbodyType: "FIXED",
    colliderType: "CUBE",
    isSensor: true, // Makes it a trigger, not a solid
  },
});

triggerZone.onSensorEnter((event) => {
  // Use event.other.tag to identify what entered the sensor
  if (event.other.tag === "ball") {
    console.log("Goal scored!");
  }
});

triggerZone.onSensorExit((event) => {
  console.log("Left goal zone:", event.other.tag);
});
```
