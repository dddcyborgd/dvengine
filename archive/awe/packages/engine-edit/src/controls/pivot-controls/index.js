// @ts-check

import * as Three from "three";
import Scene from "@oncyberio/engine/internal/scene";
import { IS_MOBILE } from "@oncyberio/engine/internal/constants";
import emitter from "@oncyberio/engine/internal/engine-emitter";
import Events from "../../editor-events";
import { BoxSlider } from "./box-slider";
import {
    Vector3,
    Matrix4,
    Box3,
    Group,
    Euler,
    Raycaster,
    Object3D,
    BufferGeometry,
    Plane,
    PlaneHelper,
    SphereGeometry,
    CircleGeometry,
    Mesh,
    MeshBasicMaterial,
    DoubleSide,
    Quaternion,
    Matrix3,
    Line,
    LineBasicMaterial,
    ArrowHelper,
    Material,
} from "three";

import { AxisArrow } from "./axis-arrow";
import { PlaneSlider } from "./plane-slider";
import { AxisRotator } from "./axis-rotator";
import { ControlsLabel } from "./label";
import { sRGBToLinear, xDir, yDir, zDir } from "./shared";
import { CursorHandler } from "../../cursor-handler";
import { CornerScaler } from "./corner-scaler";
import { getOrCreateEditor } from "../../editors/editor-registry";

// import Center from './temp/center'

import { ALT_MODE_COLORS, MODE_COLORS } from "./constants";
import { Snap2D } from "./snap-2d";
import { Snap3D } from "./snap-3d";

// @ts-ignore
if (process.env.NODE_ENV === "development") window.THREE = Three;

const mL0 = new Matrix4();
const mW0 = new Matrix4();
const mP = new Matrix4();
const mPInv = new Matrix4();
const mW = new Matrix4();
const mL = new Matrix4();
const mL0Inv = new Matrix4();
const mdL = new Matrix4();

const bb = new Box3();
const bbObj = new Box3();
const vCenter = new Vector3();
const vSize = new Vector3();
const vAnchorOffset = new Vector3();
const vPosition = new Vector3();

const tmpVec = new Vector3();
const tmpSnapWorldOffset = new Vector3();
const tmpSnapLocalOffset = new Vector3();

const X = 0;
const Y = 1;
const Z = 2;

const normalsByAxis = [
    new Vector3(0, 0, 1), // XY plane
    new Vector3(0, 0, 1), // XY plane
    new Vector3(1, 0, 0), // YZ plane
];

const unitsByAxis = [
    new Vector3(1, 0, 0), // X
    new Vector3(0, 1, 0), // Y
    new Vector3(0, 0, 1), // Z
];

const tmpWPosition = new Vector3();
const tmpWQuaternion = new Quaternion();
const tmpNormal = new Vector3();

const tmpNormalMatrix = new Matrix3();

const raycaster = new Raycaster();

/**
 *
 * @param {PointerEvent} event
 * @param {HTMLElement} domElement
 * @returns
 */
function getPointer(event, domElement) {
    if (domElement.ownerDocument.pointerLockElement) {
        return {
            x: 0,
            y: 0,
            button: event.button,
        };
    } else {
        const rect = domElement.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: (-(event.clientY - rect.top) / rect.height) * 2 + 1,
            button: event.button,
        };
    }
}

/**
 * @typedef {Object3D & { geometry: BufferGeometry }} Renderable
 */

/**
 * @param {Object3D} obj
 * @returns { obj is Renderable }
 */
function hasGeometry(obj) {
    // @ts-ignore
    return obj.geometry != null;
}

/**
 * @typedef { "world" | "local" } PivotSpace
 *
 * @typedef { { translate: boolean, rotate: boolean, scale: boolean, localSpace: boolean } } TransfomModes
 */

export class PivotControls extends Group {
    planeIntersect = new Vector3();

    positionStart = new Vector3();
    quaternionStart = new Quaternion();
    scaleStart = new Vector3();
    matrixStart = new Matrix4();
    matrixWorldStart = new Matrix4();

