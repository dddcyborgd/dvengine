import { Extension, PropertyType, ReaderContext, WriterContext } from '../../../core/index.js';
import { EXT_MESH_GPU_INSTANCING } from '../constants.js';
import { InstancedMesh, INSTANCE_ATTRIBUTE } from './instanced-mesh.js';
const NAME = EXT_MESH_GPU_INSTANCING;
export class EXTMeshGPUInstancing extends Extension {
    extensionName = NAME;
    provideTypes = [
        PropertyType.NODE
    ];
    prewriteTypes = [
        PropertyType.ACCESSOR
    ];
    static EXTENSION_NAME = NAME;
    createInstancedMesh() {
        return new InstancedMesh(this.document.getGraph());
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        const nodeDefs = jsonDoc.json.nodes || [];
        nodeDefs.forEach((nodeDef, nodeIndex)=>{
            if (!nodeDef.extensions || !nodeDef.extensions[NAME]) return;
            const instancedMeshDef = nodeDef.extensions[NAME];
            const instancedMesh = this.createInstancedMesh();
            for(const semantic in instancedMeshDef.attributes){
                instancedMesh.setAttribute(semantic, context.accessors[instancedMeshDef.attributes[semantic]]);
            }
            context.nodes[nodeIndex].setExtension(NAME, instancedMesh);
        });
        return this;
    }
    prewrite(context) {
        context.accessorUsageGroupedByParent.add(INSTANCE_ATTRIBUTE);
        for (const prop of this.properties){
            for (const attribute of prop.listAttributes()){
                context.addAccessorToUsageGroup(attribute, INSTANCE_ATTRIBUTE);
            }
        }
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listNodes().forEach((node)=>{
            const instancedMesh = node.getExtension(NAME);
            if (instancedMesh) {
                const nodeIndex = context.nodeIndexMap.get(node);
                const nodeDef = jsonDoc.json.nodes[nodeIndex];
                const instancedMeshDef = {
                    attributes: {}
                };
                instancedMesh.listSemantics().forEach((semantic)=>{
                    const attribute = instancedMesh.getAttribute(semantic);
                    instancedMeshDef.attributes[semantic] = context.accessorIndexMap.get(attribute);
                });
                nodeDef.extensions = nodeDef.extensions || {};
                nodeDef.extensions[NAME] = instancedMeshDef;
            }
        });
        return this;
    }
}
