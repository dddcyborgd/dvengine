// @ts-check

import {
    BoxGeometry,
    DoubleSide,
    Group,
    MeshBasicMaterial,
    Plane,
    PlaneGeometry,
    Vector3,
} from "three";
import { PivotControls } from ".";
import PipeLineMesh from "@oncyberio/engine/internal/pipeline/pipeline-mesh";
import { disposeObject3D } from "@oncyberio/engine/internal/utils/dispose";
import { asConst } from "@oncyberio/engine/internal/utils/js";

const tmpNormal = new Vector3();
const tmpBoxCenter = new Vector3();
const tmpBoxSize = new Vector3();
const tmpPlaneWorldNormal = new Vector3();
const tmpPlanePosition = new Vector3();

const zAxis = new Vector3(0, 0, 1);

const snap2DOpts = {
    dir: new Vector3(1, 1, 0),
    mode: asConst("translate"),
};

const axisAlignedPlaneNormals = [
    new Vector3(1, 0, 0),
    new Vector3(0, 1, 0),
    new Vector3(0, 0, 1),
];

const snapAxesByPlane = [
    [false, true, true],
    [true, false, true],
    [true, true, false],
];

const planeSizeAxes = [
    [2, 1],
    [0, 2],
    [0, 1],
];

export class BoxSlider extends Group {
    constructor(opts) {
        super();

        this.opts = opts;

        /** @type { PivotControls } */
        this.ctx = this.opts.ctx;

        this.isHovered = false;

        this.geometry = new BoxGeometry(1, 1, 1);

        this.raycastMesh = new PipeLineMesh(
            this.geometry,
            new MeshBasicMaterial({
                transparent: true,
                opacity: 0.035,
                color: 0xffffff,
                depthTest: false,
            }),
            {
                visibleOnDiffuse: true,
                visibleOnOcclusion: false,
                visibleOnMirror: false,
            }
        );

        this.eyePlane = new Plane();
        this.dragPlane = new Plane();
        this.dragPlaneActive = false;

        this.raycastMesh.name = "boxSlider";

        this.raycastMesh.userData.handle = this;

        this.add(this.raycastMesh);

        this.planeHighlight = new PipeLineMesh(
            new PlaneGeometry(1, 1),
            new MeshBasicMaterial({
                color: 0xf0f0f0,
                transparent: true,
                opacity: 0.22,
                side: DoubleSide,
                depthTest: false,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -10,
                polygonOffsetUnits: -10,
            }),
            {
                visibleOnOcclusion: false,
                visibleOnMirror: false,
            }
        );
        this.planeHighlight.renderOrder = 2;
        this.planeHighlight.visible = false;

        this.add(this.planeHighlight);

        this.enabled = false;

        this.visible = false;

        this.active = false;

        this.dragPlaneNormal = new Vector3();
        this.dragPlaneLocalNormal = new Vector3();
        this.dragPlaneAxis = 2;
        this.dragSnapAxis = 2;
        this.hoveredPlaneAxis = null;
        this.hoveredPlaneDirection = 1;
        this.hoveredPlaneLocalNormal = new Vector3();

        /** @type { { clickPoint: Vector3, dir: Vector3  } } */
        this.clickInfo = null;
    }

    setObject(object) {
        //
        this.mesh = object?.getCollisionMesh?.();

        if (this.mesh == null) {
            this.enabled = false;

            this.visible = false;

            this.active = false;

            this.dragPlaneActive = false;
            this.clearHoveredPlane();

            return;
        }

        this.raycastMesh.geometry.dispose();

        if (this.mesh.geometry instanceof BoxGeometry) {
            this.raycastMesh.geometry = this.mesh.geometry.clone();
        } else {
            this.mesh.geometry.computeBoundingBox();

            const box = this.mesh.geometry.boundingBox;

            const boxGeo = new BoxGeometry(
                box.max.x - box.min.x,
                box.max.y - box.min.y,
                box.max.z - box.min.z
            );

            boxGeo.translate(
                (box.max.x + box.min.x) / 2,
                (box.max.y + box.min.y) / 2,
                (box.max.z + box.min.z) / 2
            );

            this.raycastMesh.geometry = boxGeo;
        }

        this.raycastMesh.geometry.computeBoundingBox();

        this.enabled = true;

        this.visible = true;

        this.active = true;

        this.syncCoords();
    }

