export interface Undo {
    undo: () => Promise<void>;
    redo: () => Promise<void>;
    // getLabel: () => string;
}
