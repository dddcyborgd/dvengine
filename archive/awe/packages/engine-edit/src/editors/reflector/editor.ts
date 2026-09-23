import { Component3DEditor } from "../../component-editor/ui-editor";
import { normalMaps } from "@oncyberio/engine/space/components/reflector/data";
import { getRestrictedColliderGUI } from "../../component-editor/ui/collider-ui";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

/** @internal */
export const reflectorPresets = [
  {
    name: "Mirror",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmeGoooJdmp9CwwvFQezpYPbyXgVzqzyd3PWjDWRSnrsUq",
    data: {
      color: "#9fbada",
      opacity: 1,
      blur: true,
      normalmap: {
        enabled: false,
        strength: 0.5,
        tiles: 0.3,
        images: normalMaps.bump,
        customImage: null,
      },
      collision: true,
    },
  },
  {
    name: "Ice",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmRQzP197oCfMnMBA4tHWP3EPYrdkRxMMii7bqxzeDuAzW",
    data: {
      color: "#bff3ff",
      opacity: 1,
      blur: true,
      normalmap: {
        enabled: true,
        strength: 0.33,
        tiles: 0.1,
        images: normalMaps.ice,
        customImage: null,
      },
      collision: true,
    },
  },
  {
    name: "Glass",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmP8RdHfTRrcq3TxhjdURvXTgUMWycu9BNc4V8wci2nxEX",
    data: {
      color: "#838383",
      opacity: 0.5,
      blur: false,
      normalmap: {
        enabled: false,
        strength: 0.5,
        tiles: 0.3,
        images: normalMaps.bump,
        customImage: null,
      },
      collision: true,
    },
  },
  {
    name: "Tiles",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmSnDr4De2CWE9P1u9yaE6owaKkhUHEUmk6brwfgAE1Pf9",
    data: {
      color: "#e411e6",
      opacity: 1,
      blur: true,
      normalmap: {
        enabled: true,
        strength: 0.5,
        tiles: 0.3,
        images: normalMaps.bump,
        customImage: null,
      },
      collision: true,
    },
  },
  {
    name: "Holes",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmUan8YJKmU5azA9LL3qx9AtniswKsfryD7qjnvvCbaArm",
    data: {
      color: "#3d3d3d",
      opacity: 1,
      blur: true,
      normalmap: {
        enabled: true,
        strength: 1,
        tiles: 0.5,
        images: normalMaps.holes,
        customImage: null,
      },
      collision: true,
    },
  },
  {
    name: "Metal Sheet",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmZT6ziS69ag4QUuK5zbcFnubXCNHy4u4dmLB12RyNG2fm",
    data: {
      color: "#838383",
      opacity: 1,
      blur: true,
      normalmap: {
        enabled: true,
        strength: 0.5,
        tiles: 0.3,
        images: normalMaps.metalsheet,
        customImage: null,
      },
      collision: true,
    },
  },
  {
    name: "Bricks",
    image:
      "https://cyber.mypinata.cloud/ipfs/Qmb4nxAUNWdjWzVxgZUWe6CBiR38ooM4znMUeZYi4LBNYn",
    data: {
      color: "#a1460f",
      opacity: 1,
      blur: true,
      normalmap: {
        enabled: true,
        strength: 0.5,
        tiles: 0.3,
        images: normalMaps.bricks,
        customImage: null,
      },
      collision: true,
    },
  },
  {
    name: "Ancient",
    image:
      "https://cyber.mypinata.cloud/ipfs/Qmd4jkLa3aTJYYUMRvTm1fTgzLZ62i5Cu4eZiV3RttCwR2",
    data: {
      color: "#e0ce3c",
      opacity: 1,
      blur: true,
      normalmap: {
        enabled: true,
        strength: 0.5,
        tiles: 0.3,
        images: normalMaps.ancient,
        customImage: null,
      },
      collision: true,
    },
  },
];

const normalMapOpts = Object.values(normalMaps);

/** @internal */
export class ReflectorEditor extends Component3DEditor<any> {
  //
  defaultColliderUI = false;

  get customUpload() {
    if (
      this.data.normalmap.enabled &&
      this.data.normalmap.images?.id === "custom"
    ) {
      //
      return this.data.normalmap.images;
    }

    return null;
  }

  set customUpload(value) {
    //
    if (value?.path) {
      // debugger;
      //
      this.data.normalmap.enabled = true;
      this.data.normalmap.images = value;
      // this.data.normalmap.customImage.image = value;
    } else {
      this.data.normalmap.images = normalMaps.bump;
    }
  }

  gui: GuiGroupDescriptor = {
    type: "group",
    children: {
      presets: {
        type: "folder",
        label: "Presets",
        children: {
          presets: {
            type: "presets",
            items: reflectorPresets,
            source: [this, "data"],
          },
          blur: {
            type: "checkbox",
            value: [this.data, "blur"],
            label: "Blur",
          },
        },
      },
      color: {
        type: "folder",
        label: "Tint & Opacity",
        children: {
          color: {
            type: "color",
            value: [this.data, "color"],
          },
          opacity: {
            type: "number",
            value: [this.data, "opacity"],
            min: 0,
            max: 1,
            step: 0.01,
          },
        },
      },
      transform: getTransformUI(this, {
        position: { step: { x: 0.1, y: 0.1, z: 0.1 } },
        scale: {
          min: 1,
          max: 5000,
          step: 0.1,
        },
      }),
      normalMap: {
        type: "folder",
        label: "Normal Map",
        children: {
          normalMap: {
            type: "checkbox",
            label: "Enabled",
            value: [this.data, "normalmap", "enabled"],
          },
          normalMapOpts: {
            type: "group",
            visible: () => this.data.normalmap.enabled,
            children: {
              strength: {
                type: "number",
                value: [this.data, "normalmap", "strength"],
                min: 0.01,
                max: 1,
                step: 0.01,
              },
              tiles: {
                type: "number",
                value: [this.data, "normalmap", "tiles"],
                min: 0.1,
                max: 20,
                step: 0.1,
              },
              image: {
                type: "select",
                items: normalMapOpts,
                mode: "slider",
                value: [this.data, "normalmap", "images"],
              },
              customImage: {
                type: "image",
                label: "Custom Image",
                value: [this, "customUpload"],
                accept: "image/png, image/jpeg, image/jpg",
                acceptLabel: ".png .jpg",
                // value: [this.data, "normalmap", "images"],
              },
            },
          },
        },
      },
      collider: getRestrictedColliderGUI(this),
    },
  };

  showSelected(isSelected: boolean): void {}

  getGUI(): GuiGroupDescriptor {
    return this.gui;
  }
}
