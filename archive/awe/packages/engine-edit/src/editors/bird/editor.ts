import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { BirdComponent } from "@oncyberio/engine/space/components/bird/bird-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { BoxGeometry, Mesh } from "three";

/** @internal */
export class BirdComponentEditor extends Component3DEditor<BirdComponent> {
    //
    defaultColliderUI = false;

    gui: GuiGroupDescriptor = {
        type: "group",
        children: {
            params: {
                type: "folder",
                label: "Parameters",
                children: {
                    opacity: {
                        type: "number",
                        label: "Opacity",
                        value: [this.data, "opacity"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                    },
                    color: {
                        type: "color",
                        label: "Color",
                        value: [this.data, "color"],
                    },
                },
            },
            transform: getTransformUI(this),
        },
    };

    selectionMesh = null;

    getSelectionMesh() {
        //
        if (this.selectionMesh == null) {
            //
            this.selectionMesh = new Mesh(new BoxGeometry(1, 1, 1));

            this.selectionMesh.visible = false;

            this.component.add(this.selectionMesh);
        }

        return this.selectionMesh;
    }

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }
}
