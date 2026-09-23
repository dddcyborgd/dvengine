import { EngineFacade } from "../../../utils/engine-api";
import { Undo } from "../undo";
import { CommandContext } from "./types";
import { deferred } from "../../../utils/deferred";
import { GameData } from "../../../types/game-data";
import { Component3D } from "@oncyberio/engine";
import { getCurrentSpace } from "@oncyberio/engine/internal";
import { getOrCreateEditor } from "@oncyberio/engine-edit/editors/editor-registry";
import { shallowAssign } from "./utils";

export class AbstractCommand {
  //
  private dbDeferred = deferred();

  get dbUpdate() {
    //
    return this.dbDeferred.promise;
  }

  constructor(public context: CommandContext) {
    //
  }

  async run(): Promise<Undo> {
    await this.doRun();

    return this;
  }

  async doRun() {
    throw new Error("Not implemented");
  }

  getLabel() {
    return "command";
  }

  async undo() {}

  async redo() {}

  getCManager() {
    return getCurrentSpace().components;
  }

  getComponent(id: string) {
    const instance = this.getCManager().find((c) => c.data.id === id);

    if (instance == null) {
      throw new Error(`Component with id ${id} not found`);
    }

    return instance;
  }

  createComponent(data: any): Promise<Component3D> {
    // @ts-ignore
    return this.components._createInternal(structuredClone(data), {
      persistent: true,
    });
  }

  /*
    protected getSort(id: string): string[] {
        //
        if (id == null) return this.gameData.sort;

        const component = this.gameData.components[id];

        return component.sort;
    }

    protected getDefSort(id: string): string[] {
        //
        return Object.keys(this.gameData.components).filter((it) => {
            //
            const component = this.gameData.components[it];

            return (
                component.type !== "script" &&
                component.type !== "prefab" &&
                component.parentId == it
            );
        });
    }

    protected sortSplice(opts: {
        id: string;
        children: string[];
        nbDelete?: number;
        ref?: string;
        dir?: 0 | 1;
    }) {
        //
        const { id, nbDelete = 0, children, ref, dir } = opts;

        let curSortSet = new Set(this.getSort(id) ?? this.getDefSort(id));

        children.forEach((id) => {
            //
            curSortSet.delete(id);
        });

        let curSort = Array.from(curSortSet);

        let insertIdx = !ref ? curSort.length : curSort.indexOf(ref) + dir;

        return curSort.slice().splice(insertIdx, nbDelete, ...children);
    }

    sortExtract(id: string, children: string[]) {
        //
        const curSort = this.getSort(id) ?? this.getDefSort(id);

        const set = new Set(children);

        const extracted = curSort.filter((id) => {
            return set.has(id);
        });

        const original = curSort.filter((id) => {
            return !set.has(id);
        });

        return { extracted, original };
    }

    protected setSort3D(id: string, sort: string[]) {
        //
        if (id != null) {
            const component = this.getComponent(id);
            component._dataWrapper.set("sort", sort);
        } else {
            this.components.userData.sort = sort;
        }
    }

    protected setSortDB(state: GameData, id: string, sort: string[]) {
        //
        if (id == null) {
            state.sort = sort;
        } else {
            state.components[id].sort = sort;
        }
    }
    */

  protected _setIndex3D(indexes: Record<string, number>) {
    //
    let parents = new Set<Component3D>();

    Object.keys(indexes).forEach((id) => {
      //
      try {
        const i = indexes[id];

        const child = this.getComponent(id);

        const parent = child.parentComponent;

        if (parent) {
          //
          parents.add(parent);
        }

        getOrCreateEditor(child)._dataWrapper.set("_index", i, false);
        //
      } catch (e) {
        console.log("[ERROR] component not found", id);
      }
    });

    parents.forEach((parent) => {
      parent._sortChildren();
    });
  }

  protected _setIdexData(indexes: Record<string, number>, gameData: GameData) {
    //
    Object.keys(indexes).forEach((id) => {
      //
      const i = indexes[id];

      const childData = gameData.components[id];

      childData._index = i;
    });
  }

  get components() {
    //
    return getCurrentSpace().components;
  }

  get treeModel() {
    //
    return this.context.store.treeModel;
  }

  get gameData() {
    return this.context.store.gameData;
  }

  updateGameData: CommandContext["store"]["updateGameData"] = (recipe) => {
    //
    return this.context.store.updateGameData(recipe).then(
      (val) => this.dbDeferred.resolve(val),
      (err) => this.dbDeferred.reject(err)
    );
  };

  getParent(id: string) {
    //
    if (id == null) return this.getCManager();

    return this.getComponent(id);
  }

  getComponentDataNode(component: Component3D) {
    //
    return component.getDataNode();
  }

  updateItemData(id: string, data: object, draft) {
    //
    let draftItem = draft.components?.[id];

    if (draftItem == null) return;

    shallowAssign(draftItem, data);
  }
}
