import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { Component3DEditor } from "../../component-editor/ui-editor";

/** @internal */
export class ObjectEditor extends Component3DEditor {
    gui: GuiGroupDescriptor = {
        type: "group",
        children: {
            General: {
                type: "folder",
                label: "General",
                children: {
                    name: {
                        type: "text",
                        value: [this.data, "name"],
                    },
                },
            },
        },
    };

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }
}
