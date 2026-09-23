# oncyberio Engine

A 3D game engine and framework built on [Three.js](https://threejs.org/). Build browser-based 3D games with physics, character controls, VRM avatars, particle effects, and a visual editor — all from a single monorepo.

## Features

- **Component-based scene architecture** — meshes, models, avatars, terrain, lights, triggers, and more
- **Physics** — simple high-level APIs for rigidbodies, colliders, and character controllers, built on Rapier3D
- **VRM avatar support** — load and animate VRM characters with springbone physics
- **Composable player controls** — input system, camera rigs, and movement primitives for building first-person, third-person, platformer, top-down, and other control styles
- **Particle effects** — three.quarks-based VFX system
- **Visual editor** — embedded studio at `/studio` for scene editing
- **Asset optimization** — Draco compression, KTX2 textures, mesh optimization
- **AI-powered development** — CLI tools plus repo-specific engine skills for AI-assisted scene editing and game development workflows
- **GPU instancing & LOD** — performance optimizations for large scenes
- **Navigation meshes** — pathfinding via recast-navigation
- **AI navigation** — navmesh-based pathfinding and movement for NPCs and agents
- **Post-processing** — bloom, SSAO, tone mapping, and more

## Tech Stack

| Category     | Technology                  |
| ------------ | --------------------------- |
| 3D Rendering | Three.js 0.170              |
| Framework    | Next.js 16 (App Router)     |
| UI           | React 18 / 19               |
| Physics      | Rapier3D (WebAssembly)      |
| Navigation   | recast-navigation           |
| Animation    | GSAP, @pixiv/three-vrm      |
| Particles    | three.quarks                |
| Language     | TypeScript 5                |
| Build        | pnpm workspaces + Next.js Turbopack |

## Monorepo Structure

```
awe/
├── packages/
│   ├── engine/              # Core 3D game engine (@oncyberio/engine)
│   ├── engine-edit/         # Visual editing tools (@oncyberio/engine-edit)
│   ├── tools/               # Asset pipeline & CLI tools (@oncyberio/tools)
│   ├── studio/              # In-browser studio tools (@oncyberio/studio)
│   └── create-oncyber-app/  # CLI project scaffolder
├── examples/                # Example game projects (auth-multiplayer, football-demo, multiplayer, starter, zombie-survival)
└── ... (no root-level `apps/` or `docs/` directories in this checkout)
```

### Package Overview

| Package                      | Description                                                         |
| ---------------------------- | ------------------------------------------------------------------- |
| `@oncyberio/engine`          | Core 3D game engine — components, physics, input, rendering         |
| `@oncyberio/engine-edit`     | Editor utilities — gizmos, selection, transform controls, undo/redo |
| `@oncyberio/tools`           | Asset pipeline & CLI tools — Draco, meshoptimizer, KTX2, Sharp, IPFS uploads |
| `create-oncyber-app`         | Interactive CLI to scaffold new game projects from a template       |
| `@oncyberio/studio`          | Embedded scene editing studio UI and tools                          |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.9+)
- [pnpm](https://pnpm.io/) (v8+)

### Create a New Game

```bash
npx create-oncyber-app my-game
cd my-game
pnpm install
pnpm dev
```

This scaffolds a full Next.js project with the oncyberio engine pre-configured, a sample 3D scene, and an embedded visual editor at `/studio`.

### Monorepo Development

```bash
git clone https://github.com/oncyberio/awe.git
cd awe
pnpm install
```

For development commands, code style, branching, and PR workflow, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation

- **[Create-oncyber-app README](packages/create-oncyber-app/README.md)** — scaffold workflow and generated game scaffold structure
- **[Engine Package Exports](packages/engine/src/index.ts)** — core engine API entrypoint
- **[Starter Example README](examples/starter/README.md)** — practical setup and control examples

### AI Integration

Generated projects include CLI tools for asset optimization (model compression, VRM processing, animation baking) and Claude Code skills for engine usage, VFX creation, and asset inspection.

## License

This project is licensed under the [MIT License](LICENSE).
