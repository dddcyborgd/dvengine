//

export class AbstractLens<T = any> {
    //
    componentId: string;

    get(): T {
        throw "abstrct";
    }

    set(value: T, opts?: { isProgress: boolean }): unknown {
        //
        throw "abstract";
    }

    reset() {
        //
        throw "abstract";
    }

    get source() {
        //
        return null;
    }

    get prop() {
        //
        return null;
    }

    get isLocked() {
        //
        return false;
    }
}

// an object that has the Same shape as Partial<AbstractLens>
export type LensLike<T = any> = Partial<{
    get(): T;
    set(value: T, opts?: { isProgress: boolean }): unknown;
    reset(): void;
    source: any;
    prop: any;
    isLocked: boolean;
}>;
