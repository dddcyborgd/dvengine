import { PropertyType } from '../constants.js';
import { BufferUtils, FileUtils, ImageUtils } from '../utils/index.js';
import { ExtensibleProperty } from './extensible-property.js';
export class Texture extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.TEXTURE;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            image: null,
            mimeType: '',
            uri: ''
        });
    }
    getMimeType() {
        return this.get('mimeType') || ImageUtils.extensionToMimeType(FileUtils.extension(this.get('uri')));
    }
    setMimeType(mimeType) {
        return this.set('mimeType', mimeType);
    }
    getURI() {
        return this.get('uri');
    }
    setURI(uri) {
        this.set('uri', uri);
        const mimeType = ImageUtils.extensionToMimeType(FileUtils.extension(uri));
        if (mimeType) this.set('mimeType', mimeType);
        return this;
    }
    getImage() {
        return this.get('image');
    }
    setImage(image) {
        return this.set('image', BufferUtils.assertView(image));
    }
    getSize() {
        const image = this.get('image');
        if (!image) return null;
        return ImageUtils.getSize(image, this.getMimeType());
    }
}
