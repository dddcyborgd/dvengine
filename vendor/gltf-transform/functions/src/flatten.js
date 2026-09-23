import { Document, Node, PropertyType } from '../../core/index.js';
import { clearNodeParent } from './clear-node-parent.js';
import { prune } from './prune.js';
import { createTransform } from './utils.js';
const NAME = 'flatten';
export const FLATTEN_DEFAULTS = {};
export function flatten(_options = FLATTEN_DEFAULTS) {
    const options = {
        ...FLATTEN_DEFAULTS,
        ..._options
    };
    return createTransform(NAME, async (document)=>{
        const root = document.getRoot();
        const logger = document.getLogger();
        const joints = new Set();
        for (const skin of root.listSkins()){
            for (const joint of skin.listJoints()){
                joints.add(joint);
            }
        }
        const animated = new Set();
        for (const animation of root.listAnimations()){
            for (const channel of animation.listChannels()){
                const node = channel.getTargetNode();
                if (node) {
                    animated.add(node);
                }
            }
        }
        const hasJointParent = new Set();
        const hasAnimatedParent = new Set();
        for (const scene of root.listScenes()){
            scene.traverse((node)=>{
                const parent = node.getParentNode();
                if (!parent) return;
                if (joints.has(parent) || hasJointParent.has(parent)) {
                    hasJointParent.add(node);
                }
                if (animated.has(parent) || hasAnimatedParent.has(parent)) {
                    hasAnimatedParent.add(node);
                }
            });
        }
        for (const scene of root.listScenes()){
            scene.traverse((node)=>{
                if (animated.has(node)) return;
                if (hasJointParent.has(node)) return;
                if (hasAnimatedParent.has(node)) return;
                clearNodeParent(node);
            });
        }
        if (animated.size) {
            logger.debug(`${NAME}: Flattening node hierarchies with TRS animation not yet supported.`);
        }
        await document.transform(prune({
            propertyTypes: [
                PropertyType.NODE
            ],
            keepLeaves: false
        }));
        logger.debug(`${NAME}: Complete.`);
    });
}
