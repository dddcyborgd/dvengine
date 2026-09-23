import { DataWrapper } from "@oncyberio/engine/space/datamodel/data-wrapper";
import { AbstractLens } from "./abstract";

/**
 * When editing guis sometimes we don't want to edit the data directly.
 * instead we want to edit a view of the data.
 *
 * Examples:
 * - avatar component: has data.rotation, but we want to edit only data.rotation.y
 * - colliderUI: collider.rotationLock is a [boolean, boolean, boolean], but we want to edit it as a single boolean
 *
 * A view interface can be plugged into the dataWrapper lens to intercept get/set operations
 * and transform the data as needed.
 */
export interface DataLensView<S = any, T = any> {
    onGet(value: S): T;
    onSet(value: T, prev: S): S;
}

export class DataWrapperLens<S = any> extends AbstractLens {
    //
    private pathAsStr: string;

    readonly transient = true;

    constructor(
        public wrapper: DataWrapper,
        public path: string[],
        public view?: DataLensView
    ) {
        //
        super();

        this.componentId = wrapper.data.id;

        this.pathAsStr = path.join(".");
    }

    get() {
        //
        let val = this.wrapper.get(this.path);

        if (this.view != null) {
            //
            val = this.view.onGet(val);
        }

        return val;
    }

    set(value: any) {
        // optimization
        if (this.view != null) {
            //
            value = this.view.onSet(value, this.wrapper.get(this.path));
        }

        if (
            value == null &&
            this.wrapper._valuePaths[this.pathAsStr]
        ) {
            //
            this.reset();
            //
        } else {
            //
            this.wrapper.set(this.path, value);
        }
    }

    reset() {
        //
        this.wrapper.unset(this.path);
    }


    get isLocked() {
        //
        return this.wrapper.data.lock?.[this.path[0]];
    }

    get source() {
        //
        return this.wrapper;
    }

    get prop() {
        //
        return this.pathAsStr;
    }

    withView(view: DataLensView) {
        //
        return new DataWrapperLens(this.wrapper, this.path, view);
    }
}
