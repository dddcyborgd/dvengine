import { AbstractLens, LensLike } from "./abstract";

const noop: any = () => {};

export class Lens<T = any> extends AbstractLens<T> {
    //

    constructor(private _delegate: LensLike<T>) {
        //
        super();
    }

    get() {
        //
        return this._delegate.get?.();
    }

    set(value: T, opts?: { isProgress: boolean }) {
        //
        return this._delegate.set?.(value, opts);
    }

    reset() {
        //
        return this._delegate.reset?.();
    }

    get source() {
        //
        return this._delegate.source;
    }

    get prop() {
        //
        return this._delegate.prop;
    }

    get isLocked() {
        //
        return !!this._delegate.isLocked;
    }
}
