import { Accessor, AnimationChannel, AnimationSampler, Document } from '../../core/index.js';
import { createTransform } from './utils.js';
const NAME = 'sequence';
const SEQUENCE_DEFAULTS = {
    name: '',
    fps: 10,
    pattern: /.*/,
    sort: true
};
export function sequence(_options = SEQUENCE_DEFAULTS) {
    const options = {
        ...SEQUENCE_DEFAULTS,
        ..._options
    };
    return createTransform(NAME, (doc)=>{
        const logger = doc.getLogger();
        const root = doc.getRoot();
        const fps = options.fps;
        const sequenceNodes = root.listNodes().filter((node)=>node.getName().match(options.pattern));
        if (options.sort) {
            sequenceNodes.sort((a, b)=>a.getName() > b.getName() ? 1 : -1);
        }
        const anim = doc.createAnimation(options.name);
        const animBuffer = root.listBuffers()[0];
        sequenceNodes.forEach((node, i)=>{
            let inputArray;
            let outputArray;
            if (i === 0) {
                inputArray = [
                    i / fps,
                    (i + 1) / fps
                ];
                outputArray = [
                    1,
                    1,
                    1,
                    0,
                    0,
                    0
                ];
            } else if (i === sequenceNodes.length - 1) {
                inputArray = [
                    (i - 1) / fps,
                    i / fps
                ];
                outputArray = [
                    0,
                    0,
                    0,
                    1,
                    1,
                    1
                ];
            } else {
                inputArray = [
                    (i - 1) / fps,
                    i / fps,
                    (i + 1) / fps
                ];
                outputArray = [
                    0,
                    0,
                    0,
                    1,
                    1,
                    1,
                    0,
                    0,
                    0
                ];
            }
            const input = doc.createAccessor().setArray(new Float32Array(inputArray)).setBuffer(animBuffer);
            const output = doc.createAccessor().setArray(new Float32Array(outputArray)).setBuffer(animBuffer).setType(Accessor.Type.VEC3);
            const sampler = doc.createAnimationSampler().setInterpolation(AnimationSampler.Interpolation.STEP).setInput(input).setOutput(output);
            const channel = doc.createAnimationChannel().setTargetNode(node).setTargetPath(AnimationChannel.TargetPath.SCALE).setSampler(sampler);
            anim.addSampler(sampler).addChannel(channel);
        });
        logger.debug(`${NAME}: Complete.`);
    });
}