    worldPositionStart = new Vector3();
    worldQuaternionStart = new Quaternion();
    worldQuaternionStartInv = new Quaternion();
    worldScaleStart = new Vector3();

    pointStart = new Vector3();
    pointEnd = new Vector3();
    offset = new Vector3();

    parentPosition = new Vector3();
    parentQuaternion = new Quaternion();
    parentQuaternionInv = new Quaternion();
    parentScale = new Vector3();

    worldPosition = new Vector3();
    worldQuaternion = new Quaternion();
    worldQuaternionInv = new Quaternion();
    worldScale = new Vector3();
    worldDirection = new Vector3();

    cameraPosition = new Vector3();
    cameraQuaternion = new Quaternion();
    cameraScale = new Vector3();

    objects = [];

    eye = new Vector3();

    constructor(opts) {
        super();

        // @ts-ignore
        window.$pc = this;

        this.opts = {
            autoTransform: true,
            disableAxes: false,
            disableSliders: false,
            disableRotations: false,
            activeAxes: [true, true, true],
            anchor: new Vector3(0, 0, 1),
            offset: new Vector3(0, 0, 0),
            rotation: new Euler(0, 0, 0),

            //styling
            axisLineWidth: 7,
            lineWidth: 5,
            axisColors: [MODE_COLORS.X, MODE_COLORS.Y, MODE_COLORS.Z],
            lockedStyle: {
                color: sRGBToLinear(0x808080),
                opacity: 0.5,
            },
            // hoveredColor: sRGBToLinear(0xffff40),
            hoveredColor: [
                ALT_MODE_COLORS.X,
                ALT_MODE_COLORS.Y,
                ALT_MODE_COLORS.Z,
            ],
            lineHelperColor: sRGBToLinear(0xdedede),
            angleHelperColor: sRGBToLinear(0xff0000),

            rotationLimits: {
                min: -90,
                max: 90,
            },
            ...opts,
        };

        /** @type { Three.Camera } */
        this.camera = opts.camera;

        this.isYRotOnly = false;

        this.name = "PivotControls";

        this.root = new Group();
        this.root.name = "PivotControlsRoot";

        this.gizmo = new Group();
        this.gizmo.name = "PivotControlsGizmos";

        this.add(this.root);

        this.root.add(this.gizmo);

        this.raycastMeshes = [];

        const handleOpts = {
            ...this.opts,
            ctx: this,
            onDragStart: this.onDragStart.bind(this),
            onDrag: this.onDrag.bind(this),
            onDragEnd: this.onDragEnd.bind(this),
        };

        this.axisArrows = [xDir, yDir, zDir].map((direction, axis) => {
            return new AxisArrow({
                ...handleOpts,
                axis,
                direction,
                normal: normalsByAxis[axis],
            });
        });

        this.cornerScalers = Array.from({ length: 8 }, (_, i) => {
            //
            return new CornerScaler({
                ...handleOpts,
                cornerIndex: i,
            });
        });

        this.snap2D = new Snap2D();
        this.add(this.snap2D);

        this.snap3D = new Snap3D();
        this.translationSnap = 0.2;
        this.snap3D.maxGap = this.translationSnap;
        this.snapFeedbackDuration = 140;
        this.snapFeedbackUntil = 0;
        this.snapFeedbackHandle = null;

        // center

        // this.center = new Center()

        // this.gizmo.add( this.center )

        // this.planeSliders = [[yDir, zDir], [zDir, xDir], [xDir, yDir]].map(([dir1, dir2], axis) => {

        //     return new PlaneSlider({
        //         ...handleOpts,
        //         axis,
        //         dir1,
        //         dir2,
        //         normal: unitsByAxis[axis]

        //     })
        // })

        this.axisRotators = [
            [yDir, zDir, "X"],
            [zDir, xDir, "Y"],
            [xDir, yDir, "Z"],
        ].map(([dir1, dir2, stringAxis], axis) => {
            return new AxisRotator({
                ...handleOpts,
                axis,
                dir1,
                dir2,
                normal: unitsByAxis[axis],
                stringAxis,
            });
        });

        this.boxSlider = new BoxSlider(handleOpts);

        Scene.add(this.boxSlider);

        /** @type { import('./shared').Handle[] } */
        this.handles = [];

        /** @type { Object3D } */
        this.object = null;

        /** @type { import('./shared').Handle } */
        this.currentHandle = null;

        this.visible = false;

        /** @type { HTMLElement } */
        this.domElement = this.opts.domElement;

        this.domElement.style.touchAction = "none";

        this.addGizmos();
        this.activeRaycastMeshes = this.raycastMeshes;

        //Cthis.handlePlane = new Plane();

        // this.planeHelper = new PlaneHelper(this.handlePlane, 100)
        // if(!Array.isArray(this.planeHelper.material)) {
        //     //this.planeHelper.material.depthTest = false
        //     this.planeHelper.material.side = DoubleSide
        // }

        this.label = new ControlsLabel();
        this.label.visible = false;

        this.label.init().then(() => {
            this.gizmo.add(this.label);
            // this.add(this.label);
        });

        // this.hitHelper = new Mesh(
        //     new SphereGeometry(0.05, 10, 10),
        //     new MeshBasicMaterial({
        //         side: DoubleSide,
        //         color: 0xff0000,
        //         depthTest: false
        //     })
        // )
        // this.hitHelper.renderOrder = 2000

        this.enabledModes = {
            translate: true,
            rotate: true,
            scale: true,
            localSpace: true,
        };
    }

