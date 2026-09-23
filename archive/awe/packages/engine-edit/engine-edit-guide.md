# engine-edit Architecture

## 1. Overview

The `engine-edit` package provides 3D scene editing capabilities for the oncyberio engine. It handles object selection, transformation, navigation, drag-and-drop, drawing tools, and editor state management.

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EngineEdit (Singleton)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌─────────────┐  │
│  │  Selection   │   │  Transformer │   │  Navigation  │   │    Grid     │  │
│  │   System     │   │    System    │   │    System    │   │   System    │  │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬──────┘  │
│         │                  │                  │                  │         │
│  ┌──────┴───────┐   ┌──────┴───────┐   ┌──────┴───────┐   ┌──────┴──────┐  │
│  │   Selector   │   │ PivotControls│   │ Perspective  │   │  Navigation │  │
│  │ MouseRaycast │   │TransformProxy│   │  Controls    │   │    Cube     │  │
│  └──────────────┘   │ DragHandler  │   │ MapControls  │   │  GridMesh   │  │
│                     └──────────────┘   └──────────────┘   └─────────────┘  │
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌─────────────┐  │
│  │   Commands   │   │     DnD      │   │    State     │   │   Drawing   │  │
│  │   System     │   │    System    │   │  Management  │   │    Tool     │  │
│  └──────────────┘   └──────┬───────┘   └──────┬───────┘   └─────────────┘  │
│                            │                  │                             │
│                     ┌──────┴───────┐   ┌──────┴───────────────────────┐    │
│                     │DragComponent │   │  WorldObservable (pattern)   │    │
│                     │DragPreview3D │   │  SelectionObservable         │    │
│                     └──────────────┘   │  TransformerStateObservable  │    │
│                                        │  EnabledToolsStateObservable │    │
│                                        └──────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │   Event Emitter        │
                        │   (editor-events.ts)   │
                        └────────────────────────┘
```

### Key Responsibilities

- **Object Selection**: Click, multi-select (Shift+click), and drag-select components
- **Transform Manipulation**: Translate, rotate, scale objects via gizmo controls
- **Camera Navigation**: Perspective (3D) and map (top-down) view navigation
- **Commands**: Add, duplicate, group/ungroup components
- **Drag-and-Drop**: Asset placement from external sources into the 3D scene
- **Drawing Tool**: Brush-based stamping of objects on terrain
- **State Management**: Reactive observables for UI synchronization

---

## 2. EngineEdit Class (Entry Point)

**Location**: `src/index.ts:18`

The `EngineEdit` class is the main entry point and orchestrator for all editing functionality. It follows the **singleton pattern**.

### Singleton Pattern

```typescript
static _instance: EngineEdit | null = null;