    syncCoords = () => {
        this.mesh?.updateWorldMatrix(true, false);

        this.mesh?.matrixWorld.decompose(
            this.position,
            this.quaternion,
            this.scale
        );
    };

    setHovered(isHovered) {
        this.isHovered = isHovered;

        if (!isHovered && !this.dragPlaneActive) {
            this.clearHoveredPlane();
        } else {
            this.updatePlaneHighlight();
        }

        this.updateStyle();
    }

    updateStyle() {
        const hasSnapFeedback = this.ctx.isSnapFeedbackActive(this);

        this.raycastMesh.material.opacity = hasSnapFeedback
            ? 0.18
            : this.isHovered
            ? 0.08
            : 0.04;

        this.planeHighlight.material.opacity = hasSnapFeedback
            ? 0.36
            : this.dragPlaneActive
            ? 0.3
            : this.isHovered
            ? 0.24
            : 0.22;
    }

    updateMatrixWorld(force) {
        if (!this.enabled || !this.active) return;

        this.syncCoords();
        this.updateStyle();

        super.updateMatrixWorld(force);
    }

    getClosestAxisAlignedPlaneAxis() {
        const eye = this.ctx.eye;

        const absX = Math.abs(eye.x);
        const absY = Math.abs(eye.y);
        const absZ = Math.abs(eye.z);

        if (absX >= absY && absX >= absZ) {
            return 0;
        }

        if (absY >= absZ) {
            return 1;
        }

        return 2;
    }

    getDominantAxis(vector) {
        const absX = Math.abs(vector.x);
        const absY = Math.abs(vector.y);
        const absZ = Math.abs(vector.z);

        if (absX >= absY && absX >= absZ) {
            return 0;
        }

        if (absY >= absZ) {
            return 1;
        }

        return 2;
    }

    getHoveredPlaneWorldNormal(target) {
        return target.copy(this.hoveredPlaneLocalNormal).applyQuaternion(this.quaternion);
    }

    updateHoveredPlaneFromHit(hit) {
        const faceNormal = hit?.face?.normal;

        if (faceNormal == null) return false;

        this.syncCoords();

        const axis = this.getDominantAxis(faceNormal);
        const direction = Math.sign(faceNormal.getComponent(axis)) || 1;

        this.hoveredPlaneAxis = axis;
        this.hoveredPlaneDirection = direction;
        this.hoveredPlaneLocalNormal.set(0, 0, 0);
        this.hoveredPlaneLocalNormal.setComponent(axis, direction);

        this.dragSnapAxis = this.getDominantAxis(
            this.getHoveredPlaneWorldNormal(tmpPlaneWorldNormal)
        );

        this.updatePlaneHighlight();

        return true;
    }

    clearHoveredPlane() {
        this.hoveredPlaneAxis = null;
        this.hoveredPlaneDirection = 1;
        this.hoveredPlaneLocalNormal.set(0, 0, 0);

        if (!this.dragPlaneActive) {
            this.planeHighlight.visible = false;
        }
    }

    clearLockedDragPlane() {
        this.dragPlaneNormal.set(0, 0, 0);
        this.dragPlaneLocalNormal.set(0, 0, 0);
        this.dragPlaneAxis = 2;
    }

    getActivePlaneAxis() {
        return this.dragPlaneActive ? this.dragPlaneAxis : this.hoveredPlaneAxis;
    }

    getActivePlaneLocalNormal(target) {
        return target.copy(
            this.dragPlaneActive
                ? this.dragPlaneLocalNormal
                : this.hoveredPlaneLocalNormal
        );
    }

    updatePlaneHighlight() {
        const planeAxis = this.getActivePlaneAxis();

        if (planeAxis == null || (!this.isHovered && !this.dragPlaneActive)) {
            this.planeHighlight.visible = false;

            return;
        }

        const box = this.raycastMesh.geometry.boundingBox;

        if (box == null) {
            this.planeHighlight.visible = false;

            return;
        }

        box.getCenter(tmpBoxCenter);
        box.getSize(tmpBoxSize);

        const planeNormal = this.getActivePlaneLocalNormal(tmpNormal);

        if (planeNormal.lengthSq() === 0) {
            this.planeHighlight.visible = false;

            return;
        }

        tmpPlanePosition.copy(tmpBoxCenter).addScaledVector(
            planeNormal,
            tmpBoxSize.getComponent(planeAxis) * 0.5 + 0.001
        );

        const [widthAxis, heightAxis] = planeSizeAxes[planeAxis];

        this.planeHighlight.position.copy(tmpPlanePosition);
        this.planeHighlight.quaternion.setFromUnitVectors(
            zAxis,
            planeNormal
        );
        this.planeHighlight.scale.set(
            tmpBoxSize.getComponent(widthAxis) * 1.02,
            tmpBoxSize.getComponent(heightAxis) * 1.02,
            1
        );
        this.planeHighlight.visible = true;
    }

