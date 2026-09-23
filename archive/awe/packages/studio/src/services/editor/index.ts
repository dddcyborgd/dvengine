import { Undo } from "./undo";
import { UndoManager } from "../undo-manager";
import {
  CommandType,
  CommandOptsMap,
  CommandInstanceMap,
  CommandMap,
} from "./commands/command-map";
import { CommandContext } from "./commands/types";
import { EngineFacade } from "../../utils/engine-api";
import { UpdateComponentsPayload } from "./commands/update-components";
import { UpdatePayload } from "./commands/update-component-command";
import type { Component3D } from "@oncyberio/engine";
import { getCurrentSpace } from "@oncyberio/engine/internal";
import { Draft } from "immer";
import { GameData } from "../../types/game-data";
import { runOnce } from "../../utils/js";
import {
  getAssetData,
  getDefaultMimePreview,
  getMimeType,
  isUploadable,
} from "../../utils/mime-utils";
import { getUploader } from "../uploader/utils";
import { toXYZ } from "@oncyberio/engine-edit/utils/three";
import type { DrawerToolOpts } from "@oncyberio/engine-edit/tools/drawer";
import { NavView } from "@oncyberio/engine-edit/types";
import type { EditorDragData } from "@oncyberio/engine-edit/dnd/utils";
import { getOrCreateEditor } from "@oncyberio/engine-edit/editors/editor-registry";
import { OptimizerServices } from "../../utils/uploader/optimizer";
import { OOAsset } from "@oncyberio/tools";

export type Command = () => Promise<Undo>;

export class WorldEditorService {
  //

  undoManager = new UndoManager();

  gameChannel: BroadcastChannel;

  private _disposers: (() => void)[] = [];

  constructor(public context: CommandContext) {
    this.context;
  }

  get spaceLoaded() {
    //
    return EngineFacade;
  }

  init = runOnce(() => {
    // console.log("WorldEditorService.init");

    document.addEventListener("dragenter", this.onFilesystemDragEnter, {
      capture: true,
    });

    this.gameChannel = new BroadcastChannel(
      `game-data-${this.context.store.gameData.id}`
    );

    let disp = this.context.store.subscribe(() => {
      //
      this.gameChannel.postMessage(this.store.gameData);
    });

    this._disposers.push(disp);
  });

  dispose = runOnce(() => {
    // console.log("WorldEditorService.dispose");

    document.removeEventListener("dragenter", this.onFilesystemDragEnter, {
      capture: true,
    });

    if (this.gameChannel) {
      this.gameChannel.close();
      this.gameChannel = null;
    }

    this._disposers.forEach((disp) => disp());
  });

  get store() {
    //
    return this.context.store;
  }

  get treeModel() {
    //
    return this.store.treeModel;
  }

  get gameData() {
    //
    return this.store.gameData;
  }

  //#region Componenr CRUD

  private onFilesystemDragEnter = (e: DragEvent) => {
    e.preventDefault();

    try {
      //
      const item = e.dataTransfer.items?.[0];

      if (e.target !== EngineFacade.engine.canvas) return;

      if (item?.kind === "file") {
        //
        if (item.type && !isUploadable(item.type)) {
          //
          e.dataTransfer.dropEffect = "none";

          return;
        }

        const previewUrl = item.type ? getDefaultMimePreview(item.type) : null;

        this.handleComponentDragStart({
          event: e,
          asset: null,
          onDrop: (opts) => {
            this.onDropFile(opts);
          },
          previewUrl,
        });
      }

      // uiDispatch({ type: "opt-off" });
    } catch (err) {
      //
      console.error(err);
    }
  };

  getCommand<C extends CommandType>(
    type: C,
    opts: CommandOptsMap[C]
  ): CommandInstanceMap[C] {
    //
    const Factory = CommandMap[type];

    if (Factory == null) throw new Error("Unknown command type " + type);

    // @ts-ignore
    const cmd = new Factory(this.context, opts);

    // @ts-ignore
    return cmd;
  }

