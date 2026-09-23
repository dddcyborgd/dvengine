import { AbstractCommand } from "./abstract-command";
import { CommandContext } from "./types";
import type { Component3D } from "@oncyberio/engine";
import { getOrCreateEditor } from "@oncyberio/engine-edit/editors/editor-registry";
import { shallowAssign } from "./utils";

export interface UpdateComponentsPayload {
    id: string;
    changes: object;
    undo: object;
}

export interface UpdateComponentsOpts {
    updates: UpdateComponentsPayload[];
}

export class UpdateComponents extends AbstractCommand {
    //

    constructor(
        context: CommandContext,
        public opts: UpdateComponentsOpts
    ) {
        super(context);
    }

    async doRun() {
        //
        return this.runWithOpts(false);
    }

    async runWithOpts(isUndo: boolean) {
        // change 3D

        const updates = this.opts.updates;

        for (const it of updates) {
            //
            const instance = this.getComponent(it.id);

            this.updateComponent(instance, isUndo ? it.undo : it.changes);
        }

        // change game data
        this.updateGameData((draft) => {
            //
            updates.forEach((it) => {
                //
                const update = isUndo ? it.undo : it.changes;

                this.updateItem(it.id, update, draft);
            });
        });
    }

    updateComponent(component: Component3D, changes: object) {
        //
        getOrCreateEditor(component)._dataWrapper.assign(changes);
    }

    updateItem(id: string, data: object, draft) {
        //
        let draftItem = draft.components?.[id];

        if (draftItem == null) return;

        shallowAssign(draftItem, data);
    }

    undo() {
        //
        return this.runWithOpts(true);
    }

    redo() {
        //
        return this.runWithOpts(false);
    }
}
