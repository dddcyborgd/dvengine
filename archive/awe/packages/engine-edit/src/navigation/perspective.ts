// @ts-check

import CameraControls from "../utils/camera-controls";

// import Scene from "@3scene"

import * as THREE from "three";

import { CANVAS, IS_MOBILE } from "@oncyberio/engine/internal/constants";

import conf from "@oncyberio/engine/internal/utils/params";

import emitter from "@oncyberio/engine/internal/engine-emitter";
import { EngineEvents } from "@oncyberio/engine/internal/engine-events";

import Events from "../editor-events";

import { Euler, Spherical, Vector3 } from "three";

import { isInFrustum, lookAtDistance } from "../utils/three";
import { FocusOpts } from "./types";
import type { Space } from "@oncyberio/engine/index";
import { NavView } from "../types";

const obj = new THREE.PerspectiveCamera();
obj.rotation.order = "YXZ";

const UP_VECTOR = new Vector3(0, 1, 0);

export function getEulerFromLookat(position, target) {
  obj.position.copy(position);

  obj.rotation.set(0, 0, 0);

  obj.lookAt(target);

  return obj.rotation.clone();
}

CameraControls.install({ THREE: THREE });

window["$CameraControls"] = CameraControls;

const TARGET = new Vector3(
  -10.502310085718126,
  0.581587538499533,
  0.7745837808404059,
);

const zoomOutPos = new Vector3(-300, 90, 100);

const DEFAULT_PARAMS = {
  speed: 20,
};

const USER_HEIGHT = 2.8;

const EPS = 1e-5;

interface ToggleMapViewOpts {
  enabled: boolean;
  target?: THREE.Object3D;
  frontDir?: boolean;
}

interface TargetState {
  position?: Vector3;
  rotation?: Euler | Vector3;
}

const tempObj = new THREE.Object3D();
const tempObj2 = new THREE.Object3D();

export class PerspectiveControls {
  isMapView = false;

  keyStates = {};

  cameraControls: CameraControls;

  _enabled = false;

  point = null;

  isDragging = false;

  touchTimeout = null;

  prevClickTime = 0;

  _playerSpeed = 10;

  constructor(
    public opts: { camera: THREE.PerspectiveCamera; cameraOffset: Vector3 },
  ) {
    //
    opts.camera.position.set(0, USER_HEIGHT, EPS);

    this.createCameraControls();
  }

  createCameraControls() {
    //
    this.cameraControls = new CameraControls(this.opts.camera, CANVAS);

    (window as any).ccc = this.cameraControls;

    this.cameraControls.enabled = false;

    this.cameraControls.mouseButtons.left = CameraControls.ACTION.ROTATE;
    this.cameraControls.mouseButtons.wheel = CameraControls.ACTION.DOLLY;
    this.cameraControls.mouseButtons.right = CameraControls.ACTION.TRUCK;
    this.cameraControls.mouseButtons.middle = CameraControls.ACTION.NONE;

    this.cameraControls.touches.one = CameraControls.ACTION.TOUCH_ROTATE;
    this.cameraControls.touches.two = CameraControls.ACTION.TOUCH_TRUCK;

    const panSpeed = +conf.panSpeed || 20;
    const zoomSpeed = +conf.zoomSpeed || 8;

    // debugger;

    this.cameraControls.truckSpeed = panSpeed;
    this.cameraControls.dollySpeed = zoomSpeed / 10;
    this.cameraControls.dollySpeedIn = zoomSpeed;

    this.cameraControls.minDistance = 10;
    this.cameraControls.maxDistance = 20;

    // this.cameraControls.dollySpeed = 0.15;
    // this.cameraControls.dollySpeedIn = 3;

    this.cameraControls.dollyToCursor = true;

    this.cameraControls.infinityDolly = true;

    // negative value to invert rotation direction
    this.cameraControls.azimuthRotateSpeed = -0.5;

    this.cameraControls.polarRotateSpeed = -0.1;

    this.initCameraCoords();

    emitter.once(Events.GAME_SPACE_LOADED, this.initCameraCoords);

    this.cameraControls.addEventListener("controlstart", this.onControlStart);

    this.cameraControls.addEventListener("control", this.onControl);

    (window as any).$cc = this.cameraControls;
  }

  private onControlStart = (event) => {
    //
    emitter.emit(Events.CAMERA_CONTROLS_START, event);
  };

  private onControl = (event) => {
    //
    emitter.emit(Events.CAMERA_CONTROL, event);
  };

