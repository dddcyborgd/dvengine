import type { EngineEdit } from "..";
import { Selector } from "./selector";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";

export class EditModeSelection {
    selector: Selector;

    constructor(private editor: EngineEdit) {
        //
        this.selector = new Selector(editor);
    }

    _enabled = false;

    get enabled() {
        return this._enabled;
    }

    set enabled(val) {
        if (val == this._enabled) return;

        this._enabled = val;

        this.selector.enabled = val;
    }

    setSelection(instances: Component3D[]) {
        this.selector.setSelection(instances);
    }

    getSelection() {
        return this.selector.selection;
    }

    getSingleSelection() {

        if(this.selector.selection.size > 0){
            return this.selector.selection.values().next().value;
        }

        return null
    }

    dispose() {
        this.selector.dispose();
    }
}
