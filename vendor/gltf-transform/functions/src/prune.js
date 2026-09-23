import { AnimationChannel, Document, Graph, Property, PropertyType, Root, Node, Scene, ExtensionProperty, Material, Primitive, PrimitiveTarget, Texture, TextureInfo } from '../../core/index.js';
import { createTransform } from './utils.js';
const NAME = 'prune';
const PRUNE_DEFAULTS = {
    propertyTypes: [
        PropertyType.NODE,
        PropertyType.SKIN,
        PropertyType.MESH,
        PropertyType.CAMERA,
        PropertyType.PRIMITIVE,
        PropertyType.PRIMITIVE_TARGET,
        PropertyType.ANIMATION,
        PropertyType.MATERIAL,
        PropertyType.TEXTURE,
        PropertyType.ACCESSOR,
        PropertyType.BUFFER
    ],
    keepLeaves: false,
    keepAttributes: true
};
export const prune = function(_options = PRUNE_DEFAULTS) {
    const options = {
        ...PRUNE_DEFAULTS,
        ..._options
    };
    const propertyTypes = new Set(options.propertyTypes);
    return createTransform(NAME, (doc)=>{
        const logger = doc.getLogger();
        const root = doc.getRoot();
        const graph = doc.getGraph();
        const disposed = {};
        if (propertyTypes.has(PropertyType.MESH)) {
            for (const mesh of root.listMeshes()){
                if (mesh.listPrimitives().length > 0) continue;
                mesh.dispose();
                markDisposed(mesh);
            }
        }
        if (propertyTypes.has(PropertyType.NODE) && !options.keepLeaves) root.listScenes().forEach(nodeTreeShake);
        if (propertyTypes.has(PropertyType.NODE)) root.listNodes().forEach(treeShake);
        if (propertyTypes.has(PropertyType.SKIN)) root.listSkins().forEach(treeShake);
        if (propertyTypes.has(PropertyType.MESH)) root.listMeshes().forEach(treeShake);
        if (propertyTypes.has(PropertyType.CAMERA)) root.listCameras().forEach(treeShake);
        if (propertyTypes.has(PropertyType.PRIMITIVE)) {
            indirectTreeShake(graph, PropertyType.PRIMITIVE);
        }
        if (propertyTypes.has(PropertyType.PRIMITIVE_TARGET)) {
            indirectTreeShake(graph, PropertyType.PRIMITIVE_TARGET);
        }
        if (!options.keepAttributes && propertyTypes.has(PropertyType.ACCESSOR)) {
            for (const mesh of root.listMeshes()){
                for (const prim of mesh.listPrimitives()){
                    const required = listRequiredSemantics(doc, prim.getMaterial());
                    const unused = listUnusedSemantics(prim, required);
                    pruneAttributes(prim, unused);
                    prim.listTargets().forEach((target)=>pruneAttributes(target, unused));
                }
            }
        }
        if (propertyTypes.has(PropertyType.ANIMATION)) {
            for (const anim of root.listAnimations()){
                for (const channel of anim.listChannels()){
                    if (!channel.getTargetNode()) {
                        channel.dispose();
                        markDisposed(channel);
                    }
                }
                if (!anim.listChannels().length) {
                    const samplers = anim.listSamplers();
                    treeShake(anim);
                    samplers.forEach(treeShake);
                } else {
                    anim.listSamplers().forEach(treeShake);
                }
            }
        }
        if (propertyTypes.has(PropertyType.MATERIAL)) root.listMaterials().forEach(treeShake);
        if (propertyTypes.has(PropertyType.TEXTURE)) root.listTextures().forEach(treeShake);
        if (propertyTypes.has(PropertyType.ACCESSOR)) root.listAccessors().forEach(treeShake);
        if (propertyTypes.has(PropertyType.BUFFER)) root.listBuffers().forEach(treeShake);
        if (Object.keys(disposed).length) {
            const str = Object.keys(disposed).map((t)=>`${t} (${disposed[t]})`).join(', ');
            logger.info(`${NAME}: Removed types... ${str}`);
        } else {
            logger.info(`${NAME}: No unused properties found.`);
        }
        logger.debug(`${NAME}: Complete.`);
        function treeShake(prop) {
            const parents = prop.listParents().filter((p)=>!(p instanceof Root || p instanceof AnimationChannel));
            if (!parents.length) {
                prop.dispose();
                markDisposed(prop);
            }
        }
        function indirectTreeShake(graph, propertyType) {
            graph.listEdges().map((edge)=>edge.getParent()).filter((parent)=>parent.propertyType === propertyType).forEach(treeShake);
        }
        function nodeTreeShake(prop) {
            prop.listChildren().forEach(nodeTreeShake);
            if (prop instanceof Scene) return;
            const isUsed = graph.listParentEdges(prop).some((e)=>{
                const ptype = e.getParent().propertyType;
                return ptype !== PropertyType.ROOT && ptype !== PropertyType.SCENE && ptype !== PropertyType.NODE;
            });
            const isEmpty = graph.listChildren(prop).length === 0;
            if (isEmpty && !isUsed) {
                prop.dispose();
                markDisposed(prop);
            }
        }
        function pruneAttributes(prim, unused) {
            for (const semantic of unused){
                prim.setAttribute(semantic, null);
            }
        }
        function markDisposed(prop) {
            disposed[prop.propertyType] = disposed[prop.propertyType] || 0;
            disposed[prop.propertyType]++;
        }
    });
};
function listUnusedSemantics(prim, required) {
    const unused = [];
    for (const semantic of prim.listSemantics()){
        if (semantic === 'TANGENT' && !required.has(semantic)) {
            unused.push(semantic);
        } else if (semantic.startsWith('TEXCOORD_') && !required.has(semantic)) {
            unused.push(semantic);
        } else if (semantic.startsWith('COLOR_') && semantic !== 'COLOR_0') {
            unused.push(semantic);
        }
    }
    return unused;
}
function listRequiredSemantics(document, material, semantics = new Set()) {
    if (!material) return semantics;
    const graph = document.getGraph();
    const edges = graph.listChildEdges(material);
    const textureNames = new Set();
    for (const edge of edges){
        if (edge.getChild() instanceof Texture) {
            textureNames.add(edge.getName());
        }
    }
    for (const edge of edges){
        const name = edge.getName();
        const child = edge.getChild();
        if (child instanceof TextureInfo) {
            if (textureNames.has(name.replace(/Info$/, ''))) {
                semantics.add(`TEXCOORD_${child.getTexCoord()}`);
            }
        }
        if (child instanceof Texture && name.match(/normalTexture/i)) {
            semantics.add('TANGENT');
        }
        if (child instanceof ExtensionProperty) {
            listRequiredSemantics(document, child, semantics);
        }
    }
    return semantics;
}
