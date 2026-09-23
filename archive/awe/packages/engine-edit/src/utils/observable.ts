
import emitter from "@oncyberio/engine/internal/engine-emitter";


type Callback = () => unknown;

export class WorldObservable<T, ACTIONS = null> {
    //
    public callbacks = new Set<Callback>();
    private value: T;
    private disposes: Array<() => void> = [];

    constructor(
        startValue: T,
        reducers: Array<{
            event: string;
            update: (eventData: any, seed: T) => T;
        }>,
        public isSync = false,
        public actions: ACTIONS = null,
    ) {
        //
        this.value = startValue;

        reducers.forEach(({ event, update }) => {
            //
            const listener = this._onEvent(update);

            emitter.on(event, listener);

            this.disposes.push(() => {
                emitter.off(event, listener);
            });
        });
    }

    private _notifySync = () => {
        this.callbacks.forEach((cb) => {
            cb();
        });
    };

    private _notify = () => {

        if (this.isSync) {
            this._notifySync();
        } else {
            setTimeout(this._notifySync);
        }
    }

    private  _onEvent = (reducer) => (payload) => {
        //
        this.value = reducer(payload, this.value);

        this._notify();
    };

    public setState(state: T) {
        //
        this.value = state;

        this._notify();
    }



    subscribe = (callback: Callback) => {
        //
        this.callbacks.add(callback);

        return () => this.callbacks.delete(callback);
    };

    getState = () => {
        //
        return this.value;
    };

    getServerSnapshot = () => {
        //
        return this.value;
    };

    dispose = () => {
        //
        this.disposes.forEach((dispose) => dispose());

        this.callbacks.clear();
    }
}
