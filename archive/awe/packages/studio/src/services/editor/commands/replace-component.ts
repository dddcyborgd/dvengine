import { AbstractCommand } from "./abstract-command";
import type { Component3D } from "@oncyberio/engine";
import { CommandContext } from "./types";
import { EngineFacade } from "../../../utils/engine-api";
import { Box3 } from "three";
import { GameTreeNode } from "../../../types/game-data";

export interface ReplaceComponentCommandOpts {
  data: any;
  targetId: string;
  autoSelect?: boolean;
}

export class ReplaceComponentCommand extends AbstractCommand {
  //
  private _instance: Component3D;

  private _data: any;

  private _oldNode: GameTreeNode;

  private _newNode: GameTreeNode;

  private _autoSelect: boolean;

  constructor(context: CommandContext, opts: ReplaceComponentCommandOpts) {
    //
    super(context);

    this._data = opts.data;

    this._oldNode = this.treeModel.getNode(opts.targetId);

    if (!this._oldNode) {
      throw new Error(`No component with id ${opts.targetId}`);
    }

    this._autoSelect = opts.autoSelect;
  }

  async doRun() {
    //
    const target = this.getComponent(this._oldNode.id);

    const instanceData = structuredClone(this._data);

    this._copyInstanceData(target.data, instanceData);

    const instance = await this.createComponent(instanceData);

    EngineFacade.editor.commands.adjustInitialScale(instance);

    instance.position.copy(target.position);

    instance.quaternion.copy(target.quaternion);

    if (
      instance.data.type === target.data.type &&
      "scale" in instance.data &&
      "scale" in target.data &&
      instance.data.scale
    ) {
      //
      instance.scale.copy(target.scale);
    }

    instance.syncWithTransform();

    this._instance = instance;

    this._newNode = this.getComponentDataNode(instance);

    target.destroy();

    this.updateGameData((state) => {
      //
      this.treeModel.deleteNode(this._oldNode, state);

      this.treeModel.saveNode(this._newNode, state);
    });

    if (this._autoSelect) {
      EngineFacade.editor.selection.setSelection([instance]);
    }
  }

  private _copyInstanceData(oldData: any, newData: any) {
    //
    newData.parentId = oldData.parentId;

    if (oldData._index) {
      //
      newData._index = oldData._index;
    }

    // if (oldData.type === "spawn") {
    //     //
    //     if (newData.type !== "avatar") {
    //         //
    //         throw new Error("Currently only avatars can be spawned.");
    //     }

    //     newData.script = {
    //         _isPlayer: true,
    //     };

    //     newData.name = "Spawn";

    //     newData.collider = {
    //         enabled: true,
    //         rigidbodyType: "PLAYER",
    //         colliderType: "CAPSULE",
    //         groups: [3 /** GROUPS.PLAYERS */],
    //     };

    //     if (newData.type === "avatar") {
    //         //
    //         newData.useUserAvatar = true;
    //     }
    // }

    newData.script = structuredClone(oldData.script);

    if (oldData.type !== newData.type) return;

    if (oldData.collider?.enabled) {
      //
      newData.collider = structuredClone(oldData.collider);
    }
  }

  async undo() {
    //
    const instance = this.getComponent(this._newNode.id);

    const oldComponent = await this.createComponent(this._oldNode);

    instance.destroy();

    this.updateGameData((state) => {
      //
      this.treeModel.deleteNode(this._newNode, state);

      this.treeModel.saveNode(this._oldNode, state);
    });
  }

  async redo() {
    //
    const target = this.getComponent(this._oldNode.id);

    const newComponent = await this.createComponent(this._newNode);

    target.destroy();

    this.updateGameData((state) => {
      //
      this.treeModel.deleteNode(this._oldNode, state);

      this.treeModel.saveNode(this._newNode, state);
    });
  }

  get instance() {
    return this._instance;
  }
}
