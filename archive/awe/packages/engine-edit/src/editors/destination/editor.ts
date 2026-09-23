import { EngineEvents } from "@oncyberio/engine/internal/engine-events";
import emitter from "@oncyberio/engine/internal/engine-emitter";
import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { DestinationComponent } from "@oncyberio/engine/space/components/destination/destination-component";

import { Intersection, Mesh, Vector3, Euler, PlaneGeometry } from "three";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { getOrCreateEditor } from "../editor-registry";

/** @internal */
export class DestinationComponentEditor extends Component3DEditor<DestinationComponent> {
  gui: GuiGroupDescriptor = {
    type: "group",
    children: {
      destination: {
        type: "folder",
        label: "Destination",
        defaultOpen: true,
        children: {
          file: {
            type: "file",
            label: "Destination File",
            value: [this, "destinationUrl"],
            accept: ".glb",
            acceptLabel: ".glb (100MB max)",
            maxSize: 100,
            prompt: "Upload GLB",
            action: "upload-optimize",
            format: {
              format: (url: string) => (url ? { path: url } : null),
              parse: (val: any) => {
                // If optimized data is present, return the full optimized object
                if (val?.optimized) {
                  return val.optimized;
                }
                return val?.path ?? null;
              },
            },
          },
        },
      },
    },
  };

  _mesh = new Mesh(new PlaneGeometry(1, 1));

  get destinationUrl() {
    return this.data.paths?.high ?? null;
  }

  set destinationUrl(
    value: string | { high: string; low: string; low_compressed: string } | null
  ) {
    if (typeof value === "object" && value !== null && "high" in value) {
      // Optimized paths object
      this.data.paths = {
        high: value.high,
        mid: value.low,
        low: value.low_compressed,
      };
    } else {
      // Simple URL string (fallback)
      const url = (value as string) ?? "";
      this.data.paths = { high: url, mid: url, low: url };
    }
  }

  init() {
    //
    this._mesh.layers.disableAll();

    this.updatePlaceholders();

    this.addEvents();

    // Clear stale placeholderId metadata when destination reloads
    this._dataWrapper.onChange(() => {
      this.clearPlaceholderReferences();
    });
  }

  private clearPlaceholderReferences(): void {
    this.component.container?.forEach((c) => {
      const editor = getOrCreateEditor(c);
      if (editor?._dataWrapper?.getMeta("placeholderId")) {
        editor._dataWrapper.setMeta("placeholderId", null);
      }
    });
  }

  addEvents() {
    emitter.on(EngineEvents.COMPONENT_ADDED, this.updatePlaceholders);
    emitter.on(EngineEvents.COMPONENT_REMOVED, this.updatePlaceholders);
  }

  removeEvents() {
    emitter.off(EngineEvents.COMPONENT_ADDED, this.updatePlaceholders);
    emitter.off(EngineEvents.COMPONENT_REMOVED, this.updatePlaceholders);
  }

  getGUI(): GuiGroupDescriptor {
    return this.gui;
  }

  getDetailMeshes() {
    //
    const placeholders = this.component.placeholders;

    if (!placeholders || Object.keys(placeholders).length === 0) {
      return null;
    }

    return Object.values(placeholders).filter((mesh) => mesh.visible);
  }

  private _artTargets = {
    image: true,
    video: true,
  };

  isPlaceholderTarget(instance: Component3D) {
    //
    return (
      instance.info.is2D ||
      // artwork type
      (instance.data.type === "script_tnUwAhna92NSq-EX2x3UJ" &&
        this._artTargets[instance.data["artworkType"]])
    );
  }

  getPlaceholderData(instance: Component3D) {
    //
    if (this._currentDetailMesh == null) return null;
    if (!this.isPlaceholderTarget(instance)) return null;

    const scale = this.component.artworkScale;

    const hasCustomScale =
      instance.scale.x !== 1 ||
      instance.scale.y !== 1 ||
      instance.scale.z !== 1;

    return {
      id: this._currentDetailMesh.placeholderId,
      position: this._currentDetailMesh.position.clone(),
      rotation: this._currentDetailMesh.rotation.clone(),
      scale: hasCustomScale ? null : new Vector3().setScalar(scale),
    };
  }

  _currentDetailMesh = null;

  _setCurrentDetailMesh(mesh) {
    //
    if (this._currentDetailMesh == mesh) return;

    this._currentDetailMesh?.setSelected(false);

    this._currentDetailMesh = mesh;

    this._currentDetailMesh?.setSelected(true);
  }

  onDetailMeshClicked(mesh: Mesh, intersect: Intersection<Mesh>): void {
    console.log("onDetailMeshClicked", mesh, intersect);
    this._setCurrentDetailMesh(mesh);
    Component3DEditor.requestAdd({ group: "owned" });
  }

  onDetailMeshMouseEnter(mesh: Mesh, intersect: Intersection<Mesh>): void {}

  onDetailMeshMouseLeave(mesh: Mesh): void {
    //
    if (mesh.parent == this._currentDetailMesh) return;
  }

  getSelectionMesh() {
    //
    return this._mesh;
  }

  onSelectedChanged(b) {
    if (b == true) {
      // this.component._spline.displaySectors();
    } else {
      // this.component._spline.removeSectors();

      this._setCurrentDetailMesh(null);
    }
  }

  updatePlaceholders = () => {
    //
    setTimeout(() => {
      //
      if (this.component.wasDisposed) return;

      const placeholders = this.component.placeholders;

      if (!placeholders || Object.keys(placeholders).length === 0) {
        return;
      }

      Object.keys(placeholders).forEach((id) => {
        //
        const mesh = placeholders[id];

        const free =
          this.component.container.find(
            (c) =>
              c.componentId == id ||
              getOrCreateEditor(c)?._dataWrapper?.getMeta("placeholderId") == id
          ) == null;

        mesh.visible = free;
      });
    }, 0);
  };

  dispose() {
    //
    this.removeEvents();

    this._setCurrentDetailMesh(null);

    super.dispose();
  }
}
