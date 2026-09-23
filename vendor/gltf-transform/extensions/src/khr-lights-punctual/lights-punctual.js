import { Extension, MathUtils, ReaderContext, WriterContext } from '../../../core/index.js';
import { KHR_LIGHTS_PUNCTUAL } from '../constants.js';
import { Light } from './light.js';
const NAME = KHR_LIGHTS_PUNCTUAL;
export class KHRLightsPunctual extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createLight(name = '') {
        return new Light(this.document.getGraph(), name);
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        if (!jsonDoc.json.extensions || !jsonDoc.json.extensions[NAME]) return this;
        const rootDef = jsonDoc.json.extensions[NAME];
        const lightDefs = rootDef.lights || [];
        const lights = lightDefs.map((lightDef)=>{
            const light = this.createLight().setName(lightDef.name || '').setType(lightDef.type);
            if (lightDef.color !== undefined) light.setColor(lightDef.color);
            if (lightDef.intensity !== undefined) light.setIntensity(lightDef.intensity);
            if (lightDef.range !== undefined) light.setRange(lightDef.range);
            if (lightDef.spot?.innerConeAngle !== undefined) {
                light.setInnerConeAngle(lightDef.spot.innerConeAngle);
            }
            if (lightDef.spot?.outerConeAngle !== undefined) {
                light.setOuterConeAngle(lightDef.spot.outerConeAngle);
            }
            return light;
        });
        jsonDoc.json.nodes.forEach((nodeDef, nodeIndex)=>{
            if (!nodeDef.extensions || !nodeDef.extensions[NAME]) return;
            const lightNodeDef = nodeDef.extensions[NAME];
            context.nodes[nodeIndex].setExtension(NAME, lights[lightNodeDef.light]);
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        if (this.properties.size === 0) return this;
        const lightDefs = [];
        const lightIndexMap = new Map();
        for (const property of this.properties){
            const light = property;
            const lightDef = {
                type: light.getType()
            };
            if (!MathUtils.eq(light.getColor(), [
                1,
                1,
                1
            ])) lightDef.color = light.getColor();
            if (light.getIntensity() !== 1) lightDef.intensity = light.getIntensity();
            if (light.getRange() != null) lightDef.range = light.getRange();
            if (light.getName()) lightDef.name = light.getName();
            if (light.getType() === Light.Type.SPOT) {
                lightDef.spot = {
                    innerConeAngle: light.getInnerConeAngle(),
                    outerConeAngle: light.getOuterConeAngle()
                };
            }
            lightDefs.push(lightDef);
            lightIndexMap.set(light, lightDefs.length - 1);
        }
        this.document.getRoot().listNodes().forEach((node)=>{
            const light = node.getExtension(NAME);
            if (light) {
                const nodeIndex = context.nodeIndexMap.get(node);
                const nodeDef = jsonDoc.json.nodes[nodeIndex];
                nodeDef.extensions = nodeDef.extensions || {};
                nodeDef.extensions[NAME] = {
                    light: lightIndexMap.get(light)
                };
            }
        });
        jsonDoc.json.extensions = jsonDoc.json.extensions || {};
        jsonDoc.json.extensions[NAME] = {
            lights: lightDefs
        };
        return this;
    }
}