  canBeParented(data: any) {
    //
    if (
      data.type === "group" ||
      data.type === "batch" ||
      this.isBehavior(data.type)
    )
      return true;

    const registry = getCurrentSpace().registry;

    const klass = registry.getFactoryClass(data.type);

    if (klass == null) {
      //
      throw new Error("Unknown component type " + data.type);
    }

    return klass.info.draggable && !klass.info.singleton;
  }

  async addBehavior(data: any, opts: { parentId: string }) {
    //

    const scriptId = data.type;

    const script = this.getScript(scriptId);

    if (!script?.isBehavior) {
      //
      throw new Error("Script is not a behavior");
    }

    const parent = this.getComponent(opts.parentId);

    if (parent == null) {
      //
      throw new Error("Parent component not found " + opts.parentId);
    }

    data = {
      ...data,
      parentId: opts.parentId,
    };

    return this.addComponent(data);
  }

  async addComponent(
    data: any,
    opts: {
      autoPlace?: boolean;
      autoSelect?: boolean;
      instance?: Promise<Component3D>;
      targetId?: string;
    } = {}
  ) {
    //

    let cmd: CommandInstanceMap["AddComponent" | "ReplaceComponent"];

    if (opts.targetId) {
      //
      const target = this.getComponent(opts.targetId);

      if (target == null) {
        //
        throw new Error("Target component not found " + opts.targetId);
      }

      if (!this.canReplace(target)) {
        //
        throw new Error("Cannot replace target component");
      }

      //
      cmd = this.getCommand("ReplaceComponent", {
        data,
        targetId: opts.targetId,
        autoSelect: opts.autoSelect ?? true,
      });
    } else {
      //
      cmd = this.getCommand("AddComponent", {
        data,
        instance: opts.instance,
        autoSelect: opts.autoSelect ?? true,
        autoPlace: opts.autoPlace ?? true,
      });
    }

    await cmd.run();

    this.undoManager.pushCommand(cmd);

    const instanceData = cmd.instance.data as any;

    let result = {
      cmd,
      upload: null,
    };

    // if (!this.context.store.isAnonymous) {
    //
    //
    // if (
    //   instanceData.meta?.metaType === "nft" &&
    //   instanceData.optimized == null
    // ) {
    //   //
    //   result.upload = this._uploadNft(cmd, instanceData);
    // } else if (
    //   instanceData.type === "model" &&
    //   instanceData.optimized == null
    // ) {
    //
    // result.upload = this._uploadModel(cmd, instanceData);
    // }
    //
    // console.log("instanceData", instanceData);
    // }

    return result;
  }

  // private async _uploadModel(
  //   cmd: CommandInstanceMap[
  //     | "AddComponent"
  //     | "ReplaceComponent"],
  //   instanceData: any
  // ) {
  //   await cmd.dbUpdate;
  //   //

  //   const asset: OOAsset = {
  //     type: "model",
  //     url: instanceData.url,
  //     mime_type: instanceData.mime_type,
  //     hash: instanceData.meta?.hash,
  //   };

  //   const result = await OptimizerServices.optimizeAsset({ asset });

  //   getUploader().setOptimizedFiles(instanceData.meta?.hash, result.optimized);

  //   this.context.store.updateGameData((recipe) => {
  //     //
  //     const component = recipe.components[instanceData.id];

  //     if (component == null) return;

  //     component.optimized = result.optimized;
  //   });
  // }

  async optimizeModelAsset(asset: OOAsset, compressionOptions) {
    //
    const propertyId = this.getcompressionOptionsId(compressionOptions);

    const result = await OptimizerServices.optimizeAsset({
      asset,
      compressionOptions,
    });

    const { optimized } = result;

    return {
      propertyId,
      optimized,
    };
  }

  public getcompressionOptionsId(compressionOptions: {
    useWeld?: boolean;
    useDraco?: boolean;
    useMeshOpt?: boolean;
  }) {
    //
    let id = "";

    if (!compressionOptions.useWeld) {
      id += "nweld";
    }

    if (!compressionOptions.useDraco) {
      if (id.length > 0) {
        id += "_";
      }

      id += "ndraco";
    }

    if (!compressionOptions.useMeshOpt) {
      if (id.length > 0) {
        id += "_";
      }
      id += "nmeshopt";
    }

    return id;
  }

