import { MouseRaycast } from "../utils/mouse-raycast";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { CANVAS } from "@oncyberio/engine/internal/constants";
import emitter from "@oncyberio/engine/internal/engine-emitter";
import { EngineEvents } from "@oncyberio/engine/internal/engine-events";
import Events from "../editor-events";
import { CursorHandler } from "../cursor-handler";
import { EngineEdit } from "..";
import { getOrCreateEditor } from "../editors/editor-registry";
import { Intersection, Mesh } from "three";

const DRAG_SELECT_STATES = {
  NA: 0,
  MAYBE_DRAGGING: 1,
  DRAGGING: 2,
};

export class Selector {
  //
  mouseRaycast = MouseRaycast.getInstance();

  hoveredComponent: Component3D | null = null;

  selection: Set<Component3D> = new Set();

  selectionBox = createSelectionBox();

  isDragSelecting = false;

  lastSelected: Component3D | null = null;

  _dragSelectState = {
    rect: null,
    raw: { x0: 0, y0: 0, x1: 0, y1: 0 },
    items: [],
  };

  constructor(private editor: EngineEdit) {
    //

    this.mouseRaycast.registerNoComponent({
      click: (e) => {
        this.onComponentClick(null, e, null);
      },

      mouseEnter: () => {
        this.onHover(null);
      },
    });

    // editor.transformer.pivotControls.on('pointerdown', (e) => {

    //     console.log('pointer down', e)

    //     this.lastSelected.editor?.showSelected(!e);

    //     // if( this.lastSelected ) {
    //     //     this.toggleItem(this.lastSelected, !e)
    //     // }
    // })

    // debugger;
  }

  emitSelectionChanged() {
    emitter.emit(Events.SELECTION_CHANGED, {
      selection: [...this.selection],
    });
  }

  clearSelection() {
    //
    for (const item of this.selection) {
      //
      getOrCreateEditor(item)?._setSelected(false);

      getOrCreateEditor(item)?.showSelected(false);

      getOrCreateEditor(item)?.toggleHighlighted(false);
    }

    this.selection.clear();
  }

  deleteSelection(item: Component3D) {
    //
    this.selection.delete(item);

    getOrCreateEditor(item)?._setSelected(false);

    getOrCreateEditor(item)?.showSelected(false);
  }

  addSelection(item: Component3D) {
    //
    this.selection.add(item);

    getOrCreateEditor(item)?._setSelected(true);

    getOrCreateEditor(item)?.showSelected(true);

    getOrCreateEditor(item)?.toggleHighlighted(true);
  }

  toggleItem(item: Component3D, shouldSelect?: boolean) {
    //
    if (shouldSelect == null) {
      //
      shouldSelect = !this.selection.has(item);
    }

    if (!shouldSelect) {
      //
      this.deleteSelection(item);

      this.lastSelected = null;
      //
    } else {
      //
      this.addSelection(item);

      this.lastSelected = item;
    }

    this.emitSelectionChanged();
  }

  setSelection(items: Component3D[]) {
    //
    this.clearSelection();

    items = this.normalizeSelection(items);

    for (const item of items) {
      //
      this.addSelection(item);

      this.lastSelected = item;
    }

    this.emitSelectionChanged();
  }

  private _currentHighlighted: Component3D | null = null;

  highlightItem(item: Component3D | null) {
    //
    if (this._currentHighlighted == item) return;

    if (this._currentHighlighted) getOrCreateEditor(this._currentHighlighted)?.toggleHighlighted(false);

    this._currentHighlighted = item;

    if (this._currentHighlighted) getOrCreateEditor(this._currentHighlighted)?.toggleHighlighted(true);
  }

  onHover(component: Component3D) {
    //
    if (this.hoveredComponent == component) return;

    this.hoveredComponent = component;

    this.highlightItem(component);

    CursorHandler.instance.setCursor(
      CursorHandler.source.SELECTOR,
      this.hoveredComponent ? "pointer" : null
    );
  }

  onComponentClick(
    item: Component3D,
    e: MouseEvent,
    intersect: Intersection<Mesh>
  ) {
    //
    const isMulti = e.shiftKey;

    if (isMulti) {
      //
      if (item == null) return;

      this.toggleItem(item, undefined);
    } else {
      //
      this.clearSelection();

      let selection = [];

      if (item !== null) {
        selection.push(item);
      }

      this.setSelection(selection);
    }
  }

  private _isChildMesh(item: Component3D, mesh: Mesh) {
    //
    return mesh !== getOrCreateEditor(item)?.getSelectionMesh();
  }

