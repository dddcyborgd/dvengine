import { GameTreeNode } from "../../../types/game-data";
import { AbstractCommand } from "./abstract-command";
import { CommandContext } from "./types";
import { DeleteComponentsCommand } from "./delete-components";

export interface DeleteSuperCommandOpts {
  ids: string[];
}

export class DeleteSuperCommand extends AbstractCommand {
  //
  private DeleteComponentsCommand: DeleteComponentsCommand;

  constructor(context: CommandContext, { ids }: DeleteSuperCommandOpts) {
    //
    super(context);

    // split the ids into components and components attached to child prefabs
    // because for the latter we need to delete the prefab as well

    const componentIds: string[] = [];

    ids.forEach((id) => {
      //
      const component = this.getComponent(id);

      componentIds.push(id);
    });

    if (componentIds.length > 0) {
      //
      this.DeleteComponentsCommand = new DeleteComponentsCommand(context, {
        ids: componentIds,
      });
    }
  }

  async doRun() {
    //
    await this._run3D();

    await this._runDB();
  }

  async _run3D() {
    //
    await this.DeleteComponentsCommand?._run3D();
  }

  async _runDB() {
    //
    await this.DeleteComponentsCommand?._runDB();
  }

  async undo() {
    //
    await this._undo3D();

    await this._undoDB();
  }

  async _undo3D() {
    //
    await this.DeleteComponentsCommand?._undo3D();
  }

  async _undoDB() {
    //
    await this.DeleteComponentsCommand?._undoDB();
  }

  async redo() {
    //
    await this._redo3D();

    await this._redoDB();
  }

  async _redo3D() {
    //
    await this._run3D();
  }

  async _redoDB() {
    //
    await this._runDB();
  }
}