  canReplace(component: Component3D) {
    //
    // No singleton
    if (component.info.singleton) return false;

    return (
      component.getCollisionMesh?.() == null || component.data.type !== "group"
    );
  }

  canDuplicate(components: Component3D[]) {
    //
    // No singleton
    const hasSingleton = components.some((it) => it.info.singleton);
    if (hasSingleton) return false;

    return true;
  }

  // private async _uploadNft(
  //   cmd: CommandInstanceMap["AddComponent" | "ReplaceComponent"],
  //   instanceData: any
  // ) {
  //   //

  //   //debugger;

  //   await cmd.dbUpdate;

  //   const instance = cmd.instance;

  //   let url = instanceData.url;

  //   const mime = instanceData.meta.mime_type;

  //   if (mime == "image/gif") {
  //     url = instanceData.preview;
  //   }

  //   const name =
  //     instanceData?.name || Math.random().toString(36).substring(2, 10);

  //   const blob = await fetch(url).then((res) => res.blob());

  //   const file = new File([blob], name);

  //   const hashHex = await getFileHash(file);

  //   if (!checkUploadSizeLimit(mime, file.size)) {
  //     //
  //     throw new Error("size-limit");
  //   }

  //   const assetData = {
  //     url: null,
  //     d_optimized_files: null,
  //     name: hashHex,
  //     mimeType: mime,
  //   };

  //   if (instanceData.type === "model") {
  //     //
  //     // const asset: OOAsset = {
  //     //   type: "model",
  //     //   url: instanceData.url,
  //     //   mime_type: instanceData.mime_type,
  //     //   hash: hashHex,
  //     // };
  //     // const result = await OptimizerServices.optimizeAsset({ asset });
  //     // assetData.d_optimized_files = result.optimized;
  //     // assetData.url = result.raw;
  //   } else if (instanceData.type === "video" && mime == "image/gif") {
  //     //debugger;

  //     let _mime = "video/mp4";
  //     let _file = null;

  //     try {
  //       _file = await gifCompress(file, hashHex);

  //       if (!_file) throw new Error("Error compressing gif");
  //     } catch (error) {
  //       console.error("Error compressing gif", error);
  //       _file = file;
  //       _mime = mime;
  //     }

  //     const result = await uploadFile({
  //       file: _file,
  //       id: hashHex,
  //       mimeType: _mime,
  //       isUnique: true,
  //       overwrite: false,
  //       onProgress: (n) => console.log("upload progress", n),
  //     });

  //     assetData.url = result.url;

  //     assetData.mimeType = "video/mp4";
  //   } else {
  //     //
  //     const result = await uploadFile({
  //       file,
  //       id: hashHex,
  //       mimeType: mime,
  //       isUnique: true,
  //       overwrite: false,
  //       onProgress: (n) => console.log("upload progress", n),
  //     });

  //     assetData.url = result.url;
  //   }

  //   const asset = getAssetData(assetData);

  //   await this.updateAssetMedia(instance.data.id, {
  //     url: asset.url,
  //     preview: asset.preview,
  //     optimized: asset.optimized,
  //   });

  //   console.log("nft upload result", asset);
  // }

  async duplicateSelection() {
    //
    const selection = EngineFacade.editor.selection.getSelection();

    if (selection.size == 0) return;

    const ids = [];

    selection.forEach((it) => ids.push(it.data.id));

    const instances = ids.map((id) => this.getComponent(id));

    if (!this.canDuplicate(instances)) {
      //
      throw new Error("Cannot duplicate selected components");
    }

    return this.duplicateComponents(ids);
  }

  async duplicateComponents(ids: string[]) {
    //
    const cmd = this.getCommand("DuplicateComponents", {
      ids,
      autoSelect: true,
    });

    await cmd.run();

    this.undoManager.pushCommand(cmd);

    // @ts-ignore
    return cmd.instances;
  }

