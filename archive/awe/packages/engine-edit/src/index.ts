import { ComponentsRegistry } from "./components-registry";
import { EditModeNavigation } from "./navigation";
import { EditModeSelection } from "./selection";
import { EditorState } from "./state";
import { Transformer } from "./transformer";
import Scene from "@oncyberio/engine/internal/scene";
import { Engine } from "@oncyberio/engine/index";
import { EditCommands } from "./commands";
import { Dnd } from "./dnd";
import { Capturer } from "./capture";
import { Grid } from "./grid";
import { NavView, navViewToGridMode } from "./types";
import { Object3D, Vector3 } from "three";
import DrawingTool, { DrawerToolOpts } from "./tools/drawer";
import emitter from "@oncyberio/engine/internal/engine-emitter";
import Events from "./editor-events";
import { registerAllEditors, getOrCreateEditor } from "./editors";

export class EngineEdit {
  //
  drawingTool: DrawingTool = new DrawingTool();

  tools = {
    drawer: new DrawingTool(),
  };
  //
  navigation: EditModeNavigation;

  grid: Grid;

  selection: EditModeSelection;

  transformer: Transformer;

  capturer = new Capturer();

  componentsRegistry = new ComponentsRegistry();

  commands = new EditCommands(this);

  dnd = new Dnd();

  state = new EditorState();

  engine = Engine.getInstance();

  Events = Events;

  Emitter = emitter;

  currentDrawSelection = null;

  /** Resolves once async children (grid, transformer) are ready */
  ready: Promise<void>;

  constructor() {
    //

    // Register all component editors
    registerAllEditors();

    this.selection = new EditModeSelection(this);

    this.navigation = new EditModeNavigation(this);

    this.navigation.enabled = true;

    this.selection.enabled = true;

    this.tools.drawer.enabled = false;

    emitter.on(Events.SELECTION_CHANGED, this.onSelectionChanged);

    this.ready = this._initAsyncChildren();

    //
    globalThis.$engineEdit = this;
  }

  private async _initAsyncChildren() {
    await this.engine.ready;

    this.grid = new Grid();
    this.transformer = new Transformer();

    this.transformer.enabled = true;

    this.grid.on("gridmodechange", (mode: NavView) => {
      this.setNavView(mode);
    });
  }

  onSelectionChanged = (event) => {
    // console.log("selection changed", event);

    const selection = event.selection;

    if (this.tools.drawer.enabled == true) {
      this.setDrawingToolOpts({ enabled: false });
    }

    // if (selection.length == 0 && this.tools.drawer.enabled == true) {
    //     this.setDrawingToolOpts({ enabled: false });
    // }
  };

  setDrawingToolOpts(opts: DrawerToolOpts) {
    if (opts.enabled == true) {
      if (this.tools.drawer) {
        if (this.drawingTool.base == null && opts.base?.data?.preset == null) {
          console.error("No base object selected for drawing tool");

          return;
        }
      }

      this.selection.enabled = false;

      let singleSelection = this.selection.getSingleSelection();
      if (singleSelection != null) {
        getOrCreateEditor(singleSelection)?.setAdditionalGUIs(this.tools.drawer.getEditor() as any);

        this.currentDrawSelection = singleSelection;
      }
    } else {
      this.selection.enabled = true;

      let singleSelection = this.currentDrawSelection;
      if (singleSelection != null) {
        getOrCreateEditor(singleSelection)?.setAdditionalGUIs({});
      }
    }

    this.tools.drawer.setDrawingToolData(opts);
  }

  updatePreferences(preferences: {
    grid?: { gridViewer?: boolean; gridFlipping?: boolean };
    navigation?: { allowResetWorld?: boolean; versionRollback?: boolean };
  }) {
    // console.log("preference update in engine edit", preferences);
    if (!this.grid) {
      void this.ready.then(() => {
        this.updatePreferences(preferences);
      });
      return;
    }

    if (preferences.grid) {
      if (preferences.grid.gridViewer != null) {
        this.grid.enabled = preferences.grid.gridViewer;

        this.grid._mesh.visible = preferences.grid.gridViewer;

        emitter.emit(Events.TOOL_ENABLED_CHANGED, {
          gridViewer: preferences.grid.gridViewer,
        });
      }

      if (preferences.grid.gridFlipping != null) {
        if (preferences.grid.gridFlipping == true) {
          this.grid.setMode("XZ");

          this.grid.lockFlipping = true;
        } else {
          this.grid.lockFlipping = false;
        }
      }
    }

    if (preferences.navigation) {
      // versionRollback
      // allowResetWorld;
    }
  }

  private _navView: NavView = null;

  getNavView() {
    //
    return this._navView;
  }

  setNavView(val: NavView, target?: Object3D) {
    // debugger;

    const selection = this.selection.getSelection();

    const firstSel = target || selection.values().next().value;

    const targetPos = this.navigation.setNavView(val, {
      transition: true,
      target: firstSel,
    });

    // console.log( targetPos )

    const gridMode = navViewToGridMode[val] ?? "XZ";

    this.grid.setMode(gridMode, targetPos);
  }

  setDrawingTool(opts: DrawerToolOpts = {}) {
    if (opts.base == null) {
      opts.base = this.state.selection.getState()[0];
    }

    this.drawingTool.setDrawingToolData(opts);
  }

  dispose() {
    //
    this.navigation.dispose();

    this.grid?.dispose();

    this.selection.dispose();

    if (this.transformer) Scene.remove(this.transformer);

    this.transformer?.dispose();

    this.componentsRegistry.dispose();

    this.capturer.dispose();

    this.state.dispose();

    this.dnd.dispose();

    emitter.off(Events.SELECTION_CHANGED, this.onSelectionChanged);

    EngineEdit._instance = null;
  }

  static _instance: EngineEdit | null = null;

  static getInstance() {
    //
    if (!EngineEdit._instance) {
      EngineEdit._instance = new EngineEdit();
    }

    return EngineEdit._instance;
  }
}