  private initCameraCoords = (opts?: { space: Space }) => {
    //
    let pos = new Vector3(0, USER_HEIGHT, 0);

    let rotation = new Euler(0, 0, 0, "YXZ");

    if (opts?.space) {
      //
      const player = opts.space.components.find(
        (c) => c.data.script?._isPlayer,
      );

      if (player != null) {
        // Position camera behind the player
        tempObj.position.copy(player.position);
        tempObj.quaternion.copy(player.quaternion);
        tempObj
          .translateY(USER_HEIGHT + (this.opts.cameraOffset?.y ?? 0))
          .translateX(this.opts.cameraOffset?.x ?? 0)
          .translateZ(this.opts.cameraOffset?.z ?? 10);

        pos.copy(tempObj.position);
      }
    }

    this.setCoords(pos, rotation);

    this.cameraControls.saveState();

    this.cameraControls.update(0);
  };

  enableMouse() {
    this.cameraControls.enabledMouse = true;
  }

  disableMouse() {
    this.cameraControls.enabledMouse = false;
  }

  activate() {
    this._enabled = true;

    this.cameraControls.enabled = true;

    emitter.on(Events.LATE_UPDATE, this.update);

    emitter.on(EngineEvents.MOUSE_DOWN, this.mouseDown);

    emitter.on(EngineEvents.MOUSE_MOVE, this.mouseMove);

    emitter.on(EngineEvents.MOUSE_UP, this.mouseUp);

    emitter.on(EngineEvents.KEY_DOWN, this.handleKeyDown);

    emitter.on(EngineEvents.KEY_UP, this.handleKeyUp);
  }

  deactivate() {
    this._enabled = false;

    this.cameraControls.enabled = false;

    emitter.off(Events.LATE_UPDATE, this.update);

    emitter.off(EngineEvents.MOUSE_DOWN, this.mouseDown);

    emitter.off(EngineEvents.MOUSE_MOVE, this.mouseMove);

    emitter.off(EngineEvents.MOUSE_UP, this.mouseUp);

    emitter.off(EngineEvents.KEY_DOWN, this.handleKeyDown);

    emitter.off(EngineEvents.KEY_UP, this.handleKeyUp);
  }

  tmpPos = new Vector3();
  tmpLookat = new Vector3();
  tmpEuler = new Euler(0, 0, 0, "YXZ");
  sph = new Spherical();

  async setCoords(pos: Vector3, rot: Euler | Vector3, transition = false) {
    //
    this.tmpPos.copy(pos);

    if (rot instanceof Euler) {
      this.tmpEuler.copy(rot);

      this.tmpLookat.set(0, 0, -1).applyEuler(this.tmpEuler).add(this.tmpPos);
    } else {
      this.tmpLookat.set(rot.x, rot.y, rot.z);
    }

    await this.cameraControls.setLookAt(
      this.tmpPos.x,
      this.tmpPos.y,
      this.tmpPos.z,
      this.tmpLookat.x,
      this.tmpLookat.y,
      this.tmpLookat.z,
      transition,
    );

    if (!transition) this.cameraControls.update(0);
  }

  _viewPos = new Vector3();
  _viewLookat = new Vector3();

  setNavView(
    view: NavView,
    opts: {
      transition?: boolean;
      target?: THREE.Object3D;
      distance?: number;
      centerOfBounds?: boolean;
    } = {},
  ) {
    //
    let distance = opts.distance;

    let target: Vector3 = null;

    if (opts.target) {
      target = opts.target.getWorldPosition(new Vector3());
      // raw bbox is for VRM's models
      var bbox =
        (opts.target as any).getRawBBox?.() ?? (opts.target as any).getBBox?.();

      if (bbox != null) {
        if ((opts.target as any).getRawBBox) {
          target.y += (bbox.min.y + bbox.max.y) * 0.5;
          target.x += (bbox.min.x + bbox.max.x) * 0.5;
          target.z += (bbox.min.z + bbox.max.z) * 0.5;
        }
      } else {
        bbox = new THREE.Box3().setFromObject(opts.target);
      }

      if (!distance) {
        // maxing out the distance to 20
        distance = Math.min(this.getBestFitCameraZ(bbox), 100);
      }
    }

    if (target == null) {
      target = this.cameraControls.getTarget(this._viewLookat);

      if (view !== "Y" && view !== "-Y") {
        target.setY(this.cameraControls.camera.position.y);
      } else {
        target.setY(0);
      }
    }

    if (!distance) {
      distance = 20;
    }

    if (view === "X" || view === "-X") {
      //
      // look to 0, 0, 0 from 0, 0, 1
      const inv = view === "-X" ? -1 : 1;

      this._viewPos.set(inv * distance, 0, 0).add(target);

      //
    } else if (view === "Y" || view === "-Y") {
      //
      const inv = view === "-Y" ? -1 : 1;

      this._viewPos.set(0, inv * distance, 0).add(target);
      //
    } else if (view === "Z" || view === "-Z") {
      //
      const inv = view === "-Z" ? -1 : 1;

      this._viewPos.set(0, 0, inv * distance).add(target);
    }

    const euler = getEulerFromLookat(this._viewPos, target);

    this.setCoords(this._viewPos, euler, opts.transition);

    return target;
  }

