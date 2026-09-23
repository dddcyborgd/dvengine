import { DataWrapper } from "@oncyberio/engine/space/datamodel/data-wrapper";

export interface PresetOpts {
    data: any;
    wrapper: DataWrapper;
}

export class Preset {
    //
    constructor(public opts: PresetOpts) {}

    apply(canUndo: boolean) {
        //
        let prevData = this.opts.wrapper.extract(this.opts.data);

        this.opts.wrapper.assign(this.opts.data);

        if (!canUndo) return null;

        return {
            undo: async () => {
                //
                this.opts.wrapper.assign(prevData);
            },
            redo: async () => {
                //
                this.opts.wrapper.assign(this.opts.data);
            },
        };
    }

    isApplied() {
        //
        return this.opts.wrapper.includes(this.opts.data);
    }
}