static getInstance() {
    if (!EngineEdit._instance) {
        EngineEdit._instance = new EngineEdit();
    }
    return EngineEdit._instance;
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `navigation` | `EditModeNavigation` | Camera control system |
| `selection` | `EditModeSelection` | Object selection system |
| `transformer` | `Transformer` | Transform gizmo system |
| `grid` | `Grid` | Grid and navigation cube |
| `commands` | `EditCommands` | Component manipulation commands |
| `dnd` | `Dnd` | Drag-and-drop handler |
| `state` | `EditorState` | Reactive state observables |
| `tools.drawer` | `DrawingTool` | Brush painting tool |
| `capturer` | `Capturer` | Screenshot capture |
| `componentsRegistry` | `ComponentsRegistry` | Component type registry |
| `engine` | `Engine` | Reference to core engine |

### Initialization Flow

```
┌─────────────────┐
│   constructor   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  1. Create Selection system (passes self reference) │
│  2. Create Navigation system (passes self reference)│
│  3. Enable navigation, selection, transformer       │
│  4. Disable drawer tool by default                  │
│  5. Subscribe to SELECTION_CHANGED event            │
│  6. Subscribe to grid mode changes                  │
│  7. Expose as globalThis.$engineEdit                │
└─────────────────────────────────────────────────────┘
```

### Lifecycle

```
init → enabled (all subsystems active) → dispose

dispose():
  1. navigation.dispose()
  2. grid.dispose()
  3. selection.dispose()
  4. Scene.remove(transformer)
  5. transformer.dispose()
  6. componentsRegistry.dispose()
  7. capturer.dispose()
  8. state.dispose()
  9. dnd.dispose()
  10. Unsubscribe from events
  11. Clear singleton instance
```

### Public API

| Method | Description |
|--------|-------------|
| `setNavView(val, target?)` | Set camera view (X/Y/Z/-X/-Y/-Z) |
| `setDrawingToolOpts(opts)` | Configure drawing tool |
| `updatePreferences(prefs)` | Update grid/navigation preferences |
| `getNavView()` | Get current navigation view |
| `dispose()` | Clean up all resources |

---

## 3. Selection System

**Location**: `src/selection/`

### Architecture

```
┌────────────────────────┐
│  EditModeSelection     │  (Facade)
│  src/selection/index.ts│
└───────────┬────────────┘
            │ owns
            ▼
┌────────────────────────┐       ┌────────────────────────┐
│      Selector          │──────▶│    MouseRaycast        │
│ src/selection/selector │       │ src/utils/mouse-raycast│
└────────────────────────┘       └────────────────────────┘
```

### Selector Class

**Location**: `src/selection/selector.ts:16`

The `Selector` class handles all selection logic including:

- Single-click selection
- Multi-select (Shift+click)
- Drag-select (rectangular selection)
- Hover highlighting
- Component registration/unregistration

#### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `selection` | `Set<Component3D>` | Currently selected components |
| `hoveredComponent` | `Component3D \| null` | Component under cursor |
| `mouseRaycast` | `MouseRaycast` | Raycasting utility |
| `selectionBox` | `HTMLElement` | DOM element for drag selection |
| `lastSelected` | `Component3D \| null` | Most recently selected item |

#### Selection Flow

```
┌──────────────────┐
│   Mouse Click    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  MouseRaycast    │ ─── Raycast against registered components
│  ._doRaycast()   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ onComponentClick │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Shift key?   No Shift
    │         │
    ▼         ▼
┌────────┐  ┌────────────────┐
│Toggle  │  │ clearSelection │
│Item    │  │ setSelection   │
└────────┘  └────────────────┘
         │
         ▼
┌──────────────────┐
│emitSelectionChanged│ ─── Emitter.emit(SELECTION_CHANGED)
└──────────────────┘
```

#### Drag Select States

```typescript
const DRAG_SELECT_STATES = {
  NA: 0,            // Not dragging
  MAYBE_DRAGGING: 1, // Mouse down with Shift, waiting for movement
  DRAGGING: 2,       // Actively dragging selection rectangle
};
```

#### Hierarchy Handling

The `_getTopmost()` method handles group selection hierarchy:

```typescript
// Single click: select topmost group
const topmost = this._getTopmost(component);  // index = 0

// Double click: select child one level down
const topmost = this._getTopmost(component, 1);  // index = 1
```

#### Selection Normalization

The `normalizeSelection()` method prevents selecting both parent and child:

```typescript
// Excludes items whose parent is already selected
return items.filter((item) => {
    let current = item.parentComponent;
    while (current) {
        if (selection.has(current)) return false;
        current = current.parentComponent;
    }
    return true;
});
```

### MouseRaycast Utility

**Location**: `src/utils/mouse-raycast.ts:40`

Singleton utility for raycasting against scene components.

#### Key Features

- Uses dedicated raycast layer (20) for performance
- Maintains component registry
- Supports frustum-based rect selection
- Handles click, double-click, hover events

#### Callbacks Interface

```typescript
interface MouseRaycastCallbacks {
    click?(e: MouseEvent, intersect: Intersection<Mesh>[]): void;
    dblClick?(e: MouseEvent, intersect: Intersection<Mesh>[]): void;
    mouseEnter?(e: MouseEvent, intersect: Intersection<Mesh>[]): void;
    mouseLeave?(e: MouseEvent, mesh: Mesh): void;
    mouseDown?(e: MouseEvent, intersect: Intersection<Mesh>[]): void;
}
```

---

## 4. Transformer System

**Location**: `src/transformer/`

### Architecture

```
┌────────────────────────┐
│      Transformer       │  (Group extends THREE.Group)
│  src/transformer/index │
└───────────┬────────────┘
            │
    ┌───────┼────────┬────────────────┐
    │       │        │                │
    ▼       ▼        ▼                ▼
┌───────┐ ┌─────────────┐ ┌───────────────┐ ┌─────────────┐
│Pivot  │ │Transform    │ │ DragHandler   │ │ postUIScene │
│Controls│ │Proxy        │ │               │ │ (rendering) │
└───────┘ └─────────────┘ └───────────────┘ └─────────────┘
```

### Transformer Class

**Location**: `src/transformer/index.ts:28`

The main transform manipulation class that manages the gizmo and coordinates changes.

#### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `pivotControls` | `PivotControls` | Visual transform gizmo |
| `transformProxy` | `TransformProxy` | Multi-select transform helper |
| `dragHandler` | `DragHandler` | Change tracking for undo/redo |
| `attachedComponents` | `Component3D[]` | Currently attached objects |
| `attachedObject` | `Object3D` | Single attached object |
| `_enabledModes` | `TransformModes` | Enabled transform modes |
| `postUIScene` | `THREE.Scene` | Separate scene for gizmo rendering |

#### Transform Modes

```typescript
interface TransformModes {
    enableTranslate: boolean;
    enableRotate: boolean;
    enableScale: boolean;
    enableLocalSpace: boolean;
}
```

#### Attachment Flow

```
┌─────────────────────┐
│ SELECTION_CHANGED   │
│      event          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ onSelectionChanged  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    detachAll()      │
└──────────┬──────────┘
           │
           ▼
    selection.length > 0?
           │
     ┌─────┴─────┐
     │           │
     Yes         No
     │           │
     ▼           ▼
┌─────────────┐  done
│attachComponent│
└─────┬───────┘
      │
      ▼
  length > 1?
      │
  ┌───┴───┐
  │       │
  Yes     No
  │       │
  ▼       ▼
┌────────────────┐  ┌───────────────────┐
│TransformProxy  │  │ Attach directly   │
│.setAttachedObjects │  │ to single component│
└────────────────┘  └───────────────────┘
      │                      │
      ▼                      ▼
┌─────────────────────────────────────────┐
│ pivotControls.attach(target, options)   │
└─────────────────────────────────────────┘
```

### TransformProxy

**Location**: `src/transformer/transform-proxy.ts:26`

A virtual object that acts as a pivot point for multi-object transforms.

#### Key Features

- Extends `PipeLineMesh` (invisible mesh)
- Computes bounding box of all attached objects
- Maintains fake children that mirror real object transforms
- Synchronizes transforms from proxy to real objects

```
┌─────────────────────────────────────────────┐
│            TransformProxy                   │
│                                             │
│  position: center of all objects' bbox      │
│  scale: size of combined bbox               │
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ fake    │  │ fake    │  │ fake    │     │
│  │ child 0 │  │ child 1 │  │ child 2 │     │
│  └────┬────┘  └────┬────┘  └────┬────┘     │
│       │            │            │           │
└───────┼────────────┼────────────┼───────────┘
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ real    │  │ real    │  │ real    │
   │object 0 │  │object 1 │  │object 2 │
   └─────────┘  └─────────┘  └─────────┘
```

### DragHandler

**Location**: `src/transformer/drag-handler.ts:12`

Tracks transform changes for undo/redo support.

#### Workflow

```
dragStart():
  1. Store initial coords (position, quaternion, rotation)
  2. Store initial transform data from component.getTransformData()
  3. Emit COMPONENTS_COORDS_CHANGED_STARTED
  4. Hide selection highlights

dragEnd():
  1. Get final transform data
  2. Compare with initial, filter unchanged properties
  3. Build changes array with {targetMesh, changes, undo}
  4. Emit COMPONENTS_COORDS_CHANGED with changes
  5. Restore selection highlights
```

#### Change Structure

```typescript
interface TransformChange {
    targetMesh: Component3D;
    changes: any;   // New transform values
    undo: any;      // Original transform values
}
```

---

## 5. Navigation System

**Location**: `src/navigation/`

### Architecture

```
┌─────────────────────────┐
│  EditModeNavigation     │
│  src/navigation/index.ts│
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌────────────────┐ ┌────────────────┐
│ Perspective    │ │  MapControls   │
│ Controls       │ │                │
└────────────────┘ └────────────────┘
```

### EditModeNavigation

**Location**: `src/navigation/index.ts:13`

Manages camera navigation between perspective (3D) and map (top-down) views.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `perspectiveControls` | `PerspectiveControls` | 3D camera controls |
| `mapControls` | `MapControls` | Top-down camera controls |
| `_navMode` | `NavMode` | Current mode: "perspective" or "map" |

#### Nav Modes

```typescript
type NavMode = { type: "perspective" } | { type: "map" };
```

### PerspectiveControls

**Location**: `src/navigation/perspective.ts:73`

Wraps `CameraControls` library for 3D camera manipulation.

#### Key Features

- WASD keyboard movement
- Mouse drag to rotate/pan
- Scroll to zoom
- Shift for speed boost
- Navigation views (X/Y/Z/-X/-Y/-Z)
- Focus on object
- Map view toggle

#### Mouse Button Mapping

```typescript
cameraControls.mouseButtons.left = CameraControls.ACTION.ROTATE;
cameraControls.mouseButtons.wheel = CameraControls.ACTION.DOLLY;
cameraControls.mouseButtons.right = CameraControls.ACTION.TRUCK;
cameraControls.mouseButtons.middle = CameraControls.ACTION.NONE;
```

#### Keyboard Controls

| Key | Action |
|-----|--------|
| W / ArrowUp | Move forward |
| S / ArrowDown | Move backward |
| A / ArrowLeft | Move left |
| D / ArrowRight | Move right |
| Space | Move up |
| B | Move down |
| Shift | Speed boost (2x) |

#### Navigation Views

```typescript
type NavView = "X" | "Y" | "Z" | "-X" | "-Y" | "-Z";
```

`setNavView(view, opts)` positions camera along specified axis looking at target.

### MapControls

**Location**: `src/controls/map-controls.d.ts:1`

Extended `OrbitControls` for top-down map view navigation.

---

## 6. Commands

**Location**: `src/commands/index.ts:19`

### EditCommands Class

Provides high-level operations for component manipulation.

#### Methods

| Method | Description |
|--------|-------------|
| `addComponent(data, opts)` | Create and add a new component |
| `duplicateComponents(components, offset?)` | Duplicate components with optional offset |
| `changeParent(component, parent)` | Reparent component, adjusting transforms |
| `createGroup(children, opts)` | Group components together |
| `removeGroup(group)` | Ungroup, moving children to parent |
| `centerGroup(group)` | Center group pivot to children's center |
| `changeComponentLock(component, lock)` | Set lock state on component |
| `getDefaultAssetPlacement(instance?)` | Calculate default position for new asset |

#### Default Asset Placement

```typescript
getDefaultAssetPlacement(instance?: Component3D) {
    // 1. Check if current selection has placeholder data
    const selection = this.editor.selection.getSingleSelection();
    if (selection) {
        const placeholderData = selection.editor.getPlaceholderData(instance);
        if (placeholderData) return placeholderData;
    }

    // 2. Default: place 7 units in front of camera
    const pos = getDefaultAssetPosition(Camera.current, 7);
    return { id: null, position: toXYZ(pos), rotation: toXYZ(new Euler()) };
}
```

---

## 7. Drag-and-Drop System

**Location**: `src/dnd/`

### Architecture

```
┌─────────────────┐
│      Dnd        │  (Manager)
│  src/dnd/index  │
└────────┬────────┘
         │ owns
         ▼
┌─────────────────┐       ┌─────────────────┐
│  DragComponent  │──────▶│  DragPreview3D  │
│                 │       │                 │
└─────────────────┘       └─────────────────┘
```

### Dnd Class

**Location**: `src/dnd/index.ts:4`

Simple manager that delegates to `DragComponent`.

```typescript
handleDragStart(opts: EditorDragData) {
    this.dragComponent.enter({
        ...opts,
        onDragEnter: (event) => opts.onDragEnter?.(event),
        onDrop: (dropOpts) => {
            this.isDragging = false;
            opts.onDrop(dropOpts);
        },
        onDragLeave: () => {
            this.isDragging = false;
        },
    });
}
```

### DragComponent

**Location**: `src/dnd/drag-component.ts:25`

Handles the actual drag operation including:

- Preview creation and positioning
- Surface raycasting for placement
- Behavior attachment support

#### Lifecycle

```
┌─────────────────┐
│    enter()      │ ─── Start drag operation
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  1. Enable event listeners              │
│  2. Create AbortController              │
│  3. Set blank drag image                │
│  4. Set dataTransfer data               │
│  5. Call addPreview()                   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ addPreview()    │
└────────┬────────┘
         │
         ├── Create DragPreview3D (default)
         │
         └── If onCreatePreview provided:
             await and replace with actual component
         │
         ▼
┌─────────────────┐
│ onDragOver()    │ ─── Store event for update loop
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  doDragOver()   │
└────────┬────────┘
         │
         ├── hitTest() - raycast for surface
         │
         ├── Position preview at hit point
         │   (or plane intersection if no hit)
         │
         └── For behaviors: highlight valid targets
         │
         ▼
┌─────────────────┐
│   onDrop()      │
└────────┬────────┘
         │
         ├── Call opts.onDrop with coords
         │
         └── reset()
```

#### Behavior Attachment

When dragging a behavior (not a component):

```typescript
if (this._dragData?.isBehavior) {
    // Show preview but invisible
    this._defaultPreview.visible = false;

    // Highlight valid targets on hover
    if (this.isValidBehaviorTarget(target)) {
        this._currentBehTarget = target;
        target.editor?.toggleHighlighted(true);
    }
}
```

### EditorDragData Interface

```typescript
interface EditorDragData {
    event: DragEvent;
    asset: any;
    isBehavior?: boolean;
    onCreatePreview?: () => Promise<Component3D>;
    onDestroyPreview?: (component: Component3D) => void;
    onDragEnter?: (event: DragEvent) => void;
    onDragLeave?: () => void;
    onDrop: (opts: DropOptions) => void;
}
```

---

## 8. State Management

**Location**: `src/state/`

### Architecture

```
┌────────────────────────┐
│     EditorState        │
│    src/state/index     │
└───────────┬────────────┘
            │
    ┌───────┼───────┬───────────────┐
    │       │       │               │
    ▼       ▼       ▼               ▼
┌────────┐ ┌────────┐ ┌────────────┐ ┌──────────────┐
│Selection│ │Transform│ │EnabledTools│ │Factories     │
│Observable│ │State   │ │State       │ │Observable    │
└────────┘ │Observable│ │Observable  │ └──────────────┘
           └────────┘ └────────────┘
```

### WorldObservable Pattern

**Location**: `src/utils/observable.ts:7`

Generic observable that automatically updates from events.

```typescript
class WorldObservable<T> {
    callbacks: Set<Callback>;  // Subscribers
    value: T;                  // Current state

    constructor(
        startValue: T,
        reducers: Array<{
            event: string;
            update: (eventData: any, seed: T) => T;
        }>,
        isSync = false
    ) {
        // Subscribe to events and apply reducers
    }

    subscribe(callback) { ... }
    getState() { return this.value; }
}
```

### SelectionObservable

**Location**: `src/state/selection.ts:6`

```typescript
class SelectionObservable extends WorldObservable<Component3D[]> {
    constructor() {
        super(
            [],  // Initial: empty array
            [{
                event: Events.SELECTION_CHANGED,
                update: (eventData, seed) => eventData.selection
            }]
        );
    }
}
```

### TransformerStateObservable

**Location**: `src/state/transform.ts:12`

```typescript
interface TransformerState {
    enableTranslate: boolean;
    enableRotate: boolean;
    enableLocalSpace: boolean;
    targets: Component3D[];
}

// Subscribes to:
// - TRANSFORM_MODE_CHANGED → updates enabled modes
// - TRANSFORM_TARGET_CHANGED → updates targets array
```

### EnabledToolsStateObservable

**Location**: `src/state/tools.ts:9`

```typescript
interface EnabledToolsState {
    drawer: boolean;
}

// Subscribes to:
// - TOOL_ENABLED_CHANGED → updates tool states
```

---

## 9. Grid System

**Location**: `src/grid/index.ts:40`

### Grid Class

Manages the grid visualization and navigation cube.

#### Components

1. **GridMesh**: Infinite grid plane with axis coloring
2. **Navigation Cube**: 3D cube for view switching (Front/Back/Left/Right/Top/Bottom)
3. **Post-UI Scene**: Renders cube over main scene

#### Navigation Cube Interaction

```
Click on cube face
        │
        ▼
checkIntersection()
        │
        ▼
Determine face normal
        │
        ├── Z face → emit "Z" or "-Z"
        ├── X face → emit "X" or "-X"
        └── Y face → emit "Y" or "-Y"
        │
        ▼
emit("gridmodechange", view)
        │
        ▼
EngineEdit.setNavView(view)
```

#### Grid Modes

```typescript
type NavGridMode = "XY" | "-XY" | "XZ" | "-XZ" | "YZ" | "-YZ";

const navViewToGridMode: Record<NavView, NavGridMode> = {
    X: "YZ",   "-X": "-YZ",
    Y: "XZ",   "-Y": "-XZ",
    Z: "XY",   "-Z": "-XY",
};
```

---

## 10. Drawing Tool

**Location**: `src/tools/drawer/index.ts:75`

### Drawer Class

Brush-based tool for stamping objects on terrain surfaces.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `base` | `Component3D` | Template object to stamp |
| `target` | `Component3D` | Surface to draw on (terrain) |
| `data` | `DrawerData` | Brush settings |
| `pointer` | `PipeLineLines` | Visual brush cursor |
| `ghostBase` | `Component3D` | Preview ghost object |
| `_batch` | `Component3D[]` | Current stroke's spawned objects |

#### Draw Settings

```typescript
const defaultData = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    offset: { x: 0, y: 0, z: 0 },
    followNormal: true,         // Align to surface normal
    rotationVariance: Math.PI * 2,  // Random rotation
    scaleVariance: 0,           // Random scale variation
    size: 3,                    // Brush size
    spacing: 3,                 // Min distance between stamps
    origin: "bottom",           // Object origin point
    drawMode: "draw",           // "draw" or "erase"
};
```

#### Drawing Flow

```
Mouse Down
    │
    ├── drawMode === "draw"
    │   └── spawn(e) → duplicate base, position at hit
    │
    └── drawMode === "erase"
        └── erase(e) → remove nearby instances

Mouse Move (while down)
    │
    └── Check spacing from last spawns
        │
        └── If far enough: spawn/erase another

Mouse Up
    │
    └── Call batchCallback with all spawned objects
```

#### Spacing Check

```typescript
// Prevent spawning too close to existing objects
while (i < this.lastDrawSpawns.length) {
    const distance = last.distanceTo(intersect.point);
    if (distance < this.data.spacing) {
        tooClose = true;
        return;
    }
    i++;
}
```

---

## 11. Event System

**Location**: `src/editor-events.ts`

### Complete Event List

| Event | Description | Payload |
|-------|-------------|---------|
| `EDITOR_STATE_CHANGED` | General editor state change | varies |
| `MOUSE_LOCK_CHANGED` | Mouse lock state changed | `{ isLocked: boolean }` |
| `SELECTION_CHANGED` | Selection updated | `{ selection: Component3D[] }` |
| `COMPONENTS_COORDS_CHANGED` | Transform completed | `{ changes: TransformChange[] }` |
| `COMPONENTS_COORDS_CHANGED_STARTED` | Transform started | none |
| `DRAG_ENTER` | Drag entered canvas | DragEvent |
| `DRAG_END` | Drag ended | none |
| `EDITOR_DROP` | Drop completed | DropOptions |
| `TRANSFORM_MODE_CHANGED` | Transform mode toggled | `{ mode: TransformModes }` |
| `TRANSFORM_TARGET_CHANGED` | Transform target changed | `{ targets: Component3D[] }` |
| `COMPONENT_LOCK_CHANGED` | Component lock state | `{ component, lock }` |
| `TOOL_ENABLED_CHANGED` | Tool enabled/disabled | `{ drawer: boolean, ... }` |
| `DRAWER_TOOL_BATCH` | Drawing batch completed | `{ base, batch }` |
| `CAMERA_CONTROLS_START` | Camera movement started | event |
| `CAMERA_CONTROL` | Camera moving | event |
| `COMPONENT_PARENT_CHANGED` | Component reparented | `{ component, parent }` |

### Event Usage Pattern

```typescript
// Emit an event
Emitter.emit(Events.SELECTION_CHANGED, { selection: [...this.selection] });

// Subscribe to an event
Emitter.on(Events.SELECTION_CHANGED, this.onSelectionChanged);

// Unsubscribe
Emitter.off(Events.SELECTION_CHANGED, this.onSelectionChanged);
```

---

## 12. Type Definitions

**Location**: `src/types.ts`

### Core Interfaces

```typescript
interface XYZ {
    x: number;
    y: number;
    z: number;
}

interface Coords {
    position?: XYZ;
    rotation?: XYZ;
    scale?: XYZ;
}

interface TransformChange {
    targetMesh: Component3D;
    changes: any;
    undo: any;
}

interface TransformModes {
    enableTranslate: boolean;
    enableRotate: boolean;
    enableScale: boolean;
    enableLocalSpace: boolean;
}

interface ComponentLock {
    [key: string]: boolean | string;
}

type NavView = "X" | "Y" | "Z" | "-X" | "-Y" | "-Z";

type NavGridMode = `${"-" | ""}${"XY" | "XZ" | "YZ"}`;
```

---

## 13. Key Workflows

### Object Selection Flow

```
┌────────────┐    ┌─────────────┐    ┌────────────────┐
│ Mouse Click│───▶│ MouseRaycast│───▶│ Selector       │
└────────────┘    │ .click()    │    │ .onComponentClick│
                  └─────────────┘    └────────┬───────┘
                                              │
                  ┌───────────────────────────┘
                  │
                  ▼
         ┌───────────────┐
         │ Is Shift key? │
         └───────┬───────┘
            Yes  │  No
         ┌───────┴───────┐
         ▼               ▼
┌─────────────┐   ┌──────────────┐
│ toggleItem  │   │clearSelection│
│             │   │ setSelection │
└──────┬──────┘   └──────┬───────┘
       │                 │
       └────────┬────────┘
                ▼
┌───────────────────────────┐
│ emitSelectionChanged()    │
│ Emitter.emit(SELECTION_  │
│   CHANGED, {selection})   │
└───────────────┬───────────┘
                │
    ┌───────────┼───────────────────────────┐
    │           │                           │
    ▼           ▼                           ▼
┌─────────┐ ┌────────────────┐  ┌───────────────────┐
│Transformer│ │SelectionObservable│  │ UI Components    │
│.onSelection│ │.update()     │  │ (via subscribe)   │
│Changed()  │ └────────────────┘  └───────────────────┘
└─────────┘
```

### Transform Drag Flow

```
┌────────────────────┐
│PivotControls       │
│dragging-changed(true)│
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│Transformer         │
│.onTransformDragging│
│Changed()           │
└─────────┬──────────┘
          │
          ├── Emit MOUSE_LOCK_CHANGED (isLocked: true)
          │
          └── DragHandler.dragStart()
              │
              ├── Store initial coords
              ├── Store initial transform data
              └── Emit COMPONENTS_COORDS_CHANGED_STARTED

... user drags ...

┌────────────────────┐
│PivotControls       │
│dragging-changed(false)│
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│DragHandler.dragEnd │
└─────────┬──────────┘
          │
          ├── Build changes array (diff from initial)
          │
          └── Emit COMPONENTS_COORDS_CHANGED
                    │
                    ▼
            ┌────────────────┐
            │ Undo/Redo      │
            │ System         │
            └────────────────┘
```

### Drag-and-Drop Flow

```
External Source (e.g., asset browser)
          │
          │ dragstart
          ▼
┌────────────────────┐
│Dnd.handleDragStart │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│DragComponent.enter │
└─────────┬──────────┘
          │
          ├── Create DragPreview3D
          │
          └── If onCreatePreview: await component
          │
          ▼ (user drags over canvas)
┌────────────────────┐
│DragComponent       │
│.onDragOver()       │
└─────────┬──────────┘
          │
          ├── hitTest() - raycast scene
          │
          └── Position preview at hit point
          │
          ▼ (user releases)
┌────────────────────┐
│DragComponent.onDrop│
└─────────┬──────────┘
          │
          ├── Capture final position/rotation
          │
          └── Call opts.onDrop({
                preview: componentPromise,
                coords: { position, rotation },
                target: behaviorTarget
              })
```

### Camera Navigation Flow

```
┌───────────────────┐
│ User Input        │
│ (mouse/keyboard)  │
└─────────┬─────────┘
          │
    ┌─────┴─────────────────────┐
    │                           │
    ▼                           ▼
┌────────────────┐     ┌────────────────┐
│WASD Keys       │     │Mouse Drag      │
│moveForward/etc │     │cameraControls  │
└────────┬───────┘     │.rotate/.truck  │
         │             └────────┬───────┘
         │                      │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────┐
         │cameraControls    │
         │.update(delta)    │
         └──────────┬───────┘
                    │
                    ├── Emit CAMERA_CONTROLS_START
                    │
                    └── Emit CAMERA_CONTROL
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌────────────┐      ┌────────────┐
            │Navigation  │      │Grid        │
            │.onMouseLock│      │.onCameraMove│
            │Changed()   │      │(reset mode)│
            └────────────┘      └────────────┘
```

### Drawing Tool Flow

```
┌────────────────────┐
│ User enables       │
│ Drawing Tool       │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│Drawer.setDrawingToolData│
│({ enabled: true,   │
│   base: component })│
└─────────┬──────────┘
          │
          ├── Disable selection
          ├── Create ghost preview
          ├── Disable camera mouse
          └── Add event listeners
          │
          ▼
┌────────────────────┐
│ User mouse down    │
└─────────┬──────────┘
          │
          ├── Raycast to terrain
          │
          └── drawMode?
              │
          ┌───┴───┐
          │       │
       "draw"   "erase"
          │       │
          ▼       ▼
     ┌────────┐ ┌────────┐
     │spawn() │ │erase() │
     │duplicate│ │remove  │
     │base    │ │nearby  │
     └────────┘ └────────┘
          │
          ▼
┌────────────────────┐
│ Mouse move (held)  │
└─────────┬──────────┘
          │
          └── Check spacing → spawn/erase more
          │
          ▼
┌────────────────────┐
│ Mouse up           │
└─────────┬──────────┘
          │
          └── Call batchCallback({ base, batch })
```

---

## 14. Cross-System Communication

### Event-Driven Architecture

All subsystems communicate through the central `Emitter`:

```
┌──────────────────────────────────────────────────────────────┐
│                         Emitter                              │
└──────────────────────────────────────────────────────────────┘
      ▲           ▲           ▲           ▲           ▲
      │           │           │           │           │
  Selection  Transformer  Navigation    Grid      Drawing
   System      System       System     System      Tool
```

### Mouse Lock Coordination

Multiple systems need exclusive mouse control:

```typescript
// When transformer starts dragging
Emitter.emit(Events.MOUSE_LOCK_CHANGED, { isLocked: true });

// When drag-select starts
Emitter.emit(Events.MOUSE_LOCK_CHANGED, { isLocked: true });

// Navigation responds
onMouseLockChanged = (event) => {
    if (event.isLocked) {
        this.currentControls.deactivate();
    } else {
        this.currentControls.activate();
    }
};
```

### Data Flow Patterns

1. **Selection → Transformer**: Selection changes trigger transformer attachment
2. **Transformer → State**: Transform mode changes update TransformerStateObservable
3. **Selection → State**: Selection changes update SelectionObservable
4. **Grid → Navigation**: Grid cube clicks trigger navigation view changes
5. **Commands → Events**: Component changes emit appropriate events

---

## File Reference

| Path | Description |
|------|-------------|
| `src/index.ts` | EngineEdit main class |
| `src/types.ts` | Type definitions |
| `src/editor-events.ts` | Event constants |
| `src/selection/index.ts` | EditModeSelection facade |
| `src/selection/selector.ts` | Core selection logic |
| `src/transformer/index.ts` | Transformer main class |
| `src/transformer/transform-proxy.ts` | Multi-select proxy |
| `src/transformer/drag-handler.ts` | Change tracking |
| `src/navigation/index.ts` | EditModeNavigation |
| `src/navigation/perspective.ts` | PerspectiveControls |
| `src/commands/index.ts` | EditCommands |
| `src/dnd/index.ts` | Dnd manager |
| `src/dnd/drag-component.ts` | DragComponent |
| `src/state/index.ts` | EditorState |
| `src/state/selection.ts` | SelectionObservable |
| `src/state/transform.ts` | TransformerStateObservable |
| `src/state/tools.ts` | EnabledToolsStateObservable |
| `src/grid/index.ts` | Grid system |
| `src/tools/drawer/index.ts` | Drawing tool |
| `src/utils/mouse-raycast.ts` | MouseRaycast utility |
| `src/utils/observable.ts` | WorldObservable pattern |