    getRaycastPlane() {
        if (this.dragPlaneActive) {
            return this.dragPlane;
        }

        this.syncCoords();

        if (this.dragPlaneActive) {
            tmpNormal.copy(this.dragPlaneNormal);
        } else if (this.hoveredPlaneAxis != null) {
            this.dragPlaneAxis = this.hoveredPlaneAxis;
            tmpNormal.copy(this.getHoveredPlaneWorldNormal(tmpPlaneWorldNormal));
        } else {
            this.dragPlaneAxis = this.getClosestAxisAlignedPlaneAxis();
            this.dragSnapAxis = this.dragPlaneAxis;
            tmpNormal.copy(axisAlignedPlaneNormals[this.dragPlaneAxis]);
        }

        this.eyePlane.setFromNormalAndCoplanarPoint(
            tmpNormal,
            this.position
        );

        return this.eyePlane;
    }

    getColor() {
        return this.isHovered
            ? this.opts.hoveredColor
            : this.opts.axisColors[this.opts.axis];
    }

    getCursor() {
        return "move";
    }

    /**
     *
     * @param { import('./shared').CPointerEvent } e
     */
    onPointerDown = (e) => {
        if (!this.enabled || !this.active) return;

        this.syncCoords();

        if (!this.updateHoveredPlaneFromHit(e.hit)) {
            this.dragPlaneAxis = this.getClosestAxisAlignedPlaneAxis();
            this.dragSnapAxis = this.dragPlaneAxis;
            this.dragPlaneLocalNormal.set(0, 0, 0);
            this.dragPlaneNormal.copy(
                axisAlignedPlaneNormals[this.dragPlaneAxis]
            );
        } else {
            this.dragPlaneAxis = this.hoveredPlaneAxis;
            this.dragPlaneLocalNormal.copy(this.hoveredPlaneLocalNormal);
            this.dragPlaneNormal.copy(
                this.getHoveredPlaneWorldNormal(tmpPlaneWorldNormal)
            );
        }

        this.dragPlane.setFromNormalAndCoplanarPoint(
            this.dragPlaneNormal,
            this.position
        );
        this.dragPlaneActive = true;
        this.updatePlaneHighlight();

        this.opts.onDragStart?.();
        this.ctx.snap3D.onPointerDown();

        this.ctx.snap2D.onPointerDown(snap2DOpts);
    };

    _offset = new Vector3();

    /**
     *
     * @param { import('./shared').CPointerEvent } e
     */
    onPointerMove = (e) => {
        if (!this.enabled || !this.active) return;

        const ctx = this.ctx;
        const snapEnabled = ctx.isTranslationSnapEnabled(e.raw);

        if (!ctx.dragging) {
            this.updateHoveredPlaneFromHit(e.hit);
        }

        this.setHovered(true);

        // console.log("box Slider hovered", e.raw, ctx.dragging)

        if (!ctx.dragging) return;

        this._offset
            .copy(ctx.offset)
            .applyQuaternion(ctx.parentQuaternionInv)
            .divide(ctx.parentScale);

        ctx.object.position.copy(ctx.positionStart).add(this._offset);
        ctx.object.updateMatrixWorld();

        if (snapEnabled) {
            this.ctx.snapTranslateOnWorldAxes(
                snapAxesByPlane[this.dragSnapAxis],
                this,
                this.dragPlaneNormal
            );

            this.ctx.snap2D.onPointerMove(snap2DOpts);
        } else {
            this.ctx.clearSnapFeedback();
            this.ctx.snap2D.clearHints();
        }
    };

    onPointerUp = () => {
        if (!this.enabled || !this.active) return;

        this.dragPlaneActive = false;
        this.clearLockedDragPlane();
        this.setHovered(false);

        this.opts.onDragEnd?.();

        this.ctx.snap2D.onPointerUp(snap2DOpts);
    };

    onPointerOut = () => {
        if (!this.enabled || !this.active) return;

        this.setHovered(false);
    };

    dispose() {
        disposeObject3D(this);
    }
}