  async updateComponent(id: string, changes: object) {
    //
    const cmd = this.getCommand("UpdateComponent", { id, changes });

    await cmd.run();

    this.undoManager.pushCommand(cmd);
  }

  async _runUpdate(id: string, command: UpdatePayload) {
    //
    const cmd = this.getCommand("UpdateComponent", { id, command });

    await cmd.run();

    this.undoManager.pushCommand(cmd);
  }
  //#endregion

  //#region Groups

  canChangeParent(groupId: string, componentIds: string[]) {
    const components = componentIds.map((id) => this.getComponent(id));

    if (groupId === null) {
      //
      if (components.some((it) => this.isBehavior((it.data as any).type))) {
        //
        return false;
      }

      return true;
    }
    //
    // validate destination group
    const target = this.getComponent(groupId);

    if (target == null) return false;

    // Target must be a group, or components must be behaviors
    if (target.data.type != "group") {
      //
      return components.every((it) => this.isBehavior((it.data as any).type));
    }

    // Can be parented
    const canBeParented = components.every((it) => {
      //
      return this.canBeParented(it.data);
    });

    if (!canBeParented) return false;

    return true;
  }

  async changeParent(opts: {
    groupId: string;
    children: string[];
    ref: string;
    dir: 0 | 1;
  }) {
    //
    const { groupId, children, ref, dir } = opts;

    if (!this.canChangeParent(groupId, children)) {
      //
      throw new Error("Cannot change parent");
    }

    const cmd = this.getCommand("ChangeParent", {
      parentId: groupId,
      childrenIds: children,
      ref,
      dir,
      autoSelect: true,
    });

    await cmd.run();

    this.undoManager.pushCommand(cmd);
  }

  haveSameParent(components: Component3D[]) {
    //
    const parentId = components[0]?.data.parentId || null;

    return components.every((it) => it?.data?.parentId == parentId);
  }

  canGroup(components: Component3D[]) {
    //
    // Must be at least 2 components
    if (components.length < 2) return false;

    // Must be transformable
    const canTransform = components.every((it) => {
      //
      return EngineFacade.editor.transformer.isTransformable(it);
    });
    if (!canTransform) return false;

    // Must have same parent
    this.haveSameParent(components);

    return true;
  }

  async groupSelection() {
    //
    const selection = EngineFacade.editor.selection.getSelection();

    if (selection.size == 0) return;

    const componentIds = [] as string[];

    selection.forEach((it) => componentIds.push(it.data.id));

    const components = componentIds.map((id) => this.getComponent(id));

    if (!this.canGroup(components)) {
      //
      throw new Error("Cannot group selected components");
    }

    EngineFacade.editor.selection.setSelection([]);

    const cmd = this.getCommand("CreateGroup", {
      childrenIds: componentIds,
      autoSelect: true,
    });

    await cmd.run();

    this.undoManager.pushCommand(cmd);
  }

  async groupComponents(componentIds: string[]) {
    //
    if (componentIds.length == 0) return;
    const components = componentIds.map((id) => this.getComponent(id));

    if (!this.canGroup(components)) {
      //
      throw new Error("Cannot group selected components");
    }

    EngineFacade.editor.selection.setSelection([]);

    const cmd = this.getCommand("CreateGroup", {
      childrenIds: componentIds,
      autoSelect: true,
    });

    await cmd.run();

    this.undoManager.pushCommand(cmd);
  }

  async createEmptyGroup() {
    const cmd = this.getCommand("AddComponent", {
      data: { type: "group" },
      autoSelect: false,
    });

    await cmd.run();

    this.undoManager.pushCommand(cmd);

    return cmd.instance;
  }

  canUngroup(group: Component3D) {
    //
    // Must be a group
    if (group.data.type != "group") return false;

    // Must have children
    if (group.childComponents.length == 0) return false;

    return true;
  }

