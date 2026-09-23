import { AbstractCommand } from "./abstract-command";
import type { Component3D } from "@oncyberio/engine";
import { CommandContext } from "./types";
import { EngineFacade } from "../../../utils/engine-api";

export interface AutoBatchCommandOpts {
    name: string;
    preset: any;
    prevSelection?: Component3D;
    batchOpts: any;
}

export class AutoBatchCommand extends AbstractCommand {
    //
    private _instance: Component3D;

    private _instanceData: any;

    private _name: string;

    private _preset: any;

    private _batchOpts: any;

    private _prevSelection: Component3D;

    constructor(context: CommandContext, opts: AutoBatchCommandOpts) {
        super(context);

        this._name = opts.name;

        this._preset = opts.preset;

        this._batchOpts = opts.batchOpts;

        this._prevSelection = opts.prevSelection;
    }

    async doRun() {
        //
        const data = this._instanceData ?? {
            type: "batch",
            preset: this._preset,
            name: this._name || "Batch",
        };
        this._instance = await this.createComponent(data);

        this._instanceData ??= this.getComponentDataNode(this._instance);

        EngineFacade.editor.selection.setSelection([this._instance]);

        this.updateGameData((state) => {
            //
            this.treeModel.saveNode(this._instanceData, state);
        });
    }

    async undo() {
        //
        EngineFacade.editor.setDrawingToolOpts({
            enabled: false,
        });

        this._instance.destroy();

        this._instance = null;

        if (this._prevSelection) {
            EngineFacade.editor.selection.setSelection([this._prevSelection]);
        }

        this.updateGameData((state) => {
            //
            this.treeModel.deleteNodeId(this._instanceData.id, state);
        });
    }

    async redo() {
        //
        return this.doRun();
    }

    get instance() {
        return this._instance;
    }
}
