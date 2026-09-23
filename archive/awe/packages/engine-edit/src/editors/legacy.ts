import type { Component3DEditor } from "../component-editor/ui-editor";

export function LEGACY_UpgradeScale(editor: Component3DEditor) {
    //
    if (editor.component.userData["LEGACY_SCALE"]) {
        //
        const s = editor.component.scale;

        editor.upgradeData({
            scale: {
                x: s.x,
                y: s.y,
                z: s.z,
            },
            meta: {
                ...editor.component.data["meta"],
                _legacyWidth: null,
            },
        });
    }
}
