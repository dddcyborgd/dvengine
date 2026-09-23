import { Accessor, ExtensionProperty, PropertyType } from '../../../core/index.js';
import { EXT_MESH_GPU_INSTANCING } from '../constants.js';
export const INSTANCE_ATTRIBUTE = 'INSTANCE_ATTRIBUTE';
export class InstancedMesh extends ExtensionProperty {
    static EXTENSION_NAME = EXT_MESH_GPU_INSTANCING;
    init() {
        this.extensionName = EXT_MESH_GPU_INSTANCING;
        this.propertyType = 'InstancedMesh';
        this.parentTypes = [
            PropertyType.NODE
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            attributes: {}
        });
    }
    getAttribute(semantic) {
        return this.getRefMap('attributes', semantic);
    }
    setAttribute(semantic, accessor) {
        return this.setRefMap('attributes', semantic, accessor, {
            usage: INSTANCE_ATTRIBUTE
        });
    }
    listAttributes() {
        return this.listRefMapValues('attributes');
    }
    listSemantics() {
        return this.listRefMapKeys('attributes');
    }
}
