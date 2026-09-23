import Scene from "@oncyberio/engine/internal/scene";
import { PivotControls } from "../controls/pivot-controls";
import { CANVAS } from "@oncyberio/engine/internal/constants";
import emitter from "@oncyberio/engine/internal/engine-emitter";
import Events from "../editor-events";
import { Camera } from "@oncyberio/engine/index";
import { TransformProxy } from "./transform-proxy";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { getOrCreateEditor } from "../editors/editor-registry";
import { Group, Object3D } from "three";
import { DragHandler } from "./drag-handler";
import { TransformModes } from "../types";
import { disposeThreeResources } from "@oncyberio/engine/internal/utils/dispose";

// samsy

import { Scene as THREEScene } from "three";

import { DisposePipelinesMeshes } from "@oncyberio/engine/internal/utils/dispose.js";

import Renderer from "@oncyberio/engine/internal/renderer";

export interface TransformCallbacks {
    onDragStart: () => void;
    onDragEnd: () => void;
    onDrag: () => void;
}

export class Transformer extends Group {
    //
    pivotControls: PivotControls;

    _enabledModes: TransformModes;

    // transformControls: TransformControls;

    postUIScene = new THREEScene();

    isLocked = false;

    attachedComponents = [];

    attachedObject: Object3D = null;
    attachedObjectCallbacks: TransformCallbacks = null;

    transformProxy = new TransformProxy();

    dragHandler = new DragHandler();

    constructor() {
        super();

        this.pivotControls = new PivotControls({
            camera: Camera.current,
            domElement: CANVAS,
        });

        this._enabledModes = {
            enableTranslate: true,
            enableRotate: true,
            enableScale: true,
            enableLocalSpace: true,
        };

        window["pc"] = this.pivotControls;

        this.pivotControls.rotationSnap = Math.PI / 18;

        this.postUIScene.add(this.pivotControls);

        this.add(this.transformProxy);

        // this.transformControls = new TransformControls(
        //     Camera.current,
        //     CANVAS,
        // )

        // Scene.add(this.transformControls);

        Scene.add(this);
    }

    isTransformable(component: Component3D) {
        return getOrCreateEditor(component)?.getSelectionMesh() != null;
    }

    canRotateComponent(c: Component3D) {
        return (c.data as any)?.rotation != null;
    }

    canTranslateComponent(c: Component3D) {
        return (c.data as any)?.position != null;
    }

    canTranslate() {
        return this.attachedComponents.every((c) =>
            this.canTranslateComponent(c)
        );
    }

    canRotate() {
        //
        return this.attachedComponents.every((c) => this.canRotateComponent(c));
    }

    _prevEnabledModes: TransformModes = null;

    attachObject(
        object: Object3D,
        opts: {
            callbacks: TransformCallbacks;
            translate?: boolean;
            rotate?: boolean;
            scale?: boolean;
            enableLocalSpace?: boolean;
        }
    ) {
        //
        this.detachAll();

        if (object == null) return;

        this.attachedObject = object;

        this.attachedObjectCallbacks = opts.callbacks;

        this.pivotControls.enabledModes = {
            translate: opts.translate ?? false,
            rotate: opts.rotate ?? false,
            scale: opts.scale ?? false,
            localSpace: opts.enableLocalSpace ?? false,
        };

        this.pivotControls.attach(object, { snap3D: false });
    }

    attachComponent(components: Component3D[]) {
        //
        if (this.attachedObject) {
            //
            this.detachObject();
        }

        this.attachedComponents = components.filter((c) =>
            this.isTransformable(c)
        );

        this.pivotControls.enabledModes = {
            translate: this.canTranslate() && this.enabledModes.enableTranslate,
            rotate: this.canRotate() && this.enabledModes.enableRotate,
            scale: this.enabledModes.enableScale,
            localSpace: this.enabledModes.enableLocalSpace,
        };

        this.pivotControls.objects = this.attachedComponents;

        this.dragHandler.objects = this.attachedComponents;

        if (this.attachedComponents.length > 1) {
            this.transformProxy.setAttachedObjects(
                this.attachedComponents,
                this.dragHandler
            );

            this.pivotControls.attach(this.transformProxy, {
                snap3D: false,
            });
        } else if (this.attachedComponents.length == 1) {
            //
            const object = this.attachedComponents[0];

            const snap3D = object.info.draggable;

            // TODO: add the transform constraints to info
            const lockRotY = object.data.type === "avatar";

            this.pivotControls.attach(object, { snap3D, lockRotY });
        }

        this.syncLockState();
    }

