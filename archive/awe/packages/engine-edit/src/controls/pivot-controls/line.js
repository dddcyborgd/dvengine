// @ts-check

import { LineGeometry } from '@oncyberio/engine/internal/utils/lines/line-geometry'
import { LineMaterial2 } from "@oncyberio/engine/internal/utils/lines/line-material-2";
import { Vector3 } from 'three'
import PipeLineLines from '@oncyberio/engine/internal/pipeline/pipeline-lines'
import Shared from '@oncyberio/engine/internal/utils/globals/shared'


let occlusionMaterial =  
    new LineMaterial2({
        transparent: true,
        color: "#000000",
        fog: false,
        toneMapped: false,
        resolution: Shared.resolution.value,
})



export class Line extends PipeLineLines {

    /**
     *
     * @param { Vector3[] } points
     */
    constructor(
        points,
        opts
    ) {



        let geometry = new LineGeometry()

        const vertices = points.flatMap(v => [v.x, v.y, v.z])
        geometry.setPositions(vertices)


        let material = new LineMaterial2({
            transparent: true,
            dashed: opts.dashed ? true : false,
            dashScale: opts.dashedScale ? opts.dashedScale : 4,
            gapSize: opts.gapSize ? opts.gapSize : 1,
            // depthTest: false,
            fog: false,
            toneMapped: false,
            // vertexColors: true,
            resolution: Shared.resolution.value,
            linewidth : 10,
            opacity: 0.8,
            // depthTest: false,
            // depthWrite: false,
            ...opts
        })


        super(geometry, material, {

            
            visibleOnOcclusion: true,
            visibleOnMirror: false,
            occlusionMaterial: occlusionMaterial

        })
        

        this.computeLineDistances()
        this.scale.set(1, 1, 1)


        this.frustumCulled = false

        this.renderOrder = 0
    }
}
