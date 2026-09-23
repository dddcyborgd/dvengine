// @ts-check

import PipeLineMesh from "@oncyberio/engine/internal/pipeline/pipeline-mesh";
import {
    BoxGeometry,
    MeshBasicMaterial,
    Box3,
    Quaternion,
    Vector3,
    Object3D,
} from "three";
import emitter from "@oncyberio/engine/internal/engine-emitter";
import { EngineEvents } from "@oncyberio/engine/internal/engine-events";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";

export class SingleTransformProxy extends PipeLineMesh {
    //
    isDragging = false;

    _enabled = false;

    private _object: Component3D;

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

    attachComponent(object: Component3D) {
        this._object = object;
        this.addEvents();
    }

    detach() {
        this._object = null;
        this.removeEvents();
    }

    addEvents() {
        emitter.on(EngineEvents.LATE_UPDATE, this.updateBoundingBox);
    }

    removeEvents() {
        //
        emitter.off(EngineEvents.LATE_UPDATE, this.updateBoundingBox);
    }

    _box = new Box3();

    updateBoundingBox = () => {
        //
        this._object.getBBox(this._box);

        this._box.min.addScalar(-0.01);
        this._box.max.addScalar(0.01);

        this._box.getCenter(this.position);

        this._box.getSize(this.scale);

        this.updateMatrixWorld();
    };

    _initGroupPosition = new Vector3();
    _initGroupQuaternion = new Quaternion();

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

        this._initGroupPosition.copy(this._object.positionWorld);
        this._initGroupQuaternion.copy(this._object.quaternionWorld);

        this.getWorldPosition(this._initPositionInv).multiplyScalar(-1);

        this.getWorldQuaternion(this._initQuaternionInv).invert();

        // this.getWorldScale(this._initScaleInv).set(
        //     1 / this._initScaleInv.x,
        //     1 / this._initScaleInv.y,
        //     1 / this._initScaleInv.z,
        // )
    }

    syncWithTransform(opts) {
        //
        const deltaPosition = this._deltaPosition
            .copy(this.position)
            .add(this._initPositionInv);

        const deltaQuaternion = this._deltaQuaternion
            .copy(this.quaternion)
            .multiply(this._initQuaternionInv);

        const newWorldPos = this._initGroupPosition.clone().add(deltaPosition);
        const newWorldQuat = this._initGroupQuaternion
            .clone()
            .multiply(deltaQuaternion);

        this._object._setWorldPosition(newWorldPos);

        this._object._setWorldQuaternion(newWorldQuat);

        this._object.syncWithTransform(opts);
    }

    dragEnd() {
        //
        // console.log('MultiSelectMesh dragEnd')

        this.isDragging = false;
    }
}
