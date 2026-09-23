import { getBounds } from '../../core/index.js';
import { createTransform } from './utils.js';
const NAME = 'center';
const CENTER_DEFAULTS = {
    pivot: 'center'
};
export function center(_options = CENTER_DEFAULTS) {
    const options = {
        ...CENTER_DEFAULTS,
        ..._options
    };
    return createTransform(NAME, (doc)=>{
        const logger = doc.getLogger();
        const root = doc.getRoot();
        const isAnimated = root.listAnimations().length > 0 || root.listSkins().length > 0;
        doc.getRoot().listScenes().forEach((scene, index)=>{
            logger.debug(`${NAME}: Scene ${index + 1} / ${root.listScenes().length}.`);
            let pivot;
            if (typeof options.pivot === 'string') {
                const bbox = getBounds(scene);
                pivot = [
                    (bbox.max[0] - bbox.min[0]) / 2 + bbox.min[0],
                    (bbox.max[1] - bbox.min[1]) / 2 + bbox.min[1],
                    (bbox.max[2] - bbox.min[2]) / 2 + bbox.min[2]
                ];
                if (options.pivot === 'above') pivot[1] = bbox.max[1];
                if (options.pivot === 'below') pivot[1] = bbox.min[1];
            } else {
                pivot = options.pivot;
            }
            logger.debug(`${NAME}: Pivot "${pivot.join(', ')}".`);
            const offset = [
                -1 * pivot[0],
                -1 * pivot[1],
                -1 * pivot[2]
            ];
            if (isAnimated) {
                logger.debug(`${NAME}: Model contains animation or skin. Adding a wrapper node.`);
                const offsetNode = doc.createNode('Pivot').setTranslation(offset);
                scene.listChildren().forEach((child)=>offsetNode.addChild(child));
                scene.addChild(offsetNode);
            } else {
                logger.debug(`${NAME}: Skipping wrapper, offsetting all root nodes.`);
                scene.listChildren().forEach((child)=>{
                    const t = child.getTranslation();
                    child.setTranslation([
                        t[0] + offset[0],
                        t[1] + offset[1],
                        t[2] + offset[2]
                    ]);
                });
            }
        });
        logger.debug(`${NAME}: Complete.`);
    });
}
