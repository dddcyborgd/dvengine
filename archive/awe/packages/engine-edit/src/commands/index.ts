import {
  getDefaultAssetPosition,
  getDefaultAssetRotation,
  offsetHorz,
  toXYZ,
} from "../utils/three";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { Camera } from "@oncyberio/engine/index";
import { getCurrentSpace } from "@oncyberio/engine/internal";
import { ModelComponent } from "@oncyberio/engine/space/components/model/model-component";
import * as THREE from "three";
import { Box3, Object3D, Vector3, Matrix4, Euler } from "three";
import emitter from "@oncyberio/engine/internal/engine-emitter";
import Events from "../editor-events";
import { ComponentLock } from "../types";
import type { EngineEdit } from "..";
import { getOrCreateEditor } from "../editors/editor-registry";

const mat4 = new Matrix4();

export class EditCommands {
  //
  constructor(public editor: EngineEdit) {}

  async addComponent(data: any, opts: { abort?: AbortSignal } = {}) {
    const space = getCurrentSpace();
    const { abort } = opts;

    const instance = await space.components._createInternal(data, {
      abort,
      persistent: true,
    });

    this.adjustInitialScale(instance);

    return instance;
  }

  adjustInitialScale(instance: Component3D) {
    if (instance?.data?.type === "model") {
      this.adjustModelProps(instance as ModelComponent);
    }
  }

  async duplicateComponents(components: Component3D[], offset?: boolean) {
    //
    const space = getCurrentSpace();

    const instances = await space.components._duplicateInternal(components, {
      persistent: true,
    });

    if (offset) {
      let horzOffset = 4;

      if (instances.length === 1) {
        let single = instances[0];

        const size = single.getDimensions();

        horzOffset = Math.max(size.x, size.z) + 1;
      }

      instances.forEach((instance) => {
        offsetHorz(instance.position, Camera.current, horzOffset);
        instance.syncWithTransform();
      });
    }

    return instances;
  }

  changeParent(component: Component3D, parent: Object3D) {
    //
    const parentId = parent instanceof Component3D ? parent.data?.id : null;

    if (component.data.parentId == parentId) return false;

    // adjust the component's transform to be relative to the group
    const groupWMInv = mat4.copy(parent.matrixWorld).invert();

    const newLocalMat = groupWMInv.multiply(component.matrixWorld);

    newLocalMat.decompose(
      component.position,
      component.quaternion,
      component.scale
    );

    parent.add(component);

    getOrCreateEditor(component)._dataWrapper.set("parentId", parentId ?? null);

    component.syncWithTransform();

    emitter.emit(Events.COMPONENT_PARENT_CHANGED, { component, parent });

    return true;
  }

  async createGroup(
    children: Component3D[],
    opts: { center?: boolean; parent?: Component3D; data?: any }
  ) {
    //
    let prevStates = children.map((child) => {
      //
      return {
        parent: child.parent,
        position: (child.data as any).position,
        parentId: child.data.parentId,
      };
    });

    let group: Component3D;

    try {
      const data: any = { type: "group", ...(opts.data ?? {}) };

      if (opts.parent) {
        //
        data.parentId = opts.parent.data.id;
      }

      group = await this.addComponent(data);

      children.forEach((child) => {
        //
        group.add(child);

        getOrCreateEditor(child)._dataWrapper.set("parentId", group.data.id);
      });

      if (opts.center) {
        //
        this.centerGroup(group);
      }

      return group;
      //
    } catch (e) {
      //
      prevStates.forEach((state, i) => {
        //
        const child = children[i];

        if (state.parent) {
          //
          state.parent.add(child);
          //
        } else if (child.parent) {
          //
          child.parent.remove(child);
        }

        getOrCreateEditor(child)._dataWrapper.set("position", state.position);

        getOrCreateEditor(child)._dataWrapper.set("parentId", state.parentId);
      });

      group?.destroy();

      throw e;
    }
  }

  async removeGroup(group: Component3D) {
    //
    const parent = group.parent;

    const children = group.childComponents;

    children.forEach((child) => {
      //
      this.changeParent(child, parent);
    });

    group.destroy();
  }

  centerGroup(group: Component3D) {
    //
    group.updateWorldMatrix(true, true);

    const box = group.getBBox();

    const center = box.getCenter(new Vector3());

    this._setWorldPosition(group, center);

    group.syncWithTransform();

    group.childComponents.forEach((child) => {
      //
      const worldPos = child.getWorldPosition(new Vector3());

      worldPos.sub(center);

      this._setWorldPosition(child, worldPos);

      child.syncWithTransform();
    });

    // @ts-ignore
    getOrCreateEditor(group)?.updateBBox();
  }

  private _setWorldPosition(component: Component3D, pos: Vector3) {
    //
    component.updateWorldMatrix(true, true);

    pos.applyMatrix4(component.parent.matrixWorld.clone().invert());

    component.position.set(pos.x, pos.y, pos.z);

    component.syncWithTransform();
  }

  changeComponentLock(component: Component3D, lock: ComponentLock) {
    //
    const editor = getOrCreateEditor(component);
    if (editor) editor.data.lock = structuredClone(lock) as any;

    emitter.emit(Events.COMPONENT_LOCK_CHANGED, { component, lock });
  }

  adjustInitialProps(instance: Component3D) {
    if (instance.info.draggable) {
      const { position: pos } = this.getDefaultAssetPlacement(instance);

      instance.position.set(pos.x, pos.y, pos.z);
    }

    instance.syncWithTransform();
  }

  private adjustModelProps(instance: ModelComponent) {
    const initScale = this.getInitModelScale(instance);

    instance.scale.set(initScale, initScale, initScale);
  }

  getDefaultAssetPlacement(instance?: Component3D) {
    //
    const selection = this.editor.selection.getSingleSelection();

    if (selection) {
      //
      const placeholderData = getOrCreateEditor(selection)?.getPlaceholderData(instance);

      if (placeholderData) {
        //
        return placeholderData;
      }
    }

    const pos = getDefaultAssetPosition(
      Camera.current as THREE.PerspectiveCamera,
      7
    );

    const rot = new Euler(0, 0, 0);

    return {
      id: null,
      position: toXYZ(pos),
      rotation: toXYZ(rot),
      scale: null,
    };
  }

  private getInitModelScale(model: ModelComponent) {
    const box = model.getBBox();

    const size = box.getSize(new Vector3());

    const maxSize = Math.max(size.x, size.y, size.z);

    let adjFactor = 2.8 / maxSize;

    return adjFactor;
  }

  dispose() {}
}
