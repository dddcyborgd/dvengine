import { Component3DEditor } from "../../component-editor/ui-editor";
import { CameraComponent } from "@oncyberio/engine/space/components/camera/camera-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { Mesh, BoxGeometry, Vector3 } from "three";
import Camera from "@oncyberio/engine/camera";
import { getOrCreateEditor } from "../editor-registry";

/** @internal */
export class CameraEditor extends Component3DEditor<CameraComponent> {
    //
    private _currentSelectSplinePoint = 0;

    private _selectedDistance = 5;

    gui: GuiGroupDescriptor = {
        type: "group",
        children: {
            transform: getTransformUI(this, {
                position: {},
                rotation: {},
            }),

            behavior: {
                type: "folder",
                label: "Behavior",
                children: {
                    selectBehavior: {
                        type: "select",
                        label: "Select Behavior",
                        value: [this.data, "behavior"],
                        items: [
                            {
                                id: "free",
                                label: "Free",
                            },
                            {
                                id: "splines",
                                label: "Splines",
                            },
                            {
                                id: "first-person",
                                label: "First Person",
                            },
                            {
                                id: "third-person",
                                label: "Third Person",
                            },
                        ],
                    },

                    positionSpline: {
                        type: "select",
                        label: "Position Spline",
                        items: () => this.getComponentsOptions("spline"),
                        nullable: true,
                        value: [this.data, "positionSpline"],
                        visible: () => {
                            return this.data.behavior == "splines";
                        },
                        validate: (value) => {
                            //
                            if (value && value === this.data.lookatSpline) {
                                throw new Error(
                                    "Position and Look At splines can't be the same"
                                );
                            }
                        },
                    },

                    lookatSpline: {
                        type: "select",
                        label: "Look At Spline",
                        items: () => this.getComponentsOptions("spline"),
                        nullable: true,
                        value: [this.data, "lookatSpline"],
                        visible: () => {
                            return this.data.behavior == "splines";
                        },
                        validate: (value) => {
                            //
                            if (value && value === this.data.positionSpline) {
                                throw new Error(
                                    "Position and Look At splines can't be the same"
                                );
                            }
                        },
                    },

                    naturalMovement: {
                        type: "checkbox",
                        label: "Natural Movement",
                        value: [this.data, "naturalMovement"],
                        visible: () => {
                            return this.data.behavior == "splines";
                        },
                    },

                    naturalMovementForce: {
                        visible: () => {
                            return (
                                this.data.behavior == "splines" &&
                                this.data.naturalMovement == true
                            );
                        },
                        type: "number",
                        label: "Natural Movement Force",
                        value: [this.data, "naturalMovementForce"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                    },
                },
            },
            parameters: {
                type: "folder",
                label: "Parameters",
                children: {
                    fov: {
                        type: "number",
                        label: "FOV",
                        value: [this.data, "fov"],
                        min: 1,
                        max: 180,
                        step: 1,
                    },
                },
            },

            splines: {
                type: "folder",
                label: "Splines",
                visible: () => {
                    return this.data.behavior == "splines";
                },
                children: {
                    splineProgress: {
                        type: "number",
                        label: "Spline Progress",
                        value: [this.data, "splineProgression"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                        visible: () => {
                            return this.data.behavior == "splines";
                        },
                    },

                    splineDuration: {
                        type: "number",
                        label: "Spline Duration",
                        value: [this.data, "splineDuration"],
                        min: 0,
                        max: 50,
                        step: 0.01,
                        visible: () => {
                            return this.data.behavior == "splines";
                        },
                    },

                    playSpline: {
                        type: "button",
                        label: "Play Spline",
                        skipLabel: true,
                        onAction: () => this.component.playSpline(),
                        visible: () => {
                            return this.data.behavior == "splines";
                        },
                    },

                    stopSpline: {
                        type: "button",
                        label: "Stop Spline",
                        skipLabel: true,
                        onAction: () => this.component.stopSpline(),
                        visible: () => {
                            return this.data.behavior == "splines";
                        },
                    },

                    addPointFromCurrentView: {
                        type: "button",
                        label: "Add point from current editor view",
                        skipLabel: true,
                        onAction: () => {
                            this.setPointFromCurrentView();
                        },
                        visible: () => {
                            return (
                                this.data.behavior == "splines" &&
                                this.component._getSplinesComponents() != null
                            );
                        },
                    },

                    selectPoint: {
                        type: "select",
                        label: "Select Index Point",
                        value: [this, "_currentSelectSplinePoint"],
                        format: {
                            parse: (value) =>
                                value == null ? value : parseInt(value),
                            format: (value) => String(value),
                        },
                        items: () => {
                            const indexes =
                                this.component.getSplineIndexCount();
                            let items = [];
                            let i = 0;
                            while (i < indexes) {
                                items.push({ id: i, label: i.toString() });
                                i++;
                            }
                            return items;
                        },
                        visible: () => {
                            return (
                                this.data.behavior == "splines" &&
                                this.component._getSplinesComponents() != null
                            );
                        },
                    },

                    addPointAtIndex: {
                        type: "button",
                        label: "Add Point At Selected Index",
                        skipLabel: true,
                        onAction: () => {
                            this._addNewPointAtIndex();
                        },
                    },

                    selectDistance: {
                        type: "number",
                        label: "Selected Distance",
                        value: [this, "_selectedDistance"],
                        min: 0.1,
                        max: 200,
                        step: 0.1,
                        visible: () => {
                            return this.data.behavior == "splines";
                        },
                    },

                    alignSelectedPointWithCurrentView: {
                        type: "button",
                        label: "Set selected point with view",
                        skipLabel: true,
                        onAction: () => {
                            this.setPointFromCurrentView(
                                this._currentSelectSplinePoint
                            );
                        },
                        visible: () => {
                            return (
                                this.data.behavior == "splines" &&
                                this.component._getSplinesComponents() != null
                            );
                        },
                    },

                    alignViewWithSelectedPoint: {
                        type: "button",
                        label: "Show view of selected point",
                        skipLabel: true,
                        onAction: () => {
                            this.alignViewWithSelectedPoint();
                        },
                        visible: () => {
                            return (
                                this.data.behavior == "splines" &&
                                this.component._getSplinesComponents() != null
                            );
                        },
                    },

                    deleteSelectedPoint: {
                        type: "button",
                        label: "Delete Selected Point",
                        skipLabel: true,
                        disabled: () => {
                            return (
                                this._currentSelectSplinePoint == null ||
                                this.component.getSplineIndexCount() <= 4
                            );
                        },
                        onAction: () => {
                            this.deleteSelectedPoint();
                        },
                        visible: () => {
                            return (
                                this.data.behavior == "splines" &&
                                this.component._getSplinesComponents() != null
                            );
                        },
                    },
                },
            },
            visualisation: {
                type: "folder",
                label: "Visualisation",
                children: {
                    toggleHelper: {
                        type: "checkbox",
                        value: [this, "toggleHelper"],
                        label: "Toggle Helper",
                    },
                    togglePreview: {
                        type: "checkbox",
                        value: [this, "togglePreview"],
                        label: "Toggle Preview",
                    },
                    previewSize: {
                        type: "number",
                        label: "Preview Size",
                        value: [this.data, "previewSize"],
                        min: 128,
                        max: 512,
                        step: 2,
                    },
                    previewRatio: {
                        type: "select",
                        label: "Preview Ratio",
                        value: [this.data, "previewRatio"],
                        items: [
                            { id: 4 / 3, label: "4:3" },
                            { id: 16 / 9, label: "16:9" },
                            { id: 1, label: "1:1" },
                        ],
                    },
                },
            },
        },
    };

    selectionMesh = null;

    getSelectionMesh() {
        //
        if (this.selectionMesh == null) {
            //
            this.selectionMesh = new Mesh(new BoxGeometry(2, 2, 2));

            this.selectionMesh.visible = false;

            this.component.add(this.selectionMesh);
        }

        return this.selectionMesh;
    }

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }

    _toggleHelper = false;

    get toggleHelper() {
        //
        return this._toggleHelper;
    }

    set toggleHelper(value) {
        //
        this._toggleHelper = value;

        this.component._toggleHelper(value);
    }

    _togglePreview = false;

    get togglePreview() {
        //
        return this.component.togglePreview;
    }

    set togglePreview(value) {
        //
        this._togglePreview = value;

        this.component.togglePreview = value;
    }

    onSelectedChanged(isSelected: boolean): void {
        if (isSelected) {
            this.togglePreview = true;
        } else {
            this.togglePreview = false;
        }
    }

    _addNewPointAtIndex() {
        const splineComponents = this.component._getSplinesComponents();

        if (splineComponents == null) return;

        const index = this._currentSelectSplinePoint;

        if (index == null) return;

        splineComponents.positionSpline.addPointAtIndex(index);

        splineComponents.lookatSpline.addPointAtIndex(index);

        const positionSplineUpdate =
            (getOrCreateEditor(splineComponents.positionSpline) as any)?.getDataPointsUpdate();

        const lookatSplineUpdate =
            (getOrCreateEditor(splineComponents.lookatSpline) as any)?.getDataPointsUpdate();

        this.dispatchDataChangeMulti([
            positionSplineUpdate,
            lookatSplineUpdate,
        ]);
    }

    alignViewWithSelectedPoint() {
        //
        const index = this._currentSelectSplinePoint;

        if (index == null) return;

        const splineComponents = this.component._getSplinesComponents();

        if (splineComponents == null) return;

        this.component.setSplineCameraProgressionAtIndex(index);

        Camera.current.userData._controls?.setCoords(
            this.component.position,
            this.component._camera.rotation
        );
    }

    setPointFromCurrentView(index = null) {
        //
        const splineComponents = this.component._getSplinesComponents();

        if (splineComponents == null) return;

        const pos = Camera.current.position.clone();

        const dir = new Vector3();

        Camera.current.getWorldDirection(dir);

        const lookat = new Vector3();

        lookat.set(
            pos.x + dir.x * this._selectedDistance,

            pos.y + dir.y * this._selectedDistance,

            pos.z + dir.z * this._selectedDistance
        );

        if (index != null) {
            splineComponents.positionSpline._spline.worldToLocal(pos);
            splineComponents.lookatSpline._spline.worldToLocal(lookat);

            splineComponents.positionSpline.setPointAtIndex(index, pos);
            splineComponents.lookatSpline.setPointAtIndex(index, lookat);

            // this._currentSelectSplinePoint = this.getSplineIndexCount() - 1
        } else {
            //
            // const newDataPosition = splineComponents.positionSpline.data.points.slice()

            splineComponents.positionSpline._spline.worldToLocal(pos);
            splineComponents.lookatSpline._spline.worldToLocal(lookat);

            splineComponents.positionSpline.addPoint(pos);
            splineComponents.lookatSpline.addPoint(lookat);

            this._currentSelectSplinePoint =
                this.component.getSplineIndexCount() - 1;
        }

        const positionSplineUpdate =
            (getOrCreateEditor(splineComponents.positionSpline) as any)?.getDataPointsUpdate();

        const lookatSplineUpdate =
            (getOrCreateEditor(splineComponents.lookatSpline) as any)?.getDataPointsUpdate();

        this.dispatchDataChangeMulti([
            positionSplineUpdate,
            lookatSplineUpdate,
        ]);
    }

    deleteSelectedPoint() {
        //
        const index = this._currentSelectSplinePoint;

        if (index == null) return;

        debugger;

        const splineComponents = this.component._getSplinesComponents();

        if (!splineComponents) return;

        if (index != null) {
            //
            splineComponents.positionSpline.deletePointAtIndex(index);

            splineComponents.lookatSpline.deletePointAtIndex(index);

            this._currentSelectSplinePoint = index == 0 ? 0 : index - 1;

            const positionSplineUpdate =
                (getOrCreateEditor(splineComponents.positionSpline) as any)?.getDataPointsUpdate();

            const lookatSplineUpdate =
                (getOrCreateEditor(splineComponents.lookatSpline) as any)?.getDataPointsUpdate();

            this.dispatchDataChangeMulti([
                positionSplineUpdate,
                lookatSplineUpdate,
            ]);

            return;
        }
    }
}
