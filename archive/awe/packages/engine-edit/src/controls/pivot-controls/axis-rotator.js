// @ts-check

import { Line } from "./line";
import {
    Group,
    Matrix4,
    MeshBasicMaterial,
    Plane,
    Mesh,
    Quaternion,
    Ray,
    SphereGeometry,
    Vector3,
    CircleGeometry,
    Euler,
    CylinderGeometry,
    Color,
    DoubleSide,
    ArrowHelper,
} from "three";
import { disposeObject3D } from "@oncyberio/engine/internal/utils/dispose";
import { PivotControls } from ".";
import { getHandlePlane } from "./shared";
import PipeLineMesh from "@oncyberio/engine/internal/pipeline/pipeline-mesh";

// import RotatorArrow from './temp/rotatorarrow'

import { ALT_MODE_COLORS, MODE_COLORS } from './constants'

const tmpNormal = new Vector3();

const tmpV1 = new Vector3();
const tmpV2 = new Vector3();

const adjustQuat = new Quaternion();
adjustQuat.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);

/**
 * @typedef { object } ClickInfo
 * @property {Vector3} clickPoint
 * @property {Vector3} origin
 * @property {Vector3} e1
 * @property {Vector3} e2
 * @property {Vector3} normal
 * @property {Plane} plane
 */

const r = 0.65 * 1.5;

const segmentLength = (1 * (Math.PI * 2)) / 360;

const zAxis = new Vector3(0, 0, 1);

import CircleSelector from "./temp/circle-selector";

export class AxisRotator extends Group {
    constructor(opts) {
        super();

        this.root = new Group();

        this.opts = opts;

        this.rotationAngle = 0;

        /** @type { Vector3 } */
        this.normal = this.opts.normal;

        this.startAngle = 0

        /** @type { PivotControls } */
        this.ctx = this.opts.ctx;

        this.eyePlaneTreshold = (5 * Math.PI) / 180;

        this.handlePlane = new Plane();

        this.eyePlane = new Plane();

        const arcPoints = this.getArcPoints(r, 64, 0);

        // Used for raycast
        this.raycastMesh = new Line(arcPoints, {
            linewidth: opts.lineWidth * 4,
        });
        // this.raycastMesh.position.z = r
        this.raycastMesh.visible = false;
        this.raycastMesh.userData = { handle: this };

        this.stringAxis = opts.stringAxis

        this.name =
            "AxisRotator-" +
            this.opts.normal.x +
            this.opts.normal.y +
            this.opts.normal.z;


        this.line = new Line(arcPoints, {
            color: this.getColor(),
            depthTest: false,
            dashed: true,
            dashedScale: 24,
            gapSize: 0.4,
            linewidth: opts.lineWidth * 0.25,
            polygonOffset: true,
            polygonOffsetFactor: -10,
        });

        const rRatio = 1.25

        // if(this.stringAxis == "X"){

        //     this.rotatorArrow = new RotatorArrow()

        //     this.rotatorArrow.object.position.set(r * rRatio , 0, 0)

          
        // }

        // if(this.stringAxis == "Y"){

        //     this.rotatorArrow = new RotatorArrow()

        //     this.rotatorArrow.object.position.set(0, r  * rRatio, 0)
        // }

        // if(this.stringAxis == "Z"){

        //     this.rotatorArrow = new RotatorArrow()

        //     this.rotatorArrow.position.set(0, -r * rRatio, 0)

        // }

        // this.rotatorArrow.scale.set(0.9, 0.9, 0.9 )

        // this.root.add(this.rotatorArrow);

        // this.rotatorArrow.setColor( MODE_COLORS[opts.stringAxis] )

        
        

        // if(this.stringAxis == "Y"){

        //     this.rotatorArrow.position.set(0, 0, -r)
        // }

        // if(this.stringAxis == "Z"){

        //     this.rotatorArrow.position.set(-r, 0, 0)
        // }

      

        this.circleHelper = new CircleSelector(r);
        this.circleHelper.visible = false;
        this.circleHelper.color = MODE_COLORS[opts.stringAxis]
        this.circleHelper.altColor = ALT_MODE_COLORS[opts.stringAxis]

        // this.angleHelper = new AngleHelper(opts);
        // this.angleHelper.visible = false;

        const dir1N = opts.dir1.clone().normalize();
        const dir2N = opts.dir2.clone().normalize();
        const matrixL = new Matrix4().makeBasis(
            dir1N,
            dir2N,
            dir1N.clone().cross(dir2N)
        );

      
        this.root.matrix.copy(matrixL);
        this.root.matrixAutoUpdate = false;

        this.handleQuat = new Quaternion();
        this.handleQuat.setFromRotationMatrix(matrixL);

        this.add(this.root);
        this.root.add(this.raycastMesh);
        this.root.add(this.line);

      
        this.ctx.add(this.circleHelper);

        this.isHovered = false;

        /** @type { ClickInfo } */
        this.clickInfo = null;
    }

