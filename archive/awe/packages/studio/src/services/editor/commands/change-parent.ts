import { AbstractCommand } from "./abstract-command";
import type { Component3D } from "@oncyberio/engine";
import { CommandContext } from "./types";
import { EngineFacade } from "../../../utils/engine-api";
import { shallowAssign } from "./utils";
import { getOrCreateEditor } from "@oncyberio/engine-edit/editors/editor-registry";

export interface ChangeParentCommandOpts {
    parentId: string;
    childrenIds: string[];
    ref: string;
    dir: 0 | 1;
    autoSelect: boolean;
}

export class ChangeParentCommand extends AbstractCommand {
    //
    private _autoSelect: boolean;

    private _parentId: string;

    private _prevParents: Array<string>;

    private _prevIndexes: Record<string, number>;

    private _indexes: Record<string, number>;

    private _childrenIds: string[];

    constructor(
        context: CommandContext,
        private opts: ChangeParentCommandOpts
    ) {
        //
        super(context);

        this._parentId = opts.parentId ?? null;

        this._childrenIds = opts.childrenIds;

        this._autoSelect = opts.autoSelect;

        this._prevParents = this._childrenIds.map((id) => {
            //
            const compponent = this.gameData.components[id];

            return compponent.parentId;
        });

        this._sort();
    }

    private _getCurrentChildren() {
        //
        let res: Record<string, any> = {};

        Object.keys(this.gameData.components).forEach((id) => {
            //
            const component = this.gameData.components[id];

            if (
                component.type !== "script" &&
                component.parentId == this._parentId
            ) {
                //
                res[id] = component;
            }
        });

        return res;
    }

    private _sort() {
        //
        this._prevIndexes = {};

        this._indexes = {};

        const currentChildren = this._getCurrentChildren();

        Object.values(currentChildren).forEach((c, i) => {
            //
            this._prevIndexes[c.id] = c._index;
        });

        // 1- remove elems in childIds that are in currentChildren
        this._childrenIds.forEach((id) => {
            //
            if (currentChildren[id]) {
                //
                delete currentChildren[id];
            }
        });

        let sortedCurrent = Object.values(currentChildren)
            .sort((a, b) => {
                //
                return (
                    (a._index ?? Number.MAX_SAFE_INTEGER) -
                    (b._index ?? Number.MAX_SAFE_INTEGER)
                );
            })
            .map((c) => c.id);

        let insertIdx =
            this.opts.ref == null
                ? this._childrenIds.length
                : sortedCurrent.indexOf(this.opts.ref) + this.opts.dir;

        let newSorted = sortedCurrent
            .slice(0, insertIdx)
            .concat(this._childrenIds)
            .concat(sortedCurrent.slice(insertIdx));

        newSorted.forEach((id, i) => {
            //
            this._indexes[id] = i;
        });

        const debugs = newSorted
            .map((id) => {
                //
                try {
                    return this.getComponent(id);
                } catch (e) {
                    return null;
                }
            })
            .filter((it) => it != null)
            .map((it) => getOrCreateEditor(it)?.component ?? it);

        console.log("new sort", debugs);
    }

    private _isComponent3D(component: any): component is Component3D {
        //
        return component.isComponent;
    }

    private _isDescendantOf(child: Component3D, parent: Component3D) {
        //
        let current = child;

        while (current) {
            //
            if (current === parent) return true;

            if (this._isComponent3D(current.parent)) {
                //
                current = current.parent;
                //
            } else {
                //
                return false;
            }
        }
    }

    private _checkForCycles() {
        //
        const parent = this._getParent(this._parentId);

        const children = this._getChildren();

        // check if parent is a (direct or indirect) child of any of the children
        if (
            this._isComponent3D(parent) &&
            children.some((child) => this._isDescendantOf(parent, child))
        ) {
            throw new Error(
                "Cannot add parent as a child of one of its children"
            );
        }
    }

    private _getChildren() {
        return this._childrenIds.map((id) => {
            //
            return this.getComponent(id);
        });
    }

    private _getParent(id: string) {
        //
        if (id == null) return this.getCManager();

        return this.getComponent(id);
    }

    private async _addToGroup() {
        //
        let parent = this._getParent(this._parentId);

        const children = this._getChildren();

        children.forEach((child) => {
            //
            EngineFacade.editor.commands.changeParent(child, parent);
        });

        this._setIndex3D(this._indexes);

        this.updateGameData((state) => {
            //
            children.forEach((child) => {
                //
                const childData = state.components[child.data.id];

                const transformData = child.getTransformData();

                shallowAssign(childData, {
                    ...transformData,
                    parentId: this._parentId,
                });
            });

            this._setIdexData(this._indexes, state);
        });

        return parent;
    }

    async doRun() {
        //
        this._checkForCycles();

        const parent = await this._addToGroup();

        if (this._autoSelect) {
            //
            const target =
                this._childrenIds.length > 1
                    ? parent
                    : this.getComponent(this._childrenIds[0]);

            if (this._isComponent3D(target)) {
                EngineFacade.editor.selection.setSelection([target]);
            }
        }
    }

    async undo() {
        //
        const children = this._getChildren();

        children.forEach((child, i) => {
            //
            const prevParent = this._prevParents[i];

            const parent = this._getParent(prevParent);

            EngineFacade.editor.commands.changeParent(child, parent);
        });

        this._setIndex3D(this._prevIndexes);

        this.updateGameData((state) => {
            //
            children.forEach((child, i) => {
                //
                const childData = state.components[child.data.id];

                const prevParent = this._prevParents[i];

                const transformData = child.getTransformData();

                shallowAssign(childData, {
                    ...transformData,
                    parentId: prevParent,
                    _index: child.data._index,
                });
            });

            this._setIdexData(this._prevIndexes, state);
        });
    }

    async redo() {
        //
        this._addToGroup();
    }
}