  private _getTopmost(component: Component3D, index = 0) {
    //
    let current = component;

    let parents = [];

    while (
      current.parentComponent &&
      current.parentComponent.data.type == "group"
    ) {
      //
      current = current.parentComponent;

      parents.unshift(current);
    }

    return parents[index] || component;
  }

  componentAdded = (component: Component3D) => {
    //
    if (!component.isPersistent) return;

    if (component.data.type === "group") return;

    this.mouseRaycast.register(component, {
      click: (e, intersects) => {
        //
        const intersect = intersects[0];

        const mesh = intersect.object;

        if (this._isChildMesh(component, mesh)) {
          //
          if (!this.selection.has(component)) {
            //
            this.setSelection([component]);
          }

          setTimeout(() => {
            //
            getOrCreateEditor(component)?.onDetailMeshClicked(mesh, intersect);
            getOrCreateEditor(component)?.emit("detailClick", {
              mesh,
              intersect,
              event: e,
            });
          });
        } else {
          //
          const topmost = this._getTopmost(component);

          this.onComponentClick(topmost, e, intersect);
        }
      },

      dblClick: (e, intersects) => {
        //
        const intersect = intersects[0];

        if (this._isChildMesh(component, intersect.object)) {
          //
        } else {
          //
          const topmost = this._getTopmost(component, 1);

          this.onComponentClick(topmost, e, intersect);
        }
      },

      mouseEnter: (e, intersects) => {
        //
        const intersect = intersects[0];

        const mesh = intersect.object;

        if (this._isChildMesh(component, mesh)) {
          //
          CursorHandler.instance.setCursor(
            CursorHandler.source.SELECTOR,
            "pointer"
          );

          getOrCreateEditor(component)?.onDetailMeshMouseEnter(mesh, intersect);

          getOrCreateEditor(component)?.emit("detailMouseEnter", {
            mesh,
            intersect,
            event: e,
          });
          //
        } else {
          //
          let topmost = component;

          if (this.hoveredComponent !== component) {
            //
            topmost = this._getTopmost(component);
          }

          this.onHover(topmost);
        }
      },

      mouseLeave: (e, mesh) => {
        //
        if (this._isChildMesh(component, mesh)) {
          //
          CursorHandler.instance.setCursor(CursorHandler.source.SELECTOR, null);

          getOrCreateEditor(component)?.onDetailMeshMouseLeave(mesh);

          getOrCreateEditor(component)?.emit("detailMouseLeave", {
            mesh,
            event: e,
          });
          //
        }
      },
    });
    // if (component.data.type === "group") {
    //     this.mouseRaycast.toggleActive(mesh, false);
    // }
  };

  componentRemoved = (component: Component3D) => {
    //
    if (!component.isPersistent) return;

    this.mouseRaycast.unregister(component);

    if (this.selection.has(component)) {
      //
      this.deleteSelection(component);

      this.emitSelectionChanged();
    }

    if (this.hoveredComponent == component) {
      //
      this.onHover(null);
    }

    if (this._currentHighlighted == component) {
      //
      this.highlightItem(null);
    }
  };

  isTransformControlLocked = false;

  //
  dragSelectState = DRAG_SELECT_STATES.NA;

  onMouseDown = (e) => {
    //
    if (this.isTransformControlLocked) {
      return;
    }

    const currentPivotHandle =
      this.editor.transformer.pivotControls.currentHandle;

    if (e.raw.shiftKey && currentPivotHandle == null) {
      //
      this.dragSelectState = DRAG_SELECT_STATES.MAYBE_DRAGGING;
    }
  };

  onMouseMove = (e) => {
    //
    if (this.isTransformControlLocked) {
      return;
    }

    if (this.dragSelectState == DRAG_SELECT_STATES.MAYBE_DRAGGING) {
      //
      this.dragSelectState = DRAG_SELECT_STATES.DRAGGING;

      this.handleSelectDragStart(e);
      //
    } else if (this.dragSelectState == DRAG_SELECT_STATES.DRAGGING) {
      //
      this.handleSelectDrag(e);
    }
  };

  onMouseUp = (e) => {
    //
    if (this.dragSelectState == DRAG_SELECT_STATES.DRAGGING) {
      //
      this.handleSelectDragEnd(e);
    }

    this.dragSelectState = DRAG_SELECT_STATES.NA;
  };