    attachLabel(mesh) {
        this.label.attachTo(mesh);
    }

    setLabelText(txt) {
        this.label.set(txt);

        this.label.visible = true;
    }

    clearLabel() {
        this.label.mesh = null;

        this.label.visible = false;
    }

    planeHelper = null;

    getPlane() {
        if (this.currentHandle == null) return null;

        this.raycastPlane = this.currentHandle.getRaycastPlane();

        // if (this.planeHelper) {
        //     this.planeHelper.dispose();

        //     this.remove(this.planeHelper);
        // }

        // this.planeHelper = new PlaneHelper(this.raycastPlane, 100);

        // this.add(this.planeHelper);

        return this.raycastPlane;
    }

    addEvents() {
        if (this.enabled) return;

        this.enabled = true;

        this.domElement.addEventListener("pointerdown", this.onPointerDown);

        if (!IS_MOBILE) {
            this.domElement.addEventListener(
                "pointermove",
                this.onPointerHover
            );
        }

        this.domElement.addEventListener("pointerup", this.onPointerUp);

        this.domElement.addEventListener("keydown", this.onKeyDown);

        emitter.on(Events.LATE_UPDATE, this.update);
    }

    update = (force) => {
        if (this.object == null || this.object.parent == null) return;

        this.object.updateMatrixWorld();

        this.object.parent.matrixWorld.decompose(
            this.parentPosition,
            this.parentQuaternion,
            this.parentScale
        );

        this.object.matrixWorld.decompose(
            this.worldPosition,
            this.worldQuaternion,
            this.worldScale
        );

        this.object.getWorldDirection(this.worldDirection);

        this.parentQuaternionInv.copy(this.parentQuaternion).invert();

        this.worldQuaternionInv.copy(this.worldQuaternion).invert();

        this.camera.updateMatrixWorld();

        this.camera.matrixWorld.decompose(
            this.cameraPosition,
            this.cameraQuaternion,
            this.cameraScale
        );

        this.eye.copy(this.cameraPosition).sub(this.worldPosition).normalize();

        this.root.position.copy(this.worldPosition);

        this.root.quaternion.copy(this.worldQuaternion);

        this.updateScale();

        this.updateMatrixWorld(force);

        // this.center.position.copy(this.gizmo.position);
        // this.center.quaternion.copy(Camera.current.quaternion);
    };

