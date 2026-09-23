import {
    COLLIDER_TYPES,
    RIGIDBODY_TYPES,
    PhysicsData,
} from "@oncyberio/engine/physics/types";
import { Component3DEditor } from "../ui-editor";
import type { GuiFolderDescriptor } from "../gui-types";
import { DataLensView } from "../lens/data-wrapper-lens";

export const RigidBodyOpts = [
    RIGIDBODY_TYPES.FIXED,
    RIGIDBODY_TYPES.DYNAMIC,
    RIGIDBODY_TYPES.KINEMATIC,
    RIGIDBODY_TYPES.PLAYER,
];

const ColliderOpts = Object.values(COLLIDER_TYPES);

export function getDefaultColliderData(enabled = false): PhysicsData {
    return {
        enabled,
        rigidbodyType: RIGIDBODY_TYPES.FIXED,
        colliderType: COLLIDER_TYPES.MESH,
        isSensor: false,
        dynamicProps: {
            mass: 1,
            friction: 0.5,
            restitution: 0,
            linearDamping: 0,
            angularDamping: 0,
        },
    };
}

type AxisLock = [boolean, boolean, boolean];

const lockView: DataLensView<AxisLock, boolean> = {
    //
    onGet(lock) {
        //
        return lock?.some((v) => v);
    },
    onSet(value: boolean, _: AxisLock) {
        //
        return [value, value, value];
    },
};

const lockViewAt = (index: number): DataLensView<AxisLock, boolean> => {
    //
    return {
        onGet: (lock: AxisLock) => {
            //
            return lock?.[index] ?? false;
        },

        onSet(value: boolean, prev: AxisLock) {
            //
            const rot = (prev?.slice() as AxisLock) ?? [true, true, true];

            rot[index] = value;

            return rot;
        },
    };
};

export function getColliderGUI(editor: Component3DEditor): GuiFolderDescriptor {
    //
    const rotationLock = editor.view("collider.rotationLock", lockView);

    const translationLock = editor.view("collider.translationLock", lockView);

    const rotationLockAt = (index: number) => {
        return editor.view("collider.rotationLock", lockViewAt(index));
    };

    const translationLockAt = (index: number) => {
        return editor.view("collider.translationLock", lockViewAt(index));
    };

    const prop = (prop: string) => {
        //
        return editor.view("collider." + prop);
    };

    return {
        type: "folder",
        label: "Collision",
        slug: "collider",
        children: {
            collider: {
                type: "checkbox",
                label: "Collider",
                value: [editor.data, "collider"],
                format: {
                    format: (v) => !!v?.enabled,
                    parse: (v, collider) => {
                        //
                        if (collider == null) {
                            const data = getDefaultColliderData(v);
                            return data;
                        }

                        return {
                            ...collider,
                            enabled: v,
                        };
                    },
                },
            },
            colliderParams: {
                type: "group",
                visible: () => editor.data.collider?.enabled,
                children: {
                    rigidbodyType: {
                        type: "select",
                        name: "Rigid Body Type",
                        items: RigidBodyOpts,
                        value: prop("rigidbodyType"),
                    },

                    colliderType: {
                        type: "select",
                        name: "Collider Type",
                        items: ColliderOpts,
                        value: prop("colliderType"),
                    },

                    isSensor: {
                        type: "checkbox",
                        label: "Sensor",
                        value: prop("isSensor"),
                    },

                    mass: {
                        visible: () =>
                            editor.data.collider.rigidbodyType ==
                            RIGIDBODY_TYPES.DYNAMIC,
                        type: "number",
                        label: "Mass",
                        value: prop("dynamicProps.mass"),
                        min: 1,
                        max: 1000,
                    },
                    friction: {
                        type: "number",
                        label: "Friction",
                        value: prop("dynamicProps.friction"),
                        min: 0,
                        max: 1,
                        step: 0.01,
                    },
                    restitution: {
                        type: "number",
                        label: "Restitution",
                        value: prop("dynamicProps.restitution"),
                        min: 0,
                        max: 1,
                        step: 0.01,
                    },
                    linearDamping: {
                        visible: () =>
                            editor.data.collider.rigidbodyType ==
                            RIGIDBODY_TYPES.DYNAMIC,
                        type: "number",
                        label: "Linear Damping",
                        value: prop("dynamicProps.linearDamping"),
                        min: 0,
                        max: 100,
                        step: 0.01,
                    },
                    angularDamping: {
                        visible: () =>
                            editor.data.collider.rigidbodyType ==
                            RIGIDBODY_TYPES.DYNAMIC,
                        type: "number",
                        label: "Angular Damping",
                        value: prop("dynamicProps.angularDamping"),
                        min: 0,
                        max: 100,
                        step: 0.01,
                    },
                    // density: {
                    //     type: "number",
                    //     label: "Density",
                    //     value: [
                    //         editor.data,
                    //         "collider",
                    //         "dynamicProps",
                    //         "density",
                    //     ],
                    //     min: 0,
                    //     max: 100,
                    //     step: 0.1,
                    // },

                    rotationLock: {
                        type: "group",
                        style: { gap: 0 },
                        children: {
                            rotation: {
                                type: "checkbox",
                                label: "Lock Rotation",
                                value: rotationLock,
                            },

                            rotationParams: {
                                type: "group",
                                style: { gap: 0 },
                                visible: () => rotationLock.get(),
                                children: {
                                    x: {
                                        type: "checkbox",
                                        label: "Lock X Rotation",
                                        value: rotationLockAt(0),
                                        display: "row",
                                    },
                                    y: {
                                        type: "checkbox",
                                        label: "Lock Y Rotation",
                                        value: rotationLockAt(1),
                                        display: "row",
                                    },
                                    z: {
                                        type: "checkbox",
                                        label: "Lock Z Rotation",
                                        value: rotationLockAt(2),
                                        display: "row",
                                    },
                                },
                            },
                        },
                    },

                    translationLock: {
                        type: "group",
                        style: { gap: 0 },
                        children: {
                            translation: {
                                type: "checkbox",
                                label: "Lock Translation",
                                value: translationLock,
                            },

                            translationParams: {
                                type: "group",
                                style: { gap: 0 },
                                visible: () => translationLock.get(),
                                children: {
                                    x: {
                                        type: "checkbox",
                                        label: "Lock X Translation",
                                        value: translationLockAt(0),
                                        display: "row",
                                    },
                                    y: {
                                        type: "checkbox",
                                        label: "Lock Y Translation",
                                        value: translationLockAt(1),
                                        display: "row",
                                    },
                                    z: {
                                        type: "checkbox",
                                        label: "Lock Z Translation",
                                        value: translationLockAt(2),
                                        display: "row",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    };
}

export function getRestrictedColliderGUI(editor: Component3DEditor): GuiFolderDescriptor {
    const prop = (prop: string) => {
        //
        return editor.view("collider." + prop);
    };

    return {
        type: "folder",
        label: "Collider",
        children: {
            enabled: {
                type: "checkbox",
                label: "Enabled",
                value: [editor.data, "collider", "enabled"],
            },
            friction: {
                visible: () => editor.data.collider.enabled,
                type: "number",
                label: "Friction",
                value: prop("dynamicProps.friction"),
                min: 0,
                max: 1,
                step: 0.01,
            },
            restitution: {
                visible: () => editor.data.collider.enabled,
                type: "number",
                label: "Restitution",
                value: prop("dynamicProps.restitution"),
                min: 0,
                max: 1,
                step: 0.01,
            },
        },
    };
}
