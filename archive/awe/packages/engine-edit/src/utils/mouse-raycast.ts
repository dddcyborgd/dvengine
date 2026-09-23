// @ts-check

import {
    Raycaster,
    Vector2,
    Matrix4,
    Vector3,
    PerspectiveCamera,
    Frustum,
    Box3,
    Mesh,
    Intersection,
    Object3D,
} from "three";

import emitter from "@oncyberio/engine/internal/engine-emitter";
import { EngineEvents } from "@oncyberio/engine/internal/engine-events";

import Camera from "@oncyberio/engine/camera";

import type { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { EngineEdit } from "..";
import { getOrCreateEditor } from "../editors/editor-registry";

export interface MouseRaycastCallbacks {
    //
    click?(e: MouseEvent, intersect: Intersection<Mesh>[]): void;

    dblClick?(e: MouseEvent, intersect: Intersection<Mesh>[]): void;

    mouseEnter?(e: MouseEvent, intersect: Intersection<Mesh>[]): void;

    mouseLeave?(e: MouseEvent, mesh: Mesh): void;

    mouseDown?(e: MouseEvent, intersect: Intersection<Mesh>[]): void;
}

const RAYCAST_LAYER = 20;

export class MouseRaycast {
    //
    RAYACST_LAYER = RAYCAST_LAYER;

    currentMesh: Mesh | null;

    raycaster = new Raycaster();

    mousevec = new Vector2(0, 0);

    components: Component3D[] = [];

    noMeshCb: MouseRaycastCallbacks = {};

    constructor() {
        //
        this.raycaster.layers.disableAll();

        this.raycaster.layers.enable(this.RAYACST_LAYER);

        if (process.env.NODE_ENV === "development") {
            window["$$rayc"] = this;
        }
    }

    registerNoComponent(callbacks: MouseRaycastCallbacks) {
        this.noMeshCb = callbacks;
    }

    register(component: Component3D, callbacks: MouseRaycastCallbacks) {
        //
        component.userData.raycastCallBacks = callbacks;

        this.components.push(component);

        this.toggleActive(component, true);

        // Also enable layer on selection mesh
        const mesh = getOrCreateEditor(component)?.getSelectionMesh();
        if (mesh) {
            mesh.layers.enable(this.RAYACST_LAYER);
        }
    }

    unregister(component: Component3D) {
        //
        component.userData.raycastCallBacks = null;

        this.components = this.components.filter((m) => m != component);

        // Disable layer on selection mesh
        const mesh = getOrCreateEditor(component)?.getSelectionMesh();
        if (mesh) {
            mesh.layers.disable(this.RAYACST_LAYER);
        }

        try {
            if (this.currentMesh.userData.component == component) {
                //
                this.currentMesh = null;
            }
        } catch (e) {}

        this.toggleActive(component, false);
    }

    toggleActive(component: Component3D, active?: boolean) {
        //
        if (active == null) {
            component.layers.toggle(this.RAYACST_LAYER);
        } else if (active === true) {
            component.layers.enable(this.RAYACST_LAYER);
        } else if (active === false) {
            component.layers.disable(this.RAYACST_LAYER);
        }
    }

    getCallbacks(component: Component3D) {
        //
        if (component == null) return this.noMeshCb;

        return component.userData.raycastCallBacks as MouseRaycastCallbacks;
    }

    getClickedMesh(intersects: Intersection[], index = 0) {
        //
        return intersects?.[index]?.object as Mesh;
    }

    getClickedComponent(intersects: Intersection[], index = 0) {
        //
        return this.getClickedMesh(intersects, index)?.userData
            .component as Component3D;
    }

    private _doRaycast(): Intersection<Mesh>[] {
        //
        this.raycaster.setFromCamera(this.mousevec, Camera.current);

        const intersects: Intersection[] = [];

        for (let i = 0, l = this.components.length; i < l; i++) {
            //
            const component = this.components[i];

            const mesh = getOrCreateEditor(component)?.getSelectionMesh();

            if (mesh != null) {
                //
                if (mesh.userData.component == null) {
                    //
                    mesh.userData.component = component;
                }

                mesh.raycast(this.raycaster, intersects);
            }

            this._raycastDetailMeshes(component, intersects);
        }

        intersects.sort(ascSort);

        // console.log("intersects", intersects);

        return intersects as Intersection<Mesh>[];
    }

    _raycastDetailMeshes(component: Component3D, intersects: Intersection[]) {
        //
        const detail = getOrCreateEditor(component)?.getDetailMeshes();

        if (detail != null) {
            //
            for (let j = 0; j < detail.length; j++) {
                //
                const childMesh = detail[j];

                if (
                    childMesh?.userData &&
                    childMesh?.userData?.component == null
                ) {
                    //
                    childMesh.userData.component = component;
                }

                if (childMesh) {
                    childMesh.raycast(this.raycaster, intersects);
                }
            }
        }
    }

    click = (e) => {
        //
        if (e.raw.button !== 0) return;

        this.mouse(e);

        const intersects = this._doRaycast();

        const currentMesh = this.getClickedMesh(intersects);

        const currentComponent = currentMesh?.userData.component;

        this.getCallbacks(currentComponent).click?.(e.raw, intersects);
    };

    /**
     * Schema to select children of a group
     *  - Single click is used to select the group
     *  - Double click is used to select child of a group
     */
    dblClick = (e) => {
        //
        this.mouse(e);

        const intersects = this._doRaycast();

        // if no other mesh is clicked, this is not a child of a group
        const currentMesh = this.getClickedMesh(intersects);

        const currentComponent = currentMesh?.userData.component;

        this.getCallbacks(currentComponent).dblClick?.(e.raw, intersects);
    };

    _isMouseDown = false;

    mouseDown = (e) => {
        //
        this._isMouseDown = true;

        this.mouse(e);

        const shouldLogIntersects =
            process.env.NODE_ENV === "development" &&
            window["__engineEditDebugRaycast"] === true;

        let intersects: Intersection<Mesh>[];

        if (shouldLogIntersects) {
            const startTime = performance.now();

            intersects = this._doRaycast();

            console.log("intersects", `${performance.now() - startTime}ms`, intersects);
        } else {
            intersects = this._doRaycast();
        }

        const currentComponent = this.getClickedComponent(intersects);

        this.getCallbacks(currentComponent).mouseDown?.(e.raw, intersects);
    };

    mouseUp = (e) => {
        this._isMouseDown = false;
    };

    mouseMove = (e) => {
        //
        if (this._isMouseDown) return;

        this.mouse(e);

        const intersects = this._doRaycast();

        const currentMesh = this.getClickedMesh(intersects);

        if (currentMesh == this.currentMesh) return;

        const prevMesh = this.currentMesh;

        const prevComponent = prevMesh?.userData.component;

        const currentComponent = currentMesh?.userData.component;

        this.currentMesh = currentMesh;

        // console.log("currentMesh", currentMesh, "prevMesh", prevMesh);

        this.getCallbacks(prevComponent).mouseLeave?.(e.raw, prevMesh);

        this.getCallbacks(currentComponent).mouseEnter?.(e.raw, intersects);
    };

    mouse(e) {
        if (!e.normalized) debugger;

        this.mousevec.x = e.normalized.x;

        this.mousevec.y = -e.normalized.y;
    }

    _selectionCamera = new PerspectiveCamera();

    _selectionFrustum = new Frustum();

    _frustumProjMatrix = new Matrix4();

    // _helper = new CameraHelper(this._selectionCamera)

    _bbox = new Box3();

    intersectScreenRect(view, fullView) {
        //
        this._selectionCamera.copy(Camera.current);

        this._selectionCamera.setViewOffset(
            fullView.width,
            fullView.height,
            view.left,
            view.top,
            view.width,
            view.height
        );

        this._selectionCamera.updateProjectionMatrix();

        // this._helper.update();

        this._frustumProjMatrix.multiplyMatrices(
            this._selectionCamera.projectionMatrix,
            this._selectionCamera.matrixWorldInverse
        );

        this._selectionFrustum.setFromProjectionMatrix(this._frustumProjMatrix);

        const selectionFrustum = this._selectionFrustum;

        var intersectedObjects: Component3D[] = [];

        for (var i = 0; i < this.components.length; i++) {
            //
            const component = this.components[i];

            if (!component.layers.test(this.raycaster.layers)) continue;

            const mesh = getOrCreateEditor(component)?.getSelectionMesh();

            if (mesh == null) continue;

            const geometry = mesh.geometry;

            if (geometry.boundingBox == null) {
                geometry.computeBoundingBox();
            }

            const box = this._bbox
                .copy(geometry.boundingBox)
                .applyMatrix4(mesh.matrixWorld);

            if (testFrustumBox(selectionFrustum, box, mesh)) {
                intersectedObjects.push(component);
            }
        }

        return intersectedObjects;
    }

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
        }
    }

    addEvents() {
        emitter.on(EngineEvents.CLICK, this.click);

        emitter.on(EngineEvents.DBL_CLICK, this.dblClick);

        emitter.on(EngineEvents.MOUSE_MOVE, this.mouseMove);

        emitter.on(EngineEvents.MOUSE_DOWN, this.mouseDown);

        emitter.on(EngineEvents.MOUSE_UP, this.mouseUp);
    }

    removeEvents() {
        emitter.off(EngineEvents.CLICK, this.click);

        emitter.off(EngineEvents.DBL_CLICK, this.dblClick);

        emitter.off(EngineEvents.MOUSE_MOVE, this.mouseMove);

        emitter.off(EngineEvents.MOUSE_DOWN, this.mouseDown);

        emitter.off(EngineEvents.MOUSE_UP, this.mouseUp);
    }

    dispose() {
        this.removeEvents();

        this.components = [];

        this.currentMesh = null;

        MouseRaycast._instance = null;
    }

    static _instance: MouseRaycast;

    static getInstance() {
        if (this._instance == null) {
            this._instance = new MouseRaycast();
        }

        return this._instance;
    }
}