    removeEvents() {
        if (!this.enabled) return;

        this.enabled = false;

        this.domElement.removeEventListener("pointerdown", this.onPointerDown);
        this.domElement.removeEventListener("pointermove", this.onPointerHover);
        this.domElement.removeEventListener("pointerup", this.onPointerUp);
        this.domElement.removeEventListener("keydown", this.onKeyDown);

        emitter.off(Events.LATE_UPDATE, this.update);
    }

    setTranslationSnap(nb) {
        this.translationSnap = nb;
        this.snap3D.maxGap = nb ?? 0;
    }

    setScaleSnap(n) {}

    setRotationSnap(snap) {
        this.rotationSnap = snap;
    }

    _translateAxes = [true, true, true];

    _rotateAxes = [true, true, true];

    /**
     * @type { TransfomModes }
     */
    _enabledModes = {
        translate: true,
        rotate: true,
        scale: true,
        localSpace: true,
    };

    /**
     * @param { TransfomModes } modes
     */
    set enabledModes(modes) {
        this._enabledModes = modes;

        this._updateGizmosStates();

        if (this._enabledModes.localSpace) {
            this.setSpace("local");
        } else {
            this.setSpace("world");
        }
    }

    get enabledModes() {
        return this._enabledModes;
    }

    _updateGizmosStates() {
        // console.log('update gizmos states',  object.editor?)

        // this.objects.forEach((object) => {

        //     // console.log('yo ')

        //     // object.editor?.showSelected(false)
        //     // object.editor?.toggleHighlighted(false)
        // })

        //
        const enableTranslate = this._enabledModes.translate && !this.locked;

        const enableRotate = this._enabledModes.rotate && !this.locked;

        const hoveringScale = this.currentHoverHandle instanceof CornerScaler;

        const hoveringAxisRotation =
            this.currentHoverHandle instanceof AxisRotator;

        const hoveringAxisArrow = this.currentHoverHandle instanceof AxisArrow;

        this.axisArrows.forEach((it, i) => {
            //
            it.raycastMesh.userData._enabled = enableTranslate;

            it.active =
                !hoveringScale &&
                !hoveringAxisRotation &&
                enableTranslate &&
                this._translateAxes[i];

            it.visible =
                !hoveringScale &&
                !hoveringAxisRotation &&
                enableTranslate &&
                this._translateAxes[i];
        });

        this.axisRotators.forEach((it) => {
            //
            it.raycastMesh.userData._enabled = enableRotate;

            it.active =
                !hoveringScale &&
                !hoveringAxisArrow &&
                enableRotate &&
                this._rotateAxes[it.opts.axis];

            it.visible =
                !hoveringScale &&
                !hoveringAxisArrow &&
                enableRotate &&
                this._rotateAxes[it.opts.axis];

            // it.rotatorArrow.visible = enableTranslate == false && enableRotate
        });

        this.cornerScalers.forEach((it) => {
            //
            // it.active = this._enabledModes.scale;
            // @ts-ignore
            const dataScale = this.object?.data?.scale;

            it.raycastMesh.userData._enabled = this._enabledModes.scale;

            it.visible =
                this._enabledModes.scale &&
                dataScale?.x != null &&
                dataScale?.y != null &&
                dataScale?.z != null &&
                it.canShow();

            it.visible =
                it.visible &&
                !hoveringAxisRotation &&
                !hoveringAxisArrow &&
                enableTranslate;
        });

        this.boxSlider.raycastMesh.userData._enabled = enableTranslate;

        this.boxSlider.active = enableTranslate;

        this.activeRaycastMeshes = this.raycastMeshes.filter((it) => {
            return it.userData._enabled;
        });
    }