    getArcPoints(
        radius,
        segments = 32,
        thetaStart = 0,
        thetaLength = Math.PI * 2
    ) {
        /** @type { Vector3[] } */
        const points = [];

        for (let s = 0; s <= segments; s++) {
            const segment = thetaStart + (s * thetaLength) / segments;

            const x = radius * Math.cos(segment);
            const y = radius * Math.sin(segment);

            points.push(new Vector3(x, y, 0));
        }

        return points;
    }

    _active = false;

    get active() {
        return this._active;
    }

    set active(v) {
        this._active = v;
    }

    dirx = new Vector3();
    diry = new Vector3();
    dirz = new Vector3();

    updateMatrixWorld(force) {
        this.dirx.copy(this.opts.dir1);

        this.diry.copy(this.opts.dir2);

        this.ctx.turnAxisToEye(this.dirx);
        this.ctx.turnAxisToEye(this.diry);

        this.dirz.crossVectors(this.dirx, this.diry);

        if (this.ctx.space === "world") {
            this.quaternion.copy(this.ctx.worldQuaternionInv);
        } else {
            this.quaternion.identity();
        }

        this.root.matrix.makeBasis(this.dirx, this.diry, this.dirz);

        this.updateStyle();

        super.updateMatrixWorld(force);
    }

    getColor() {

        return this._locked
            ? this.opts.lockedStyle.color
            : this.isHovered
            ? this.opts.axisColors[this.opts.axis]
            : 0xc0c0c0;
    }

    getAltColor(){

        return this.isHovered ? ALT_MODE_COLORS[this.opts.stringAxis]  : MODE_COLORS[this.opts.stringAxis]
    }

    getDashed(){

        return this.isHovered == false
    }

    getLineWidth(){
        return this.isHovered ? this.opts.lineWidth * 0.5 : this.opts.lineWidth * 0.25
    }

    getCursor() {
        return "default";
    }

    getRaycastPlane() {
        const ctx = this.ctx;

        this.getHandlePlane();
        this.getEyePlane();

        this.eyeDot = this.handlePlane.normal.dot(ctx.eye);

        this.angleToCamera = Math.acos(this.eyeDot);

        //console.log("angle, dot", this.eyeDot)
        // this.logv3("angle, eye", ctx.eye)
        // this.logv3("angle, plane normal", this.handlePlane.normal)
        //console.log("angle to camera", Math.round(this.angleToCamera * 180 / Math.PI))

        if (
            Math.abs(this.angleToCamera - Math.PI / 2) > this.eyePlaneTreshold
        ) {
            this.raycastPlane = this.handlePlane;
        } else {
            this.raycastPlane = this.eyePlane;
        }

        return this.raycastPlane;
    }

    getEyePlane() {
        tmpNormal.copy(this.ctx.eye);

        this.eyePlane.setFromNormalAndCoplanarPoint(
            tmpNormal,
            this.ctx.worldPosition
        );

        return this.eyePlane;
    }

    getHandlePlane() {
        getHandlePlane(this, this.handlePlane);
    }

    setHovered(hovered) {
        this.isHovered = hovered;

        this.updateStyle();
    }

    _locked = false;

    setLocked(locked) {
        this._locked = locked;
        this.updateStyle();
    }

    updateStyle() {
        const color = this.getColor();

        this.line.material.color.set(color);
        this.line.material.opacity = this._locked
            ? this.opts.lockedStyle.opacity
            : 1;

        this.circleHelper.visible = this.isHovered;

        if(this.isHovered){
            this.updateAngleHelper();
        }

        this.line.material.dashed = this.getDashed()

        this.line.material.linewidth = this.getLineWidth()

        const altColor = this.getAltColor()

        // this.rotatorArrow.setColor(altColor)
    }

    // logv3(m, v) {
    //     console.log(m,
    //         Math.round(v.x * 100) / 100,
    //         Math.round(v.y * 100) / 100,
    //         Math.round(v.z * 100) / 100,
    //     )
    // }

    angleQuat = new Quaternion();

    updateAngleHelper() {

        const ctx = this.ctx;
       
        this.updateCircleHelper()

        let angleLength = this.rotationAngle;

        if(isNaN(angleLength)){
            angleLength = 0
        }

        ctx.setLabelText(`${Math.round((angleLength * 180) / Math.PI)}°`);
    }

    updateCircleHelper(){

        const ctx = this.ctx;

        this.circleHelper._startAngle = this.startAngle;

        this.circleHelper._angleLength = this.rotationAngle;

        // console.log("angle", startAngle, angleLength)

        this.circleHelper.position.copy(ctx.worldPositionStart);

        this.circleHelper.scale.copy(this.ctx.gizmo.scale);

        // this.angleQuat.setFromAxisAngle(zAxis, startAngle)

        if (this.ctx.space === "local") {
            this.circleHelper.quaternion.copy(ctx.worldQuaternionStart);

            this.circleHelper.quaternion.multiply(this.handleQuat);
        } else {
            this.circleHelper.quaternion.copy(this.handleQuat);
        }

        this.circleHelper.visible = true;
    }

