import { defaultParams } from "@oncyberio/engine/space/components/navmesh/data";

export function getParamsGui(src) {
    //
    let gui = {
        type: "folder" as const,
        label: "Params",
        children: {} as Record<string, any>,
    };

    // Group by group
    for (let key in defaultParams) {
        //
        let param = defaultParams[key];
        let group = param.group || "General";

        if (!gui.children[group]) {
            gui.children[group] = {
                type: group === "General" ? "group" : "folder",
                label: group,
                children: {},
            };
        }

        gui.children[group].children[key] = getParamGui(key, param, src);
    }

    return gui;
}

function getParamGui(key, param, src) {
    //
    let { label, min, max, step } = param;

    return {
        type: "number",
        value: [src, "params", key],
        label,
        min,
        max,
        step,
    };
}
