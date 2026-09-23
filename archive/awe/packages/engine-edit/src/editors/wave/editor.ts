import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { WaveComponent } from "@oncyberio/engine/space/components/wave/wave-component";

const directionsOpts = [
    { id: 1, label: "Out" },
    { id: -1, label: "In" },
];

/**
 * @internal
 */
export class WaveEditor extends Component3DEditor<WaveComponent> {
    gui: GuiGroupDescriptor = {
        type: "group",
        children: {
            transform: getTransformUI(this, { position: {}, rotation: {} }),
            appearance: {
                type: "folder",
                label: "Appearance",
                children: {
                    color: {
                        type: "color",
                        value: [this.data, "color"],
                    },
                    radius: {
                        type: "number",
                        value: [this.data, "radius"],
                        min: 0,
                    },
                    height: {
                        type: "number",
                        value: [this.data, "height"],
                        min: 0,
                    },

                    linewidth: {
                        type: "number",
                        value: [this.data, "linewidth"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                    },
                    divisions: {
                        type: "number",
                        value: [this.data, "divisions"],
                        min: 0,
                    },
                    lines: {
                        type: "number",
                        value: [this.data, "lines"],
                        min: 0,
                    },
                    direction: {
                        type: "select",
                        value: [this.data, "direction"],
                        items: directionsOpts,
                    },
                },
            },
        },
    };

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }

    selectionMesh = this.createDefaultSelectionMesh();

    init(): void {
        this.updateSelectionMesh();

        this.component.on("data", this.updateSelectionMesh);
    }

    getSelectionMesh() {
        return this.selectionMesh;
    }

    updateSelectionMesh = () => {
        this.selectionMesh.scale.set(
            this.data.radius * 2,
            this.data.height,
            this.data.radius * 2
        );
    };
}
