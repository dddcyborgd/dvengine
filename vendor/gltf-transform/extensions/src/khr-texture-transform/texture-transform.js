import { Extension, MathUtils, ReaderContext, WriterContext } from '../../../core/index.js';
import { KHR_TEXTURE_TRANSFORM } from '../constants.js';
import { Transform } from './transform.js';
const NAME = KHR_TEXTURE_TRANSFORM;
export class KHRTextureTransform extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createTransform() {
        return new Transform(this.document.getGraph());
    }
    read(context) {
        for (const [textureInfo, textureInfoDef] of Array.from(context.textureInfos.entries())){
            if (!textureInfoDef.extensions || !textureInfoDef.extensions[NAME]) continue;
            const transform = this.createTransform();
            const transformDef = textureInfoDef.extensions[NAME];
            if (transformDef.offset !== undefined) transform.setOffset(transformDef.offset);
            if (transformDef.rotation !== undefined) transform.setRotation(transformDef.rotation);
            if (transformDef.scale !== undefined) transform.setScale(transformDef.scale);
            if (transformDef.texCoord !== undefined) transform.setTexCoord(transformDef.texCoord);
            textureInfo.setExtension(NAME, transform);
        }
        return this;
    }
    write(context) {
        const textureInfoEntries = Array.from(context.textureInfoDefMap.entries());
        for (const [textureInfo, textureInfoDef] of textureInfoEntries){
            const transform = textureInfo.getExtension(NAME);
            if (!transform) continue;
            textureInfoDef.extensions = textureInfoDef.extensions || {};
            const transformDef = {};
            const eq = MathUtils.eq;
            if (!eq(transform.getOffset(), [
                0,
                0
            ])) transformDef.offset = transform.getOffset();
            if (transform.getRotation() !== 0) transformDef.rotation = transform.getRotation();
            if (!eq(transform.getScale(), [
                1,
                1
            ])) transformDef.scale = transform.getScale();
            if (transform.getTexCoord() != null) transformDef.texCoord = transform.getTexCoord();
            textureInfoDef.extensions[NAME] = transformDef;
        }
        return this;
    }
}
