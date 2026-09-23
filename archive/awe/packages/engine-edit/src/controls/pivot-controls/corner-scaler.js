// @ts-check

import {
    ArrowHelper,
    Quaternion,
    DoubleSide,
    Group,
    Matrix3,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    Plane,
    PlaneGeometry,
    Vector3,
    BufferGeometry,
    BufferAttribute,
    Box3,
} from "three";
import { disposeObject3D } from "@oncyberio/engine/internal/utils/dispose";
import { PivotControls } from ".";
import PipeLineMesh from "@oncyberio/engine/internal/pipeline/pipeline-mesh";
import { asConst } from "@oncyberio/engine/internal/utils/js";
import { getOrCreateEditor } from "../../editors/editor-registry";

/**
 * @typedef { object } ClickInfo
 * @property {Vector3} clickPoint
 * @property {Plane} plane
 */

const BOX_SIZE = 0.065;

const matIndentiy = new Matrix4();

const CORNERS = {
    LEFT_BOTTOM_BACK: 0,
    LEFT_BOTTOM_FRONT: 1,
    LEFT_TOP_BACK: 2,
    LEFT_TOP_FRONT: 3,
    RIGHT_BOTTOM_BACK: 4,
    RIGHT_BOTTOM_FRONT: 5,
    RIGHT_TOP_BACK: 6,
    RIGHT_TOP_FRONT: 7,
};

// For 2D objects we show just the front corners
const CORNERS_2D = [
    CORNERS.LEFT_BOTTOM_FRONT,
    CORNERS.LEFT_TOP_FRONT,
    CORNERS.RIGHT_BOTTOM_FRONT,
    CORNERS.RIGHT_TOP_FRONT,
];

const BOX_CORNERS_MULT = [
    new Vector3(-1, -1, -1),
    new Vector3(-1, -1, 1),
    new Vector3(-1, 1, -1),
    new Vector3(-1, 1, 1),
    new Vector3(1, -1, -1),
    new Vector3(1, -1, 1),
    new Vector3(1, 1, -1),
    new Vector3(1, 1, 1),
];

const SIDES = {
    FRONT: 0,
    BACK: 1,
    TOP: 2,
    BOTTOM: 3,
    RIGHT: 4,
    LEFT: 5,
};

const normalsPerSide = [
    { name: "front", vector: new Vector3(0, 0, 1), scalerField: "z" },
    { name: "back", vector: new Vector3(0, 0, -1), scalerField: "z" },
    { name: "top", vector: new Vector3(0, 1, 0), scalerField: "y" },
    { name: "bottom", vector: new Vector3(0, -1, 0), scalerField: "y" },
    { name: "right", vector: new Vector3(1, 0, 0), scalerField: "x" },
    { name: "left", vector: new Vector3(-1, 0, 0), scalerField: "x" },
];

const tmpNormal = new Vector3();

export class CornerScaler extends Group {
    //
    constructor(opts) {
        //
        super();

        this.tempPositon = new Vector3();

        this.tempScale = new Vector3();

        this.tempQuaternion = new Quaternion();

        this.opts = opts;

        /**
         * @type { Mesh }
         */
        this.selecetionMesh = null;

        /** @type { Vector3 } */
        this.corner = BOX_CORNERS_MULT[this.opts.cornerIndex];

        this.snap2DOpts = {
            dir: this.corner.clone().setZ(0),
            mode: asConst("scale"),
        };

        /** @type { PivotControls } */
        this.ctx = this.opts.ctx;

        this.raycastPlane = new Plane();

        // Used for raycast
        this.raycastMesh = new Mesh(
            // new BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE),
            RoundedRectangle(BOX_SIZE, BOX_SIZE, BOX_SIZE * 0.33, 18),
            new MeshBasicMaterial({
                transparent: true,
                color: this.getColor(),
                // depthTest: false,
                side: DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: -10,
            })
        );

        this.raycastMesh.onBeforeRender = (renderer, scene, camera) => {
            this.raycastMesh.matrixWorld.decompose(
                this.tempPositon,
                this.tempQuaternion,
                this.tempScale
            );

            this.raycastMesh.matrixWorld.compose(
                this.tempPositon,
                camera.quaternion,
                this.tempScale
            );
        };
        this.raycastMesh.userData = { handle: this };

        this.root = new Group();

        this.gizmo = new Group();
        this.gizmo.add(this.raycastMesh);
        this.root.add(this.gizmo);
        this.add(this.root);

        this.isHovered = false;

        /** @type { ClickInfo } */
        this.clickInfo = null;
    }

