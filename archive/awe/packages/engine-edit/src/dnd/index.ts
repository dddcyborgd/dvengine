import { DragComponent } from "./drag-component";
import { EditorDragData } from "./utils";

export class Dnd {
    private dragComponent: DragComponent;

    private isDragging = false;

    constructor() {
        this.dragComponent = new DragComponent();
    }

    handleDragStart(opts: EditorDragData) {
        //
        document.addEventListener("mouseup", this.handleDragEnd);

        if (this.isDragging) {
            console.error("already dragging");

            return;
        }

        this.isDragging = true;

        this.dragComponent.enter({
            ...opts,
            onDragEnter: (event) => {
                opts.onDragEnter?.(event);
            },
            onDrop: (dropOpts) => {
                //
                this.isDragging = false;

                opts.onDrop(dropOpts);
            },
            onDragLeave: () => {
                this.isDragging = false;
            },
        });
    }

    handleDragEnd() {
        if (!this.isDragging) {
            console.error("not dragging");

            return;
        }

        this.isDragging = false;

        this.dragComponent.exit();

        document.removeEventListener("mouseup", this.handleDragEnd);
    }

    dispose() {
        this.dragComponent.dispose();
    }
}
