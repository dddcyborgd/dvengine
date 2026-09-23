import { PropertyType } from '../constants.js';
import { ExtensibleProperty } from './extensible-property.js';
export class Camera extends ExtensibleProperty {
    static Type = {
        PERSPECTIVE: 'perspective',
        ORTHOGRAPHIC: 'orthographic'
    };
    init() {
        this.propertyType = PropertyType.CAMERA;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            type: Camera.Type.PERSPECTIVE,
            znear: 0.1,
            zfar: 100,
            aspectRatio: null,
            yfov: Math.PI * 2 * 50 / 360,
            xmag: 1,
            ymag: 1
        });
    }
    getType() {
        return this.get('type');
    }
    setType(type) {
        return this.set('type', type);
    }
    getZNear() {
        return this.get('znear');
    }
    setZNear(znear) {
        return this.set('znear', znear);
    }
    getZFar() {
        return this.get('zfar');
    }
    setZFar(zfar) {
        return this.set('zfar', zfar);
    }
    getAspectRatio() {
        return this.get('aspectRatio');
    }
    setAspectRatio(aspectRatio) {
        return this.set('aspectRatio', aspectRatio);
    }
    getYFov() {
        return this.get('yfov');
    }
    setYFov(yfov) {
        return this.set('yfov', yfov);
    }
    getXMag() {
        return this.get('xmag');
    }
    setXMag(xmag) {
        return this.set('xmag', xmag);
    }
    getYMag() {
        return this.get('ymag');
    }
    setYMag(ymag) {
        return this.set('ymag', ymag);
    }
}
