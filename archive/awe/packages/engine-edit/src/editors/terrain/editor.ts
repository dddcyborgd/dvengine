import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { Component3DEditor } from "../../component-editor/ui-editor";
import {
  MODES,
  SHADERS,
  TERRAIN_SHAPES,
  textureOpts,
  presetImages,
} from "@oncyberio/engine/space/components/terrain/data";
import { getRestrictedColliderGUI } from "../../component-editor/ui/collider-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

const modeOptions = Object.keys(MODES);

const shaderOptions = Object.keys(SHADERS);

const shapeOptions = Object.keys(TERRAIN_SHAPES);

/**
 * @internal
 *
 * Studio editor for the terrain component. Not part of the public API.
 */
export class TerrainEditor extends Component3DEditor<any> {
  //
  defaultColliderUI = false;

  get textureOptsCustom() {
    if (this.data.textureOpts.id === "custom") {
      //
      return this.data.textureOpts;
    }

    return null;
  }

  set textureOptsCustom(value) {
    //
    if (value?.path) {
      //
      this.data.textureOpts = value;
    } else {
      this.data.textureOpts = presetImages.wooden;
    }
  }

  get textureSideOptsCustom() {
    if (
      this.data.mode === MODES.shader &&
      this.data.shader == SHADERS.biplanar &&
      this.data.textureSideOpts.id === "custom"
    ) {
      //
      return this.data.textureSideOpts;
    }

    return null;
  }

  set textureSideOptsCustom(value) {
    //
    if (value?.path) {
      //
      this.data.textureSideOpts = value;
    } else {
      this.data.textureSideOpts = presetImages.wooden;
    }
  }