    detachAll() {
        //
        this.detachObject();

        this.attachedComponents = [];

        this.dragHandler.objects = [];

        this.transformProxy.detach();

        this.pivotControls.detach();

        this.syncLockState();
    }

    detachObject(object: Object3D = null) {
        //
        if (object != null && object !== this.attachedObject) return;

        this.attachedObjectCallbacks = null;

        this.attachedObject = null;

        this.pivotControls.detach();
    }

    syncLockState = () => {
        this.pivotControls.locked = this.attachedComponents.some(
            (c) => c.data.lock?.position || c.data.lock?.rotation
        );
    };

    onTransformDraggingChanged = (event) => {
        this.isLocked = !!event.value;

        emitter.emit(Events.MOUSE_LOCK_CHANGED, { isLocked: this.isLocked });

        if (this.attachedObject) {
            if (event.value) {
                this.attachedObjectCallbacks?.onDragStart();
            } else {
                this.attachedObjectCallbacks?.onDragEnd();
            }

            if (
                process.env.NODE_ENV === "development" &&
                window["__engineEditDebugTransforms"] === true
            ) {
                console.log("onTransformDraggingChanged/object", event.value);
            }

            return;
        }

        if (event.value) {
            this.dragHandler.dragStart();
        } else {
            this.dragHandler.dragEnd();
        }
    };

    onTransformDragging = () => {
        //
        if (this.attachedObject) {
            //
            this.attachedObjectCallbacks?.onDrag?.();
        }
    };

    onSelectionChanged = (event) => {
        //
        this.detachAll();

        if (event.selection.length) {
            this.attachComponent(event.selection);
        }

        emitter.emit(Events.TRANSFORM_TARGET_CHANGED, {
            targets: this.attachedComponents,
        });
    };

    onPostUpdate = (event) => {
        let autoClear = Renderer.autoClear;

        Renderer.autoClear = false;

        Renderer.clearDepth();

        Renderer.render(this.postUIScene, Camera.current);

        Renderer.autoClear = autoClear;
    };

    _enabled = false;

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

            this.pivotControls.detach();
        }
    }

    get enabledModes() {
        return this._enabledModes;
    }

    set enabledModes(val: TransformModes) {
        //
        this._enabledModes = val;

        if (this.attachedObject == null) {
            //
            this._syncEnabledModes();
        }

        emitter.emit(Events.TRANSFORM_MODE_CHANGED, { mode: val });
    }

    private _syncEnabledModes() {
        //
        const val = this._enabledModes;

        this.pivotControls.enabledModes = {
            translate: val.enableTranslate && this.canTranslate(),
            rotate: val.enableRotate && this.canRotate(),
            scale: true, //val.enableScale,
            localSpace: val.enableLocalSpace && this.canTranslate(),
        };
    }

    addEvents() {
        emitter.on(Events.POST_RENDER, this.onPostUpdate);
        //
        emitter.on(Events.SELECTION_CHANGED, this.onSelectionChanged);

        emitter.on(Events.COMPONENT_LOCK_CHANGED, this.syncLockState);

        this.pivotControls.addEventListener(
            "dragging-changed" as any,
            this.onTransformDraggingChanged
        );

        this.pivotControls.addEventListener(
            "dragging" as any,
            this.onTransformDragging
        );

        // this.transformControls.addEventListener("dragging-changed", this.onTransformDraggingChanged);
    }

    removeEvents() {
        emitter.off(Events.POST_RENDER, this.onPostUpdate);
        //
        emitter.off(Events.SELECTION_CHANGED, this.onSelectionChanged);

        emitter.off(Events.COMPONENT_LOCK_CHANGED, this.syncLockState);

        this.pivotControls.removeEventListener(
            "dragging" as any,
            this.onTransformDragging
        );

        // this.transformControls.removeEventListener("dragging-changed", this.onTransformDraggingChanged);
    }

    dispose() {
        this.detachAll();

        Scene.remove(this);

        this.removeEvents();

        this.pivotControls.dispose();

        this.transformProxy.enabled = false;

        DisposePipelinesMeshes(this.transformProxy);

        this.transformProxy.dispose();
    }
}
