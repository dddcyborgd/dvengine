import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { Component3DEditor } from "../../component-editor/ui-editor";
import { SplineComponent } from "@oncyberio/engine/space/components/spline/spline-component";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

import { Mesh, Intersection, MeshBasicMaterial } from "three";

/** @internal */
export class SplineEditor extends Component3DEditor<SplineComponent> {
    //
    // gui = getTransformUI(this);

    private _currentSelectSplinePoint = 0;


    gui: GuiGroupDescriptor = {
        type: "group",
        children: {
            transform: getTransformUI(this, {
                rotation: {},
                position: {},
            }),
            aspect: {
                type: "folder",
                label: "Aspect",
                children: {
                    color: {
                        type: "color",
                        value: [this.data, "color"],
                    },
                    lineWidth: {
                        type: "number",
                        value: [this.data, "lineWidth"],
                        min: 0.25,
                        max: 6,
                        step: 0.25,
                    },
                    opacity: {
                        type: "number",
                        value: [this.data, "opacity"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                    },
                    display: {
                        type: "checkbox",
                        value: [this.data, "display"],
                        label: "Display on Live Mode",
                    },
                },
            },
            edition: {
                type: "folder",
                label: "Edition",
                children: {
                    add: {
                        type: "button",
                        label: "Add New Point",
                        skipLabel: true,
                        onAction: () => this._addNewPoint(),
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
                                this.component.getPoints().length
                            let items = [];
                            let i = 0;
                            while (i < indexes) {
                                items.push({ id: i, label: i.toString() });
                                i++;
                            }
                            return items;
                        }
                    },

                    addAtIndex: {
                        type: "button",
                        label: "Add New Point At Selected index",
                        skipLabel: true,
                        onAction: () => this._addNewPointAtIndex(this._currentSelectSplinePoint),
                    },
                    delete: {
                        type: "button",
                        label: "Delete current point",
                        skipLabel: true,
                        disabled: () => {
                            const isDisabled =
                                this._currentDetailMesh == null ||
                                this.getDetailMeshes().length <= 4;

                            return isDisabled;
                        },
                        onAction: () => this._deletePoint(),
                    },
                    closed: {
                        type: "checkbox",
                        value: [this.data, "closed"],
                        label: "Closed",
                    },
                    smoothness: {
                        type: "number",
                        value: [this.data, "smoothness"],
                        min: 4,
                        max: 2000,
                        step: 1,
                    },
                },
               
            },
            follower:{

                type:"folder",
                label:"Follower",
                children:{

                    Component: {
                        type: "select",
                        label: "Component",
                        format: {
                            parse: (id) => {
                                if (id == null) return null;

                                let component =
                                    this.component.container.byInternalId(id);

                                let data = structuredClone(
                                    component.getDataNode({ template: true })
                                );

                                data.originId = id;

                                return data;
                            },
                            format(data) {
                                return data?.originId || null;
                            },
                        },
                        items: () =>
                            this.getComponentsOptions((component) => {
                                return (
                                    !component.info.singleton &&
                                    component.info.type != "terrain" &&
                                    component.info.type != "batch"
                                );
                            }),
                        nullable: true,
                        value: [this.data, "preset"],
                    },

                    count: {
                        visible: () => this.data.preset != null,
                        type: "number",
                        value: [this.data, "followerCount"],
                        min: 1,
                        max: 40,
                        step: 1,
                    },

                    followerOffsetVariation:{

                        visible: () => this.data.preset != null,
                        type: "xyz",
                        value: [this.data, "followerOffsetVariation"],
                        inline: false,
                        min: -10,
                        max: 10,
                        step: 0.1,
                    },

                    followerSpeed: {

                        visible: () => this.data.preset != null,
                        type: "number",
                        value: [this.data, "followerSpeed"],
                        min: 0.01,
                        max: 5,
                        step: 0.01,
                    },

                    followerSpeedVariation: {

                        visible: () => this.data.preset != null,
                        type: "number",
                        value: [this.data, "followerSpeedVariation"],
                        min: 0.01,
                        max: 5,
                        step: 0.01,
                    }


                    
                    
                }
            }
        },
    };


    _addNewPointAtIndex( index ){

        this.component.addPointAtIndex( index )

        this.updateDataPoints();
    }
   

    _addNewPoint() {
        //
        this.component.addPoint(null);

        this.updateDataPoints();
    }

    _deletePoint() {
        //
        this.component.deletePoint(this._currentDetailMesh);

        this._setCurrentDetailMesh(null);

        this.updateDataPoints();
    }

    getDataPointsUpdate() {
        //
        const points = this.component._spline.getDataPoints();

        const update = this.getDataChanges({ points });

        return update;
    }

    updateDataPoints() {
        //
        const update = this.getDataPointsUpdate();

        this.dispatchDataChangeMulti([update]);
    }

    getDetailMeshes() {
        //
        return this.component.getSectors();
    }

    _currentDetailMesh: Mesh = null;

    _setCurrentDetailMesh(mesh: Mesh) {
        //
        if (this._currentDetailMesh == mesh) return;

        if (this._currentDetailMesh) {
            this.detachTransformControls(this._currentDetailMesh);

            (this._currentDetailMesh.material as MeshBasicMaterial).color.set(0xff0000);

            this._currentDetailMesh.scale.set(1, 1, 1);
        }

        this._currentDetailMesh = mesh;

        if (this._currentDetailMesh != null) {
            (this._currentDetailMesh.material as MeshBasicMaterial).color.set(0x00ff00);

            this._currentDetailMesh.scale.set(2, 2, 2);
        }

        this.attachTransfomControls(mesh, {
            translate: true,
            callbacks: {
                onDragStart: this.onDragStart,
                onDrag: this.onDrag,
                onDragEnd: this.onDragEnd,
            },
        });

        this.updateUI();
    }

    onDragStart = () => {};

    onDrag = () => {
        //
        this.component._spline.updateFromSectors();
    };

    onDragEnd = () => {
        //
        this.updateDataPoints();
    };

    onDetailMeshClicked(mesh: Mesh, intersect: Intersection<Mesh>): void {
        this._setCurrentDetailMesh(mesh);

        // this.updateUI();
    }

    onDetailMeshMouseEnter(mesh: Mesh, intersect: Intersection<Mesh>): void {
        console.log("detail mouse enter ");

        (mesh.material as MeshBasicMaterial).color.set(0x00ff00);

        mesh.scale.set(2, 2, 2);
        //
        // if (mesh == this._currentDetailMesh) return;
    }

    onDetailMeshMouseLeave(mesh: Mesh): void {
        if (mesh == this._currentDetailMesh) return;

        mesh.scale.set(1, 1, 1);

        (mesh.material as MeshBasicMaterial).color.set(0xff0000);

        // if (mesh == this._currentDetailMesh) return;
    }

    onSelectedChanged(b) {
        if (b == true) {
            this.component._spline?.displaySectors();
        } else {
            this.component._spline?.removeSectors();

            this._setCurrentDetailMesh(null);
        }
    }

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }
}