  private _applyState(state, transition) {
    return this.setCoords(state.position, state.rotation, transition);
  }

  async toggleMapView(opts: ToggleMapViewOpts, transition = false) {
    if (this.isMapView == opts.enabled) return;

    this.isMapView = opts.enabled;

    let smoothTime = this.cameraControls.smoothTime;

    try {
      this.cameraControls.smoothTime = 0.1;

      await this._toggleMapView(opts, transition);
    } finally {
      this.cameraControls.smoothTime = smoothTime;
    }
  }

  private async _toggleMapView(opts: ToggleMapViewOpts, transition = false) {
    const { enabled, target, frontDir = false } = opts;

    const camera = this.opts.camera;

    if (target) {
      await this.setTarget(
        { target: target as THREE.Mesh, transition, frontDir },
        {
          position: enabled ? zoomOutPos.clone() : camera.position.clone(),
        },
      );

      return;
    }

    if (enabled) {
      const pos = zoomOutPos;

      const t = TARGET;

      await Promise.all([
        this.cameraControls.moveTo(pos.x, pos.y, pos.z, transition),
        this.cameraControls.setTarget(t.x, t.y, t.z, transition),
      ]);
    } else {
      await Promise.all([
        this.cameraControls.setTarget(TARGET.x, TARGET.y, TARGET.z, transition),
        this.cameraControls.dollyTo(USER_HEIGHT, transition),
      ]);
    }

    if (!transition) {
      this.cameraControls.update(0);
    }
  }

  focusOn(opts: FocusOpts) {
    return this.setTarget(opts);
  }

  async setTarget(
    { target, transition = true, frontDir = false }: FocusOpts,
    state: TargetState = {},
  ) {
    target.updateWorldMatrix(true, true);

    const camera = this.opts.camera;

    const bbox = new THREE.Box3().setFromObject(target);

    const targetPos = target.getWorldPosition(new Vector3());

    targetPos.y = bbox.min.y + (bbox.max.y - bbox.min.y) * 0.5;

    if (this.isMapView) {
      state.position ??= camera.position.clone();

      state.rotation = targetPos;

      await this._applyState(state, transition);
    } else {
      const dist = Math.max(lookAtDistance(target, camera), 4.5);

      console.log("maxLookAtDistance", dist);

      // Hack for large objects like reflector/water
      // TODO: Fix this properly
      if (dist > 200) {
        await Promise.all([
          this.cameraControls.setTarget(
            TARGET.x,
            TARGET.y,
            TARGET.z,
            transition,
          ),
          this.cameraControls.dollyTo(USER_HEIGHT, transition),
        ]);

        return;
      }

      const isVisible = isInFrustum(bbox, camera);

      let position;

      if (frontDir) {
        const dir = target.getWorldDirection(new Vector3());

        if (Math.abs(dir.dot(UP_VECTOR)) < 0.9) {
          //
          position = targetPos.clone().add(dir.multiplyScalar(dist));
        }
      }

      if (position == null) {
        // position = camera.position
        //     .clone()
        //     .sub(targetPos)
        //     .normalize()
        //     .multiplyScalar(dist)
        //     .add(targetPos)
        //     .setY(targetPos.y);

        const cameraZ = this.getBestFitCameraZ(bbox);

        console.log("cameraZ", cameraZ);
        // set the far plane of the camera so that it easily encompasses the whole object

        if (isVisible) {
          position = camera.position
            .clone()
            .sub(targetPos)
            .setY(targetPos.y)
            .normalize()
            .multiplyScalar(cameraZ)
            .add(targetPos)
            .setY((bbox.min.y + bbox.max.y) * 0.5 + 1);
        } else {
          //
          // transition = false;

          position = new Vector3(0, 0, 1)
            .multiplyScalar(cameraZ)
            .add(targetPos)
            .setY((bbox.min.y + bbox.max.y) * 0.5 + 1);
        }
      }

      state.position = position;

      state.rotation = getEulerFromLookat(position, targetPos);

      await this._applyState(state, transition);
    }
  }

  getBestFitCameraZ(bbox: THREE.Box3) {
    const camera = this.opts.camera;

    const size = bbox.getSize(new Vector3());
    const fov = (camera.fov - 20) * (Math.PI / 180);
    const fovh = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect);
    let dx = size.z / 2 + Math.abs(size.x / 2 / Math.tan(fovh / 2));
    let dy = size.z / 2 + Math.abs(size.y / 2 / Math.tan(fov / 2));
    let cameraZ = Math.max(dx, dy) + 4;

