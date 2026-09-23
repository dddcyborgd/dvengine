import emitter from "@oncyberio/engine/internal/engine-emitter";
import Events from "../editor-events";
import Scene from "@oncyberio/engine/internal/scene";
import PipeLineMesh from "@oncyberio/engine/internal/pipeline/pipeline-mesh";
import { BoxGeometry, DoubleSide, MeshBasicMaterial } from "three";

export class DragPreview3D extends PipeLineMesh {
    //

    previewMat: MeshBasicMaterial;

    constructor() {
        let previewMat = new MeshBasicMaterial({
            transparent: true,
            depthTest: false,
            side: DoubleSide,
            wireframe: true,
        });

        let previewGeo = new BoxGeometry(1, 1, 1, 6, 6, 6);

        super(previewGeo, previewMat);

        this.previewMat = previewMat;

        this.name = "DragPreviewMesh3D";

        Scene.add(this);
    }

    pending = false;

    setPending(p) {
        if (p === this.pending) return;

        this.pending = true;

        if (p) {
            emitter.on(Events.LATE_UPDATE, this.onUpdate);
        } else {
            emitter.off(Events.LATE_UPDATE, this.onUpdate);
        }
    }

    onUpdate = (dt: number) => {
        //
        // animate material opacity between 0.5 and 1
        // 1 cycle = 1 second
        let time = Date.now() * 0.001;

        let opacity = 0.5 + Math.sin(time * 1) * 0.5;

        this.previewMat.opacity = opacity;
    };

    private wasDisposed = false;
    
    onDestroy() {
        //
        if (this.wasDisposed) return;

        this.wasDisposed = true;

        Scene.remove(this);
        this.setPending(false);
        this.geometry.dispose();
        this.material.dispose();
        super.destroy();
    }
}
