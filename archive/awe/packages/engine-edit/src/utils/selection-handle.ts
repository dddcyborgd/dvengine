import { BoxGeometry, Color, EdgesGeometry } from "three";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import PipeLineLines from "@oncyberio/engine/internal/pipeline/pipeline-lines";
import { LineMaterial2 } from "@oncyberio/engine/internal/utils/lines/line-material-2";


/**
 *
 * @param { Mesh } mesh
 * @param { Color | number } color
 * @param { number } linewidth
 */

export function getSelectionHandle(mesh, color, linewidth = 2) {
    
    if(mesh.geometry.boundingBox == null) {

        mesh.geometry.computeBoundingBox()
    }

    const box = mesh.geometry.boundingBox;

    const boxGeo = new BoxGeometry(
        box.max.x - box.min.x,
        box.max.y - box.min.y,
        box.max.z - box.min.z
    );

    boxGeo.translate(
        (box.max.x + box.min.x) / 2,
        (box.max.y + box.min.y) / 2,
        (box.max.z + box.min.z) / 2
    );

    const edges = new EdgesGeometry(boxGeo);

    let geometry = new LineSegmentsGeometry().fromEdgesGeometry(edges);


    if (color instanceof Color) {

        color = color.getHex()
    }

    const border = new PipeLineLines(
        geometry,
        new LineMaterial2({
            color,
            linewidth,
            // depthTest: false,
            // depthWrite: false,
        }),
        {
            visibleOnOcclusion: false,
            visibleOnMirror : false
        }
    );
    

    return border;

    
}