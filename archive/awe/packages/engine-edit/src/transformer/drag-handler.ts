import { toXYZ } from "../utils/three";

import { Object3D } from "three";

import emitter from "@oncyberio/engine/internal/engine-emitter";

import Events from "../editor-events";
import { TransformChange } from "../types";
import type { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { getOrCreateEditor } from "../editors/editor-registry";
import { deepEqual } from "@oncyberio/engine/internal/utils/js";

export class DragHandler {
    objects: Component3D[] = [];

    initCoords = [];

    initTransformData = [];

    private _initCoordsMap = new WeakMap();

    private _getObjectInitCoords(object) {
        //
        let coords = this._initCoordsMap.get(object);

        if (!coords) {
            coords = {
                position: object.position.clone(),
                quaternion: object.quaternion.clone(),
                rotation: object.rotation.clone(),
                // scale: object.scale.clone(),
            };

            this._initCoordsMap.set(object, coords);

            return coords;
        }

        coords.position.copy(object.position);
        coords.quaternion.copy(object.quaternion);
        coords.rotation.copy(object.rotation);

        return coords;
    }

    dragStart() {
        //
        this.initCoords = [];

        this.initTransformData = [];

        this.objects.forEach((object) => {
            //
            const startCoords = this._getObjectInitCoords(object);
            this.initCoords.push(startCoords);

            const startTransformData = structuredClone(
                object.getTransformData()
            );

            this.initTransformData.push(startTransformData);

            // @ts-ignore
            object.dragStart?.(MULTI_OPTS);
        });

        emitter.emit(Events.COMPONENTS_COORDS_CHANGED_STARTED);

        this.objects.forEach((object) => {
            getOrCreateEditor(object)?.showSelected(false);
            getOrCreateEditor(object)?.toggleHighlighted(false);
        });
    }

    dragEnd() {
        //

        this.objects.forEach((object) => {
            // @ts-ignore
            object.dragEnd?.(MULTI_OPTS);
        });

        let changes: TransformChange[] = [];

        this.objects.forEach((object, index) => {
            //
            const data = structuredClone(object.getTransformData());

            const startData = structuredClone(this.initTransformData[index]);

            if (
                data.position &&
                startData.position &&
                deepEqual(data.position, startData.position)
            ) {
                //
                delete data.position;
                delete startData.position;
            }

            if (
                data.rotation &&
                startData.rotation &&
                deepEqual(data.rotation, startData.rotation)
            ) {
                //
                delete data.rotation;
                delete startData.rotation;
            }

            if (
                data.scale &&
                startData.scale &&
                deepEqual(data.scale, startData.scale)
            ) {
                //
                delete data.scale;
                delete startData.scale;
            }

            // console.log("dragEnd", data);

            changes.push({
                targetMesh: object as any,
                changes: data,
                undo: startData,
            });
        });

        emitter.emit(Events.COMPONENTS_COORDS_CHANGED, { changes });

        this.objects.forEach((object) => {
            getOrCreateEditor(object)?.showSelected(true);
        });
    }
}
