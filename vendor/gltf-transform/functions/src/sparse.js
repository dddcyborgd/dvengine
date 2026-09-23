import { Document, MathUtils } from '../../core/index.js';
import { createTransform } from './utils.js';
const NAME = 'sparse';
const SPARSE_DEFAULTS = {
    ratio: 1 / 3
};
export function sparse(_options = SPARSE_DEFAULTS) {
    const options = {
        ...SPARSE_DEFAULTS,
        ..._options
    };
    const ratio = options.ratio;
    if (ratio < 0 || ratio > 1) {
        throw new Error(`${NAME}: Ratio must be between 0 and 1.`);
    }
    return createTransform(NAME, (document)=>{
        const root = document.getRoot();
        const logger = document.getLogger();
        let modifiedCount = 0;
        for (const accessor of root.listAccessors()){
            const count = accessor.getCount();
            const base = Array(accessor.getElementSize()).fill(0);
            const el = Array(accessor.getElementSize()).fill(0);
            let nonZeroCount = 0;
            for(let i = 0; i < count; i++){
                accessor.getElement(i, el);
                if (!MathUtils.eq(el, base, 0)) nonZeroCount++;
                if (nonZeroCount / count >= ratio) break;
            }
            const sparse = nonZeroCount / count < ratio;
            if (sparse !== accessor.getSparse()) {
                accessor.setSparse(sparse);
                modifiedCount++;
            }
        }
        logger.debug(`${NAME}: Updated ${modifiedCount} accessors.`);
        logger.debug(`${NAME}: Complete.`);
    });
}
