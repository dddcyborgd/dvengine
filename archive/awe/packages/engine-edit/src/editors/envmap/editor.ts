import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

import { envmaps } from "@oncyberio/engine/space/components/envmap/data";

import { Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from "three";

import Camera from "@oncyberio/engine/camera";

import emitter from "@oncyberio/engine/internal/engine-emitter";
import { EngineEvents } from "@oncyberio/engine/internal/engine-events";

import Scene from "@oncyberio/engine/internal/scene";

const envmapOpts = Object.values(envmaps);

const envmapTypes = ["scene", "image"];

// TODO: refactor
/** @internal */
export class EnvmapEditor extends Component3DEditor<any> {
  envMapMesh = null;

  _showHelper = false;

  get currentTab() {
    return this.data.options.type;
  }

  set currentTab(value) {
    if (value === "scene") {
      this.data.options.type = "scene";
      this.data.options.position ??= { x: 0, y: 0, z: 0 };
    } else if (value === "image") {
      this.data.options.type = "image";
      this.data.options.imageId ??= "studio";
    }
  }

  get customUpload() {
    if (
      this.data.options.type === "image" &&
      this.data.options.imageId === "custom"
    ) {
      return {
        id: "custom",
        path: this.data.options.imagePath,
        format: this.data.options.imageFormat,
      };
    }

    return null;
  }

  set customUpload(value) {
    if (value?.path) {
      this.data.options = {
        type: "image",
        imageId: "custom",
        imagePath: value.path,
        imageFormat: value.format,
      };
    } else {
      this.data.options = { type: "image", imageId: "studio" };
    }
  }

  gui: GuiGroupDescriptor = {
    type: "group",
    children: {
      envmapType: {
        type: "folder",
        label: "Type",
        defaultOpen: true,
        children: {
          envmapType: {
            mode: "buttons",
            type: "select",
            label: "Type",
            value: [this, "currentTab"],
            items: envmapTypes,
          },
          position: {
            type: "group",
            label: "Position",
            slug: "position",
            visible: () => this.data.options.type === "scene",
            children: {
              position: {
                type: "xyz",
                label: "Position",
                slug: "position",
                value: [this.data, "options", "position"],
              },
            },
          },

          copy: {
            type: "button",
            label: "Copy Camera Position",
            skipLabel: true,
            onAction: (e) => {
              if (e.disabled) return;
              e.target.innerText = "Copied!";
              e.disabled = true;

              setTimeout(() => {
                e.target.innerText = "Copy Camera Position";
                e.disabled = false;
              }, 1000);
              const position = Camera.current.position;

              this.data.options.position = {
                x: position.x,
                y: position.y,
                z: position.z,
              };
            },
          },

          imageOpts: {
            type: "group",
            label: "Image",
            visible: () => this.data.options.type === "image",
            children: {
              image: {
                type: "select",
                label: "Image",
                value: [this.data, "options", "imageId"],
                mode: "slider",
                items: envmapOpts,
              },
            },
          },
          helper: {
            type: "group",
            label: "Helper",
            children: {
              helper: {
                type: "checkbox",
                label: "Show Helper",
                value: [this, "showHelper"],
              },
            },
          },
          customImage: {
            // TODO : field for uploading a custom image, should NOT display preset image above in it
            visible: () => this.data.options.type === "image",
            type: "image",
            label: "Custom Image",
            value: [this, "customUpload"],
            accept: "image/png, image/jpeg, image/jpg, .hdr",
            acceptLabel: ".png .jpg .hdr",
          },
        },
      },
    },
  };

  getGUI(): GuiGroupDescriptor {
    return this.gui;
  }

  showSelected(isSelected: boolean): void {
    //
    super.showSelected(isSelected);

    this.showHelper = isSelected;
  }

  get showHelper() {
    return this._showHelper;
  }

  set showHelper(value) {
    this._showHelper = value;

    this.updateHelper();
  }

  updateHelper() {
    const envMap = this.component.space.envMap;

    if (envMap == null) return;

    if (this.envMapMesh == null) {
      this.envMapMesh = new Mesh(
        new SphereGeometry(3, 32, 32),
        new MeshStandardMaterial({
          metalness: 1,
          roughness: 0,
          depthTest: false,
          transparent: true,
        }),
      );

      this.envMapMesh.frustumCulled = false;

      this.envMapMesh.renderOrder = Infinity;

      Scene.add(this.envMapMesh);

      this.addEvents();
    }

    // @ts-ignore
    this.envMapMesh.material.envMap = envMap.texture ?? this.component._envMap;

    // console.log("envMap editor", envMap.texture, this.component._envMap);

    this.envMapMesh.material.needsUpdate = true;

    // this.envMapMesh.needsUpdate = true

    this.envMapMesh.visible = this.showHelper;
  }

  cwd = new Vector3();

  updateHelperPosition = () => {
    if (this.envMapMesh) {
      Camera.current.getWorldDirection(this.cwd);

      this.cwd.multiplyScalar(20);

      this.cwd.add(Camera.current.position);

      this.envMapMesh.position.set(this.cwd.x, this.cwd.y, this.cwd.z);

      this.updateHelper();
    }
  };

  addEvents() {
    emitter.on(EngineEvents.LATE_UPDATE, this.updateHelperPosition);
  }

  removeEvents() {
    emitter.off(EngineEvents.LATE_UPDATE, this.updateHelperPosition);
  }

  dispose() {
    this.removeEvents();

    if (this.envMapMesh) {
      Scene.remove(this.envMapMesh);

      this.envMapMesh.geometry.dispose();

      this.envMapMesh.material.dispose();

      this.envMapMesh = null;
    }
  }
}
