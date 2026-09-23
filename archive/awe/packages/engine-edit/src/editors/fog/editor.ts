import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

const fogPresets = [
  {
    name: "Far fog",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmX3AerMRuGcnR4f1Vmr5CavXH2mXvDj2Bkz1ez2ckmfZ6",
    data: {
      enabled: true,
      near: 300,
      far: 500,
    },
  },
  {
    name: "Near fog",
    image:
      "https://cyber.mypinata.cloud/ipfs/Qmep7GC3xtvPqkt6f8H2E5vKJKXasAEB8gSmYj5DnP1xbE",
    data: {
      enabled: true,
      near: -15,
      far: 125,
    },
  },
  {
    name: "Close fog",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmcxgiiP1XxVMa6CyP6pbBhKMGW4X7v6JGJdhJanmQfbtn",
    data: {
      enabled: true,
      near: 0,
      far: 40,
    },
  },
];

/** @internal */
export class FogEditor extends Component3DEditor {
  gui: GuiGroupDescriptor = {
    type: "group",
    children: {
      fogPresets: {
        type: "folder",
        label: "Thickness",
        defaultOpen: true,
        children: {
          enabled: {
            type: "checkbox",
            value: [this.data, "enabled"],
            label: "Enable fog",
          },
          fogPresets: {
            label: "Fog Presets",
            type: "presets",
            items: fogPresets,
            source: [this, "data"],
            visible: () => this.data.enabled === true,
          },
          fadeColor: {
            label: "Fade Color",
            type: "color",
            value: [this.data, "fadeColor"],
            visible: () => this.data.enabled === true,
          },
        },
      },
      fogOpts: {
        type: "folder",
        label: "Distance",
        visible: () => this.data.enabled === true,
        children: {
          near: {
            type: "number",
            value: [this.data, "near"],
            min: -100,
            max: 2900,
            step: 1,
          },
          far: {
            type: "number",
            value: [this.data, "far"],
            min: 0,
            max: 3000,
            step: 1,
          },
        },
      },
    },
  };

  getGUI(): GuiGroupDescriptor {
    return this.gui;
  }
}