    addGizmos() {
        this.raycastMeshes = [];

        this.handles = [];

        this.axisArrows.forEach((it, i) => {
            this.gizmo.add(it);

            this.raycastMeshes.push(it.raycastMesh);

            this.handles.push(it);
        });

        // this.planeSliders.forEach(it => {

        //     this.gizmo.add(it)

        //     this.raycastMeshes.push(it.raycastMesh)

        //     this.handles.push(it)
        // })

        this.axisRotators.forEach((it) => {
            this.gizmo.add(it);

            this.raycastMeshes.push(it.raycastMesh);

            this.handles.push(it);
        });

        this.cornerScalers.forEach((it) => {
            //
            Scene.add(it);

            it.visible = false;

            this.raycastMeshes.push(it.raycastMesh);

            this.handles.push(it);
        });

        // center

        // this.raycastMeshes.push(this.center.raycastMesh);

        // debugger;
    }

    /**
     *
     * @param { import("./shared").PivotSpace } space
     */
    setSpace = (space) => {
        this.space = space;
    };

    is2D(object) {
        //
        return object?.info?.is2D;
    }

    /**
     * @param { Object3D } object
     * @param {{ snap3D: boolean, lockRotY?: boolean }} [opts]
     *
     */
    attach(object, opts) {
        //
        this.object = object;
        this.addEvents();
        this.visible = true;

        if (opts?.snap3D) {
            this.boxSlider.setObject(object);
        }

        if (this.is2D(object)) {
            this.snap2D.setObject(object);
        }

        this.snap3D.setObject(object);

        // @ts-ignore
        this.isYRotOnly = opts?.lockRotY;

        if (this.isYRotOnly) {
            // const [ x, y, z ] = this.axisRotators;

            // x.visible = false;
            // z.visible = false;

            this._rotateAxes = [false, true, false];
        } else {
            this._rotateAxes = [true, true, true];
        }

        this.cornerScalers.forEach((it) => {
            //
            it.onAttach(object);
        });

        this._updateGizmosStates();

        this.updateMatrixWorld(true);

        return this;
    }

    detach() {
        this.boxSlider.setObject(null);
        this.snap2D.setObject(null);
        this.snap3D.setObject(null);

        this.object = null;
        this.removeEvents();
        this.visible = false;

        this.cornerScalers.forEach((it) => {
            it.visible = false;
            it.onDetach();
        });

        return;
    }

    updateScale() {
        /** @type {any} */
        const camera = this.camera;
        let factor =
            this.worldPosition.distanceTo(this.cameraPosition) *
            Math.min(
                (1.9 * Math.tan((Math.PI * camera.fov) / 360)) /
                    camera.zoom,
                7
            );

        this.gizmo.scale
            .set(1, 1, 1)
            .multiplyScalar(Math.max((factor * 1) / 8, 1));

        // this.label.scale.copy(this.gizmo.scale);
    }

    updateBBox() {
        if (this.object == null || !this.opts.anchor) return;

        mPInv.copy(this.object.matrixWorld).invert();

        bb.makeEmpty();

        this.object.traverse((obj) => {
            if (!hasGeometry(obj)) return;

            if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();

            mL.copy(obj.matrixWorld).premultiply(mPInv);

            bbObj.copy(obj.geometry.boundingBox);

            bbObj.applyMatrix4(mL);

            bb.union(bbObj);
        });

        vCenter.copy(bb.max).add(bb.min).multiplyScalar(0.5);

        vSize.copy(bb.max).sub(bb.min).multiplyScalar(0.5);

        vAnchorOffset.copy(vSize).multiply(this.opts.anchor).add(vCenter);

        vPosition.copy(this.opts.offset).add(vAnchorOffset);

        this.gizmo.position.copy(vPosition);
    }

    /**
     * @param { Vector3 } dir
     */
    turnAxisToEye(dir) {
        if (!this.dragging && !dir.equals(yDir) && this.eye.dot(dir) < 0) {
            dir.negate();
        }
    }

    _isDragging = false;

    get dragging() {
        return this._isDragging;
    }

