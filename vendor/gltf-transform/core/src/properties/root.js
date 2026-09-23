import { PropertyType, VERSION } from '../constants.js';
import { Accessor } from './accessor.js';
import { Animation } from './animation.js';
import { Buffer } from './buffer.js';
import { Camera } from './camera.js';
import { Material } from './material.js';
import { Mesh } from './mesh.js';
import { Node } from './node.js';
import { COPY_IDENTITY, Property } from './property.js';
import { Scene } from './scene.js';
import { Skin } from './skin.js';
import { Texture } from './texture.js';
import { ExtensibleProperty } from './extensible-property.js';
export class Root extends ExtensibleProperty {
    _extensions = new Set();
    init() {
        this.propertyType = PropertyType.ROOT;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            asset: {
                generator: `glTF-Transform ${VERSION}`,
                version: '2.0'
            },
            defaultScene: null,
            accessors: [],
            animations: [],
            buffers: [],
            cameras: [],
            materials: [],
            meshes: [],
            nodes: [],
            scenes: [],
            skins: [],
            textures: []
        });
    }
    constructor(graph){
        super(graph);
        graph.addEventListener('node:create', (event)=>{
            this._addChildOfRoot(event.target);
        });
    }
    clone() {
        throw new Error('Root cannot be cloned.');
    }
    copy(other, resolve = COPY_IDENTITY) {
        if (resolve === COPY_IDENTITY) throw new Error('Root cannot be copied.');
        this.set('asset', {
            ...other.get('asset')
        });
        this.setName(other.getName());
        this.setExtras({
            ...other.getExtras()
        });
        this.setDefaultScene(other.getDefaultScene() ? resolve(other.getDefaultScene()) : null);
        for (const extensionName of other.listRefMapKeys('extensions')){
            const otherExtension = other.getExtension(extensionName);
            this.setExtension(extensionName, resolve(otherExtension));
        }
        return this;
    }
    _addChildOfRoot(child) {
        if (child instanceof Scene) {
            this.addRef('scenes', child);
        } else if (child instanceof Node) {
            this.addRef('nodes', child);
        } else if (child instanceof Camera) {
            this.addRef('cameras', child);
        } else if (child instanceof Skin) {
            this.addRef('skins', child);
        } else if (child instanceof Mesh) {
            this.addRef('meshes', child);
        } else if (child instanceof Material) {
            this.addRef('materials', child);
        } else if (child instanceof Texture) {
            this.addRef('textures', child);
        } else if (child instanceof Animation) {
            this.addRef('animations', child);
        } else if (child instanceof Accessor) {
            this.addRef('accessors', child);
        } else if (child instanceof Buffer) {
            this.addRef('buffers', child);
        }
        return this;
    }
    getAsset() {
        return this.get('asset');
    }
    listExtensionsUsed() {
        return Array.from(this._extensions);
    }
    listExtensionsRequired() {
        return this.listExtensionsUsed().filter((extension)=>extension.isRequired());
    }
    _enableExtension(extension) {
        this._extensions.add(extension);
        return this;
    }
    _disableExtension(extension) {
        this._extensions.delete(extension);
        return this;
    }
    listScenes() {
        return this.listRefs('scenes');
    }
    setDefaultScene(defaultScene) {
        return this.setRef('defaultScene', defaultScene);
    }
    getDefaultScene() {
        return this.getRef('defaultScene');
    }
    listNodes() {
        return this.listRefs('nodes');
    }
    listCameras() {
        return this.listRefs('cameras');
    }
    listSkins() {
        return this.listRefs('skins');
    }
    listMeshes() {
        return this.listRefs('meshes');
    }
    listMaterials() {
        return this.listRefs('materials');
    }
    listTextures() {
        return this.listRefs('textures');
    }
    listAnimations() {
        return this.listRefs('animations');
    }
    listAccessors() {
        return this.listRefs('accessors');
    }
    listBuffers() {
        return this.listRefs('buffers');
    }
}
