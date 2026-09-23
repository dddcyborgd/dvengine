import { AbstractCommand } from "./abstract-command";
import { CommandContext } from "./types";
import { EngineFacade } from "../../../utils/engine-api";
import { GameTreeNode } from "../../../types/game-data";

export interface DuplicateComponentsCommandOpts {
    ids: string[];
    autoSelect?: boolean;
}

export class DuplicateComponentsCommand extends AbstractCommand {
    //
    private _ids: string[];

    private _dataNodes: GameTreeNode[];

    private _autoSelect: boolean;

    constructor(context: CommandContext, opts: DuplicateComponentsCommandOpts) {
        //
        super(context);

        this._ids = opts.ids;

        this._autoSelect = opts.autoSelect;
    }

    async doRun() {
        //
        const instances = this._ids.map((id) => {
            //
            return this.getComponent(id);
        });

        const duplicates =
            await EngineFacade.editor.commands.duplicateComponents(
                instances,
                false
            );

        duplicates.forEach((instance, index) => {
            //
            instance.updateMatrixWorld(true);
        });

        this._dataNodes = duplicates.map((instance) => {
            //
            return this.getComponentDataNode(instance);
        });

        this.updateGameData((state) => {
            this.treeModel.saveNodes(this._dataNodes, state);
        });

        if (this._autoSelect) {
            EngineFacade.editor.selection.setSelection(duplicates);
        }
    }

    async undo() {
        //
        const instances = this._dataNodes.map((node) => {
            //
            return this.getComponent(node.id);
        });

        instances.forEach((instance) => {
            //
            instance.destroy();
        });

        this.updateGameData((state) => {
            //
            this.treeModel.deleteNodes(this._dataNodes, state);
        });
    }

    async redo() {
        //
        await Promise.all(
            this._dataNodes.map((node) => {
                //
                return this.createComponent(node);
            })
        );

        this.updateGameData((state) => {
            //
            this.treeModel.saveNodes(this._dataNodes, state);
        });
    }
}