    return cameraZ;
  }

  goto(position: Vector3, rotationOrDir?: Euler | Vector3) {
    const camera = this.cameraControls.camera;

    camera.position.copy(position);

    if (rotationOrDir instanceof Euler) {
      camera.rotation.copy(rotationOrDir);
    } else if (rotationOrDir instanceof Vector3) {
      camera.lookAt(rotationOrDir);
    }

    this.setCoords(camera.position, camera.rotation);
  }

  handleKeyDown = (event) => {
    if (event.ctrlKey || event.metaKey) return;

    emitter.emit(Events.CAMERA_CONTROLS_START, event);

    if (event.source === "joystick") {
      this.keyStates["KeyW"] = false;
      this.keyStates["KeyS"] = false;
      this.keyStates["KeyA"] = false;
      this.keyStates["KeyD"] = false;

      if (event.code) {
        this.keyStates[event.code] = true;
      }

      return;
    }

    this.keyStates[event.code] = true;
    // console.log("edit/keydown", this.keyStates, event.code)
  };

  handleKeyUp = (event) => {
    if (event.ctrlKey || event.metaKey) return;

    this.keyStates[event.code] = false;
    // console.log("edit/keyup", this.keyStates, event.code)
  };

  reset = () => {
    this.keyStates = {};
  };

  controls(delta) {
    if (this.keyStates["KeyW"] || this.keyStates["ArrowUp"]) {
      this.moveForward(delta);
    }

    if (this.keyStates["KeyS"] || this.keyStates["ArrowDown"]) {
      this.moveBackward(delta);
    }

    if (this.keyStates["KeyA"] || this.keyStates["ArrowLeft"]) {
      this.moveLeft(delta);
    }

    if (this.keyStates["KeyD"] || this.keyStates["ArrowRight"]) {
      this.moveRight(delta);
    }

    if (this.keyStates["Space"]) {
      this.moveUp(delta);
    }

    if (this.keyStates["KeyB"]) {
      this.moveDown(delta);
    }
  }

  update = (delta) => {
    //
    this.controls(delta);

    // this.setCoords(this.cameraControls.camera.position, this.cameraControls.camera.rotation, false);

    this.cameraControls.camera.getWorldDirection(this.tmpLookat);

    this.cameraControls.update(delta);
  };

  touchStart = (e) => {
    if (!IS_MOBILE) return;

    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
    }

    // if double click go down
    if (Date.now() - this.prevClickTime < 300) {
      this.touchTimeout = setTimeout(() => {
        this.keyStates["KeyB"] = true;
      }, 300);

      return;
    }

    this.prevClickTime = Date.now();

    this.touchTimeout = setTimeout(() => {
      this.keyStates["Space"] = true;
    }, 300);
  };

  touchEnd = (e) => {
    if (!IS_MOBILE) return;

    // clear everything
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
    }

    this.keyStates["Space"] = false;
    this.keyStates["KeyB"] = false;
  };

  mouseDown = (e) => {
    this.touchStart(e);
  };

  mouseMove = (e) => {
    this.touchEnd(e);

    this.isDragging = true;
  };

  mouseDownEvent = null;

  mouseUp = (e) => {
    if (!this.mouseDownEvent) return;

    this.touchEnd(e);

    this.mouseDownEvent = null;

    if (this.isDragging) {
      this.isDragging = false;

      return;
    }

    if (this.point) {
      this.cameraControls.dollyTo(0.00001, true);

      this.cameraControls.moveTo(
        this.point.x,
        this.point.y + USER_HEIGHT,
        this.point.z,
        true,
      );
    }
  };

  get playerSpeed() {
    return (
      this._playerSpeed *
      (this.isMapView ? 10 : 1) *
      (this.keyStates["ShiftLeft"] ? 2 : 1)
    );
  }

  moveLeft = (delta) => {
    this.cameraControls.truck(-this.playerSpeed * delta, 0, false);
  };

  moveRight = (delta) => {
    this.cameraControls.truck(this.playerSpeed * delta, 0, false);
  };

  moveForward = (delta) => {
    this.cameraControls.forward(this.playerSpeed * delta, false);
  };

  moveBackward = (delta) => {
    this.cameraControls.forward(-this.playerSpeed * delta, false);
  };

  moveUp = (delta) => {
    this.cameraControls.truck(0, -this.playerSpeed * delta, false);
  };

  moveDown = (delta) => {
    this.cameraControls.truck(0, this.playerSpeed * delta, false);
  };

  rotateAzimuth(angle) {
    this.cameraControls.rotateAzimuthTo(angle, true);
  }

  dispose = () => {
    this.deactivate();
    this.point = null;
  };
}