  handleSelectDragStart(e) {
    //

    emitter.emit(Events.MOUSE_LOCK_CHANGED, { isLocked: true });

    const intialSelection = [];

    if (this.hoveredComponent) {
      intialSelection.push(this.hoveredComponent);
    }

    this.setSelection([]);

    const rect = (this._dragSelectState.rect = CANVAS.getBoundingClientRect());

    const { raw } = this._dragSelectState;

    raw.x0 = e.raw.x - rect.left + CANVAS.scrollLeft;
    raw.y0 = e.raw.y - rect.top + CANVAS.scrollTop;
    raw.x1 = raw.x0;
    raw.y1 = raw.y0;

    CursorHandler.instance.setCursor(
      CursorHandler.source.SELECTOR,
      "crosshair"
    );
  }

  handleSelectDrag(e) {
    //
    const { raw, rect } = this._dragSelectState;

    raw.x1 = e.raw.x - rect.left + CANVAS.scrollLeft;
    raw.y1 = e.raw.y - rect.top + CANVAS.scrollTop;

    // console.log("edit/mouse move", this._dragSelectState)

    this.updateSelectionBox(e);
  }

  handleSelectDragEnd(e) {
    //
    emitter.emit(Events.MOUSE_LOCK_CHANGED, { isLocked: false });

    this.isDragSelecting = false;

    this.selectionBox.style.display = "none";

    const items = this._dragSelectState.items;

    this._dragSelectState.items = [];

    CursorHandler.instance.setCursor(
      CursorHandler.source.SELECTOR,
      this.hoveredComponent ? "pointer" : null
    );

    this.setSelection(items);
  }

  private normalizeSelection(items: Component3D[]) {
    //
    const selection = new Set(items);

    // exclude items whose parent is already selected
    return items.filter((item) => {
      //
      let current = item.parentComponent;

      while (current) {
        //
        if (selection.has(current)) {
          return false;
        }

        current = current.parentComponent;
      }

      return true;
    });
  }

  updateSelectionBox(e) {
    const { raw, rect, items } = this._dragSelectState;

    const { x0, y0, x1, y1 } = raw;

    let left = Math.min(x0, x1);
    let top = Math.min(y0, y1);
    let right = Math.max(x0, x1);
    let bottom = Math.max(y0, y1);

    const width = right - left;
    const height = bottom - top;

    this.selectionBox.style.display = "block";
    this.selectionBox.style.left = left + "px";
    this.selectionBox.style.top = top + "px";
    this.selectionBox.style.width = width + "px";
    this.selectionBox.style.height = height + "px";

    if (width < 1 || height < 1) return;

    let newItems = this.mouseRaycast
      .intersectScreenRect({ left, top, width, height }, rect)
      .filter((i) => i != null);

    newItems = this.normalizeSelection(newItems);

    items.forEach((item) => {
      //
      getOrCreateEditor(item)?.showSelected(false);
    });

    newItems.forEach((item) => {
      //
      getOrCreateEditor(item)?.showSelected(true);
    });

    this._dragSelectState.items = newItems;
  }

  _enabled = false;

  get enabled() {
    return this._enabled;
  }

  set enabled(val) {
    if (val == this._enabled) return;

    this._enabled = val;

    this.mouseRaycast.enabled = val;

    if (val) {
      this.addEvents();
    } else {
      this.removeEvents();
    }
  }

  addEvents() {
    emitter.on(Events.COMPONENT_ADDED, this.componentAdded);

    emitter.on(Events.COMPONENT_REMOVED, this.componentRemoved);

    emitter.on(EngineEvents.MOUSE_DOWN, this.onMouseDown);

    emitter.on(EngineEvents.MOUSE_MOVE, this.onMouseMove);

    emitter.on(EngineEvents.MOUSE_UP, this.onMouseUp);
  }

  removeEvents() {
    emitter.off(Events.COMPONENT_ADDED, this.componentAdded);

    emitter.off(Events.COMPONENT_REMOVED, this.componentRemoved);

    emitter.off(EngineEvents.MOUSE_DOWN, this.onMouseDown);

    emitter.off(EngineEvents.MOUSE_MOVE, this.onMouseMove);

    emitter.off(EngineEvents.MOUSE_UP, this.onMouseUp);
  }

  dispose() {
    //
    this.removeEvents();

    this.mouseRaycast.dispose();

    document.body.removeChild(this.selectionBox);
  }
}

function createSelectionBox() {
  const selBox = document.createElement("div");

  selBox.id = "canvas-selection-box";

  selBox.style.position = "fixed";
  selBox.style.border = "1px solid #2875E9";
  selBox.style.background = "rgba(40, 117, 233, 0.2)";

  selBox.style.pointerEvents = "none";
  selBox.style.zIndex = "10000";
  selBox.style.display = "none";

  document.body.appendChild(selBox);

  return selBox;
}