    _tmpNormal = new Vector3();
    _dirToCamera = new Vector3();
    _worldSideNormals = normalsPerSide.map((n) => n.vector.clone());
    _normalMatrix = new Matrix3();
    _worldNormal = new Vector3();

    _sideCenterPos = new Vector3();

    plane = new Plane();

    getRaycastPlane() {
        //
        if (this.ctx.is2D(this.ctx.object)) {
            //
            this.ctx.object.getWorldDirection(tmpNormal);
        } else {
            tmpNormal.copy(this.ctx.eye);
        }
        this.plane.setFromNormalAndCoplanarPoint(
            tmpNormal,
            this.ctx.worldPosition
        );
        return this.plane;
        /*
        const cameraDir = this._dirToCamera
            .subVectors(this.ctx.camera.position, this.ctx.worldPosition)
            .normalize();

        const normalMatrix = this._normalMatrix.getNormalMatrix(
            this.ctx.object.matrixWorld
        );

        let maxDot = -Infinity;
        let facingSide = null;
        let facingNormal = this._worldNormal;

        const affinity = CORNER_SIDE_AFFINITY[this.opts.cornerIndex];

        let dots = {};

        for (let i = 0; i < affinity.length; i++) {
            //
            const side = affinity[i];
            const it = normalsPerSide[side];

            const normal = this._tmpNormal
                .copy(it.vector)
                .applyNormalMatrix(normalMatrix)
                .normalize();

            let dot = cameraDir.dot(normal);

            dots[it.name] = dot;

            dot = Math.abs(dot);

            if (dot > maxDot) {
                facingNormal.copy(normal);
                maxDot = dot;
                facingSide = it;
            }
        }

        if (facingSide == null) {
            debugger;
        }

        // console.log("dots", dots);
        // console.log("facingSide", facingSide?.name);

        this._sideCenterPos
            .set(0, 0, 0)
            .addScaledVector(
                facingSide.vector,
                this.halfExtents[facingSide.scalerField]
            );

        this.ctx.object.localToWorld(this._sideCenterPos);

        this.raycastPlane.setFromNormalAndCoplanarPoint(
            facingNormal,
            this.position
        );

        // SidePlanHelper.updateFromBoxMeshAndPlane(
        //     this.ctx.object,
        //     this.halfExtents,
        //     facingSide,
        //     facingNormal
        // );

        return this.raycastPlane;
        */
    }

    _tmpV3 = new Vector3();
    _tmpPos = new Vector3();
    _tmpCenter = new Vector3();

    halfExtents = new Vector3();
    geometryCenter = new Vector3();
    geometrySize = new Vector3();
    geometryBox = new Box3();

    onAttach(object) {
        // @ts-ignore
        let mesh = getOrCreateEditor(object)?.getSelectionMesh?.();

        if (mesh == null) {
            return;
        }

        if (mesh.geometry.boundingBox == null) {
            mesh.geometry.computeBoundingBox();
        }

        this.selecetionMesh = mesh;

        this.geometryBox.copy(mesh.geometry.boundingBox);
        this.geometryBox.getCenter(this.geometryCenter);
        this.geometryBox.getSize(this.geometrySize);
    }

    canShow() {
        // for 2D objects we show only the front corners
        const depth = this.geometrySize.z;

        return depth > 0 || CORNERS_2D.includes(this.opts.cornerIndex);
    }

