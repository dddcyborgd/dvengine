import emitter from "@oncyberio/engine/internal/engine-emitter";
import { EngineEvents } from "@oncyberio/engine/internal/engine-events";
import Events from "../../editor-events";
import Camera from "@oncyberio/engine/camera";
import { REAL_VIEW } from "@oncyberio/engine/internal/constants";
import { type Space } from "@oncyberio/engine/index";
import { getCurrentSpace } from "@oncyberio/engine/internal";
import {
  Raycaster,
  Vector2,
  Euler,
  Quaternion,
  Vector3,
  Mesh,
  Box3,
} from "three";
import PipeLineLines from "@oncyberio/engine/internal/pipeline/pipeline-lines";
import { LineMaterial2 } from "@oncyberio/engine/internal/utils/lines/line-material-2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import type { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { getOrCreateEditor } from "../../editors/editor-registry";

const tempQuat = new Quaternion();
const tempQuat2 = new Quaternion();

const axisY = new Vector3(0, 1, 0);

const tempEuler = new Euler();

const defaultData = {
  position: {
    x: 0,
    y: 0,
    z: 0,
  },
  rotation: {
    x: 0,
    y: 0,
    z: 0,
  },
  scale: {
    x: 1,
    y: 1,
    z: 1,
  },
  offset: {
    x: 0,
    y: 0,
    z: 0,
  },

  followNormal: true,

  rotationVariance: Math.PI * 2,

  scaleVariance: 0,

  size: 3,

  spacing: 3,

  origin: "bottom",

  drawMode: "draw",
};

export type BatchCallback = (opts: {
  base: Component3D;
  batch: Component3D[];
}) => void;

export interface DrawerToolOpts {
  enabled?: boolean;
  base?: Component3D<any>;
  batchCallback?: BatchCallback;
}

export default class Drawer {
  _enabled: boolean = false;

  raycaster = new Raycaster();

  mouse = new Vector2();

  canvas: any;

  isDown: any;

  data: any;

  currentSpawnMouseMove: any = { x: 0, y: 0 };

  instancedMesh: any;

  usingBatchComponent: any;

  space: Space;

  base: Component3D;

  target: Component3D;

  batchCallback: BatchCallback;

  collisionMesh: Mesh;

  boundingBox: Box3;

  mouseDownEvent: any;

  mouseUpEvent: any;

  mouseMoveEvent: any;

  lastDrawSpawns: any;

  boundingSize = new Vector3();

  pointer: any;

  ghostBase: any;

  currentDrawData: any;

  constructor() {
    //
    // assign default data
    this.data = Object.assign(defaultData, {});

    // this.target = this.data.target

    this.currentDrawData = {};

    this.lastDrawSpawns = [];

    this.getNextData();

    this.initPointer();
  }

  getNextData() {
    var scaleRatio = 1;

    if (this.data.scaleVariance != 0) {
      scaleRatio = Math.max(1.0 + Math.random() * this.data.scaleVariance, 0.1);
    }

    var rotationY = 0;

    if (this.data.rotationVariance) {
      rotationY = Math.random() * this.data.rotationVariance * Math.PI * 2;
    }

    this.currentDrawData = {
      scaleRatio: scaleRatio,

      rotationY: rotationY,
    };
  }

