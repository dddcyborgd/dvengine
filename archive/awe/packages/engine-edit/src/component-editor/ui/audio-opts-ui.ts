import { Component3DEditor } from "../ui-editor";
import type { GuiSelectDescriptor, GuiSelectItem, GuiValue } from "../gui-types";

const playOpts = [
    { id: "ambient", name: "Everywhere (constant volume)" },
    { id: "spatial", name: "Within sound radius (decays with distance)" },
];

export type PlayAudioType = "ambient" | "spatial";

export function getAudioOpts(opts?: Partial<Record<PlayAudioType, boolean>>): GuiSelectItem[] {
    //
    if (!opts) {
        return playOpts;
    }

    let res = [];

    for (const opt of playOpts) {
        //
        if (opts[opt.id]) {
            res.push(opt);
        }
    }

    return res;
}

export function getAudioOptsUI(
    lens: GuiValue,
    opts?: Partial<Record<PlayAudioType, boolean>>
): GuiSelectDescriptor {
    //
    const selectOps = getAudioOpts(opts);

    return {
        type: "select",
        label: "Play audio",
        value: lens,
        items: selectOps,
    };
}