    onDetach() {
        //
        this.selecetionMesh = null;
    }

    placeAtCorner() {
        // @ts-ignore
        const mesh = this.selecetionMesh;

        if (mesh == null) return;

        this._tmpCenter.copy(this.geometryCenter);
        //.multiply(mesh.scale)
        //.add(mesh.position);

        this.halfExtents
            .copy(this.geometrySize)
            //.multiply(mesh.scale)
            .multiplyScalar(0.5);

        const position = this._tmpPos
            .copy(this.corner)
            .multiply(this.halfExtents)
            .add(this._tmpCenter);

        this.position.copy(mesh.localToWorld(position));

        this.scale.copy(this.ctx.gizmo.scale);
    }

    _tmpCenterWorld = new Vector3();

    getCursor() {
        this.ctx.object.localToWorld(
            this._tmpCenterWorld.copy(this._tmpCenter)
        );

        return getCursorStyle(this, this._tmpCenterWorld, this.ctx.camera);
    }

    syncCoords() {
        if (this.ctx.object == null) return;

        this.placeAtCorner();
    }

    updateMatrixWorld(force) {
        //
        // debugger;
        this.syncCoords();

        this.quaternion.copy(this.ctx.worldQuaternion);

        super.updateMatrixWorld(force);
    }

    getColor() {
        return this.isHovered ? 0xc2c2ff : 0xc2c2c2;
    }

    setHovered(hovered) {
        this.isHovered = hovered;

        const color = this.getColor();

        this.raycastMesh.material.color.set(color);

        const s = hovered ? 1.25 : 1;

        this.raycastMesh.scale.set(s, s, s);
    }

    _sidePosStart = new Vector3();

    _arrowHelper = new ArrowHelper();
    _arrowDir = new Vector3();

    _runs = [];
    _is2D = false;
    /**
     *
     * @param { import('./shared').CPointerEvent } e
     */
    onPointerDown = (e) => {
        //

        this._is2D = this.ctx.is2D(this.ctx.object);

        const clickPoint = e.intersect.clone();

        this.clickInfo = { clickPoint, plane: this.raycastPlane };

        // this.opts.onDragStart?.()
        this.selecetionMesh.updateWorldMatrix(true, false);
        this.getAnchorPoint(this._origAnchor);
        this.getCornerPoint(this._pCornerStart).sub(this._origAnchor);
        this.updateHelpers();

        this.ctx.snap2D.onPointerDown(this.snap2DOpts);

        // this.parent.add(this._arrowHelper);
    };

    phMatrix = new Matrix4();

    updateHelpers() {
        //this.planeHelper.matrix.copy(this.matrixWorld)
        //
    }

    _offset = new Vector3();
    _bottomDiff = new Vector3();

    _origAnchor = new Vector3();
    _newAnchor = new Vector3();

    _pCornerStart = new Vector3();
    _pCornerEnd = new Vector3();

    onPointerMove = () => {
        //
        const ctx = this.ctx;

        this.setHovered(true);

        if (!ctx.dragging) return;

        // console.log("onPointerMove, offset", ctx.offset);
        ctx.object.scale.copy(ctx.scaleStart);
        ctx.object.position.copy(ctx.positionStart);
        this._pCornerEnd
            .copy(this._pCornerStart)
            .add(ctx.offset)
            .projectOnVector(this._pCornerStart);

        this.applyScale();
        this.updateTransforms();

        if (this._is2D) {
            this.ctx.snap2D.onPointerMove(this.snap2DOpts);
            this.updateTransforms();
            this.getCornerPoint(this._pCornerEnd).sub(this._origAnchor);
        }

        this.applyScale();

        // ctx.setLabelText(`${scale.toFixed(2)}`);
    };

