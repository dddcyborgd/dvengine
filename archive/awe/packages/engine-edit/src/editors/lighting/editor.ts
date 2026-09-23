import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { disposeMesh } from "@oncyberio/engine/internal/utils/dispose";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { Mesh, BoxGeometry, MeshBasicMaterial } from "three";

/** @internal */
export class LightingEditor extends Component3DEditor<any> {
  _showHelper = false;

  gui: GuiGroupDescriptor = {
    type: "group",
    children: {
      enabled: {
        type: "folder",
        label: "Enable",
        children: {
          enabled: {
            type: "checkbox",
            value: [this.data, "enabled"],
            label: "Enabled",
          },
        },
      },
      lightingOpts: {
        type: "folder",
        label: "Light",
        visible: () => this.data.enabled,
        children: {
          intensity: {
            type: "number",
            value: [this.data, "intensity"],
            min: 0,
            max: 1,
            step: 0.01,
          },
          size: {
            type: "number",
            value: [this.data, "size"],
            min: 100,
            max: 4000,
            step: 0.01,
          },

          bias: {
            type: "number",
            value: [this.data, "bias"],
            min: -0.1,
            max: 0.1,
            step: 0.001,
          },

          near: {
            type: "number",
            value: [this.data, "near"],
            min: 0,
            max: 3000,
            step: 1,
          },
          far: {
            type: "number",
            value: [this.data, "far"],
            min: 0,
            max: 3000,
            step: 1,
          },
          helper: {
            type: "checkbox",
            label: "Show Helper",
            value: [this, "showHelper"],
          },
        },
      },
      position: {
        type: "folder",
        label: "Position",
        slug: "position",
        visible: () => this.data.enabled,
        children: {
          position: {
            type: "xyz",
            value: [this.data, "lightPosition"],
            step: 0.2,
          },
        },
      },
      rotation: {
        type: "folder",
        label: "Rotation",
        slug: "rotation",
        visible: () => this.data.enabled,
        children: {
          direction: {
            type: "xyz",
            value: [this.data, "lightDirection"],
            inline: false,
            min: -1,
            max: 1,
            step: 0.01,
          },
        },
      },
    },
  };

  constructor(component: Component3D) {
    super(component);
  }

  getGUI(): GuiGroupDescriptor {
    return this.gui;
  }

  _selectionMesh: Mesh = null;

  getSelectionMesh() {
    if (!this._selectionMesh) {
      this._selectionMesh = new Mesh(
        new BoxGeometry(1, 1, 1),
        new MeshBasicMaterial({ color: 0xff0000, wireframe: true }),
      );

      this._selectionMesh.visible = false;

      this.component.add(this._selectionMesh);
    }

    return this._selectionMesh;
  }

  showSelected(isSelected: boolean): void {
    super.showSelected(isSelected);

    this.showHelper = isSelected;
  }

  get showHelper() {
    return this.component._lighting.showHelper;
  }

  set showHelper(value) {
    this.component._lighting.showHelper = value;
  }

  dispose() {
    if (this._selectionMesh) {
      disposeMesh(this._selectionMesh);

      this._selectionMesh = null;
    }

    super.dispose();
  }
}
