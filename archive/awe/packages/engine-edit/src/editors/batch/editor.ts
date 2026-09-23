import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { BatchComponent } from "@oncyberio/engine/space/components/batch/batch-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";

import {
  Box3,
  Intersection,
  MeshBasicMaterial,
  BoxGeometry,
  Mesh,
  Vector3,
  Euler,
} from "three";
import { disposeObject3D } from "@oncyberio/engine/internal/utils/dispose";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";

const tmpPos = new Vector3();
const tmpEuler = new Euler();
const tmpScale = new Vector3();

/**
 * @internal
 */
export class BatchComponentEditor extends Component3DEditor<BatchComponent> {
  gui: GuiGroupDescriptor = {
    type: "group",
    children: {
      Preset: {
        type: "folder",
        label: "Components",
        children: {
          Preset: {
            type: "select",
            label: "Component",
            format: {
              parse: (id) => {
                if (id == null) return null;

                let component = this.component.container.byInternalId(id);

                let data = structuredClone(
                  component.getDataNode({ template: true })
                );

                data.originId = id;

                return data;
              },
              format(data) {
                return data?.originId || null;
              },
            },
            items: () =>
              this.getComponentsOptions((component) => {
                return component._canBatchDraw();
              }),
            nullable: true,
            value: [this.data, "preset"],
            onChange: (val) => {
              //
              this._setCurrentDetailMesh(null);

              if (val?.collider != null) {
                //
                this.data.collider = structuredClone(val.collider);
              }
            },
          },
          useOctree: {
            visible: () => this._canUseOctree(),
            type: "checkbox",
            label: "Use Octree",
            value: [this.data, "useOctreeSorting"],
          },

          displayDebug: {
            visible: () => this._canUseOctree(),
            type: "checkbox",
            label: "Display Debug on live Mode",
            value: [this.data, "debug"],
          },
        },
      },
    },
  };

  private _canUseOctree = () => {
    return this._component._baseInstancedWrapper != null;
  };

  _prevColliderData = null;

  init() {
    //
    this._prevColliderData = this.component.data.collider;

    this._dataWrapper.onChange((data) => {
      //
      if (this.component.data.collider != this._prevColliderData) {
        //
        this._prevColliderData = this.component.data.collider;

        this.data.preset.collider = structuredClone(
          this.component.data.collider
        );
      }
    });
  }

  async duplicateBase(): Promise<Component3D> {
    return await this.component._baseComponent.duplicate({
      transient: true,
    });
  }

  _selectionMesh = null;

  getSelectionMesh() {
    if (this._selectionMesh == null) {
      this._selectionMesh = new Mesh(
        new BoxGeometry(0.01, 0.01, 0.01),
        new MeshBasicMaterial({
          color: 0x00ff00,
          transparent: true,
          opacity: 0.5,
        })
      );
      this.component.add(this._selectionMesh);
    }
    return this._selectionMesh;
  }

  getGUI(): GuiGroupDescriptor {
    return this.gui;
  }

  _batchStarted = false;

  onBatchStart(opts) {
    //
    this._batchStarted = true;
  }

  async onBatchAdd(
    data: {
      position?: number[];
      rotation?: number[];
      scale?: number[];
      boundingBox?: Box3;
    } = {}
  ) {
    if (!this._batchStarted) {
      //
      console.error("Batch not started");
      return;
    }

    if (data.position == null) data.position = [0, 0, 0];
    if (data.rotation == null) data.rotation = [0, 0, 0];
    if (data.scale == null) data.scale = [1, 1, 1];

    const item = await this.component._addItem({
      position: tmpPos.fromArray(data.position),
      rotation: tmpEuler.set(
        data.rotation[0],
        data.rotation[1],
        data.rotation[2]
      ),
      scale: tmpScale.fromArray(data.scale),
      boundingBox: data.boundingBox,
    });

    return item;
  }

  async onBatchRemove(item) {
    if (!this._batchStarted) {
      //
      console.error("Batch not started");
      return;
    }

    await this.component._removeItem(item);
  }

  onBatchEnd(opts) {
    //
    if (!this._batchStarted) {
      //
      console.error("Batch not started");
      return;
    }

    this._batchStarted = false;

    const data = this._getInstancesData();

    this.dispatchDataChange({
      positions: data.positions,
      rotations: data.rotations,
      scales: data.scales,
    });
  }

  private _getInstancesData() {
    //
    const data = {
      positions: [],
      rotations: [],
      scales: [],
    };

    this.component._instances.forEach((instance, i) => {
      //
      let base = i * 3;

      data.positions[base] = instance.position.x;
      data.positions[base + 1] = instance.position.y;
      data.positions[base + 2] = instance.position.z;

      data.rotations[base] = instance.rotation.x;
      data.rotations[base + 1] = instance.rotation.y;
      data.rotations[base + 2] = instance.rotation.z;

      data.scales[base] = instance.scale.x;
      data.scales[base + 1] = instance.scale.y;
      data.scales[base + 2] = instance.scale.z;
    });

    return data;
  }

  getDetailMeshes() {
    //
    return this.component._instances.map((instance) => {
      //
      return instance.getCollisionMesh();
    });
  }

  _currentDetailMesh: Component3D = null;

  _setCurrentDetailMesh(mesh: Component3D) {
    //
    if (this._currentDetailMesh == mesh) return;

    if (this._currentDetailMesh) {
      this.detachTransformControls(this._currentDetailMesh);
    }

    this._currentDetailMesh = mesh;

    if (mesh == null) return;

    this.attachTransfomControls(mesh, {
      translate: true,
      rotate: true,
      scale: true,
      callbacks: {
        onDragStart: this.onDragStart,
        onDrag: this.onDrag,
        onDragEnd: this.onDragEnd,
      },
    });

    this.updateUI();
  }

  onDragStart = () => {};

  onDrag = () => {};

  onDragEnd = () => {
    //
    const data = this._getInstancesData();

    this.dispatchDataChange({
      positions: data.positions,
      rotations: data.rotations,
      scales: data.scales,
    });
  };

  onDetailMeshClicked(mesh: Mesh, intersect: Intersection<Mesh>): void {
    this._setCurrentDetailMesh(mesh.parent as Component3D);

    // this.updateUI();
  }

  onDetailMeshMouseEnter(mesh: Mesh, intersect: Intersection<Mesh>): void {
    // console.log("detail mouse enter ");
    // mesh.material.color.set(0x00ff00);
    // mesh.scale.set(2, 2, 2);
    //
    // if (mesh == this._currentDetailMesh) return;
  }

  onDetailMeshMouseLeave(mesh: Mesh): void {
    if (mesh.parent == this._currentDetailMesh) return;

    // mesh.scale.set(1, 1, 1);

    // mesh.material.color.set(0xff0000);

    // if (mesh == this._currentDetailMesh) return;
  }

  onSelectedChanged(b) {
    if (b == true) {
      // this.component._spline.displaySectors();
    } else {
      // this.component._spline.removeSectors();

      this._setCurrentDetailMesh(null);
    }
  }

  dispose() {
    //
    if (this._selectionMesh) {
      this.component.remove(this._selectionMesh);
      disposeObject3D(this._selectionMesh);
      this._selectionMesh = null;
    }

    this._setCurrentDetailMesh(null);

    super.dispose();
  }
}
