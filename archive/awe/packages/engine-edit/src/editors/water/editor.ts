import { getRestrictedColliderGUI } from "../../component-editor/ui/collider-ui";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

/**
 * @internal
 */
export class WaterEditor extends Component3DEditor {
    //
    defaultColliderUI = false;

    gui: GuiGroupDescriptor = {
        type: "group",
        children: {
            color: {
                type: "folder",
                label: "Color & Opacity",
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
                position: { step: 0.01 },
                scale: { min: 1, max: 5000, step: 0.1 },
            }),
            collider: getRestrictedColliderGUI(this),
        },
    };

    showSelected(isSelected: boolean): void {}

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }
}
