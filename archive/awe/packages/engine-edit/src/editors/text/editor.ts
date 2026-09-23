import PipeLineMesh from "@oncyberio/engine/internal/pipeline/pipeline-mesh";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import {
  BufferGeometry,
  MeshBasicMaterial,
  Vector3,
  PlaneGeometry,
} from "three";

const FONTS = [
  {
    id: "aeonik-bold",
    name: "Aeonik Bold",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmZBxpbEX7tmDFrTyPf7nBRbVVWtfBybGWWviQPYQ5NuFq",
  },
  {
    id: "aeonik-medium",
    name: "Aeonik Medium",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmZBxpbEX7tmDFrTyPf7nBRbVVWtfBybGWWviQPYQ5NuFq",
  },
  {
    id: "playfair-regular",
    name: "Playfair Regular",
    image:
      "https://cyber.mypinata.cloud/ipfs/Qmb6dwTiXHzUgqo5xuW7AhsYzWRWdLAsmuiazpo4FEVGpt",
  },
  {
    id: "playfair-italic",
    name: "Playfair Italic",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmUGnFWdyiFExs3kASifNnCKxzA3vqbotnkphXLFC3ioKX",
  },
];

const ALIGN = [
  {
    id: "left",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmfHtDGczHwQr2Uo3ZdwaB3eqHAp4y1gxdvK38em3oC9ja",
  },
  {
    id: "center",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmUDnh7bZBUH1JJX2TgnCVjn7SbqZFX1u1uJN4nbWHMzrw",
  },
  {
    id: "right",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmcfPhCq8n1E9iU4us5cfK8h5ygRWVdU7Ju8mRn6E8xPpY",
  },
];

const TRANSFORM = [
  { id: "uppercase", name: "UPPER CASE" },
  { id: "lowercase", name: "lower case" },
  { id: "capitalize", name: "Capitalize" },
  { id: "togglecase", name: "tOGGLE cASE" },
];

/** @internal */
export class TextEditor extends Component3DEditor {
  gui: GuiGroupDescriptor = {
    type: "group",
    children: {
      text: {
        type: "folder",
        label: "Text Input",
        slug: "text",
        defaultOpen: true,
        children: {
          text: {
            type: "textarea",
            label: "Text",
            value: [this.data, "text"],
          },
        },
      },

      font: {
        type: "folder",
        label: "Parameters",
        slug: "font",
        children: {
          font: {
            type: "select",
            mode: "slider",
            objectFit: "scale-down",
            items: FONTS,
            label: null,
            aspectRatio: "1.5",
            value: [this.data, "font"],
          },
          alignTransform: {
            type: "group",
            style: {
              display: "grid",
              marginTop: "20px",
              gridTemplateColumns: "repeat(auto-fit, minmax(0, 1fr))",
              gap: "17px",
            },
            children: {
              align: {
                label: null,
                type: "icongroup",
                value: [this.data, "align"],
                items: ALIGN,
              },
              textTransform: {
                label: null,
                type: "select",
                value: [this.data, "textTransform"],
                items: TRANSFORM,
                nullable: true,
              },
            },
          },
          width: {
            type: "number",
            value: [this.data, "width"],
            min: 100,
            max: 2000,
            step: 1,
          },
          textColor: {
            type: "color",
            value: [this.data, "textColor"],
          },
          opacity: {
            type: "number",
            value: [this.data, "opacity"],
            min: 0.0,
            max: 1,
            step: 0.01,
          },
        },
      },

      transform: getTransformUI(this),
    },
  };

  selectionMesh = null;

  init() {
    this.component.on("data", () => this.updateSelectionMesh());
  }

  getSelectionMesh() {
    if (this.selectionMesh == null) {
      //

      const geometry = new PlaneGeometry(1, 1);

      const material = new MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        side: 2,
      });

      this.selectionMesh = new PipeLineMesh(geometry, material);

      this.selectionMesh.visible = false;

      this.component.add(this.selectionMesh);

      this.updateSelectionMesh();
    }

    return this.selectionMesh;
  }

  updateSelectionMesh() {
    //
    if (this.selectionMesh == null) {
      return;
    }

    const fontGeo: BufferGeometry = (this.component as any)._font.geometry;

    if (fontGeo.boundingBox == null) {
      fontGeo.computeBoundingBox();
    }

    const size = fontGeo.boundingBox.getSize(new Vector3());

    this.selectionMesh.scale.set(size.x, size.y, 1);
  }

  getGUI(): GuiGroupDescriptor {
    return this.gui;
  }
}