  async ungroupSelection() {
    //
    const selection = EngineFacade.editor.selection.getSelection();

    if (selection.size != 1) return;

    const group = selection.values().next().value;

    if (!this.canUngroup(group)) {
      //
      throw new Error("Cannot ungroup selected component");
    }

    const cmd = this.getCommand("Ungroup", {
      groupId: group.data.id,
      autoSelect: true,
    });

    await cmd.run();

    this.undoManager.pushCommand(cmd);
  }

  //#endregion

  //#region Scripts

  isBehavior(id: string) {
    //
    // if not a script return false
    const data = this.context.store.gameData.components[id];

    if (data?.type !== "script") return false;

    try {
      const script = this.getScript(id);

      return !!script?.isBehavior;
    } catch (error) {
      return false;
    }
  }

  hasBehavior(id: string, behId: string) {
    //
    const instance = this.getComponent(id);

    if (instance == null) return false;

    return instance.childComponents.some((it) => {
      //
      return it.data.type === behId;
    });
  }

  getScript(id: string) {
    // Scripts are no longer supported
    return null;
  }

  getScriptByUri(uri: string) {
    // Scripts are no longer supported
    return null;
  }

  async setScript(id: string, data: any) {
    // Scripts are no longer supported
    throw new Error("Scripts are no longer supported");
  }

  async deleteScript(id: string, cascade = false) {
    // Scripts are no longer supported
    throw new Error("Scripts are no longer supported");
  }

  scriptHasReferences(id: string) {
    // Scripts are no longer supported
    return false;
  }

  //#endregion

  canDelete(ids: string[]) {
    //
    const components = ids
      .map((id) => this.getComponent(id))
      .filter((it) => it != null);

    if (components.some((it) => it.info.required)) return false;

    return true;
  }

  async deleteComponents(ids: string[]) {
    //
    if (!this.canDelete(ids)) {
      //
      throw new Error("Cannot delete selected components");
    }

    const cmd = this.getCommand("DeleteSuper", { ids });

    await cmd.run();

    this.undoManager.pushCommand(cmd);
  }

  async deleteSelection() {
    //
    const selection = EngineFacade.editor.selection.getSelection();

    if (selection.size == 0) return;

    const ids = [];

    selection.forEach((it) => ids.push(it.data.id));

    EngineFacade.editor.selection.setSelection([]);

    return this.deleteComponents(ids);
  }

  async updateComponents(updates: UpdateComponentsPayload[]) {
    const cmd = this.getCommand("UpdateComponents", { updates });

    await cmd.run();

    this.undoManager.pushCommand(cmd);
  }

  selectComponents(ids: string[]) {
    //
    let instances = ids.map((id) => {
      const instance = this.getComponent(id);

      if (instance == null) throw new Error("Component not found! ID: " + id);

      return instance;
    });

    EngineFacade.editor.selection.setSelection(instances);
  }

  getSelectedComponents() {
    //
    return EngineFacade.editor.state.selection.getState();
  }

  toggleComponentsLock(ids: string[]) {
    //
    // if all are locked, unlock all
    // if some are locked, lock all
    // if none are locked, lock all

    const components = ids.map(
      (id) => this.context.store.gameData.components[id]
    );

    const allLocked = components.every((it) => it.lock != null);

    const locks: CommandOptsMap["ChangeLock"]["locks"] = {};

    const lockedBy = "admin"; // this.context.store.userId;

    for (const id of ids) {
      //
      const component = this.context.store.gameData.components[id];

      if (allLocked) {
        locks[id] = null;
      } else {
        locks[id] = {
          position: true,
          rotation: true,
          lockedBy,
        };
      }
    }

    this.setComponentLocks(locks);
  }

  async setComponentLocks(locks: CommandOptsMap["ChangeLock"]["locks"]) {
    //
    const cmd = this.getCommand("ChangeLock", { locks });

    await cmd.run();

    this.undoManager.pushCommand(cmd);
  }

  getComponentByType(type: string) {
    const cm = getCurrentSpace().components;

    return cm.byType(type);
  }

  getComponents() {
    const cm = getCurrentSpace().components;

    return cm.components;
  }

  getComponent(id: string) {
    const cm = getCurrentSpace().components;

    return cm.find((it) => it.data.id === id);
  }

