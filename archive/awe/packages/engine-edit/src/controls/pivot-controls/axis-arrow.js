// @ts-check

import { disposeObject3D } from "@oncyberio/engine/internal/utils/dispose";
import {
    CylinderGeometry,
    Group,
    Matrix3,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    Plane,
    Quaternion,
    Ray,
    Raycaster,
    Vector3,
} from "three";
import { PivotControls } from ".";
import { Line } from "./line";
import { getHandlePlane, xDir, zDir } from "./shared";

const tmpNormal = new Vector3();

const upV = new Vector3(0, 1, 0);

let axisCursor = ["ew-resize", "ns-resize", "ew-resize"];

import Arrow from "./temp/arrow.js";
import { asConst } from "@oncyberio/engine/internal/utils/js";

export class AxisArrow extends Group {
    constructor(opts) {
        super();

        this.opts = opts;

        /** @type { Vector3 } */
        this.normal = this.opts.normal;

        this.direction = this.opts.direction.clone().normalize();

        /** @type { PivotControls } */
        this.ctx = this.opts.ctx;

        this.snap2DOpts = {
            dir: this.direction,
            mode: asConst("translate"),
        };

        this.raycastPlane = new Plane();

        const coneWidth = 1 / 15;
        const coneLength = 1 / 5;
        const cylinderLength = (1 - coneLength) * 1.5;

        // Used for raycast
        this.cylinder = new Mesh(
            new CylinderGeometry(
                coneWidth * 1.4,
                coneWidth * 1.4,
                cylinderLength + coneLength,
                8
            )
        );
        this.cylinder.position.set(0, (cylinderLength + coneLength) / 2.0, 0);
        this.cylinder.visible = false;

        this.raycastMesh = this.cylinder;
        this.raycastMesh.userData = { handle: this };

        this.line = new Line(
            [new Vector3(0, 0, 0), new Vector3(0, cylinderLength, 0)],
            {
                color: this.getColor(),
                transparent: true,
                opacity: 1,
                depthTest: false,
                linewidth: opts.axisLineWidth,
                polygonOffset: true,
                polygonOffsetFactor: -10,
            }
        );
        this.line.renderOrder = 1;

        this.line.visible = false;

        this.cone = new Arrow();

        if (this.direction.z == 1) {
            this.cone.rotation.y = Math.PI * 0.5;
        }

        this.cone.position.set(0, cylinderLength + coneLength / 2.0, 0);
        this.cone.renderOrder = 500;

        this.axisHelper = new Line(
            [new Vector3(0, -100, 0), new Vector3(0, 100, 0)],
            {
                color: opts.lineHelperColor,
                depthTest: true,
                depthWrite: false,
                linewidth: opts.lineWidth / 4,
                polygonOffset: true,
                polygonOffsetFactor: -10,
            }
        );
        this.axisHelper.renderOrder = -1;

        this.axisHelper.visible = false;

        /** @type { Group } */
        this.root = new Group();

        this.root.add(this.cylinder);
        this.root.add(this.line);
        this.root.add(this.cone);
        this.root.add(this.axisHelper);

        this.root.quaternion.setFromUnitVectors(upV, this.direction);

        this.add(this.root);

        this.isHovered = false;

        /** @type { { clickPoint: Vector3, dir: Vector3  } } */
        this.clickInfo = null;

        this.plane = new Plane();
    }

    _active = false;

    get active() {
        return this._active;
    }

    set active(v) {
        this._active = v;
    }

    updateMatrixWorld(force) {
        if (this.ctx.space === "world") {
            this.quaternion.copy(this.ctx.worldQuaternionInv);

            this.ctx.turnAxisToEye(this.direction);
        } else {
            this.quaternion.identity();
        }

        this.updateStyle();

        super.updateMatrixWorld(force);
    }

    getRaycastPlane() {
        if (this.opts.axis === 1) {
            tmpNormal.copy(this.ctx.eye).setY(0).normalize();

            this.raycastPlane.setFromNormalAndCoplanarPoint(
                tmpNormal,
                this.ctx.worldPosition
            );

            return this.raycastPlane;
        }

        return getHandlePlane(this, this.raycastPlane);
    }

    getColor() {
        // return this._locked
        //     ? this.opts.lockedStyle.color
        //     :  this.opts.axisColors[this.opts.axis];

        return this._locked
            ? this.opts.lockedStyle.color
            : this.isHovered
            ? this.opts.hoveredColor[this.opts.axis]
            : this.opts.axisColors[this.opts.axis];
    }

    getCursor() {
        return axisCursor[this.opts.axis];
    }

    setHovered(hovered) {
        this.isHovered = hovered;

        this.updateStyle();

        this.line.visible = hovered;
    }

    updateStyle() {
        const color = this.getColor();
        const opacity = this._locked ? this.opts.lockedStyle.opacity : 1;
        const hasSnapFeedback = this.ctx.isSnapFeedbackActive(this);

        // @ts-ignore
        this.line.material.color.set(color);
        this.cone.setColor(color);

        this.line.material.opacity = hasSnapFeedback ? 1 : opacity;
        this.cone.setOpacity(opacity);

        this.cone.scale
            .set(1, 1, 1)
            .multiplyScalar(this.isHovered ? 1.2 : 1)
            .multiplyScalar(hasSnapFeedback ? 1.2 : 1);

        this.line.visible = this.isHovered || hasSnapFeedback;
        this.axisHelper.visible = this.isHovered || hasSnapFeedback;
    }

    _locked = false;

    setLocked(locked) {
        this._locked = locked;
        this.updateStyle();
    }

    /**
     *
     * @param { import('./shared').CPointerEvent } e
     */
    onPointerDown = (e) => {
        this.opts.onDragStart?.();
        this.ctx.snap3D.onPointerDown();
        this.ctx.snap2D.onPointerDown(this.snap2DOpts);
    };

    _offset = new Vector3();

    _worldPos = new Vector3();

    _worldDirection = new Vector3();

    /**
     *
     * @param { import('./shared').CPointerEvent } e
     */
    onPointerMove = (e) => {
        const ctx = this.ctx;
        const snapEnabled = ctx.isTranslationSnapEnabled(e.raw);

        this.setHovered(true);

        if (!ctx.dragging) return;

        const isLocal = this.ctx.space === "local";

        this._offset.copy(ctx.offset);

        if (isLocal) {
            this._offset.applyQuaternion(ctx.worldQuaternionInv);
        }

        this._offset.multiply(this.opts.direction);

        if (isLocal) {
            this._offset.applyQuaternion(ctx.quaternionStart);
        }

        this._offset
            .applyQuaternion(ctx.parentQuaternionInv)
            .divide(ctx.parentScale);

        ctx.object.position.copy(ctx.positionStart).add(this._offset);

        ctx.object.updateMatrixWorld();

        this._worldDirection.copy(this.direction);

        if (this.ctx.space === "local") {
            this._worldDirection.applyQuaternion(ctx.worldQuaternion);
        }

        if (snapEnabled) {
            ctx.snapTranslateAlongWorldDirection(this._worldDirection, this);
            this.ctx.snap2D.onPointerMove(this.snap2DOpts);
        } else {
            ctx.clearSnapFeedback();
            this.ctx.snap2D.clearHints();
        }
    };

    onPointerUp = () => {
        this.setHovered(false);
        this.opts.onDragEnd?.();
        this.ctx.snap2D.onPointerUp(this.snap2DOpts);
    };

    onPointerOut = () => {
        this.setHovered(false);
    };

    dispose() {
        disposeObject3D(this);
    }
}
