import { Component3DEditor } from "../ui-editor";
import type { GuiFolderDescriptor } from "../gui-types";

export function getScriptingFolderGUI(editor: Component3DEditor): GuiFolderDescriptor {
    //
    const gui = {
        type: "folder" as const,
        slug: "script",
        label: "Scripting",
        children: {
            scriptId: {
                type: "text" as const,
                name: "ID",
                nullable: true,
                value: [editor.data, "script", "identifier"],
            },
            scriptTag: {
                type: "text" as const,
                name: "Tag",
                nullable: true,
                value: [editor.data, "script", "tag"],
            },
        },
    };

    return gui;
}