    /**
     * @param { boolean } value
     */
    set dragging(value) {
        let oldValue = this._isDragging;
        this._isDragging = value;
        if (oldValue !== value) {
            //
            this.dispatchEvent({
                // @ts-ignore
                type: "dragging-changed",
                value,
            });

            if (value) {
                // @ts-ignore
                this.object.dragStart?.();
            } else {
                // @ts-ignore
                this.object.dragEnd?.();
            }
        }
    }

    updateCursor() {
        const cursor = this.getCursor();

        CursorHandler.instance.setCursor(
            CursorHandler.source.TRANSFORMER,
            cursor
        );
    }

    getCursor() {
        if (this.currentHandle == null || this.object == null) return null;

        // if (this.locked) return "not-allowed";

        return this.currentHandle.getCursor?.() || "default";
    }

    onDragStart() {
        mL0.copy(this.root.matrix);

        mW0.copy(this.root.matrixWorld);

        this.opts.onDragStart?.();
    }

    /**
     *
     * @param { Matrix4 } mdW
     */
    onDrag(mdW) {
        mP.copy(this.object.parent.matrixWorld);

        mPInv.copy(mP).invert();

        // After applying the delta
        mW.copy(mW0).premultiply(mdW);

        mL.copy(mW).premultiply(mPInv);

        // mL0Inv.copy(mL0).invert()

        // mdL.copy(mL).multiply(mL0Inv)

        if (this.opts.autoTransform) {
            //this.matrix.copy(mL)

            mL.decompose(this.object.position, this.object.quaternion, tmpVec);
        }

        // this.opts.onDrag?.(mL, mdL, mW, mdW)
    }

    onDragEnd() {
        this.opts.onDragEnd?.();
    }

    applyWorldTranslationOffset(offset) {
        if (offset == null || offset.lengthSq() === 0) return false;

        tmpSnapLocalOffset
            .copy(offset)
            .applyQuaternion(this.parentQuaternionInv)
            .divide(this.parentScale);

        this.object.position.add(tmpSnapLocalOffset);
        this.object.updateMatrixWorld();

        return true;
    }

    showSnapFeedback(handle = this.currentHandle) {
        this.snapFeedbackHandle = handle;
        this.snapFeedbackUntil = performance.now() + this.snapFeedbackDuration;
    }

    isSnapFeedbackActive(handle = this.currentHandle) {
        return (
            this.snapFeedbackHandle === handle &&
            performance.now() < this.snapFeedbackUntil
        );
    }

    isTranslationSnapEnabled(event) {
        return !event?.altKey;
    }

    clearSnapFeedback() {
        this.snapFeedbackUntil = 0;
        this.snapFeedbackHandle = null;
    }

    snapTranslateOnWorldAxes(
        axes,
        handle = this.currentHandle,
        planeNormal = null
    ) {
        if (!this.translationSnap) return false;

        const offset = this.snap3D.getWorldAxesSnapOffset(
            axes,
            tmpSnapWorldOffset
        );

        if (planeNormal != null && planeNormal.lengthSq() > 0) {
            offset.projectOnPlane(planeNormal);
        }

        const snapped = this.applyWorldTranslationOffset(offset);

        if (snapped) {
            this.showSnapFeedback(handle);
        }

        return snapped;
    }

    snapTranslateAlongWorldDirection(direction, handle = this.currentHandle) {
        if (!this.translationSnap) return false;

        const offset = this.snap3D.getWorldDirectionSnapOffset(
            direction,
            tmpSnapWorldOffset
        );

        const snapped = this.applyWorldTranslationOffset(offset);

        if (snapped) {
            this.showSnapFeedback(handle);
        }

        return snapped;
    }

    /**
     * @param {PointerEvent} event
     */
    hitTestHandle(event) {
        let point = getPointer(event, this.domElement);

        // @ts-ignore
        raycaster.setFromCamera(point, this.camera);

        let result = raycaster.intersectObjects(
            this.activeRaycastMeshes,
            false
        );

        if (!result?.length && this.boxSlider.raycastMesh) {
            result = raycaster.intersectObjects(
                [this.boxSlider.raycastMesh],
                false
            );
        }

        return result;
    }