    applyScale() {
        //
        const ctx = this.ctx;
        const object = ctx.object;
        const anchorPoint = this._origAnchor;
        const is2D = this._is2D;

        let s = this._pCornerEnd.length() / this._pCornerStart.length();

        // Create translation matrices to/from anchor point
        const translateToOrigin = new Matrix4().makeTranslation(
            -anchorPoint.x,
            -anchorPoint.y,
            -anchorPoint.z
        );
        const scaleMatrix = new Matrix4().makeScale(s, s, is2D ? 1 : s);
        const translateBack = new Matrix4().makeTranslation(
            anchorPoint.x,
            anchorPoint.y,
            anchorPoint.z
        );

        // Combine transformations: translate back * scale * translate to origin
        const transformation = new Matrix4()
            .multiply(translateBack)
            .multiply(scaleMatrix)
            .multiply(translateToOrigin);

        // Apply the combined transformation to the object
        if (
            object.parent == null ||
            object.parent.matrixWorld.equals(matIndentiy)
        ) {
            //
            object.matrix.multiplyMatrices(transformation, ctx.matrixStart);
        } else {
            //
            object.matrixWorld.multiplyMatrices(
                transformation,
                ctx.matrixWorldStart
            );

            const parentInv = new Matrix4()
                .copy(object.parent.matrixWorld)
                .invert();

            object.matrix.copy(object.matrixWorld).premultiply(parentInv);
            object.matrix.decompose(this.position, this.quaternion, this.scale);
        }

        object.matrix.decompose(
            object.position,
            object.quaternion,
            object.scale
        );
    }

    updateTransforms() {
        this.ctx.object.updateMatrixWorld(true);
        this.selecetionMesh.updateWorldMatrix(true, false);
    }

    getAnchorPoint(target) {
        //
        target.x = this._is2D
            ? this.corner.x < 0
                ? this.geometryBox.max.x
                : this.geometryBox.min.x
            : 0;
        target.y =
            this.corner.y < 0 ? this.geometryBox.max.y : this.geometryBox.min.y;
        target.z = 0;

        return this.selecetionMesh.localToWorld(target);
    }

    _offetMat = new Matrix4();

    getCornerPoint(target) {
        //
        target.x =
            this.corner.x < 0 ? this.geometryBox.min.x : this.geometryBox.max.x;
        target.y =
            this.corner.y < 0 ? this.geometryBox.min.y : this.geometryBox.max.y;
        target.z = this._is2D
            ? 0
            : this.corner.z < 0
            ? this.geometryBox.min.z
            : this.geometryBox.max.z;

        return this.selecetionMesh.localToWorld(target);
    }

    _vec2ToFixed(v) {
        return v
            .toArray()
            .map((v) => v.toFixed(2))
            .join(", ");
    }

    // decomprte
    decomposePlaneVector() {}

    onPointerUp = () => {
        this.clickInfo = null;

        this.opts.onDragEnd?.();

        this.ctx.clearLabel();

        this.ctx.snap2D.onPointerUp(this.snap2DOpts);

        // console.table(this._runs);
        this._runs.length = 0;
    };

    onPointerOut = () => {
        this.setHovered(false);

        this.ctx.clearLabel();
    };

    dispose() {
        disposeObject3D(this);
    }
}

export class SidePlanHelper {
    //
    static _tmpLookAt = new Vector3();
    static _pos = new Vector3();
    static _tmpSize = new Vector3();

    static Meshes = new WeakMap();

