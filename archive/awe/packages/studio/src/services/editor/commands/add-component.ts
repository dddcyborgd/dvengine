import { AbstractCommand } from "./abstract-command";
import type { Component3D } from "@oncyberio/engine";
import { CommandContext } from "./types";
import { EngineFacade } from "../../../utils/engine-api";
import { getOrCreateEditor } from "@oncyberio/engine-edit/editors/editor-registry";

export interface AddComponentCommandOpts {
    data: any;
    instance?: Promise<Component3D>;
    autoSelect?: boolean;
    autoPlace?: boolean;
}

export class AddComponentCommand extends AbstractCommand {
    //
    private _instance: Component3D;

    private _data: any;

    private _instanceData: any;

    private _promise: Promise<Component3D>;

    private _autoSelect: boolean;

    private _autoPlace: boolean;

    constructor(context: CommandContext, opts: AddComponentCommandOpts) {
        super(context);

        this._data = opts.data;

        this._promise = opts.instance;

        this._autoSelect = opts.autoSelect;

        this._autoPlace = opts.autoPlace;
    }

    async doRun() {
        //
        if (this._promise) {
            //
            this._instance = await this._promise;

            this._promise = null;
            //
        } else {
            //
            this._instance = await EngineFacade.editor.commands.addComponent(
                this._data
            );

            const autoPlaceInfo = this._instance.info.autoPlace;

            let autoPlace =
                autoPlaceInfo === true || this._instance.data["autoPlace"];

            autoPlace ||=
                this._autoPlace &&
                this._instance.info.autoPlace !== false &&
                !this._data.parentId &&
                (this._instance.data.type === "group" ||
                    (this._instance.info.draggable &&
                        this._instance.getCollisionMesh?.() != null));

            if (autoPlace) {
                //
                const { id, position, rotation, scale } =
                    EngineFacade.editor.commands.getDefaultAssetPlacement(
                        this._instance
                    );

                this._instance.position.set(position.x, position.y, position.z);

                this._instance.rotation.set(rotation.x, rotation.y, rotation.z);

                if (scale) {
                    //
                    this._instance.scale.set(scale.x, scale.y, scale.z);
                }

                this._instance.syncWithTransform();

                getOrCreateEditor(this._instance)?._dataWrapper?.setMeta("placeholderId", id);
            }
        }

        this._instanceData = this.getComponentDataNode(this._instance);

        if (this._autoSelect) {
            EngineFacade.editor.selection.setSelection([this._instance]);
        }

        this.updateGameData((state) => {
            //
            this.treeModel.saveNode(this._instanceData, state);
        });
    }

    async undo() {
        //
        this._instance.destroy();

        this._instance = null;

        this.updateGameData((state) => {
            //
            this.treeModel.deleteNodeId(this._instanceData.id, state);
        });
    }

    async redo() {
        //
        this._instance = await this.createComponent(this._instanceData);

        this._instanceData = this.getComponentDataNode(this._instance);

        this.updateGameData((state) => {
            //
            this.treeModel.saveNode(this._instanceData, state);
        });
    }

    get instance() {
        return this._instance;
    }
}
