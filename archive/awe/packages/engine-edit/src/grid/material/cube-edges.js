import {

    ShaderMaterial

}from 'three'

import VertCube from './shaders/cube-edges.vert.ts'
import FragCube from './shaders/cube-edges.frag.ts'

export default class CubeEdgesMaterial extends ShaderMaterial {
  constructor() {
    
    const opts = {

        vertexShader : VertCube,
        fragmentShader : FragCube,
        uniforms: {
            thickness: {value: 1.5}
        },
        side: 2,
        extensions: {
            derivatives: true
        }

    }

    super( opts )
  }
}