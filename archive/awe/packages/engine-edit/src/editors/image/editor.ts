import { Component3DEditor } from "../../component-editor/ui-editor";
import { ImageComponent } from "@oncyberio/engine/space/components/image/image-component";
import { LEGACY_UpgradeScale } from "../legacy";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

/** @internal */
export class ImageComponentEditor extends Component3DEditor<ImageComponent> {
    //
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
                    useMipMap: {
                        type: "checkbox",
                        label: "Use MipMap",
                        value: [this.data, "useMipMap"],
                    },
                    minFilter: {
                        type: "select",
                        label: "Min Filter",
                        value: [this.data, "minFilter"],
                        items: [
                            "NearestFilter",
                            "NearestMipmapNearestFilter",
                            "NearestMipmapLinearFilter",
                            "LinearFilter",
                            "LinearMipmapNearestFilter",
                            "LinearMipmapLinearFilter",
                        ],
                    },
                    magFilter: {
                        type: "select",
                        label: "Mag Filter",
                        value: [this.data, "magFilter"],
                        items: ["NearestFilter", "LinearFilter"],
                    },
                },
            },
            border: {
                type: "folder",
                label: "Border",
                children: {
                    hasBorder: {
                        type: "checkbox",
                        label: "Has Border",
                        value: [this.data, "hasBorder"],
                    },
                    borderColor: {
                        type: "color",
                        label: "Border Color",
                        value: [this.data, "borderColor"],
                        visible: () => this.data.hasBorder,
                    },
                    borderSize: {
                        type: "number",
                        label: "Border Size",
                        value: [this.data, "borderSize"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                        visible: () => this.data.hasBorder,
                    },
                    borderDepth: {
                        type: "number",
                        label: "Border Depth",
                        value: [this.data, "borderDepth"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                        visible: () => this.data.hasBorder,
                    },
                    borderOpacity: {
                        type: "number",
                        label: "Border Opacity",
                        value: [this.data, "borderOpacity"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                        visible: () => this.data.hasBorder,
                    },
                },
            },
            transform: getTransformUI(this),
        },
    };

    init() {
        //
        LEGACY_UpgradeScale(this);
    }

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }
}
