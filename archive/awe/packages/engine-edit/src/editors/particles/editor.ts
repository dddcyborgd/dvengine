import type {
  GuiGroupDescriptor,
  GuiDescriptor,
  GuiFolderDescriptor,
} from "@oncyberio/engine/space/gui-types";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { Component3DEditor } from "../../component-editor/ui-editor";
import { ParticlesComponent } from "@oncyberio/engine/space/components/particles/particles-component";
import {
  ParticleBehavior,
  ParticleBehaviorClass,
  ParticleBehaviorRegistry,
} from "@oncyberio/engine/space/components/particles/particle-behavior";

/** @internal */
export class ParticlesEditor extends Component3DEditor<ParticlesComponent> {
  //
  _addBehaviorSelection = "";

  getGUI(): GuiGroupDescriptor {
    const children: Record<string, GuiDescriptor | (() => GuiDescriptor)> = {};

    // Base particle params
    children.particles = {
      type: "folder",
      label: "Particles",
      children: {
        primitive: {
          type: "select",
          label: "Primitive",
          value: [this.data, "primitive"],
          items: [
            { id: "plane", label: "Plane" },
            { id: "cube", label: "Cube" },
            { id: "sphere", label: "Sphere" },
          ],
        },
        billboard: {
          type: "checkbox",
          label: "Billboard",
          value: [this.data, "billboard"],
        },
        autoSpawn: {
          type: "checkbox",
          label: "Auto Spawn",
          value: [this.data, "autoSpawn"],
        },
        autoSpawnRate: {
          type: "number",
          label: "Auto Spawn Rate",
          value: [this.data, "autoSpawnRate"],
          min: 0,
          max: 100,
          step: 1,
        },
        lifeSpan: {
          type: "number",
          label: "Life Span",
          value: [this.data, "lifeSpan"],
          min: 0,
          max: 20,
          step: 0.1,
        },
        perpetualLife: {
          type: "checkbox",
          label: "Perpetual Life",
          value: [this.data, "perpetualLife"],
        },
        instantSpawn: {
          type: "checkbox",
          label: "Instant Spawn",
          value: [this.data, "instantSpawn"],
        },
        maximumSpawn: {
          type: "number",
          label: "Maximum Spawn",
          value: [this.data, "maximumSpawn"],
          min: 1,
          max: 1000,
          step: 1,
          visible: () => this.data.perpetualLife,
        },
        attachToSource: {
          type: "checkbox",
          label: "Attach To Source",
          value: [this.data, "attachToSource"],
        },
        useSourceRotation: {
          type: "checkbox",
          label: "Use Source Rotation",
          value: [this.data, "useSourceRotation"],
          visible: () => this.data.attachToSource,
        },
        useSourceScale: {
          type: "checkbox",
          label: "Use Source Scale",
          value: [this.data, "useSourceScale"],
          visible: () => this.data.attachToSource,
        },
        shadowCast: {
          type: "checkbox",
          label: "Cast Shadow",
          value: [this.data, "shadowCast"],
        },
        receiveShadow: {
          type: "checkbox",
          label: "Receive Shadow",
          value: [this.data, "receiveShadow"],
        },
      },
    };

    // Dynamic behavior folders
    const behaviors = this.data.behaviors ?? [];

    for (let i = 0; i < behaviors.length; i++) {
      const entry = behaviors[i];
      const behaviorGUI = this.getBehaviorGUI(entry, i);
      if (behaviorGUI) {
        children["behavior_" + entry.type] = behaviorGUI;
      }
    }

    // "Add Behavior" dropdown
    const activeBehaviorTypes = new Set(behaviors.map((b) => b.type));
    const available = ParticleBehaviorRegistry.list().filter(
      (B) => !activeBehaviorTypes.has(B.behaviorName),
    );

    if (available.length > 0) {
      children.addBehavior = {
        type: "select",
        label: "Add Behavior",
        value: [this, "_addBehaviorSelection"],
        items: [
          { id: "", label: "Select..." },
          ...available.map((B) => ({
            id: B.behaviorName,
            label: B.label,
          })),
        ],
        onChange: (name: string) => {
          if (!name) return;
          const BehaviorClass = ParticleBehaviorRegistry.get(name);
          if (BehaviorClass) {
            const updated = [
              ...(this.data.behaviors ?? []),
              {
                type: name,
                options: { ...BehaviorClass.defaults },
              },
            ];
            this._addBehaviorSelection = "";
            this.component.setData({ behaviors: updated });
            this.component.once("data", () => {
              this.updateUI();
            });
          }
        },
      };
    }

    children.transform = getTransformUI(this);

    return { type: "group", children };
  }

  private getBehaviorGUI(
    entry: { type: string; options: Record<string, any> },
    i: number,
  ): GuiFolderDescriptor | null {
    const BehaviorClass = ParticleBehaviorRegistry.get(entry.type);
    if (!BehaviorClass) return null;

    const behaviorInstance = this.component._behaviors[i];
    if (!behaviorInstance) return null;

    const dataBinding = [this.data, "behaviors", String(i)] as [
      object,
      ...string[],
    ];
    const behaviorGUI = behaviorInstance.getGUI(dataBinding);

    return {
      type: "folder",
      label: BehaviorClass.label,
      color: "accent",
      children: {
        ...behaviorGUI.children,
        _remove: {
          type: "button",
          label: "Remove",
          onAction: () => {
            const updated = [...(this.data.behaviors ?? [])];
            updated.splice(i, 1);
            this.component.setData({ behaviors: updated });
            this.component.once("data", () => {
              this.updateUI();
            });
          },
        },
      },
    };
  }
}
