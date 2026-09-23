import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { GodrayComponent } from "@oncyberio/engine/space/components/godray/godray-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { BoxGeometry, Mesh } from "three";

/** @internal */
export class GodRayComponentEditor extends Component3DEditor<GodrayComponent> {
    //
    /** @internal */
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

    /** @internal */
    selectionMesh = null;

    /** @internal */
    getSelectionMesh() {
        if (this.selectionMesh == null) {
            this.selectionMesh = this.component.getCollisionMesh().clone();

            this.selectionMesh.visible = false;

            this.component.add(this.selectionMesh);
        }

        return this.selectionMesh;
    }

    /** @internal */
    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }
}
