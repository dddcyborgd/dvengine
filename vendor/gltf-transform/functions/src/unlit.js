import { KHRMaterialsUnlit } from '../../extensions/index.js';
export const unlit = ()=>{
    return (doc)=>{
        const unlitExtension = doc.createExtension(KHRMaterialsUnlit);
        const unlit = unlitExtension.createUnlit();
        doc.getRoot().listMaterials().forEach((material)=>{
            material.setExtension('KHR_materials_unlit', unlit);
        });
    };
};