const tempMatrix = new Matrix4();

const tmpVec3 = new Vector3();

const tmpBoxCorners = Array.from({ length: 8 }, () => new Vector3());

function getBox3Corners(box, corners) {
    corners[0].set(box.min.x, box.min.y, box.min.z);
    corners[1].set(box.min.x, box.min.y, box.max.z);
    corners[2].set(box.min.x, box.max.y, box.min.z);
    corners[3].set(box.min.x, box.max.y, box.max.z);
    corners[4].set(box.max.x, box.min.y, box.min.z);
    corners[5].set(box.max.x, box.min.y, box.max.z);
    corners[6].set(box.max.x, box.max.y, box.min.z);
    corners[7].set(box.max.x, box.max.y, box.max.z);

    return corners;
}

function testFrustumBox(frustum, box, obj) {
    //
    const boxCenter = box.getCenter(tmpVec3);

    // if(obj._bh == null) {

    //     obj._bh = new Mesh(new SphereGeometry(1), new MeshBasicMaterial({color: new Color(0xff0000), depthTest: false, transparent: true}))

    //     Scene.add(obj._bh)
    // }

    // obj._bh.position.copy(boxCenter)

    if (!frustum.containsPoint(boxCenter)) return false;

    const corners = getBox3Corners(box, tmpBoxCorners);

    // if (obj._bhs == null) {

    //     obj._bhs = corners.map(c => {

    //         const bh = new Mesh(new SphereGeometry(1), new MeshBasicMaterial({color: new Color(0x00ff00), depthTest: false, transparent: true}))

    //         bh.position.copy(c)

    //         Scene.add(bh)

    //         return bh
    //     })
    // }

    // frustum needs to contain at least one point of the box
    // prevent unwanted selection of large objects like terrain, water ...
    for (let j = 0; j < 8; j++) {
        if (frustum.containsPoint(corners[j])) {
            return true;
        }
    }

    return false;
}

// From three.js
// https://github.com/mrdoob/three.js/blob/master/src/core/Raycaster.js#L96C1-L122C2

function ascSort(a, b) {
    return a.distance - b.distance;
}

function intersect(object, raycaster, intersects, recursive) {
    //
    object.raycast(raycaster, intersects);

    if (recursive === true) {
        const children = object.children;

        for (let i = 0, l = children.length; i < l; i++) {
            intersect(children[i], raycaster, intersects, true);
        }
    }
}
