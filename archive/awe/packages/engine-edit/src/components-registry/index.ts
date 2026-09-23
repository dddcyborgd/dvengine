import { EngineEvents as Events } from "@oncyberio/engine/internal/engine-events";
import emitter from "@oncyberio/engine/internal/engine-emitter";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { ComponentFactory } from "@oncyberio/engine/space/abstract/component-factory";

import { getCurrentSpace } from "@oncyberio/engine/internal";

export type ComponentType = typeof ComponentFactory;

export const registry: ComponentType[] = [];

const registryMap: Record<string, ComponentType> = {};

export class ComponentsRegistry {
  //
  constructor() {
    this.addEvents();
  }

  get registry() {
    //
    return getCurrentSpace().registry;
  }

  getType(type: string) {
    return registryMap[type];
  }

  getComponentTypes() {
    return Object.values(this.registry.factoryClasses);
  }

  getComponentTypeMap() {
    //
    return this.registry.factoryClasses;
  }

  onComponentAdded = (instance: Component3D) => {
    //
    if (!instance.isPersistent) return;
  };

  onComponentRemoved = (instance: Component3D) => {
    //
    if (!instance.isPersistent) return;
  };

  addEvents() {
    emitter.on(Events.COMPONENT_ADDED, this.onComponentAdded);

    emitter.on(Events.COMPONENT_REMOVED, this.onComponentRemoved);
  }

  removeEvents() {
    emitter.off(Events.COMPONENT_ADDED, this.onComponentAdded);

    emitter.off(Events.COMPONENT_REMOVED, this.onComponentRemoved);
  }

  dispose() {
    this.removeEvents();
  }
}
