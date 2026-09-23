
import Emitter from "events";

import { Undo } from "./editor/undo";



export class UndoManager extends Emitter {
    //
    undoStack: Undo[] = [];

    undoIndex = -1;

    undoingCmd = null;

    isUndoPaused = false;

    private makeState = () => {
        //
        return {
            undoStack: this.undoStack,
            undoIndex: this.undoIndex,
            undoingCmd: this.undoingCmd,
            isUndoPaused: this.isUndoPaused,
        };
    };

    _state = this.makeState();

    constructor() {
        //
        super();
    }

    getState = () => {
        //
        return this._state;
    };

    subscribeState = (cb) => {
        //
        this.on("state-change", cb);

        return () => this.off("state-change", cb);
    };

    emitStateChange = () => {
        //
        this._state = this.makeState();
        this.emit("state-change");
    };

    pushCommand(cmd: Undo) {
        //
        this.undoStack[++this.undoIndex] = cmd;

        this.undoStack.length = this.undoIndex + 1;

        this.emitStateChange();
    }

    clearHistory() {
        //
        this.undoStack = [];

        this.undoIndex = -1;

        this.emitStateChange();
    }

    async undo() {
        //

        if (this.isUndoPaused || this.undoingCmd != null || this.undoIndex < 0)
            return;

        try {
            //
            const cmd = this.undoStack[this.undoIndex];

            this.undoingCmd = cmd;

            this.undoIndex--;

            this.emitStateChange();

            await cmd.undo();

            this.emit("command", { type: "undo" });

            //
        } finally {
            //
            this.undoingCmd = null;

            this.emitStateChange();
        }
    }

    async redo() {
        //
        if (
            this.isUndoPaused ||
            this.undoingCmd != null ||
            this.undoIndex === this.undoStack.length - 1
        )
            return;

        try {
            //
            const cmd = this.undoStack[this.undoIndex + 1];

            this.undoingCmd = cmd;

            this.undoIndex++;

            this.emitStateChange();

            await cmd.redo();

            this.emit("command", { type: "redo" });
            //
        } finally {
            //
            this.undoingCmd = null;

            this.emitStateChange();
        }
    }
}
