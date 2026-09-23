import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { GrassComponent } from "@oncyberio/engine/space/components/grass/grass-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";

import { Mesh, BoxGeometry } from "three";

// uEnableShadows: { value: true },
// uShadowDarkness: { value: 0.5},
// uGrassLightIntensity: { value: 1},
// uNoiseScale: { value: 1.5},
// uNoiseTexture: { value: new Texture() },
// uGrassAlphaTexture: { value: new Texture() }

/** @internal */
export class GrassComponentEditor extends Component3DEditor<GrassComponent> {
    gui: GuiGroupDescriptor = {
        type: "group",
        children: {
            transform: getTransformUI(this),
            colorOpacity: {
                type: "folder",
                label: "Colors",
                children: {
                    uBaseColor: {
                        type: "color",
                        name: "Base Color 1",
                        value: [this.data, "uBaseColor"],
                    },
                    uBaseColor2: {
                        type: "color",
                        name: "Base Color 2",
                        value: [this.data, "uBaseColor2"],
                    },
                    tipColor1: {
                        type: "color",
                        name: "Tip Color 1",
                        value: [this.data, "uTipColor1"],
                    },
                    tipColor2: {
                        type: "color",
                        name: "Tip Color 2",
                        value: [this.data, "uTipColor2"],
                    },
                    tipColor3: {
                        type: "color",
                        name: "Tip Color 3",
                        value: [this.data, "uTipColor3"],
                    },
                    tipColor4: {
                        type: "color",
                        name: "Tip Color 4",
                        value: [this.data, "uTipColor4"],
                    },
                    colorRepartition: {
                        type: "number",
                        name: "Color Repartition",
                        value: [this.data, "colorRepartition"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                    },
                },
            },
        },
    };

    // selectionMesh = null;

    // getSelectionMesh() {
    //     if (this.selectionMesh == null) {
    //         this.selectionMesh = new Mesh(new BoxGeometry(1, 1, 1));

    //         this.selectionMesh.visible = false;

    //         this.component.add(this.selectionMesh);
    //     }

    //     return this.selectionMesh;
    // }

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }
}
