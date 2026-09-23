import { XYZ } from "../types";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { Object3D } from "three";

let blankCanvas = null;

export function getEmptyDragPreview() {
    if (blankCanvas == null) {
        blankCanvas = document.createElement("canvas");

        blankCanvas.style.position = "absolute";
        blankCanvas.style.width = "1px";
        blankCanvas.style.height = "1px";

        document.body?.appendChild(blankCanvas);
    }

    return blankCanvas;
}

export interface EditorDragData {
    event: DragEvent;
    previewUrl?: string;
    // mime_type: string
    // permissionless: boolean
    asset?: any;
    isBehavior?: boolean;
    // mime?: any

    // isFileSystem?: boolean
    // preloadAsset?: boolean
    // previewImg?: HTMLImageElement

    onDragEnter?: (event: DragEvent) => unknown;
    onDrop: (opts: {
        preview?: Promise<Component3D>;
        target?: Component3D;
        coords: {
            position: XYZ;
            rotation: XYZ;
        };
        onDropEnd: () => unknown;
        event: DragEvent;
    }) => unknown;
    onDragLeave?: () => unknown;
    //
    onCreatePreview?: () => Promise<Component3D>;
    onDestroyPreview?: (preview: Component3D) => unknown;
    //
    abort?: AbortController;
}