  async spawn(e) {
    //

    this.raycaster.setFromCamera(this.mouse, Camera.current);

    const intersects = this.raycaster.intersectObjects([this.target], true);

    if (intersects.length > 0) {
      this.pointer.visible = true;

      const intersect = intersects[0];

      // pointer

      this.pointer.position.set(
        intersect.point.x,
        intersect.point.y,
        intersect.point.z
      );

      tempEuler.set(0, 0, 0);

      tempQuat.setFromUnitVectors(
        axisY,
        intersect.normal || intersect.face.normal
      );

      tempQuat2.setFromEuler(tempEuler);

      // Apply the rotation to the initial Euler rotation
      tempQuat.multiply(tempQuat2);

      tempEuler.setFromQuaternion(tempQuat, "XYZ");

      this.pointer.rotation.set(tempEuler.x, tempEuler.y, tempEuler.z);

      /// =======<

      if (this.isDown) {
        var tooClose = false;

        let i = 0;

        if (this.usingBatchComponent) {
          let alreadyDrawedComponents = (this.base as any)._instances;

          while (i < alreadyDrawedComponents.length) {
            const p = {
              x: intersect.point.x + this.data.offset.x,
              y: intersect.point.y + this.data.offset.y,
              z: intersect.point.z + this.data.offset.z,
            };

            const distance = alreadyDrawedComponents[i].position.distanceTo(p);

            if (distance < this.data.spacing) {
              tooClose = true;

              i = alreadyDrawedComponents.length;
              // return;
              // stop the thing, too close to the last spawns
            }

            i++;
          }
        } else {
          let i = 0;

          while (i < this.lastDrawSpawns.length) {
            const last = this.lastDrawSpawns[i];

            const distance = last.distanceTo({
              x: intersect.point.x + this.data.offset.x,
              y: intersect.point.y + this.data.offset.y,
              z: intersect.point.z + this.data.offset.z,
            });

            if (distance < this.data.spacing) {
              tooClose = true;
              return;
              // stop the thing, too close to the last spawns
            }

            i++;
          }
        }

        if (tooClose == true) {
          console.log("tooClose", tooClose);

          return;
        }

        const d = this.usingBatchComponent
          ? await (getOrCreateEditor(this.base) as any)?.onBatchAdd({})
          : await this.base.duplicate();

        d.position.x = intersect.point.x + this.data.offset.x;
        d.position.y = intersect.point.y + this.data.offset.y;
        d.position.z = intersect.point.z + this.data.offset.z;

        if (this.usingBatchComponent) {
          this.lastDrawSpawns.push(
            new Vector3(d.position.x, d.position.y, d.position.z)
          );
        } else {
          this.lastDrawSpawns.push(d.position.clone());
        }

        const maxSize = Math.max(this.boundingSize.x, this.boundingSize.z);

        var scaleRatio = this.data.size / maxSize;

        d.scale.x = scaleRatio * this.currentDrawData.scaleRatio;
        d.scale.y = scaleRatio * this.currentDrawData.scaleRatio;
        d.scale.z = scaleRatio * this.currentDrawData.scaleRatio;

        if (this.boundingBox) {
          if (this.data.origin == "bottom") {
            d.position.y -= this.boundingBox.min.y * d.scale.y;
          }
        }

        tempEuler.set(0, this.currentDrawData.rotationY, 0);

        if (this.data.followNormal) {
          // Create a Quaternion that represents the rotation to align with the normal
          tempQuat.setFromUnitVectors(
            axisY,
            intersect.normal || intersect.face.normal
          );

          tempQuat2.setFromEuler(tempEuler);

          // Apply the rotation to the initial Euler rotation
          tempQuat.multiply(tempQuat2);

          tempEuler.setFromQuaternion(tempQuat, "XYZ");
        }

        // if( this.usingBatchComponent ){
        //     // cannot use setter since instancemeshwrapper does not use the same rotation system
        //     d.setRotation([ tempEuler.x, tempEuler.y, tempEuler.z ])
        // }
        // else{

        d.rotation.set(tempEuler.x, tempEuler.y, tempEuler.z);
        // }

        this._batch.push(d);

        console.log(d);

        this.getNextData();
      } else {
        var mode = "ghost";

        let i = 0;

        while (i < this.lastDrawSpawns.length) {
          const last = this.lastDrawSpawns[i];

          const distance = last.distanceTo({
            x: intersect.point.x + this.data.offset.x,
            y: intersect.point.y + this.data.offset.y,
            z: intersect.point.z + this.data.offset.z,
          });

          if (distance < this.data.spacing) {
            mode = "error";
          }

          i++;
        }
        if (
          this.usingBatchComponent == false &&
          this.ghostBase.updateRenderMode != null
        ) {
          await this.ghostBase.updateRenderMode(mode);
        }

        this.ghostBase.visible = true;

        // cannot use setter since it can be a batch component using XYZ but no vector
        (this.ghostBase.position.x = intersect.point.x + this.data.offset.x),
          (this.ghostBase.position.y = intersect.point.y + this.data.offset.y),
          (this.ghostBase.position.z = intersect.point.z + this.data.offset.z);

        tempEuler.set(0, this.currentDrawData.rotationY, 0);

        if (this.data.followNormal) {
          // Create a Quaternion that represents the rotation to align with the normal
          tempQuat.setFromUnitVectors(
            axisY,
            intersect.normal || intersect.face.normal
          );

          tempQuat2.setFromEuler(tempEuler);

          // Apply the rotation to the initial Euler rotation
          tempQuat.multiply(tempQuat2);

          tempEuler.setFromQuaternion(tempQuat, "XYZ");
        }

        //  if( this.usingBatchComponent ){
        //    // cannot use setter since instancemeshwrapper does not use the same rotation system
        //     this.ghostBase.setRotation([ tempEuler.x, tempEuler.y, tempEuler.z ])
        //  }
        //  else{
        this.ghostBase.rotation.set(tempEuler.x, tempEuler.y, tempEuler.z);
        //  }

        const maxSize = Math.max(this.boundingSize.x, this.boundingSize.z);

        var scaleRatio = this.data.size / maxSize;

        // cannot use setter since it can be a batch component using XYZ but no vector
        this.ghostBase.scale.x = scaleRatio * this.currentDrawData.scaleRatio;
        this.ghostBase.scale.y = scaleRatio * this.currentDrawData.scaleRatio;
        this.ghostBase.scale.z = scaleRatio * this.currentDrawData.scaleRatio;

        if (this.boundingBox) {
          if (this.data.origin == "bottom") {
            this.ghostBase.position.y -=
              this.boundingBox.min.y * this.ghostBase.scale.y;
          }
        }
      }
    } else {
      this.pointer.visible = false;

      this.ghostBase.visible = false;
    }
  }

