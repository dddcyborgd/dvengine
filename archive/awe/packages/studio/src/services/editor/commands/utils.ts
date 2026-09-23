//
import { isObject, deepEqual, hasOwn } from "../../../utils/js";

const requiredKeys: Record<string, boolean> = {
    id: true,
    kind: true,
    type: true,
    kit: true,
    name: true,
    // collider: true,
    script: true,
    parentId: true,
    prefabId: true,
    _version: true,
};

const ignoreAddKeys = {
    id: true,
    type: true,
    kit: true,
    _version: true,
};

export function deepAssign(
    draft: object,
    data: object,
    opts?: { delete?: boolean; valuePaths?: Record<string, boolean> },
    nested = false,
    currentPath = ""
) {
    //
    let hasChanged = false;

    const keys = Object.keys(data);

    for (let i = 0; i < keys.length; i++) {
        //
        const key = keys[i];

        if (!nested && ignoreAddKeys[key]) continue;

        const currentPathKey = currentPath ? `${currentPath}.${key}` : key;

        const value = data[key];

        let oldValue = draft[key];

        let hasValueChanged = false;

        if (
            oldValue == null ||
            !isObject(value) ||
            !isObject(oldValue) ||
            opts?.valuePaths?.[currentPathKey]
        ) {
            //

            if (deepEqual(oldValue, value)) continue;

            draft[key] = structuredClone(value);

            hasValueChanged = oldValue !== value;
            //
        } else {
            //
            hasValueChanged = deepAssign(
                draft[key],
                value,
                opts,
                true,
                currentPathKey
            );
        }

        hasChanged ||= hasValueChanged;
    }

    // remove keys that are not in the new data
    if (opts?.delete) {
        //
        const oldKeys = Object.keys(draft);

        for (let i = 0; i < oldKeys.length; i++) {
            //
            const key = oldKeys[i];

            if (requiredKeys[key] || hasOwn(data, key)) continue;

            delete draft[key];

            hasChanged = true;
        }
    }

    return hasChanged;
}

export function shallowAssign(
    draft: object,
    data: object,
    opts?: { delete?: boolean }
) {
    //
    let hasChanged = false;

    const keys = Object.keys(data);

    for (let i = 0; i < keys.length; i++) {
        //
        const key = keys[i];

        const value = data[key];

        const oldValue = draft[key];

        if (deepEqual(oldValue, value)) continue;

        draft[key] = structuredClone(value);
    }

    if (opts?.delete) {
        //
        const oldKeys = Object.keys(draft);

        for (let i = 0; i < oldKeys.length; i++) {
            //
            const key = oldKeys[i];

            if (hasOwn(data, key)) continue;

            delete draft[key];

            hasChanged = true;
        }
    }

    return hasChanged;
}

export function isNewerResource(incoming: any, current: any) {
    //
    return !current.$$module?.ts || incoming.$$module.ts > current.$$module.ts;
}
