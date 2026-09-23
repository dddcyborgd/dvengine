import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { GroupComponent } from "@oncyberio/engine/space/components/group/group-component";
import { GroupSelectionMesh } from "./group-selection-mesh";
import { getTransformUI } from "../../component-editor/ui/transform-ui";

/** @internal */
export class GroupEditor extends Component3DEditor<GroupComponent> {
    //
    gui: GuiGroupDescriptor = {
        type: "group",
        children: {
            transform: getTransformUI(this),
        },
    };
    defaultColliderUI = false;

    _onInit() {
        //
        super._onInit();

        this.component.container.onSpaceLoaded(this.updateBBox);
    }

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }

    private _selectionMesh: GroupSelectionMesh;

    updateBBox = () => {
        //
        this.getSelectionMesh().updateBBox();
    };

    getSelectionMesh() {
        //
        if (this._selectionMesh) {
            return this._selectionMesh;
        }

        this._selectionMesh = new GroupSelectionMesh(this.component);

        this.component.add(this._selectionMesh);

        return this._selectionMesh;
    }

    showSelected(isSelected: boolean): void {
        //
        super.showSelected(isSelected);

        this._selectionMesh.active = isSelected;
    }

    toggleHighlighted(isHovered: boolean): void {
        //
        this.getSelectionMesh().active = isHovered;

        super.toggleHighlighted(isHovered);
    }

    dispose() {
        //
        this.showSelected(false);

        this._selectionMesh?.removeFromParent();

        this._selectionMesh?._onDispose();

        super.dispose();
    }
}