  async erase(e) {
    this.raycaster.setFromCamera(this.mouse, Camera.current);

    this.pointer.visible = true;

    const intersects = this.raycaster.intersectObjects([this.target], true);

    if (intersects.length > 0) {
      const intersect = intersects[0];

      this.pointer.position.set(
        intersect.point.x,
        intersect.point.y,
        intersect.point.z
      );
      this.pointer.visible = true;

      tempEuler.set(0, 0, 0);

      tempQuat.setFromUnitVectors(
        axisY,
        intersect.normal || intersect.face.normal
      );

      tempQuat2.setFromEuler(tempEuler);

      // Apply the rotation to the initial Euler rotation
      tempQuat.multiply(tempQuat2);

      tempEuler.setFromQuaternion(tempQuat, "XYZ");

      this.pointer.rotation.set(tempEuler.x, tempEuler.y, tempEuler.z);

      if (this.isDown) {
        if (this.usingBatchComponent) {
          let alreadyDrawedComponents = (this.base as any)._instances;

          let i = 0;

          while (i < alreadyDrawedComponents.length) {
            const distance = alreadyDrawedComponents[i].position.distanceTo({
              x: intersect.point.x + this.data.offset.x,
              y:
                intersect.point.y +
                this.data.offset.y -
                this.boundingBox.min.y * alreadyDrawedComponents[i].scale.y,
              z: intersect.point.z + this.data.offset.z,
            });

            if (distance < this.data.size) {
              (getOrCreateEditor(this.base) as any)?.onBatchRemove(
                alreadyDrawedComponents[i]
              );
            }

            i++;
          }
        }
      }
    }
  }