    isAnchor() {}

    opdV1 = new Vector3();
    opdV2 = new Vector3();

    /**
     *
     * @param { import('./shared').CPointerEvent } e
     */
    onPointerDown = (e) => {

        // this.rotatorArrow.visible = false

        const ctx = this.ctx;

        const v1 = this.opdV2.copy(this.opts.dir1);

        if (this.ctx.space === "local") {
            v1.applyQuaternion(ctx.worldQuaternion);
        }

        const v2 = this.opdV1.copy(ctx.hitPoint).sub(ctx.worldPositionStart);

        const startAngle = this.planarAngle(v1, v2, this.handlePlane.normal);

        this.startAngle = startAngle;

        this.circleHelper.visible = true;

        this.line.visible = false;

        this.rotationAngle = 0;

        ctx.attachLabel(this.circleHelper);

        // this.logv3("hit point", this.hitPoint)
        // this.logv3("hit pos", ctx.worldPositionStart)
        // this.logv3("hit point", v1)

        this.opts.onDragStart?.();
    };

    rotationAxis = new Vector3();

    _offset = new Vector3();

    _offsetMatrix = new Matrix4();

    wDir = new Vector3();

    euler = new Euler();

    quat = new Quaternion();

    _rotAxis = new Vector3();

    /**
     *
     * @param { import('./shared').CPointerEvent } e
     */
    onPointerMove = (e) => {

        const ctx = this.ctx;

        this.setHovered(true);

        this.circleHelper.visible = true;

        // force positionning and scaling 

        this.circleHelper.position.copy(ctx.worldPositionStart);

        this.circleHelper.scale.copy(this.ctx.gizmo.scale);

        if (!ctx.dragging) {
            return;
        }
      
        const prevRotationAngle = this.rotationAngle;

        const ROTATION_SPEED =
            20 /
            ctx.worldPosition.distanceTo(
                tmpV1.setFromMatrixPosition(ctx.opts.camera.matrixWorld)
            );

        // const ROTATION_SPEED = 0.5

        const rotationAxis = this._rotAxis.copy(this.normal);

        if (this.raycastPlane === this.handlePlane) {
            let rotationAngle = this.planarAngle(
                ctx.pointStart,
                ctx.pointEnd,
                this.handlePlane.normal
            );

            const delta = Math.abs(rotationAngle - prevRotationAngle);

            if (delta >= 6) {
                this.rotationAngle =
                    (Math.PI * 2 - Math.abs(rotationAngle)) *
                    Math.sign(this.rotationAngle);
            } else {
                this.rotationAngle = rotationAngle;
            }
        } else {
            tmpV1.copy(rotationAxis);

            if (this.ctx.space === "local") {
                tmpV1.applyQuaternion(ctx.worldQuaternion);
            }

            this.rotationAngle =
                this._offset
                    .copy(ctx.offset)
                    .dot(tmpV1.cross(ctx.eye).normalize()) * ROTATION_SPEED;
        }

        if (e.raw.shiftKey && ctx.rotationSnap) {
            this.rotationAngle =
                Math.round(this.rotationAngle / ctx.rotationSnap) *
                ctx.rotationSnap;
        }

        if (this.ctx.space === "local") {
            this.quat.setFromAxisAngle(rotationAxis, this.rotationAngle);

            ctx.object.quaternion
                .copy(ctx.quaternionStart)
                .multiply(this.quat)
                .normalize();
        } else {
            rotationAxis.applyQuaternion(this.ctx.parentQuaternionInv);

            this.quat.setFromAxisAngle(rotationAxis, this.rotationAngle);

            ctx.object.quaternion
                .copy(this.quat)
                .multiply(ctx.quaternionStart)
                .normalize();
        }

        ctx.object.updateMatrixWorld();

        this.updateAngleHelper();
    };

    /**
     *
     * @param {Vector3} vStart
     * @param {Vector3} vEnd
     * @param {Vector3} planeNormal
     */
    planarAngle(vStart, vEnd, planeNormal) {
        return Math.atan2(
            tmpV1.crossVectors(vStart, vEnd).dot(planeNormal),
            tmpV2.copy(vStart).dot(vEnd)
        );
    }

    onPointerUp = () => {

        // this.rotatorArrow.visible = true

        this.clickInfo = null;
        this.rotationAngle = 0;
        this.circleHelper._angleLength = 0;

        // this.angleHelper.visible = false;

        this.circleHelper.visible = false;

        this.line.visible = true;

        this.ctx.clearLabel();

        this.opts.onDragEnd?.();
    };

    onPointerOut = () => {

        this.rotationAngle = 0;
        this.circleHelper._angleLength = 0;
        this.circleHelper.visible = false;
        this.setHovered(false);
        this.ctx.clearLabel();
    };

    dispose() {
        disposeObject3D(this);

        this.ctx.remove(this.circleHelper);

        this.circleHelper.dispose();
    }
}
