// @ts-check

import PipeLineMesh from "@oncyberio/engine/internal/pipeline/pipeline-mesh";

import {
    BoxGeometry,
    MeshBasicMaterial,
    Box3,
    Quaternion,
    Vector3,
    Object3D,
    Matrix4,
} from "three";

import emitter from "@oncyberio/engine/internal/engine-emitter";

import Events from "../editor-events";

import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { DragHandler } from "./drag-handler";
import { getOrCreateEditor } from "../editors/editor-registry";

const unitVec = new Vector3(1, 1, 1);
const localMatrix = new Matrix4();
const invMatrix = new Matrix4();

export class TransformProxy extends PipeLineMesh {
    isSelectable = true;

    isDragging = false;

    attachedObjects: Component3D[] = [];

    _fakeChildren: Object3D[] = [];

    _enabled = false;

    boxNeedsUpdate = false;

    dragHandler: DragHandler;

    constructor() {
        super(
            new BoxGeometry(1, 1, 1),
            new MeshBasicMaterial({
                visible: false,
                transparent: true,
                color: 0xff0000,
                opacity: 0.2,
                depthTest: false,
                depthWrite: false,
            })
        );

        this.visible = false;
    }

    setAttachedObjects(objects, dragHandler) {
        //
        if (this.enabled) {
            this.removeEvents();
        }

        this._fakeChildren.forEach((child) => {
            this.remove(child);
        });
        this._fakeChildren.length = 0;

        this.attachedObjects = objects;

        this.attachedObjects.forEach((object) => {
            //
            const fakeChild = new Object3D();
            fakeChild.matrixAutoUpdate = false;
            this.add(fakeChild);
            this._fakeChildren.push(fakeChild);
        });

        this.dragHandler = dragHandler;

        this.enabled = objects.length > 0;

        if (this.enabled) {
            this.updateBoundingBox();
        }
    }

    detach() {
        this.setAttachedObjects([], null);
    }

    onObjectChange = () => {
        //
        if (this.isDragging) return;

        this.boxNeedsUpdate = true;
    };

    onPreUpdate = () => {
        //
        if (this.boxNeedsUpdate) {
            this.updateBoundingBox();

            this.boxNeedsUpdate = false;
        }
    };

    get enabled() {
        return this._enabled;
    }

    set enabled(value) {
        if (this._enabled === value) return;

        this._enabled = value;

        if (this._enabled) {
            this.addEvents();
        } else {
            this.removeEvents();
        }
    }

    addEvents() {
        emitter.on(Events.LATE_UPDATE, this.onPreUpdate);

        this.attachedObjects?.[0]?.onMatrixChanged(this.onObjectChange);
    }

    removeEvents() {
        //
        emitter.off(Events.LATE_UPDATE, this.onPreUpdate);

        this.attachedObjects?.[0]?.offMatrixChanged(this.onObjectChange);
    }

    _box = new Box3();

    updateBoundingBox = () => {
        //
        this._box.makeEmpty();

        this.attachedObjects.forEach((object) => {
            //
            const mesh = getOrCreateEditor(object)?.getSelectionMesh();

            if (mesh) {
                this._box.expandByObject(mesh);
            }
        });

        this._box.min.addScalar(-0.01);
        this._box.max.addScalar(0.01);

        this._box.getCenter(this.position);

        this._box.getSize(this.scale);

        this.updateMatrixWorld();

        // object world transform => to this mesh local transform
        invMatrix.copy(this.matrixWorld).invert();
        this.attachedObjects.forEach((object, index) => {
            localMatrix.copy(object.matrixWorld).premultiply(invMatrix);
            this._fakeChildren[index].matrix.copy(localMatrix);
        });
    };

    _initPositionInv = new Vector3();
    _initQuaternionInv = new Quaternion();
    // _initScaleInv = new Vector3()

    _deltaPosition = new Vector3();
    _deltaQuaternion = new Quaternion();
    // _deltaScale = new Vector3()

    dragStart() {
        //
        // console.log('MultiSelectMesh dragStart')
        this.isDragging = true;

        this.getWorldPosition(this._initPositionInv).multiplyScalar(-1);

        this.getWorldQuaternion(this._initQuaternionInv).invert();

        // this.getWorldScale(this._initScaleInv).set(
        //     1 / this._initScaleInv.x,
        //     1 / this._initScaleInv.y,
        //     1 / this._initScaleInv.z,
        // )
    }

    _tmpMatrix = new Matrix4();

    syncWithTransform(opts, ctx) {
        //
        this.updateMatrixWorld();

        // fake children world transform => to object local transforms
        let inverses = new WeakMap<Object3D, Matrix4>();

        this.attachedObjects.forEach((object, index) => {
            //
            const fakeChild = this._fakeChildren[index];

            let invMatrix = inverses.get(object.parent);

            if (!invMatrix) {
                invMatrix = object.parent.matrixWorld.clone().invert();
                inverses.set(object.parent, invMatrix);
            }

            localMatrix.copy(fakeChild.matrixWorld).premultiply(invMatrix);

            localMatrix.decompose(
                object.position,
                object.quaternion,
                object.scale
            );

            // @ts-ignore
            object.syncWithTransform?.(opts);
        });
    }

    dragEnd() {
        //
        // console.log('MultiSelectMesh dragEnd')

        this.isDragging = false;
    }
}