  initPointer() {
    // a circle pointer to show where the user is drawing

    let geometry = new LineGeometry();

    let circlePos = [];

    let radius = 0.5;

    let segments = 64;

    for (let i = 0; i < segments; i++) {
      const x = Math.cos((i / segments) * Math.PI * 2) * radius;
      const y = Math.sin((i / segments) * Math.PI * 2) * radius;

      circlePos.push(x, 0, y);
    }

    // push first position for loop
    circlePos.push(circlePos[0], circlePos[1], circlePos[2]);

    geometry.setPositions(circlePos);

    const material = new LineMaterial2({
      color: 0xffffff,
      linewidth: 2,
      opacity: 1,
    });

    this.pointer = new PipeLineLines(geometry, material, {
      visibleOnOcclusion: false,
      visibleOnMirror: false,
    });

    this.pointer.scale.set(this.data.size, this.data.size, this.data.size);
  }

  setDrawingToolData(opts: DrawerToolOpts) {
    //
    if (opts.enabled != this.enabled) {
      //
      if (opts.enabled == true) {
        //
        this.space = getCurrentSpace();

        this.base = opts.base;

        this.usingBatchComponent = this.base.data.type == "batch";

        this.collisionMesh = this.base.getCollisionMesh();

        if (this.collisionMesh) {
          this.collisionMesh.geometry.computeBoundingBox();

          this.boundingBox = this.collisionMesh.geometry.boundingBox.clone();

          this.boundingBox.getSize(this.boundingSize);
        }

        if (this.collisionMesh == null) {
          debugger;
        }

        this.target = [
          ...this.space.components.byType("terrain"),
          ...this.space.components.byTag("terrain"),
        ] as any;

        this.batchCallback = opts.batchCallback;

        console.log("space", this.space);
      }

      this.enabled = opts.enabled;

      emitter.emit(Events.TOOL_ENABLED_CHANGED, {
        drawer: this.enabled,
      });
    }
  }

  set enabled(value) {
    if (this.base == null) {
      console.log("no base component set for the drawer tool");

      return;
    }

    if (value != this._enabled) {
      this._enabled = value;

      if (value) {
        this.activate();
      } else {
        this.desactivate();
      }
    }
  }

  get enabled() {
    return this._enabled;
  }

  async activate() {
    // we need to set transient to true so the base component is not visible
    // to the studio as a user added component
    if (this.usingBatchComponent) {
      // add empty
      this.ghostBase = await (getOrCreateEditor(this.base) as any)?.duplicateBase();

      if (this.ghostBase.updateRenderMode != null) {
        //await this.ghostBase.updateRenderMode("ghost");
      }
    } else {
      this.ghostBase = await this.base.duplicate({ transient: true });

      this.ghostBase.visible = false;

      // await this.ghostBase.updateRenderMode("ghost");
    }

    (window as any).gb = this.ghostBase;

    (Camera.current as any).controls.disableMouse();

    this.addEvents();

    this.space.add(this.pointer);
  }

  desactivate() {
    this.ghostBase.destroy();

    this.ghostBase = null;

    (Camera.current as any).controls.enableMouse();

    this.removeEvents();

    this.space.remove(this.pointer);
  }

  _batch: Component3D[] = [];

  async mouseDown(e) {
    //
    this.isDown = true;

    this._batch = [];

    this.mouse.x = (e.rawEvent.clientX / REAL_VIEW.w) * 2 - 1;

    this.mouse.y = -(e.rawEvent.clientY / REAL_VIEW.h) * 2 + 1;

    if (this.usingBatchComponent) {
      //
      (getOrCreateEditor(this.base) as any)?.onBatchStart();
    }
    // this.lastDrawSpawns = []

    if (this.data.drawMode == "draw") {
      await this.spawn(e);

      this.ghostBase.visible = false;
    }

    if (this.data.drawMode == "erase") {
      this.erase(e);

      this.ghostBase.visible = false;
    }
  }

