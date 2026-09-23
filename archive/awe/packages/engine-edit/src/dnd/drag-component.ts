// @ts-check

import {
  Vector3,
  Raycaster as ThreeRaycaster,
  Matrix3,
  Plane,
  Object3D,
  Vector2,
  Intersection,
  Box3,
} from "three";
import emitter from "@oncyberio/engine/internal/engine-emitter";
import Events from "../editor-events";
import Camera from "@oncyberio/engine/camera";
import { CANVAS } from "@oncyberio/engine/internal/constants";
import { EditorDragData, getEmptyDragPreview } from "./utils";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { getCurrentSpace } from "@oncyberio/engine/internal";
import { EngineEdit } from "..";
import { DragPreview3D } from "./drag-preview-3d";
import { getOrCreateEditor } from "../editors/editor-registry";

const v3Center = new Vector3();

export class DragComponent {
  //
  _dragData: EditorDragData & { abort: AbortController } = null;

  _defaultPreview: DragPreview3D = null;

  _component: Component3D = null;

  snap2D = false;

  _componentPromise: Promise<Component3D> = null;

  _compDims: Box3 = null;

  _hitMeshes: Object3D[] = null;

  _lastDragX = 0;

  _lastDragY = 0;

  _dragEvent = null;

  _enabled = false;

  _currentBehTarget: Component3D = null;

  constructor() {}

  get enabled() {
    return this._enabled;
  }

  set enabled(isEnabled) {
    if (isEnabled === this._enabled) return;

    this._enabled = isEnabled;

    if (!isEnabled) {
      this.removeEvents();
    } else {
      this.addEvents();
    }
  }

  getHitMeshes() {
    if (this._hitMeshes == null) {
      this._hitMeshes = [];

      getCurrentSpace()
        .components.forEach((obj) => {
          if (
            obj === this._component ||
            obj.isDescendantOf(this._component) ||
            this.is2D(obj)
          )
            return;

          const mesh = getOrCreateEditor(obj)?.getSelectionMesh();

          if (mesh != null) {
            //
            if (!mesh.userData._dnd_componnet) {
              //
              mesh.userData._dnd_componnet = obj;
            }

            this._hitMeshes.push(mesh);
          }
        });
    }

    return this._hitMeshes;
  }

  enter(data: EditorDragData) {
    //
    this.enabled = true;

    this._dragData = { ...data, abort: new AbortController() };

    let blankCanvas = getEmptyDragPreview();

    data.event.dataTransfer.setDragImage(blankCanvas, 0, 0);

    try {
      data.event.dataTransfer.setData(
        "application/json",
        JSON.stringify({ ...data.asset, dataType: "resource" })
      );
    } catch (e) {
      console.log(e, data);
    }

    data.event.dataTransfer.effectAllowed = "all";

    this.addPreview();
  }

  reset() {
    this._dragEvent = null;

    this._dragData = null;

    this._defaultPreview = null;

    this._component = null;

    this.snap2D = false;

    this._componentPromise = null;

    this._hitMeshes = null;

    this._lastDragX = 0;

    this._lastDragY = 0;

    this.enabled = false;
  }

  exit() {
    //
    this._dragData?.abort.abort();

    const dragData = this._dragData;

    this._componentPromise?.then((component) => {
      //
      dragData?.onDestroyPreview?.(component);
    });

    this._defaultPreview?.onDestroy();

    this.reset();
  }

  createDefaultPreview() {
    //
    return new DragPreview3D();
  }

  async addPreview() {
    //
    const dragData = this._dragData;

    if (dragData == null) return;

    const commands = EngineEdit.getInstance().commands;

    const { rotation: rot } = commands.getDefaultAssetPlacement(null);

    this._defaultPreview = this.createDefaultPreview();

    if (this._dragData.isBehavior) {
      //
      this._defaultPreview.visible = false;
    }

    let componentPromise = dragData.onCreatePreview?.();

    if (componentPromise) {
      //
      this._componentPromise = componentPromise;

      let component = await componentPromise;

      if (component == null || dragData != this._dragData) return;

      this._component = component;

      this.snap2D = this.is2D(component);

      console.log("3D drag add preview", this._component);

      this._component.position.copy(this._defaultPreview.position);

      this._component.quaternion.copy(this._defaultPreview.quaternion);

      this._component.syncWithTransform();

      this._defaultPreview.onDestroy();

      this._defaultPreview = null;
    }
  }

  is2D(object) {
    return (
      object.data.type === "image" ||
      object.data.type === "video" ||
      object.data.type === "text"
    );
  }

  get currentPreview() {
    //
    return this._defaultPreview ?? this._component;
  }

  onDragEnter = (e: DragEvent) => {
    //
    console.log("3D drag onDragEnter", e);

    if (this._dragData == null) return;

    e.preventDefault();

    this._lastDragX = e.clientX;
    this._lastDragY = e.clientY;

    e.dataTransfer.dropEffect = "move";

    this._dragData.onDragEnter(e);
  };

  onDragLeave = (e: DragEvent) => {
    if (this._dragData == null) return;

    e.preventDefault();

    const onDragLeave = this._dragData.onDragLeave;

    this.exit();

    onDragLeave?.();
  };

  raycaster = new ThreeRaycaster();

  mousevec = new Vector2();

  hitNormal = new Vector3();

  hitTest(e: MouseEvent, deltaAngle: number) {
    const rect = CANVAS.getBoundingClientRect();

    this.mousevec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;

    this.mousevec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mousevec, Camera.current);

    this.raycaster.ray.direction.applyAxisAngle(Camera.current.up, deltaAngle);

    let hitMeshes = this.getHitMeshes();

    let intersections = this.raycaster?.intersectObjects(hitMeshes);

