import { AbstractCommand } from "./abstract-command";
import type { Component3D } from "@oncyberio/engine";
import { CommandContext } from "./types";
import { GameTreeNode } from "../../../types/game-data";

export interface AddComponentBatchOpts {
    instances: Component3D[];
}

export class AddComponentBatch extends AbstractCommand {
    //
    private _savedNodes: GameTreeNode[];

    private _instances: Component3D[];

    constructor(context: CommandContext, opts: AddComponentBatchOpts) {
        //
        super(context);

        this._instances = opts.instances;
    }

    async doRun() {
        //
        this._instances.forEach((instance) => {
            //
            instance.syncWithTransform();
        });

        this._savedNodes = this._instances.map((instance) => {
            //
            const data = this.getComponentDataNode(instance);

            return data;
        });

        this.updateGameData((state) => {
            //
            this.treeModel.saveNodes(this._savedNodes, state);
        });
    }

    async undo() {
        //
        this._instances.forEach((instance) => {
            //
            instance.destroy();
        });

        this._instances = [];

        this.updateGameData((state) => {
            //
            this.treeModel.deleteNodes(this._savedNodes, state);
        });
    }

    async redo() {
        //
        this._instances = await Promise.all(
            //
            this._savedNodes.map((data) => {
                //
                return this.createComponent(data);
            })
        );

        this.updateGameData((state) => {
            //
            this.treeModel.saveNodes(this._savedNodes, state);
        });
    }
}
