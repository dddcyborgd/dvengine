import { multiply } from '../../../gl-matrix/mat4.js';
import { PropertyType } from '../constants.js';
import { $attributes } from '../../../property-graph/property-graph.modern.js';
import { MathUtils } from '../utils/index.js';
import { ExtensibleProperty } from './extensible-property.js';
import { COPY_IDENTITY } from './property.js';
export class Node extends ExtensibleProperty {
    _parentNode = null;
    init() {
        this.propertyType = PropertyType.NODE;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            translation: [
                0,
                0,
                0
            ],
            rotation: [
                0,
                0,
                0,
                1
            ],
            scale: [
                1,
                1,
                1
            ],
            weights: [],
            camera: null,
            mesh: null,
            skin: null,
            children: []
        });
    }
    copy(other, resolve = COPY_IDENTITY) {
        if (resolve === COPY_IDENTITY) throw new Error('Node cannot be copied.');
        return super.copy(other, resolve);
    }
    getTranslation() {
        return this.get('translation');
    }
    getRotation() {
        return this.get('rotation');
    }
    getScale() {
        return this.get('scale');
    }
    setTranslation(translation) {
        return this.set('translation', translation);
    }
    setRotation(rotation) {
        return this.set('rotation', rotation);
    }
    setScale(scale) {
        return this.set('scale', scale);
    }
    getMatrix() {
        return MathUtils.compose(this.get('translation'), this.get('rotation'), this.get('scale'), []);
    }
    setMatrix(matrix) {
        const translation = this.get('translation').slice();
        const rotation = this.get('rotation').slice();
        const scale = this.get('scale').slice();
        MathUtils.decompose(matrix, translation, rotation, scale);
        return this.set('translation', translation).set('rotation', rotation).set('scale', scale);
    }
    getWorldTranslation() {
        const t = [
            0,
            0,
            0
        ];
        MathUtils.decompose(this.getWorldMatrix(), t, [
            0,
            0,
            0,
            1
        ], [
            1,
            1,
            1
        ]);
        return t;
    }
    getWorldRotation() {
        const r = [
            0,
            0,
            0,
            1
        ];
        MathUtils.decompose(this.getWorldMatrix(), [
            0,
            0,
            0
        ], r, [
            1,
            1,
            1
        ]);
        return r;
    }
    getWorldScale() {
        const s = [
            1,
            1,
            1
        ];
        MathUtils.decompose(this.getWorldMatrix(), [
            0,
            0,
            0
        ], [
            0,
            0,
            0,
            1
        ], s);
        return s;
    }
    getWorldMatrix() {
        const ancestors = [];
        for(let node = this; node != null; node = node._parentNode){
            ancestors.push(node);
        }
        let ancestor;
        const worldMatrix = ancestors.pop().getMatrix();
        while(ancestor = ancestors.pop()){
            multiply(worldMatrix, worldMatrix, ancestor.getMatrix());
        }
        return worldMatrix;
    }
    addChild(child) {
        if (child._parentNode) child._parentNode.removeChild(child);
        this.addRef('children', child);
        child._parentNode = this;
        const childrenRefs = this[$attributes]['children'];
        const ref = childrenRefs[childrenRefs.length - 1];
        ref.addEventListener('dispose', ()=>child._parentNode = null);
        return this;
    }
    removeChild(child) {
        return this.removeRef('children', child);
    }
    listChildren() {
        return this.listRefs('children');
    }
    getParent() {
        if (this._parentNode) return this._parentNode;
        const scene = this.listParents().find((parent)=>parent.propertyType === PropertyType.SCENE);
        return scene || null;
    }
    getParentNode() {
        return this._parentNode;
    }
    getMesh() {
        return this.getRef('mesh');
    }
    setMesh(mesh) {
        return this.setRef('mesh', mesh);
    }
    getCamera() {
        return this.getRef('camera');
    }
    setCamera(camera) {
        return this.setRef('camera', camera);
    }
    getSkin() {
        return this.getRef('skin');
    }
    setSkin(skin) {
        return this.setRef('skin', skin);
    }
    getWeights() {
        return this.get('weights');
    }
    setWeights(weights) {
        return this.set('weights', weights);
    }
    traverse(fn) {
        fn(this);
        for (const child of this.listChildren())child.traverse(fn);
        return this;
    }
}