    if (intersections.length) return intersections[0];

    return null;
  }

  isValidBehaviorTarget(target: Component3D) {
    //
    return (
      target != null &&
      target.isPersistent &&
      !target.isBehavior &&
      target.data.type !== "terrain" &&
      target.data.type !== "water" &&
      target.data.type !== "reflector"
    );
  }

  onDragOver = (e: DragEvent) => {
    // console.log("drag over", e)

    e.preventDefault();

    if (this._dragData == null) {
      e.dataTransfer.dropEffect = "none";

      e.dataTransfer.effectAllowed = "none";

      return;
    }

    this._dragEvent = e;
  };

  tmpNormal = new Vector3();

  tmpMat3 = new Matrix3();

  tmpIntersect = new Vector3();

  _dragPlane = new Plane();

  // planHelper = new PlaneHelper(this._dragPlane, 100, 0xff0000)

  doDragOver(e: DragEvent) {
    if (this._dragData == null) return;

    // console.log ("do drag over", e)

    let deltaX = e.clientX - this._lastDragX;
    let deltaY = e.clientY - this._lastDragY;

    this._lastDragX = e.clientX;
    this._lastDragY = e.clientY;

    let deltaAngle = 0;

    if (deltaX >= 0 && deltaY && e.clientX > window.innerWidth - 5) {
      deltaAngle = -1;
    } else if (deltaX <= 0 && deltaY && e.clientX < 5) {
      deltaAngle = 1;
    }

    deltaAngle *= Math.PI / 180;

    // Camera.currentControls.rotateAzimuth(deltaAngle)

    let then = performance.now();

    let result = this.hitTest(e, -deltaAngle);

    if (this._dragData?.isBehavior) {
      //
      this.doDragOverBehavior(result);
      //
    } else if (this.currentPreview) {
      //
      // console.log("hit test", result)

      this.currentPreview.visible = true;

      // debugger

      // this.planHelper.visible = false

      if (result == null) {
        // console.log("no hit")

        this._dragPlane.setFromNormalAndCoplanarPoint(
          this.currentPreview.getWorldDirection(this.tmpNormal),
          this.currentPreview.position
        );

        // test intersection of line from camera with the drag plane
        let hit = this.raycaster.ray.intersectPlane(
          this._dragPlane,
          this.tmpIntersect
        );

        if (hit == null) {
          //
          hit = this.tmpNormal
            .copy(this.raycaster.ray.direction)
            .setLength(10)
            .add(this.raycaster.ray.origin);
        }

        this.currentPreview.position.copy(hit);

        // @ts-ignore
        this.currentPreview.syncWithTransform?.();

        return;
      }

      // console.log("hit test", result, isModel, spaceItem)
      this.currentPreview.position.copy(result.point);

      if (this._component && this._component.componentType !== "avatar") {
        //
        const bbox = this._component.getBBox();

        const center = bbox.getCenter(v3Center);

        this._component.position.y += center.y - bbox.min.y;
      }

      // @ts-ignore
      this.currentPreview.syncWithTransform?.(true);
    }
  }

  doDragOverBehavior(result: Intersection) {
    //
    const prevBehTarget = this._currentBehTarget;

    let target = result?.object?.userData?._dnd_componnet;

    if (this.isValidBehaviorTarget(target)) {
      //
      this._currentBehTarget = target;
      //
    } else {
      //
      this._currentBehTarget = null;
    }

    if (target === prevBehTarget) return;

    this.highlightBehaviorTarget(prevBehTarget, false);

    this.highlightBehaviorTarget(this._currentBehTarget);
  }

  highlightBehaviorTarget(target?: Component3D | null, b: boolean = true) {
    //
    if (target) getOrCreateEditor(target)?.toggleHighlighted(b);
  }

  /**
   * @param { DragEvent } e
   */
  onDrop = (e) => {
    // console.log("drag/drop")
    if (this._dragData == null) return;

    if (this._dragEvent) {
      this.onUpdate();
    }

    e.preventDefault();

    // this.dropPlaceholder.visible = false

    const onDrop = this._dragData.onDrop;

    let preview = this.currentPreview;

    const defaultPreview = this._defaultPreview;

    const payload = {
      preview: this._componentPromise,
      target: this._currentBehTarget,
      coords: {
        position: this.currentPreview.position.clone(),
        rotation: this.currentPreview.rotation.clone(),
      },
      onDropEnd: () => {
        defaultPreview?.onDestroy();
      },
      event: e,
    };

    if (preview instanceof DragPreview3D) {
      preview.setPending(true);
    }

    this.reset();

    onDrop(payload);
  };

  onUpdate = () => {
    if (this._dragEvent) {
      try {
        this.doDragOver(this._dragEvent);
      } finally {
        this._dragEvent = null;
      }
    }
  };

  addEvents() {
    emitter.on(Events.LATE_UPDATE, this.onUpdate);

    CANVAS.addEventListener("dragenter", this.onDragEnter);

    CANVAS.addEventListener("dragleave", this.onDragLeave);

    CANVAS.addEventListener("dragover", this.onDragOver);

    CANVAS.addEventListener("drop", this.onDrop);
  }

  removeEvents() {
    emitter.off(Events.LATE_UPDATE, this.onUpdate);

    CANVAS.removeEventListener("dragenter", this.onDragEnter);

    CANVAS.removeEventListener("dragleave", this.onDragLeave);

    CANVAS.removeEventListener("dragover", this.onDragOver);

    CANVAS.removeEventListener("drop", this.onDrop);
  }

  wasDisposed = false;

  dispose() {
    if (this.wasDisposed) return;

    this.wasDisposed = true;

    this.removeEvents();

    this._defaultPreview?.onDestroy();
  }
}
