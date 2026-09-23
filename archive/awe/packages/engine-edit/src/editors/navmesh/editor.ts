import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { Component3DEditor } from "../../component-editor/ui-editor";
import { NavmeshComponent } from "@oncyberio/engine/space/components/navmesh/navmesh-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { Mesh, BoxGeometry, MeshBasicMaterial } from "three";
import { disposeObject3D } from "@oncyberio/engine/internal/utils/dispose";
import { getParamsGui } from "./data";

type SaveState = "Idle" | "Generating" | "Uploading";

const saveStateLabels: Record<SaveState, string> = {
    Idle: "Generate",
    Generating: "Generating...",
    Uploading: "Uploading...",
};

/** @internal */
export class NavmeshComponentEditor extends Component3DEditor<NavmeshComponent> {

    init() {
        // Enable debug helper in edit mode (IoC: editor enables it, not the component)
        this.component.debugHelper.enabled = true;
    }

    saveState: SaveState = "Idle";

    private _setSaveState(state: SaveState) {
        this.saveState = state;
        this.updateUI();
    }

    gui: GuiGroupDescriptor = {
        type: "group",
        children: {
            generate: {
                type: "button",
                label: () => saveStateLabels[this.saveState],
                noLabel: true,
                disabled: () => this.saveState !== "Idle",
                form: false,
                onAction: async () => {
                    //
                    try {
                        this._setSaveState("Generating");
                        let res = await this.component.generateNavmesh();

                        if ("raw" in res) {
                            this._setSaveState("Uploading");
                            await this.uploadNavmesh({ raw: res.raw });
                        }
                        //
                    } catch (e) {
                        //
                        console.error(e);
                        this.showError({ message: e.message });
                    } finally {
                        this._setSaveState("Idle");
                    }
                },
            },
            bounds: {
                ...getTransformUI(this, { position: {}, scale: {} }),
                label: "Bounds",
            },

            params: getParamsGui(this.data),

            debug: this.component.debugHelper.ui,
        },
    };

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }

    async uploadNavmesh(opts: { raw: Uint8Array }) {
        //
        console.log(
            "Uploading navmesh, size:",
            (opts.raw.byteLength / 1024).toFixed(2),
            "KB"
        );

        const blob = new Blob([opts.raw as BlobPart], {
            type: "application/octet-stream",
        });

        const result = await this.uploadFile({
            file: blob,
            id:
                this.component.space.options.game.id +
                "-" +
                this.data.id +
                ".navmesh",
            mimeType: "application/octet-stream",
            isUnique: true,
            overwrite: true,
        });

        console.log("Navmesh uploaded", result.url);
        this.dispatchDataChange({ url: result.url });
    }

    _mesh: Mesh;

    getSelectionMesh() {
        if (this._mesh) {
            return this._mesh;
        }

        this._mesh = new Mesh(
            new BoxGeometry(1, 1, 1),
            new MeshBasicMaterial({
                opacity: 0.1,
                transparent: true,
                color: 0xff0000,
            })
        );
        this._mesh.visible = false;
        this._mesh.renderOrder = 999_999;

        this.component.add(this._mesh);

        return this._mesh;
    }

    onSelectedChanged(isSelected: boolean): void {
        this.getSelectionMesh().visible = isSelected;
        this.component.debugHelper.visible =
            this.component.debugHelper.showAgent || isSelected;
    }

    dispose(): void {
        //
        if (this._mesh) disposeObject3D(this._mesh);
        super.dispose();
    }
}