    /**
     * @param {PointerEvent} event
     */
    hitTestPlane(event) {
        let point = getPointer(event, this.domElement);

        // console.log("intersect", event.clientX, event.clientY, point)

        // @ts-ignore
        raycaster.setFromCamera(point, this.camera);

        const plane = this.getPlane();

        if (plane == null) return;

        this.cornerScalers.forEach((it) => {
            if (this.currentHandle == it) {
                //
                // if the scaler is on the plane, change color
                if (plane.distanceToPoint(it.position) < 0.001) {
                    it.setHovered(true);
                }
            }
        });

        /** @type {Vector3} */
        let intersect;

        intersect = raycaster.ray.intersectPlane(plane, this.planeIntersect);

        // if(intersect) {

        //     this.hitHelper.position.copy(intersect)

        //     this.hitHelper.visible = true
        // }
        // else {

        //     this.hitHelper.visible = false
        // }

        return intersect;
    }

    _locked = false;

    get locked() {
        return this._locked;
    }

    set locked(val) {
        this._locked = val;
        this._updateGizmosStates();
        // this.axisArrows.forEach((it) => it.setLocked(val));
        // this.axisRotators.forEach((it) => it.setLocked(val));
    }

    /**
     *
     * @param { PointerEvent } event
     */
    onPointerHover = (event) => {
        if (!this.enabled || this.object == null || this.dragging) return;

        if (this.currentHandle instanceof AxisRotator) {
            this.object.matrixWorld.decompose(
                this.worldPositionStart,
                this.worldQuaternionStart,
                this.worldScaleStart
            );
        }

        const intersects = this.hitTestHandle(event);

        const hoverHit = intersects[0] ?? null;

        let handle = hoverHit
            ? this.getHandleFromIntersect(hoverHit)
            : null;

        if (handle != null && hoverHit != null) {
            this.hitPoint = hoverHit.point;

            if (!(handle instanceof BoxSlider)) {
                this.objects.forEach((object) => {
                    getOrCreateEditor(object)?.showSelected(false);
                    getOrCreateEditor(object)?.toggleHighlighted(false);
                });
            } else {
                this.objects.forEach((object) => {
                    getOrCreateEditor(object)?.showSelected(true);
                    getOrCreateEditor(object)?.toggleHighlighted(true);

                    getOrCreateEditor(object)?.computeLineDistances();
                });
            }
        } else {
            this.objects.forEach((object) => {
                getOrCreateEditor(object)?.showSelected(true);
                getOrCreateEditor(object)?.toggleHighlighted(true);

                getOrCreateEditor(object)?.computeLineDistances();
            });
        }

        this.currentHandleIntersect = handle != null ? hoverHit : null;

        const prevHandle = this.currentHandle;

        if (handle !== prevHandle) {
            this.currentHandle?.onPointerOut();

            this.currentHandle = handle;
        }

        if (
            handle != null &&
            (handle !== prevHandle || handle instanceof BoxSlider)
        ) {
            handle.onPointerMove({
                intersect: hoverHit?.point,
                hit: hoverHit,
                ray: raycaster.ray,
                raw: event,
            });
        }

        this.updateCursor();

        this.currentHoverHandle = handle;

        this._updateGizmosStates();
    };

    _isPointerDown = false;

