import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { Component3DEditor } from "../../component-editor/ui-editor";
import {
  LUTMAPS,
  POST_PROCESSINGS,
  POST_TYPES,
} from "@oncyberio/engine/space/components/postprocessing/data";

const postproOpts = [
  { id: POST_TYPES.BLOOM, name: "Bloom" },
  { id: POST_TYPES.LOOK_UP_TABLE, name: "Look Up Table" },
  { id: POST_TYPES.TRIPPY, name: "Trippy" },
  { id: POST_TYPES.TV, name: "Television Glitch" },
];

const lutmapOpts = Object.values(LUTMAPS);

/** @internal */
export class PostProcessingEditor extends Component3DEditor<any> {
  gui: GuiGroupDescriptor | null = null;

  get customUpload() {
    if (
      this.data.postProType === POST_TYPES.LOOK_UP_TABLE &&
      this.data.lutOpts.image.id === "custom"
    ) {
      return this.data.lutOpts.image;
    }

    return null;
  }

  set customUpload(value) {
    //
    if (value?.path) {
      this.data.postProType = POST_TYPES.LOOK_UP_TABLE;
      this.data.lutOpts.image = value;
    } else {
      this.data.lutOpts.image = LUTMAPS.kodak;
    }
  }

  constructor(component: Component3D) {
    super(component);

    let bloomMeta = {};

    Object.keys(POST_PROCESSINGS.Bloom.opts).forEach((key) => {
      if (key == "color") {
        bloomMeta[key] = {
          type: "color",
          value: [this.data, "bloomOpts", key],
        };
      } else {
        bloomMeta[key] = {
          type: "number",
          value: [this.data, "bloomOpts", key],
          min: 0,
          max: 1,
          step: 0.01,
        };
      }
    });

    const meta = {
      opts: {
        type: "folder",
        label: "Style",
        defaultOpen: true,
        children: {
          enabled: {
            type: "checkbox",
            value: [this.data, "enabled"],
            label: "Enabled",
          },
          group: {
            visible: () => this.data.enabled,
            type: "group",
            children: {
              postProType: {
                type: "select",
                name: "Effect",
                items: postproOpts,
                mode: "list",
                value: [this.data, "postProType"],
              },
              bloomOpts: {
                type: "group",
                visible: () => this.data.postProType == POST_TYPES.BLOOM,
                children: bloomMeta,
              },
              lutOpts: {
                type: "group",
                visible: () =>
                  this.data.postProType == POST_TYPES.LOOK_UP_TABLE,
                children: {
                  texture: {
                    type: "select",
                    items: lutmapOpts,
                    mode: "slider",
                    label: "Texture",
                    value: [this.data, "lutOpts", "image"],
                  },
                },
              },

              trippyOpts: {
                type: "group",
                visible: () => this.data.postProType == POST_TYPES.TRIPPY,
                children: {
                  speed: {
                    type: "number",
                    value: [this.data, "trippyOpts", "speed"],
                    min: 0,
                    max: 1,
                    step: 0.01,
                  },
                },
              },

              // strength: 1.0,
              // glitchRatio: 0.5,
              // speed: 1.0

              //     vignetteFallOff: 0.5,
              //vignetteStrength: 0.5,

              tvOpts: {
                type: "group",
                visible: () => this.data.postProType == POST_TYPES.TV,
                children: {
                  amount: {
                    type: "number",
                    value: [this.data, "tvOpts", "amount"],
                    min: 0,
                    max: 1,
                    step: 0.01,
                  },

                  strength: {
                    type: "number",
                    value: [this.data, "tvOpts", "strength"],
                    min: 0,
                    max: 1,
                    step: 0.01,
                  },

                  glitchRatio: {
                    type: "number",
                    value: [this.data, "tvOpts", "glitchRatio"],
                    min: 0,
                    max: 1,
                    step: 0.01,
                  },

                  speed: {
                    type: "number",
                    value: [this.data, "tvOpts", "speed"],
                    min: 0,
                    max: 1,
                    step: 0.01,
                  },

                  vignetteFallOff: {
                    type: "number",
                    value: [this.data, "tvOpts", "vignetteFallOff"],
                    min: 0,
                    max: 1,
                    step: 0.01,
                  },

                  vignetteStrength: {
                    type: "number",
                    value: [this.data, "tvOpts", "vignetteStrength"],
                    min: 0,
                    max: 1,
                    step: 0.01,
                  },
                },
              },
            },
          },
        },
      },
      customImage: {
        visible: () =>
          this.data.enabled &&
          this.data.postProType == POST_TYPES.LOOK_UP_TABLE,
        type: "folder",
        label: "Custom Upload",
        defaultOpen: true,
        children: {
          customImage: {
            type: "image",
            label: "Custom Upload",
            value: [this.data, "customUpload"],
            action: "upload",
            accept: "image/png, image/jpeg, image/jpg",
            acceptLabel: ".png .jpg",
          },
        },
      },
      actions: {
        type: "folder",
        label: "Actions",
        defaultOpen: false,
        children: {
          enable: {
            type: "receiver",
            defaultValue: [],
            dataKey: "enable",
            methodKey: "enable",
            value: [this.data, "enable"],
          },
          disable: {
            type: "receiver",
            defaultValue: [],
            dataKey: "disable",
            methodKey: "disable",
            value: [this.data, "disable"],
          },
        },
      },
    };

    this.gui = {
      type: "group",
      children: meta,
    } as GuiGroupDescriptor;
  }

  getGUI(): GuiGroupDescriptor | null {
    return this.gui;
  }
}