  getResource(id: string) {
    // Resources are no longer supported
    return null;
  }

  getComponentEditor(id: string) {
    //
    const instance = this.getComponent(id);

    const editor = instance ? getOrCreateEditor(instance) : null;

    if (editor) {
      //
      editor._studioEditor = EngineFacade.editor;
    }

    return editor;
  }

  handleComponentDragStart(opts: EditorDragData) {
    //
    EngineFacade.editor.dnd.handleDragStart(opts);

    const onDragEnd = () => {
      EngineFacade.editor.dnd.handleDragEnd();

      // Re-focus canvas so that keyboard shortcuts are in game canvas context
      const gameCanvas = document.getElementById("game-canvas");
      gameCanvas.tabIndex = 1;
      gameCanvas.focus();
      gameCanvas.removeAttribute("tabIndex");
    };

    opts.event.target.addEventListener("dragend", onDragEnd, {
      once: true,
    });
  }

  highlightComponent(id: string) {
    //
    if (id == null) {
      EngineFacade.editor.selection.selector.highlightItem(null);

      return;
    }

    const instance = this.getComponent(id) ?? null;

    if (instance == null) {
      //
      console.error("Component not found", id);

      return;
    }

    const instanceEditor = getOrCreateEditor(instance);
    if (instanceEditor?.visible === false) return;

    EngineFacade.editor.selection.selector.highlightItem(instance);
  }

  toggleComponentVisibility(id: string) {
    //
    const data = this.gameData.components[id];

    if (data == null) {
      //
      console.error("Component not found", id);

      return;
    }

    const curHidden = !!data._hidden;

    this.updateComponents([
      {
        id,
        changes: {
          _hidden: !curHidden,
        },
        undo: {
          _hidden: curHidden,
        },
      },
    ]);
  }

  focusOnComponent(id: string) {
    //
    const instance = this.getComponent(id);

    if (instance == null) {
      console.error("Component not found", id);

      return;
    }

    EngineFacade.editor.navigation.focusOn(instance);
  }

  private onDropFile = async (opts) => {
    //
    const { event, instance, coords, onDropEnd } = opts;

    try {
      event.preventDefault();

      console.log("onDropFile", event);

      const item = event.dataTransfer.items[0];

      if (item.kind !== "file") {
        //
        console.error("Not a file dropped", item.kind);

        return;
      }

      const file = item.getAsFile();

      if (file == null) {
        console.error("No file dropped");

        return;
      }

      const mime = getMimeType(file.name);

      if (mime == null || !isUploadable(mime)) {
        //
        console.error("Invalid mime type", mime);

        return;
      }

      const uploader = getUploader();

      const resp = await uploader.saveUpload({
        file,
        mime,
        onProgress: (n) => console.log("upload progress", n),
      });

      const asset = getAssetData({
        url: resp.url,
        name: resp.name,
        mimeType: resp.mimeType,
        d_optimized_files: resp.d_optimized_files,
      });

      asset.position = toXYZ(coords.position);

      asset.rotation = toXYZ(coords.rotation);

      const instance = EngineFacade.editor.commands.addComponent(asset);

      await this.addComponent(asset, { instance });
      //
    } finally {
      //
      onDropEnd();
    }
  };

  updateGameData(recipe: (state: Draft<GameData>) => void) {
    //
    return this.context.store.updateGameData(recipe);
  }

  applyUpgrades(upgrades: Component3D["container"]["_upgrades"]) {
    //
    console.log("applyUpgrades", upgrades);

    this.updateGameData((recipe) => {
      //
      Object.keys(upgrades.added)?.forEach((id) => {
        //
        if (recipe.components[id]) {
          //
          console.error("Component already exists", id);
        }

        recipe.components[id] = upgrades.added[id];
      });

      Object.keys(upgrades.removed)?.forEach((id) => {
        //
        if (!recipe.components[id]) {
          //
          console.error("Component not found", id);
          return;
        }

        delete recipe.components[id];
      });

      Object.keys(upgrades.updated)?.forEach((id) => {
        //
        const data = upgrades.updated[id];

        if (data == null || !data.id || !data.type || !data._meta?.vtype) {
          console.error(
            "Incomplete upgrade data, make sure you include the full data for the component",
            data
          );
          return;
        }

        const component = recipe.components[id];

        if (component == null) {
          //
          console.error("Component to upgrade not found", id);

          return;
        }

        recipe.components[id] = data;
      });
    });
  }