    /**
     *
     * @param { PointerEvent } event
     */
    onPointerDown = (event) => {
        if (
            !this.enabled ||
            // this.locked ||
            this.object == null ||
            event.button !== 0
        )
            return;

        if (IS_MOBILE) {
            this.onPointerHover(event);
        }

        if (this.currentHandle == null) return;

        this._isPointerDown = true;

        const isPlaneSlide = this.currentHandle instanceof PlaneSlider;

        this.handles.forEach((it) => {
            it.visible = it === this.currentHandle;

            if (isPlaneSlide && it instanceof AxisArrow) {
                it.visible = it.opts.axis !== this.currentHandle.opts.axis;
            }
        });

        const intersect = this.hitTestPlane(event);

        if (intersect == null) return;

        event.stopPropagation();

        const cevent = {
            intersect,
            hit: this.currentHandleIntersect ?? null,
            ray: raycaster.ray,
            raw: event,
        };

        this.object.updateMatrixWorld();

        this.object.parent.updateMatrixWorld();

        this.matrixStart.copy(this.object.matrix);
        this.matrixWorldStart.copy(this.object.matrixWorld);
        this.positionStart.copy(this.object.position);
        this.quaternionStart.copy(this.object.quaternion);
        this.scaleStart.copy(this.object.scale);

        this.object.matrixWorld.decompose(
            this.worldPositionStart,
            this.worldQuaternionStart,
            this.worldScaleStart
        );

        this.worldQuaternionStartInv.copy(this.worldQuaternionStart).invert();

        this.pointStart.copy(intersect).sub(this.worldPositionStart);

        this.currentHandle.onPointerDown(cevent);

        this.domElement.addEventListener("pointermove", this.onPointerMove);

        this.domElement.setPointerCapture(event.pointerId);
    };

    /**
     *
     * @param { PointerEvent } event
     */
    onPointerMove = (event) => {
        if (!this.enabled || this.object == null) return;

        if (this._isPointerDown && !this.dragging) {
            //
            this.dragging = true;
        }

        if (!this.dragging) {
        } else {
            // console.log("pointer drag", this.currentHandle)

            event.stopPropagation();

            const intersect = this.hitTestPlane(event);

            // console.log("intersect", intersect)

            if (intersect == null) return;

            const cevent = {
                intersect,
                ray: raycaster.ray,
                raw: event,
            };

            this.pointEnd.copy(intersect).sub(this.worldPositionStart);

            this.offset.copy(this.pointEnd).sub(this.pointStart);

            this.currentHandle.onPointerMove(cevent);

            // @ts-ignore
            this.object.syncWithTransform?.(true);

            this.updateMatrixWorld(true);

            if (this.currentHandle instanceof CornerScaler) {
                this.objects.forEach((object) => {
                    getOrCreateEditor(object)?.computeLineDistances();
                });
            }

            this.dispatchEvent({
                // @ts-ignore
                type: "dragging",
            });
        }
    };

    /**
     *
     * @param { PointerEvent } event
     */
    onPointerUp = (event) => {
        //
        this._isPointerDown = false;

        if (!this.enabled || !this.dragging) return;

        //this.pointStartLine.visible = false
        //this.pointEndLine.visible = false

        // this.handles.forEach(it => {

        //     // @ts-ignore
        //     if (this.isYRotOnly) {

        //         if ( it.name === "AxisRotator-100" || it.name === "AxisRotator-001") {

        //             return it.visible = false
        //         }
        //     }

        //     it.visible = true
        // })

        this._updateGizmosStates();

        this.currentHandle?.onPointerUp();

        this.domElement.releasePointerCapture(event.pointerId);

        this.domElement.removeEventListener("pointermove", this.onPointerMove);

        this.dragging = false;
    };

    /**
     *
     * @param { KeyboardEvent } e
     */
    onKeyDown = (e) => {
        if (e.repeat) return;

        if (e.shiftKey && (e.key === "l" || e.key === "L")) {
            this.setSpace(this.space === "world" ? "local" : "world");
        }
    };

    /**
     *
     * @param {import('three').Intersection} intersect
     * @returns { import('./shared').Handle }
     */
    getHandleFromIntersect(intersect) {
        //
        let handle = intersect?.object.userData.handle;

        if (handle.active === false) return null;

        return handle;
    }

    dispose() {
        //
        this.detach();

        this.removeEvents();

        this.axisArrows.forEach((it) => it.dispose());

        this.axisRotators.forEach((it) => it.dispose());

        this.cornerScalers.forEach((it) => it.dispose());

        this.boxSlider.dispose();

        Scene.remove(this.boxSlider);

        this.label.dispose();
    }
}
