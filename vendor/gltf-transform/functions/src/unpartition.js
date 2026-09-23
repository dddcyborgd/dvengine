import { createTransform } from './utils.js';
const NAME = 'unpartition';
const UNPARTITION_DEFAULTS = {};
const unpartition = (_options = UNPARTITION_DEFAULTS)=>{
    const options = {
        ...UNPARTITION_DEFAULTS,
        ..._options
    };
    return createTransform(NAME, async (document)=>{
        const logger = document.getLogger();
        const buffer = document.getRoot().listBuffers()[0];
        document.getRoot().listAccessors().forEach((a)=>a.setBuffer(buffer));
        document.getRoot().listBuffers().forEach((b, index)=>index > 0 ? b.dispose() : null);
        logger.debug(`${NAME}: Complete.`);
    });
};
export { unpartition };
