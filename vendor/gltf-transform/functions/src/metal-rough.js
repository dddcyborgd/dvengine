import { KHRMaterialsIOR, KHRMaterialsPBRSpecularGlossiness, KHRMaterialsSpecular, PBRSpecularGlossiness } from '../../extensions/index.js';
import { createTransform, rewriteTexture } from './utils.js';
const NAME = 'metalRough';
const METALROUGH_DEFAULTS = {};
export function metalRough(_options = METALROUGH_DEFAULTS) {
    const options = {
        ...METALROUGH_DEFAULTS,
        ..._options
    };
    return createTransform(NAME, async (doc)=>{
        const logger = doc.getLogger();
        const extensionsUsed = doc.getRoot().listExtensionsUsed().map((ext)=>ext.extensionName);
        if (!extensionsUsed.includes('KHR_materials_pbrSpecularGlossiness')) {
            logger.warn(`${NAME}: KHR_materials_pbrSpecularGlossiness not found on document.`);
            return;
        }
        const iorExtension = doc.createExtension(KHRMaterialsIOR);
        const specExtension = doc.createExtension(KHRMaterialsSpecular);
        const specGlossExtension = doc.createExtension(KHRMaterialsPBRSpecularGlossiness);
        const inputTextures = new Set();
        for (const material of doc.getRoot().listMaterials()){
            const specGloss = material.getExtension('KHR_materials_pbrSpecularGlossiness');
            if (!specGloss) continue;
            const specular = specExtension.createSpecular().setSpecularFactor(1.0).setSpecularColorFactor(specGloss.getSpecularFactor());
            inputTextures.add(specGloss.getSpecularGlossinessTexture());
            inputTextures.add(material.getBaseColorTexture());
            inputTextures.add(material.getMetallicRoughnessTexture());
            material.setBaseColorFactor(specGloss.getDiffuseFactor()).setMetallicFactor(0).setRoughnessFactor(1).setExtension('KHR_materials_ior', iorExtension.createIOR().setIOR(1000)).setExtension('KHR_materials_specular', specular);
            const diffuseTexture = specGloss.getDiffuseTexture();
            if (diffuseTexture) {
                material.setBaseColorTexture(diffuseTexture);
                material.getBaseColorTextureInfo().copy(specGloss.getDiffuseTextureInfo());
            }
            const sgTexture = specGloss.getSpecularGlossinessTexture();
            if (sgTexture) {
                const sgTextureInfo = specGloss.getSpecularGlossinessTextureInfo();
                const specularTexture = doc.createTexture();
                await rewriteTexture(sgTexture, specularTexture, (pixels, i, j)=>{
                    pixels.set(i, j, 3, 255);
                });
                specular.setSpecularTexture(specularTexture);
                specular.setSpecularColorTexture(specularTexture);
                specular.getSpecularTextureInfo().copy(sgTextureInfo);
                specular.getSpecularColorTextureInfo().copy(sgTextureInfo);
                const glossinessFactor = specGloss.getGlossinessFactor();
                const metalRoughTexture = doc.createTexture();
                await rewriteTexture(sgTexture, metalRoughTexture, (pixels, i, j)=>{
                    const roughness = 255 - Math.round(pixels.get(i, j, 3) * glossinessFactor);
                    pixels.set(i, j, 0, 0);
                    pixels.set(i, j, 1, roughness);
                    pixels.set(i, j, 2, 0);
                    pixels.set(i, j, 3, 255);
                });
                material.setMetallicRoughnessTexture(metalRoughTexture);
                material.getMetallicRoughnessTextureInfo().copy(sgTextureInfo);
            } else {
                specular.setSpecularColorFactor(specGloss.getSpecularFactor());
                material.setRoughnessFactor(1 - specGloss.getGlossinessFactor());
            }
            material.setExtension('KHR_materials_pbrSpecularGlossiness', null);
        }
        specGlossExtension.dispose();
        for (const tex of inputTextures){
            if (tex && tex.listParents().length === 1) tex.dispose();
        }
        logger.debug(`${NAME}: Complete.`);
    });
}
