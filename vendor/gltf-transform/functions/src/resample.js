import { Accessor, AnimationSampler, Document, MathUtils, PropertyType, Root } from '../../core/index.js';
import * as quat from '../../gl-matrix/quat.js'; import { getAngle, slerp } from '../../gl-matrix/quat.js';
import { dedup } from './dedup.js';
import { createTransform, isTransformPending } from './utils.js';
const NAME = 'resample';
const RESAMPLE_DEFAULTS = {
    tolerance: 1e-4
};
export const resample = (_options = RESAMPLE_DEFAULTS)=>{
    const options = {
        ...RESAMPLE_DEFAULTS,
        ..._options
    };
    return createTransform(NAME, async (document, context)=>{
        const accessorsVisited = new Set();
        const srcAccessorCount = document.getRoot().listAccessors().length;
        const logger = document.getLogger();
        let didSkipMorphTargets = false;
        for (const animation of document.getRoot().listAnimations()){
            const samplerTargetPaths = new Map();
            for (const channel of animation.listChannels()){
                samplerTargetPaths.set(channel.getSampler(), channel.getTargetPath());
            }
            for (const sampler of animation.listSamplers()){
                if (samplerTargetPaths.get(sampler) === 'weights') {
                    didSkipMorphTargets = true;
                    continue;
                }
                if (sampler.getInterpolation() === 'STEP' || sampler.getInterpolation() === 'LINEAR') {
                    accessorsVisited.add(sampler.getInput());
                    accessorsVisited.add(sampler.getOutput());
                    optimize(sampler, samplerTargetPaths.get(sampler), options);
                }
            }
        }
        for (const accessor of Array.from(accessorsVisited.values())){
            const used = accessor.listParents().some((p)=>!(p instanceof Root));
            if (!used) accessor.dispose();
        }
        const dstAccessorCount = document.getRoot().listAccessors().length;
        if (dstAccessorCount > srcAccessorCount && !isTransformPending(context, NAME, 'dedup')) {
            await document.transform(dedup({
                propertyTypes: [
                    PropertyType.ACCESSOR
                ]
            }));
        }
        if (didSkipMorphTargets) {
            logger.warn(`${NAME}: Skipped optimizing morph target keyframes, not yet supported.`);
        }
        logger.debug(`${NAME}: Complete.`);
    });
};
function optimize(sampler, path, options) {
    const input = sampler.getInput().clone().setSparse(false);
    const output = sampler.getOutput().clone().setSparse(false);
    const tolerance = options.tolerance;
    const interpolation = sampler.getInterpolation();
    const lastIndex = input.getCount() - 1;
    const tmp = [];
    const value = [];
    const valueNext = [];
    const valuePrev = [];
    let writeIndex = 1;
    for(let i = 1; i < lastIndex; ++i){
        const timePrev = input.getScalar(writeIndex - 1);
        const time = input.getScalar(i);
        const timeNext = input.getScalar(i + 1);
        const t = (time - timePrev) / (timeNext - timePrev);
        let keep = false;
        if (time !== timeNext && (i !== 1 || time !== input.getScalar(0))) {
            output.getElement(writeIndex - 1, valuePrev);
            output.getElement(i, value);
            output.getElement(i + 1, valueNext);
            if (interpolation === 'LINEAR' && path === 'rotation') {
                const sample = slerp(tmp, valuePrev, valueNext, t);
                const angle = getAngle(valuePrev, value) + getAngle(value, valueNext);
                keep = !MathUtils.eq(value, sample, tolerance) || angle + Number.EPSILON >= Math.PI;
            } else if (interpolation === 'LINEAR') {
                const sample = vlerp(tmp, valuePrev, valueNext, t);
                keep = !MathUtils.eq(value, sample, tolerance);
            } else if (interpolation === 'STEP') {
                keep = !MathUtils.eq(value, valuePrev) || !MathUtils.eq(value, valueNext);
            }
        }
        if (keep) {
            if (i !== writeIndex) {
                input.setScalar(writeIndex, input.getScalar(i));
                output.setElement(writeIndex, output.getElement(i, tmp));
            }
            writeIndex++;
        }
    }
    if (lastIndex > 0) {
        input.setScalar(writeIndex, input.getScalar(lastIndex));
        output.setElement(writeIndex, output.getElement(lastIndex, tmp));
        writeIndex++;
    }
    if (writeIndex !== input.getCount()) {
        input.setArray(input.getArray().slice(0, writeIndex));
        output.setArray(output.getArray().slice(0, writeIndex * output.getElementSize()));
        sampler.setInput(input);
        sampler.setOutput(output);
    } else {
        input.dispose();
        output.dispose();
    }
}
function lerp(v0, v1, t) {
    return v0 * (1 - t) + v1 * t;
}
function vlerp(out, a, b, t) {
    for(let i = 0; i < a.length; i++)out[i] = lerp(a[i], b[i], t);
    return out;
}
