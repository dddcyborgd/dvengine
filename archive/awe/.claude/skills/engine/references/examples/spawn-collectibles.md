# Spawning Collectibles Using Template Duplication

```typescript
// space obtained from engine.createSpace() - see game-script-template.md

// Get template component defined in static-scene.json
const coinTemplate = space.components.byId("coin-template");
const collectedCoins: string[] = [];

// Spawn multiple coins at random positions
async function spawnCoins(count: number, radius: number) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const coin = await coinTemplate.duplicate({
      overrideOpts: {
        id: `coin-${i}`,
        name: `Coin ${i}`,
        position: { x, y: 1, z },
        collider: {
          enabled: true,
          rigidbodyType: "FIXED",
          colliderType: "SPHERE",
          isSensor: true,
        },
      },
    });

    // Set up collection behavior
    coin.onSensorEnter(() => {
      collectCoin(coin);
    });
  }

  // Hide the template after duplicating
  coinTemplate.visible = false;
}

function collectCoin(coin: Component3D) {
  collectedCoins.push(coin.data.id);
  coin.destroy();
  console.log(`Collected ${collectedCoins.length} coins`);
}
```