  async mouseMove(e) {
    this.mouse.x = (e.rawEvent.clientX / REAL_VIEW.w) * 2 - 1;

    this.mouse.y = -(e.rawEvent.clientY / REAL_VIEW.h) * 2 + 1;

    if (this.data.drawMode == "draw") {
      // on mouse move we change the current data scale / but on threshold so it does not change on EVERY move
      if (
        Math.abs(this.currentSpawnMouseMove.x - this.mouse.x) > 0.04 ||
        Math.abs(this.currentSpawnMouseMove.y - this.mouse.y) > 0.04
      ) {
        this.getNextData();

        this.currentSpawnMouseMove.x = this.mouse.x;
        this.currentSpawnMouseMove.y = this.mouse.y;
      }

      this.spawn(e);
    } else {
      this.erase(e);
    }

    if (this.data.drawMode == "erase") {
      this.ghostBase.visible = false;
    }
  }

  mouseUp() {
    this.isDown = false;

    const batch = this._batch;

    this._batch = [];

    if (this.batchCallback) {
      this.batchCallback({ base: this.base, batch: batch });
    }
  }

  addEvents() {
    if (this.mouseDownEvent == null) {
      this.mouseDownEvent = this.mouseDown.bind(this);

      emitter.on(EngineEvents.MOUSE_DOWN, this.mouseDownEvent);

      this.mouseUpEvent = this.mouseUp.bind(this);

      emitter.on(EngineEvents.MOUSE_UP, this.mouseUpEvent);
      emitter.on(EngineEvents.MOUSE_LEAVE, this.mouseUpEvent);

      this.mouseMoveEvent = this.mouseMove.bind(this);

      emitter.on(EngineEvents.MOUSE_MOVE, this.mouseMoveEvent);
    }
  }

  removeEvents() {
    if (this.mouseDownEvent != null) {
      emitter.off(EngineEvents.MOUSE_DOWN, this.mouseDownEvent);

      this.mouseDownEvent = null;

      emitter.off(EngineEvents.MOUSE_UP, this.mouseUpEvent);

      emitter.off(EngineEvents.MOUSE_LEAVE, this.mouseUpEvent);

      this.mouseUpEvent = null;

      emitter.off(EngineEvents.MOUSE_MOVE, this.mouseMoveEvent);

      this.mouseMoveEvent = null;
    }
  }

  getEditor() {
    return {
      drawer: {
        type: "folder",
        label: "Drawing Tool",
        defaultOpen: true,
        children: {
          mode: {
            type: "select",
            label: "Mode",
            items: ["draw", "erase"],
            value: [this.data, "drawMode"],
            onChange: () => {
              this.isDown = false;
              // this.onModeChange()
            },
          },

          followNormal: {
            type: "checkbox",
            label: "Follow Normal",
            value: [this.data, "followNormal"],
            onChange: () => {
              this.getNextData();
            },
          },
          rotationVariance: {
            type: "number",
            label: "Rotation Variance",
            value: [this.data, "rotationVariance"],
            min: 0,
            max: Math.PI * 2,
            step: 0.01,
            onChange: () => {
              this.getNextData();
            },
          },
          scaleVariance: {
            type: "number",
            label: "Scale Variance",
            value: [this.data, "scaleVariance"],
            min: -5,
            max: 5,
            step: 0.01,
            onChange: () => {
              this.getNextData();
            },
          },

          offset: {
            type: "xyz",
            value: [this.data, "offset"],
          },

          size: {
            type: "number",
            label: "Size",
            value: [this.data, "size"],
            min: 0.1,
            max: 50,
            step: 0.01,
            onChange: () => {
              this.pointer.scale.set(
                this.data.size,
                this.data.size,
                this.data.size
              );
              this.getNextData();
            },
          },
          spacing: {
            type: "number",
            label: "Spacing",
            value: [this.data, "spacing"],
            min: 0.2,
            max: 50,
            step: 0.01,
            onChange: () => {
              console.log("on change", this.data.spacing);
              this.getNextData();
            },
          },
        },
      },
    };
  }
}
