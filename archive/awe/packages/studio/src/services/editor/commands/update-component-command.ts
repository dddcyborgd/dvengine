import { AbstractCommand } from "./abstract-command";
import { CommandContext } from "./types";
import { Undo } from "../undo";
import { deepAssign } from "./utils";
import type { Component3D } from "@oncyberio/engine";
import { getOrCreateEditor } from "@oncyberio/engine-edit/editors/editor-registry";

export interface UpdatePayload {
    run: () => Promise<Undo>;
    changes: any;
}

export interface UpdateComponentCommandOpts {
    id: string;
    command?: UpdatePayload;
    changes?: any;
}

export class UpdateComponentCommand extends AbstractCommand {
    private undoCmd: Undo;

    constructor(
        context: CommandContext,
        public opts: UpdateComponentCommandOpts
    ) {
        super(context);

        if (this.opts.command == null) {
            //
            if (this.opts.changes == null) {
                throw new Error("opts.changes is required");
            }

            this.opts.command = this.getUpdatePayload();
        }
    }

    private getUpdatePayload(): UpdatePayload {
        //
        const component = this.getComponent(this.opts.id);

        const preset = getOrCreateEditor(component)?.getPreset(this.opts.changes);

        return {
            changes: this.opts.changes,
            async run() {
                return preset.apply(true);
            },
        };
    }

    async doRun() {
        this.undoCmd = await this.opts.command.run();

        this.update();
    }

    async undo() {
        await this.undoCmd.undo();

        this.update();
    }

    async redo() {
        await this.undoCmd.redo();

        this.update();
    }

    private update() {
        //
        const component = this.getComponent(this.opts.id);

        this.updateGameData((gameData) => {
            //
            this.updateComponentData(gameData, component);
        });
    }

    updateComponentData(gameData, component) {
        //
        const id = this.opts.id;

        const draft = gameData.components[this.opts.id];

        let hasChanged = deepAssign(draft, component.data, {
            delete: true,
            valuePaths: getOrCreateEditor(component)?._dataWrapper?._valuePaths ?? {},
        });

        if (hasChanged) {
            gameData.components[id]._version = Date.now();
        }
    }
}
