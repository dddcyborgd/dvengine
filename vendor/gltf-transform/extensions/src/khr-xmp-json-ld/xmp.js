import { Animation, Extension, Material, Mesh, Node, PropertyType, ReaderContext, Scene, Texture, WriterContext } from '../../../core/index.js';
import { KHR_XMP_JSON_LD } from '../constants.js';
import { Packet } from './packet.js';
const NAME = KHR_XMP_JSON_LD;
export class KHRXMP extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createPacket() {
        return new Packet(this.document.getGraph());
    }
    listPackets() {
        return Array.from(this.properties);
    }
    read(context) {
        const extensionDef = context.jsonDoc.json.extensions?.[NAME];
        if (!extensionDef || !extensionDef.packets) return this;
        const json = context.jsonDoc.json;
        const root = this.document.getRoot();
        const packets = extensionDef.packets.map((packetDef)=>this.createPacket().fromJSONLD(packetDef));
        const defLists = [
            [
                json.asset
            ],
            json.scenes,
            json.nodes,
            json.meshes,
            json.materials,
            json.images,
            json.animations
        ];
        const propertyLists = [
            [
                root
            ],
            root.listScenes(),
            root.listNodes(),
            root.listMeshes(),
            root.listMaterials(),
            root.listTextures(),
            root.listAnimations()
        ];
        for(let i = 0; i < defLists.length; i++){
            const defs = defLists[i] || [];
            for(let j = 0; j < defs.length; j++){
                const def = defs[j];
                if (def.extensions && def.extensions[NAME]) {
                    const xmpDef = def.extensions[NAME];
                    propertyLists[i][j].setExtension(NAME, packets[xmpDef.packet]);
                }
            }
        }
        return this;
    }
    write(context) {
        const { json } = context.jsonDoc;
        const packetDefs = [];
        for (const packet of this.properties){
            packetDefs.push(packet.toJSONLD());
            for (const parent of packet.listParents()){
                let parentDef;
                switch(parent.propertyType){
                    case PropertyType.ROOT:
                        parentDef = json.asset;
                        break;
                    case PropertyType.SCENE:
                        parentDef = json.scenes[context.sceneIndexMap.get(parent)];
                        break;
                    case PropertyType.NODE:
                        parentDef = json.nodes[context.nodeIndexMap.get(parent)];
                        break;
                    case PropertyType.MESH:
                        parentDef = json.meshes[context.meshIndexMap.get(parent)];
                        break;
                    case PropertyType.MATERIAL:
                        parentDef = json.materials[context.materialIndexMap.get(parent)];
                        break;
                    case PropertyType.TEXTURE:
                        parentDef = json.images[context.imageIndexMap.get(parent)];
                        break;
                    case PropertyType.ANIMATION:
                        parentDef = json.animations[context.animationIndexMap.get(parent)];
                        break;
                    default:
                        parentDef = null;
                        this.document.getLogger().warn(`[${NAME}]: Unsupported parent property, "${parent.propertyType}"`);
                        break;
                }
                if (!parentDef) continue;
                parentDef.extensions = parentDef.extensions || {};
                parentDef.extensions[NAME] = {
                    packet: packetDefs.length - 1
                };
            }
        }
        if (packetDefs.length > 0) {
            json.extensions = json.extensions || {};
            json.extensions[NAME] = {
                packets: packetDefs
            };
        }
        return this;
    }
}
