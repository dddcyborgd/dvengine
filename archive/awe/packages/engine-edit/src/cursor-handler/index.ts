import { CANVAS } from "@oncyberio/engine/internal/constants";

const CursorChangeSource = {
    TRANSFORMER: "TRANSFORMER",
    SELECTOR: "SELECTOR",
    NAVIGATION: "NAVIGATION",
} as const;

type CursorChangeSource =
    (typeof CursorChangeSource)[keyof typeof CursorChangeSource];

const CURSOR_PRIORITY: Array<CursorChangeSource> = [
    CursorChangeSource.TRANSFORMER,
    CursorChangeSource.SELECTOR,
    CursorChangeSource.NAVIGATION,
];

export class CursorHandler {
    //
    static source = CursorChangeSource;

    currentCursor: Record<CursorChangeSource, string | null> = {
        TRANSFORMER: null,
        SELECTOR: null,
        NAVIGATION: null,
    };

    constructor() {
        this.updateCursor();
    }

    setCursor(source: CursorChangeSource, cursor: string | null) {
        //
        if (cursor === null) {
            this.currentCursor[source] = null;
            this.updateCursor();
            return;
        }

        if (this.currentCursor[source] === cursor) {
            return;
        }

        this.currentCursor[source] = cursor;
        this.updateCursor();
    }

    clearCursor(source: CursorChangeSource) {
        //
        this.setCursor(source, null);
    }

    updateCursor() {
        //
        let cursor = null;

        for (const source of CURSOR_PRIORITY) {
            cursor = this.currentCursor[source];

            if (cursor) {
                break;
            }
        }

        CANVAS.style.cursor = cursor || "default";
    }

    private static _instance: CursorHandler | null = null;

    static get instance() {
        if (!CursorHandler._instance) {
            CursorHandler._instance = new CursorHandler();
        }

        return CursorHandler._instance;
    }
}
