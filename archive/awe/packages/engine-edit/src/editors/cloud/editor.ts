import { Component3DEditor } from "../../component-editor/ui-editor";
import { CloudComponent } from "@oncyberio/engine/space/components/cloud/cloud-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { BoxGeometry, Mesh } from "three";

/**
 * @internal
 */
export class CloudComponentEditor extends Component3DEditor<CloudComponent> {
    gui: GuiGroupDescriptor = {
        type: "group",
        children: {
            transform: getTransformUI(this),
            appearance: {
                type: "folder",
                label: "Appearance",
                children: {
                    opacity: {
                        type: "number",
                        value: [this.data, "opacity"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                    },
                    atlas: {
                        type: "select",
                        value: [this.data, "atlas"],
                        items: [0, 1, 2, 3],
                    },
                },
            },
        },
    };

    /**
     * @internal
     */

    selectionMesh = null;

    getSelectionMesh() {
        if (this.selectionMesh == null) {
            this.selectionMesh = new Mesh(new BoxGeometry(1, 1, 0.001));

            this.selectionMesh.visible = false;

            this.component.add(this.selectionMesh);
        }

        return this.selectionMesh;
    }

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }
}
