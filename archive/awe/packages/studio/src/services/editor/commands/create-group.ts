import { AbstractCommand } from "./abstract-command";
import { CommandContext } from "./types";
import { EngineFacade } from "../../../utils/engine-api";
import { shallowAssign } from "./utils";
import { Draft } from "immer";
import { GameData } from "../../../types/game-data";

export interface CreateGroupOpts {
    childrenIds: string[];
    autoSelect: boolean;
}

export class CreateGroupCommand extends AbstractCommand {
    //
    private _groupData: any;

    private _autoSelect: boolean;

    private _childrenIds: string[];

    private _prevIndexes: Record<string, number>;

    private _indexes: Record<string, number>;

    private _groupIdx: number;

    private _parentId: string;

    constructor(context: CommandContext, opts: CreateGroupOpts) {
        //
        super(context);

        this._childrenIds = opts.childrenIds;

        this._autoSelect = opts.autoSelect;

        const children = this._getChildren();

        // validation
        if (children.length < 2) {
            //
            throw new Error("Cannot group less than 2 components.");
        }

        // validation: all children must have the same parent
        const parentId = children[0].data.parentId;

        if (children.some((child) => child.data.parentId != parentId)) {
            //
            throw new Error("Cannot group components with different parents.");
        }

        this._groupIdx = children[0].data._index ?? null;

        this._parentId = parentId;

        this._sort();
    }

    private _sort() {
        //
        this._prevIndexes = {};

        this._indexes = {};

        this._childrenIds.forEach((id, i) => {
            //
            const data = this.gameData.components[id];

            this._prevIndexes[id] = data._index ?? null;

            this._indexes[id] = i;
        });
    }

    private _getChildren() {
        //
        return this._childrenIds.map((id) => {
            //
            return this.getComponent(id);
        });
    }

    private async _createGroup() {
        //
        const children = this._getChildren();

        let parent = null;

        if (this._parentId) {
            //
            parent = this.getComponent(this._parentId);
        }

        let group = await EngineFacade.editor.commands.createGroup(children, {
            center: true,
            parent,
            data: { _index: this._groupIdx },
        });

        this._setIndex3D(this._indexes);

        this._groupData = group.data;

        this.updateGameData((state) => {
            //
            state.components[this._groupData.id] = structuredClone(
                this._groupData
            );

            this._updateChildrenData(state);

            this._setIdexData(this._indexes, state);
        });

        return group;
    }

    async doRun() {
        //
        const group = await this._createGroup();

        if (this._autoSelect) {
            //
            EngineFacade.editor.selection.setSelection([group]);
        }
    }

    async undo() {
        //
        const group = this.getComponent(this._groupData.id);

        EngineFacade.editor.commands.removeGroup(group);

        this._setIndex3D(this._prevIndexes);

        this.updateGameData((state) => {
            //
            delete state.components[this._groupData.id];

            this._updateChildrenData(state);

            this._setIdexData(this._prevIndexes, state);
        });
    }

    async redo() {
        //
        this._createGroup();
    }

    private _updateChildrenData(draft: Draft<GameData>) {
        //
        const children = this._getChildren();

        children.forEach((child) => {
            //
            const childDraft = draft.components[child.data.id];

            const transform = child.getTransformData();

            shallowAssign(childDraft, {
                ...transform,
                parentId: child.data.parentId ?? null,
            });
        });
    }
}
