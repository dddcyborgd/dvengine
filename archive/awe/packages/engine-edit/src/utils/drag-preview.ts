let blankCanvas = null

export function getEmptyDragPreview() {

    if (blankCanvas == null) {

        blankCanvas = document.createElement("canvas");

        blankCanvas.style.position = "absolute";
        blankCanvas.style.width = "1px";
        blankCanvas.style.height = "1px";

        document.body?.appendChild(blankCanvas);
    }

    return blankCanvas

}