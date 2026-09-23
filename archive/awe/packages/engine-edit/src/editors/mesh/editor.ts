import { Component3DEditor } from "../../component-editor/ui-editor";
import { MeshComponent } from "@oncyberio/engine/space/components/mesh/mesh-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor, GuiDescriptor } from "@oncyberio/engine/space/gui-types";
import { VisualPluginRegistry } from "@oncyberio/engine/space/components/visual-plugin-registry";
import { getAvailablePluginIds } from "@oncyberio/engine/space/components/plugin-ids";

/** @internal */
export class MeshComponentEditor extends Component3DEditor<MeshComponent> {
    //

    _addPluginSelection = "";

    getSelectionMesh() {
        const t = this.data?.displayInEditor == true ? super.getSelectionMesh() : null;

        return t;
    }

    getGUI(): GuiGroupDescriptor {
        const children: Record<string, GuiDescriptor | (() => GuiDescriptor)> = {};

        children.parameters = {
            type: "folder",
            label: "Parameters",
            children: {
                renderMode: {
                    type: "select",
                    value: [this.data, "renderMode"],
                    items: [
                        { id: "default", label: "Default" },
                        { id: "toon", label: "Toon" },
                        { id: "glitch", label: "Glitch" },
                        { id: "ghost", label: "Ghost" },
                        { id: "error", label: "Error" },
                    ],
                },
                wireframe: {
                    type: "checkbox",
                    value: [this.data, "wireframe"],
                    label: "Wireframe",
                },
                display: {
                    type: "checkbox",
                    value: [this.data, "displayInEditor"],
                    label: "Display in Editor Mode",
                },
                displayInWorld: {
                    type: "checkbox",
                    value: [this.data, "display"],
                    label: "Display in Live Mode",
                },
                castShadow: {
                    type: "checkbox",
                    value: [this.data, "castShadow"],
                    label: "Cast Shadow",
                },
                receiveShadow: {
                    type: "checkbox",
                    value: [this.data, "receiveShadow"],
                    label: "Receive Shadow",
                },
            },
        };

        children.geometry = {
            type: "folder",
            label: "Geometry",
            children: {
                type: {
                    type: "select",
                    items: ["plane", "box", "sphere", "cylinder", "dome"],
                    value: [this.data, "geometry", "type"],
                },
                sphereParams: {
                    visible: () => this.data.geometry.type == "sphere",
                    type: "group",
                    children: {
                        radius: {
                            type: "number",
                            value: [
                                this.data,
                                "geometry",
                                "sphereParams",
                                "radius",
                            ],
                            min: 0,
                            max: 100,
                            step: 0.01,
                        },
                        widthSegments: {
                            type: "number",
                            value: [
                                this.data,
                                "geometry",
                                "sphereParams",
                                "widthSegments",
                            ],
                            min: 1,
                            max: 100,
                            step: 1,
                        },
                        heightSegments: {
                            type: "number",
                            value: [
                                this.data,
                                "geometry",
                                "sphereParams",
                                "heightSegments",
                            ],
                            min: 1,
                            max: 100,
                            step: 1,
                        },
                    },
                },
                domeParams: {
                    visible: () => this.data.geometry.type == "dome",
                    type: "group",
                    children: {
                        radius: {
                            type: "number",
                            value: [
                                this.data,
                                "geometry",
                                "sphereParams",
                                "radius",
                            ],
                            min: 0,
                            max: 100,
                            step: 0.01,
                        },
                        widthSegments: {
                            type: "number",
                            value: [
                                this.data,
                                "geometry",
                                "sphereParams",
                                "widthSegments",
                            ],
                            min: 1,
                            max: 100,
                            step: 1,
                        },
                        heightSegments: {
                            type: "number",
                            value: [
                                this.data,
                                "geometry",
                                "sphereParams",
                                "heightSegments",
                            ],
                            min: 1,
                            max: 100,
                            step: 1,
                        },
                    },
                },
                cylinderParams: {
                    type: "group",
                    visible: () => this.data.geometry.type == "cylinder",
                    children: {
                        radiusTop: {
                            type: "number",
                            value: [
                                this.data,
                                "geometry",
                                "cylinderParams",
                                "radiusTop",
                            ],
                            min: 0,
                            max: 100,
                            step: 0.01,
                        },
                        radiusBottom: {
                            type: "number",
                            value: [
                                this.data,
                                "geometry",
                                "cylinderParams",
                                "radiusBottom",
                            ],
                            min: 0,
                            max: 100,
                            step: 0.01,
                        },
                        height: {
                            type: "number",
                            value: [
                                this.data,
                                "geometry",
                                "cylinderParams",
                                "height",
                            ],
                            min: 0,
                            max: 100,
                            step: 0.1,
                        },
                        radialSegments: {
                            type: "number",
                            value: [
                                this.data,
                                "geometry",
                                "cylinderParams",
                                "radialSegments",
                            ],
                            min: 1,
                            max: 100,
                            step: 1,
                        },
                        heightSegments: {
                            type: "number",
                            value: [
                                this.data,
                                "geometry",
                                "cylinderParams",
                                "heightSegments",
                            ],
                            min: 1,
                            max: 100,
                            step: 1,
                        },
                        openEnded: {
                            label: "Open ended",
                            type: "checkbox",
                            value: [
                                this.data,
                                "geometry",
                                "cylinderParams",
                                "openEnded",
                            ],
                        },
                    },
                },
            },
        };

        children.transform = getTransformUI(this);

        children.appearance = {
            type: "folder",
            label: "Appearance",
            children: {
                color: {
                    type: "color",
                    value: [this.data, "color"],
                },
                image: {
                    type: "resource",
                    typeof: "image",
                    value: [this.data, "image"],
                },
                opacity: {
                    type: "number",
                    value: [this.data, "opacity"],
                    min: 0,
                    max: 1,
                    step: 0.01,
                },
            },
        };

        // ── Plugins ──

        const plugins = this.data.plugins ?? [];

        for (let i = 0; i < plugins.length; i++) {
            const entry = plugins[i];
            const binding = [this.data, "plugins", String(i)] as [
                object,
                ...string[],
            ];

            const PluginClass = VisualPluginRegistry.get(entry.id);

            let pluginChildren: Record<string, any>;

            if (PluginClass) {
                const gui = PluginClass.getGUI(binding);
                pluginChildren = {
                    ...gui.children,
                    _remove: {
                        type: "button",
                        label: "Remove",
                        onAction: () => {
                            const updated = [...(this.data.plugins ?? [])];
                            updated.splice(i, 1);
                            this.dispatchDataChange({ plugins: updated });
                            this.updateUI();
                        },
                    },
                };
            } else {
                pluginChildren = {
                    _remove: {
                        type: "button",
                        label: "Remove",
                        onAction: () => {
                            const updated = [...(this.data.plugins ?? [])];
                            updated.splice(i, 1);
                            this.dispatchDataChange({ plugins: updated });
                            this.updateUI();
                        },
                    },
                };
            }

            children["plugin_" + i] = {
                type: "folder",
                label: PluginClass?.label ?? entry.id,
                color: "accent",
                children: pluginChildren,
            };
        }

        const activeIds = new Set(plugins.map((p) => p.id));
        const available = getAvailablePluginIds().filter(
            (p) => !activeIds.has(p.id),
        );

        if (available.length > 0) {
            children.addPlugin = {
                type: "select",
                label: "Add Plugin",
                value: [this, "_addPluginSelection"],
                items: [
                    { id: "", label: "Select..." },
                    ...available.map((p) => ({ id: p.id, label: p.label })),
                ],
                onChange: (id: string) => {
                    if (!id) return;
                    const PluginCls = VisualPluginRegistry.get(id);
                    const defaults = PluginCls?.defaults ?? {};
                    const updated: any[] = [
                        ...(this.data.plugins ?? []),
                        { id, ...defaults },
                    ];
                    this._addPluginSelection = "";
                    this.dispatchDataChange({ plugins: updated });
                    this.updateUI();
                },
            };
        }

        return { type: "group", children };
    }
}