    static updateFromBoxMeshAndPlane(object, halfExtents, side) {
        //
        /** @type { Mesh } */
        let mesh = this.Meshes.get(object);

        if (mesh == null) {
            mesh = new PipeLineMesh(
                new PlaneGeometry(1, 1),
                new MeshBasicMaterial({
                    color: 0xff0000,
                    transparent: true,
                    opacity: 0.5,
                    depthTest: false,
                    side: DoubleSide,
                })
            );
            object.add(mesh);
            this.Meshes.set(object, mesh);
        }

        let collMesh = object?.getCollisionMesh?.();

        if (collMesh == null) {
            mesh.scale.copy(collMesh.scale);
        }

        // this._tmpSize
        //     .copy(halfExtents)
        //     .multiply(object.scale);

        this._pos
            .set(0, 0, 0)
            .addScaledVector(side.vector, halfExtents[side.scalerField]);

        mesh.position.copy(this._pos);

        const sideId = side.name;

        if (sideId === "front") {
            mesh.rotation.set(0, 0, 0);
        } else if (sideId === "back") {
            //mesh.rotation.y = Math.PI;
            mesh.rotation.set(0, Math.PI, 0);
        } else if (sideId === "right") {
            // mesh.rotation.y = Math.PI / 2;
            mesh.rotation.set(0, Math.PI / 2, 0);
        } else if (sideId === "left") {
            // mesh.rotation.y = -Math.PI / 2;
            mesh.rotation.set(0, -Math.PI / 2, 0);
        } else if (sideId === "top") {
            // mesh.rotation.x = Math.PI / 2;
            mesh.rotation.set(Math.PI / 2, 0, 0);
        } else if (sideId === "bottom") {
            //mesh.rotation.x = -Math.PI / 2;
            mesh.rotation.set(-Math.PI / 2, 0, 0);
        }
    }
}

let handlePosition = new Vector3();

let centerPosition = new Vector3();

function getCursorStyle(handle, boxCenter, camera) {
    // 1- Transform to camera space
    handlePosition
        .copy(handle.position)
        .applyMatrix4(camera.matrixWorldInverse);

    centerPosition.copy(boxCenter).applyMatrix4(camera.matrixWorldInverse);

    let relativePosition = handlePosition.sub(centerPosition);

    // Determine the cursor style based on the handle's position in camera space

    // top-right and
    if (Math.sign(relativePosition.x) === Math.sign(relativePosition.y)) {
        return "nesw-resize";
    } else {
        return "nwse-resize";
    }
}

function RoundedRectangle(w, h, r, s) {
    // width, height, radius corner, smoothness

    // helper const's
    const wi = w / 2 - r; // inner width
    const hi = h / 2 - r; // inner height
    const ul = r / w; // u left
    const ur = (w - r) / w; // u right
    const vl = r / h; // v low
    const vh = (h - r) / h; // v high

    let positions = [wi, hi, 0, -wi, hi, 0, -wi, -hi, 0, wi, -hi, 0];

    let uvs = [ur, vh, ul, vh, ul, vl, ur, vl];

    let n = [
        3 * (s + 1) + 3,
        3 * (s + 1) + 4,
        s + 4,
        s + 5,
        2 * (s + 1) + 4,
        2,
        1,
        2 * (s + 1) + 3,
        3,
        4 * (s + 1) + 3,
        4,
        0,
    ];

    let indices = [
        n[0],
        n[1],
        n[2],
        n[0],
        n[2],
        n[3],
        n[4],
        n[5],
        n[6],
        n[4],
        n[6],
        n[7],
        n[8],
        n[9],
        n[10],
        n[8],
        n[10],
        n[11],
    ];

    let phi, cos, sin, xc, yc, uc, vc, idx;

    for (let i = 0; i < 4; i++) {
        xc = i < 1 || i > 2 ? wi : -wi;
        yc = i < 2 ? hi : -hi;

        uc = i < 1 || i > 2 ? ur : ul;
        vc = i < 2 ? vh : vl;

        for (let j = 0; j <= s; j++) {
            phi = (Math.PI / 2) * (i + j / s);
            cos = Math.cos(phi);
            sin = Math.sin(phi);

            positions.push(xc + r * cos, yc + r * sin, 0);

            uvs.push(uc + ul * cos, vc + vl * sin);

            if (j < s) {
                idx = (s + 1) * i + j + 4;
                indices.push(i, idx, idx + 1);
            }
        }
    }

    const geometry = new BufferGeometry();
    geometry.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
    geometry.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(positions), 3)
    );

    return geometry;
}
