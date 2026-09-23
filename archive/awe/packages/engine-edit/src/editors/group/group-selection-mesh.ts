// @ts-check

import PipeLineMesh from "@oncyberio/engine/internal/pipeline/pipeline-mesh";
import {
    BoxGeometry,
    MeshBasicMaterial,
    Box3,
    Quaternion,
    Vector3,
    Matrix4,
} from "three";
import { GroupComponent } from "@oncyberio/engine/space/components/group/group-component";
import {
    DisposePipelinesMeshes,
    disposeThreeResources,
} from "@oncyberio/engine/internal/utils/dispose";
import emitter from "@oncyberio/engine/internal/engine-emitter";
import { EngineEvents } from "@oncyberio/engine/internal/engine-events";
import { getOrCreateEditor } from "../editor-registry";

/** @internal */
export class GroupSelectionMesh extends PipeLineMesh {
    //
    isDragging = false;

    _active = false;

    constructor(private group: GroupComponent) {
        super(
            new BoxGeometry(1, 1, 1),
            new MeshBasicMaterial({
                // visible: false,
                transparent: true,
                color: 0xff0000,
                opacity: 0.2,
                depthTest: false,
                depthWrite: false,
            })
        );

        this.visible = false;
    }

    _box = new Box3();
    _childBox = new Box3();
    _mat4 = new Matrix4();

    private _updateChildGroups() {
        //
        for (let i = 0; i < this.group.childComponents.length; i++) {
            //
            const child = this.group.childComponents[i];

            if (child instanceof GroupComponent) {
                //
                const selMesh =
                    getOrCreateEditor(child)?.getSelectionMesh() as GroupSelectionMesh;

                selMesh?.updateBBox?.();
            }
        }
    }

    updateBBox = () => {
        //
        this._updateChildGroups();

        this._box.makeEmpty();


        const invMatrix = this.group._matrixWorldInv;

        for (let i = 0; i < this.group.childComponents.length; i++) {
            //
            const child = this.group.childComponents[i];

            //
            const mesh =
                child instanceof GroupComponent
                    ? getOrCreateEditor(child)?.getSelectionMesh()
                    : child.getCollisionMesh();

            if (mesh) {
                //
                if (mesh.geometry.boundingBox == null) {
                    mesh.geometry.computeBoundingBox();
                }

                this._childBox.copy(mesh.geometry.boundingBox);

                const corner = new Vector3();

                // expand this._box to include the 8 corners of the child's bounding box

                for (let i = 0; i < 8; i++) {
                    //
                    corner.set(
                        i & 1 ? this._childBox.min.x : this._childBox.max.x,
                        i & 2 ? this._childBox.min.y : this._childBox.max.y,
                        i & 4 ? this._childBox.min.z : this._childBox.max.z
                    );

                    corner
                        .applyMatrix4(mesh.matrixWorld)
                        .applyMatrix4(invMatrix);

                    this._box.expandByPoint(corner);
                }
            }
        }

        this._box.min.addScalar(-0.01);
        this._box.max.addScalar(0.01);

        this._box.getCenter(this.position);

        this._box.getSize( this.scale );

        this.scale.clampScalar(1, Infinity)

        this.updateMatrixWorld();
    };

    addEvents() {
        //
        emitter.on(EngineEvents.LATE_UPDATE, this.updateBBox);
    }

    removeEvents() {
        //
        emitter.off(EngineEvents.LATE_UPDATE, this.updateBBox);
    }

    get active() {
        //
        return this._active;
    }

    set active(value) {
        //
        if (this._active == value) return;

        this._active = value;

        this.visible = value;

        if (value) {
            this.addEvents();
        } else {
            this.removeEvents();
        }
    }

    _onDispose() {
        //
        disposeThreeResources(this);
    }
}
