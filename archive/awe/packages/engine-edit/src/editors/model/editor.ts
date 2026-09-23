import { Component3DEditor } from "../../component-editor/ui-editor";
import {
  ModelComponent,
  ModelComponentData,
} from "@oncyberio/engine/space/components/model/model-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor, GuiDescriptor } from "@oncyberio/engine/space/gui-types";
import { VisualPluginRegistry } from "@oncyberio/engine/space/components/visual-plugin-registry";
import { getAvailablePluginIds } from "@oncyberio/engine/space/components/plugin-ids";

const UI_TO_SCALE = 1;

type ModelAnimations = ModelComponentData["animations"];

/** @internal */
export class ModelEditor extends Component3DEditor<ModelComponent> {
  //
  _animationsFormat = {
    //
    format(anims: ModelAnimations) {
      //
      return Object.keys(anims);
    },

    parse(items: string[]) {
      //
      let res = {};

      items.forEach((item) => {
        res[item] = true;
      });

      return res;
    },
  };

  _addPluginSelection = "";

  private _modelAnims = [];

  init(): void {
    this._modelAnims =
      (this.component as any)._model?.animations?.map((a) => a.name) || [];
  }

  getGUI(): GuiGroupDescriptor {
    const children: Record<string, GuiDescriptor | (() => GuiDescriptor)> = {};

    children.preset = {
      type: "folder",
      label: "Parameters",
      children: {
        enableRealTimeShadow: {
          visible: () => (this.component as any)._model.isClassic != true,
          type: "checkbox",
          label: "Enable Dynamic Shadows",
          value: [this.data, "enableRealTimeShadow"],
        },

        render: {
          type: "select",
          value: [this.data, "renderMode"],
          items: [
            { id: "default", label: "Default" },
            { id: "toon", label: "Toon" },
            { id: "glitch", label: "Glitch" },
            { id: "ghost", label: "Ghost" },
            { id: "select", label: "Select" },
            { id: "error", label: "Error" },
          ],
        },
      },
    };

    children.transform = getTransformUI(this);

    children.opacity = {
      type: "folder",
      label: "Opacity",
      children: {
        useTransparency: {
          type: "checkbox",
          label: "Use Transparency",
          value: [this.data, "useTransparency"],
        },
        opacity: {
          visible: () => {
            return this.data.useTransparency == true;
          },
          type: "number",
          value: [this.data, "opacity"],
          min: 0,
          max: 1,
          step: 0.01,
        },
      },
    };

    children.animations = {
      type: "folder",
      label: "3D Animations",
      visible: () => this._modelAnims.length > 0,
      children: {
        enableAnimation: {
          visible: () => this._modelAnims.length > 0,
          type: "checkbox",
          label: "Enable",
          value: [this.data, "enableAnimation"],
        },
        animations: {
          visible: () =>
            this._modelAnims.length > 0 && this.data.enableAnimation == true,
          type: "list",
          label: "Animations",
          value: [this.data, "animations"],
          format: this._animationsFormat,
          items: () => this._modelAnims,
          emptyLabel: "None",
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
