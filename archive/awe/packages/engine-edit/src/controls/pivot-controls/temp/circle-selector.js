import PipeLineMesh from "@oncyberio/engine/internal/pipeline/pipeline-mesh";

import { ShaderMaterial, CircleGeometry, MeshBasicMaterial, Color, Vector3, Group, Matrix4 } from "three";

import Vertex from './shaders/vert.glsl.ts'

import Fragment from './shaders/frag.glsl.ts'

const segmentLength = (1 * (Math.PI * 2)) / 360;

const zAxis = new Vector3(0, 0, 1);

import { DisposePipelinesMeshes } from '@oncyberio/engine/internal/utils/dispose.js'

export default class CircleSelector extends Group {

    constructor(r) {

        super()



        let material = new ShaderMaterial({

            uniforms:{
                localMatrix: { value: new Matrix4() },
                color: { 
                    value: new Color()
                },
                opacity: { value: 0.8 }
            },
            vertexShader: Vertex,
            fragmentShader: Fragment,
            side: 2,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            blending: 2

        })  
        


        this.angleMesh = new PipeLineMesh(new CircleGeometry(r, 360), material, {
            occlusionMaterial: new MeshBasicMaterial({ color: 0x000000, transparent: true }),
            visibleOnMirror: false
        })

        this._startAngle = 0;

        this._angleLength = 0;

        this.add(this.angleMesh)


        let material2 = new ShaderMaterial({

            uniforms:{
                localMatrix: { value: new Matrix4() },
                color: { 
                    value: new Color(),
                },
                opacity: { value: 0.2 }
            },
            vertexShader: Vertex,
            fragmentShader: Fragment,
            side: 2,
            depthTest: false,
            depthWrite: false,
            transparent: true,

        })  

        this.dummyMesh = new PipeLineMesh(new CircleGeometry(r, 360), material2, {
            occlusionMaterial: new MeshBasicMaterial({ color: 0x000000, transparent: true }),
            visibleOnMirror: false
        })

        this.add(this.dummyMesh)

        // this.material = material

    }

    set color( color ){

        this.dummyMesh.material.uniforms.color.value.set(color)
       

    }

    get color(){

        return this.dummyMesh.material.uniforms.color.value.set(color)

    }

    set altColor( color ){

        this.angleMesh.material.uniforms.color.value.set(color)
    }

    get altColor(){

        return  this.angleMesh.material.uniforms.color.value
    }

    updateMatrixWorld(force) {
        // console.log("helper", this.angleHelper.userData)

        const segmentCount = Math.floor(
            Math.abs(this._angleLength) / segmentLength
        );
        const sweepSign = this._angleLength < 0 ? -1 : 1;

        this.angleMesh.geometry.setDrawRange(0, segmentCount * 3);

        this.angleMesh.quaternion.setFromAxisAngle(zAxis, this._startAngle);
        this.angleMesh.scale.set(1, sweepSign, 1);

        this.dummyMesh.quaternion.copy( this.angleMesh.quaternion)
        this.dummyMesh.scale.copy(this.angleMesh.scale);
        
        this.angleMesh.material.uniforms.localMatrix.value.compose(new Vector3(0, 0, 0), this.dummyMesh.quaternion, this.dummyMesh.scale)

        this.dummyMesh.material.uniforms.localMatrix.value.copy(this.angleMesh.material.uniforms.localMatrix.value)

        super.updateMatrixWorld(force);

    }

    dispose(){

        DisposePipelinesMeshes(this.angleMesh)

        this.angleMesh.dispose()

        DisposePipelinesMeshes(this.dummyMesh)

        this.dummyMesh.dispose()

    }
}
