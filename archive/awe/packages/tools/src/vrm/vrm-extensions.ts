// @ts-nocheck
import { Extension } from "@gltf-transform/core";

/**
 * VRM 0.x extension handler
 */
export class VRMExtension extends Extension {
  extensionName = "VRM";
  static EXTENSION_NAME = "VRM";

  read(context: any) {
    const json = context.jsonDoc.json;

    if (json.extensions[this.extensionName]) {
      if (this.document.getRoot().extras == null) {
        this.document.getRoot().extras = {};
      }

      // remove material toon properties
      delete json.extensions[this.extensionName].materialProperties;

      // fix non zero divisors
      if (json.extensions[this.extensionName].lookAt) {
        const lookAt = json.extensions[this.extensionName].lookAt;

        lookAt.rangeMapHorizontalInner.inputMaxValue = 0.00001;
        lookAt.rangeMapHorizontalOuter.inputMaxValue = 0.00001;
        lookAt.rangeMapVerticalDown.inputMaxValue = 0.00001;
        lookAt.rangeMapVerticalUp.inputMaxValue = 0.00001;
      }

      this.document.getRoot().extras[this.extensionName] =
        json.extensions[this.extensionName];
    }

    return this;
  }

  write(context: any) {
    const json = context.jsonDoc.json;

    if (this.document.getRoot().extras[this.extensionName]) {
      if (json.extensions == null) {
        json.extensions = {};
      }

      json.extensions[this.extensionName] =
        this.document.getRoot().extras[this.extensionName];

      // remove thumbnail
      json.extensions[this.extensionName].meta.texture = null;
    }

    return this;
  }
}

/**
 * VRMC (VRM 1.0) extension handler
 */
export class VRMC_Extension extends Extension {
  extensionName = "VRMC_vrm";
  static EXTENSION_NAME = "VRMC_vrm";

  read(context: any) {
    const json = context.jsonDoc.json;

    if (json.extensions[this.extensionName]) {
      if (this.document.getRoot().extras == null) {
        this.document.getRoot().extras = {};
      }

      delete json.extensions[this.extensionName].materialProperties;

      if (json.extensions[this.extensionName].lookAt) {
        const lookAt = json.extensions[this.extensionName].lookAt;

        lookAt.rangeMapHorizontalInner.inputMaxValue = 0.00001;
        lookAt.rangeMapHorizontalOuter.inputMaxValue = 0.00001;
        lookAt.rangeMapVerticalDown.inputMaxValue = 0.00001;
        lookAt.rangeMapVerticalUp.inputMaxValue = 0.00001;
      }

      this.document.getRoot().extras[this.extensionName] =
        json.extensions[this.extensionName];
    }

    return this;
  }

  write(context: any) {
    const json = context.jsonDoc.json;

    if (this.document.getRoot().extras[this.extensionName]) {
      if (json.extensions == null) {
        json.extensions = {};
      }

      json.extensions[this.extensionName] =
        this.document.getRoot().extras[this.extensionName];

      json.extensions[this.extensionName].meta.texture = null;
    }

    return this;
  }
}

/**
 * VRMC materials mtoon extension handler
 */
export class VRMC_materials_mtoon extends Extension {
  extensionName = "VRMC_materials_mtoon";
  static EXTENSION_NAME = "VRMC_materials_mtoon";

  createEmitter(name = "") {}

  read(context: any) {
    return this;
  }

  write(context: any) {
    return this;
  }
}

/**
 * VRMC spring bone extension handler
 */
export class VRMC_springBone extends Extension {
  extensionName = "VRMC_springBone";
  static EXTENSION_NAME = "VRMC_springBone";

  createEmitter(name = "") {}

  read(context: any) {
    const json = context.jsonDoc.json;

    if (json.extensions[this.extensionName]) {
      if (this.document.getRoot().extras == null) {
        this.document.getRoot().extras = {};
      }

      this.document.getRoot().extras[this.extensionName] =
        json.extensions[this.extensionName];
    }

    return this;
  }

  write(context: any) {
    const json = context.jsonDoc.json;

    if (this.document.getRoot().extras[this.extensionName]) {
      if (json.extensions == null) {
        json.extensions = {};
      }

      json.extensions[this.extensionName] =
        this.document.getRoot().extras[this.extensionName];
    }

    return this;
  }
}

/**
 * VRMC node constraint extension handler
 */
export class VRMC_node_constraint extends Extension {
  extensionName = "VRMC_node_constraint";
  static EXTENSION_NAME = "VRMC_node_constraint";

  constraints: Map<any, any>;

  constructor(doc: any) {
    super(doc);
    this.constraints = new Map();
  }

  createEmitter(name = "") {}

  setConstraint(node: any, data: any) {
    this.constraints.set(node, data);
    return this;
  }

  getConstraint(node: any) {
    return this.constraints.get(node);
  }

  removeConstraint(node: any) {
    this.constraints.delete(node);
    return this;
  }

  read(context: any) {
    const json = context.jsonDoc.json;
    const nodeDefs = json.nodes || [];

    nodeDefs.forEach((nodeDef: any, nodeIndex: number) => {
      if (!nodeDef.extensions || !nodeDef.extensions[this.extensionName])
        return;

      this.setConstraint(nodeIndex, nodeDef.extensions[this.extensionName]);
    });

    return this;
  }

  write(context: any) {
    const json = context.jsonDoc.json;
    const nodeDefs = json.nodes || [];

    nodeDefs.forEach((nodeDef: any, nodeIndex: number) => {
      const constraints = this.getConstraint(nodeIndex);

      if (constraints != null) {
        nodeDef.extensions = nodeDef.extensions || {};
        nodeDef.extensions[this.extensionName] = constraints;
      }
    });

    return this;
  }
}
