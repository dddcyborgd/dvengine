export var Verbosity = /*#__PURE__*/ function(Verbosity) {
    Verbosity[Verbosity["SILENT"] = 4] = "SILENT";
    Verbosity[Verbosity["ERROR"] = 3] = "ERROR";
    Verbosity[Verbosity["WARN"] = 2] = "WARN";
    Verbosity[Verbosity["INFO"] = 1] = "INFO";
    Verbosity[Verbosity["DEBUG"] = 0] = "DEBUG";
    return Verbosity;
}({});
export class Logger {
    verbosity;
    static Verbosity = Verbosity;
    static DEFAULT_INSTANCE = new Logger(Logger.Verbosity.INFO);
    constructor(verbosity){
        this.verbosity = verbosity;
    }
    debug(text) {
        if (this.verbosity <= Logger.Verbosity.DEBUG) {
            console.debug(text);
        }
    }
    info(text) {
        if (this.verbosity <= Logger.Verbosity.INFO) {
            console.info(text);
        }
    }
    warn(text) {
        if (this.verbosity <= Logger.Verbosity.WARN) {
            console.warn(text);
        }
    }
    error(text) {
        if (this.verbosity <= Logger.Verbosity.ERROR) {
            console.error(text);
        }
    }
}
