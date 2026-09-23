import { Component3DEditor } from "../../component-editor/ui-editor";
import type {
    GuiGroupDescriptor,
    GuiDescriptor,
} from "@oncyberio/engine/space/gui-types";
import VRMS from "@oncyberio/engine/space/components/avatar/vrms";
import { AvatarComponent } from "@oncyberio/engine/space/components/avatar/avatar-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import VRMAnimation from "@oncyberio/engine/internal/avatar/vrm/animations";
import { XYZ } from "@oncyberio/engine/@types/types";
import { MathUtils } from "three";
import { VisualPluginRegistry } from "@oncyberio/engine/space/components/visual-plugin-registry";
import { getAvailablePluginIds } from "@oncyberio/engine/space/components/plugin-ids";

export const VRMPresets = Object.entries(VRMS)
    .map(([id, url]) => {
        //
        return {
            id: url,
            label: id,
        };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

/** @internal */
export class AvatarEditor extends Component3DEditor<AvatarComponent> {
    //

    _rotFormat = {
        //
        format: (rotation: XYZ) => MathUtils.radToDeg(rotation.y),

        parse: (rotY: number, prev: XYZ) => ({
            ...prev,
            y: MathUtils.degToRad(rotY),
        }),
    };

    _scaleFormat = {
        format: (scale: XYZ) => scale.x,
        parse: (value: number) => ({ x: value, y: value, z: value }),
    };

    _addPluginSelection = "";

    getGUI(): GuiGroupDescriptor {
        const children: Record<string, GuiDescriptor | (() => GuiDescriptor)> = {};

        children.preset = {
            type: "folder",
            label: "Parameters",
            children: {
                url: {
                    type: "select",
                    value: [this.data, "url"],
                    items: VRMPresets,
                    // nullable: true,
                },
                ignoreLOD: {
                    type: "checkbox",
                    label: "Level of detail",
                    value: [this.data, "ignoreLOD"],
                    format: {
                        parse: (v) => !v,
                        format: (v) => !v,
                    },
                },
                useCpuAnimation: {
                    type: "checkbox",
                    label: "GPU Animation",
                    value: [this.data, "useCpuAnimation"],
                    format: {
                        parse: (v) => !v,
                        format: (v) => !v,
                    },
                },
                render: {
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
                animation: {
                    type: "select",
                    value: [this.data, "animation"],
                    nullable: true,
                    items: () =>
                        VRMAnimation.animations.map((a) => {
                            return {
                                id: a.name,
                                label: a.name.toLowerCase(),
                            };
                        }),
                },
                text: {
                    type: "text",
                    value: [this.data, "text"],
                },
                pictureUrl: {
                    type: "text",
                    value: [this.data, "picture"],
                },
            },
        };

        children.transform = getTransformUI(this, {
            position: {},
            scale: {
                type: "number",
                label: "Scale",
                value: [this.data, "scale"],
                min: 0.01,
                max: 10,
                step: 0.1,
                format: this._scaleFormat,
            },
            rotation: {
                type: "number",
                label: "Rotation Y",
                value: [this.data, "rotation"],
                min: 0,
                max: 360,
                step: 1,
                format: this._rotFormat,
            },
        });

        children.opacity = {
            type: "folder",
            label: "Opacity",
            children: {
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
            const binding = [this.data, "plugins", String(i)] as [object, ...string[]];

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