  async updateAssetMedia(id: string, mediaData: any) {
    //

    console.log("updateAssetMedia", id, mediaData);

    const instance = this.getComponent(id);

    if (instance == null) {
      //
      throw new Error("Component not found: " + id);
    }

    instance.setData(mediaData);

    this.updateGameData((recipe) => {
      //
      const component = recipe.components[id];

      if (component == null) return;

      Object.assign(component, mediaData);
    });
    //
  }

  captureFame(opts?: { width?: number; height?: number }) {
    return EngineFacade.editor.capturer.captureFrame(opts);
  }

  private getAssociatedBatch(instance: Component3D) {
    //
    return Object.values(this.gameData.components).find(
      (it) => it.type === "batch" && it.preset?.originId === instance.data.id
    );
  }

  async setDrawerTool(opts: DrawerToolOpts) {
    //
    if (!opts.enabled) {
      //
      EngineFacade.editor.setDrawingToolOpts(opts as any);

      return;
    }

    //
    let prevSelection;

    if (opts.base == null) {
      //
      opts.base = prevSelection = this.getSingleSelection();
    }

    if (opts.base.data.type == "batch") {
      //
      // ok
    } else if (!opts.base?._canBatchDraw()) {
      //
      opts.base = null;
      //
    } else {
      // base.data
      // first look if there's a batch component linked to this component
      // if not create a new batch component

      const existingBatch = this.getAssociatedBatch(opts.base);

      if (existingBatch) {
        //
        console.log("Found existing batch component", existingBatch);

        opts.base = this.getComponent(existingBatch.id);

        if (opts.base != null) {
          //
          this.selectComponents([opts.base.data.id]);
        }
        //
      } else {
        //

        console.log(
          "Didn't find existing batch component, creating new one for",
          opts.base.data.id
        );

        let preset = structuredClone(opts.base.getDataNode({ template: true }));

        preset.originId = opts.base.data.id;

        const cmd = this.getCommand("AutoBatch", {
          name: `batch ${
            opts.base.data.name ||
            opts.base.data.script?.identifier ||
            opts.base.data.id
          }`,
          preset,
          batchOpts: opts,
          prevSelection,
        });

        await cmd.run();

        this.undoManager.pushCommand(cmd);

        opts.base = cmd.instance;
      }
    }

    if (opts.base == null) {
      //
      console.error("Invalid base component", opts.base);
    } else {
      //
      opts.batchCallback = this._onDrawerBatch;

      EngineFacade.editor.setDrawingToolOpts(opts as any);
    }
  }

  async setGridViewer(enabled: boolean) {
    await EngineFacade.editor.ready;

    EngineFacade.editor.updatePreferences({
      grid: {
        gridViewer: enabled,
      },
    });
  }

  private _onDrawerBatch = async (opts) => {
    //
    if (opts.base.data.type == "batch") {
      //
      (getOrCreateEditor(opts.base) as any)?.onBatchEnd(opts.batch);
    } else {
      const cmd = this.getCommand("AddComponentBatch", {
        instances: opts.batch,
      });

      await cmd.run();

      this.undoManager.pushCommand(cmd);
    }
  };
  getSingleSelection() {
    //
    const allSelection = EngineFacade.editor.selection.getSelection();

    if (allSelection.size == 0) {
      //
      return null;
    }

    const selected = allSelection.values().next().value as Component3D;

    return selected;
  }

  setNavView(view: NavView) {
    //
    const selection = EngineFacade.editor.selection.getSelection();

    const firstSel = selection.values().next().value;

    EngineFacade.editor.setNavView(view, firstSel);
  }

  get facade() {
    //
    return EngineFacade;
  }
}
