import { EngineFacade } from "../../../utils/engine-api";
import { AbstractCommand } from "./abstract-command";
import { CommandContext } from "./types";
import { ComponentLock } from "@oncyberio/engine-edit/types";

export interface ChangeLockCommandOpts {
    locks?: Record<string, ComponentLock>;
}

export class ChangeLockCommand extends AbstractCommand {
    //
    private _oldLocks: Record<string, ComponentLock>;

    private _newLocks: Record<string, ComponentLock>;

    constructor(
        context: CommandContext,
        public opts: ChangeLockCommandOpts
    ) {
        super(context);

        this._oldLocks = this._getLocks();

        this._newLocks = opts.locks;
    }

    private _getLocks() {
        //
        const locks: Record<string, ComponentLock> = {};

        for (const id in this._newLocks) {
            //
            const component = this.gameData.components[id];

            locks[id] = structuredClone(component.lock);
        }

        return locks;
    }

    async doRun() {
        this.update(this._newLocks);
    }

    async undo() {
        this.update(this._oldLocks);
    }

    async redo() {
        this.update(this._newLocks);
    }

    private update(locks: Record<string, ComponentLock>) {
        //
        this.update3D(locks);

        this.updateData(locks);
    }

    private update3D(locks: Record<string, ComponentLock>) {
        //
        for (const id in locks) {
            //
            const component = this.getComponent(id);

            EngineFacade.editor.commands.changeComponentLock(
                component,
                locks[id]
            );
        }
    }

    private updateData(locks: Record<string, ComponentLock>) {
        //
        this.updateGameData((gameData) => {
            //
            for (const id in locks) {
                //
                const draft = gameData.components[id];

                draft.lock = structuredClone(locks[id]);

                draft._version = Date.now();
            }
        });
    }
}