  gui: GuiGroupDescriptor = {
    type: "group",
    // TODO : retrieve presets from terrain
    children: {
      mode: {
        type: "folder",
        label: "Mode",
        children: {
          shape: {
            type: "select",
            label: "Shape",
            value: [this.data, "shape"],
            items: shapeOptions,
          },

          visibleOnOcclusion: {
            type: "checkbox",
            label: "Visible on Occlusion",
            value: [this.data, "visibleOnOcclusion"],
          },
          castShadow: {
            type: "checkbox",
            label: "Cast Shadow",
            value: [this.data, "castShadow"],
          },
          receiveShadow: {
            type: "checkbox",
            label: "Receive Shadow",
            value: [this.data, "receiveShadow"],
          },

          innerRadius: {
            visible: () => this.data.shape === TERRAIN_SHAPES.circle,
            type: "number",
            step: 0.001,
            min: 0,
            max: 0.5,
            value: [this.data, "innerRadius"],
          },
          mode: {
            type: "select",
            items: modeOptions,
            mode: "buttons",
            label: "Mode",
            value: [this.data, "mode"],
          },

          shaderOptions: {
            type: "select",
            label: "Shader",
            value: [this.data, "shader"],
            items: shaderOptions,
            visible: () => this.data.mode === MODES.shader,
          },

          texture: {
            type: "group",
            label: "Texture",
            visible: () =>
              this.data.mode === MODES.texture ||
              (this.data.mode == MODES.shader &&
                this.data.shader == SHADERS.biplanar),
            children: {
              image: {
                type: "select",
                mode: "slider",
                label: "Image",
                value: [this.data, "textureOpts"],
                items: textureOpts,
              },
              tiles: {
                type: "number",
                step: 0.5,
                min: 1,
                max: 500,
                value: [this.data, "tiles"],
              },
              color: {
                type: "color",
                label: "Tint",
                value: [this.data, "color"],
              },
              customImage: {
                type: "image",
                label: "Custom Image",
                value: [this, "textureOptsCustom"],
                // value: [this.data, "textureOpts"],
                action: "upload",
                accept: "image/png, image/jpeg, image/jpg",
                acceptLabel: ".png .jpg",
              },
            },
          },

          shader: {
            type: "group",
            visible: () => this.data.mode === MODES.shader,
            children: {
              imageSideOpts: {
                type: "group",
                label: "Image",
                visible: () => this.data.shader == SHADERS.biplanar,
                children: {
                  image: {
                    type: "select",
                    label: "Side Image",
                    value: [this.data, "textureSideOpts"],
                    items: textureOpts,
                    mode: "slider",
                  },
                  customImage: {
                    type: "image",
                    label: "Custom Image",
                    value: [this, "textureSideOptsCustom"],
                    action: "upload",
                    accept: "image/png, image/jpeg, image/jpg",
                    acceptLabel: ".png .jpg",
                  },
                },
              },
              griddiv: {
                type: "number",
                label: "Spacing",
                visible: () => this.data.shader == SHADERS.grid,
                step: 1,
                min: 10,
                max: 200,
                value: [this.data, "griddiv"],
              },

              lineWidth: {
                type: "number",
                label: "Line Width",
                visible: () => this.data.shader == SHADERS.grid,
                step: 0.01,
                min: 0,
                max: 1,
                value: [this.data, "lineWidth"],
              },

              color: {
                type: "color",
                label: "Grid line tint",
                value: [this.data, "color"],
              },

              gridColor: {
                visible: () => this.data.shader == SHADERS.grid,
                type: "color",
                label: "Grid Color",
                value: [this.data, "gridColor"],
              },

              edgeTransition: {
                label: "Edge Transition",
                type: "number",
                visible: () => this.data.shader == SHADERS.biplanar,
                step: 0.1,
                min: 0.01,
                max: 8,
                value: [this.data, "edgeTransition"],
              },

              smoothAngle: {
                label: "Smooth Angle",
                type: "number",
                visible: () => this.data.shader == SHADERS.biplanar,
                step: 0.01,
                min: 0,
                max: 1,
                value: [this.data, "smoothAngle"],
              },

              noTileDisplacement: {
                label: "No Tile Displacement",
                type: "number",
                visible: () => this.data.shader == SHADERS.biplanar,
                step: 0.01,
                min: 0,
                max: 50,
                value: [this.data, "noTileDisplacement"],
              },
            },
          },

          color: {
            type: "color",
            label: "Color",
            value: [this.data, "color"],
            visible: () => this.data.mode === MODES.color,
          },
        },
      },

      noise: {
        type: "folder",
        label: "Noise",
        children: {
          noise: {
            type: "checkbox",
            label: "Enabled",
            value: [this.data, "noiseEnabled"],
          },
          noiseOptions: {
            type: "group",
            visible: () => this.data.noiseEnabled,
            children: {
              definition: {
                type: "number",
                step: 1,
                min: 10,
                max: 200,
                value: [this.data, "definition"],
              },

              smoothCenter: {
                type: "number",
                step: 0.01,
                min: 0,
                max: 1,
                value: [this.data, "smoothCenter"],
              },
              smoothLength: {
                type: "number",
                step: 0.01,
                min: 0,
                max: 1,
                value: [this.data, "smoothLength"],
              },
              islandSmooth: {
                type: "number",
                step: 0.01,
                min: 0,
                max: 1,
                value: [this.data, "islandSmooth"],
              },
              islandLength: {
                type: "number",
                step: 0.01,
                min: 0,
                max: 1,
                value: [this.data, "islandLength"],
              },
              seed: {
                type: "number",
                step: 1,
                min: 0,
                max: 65536,
                value: [this.data, "seed"],
              },
              noiseDomain: {
                type: "number",
                step: 0.1,
                min: 0.1,
                max: 10,
                value: [this.data, "noiseDomain"],
              },
            },
          },
        },
      },

      transform: getTransformUI(this),

      // shader: {
      //     type: "folder",
      //     label: "Shader",
      //     visible: () => this.data.mode !== MODES.color,
      //     children: {
      //         shader: {
      //             type: "group",
      //             visible: () => this.data.mode === MODES.shader,
      //             children: {
      //                 color: {
      //                     type: "select",
      //                     label: "Shader",
      //                     value: [this.data, "shader"],
      //                     items: shaderOptions,
      //                 },
      //                 griddiv: {
      //                     type: "number",
      //                     visible: () =>
      //                         this.data.mode === MODES.shader &&
      //                         this.data.shader == SHADERS.grid,
      //                     step: 1,
      //                     min: 10,
      //                     max: 200,
      //                     value: [this.data, "griddiv"],
      //                 },
      //                 edgeTransition: {
      //                     type: "number",
      //                     visible: () =>
      //                         this.data.mode === MODES.shader &&
      //                         this.data.shader == SHADERS.biplanar,
      //                     step: 0.1,
      //                     min: 0.01,
      //                     max: 8,
      //                     value: [this.data, "edgeTransition"],
      //                 },
      //                 smoothAngle: {
      //                     type: "number",
      //                     visible: () =>
      //                         this.data.mode === MODES.shader &&
      //                         this.data.shader == SHADERS.biplanar,
      //                     step: 0.01,
      //                     min: 0,
      //                     max: 1,
      //                     value: [this.data, "smoothAngle"],
      //                 },
      //                 noTileDisplacement: {
      //                     type: "number",
      //                     visible: () =>
      //                         this.data.mode === MODES.shader &&
      //                         this.data.shader == SHADERS.biplanar,
      //                     step: 0.01,
      //                     min: 0,
      //                     max: 50,
      //                     value: [this.data, "noTileDisplacement"],
      //                 },
      //                 imageSideOpts: {
      //                     type: "group",
      //                     label: "Image",
      //                     visible: () =>
      //                         this.data.mode == MODES.shader &&
      //                         this.data.shader == SHADERS.biplanar,
      //                     children: {
      //                         image: {
      //                             type: "select",
      //                             label: "Side Image",
      //                             value: [this.data, "textureSideOpts"],
      //                             items: textureOpts,
      //                         },
      //                         customImage: {
      //                             visible: () =>
      //                                 this.data.textureSideOpts.id ===
      //                                 "custom",
      //                             type: "image",
      //                             label: "Custom Image",
      //                             value: [this.data, "textureSideOpts"],
      //                             action: "upload",
      //                             accept: "image/png, image/jpeg, image/jpg",
      //                         },
      //                     },
      //                 },
      //             },
      //         },

      //         texture: {
      //             type: "group",
      //             label: "Texture",
      //             visible: () =>
      //                 this.data.mode === MODES.texture ||
      //                 (this.data.mode == MODES.shader &&
      //                     this.data.shader == SHADERS.biplanar),
      //             children: {
      //                 tiles: {
      //                     type: "number",
      //                     step: 0.5,
      //                     min: 1,
      //                     max: 500,
      //                     value: [this.data, "tiles"],
      //                 },
      //                 image: {
      //                     type: "select",
      //                     label: "Image",
      //                     value: [this.data, "textureOpts"],
      //                     items: textureOpts,
      //                 },
      //                 customImage: {
      //                     visible: () =>
      //                         this.data.textureOpts.id === "custom",
      //                     type: "image",
      //                     label: "Custom Image",
      //                     value: [this.data, "textureOpts"],
      //                     action: "upload",
      //                     accept: "image/png, image/jpeg, image/jpg",
      //                 },
      //             },
      //         },
      //     },
      // },

      collider: getRestrictedColliderGUI(this),
    },
  };

  toggleHighlighted(val: boolean) {
    return;
  }

  getGUI(): GuiGroupDescriptor {
    // this.gui.children.mode.children.color.label =
    //     this.data.mode !== "color" ? "Tint" : "Color";
    return this.gui;
  }
}
