import Scene from "@oncyberio/engine/internal/scene";
import { PerspectiveControls } from "./perspective";
import { MapControls } from "../controls/map-controls";
import { NavMode } from "./types";
import { Camera } from "@oncyberio/engine/index";
import emitter from "@oncyberio/engine/internal/engine-emitter";
import Events from "../editor-events";
import type { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { getOrCreateEditor } from "../editors/editor-registry";
import { NavView } from "../types";
import { Object3D, PerspectiveCamera, Vector3 } from "three";
import { EngineEdit } from "..";

export class EditModeNavigation {
  perspectiveControls: PerspectiveControls;

  mapControls: MapControls;

  private _navMode: NavMode = { type: "perspective" };

  private _enabled = false;

  private _toggleMapAbort: AbortController = null;

  private _perspectiveSettings = {
    near: 0.1,
    far: 1000,
    fog: null,
  };

  private _mapSettings = {
    near: 1,
    far: 10000,
    fog: null,
  };

  constructor(public editor: EngineEdit) {
    //
    const cameraOffset = new Vector3(0, 0, 10);

    this.perspectiveControls = new PerspectiveControls({
      camera: Camera.current as PerspectiveCamera,
      cameraOffset,
    });

    (Camera.current as any)["controls"] = this.perspectiveControls;

    this.mapControls = new MapControls();
  }

  private _savePerspectiveSettings() {
    const camera = Camera.current as PerspectiveCamera;
    this._perspectiveSettings = {
      near: camera.near,
      far: camera.far,
      fog: Scene.fog,
    };
  }

  get currentControls() {
    return this._navMode.type === "perspective"
      ? this.perspectiveControls
      : this.mapControls;
  }

  get enabled() {
    return this._enabled;
  }

  set enabled(val) {
    if (val == this._enabled) return;

    this._enabled = val;

    if (val) {
      this.addEvents();
    } else {
      this.removeEvents();
    }
  }

  onMouseLockChanged = (event) => {
    if (event.isLocked) {
      this.currentControls.deactivate();
    } else {
      this.currentControls.activate();
    }
  };

  addEvents() {
    this.currentControls.activate();

    emitter.on(Events.MOUSE_LOCK_CHANGED, this.onMouseLockChanged);
  }

  removeEvents() {
    this.currentControls.deactivate();

    emitter.off(Events.MOUSE_LOCK_CHANGED, this.onMouseLockChanged);
  }

  setNavView(
    view: NavView,
    opts: {
      transition?: boolean;
      target?: Object3D;
      distance?: number;
      centerOfBounds?: boolean;
    } = {}
  ) {
    //
    return this.perspectiveControls.setNavView(view, opts);
  }

  async setNavMode(mode: NavMode) {
    //

    if (this._navMode.type === mode.type) return;

    this._toggleMapAbort?.abort();

    const abort = (this._toggleMapAbort = new AbortController());

    const camera = Camera.current;

    this._navMode = mode;

    if (mode.type == "map") {
      this._savePerspectiveSettings();

      this._applyModeSettings(this._mapSettings);

      await this.perspectiveControls.toggleMapView({ enabled: true }, true);

      if (abort.signal.aborted) return;

      this.mapControls.activate();

      this.perspectiveControls.deactivate();
    } else {
      this.mapControls.deactivate();

      this.perspectiveControls.setCoords(camera.position, camera.rotation);

      await this.perspectiveControls.toggleMapView({ enabled: false }, true);

      if (abort.signal.aborted) return;

      this._applyModeSettings(this._perspectiveSettings);

      this.perspectiveControls.activate();
    }
  }

  set map(val: boolean) {
    if (val) this.setNavMode({ type: "map" });
    else this.setNavMode({ type: "perspective" });
  }

  focusOn(object: Component3D, opts: { transition?: boolean } = {}) {
    //
    const mesh = getOrCreateEditor(object)?.getSelectionMesh();

    if (mesh == null) return;

    return this.perspectiveControls.focusOn({
      target: mesh,
      ...opts,
    });
  }

  _applyModeSettings(settings) {
    // console.trace("apply proj settings", settings)
    const camera = Camera.current as PerspectiveCamera;

    camera.far = settings.far;

    camera.near = settings.near;

    camera.updateProjectionMatrix();

    Scene.fog = settings.fog;
  }

  dispose() {
    this.enabled = false;

    this.perspectiveControls.dispose();

    this.mapControls.dispose();
  }
}
