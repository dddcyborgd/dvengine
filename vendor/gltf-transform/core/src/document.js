import { PropertyType } from './constants.js';
import { Graph } from '../../property-graph/property-graph.modern.js';
import { Accessor, Animation, AnimationChannel, AnimationSampler, Buffer, Camera, Material, Mesh, Node, Primitive, PrimitiveTarget, Property, Root, Scene, Skin, Texture } from './properties/index.js';
import { Logger } from './utils/index.js';
export class Document {
    _graph = new Graph();
    _root = new Root(this._graph);
    _logger = Logger.DEFAULT_INSTANCE;
    static _GRAPH_DOCUMENTS = new WeakMap();
    static fromGraph(graph) {
        return Document._GRAPH_DOCUMENTS.get(graph) || null;
    }
    constructor(){
        Document._GRAPH_DOCUMENTS.set(this._graph, this);
    }
    getRoot() {
        return this._root;
    }
    getGraph() {
        return this._graph;
    }
    getLogger() {
        return this._logger;
    }
    setLogger(logger) {
        this._logger = logger;
        return this;
    }
    clone() {
        return new Document().setLogger(this._logger).merge(this);
    }
    merge(other) {
        const thisExtensions = {};
        for (const otherExtension of other.getRoot().listExtensionsUsed()){
            const thisExtension = this.createExtension(otherExtension.constructor);
            if (otherExtension.isRequired()) thisExtension.setRequired(true);
            thisExtensions[thisExtension.extensionName] = thisExtension;
        }
        const visited = new Set();
        const propertyMap = new Map();
        visited.add(other._root);
        propertyMap.set(other._root, this._root);
        for (const edge of other._graph.listEdges()){
            for (const otherProp of [
                edge.getParent(),
                edge.getChild()
            ]){
                if (visited.has(otherProp)) continue;
                let thisProp;
                if (otherProp.propertyType === PropertyType.TEXTURE_INFO) {
                    thisProp = otherProp;
                } else {
                    const PropertyClass = otherProp.constructor;
                    thisProp = new PropertyClass(this._graph);
                }
                propertyMap.set(otherProp, thisProp);
                visited.add(otherProp);
            }
        }
        const resolve = (p)=>{
            const resolved = propertyMap.get(p);
            if (!resolved) throw new Error('Could resolve property.');
            return resolved;
        };
        for (const otherProp of visited){
            const thisProp = propertyMap.get(otherProp);
            if (!thisProp) throw new Error('Could resolve property.');
            if (thisProp.propertyType !== PropertyType.TEXTURE_INFO) {
                thisProp.copy(otherProp, resolve);
            }
        }
        return this;
    }
    async transform(...transforms) {
        const stack = transforms.map((fn)=>fn.name);
        for (const transform of transforms){
            await transform(this, {
                stack
            });
        }
        return this;
    }
    createExtension(ctor) {
        const extensionName = ctor.EXTENSION_NAME;
        const prevExtension = this.getRoot().listExtensionsUsed().find((ext)=>ext.extensionName === extensionName);
        return prevExtension || new ctor(this);
    }
    createScene(name = '') {
        return new Scene(this._graph, name);
    }
    createNode(name = '') {
        return new Node(this._graph, name);
    }
    createCamera(name = '') {
        return new Camera(this._graph, name);
    }
    createSkin(name = '') {
        return new Skin(this._graph, name);
    }
    createMesh(name = '') {
        return new Mesh(this._graph, name);
    }
    createPrimitive() {
        return new Primitive(this._graph);
    }
    createPrimitiveTarget(name = '') {
        return new PrimitiveTarget(this._graph, name);
    }
    createMaterial(name = '') {
        return new Material(this._graph, name);
    }
    createTexture(name = '') {
        return new Texture(this._graph, name);
    }
    createAnimation(name = '') {
        return new Animation(this._graph, name);
    }
    createAnimationChannel(name = '') {
        return new AnimationChannel(this._graph, name);
    }
    createAnimationSampler(name = '') {
        return new AnimationSampler(this._graph, name);
    }
    createAccessor(name = '', buffer = null) {
        if (!buffer) {
            buffer = this.getRoot().listBuffers()[0];
        }
        return new Accessor(this._graph, name).setBuffer(buffer);
    }
    createBuffer(name = '') {
        return new Buffer(this._graph, name);
    }
}
