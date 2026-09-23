// @ts-check


import {
    Group,
    Vector3,
    Quaternion,
    MeshBasicMaterial,
    BufferGeometry,
    BufferAttribute
} from "three"

import { DisposePipelinesMeshes } from '@oncyberio/engine/internal/utils/dispose.js'

import FontMeshFactory from "@oncyberio/engine/internal/font";
import PipeLineMesh from "@oncyberio/engine/internal/pipeline/pipeline-mesh"

export class ControlsLabel extends Group {


    constructor() {

        super()


        this.mesh = null

        this.tempPositon = new Vector3()

        this.tempScale = new Vector3()

        this.tempQuaternion = new Quaternion()

        const w = 0.135;	// width
        const h =  0.1;	// height
        const r =  w * 0.33;	// radius corner
        const s =  18;	// smoothness

        const geometry = this.RoundedRectangle( w, h, r, s );

        geometry.computeBoundingBox()

        let center = new Vector3()

        geometry.boundingBox.getCenter(center)

        geometry.translate(-center.x, -center.y, -center.z)

        this.background = new PipeLineMesh(geometry, new MeshBasicMaterial({color: 0xffffff,side: 2}), {occlusionMaterial: new MeshBasicMaterial({ color: 0x000000, transparent: true })})

        this.add(this.background)

        this.background.onBeforeRender = ( renderer, scene, camera ) => {

           this.background.matrixWorld.decompose( this.tempPositon, this.tempQuaternion, this.tempScale )

           this.background.matrixWorld.compose( this.tempPositon, camera.quaternion, this.tempScale )
        }

        this.scale.set(2.3,2.3,2.3)

        this.visible = false
    }

    async init(){

        this.font = await FontMeshFactory.get({
            text: 'YOLO',
            color: [0, 0, 0]
        });

        this.font.mesh.scale.set(0.09 * 1.2 , 0.09 * 1.2 , 0.09 * 1.2 )


        this.add(this.font.mesh)

        this.font.mesh.onBeforeRender = ( renderer, scene, camera ) => {

            this.font.mesh.matrixWorld.decompose( this.tempPositon, this.tempQuaternion, this.tempScale )

            this.font.mesh.matrixWorld.compose( this.tempPositon, camera.quaternion, this.tempScale )
        }

    }


    /**
     * @param { string } text
     */
    set(text) {


        this.font.update( {text: text} )

    }

    // updateMatrixWorld(force) {
        
    //     // this.sprite.material.map.needsUpdate = true

    //     // if(this.mesh?.geometry) {

    //     //     this.mesh.getWorldQuaternion(this.quaternion)

    //         // this.font.getWorldPosition(this.position)

    //         console.log( this.position )

    //     //     if(this.mesh.geometry.boundingBox == null) {

    //     //         this.mesh.geometry.computeBoundingBox()
    //     //     }

    //     //     // const bb = this.mesh.geometry.boundingBox

    //     //     // this.translateX(this.mesh.geometry.boundingBox.max.x - 0.6)
    //     // }

    //     super.updateMatrixWorld(force)
    // }


    attachTo(mesh) {

        this.mesh = mesh
    }

    dispose() {

        if( this.mesh ) {

            this.mesh.dispose()

            this.mesh = null
        }

        if(  this.font ) {

            this.font.dispose()

            this.font = null
        }

        if( this.background ) {

            DisposePipelinesMeshes(this.background)
        
            this.background.dispose()
        }

        this.parent?.remove(this)
    }

    RoundedRectangle( w, h, r, s ) { // width, height, radius corner, smoothness
		
        // helper const's
        const wi = w / 2 - r;		// inner width
        const hi = h / 2 - r;		// inner height
        const w2 = w / 2;			// half width
        const h2 = h / 2;			// half height
        const ul = r / w;			// u left
        const ur = ( w - r ) / w;	// u right
        const vl = r / h;			// v low
        const vh = ( h - r ) / h;	// v high	
        
        let positions = [
        
             wi, hi, 0, -wi, hi, 0, -wi, -hi, 0, wi, -hi, 0
             
        ];
        
        let uvs = [
            
            ur, vh, ul, vh, ul, vl, ur, vl
            
        ];
        
        let n = [
            
            3 * ( s + 1 ) + 3,  3 * ( s + 1 ) + 4,  s + 4,  s + 5,
            2 * ( s + 1 ) + 4,  2,  1,  2 * ( s + 1 ) + 3,
            3,  4 * ( s + 1 ) + 3,  4, 0
            
        ];
        
        let indices = [
            
            n[0], n[1], n[2],  n[0], n[2],  n[3],
            n[4], n[5], n[6],  n[4], n[6],  n[7],
            n[8], n[9], n[10], n[8], n[10], n[11]
            
        ];
        
        let phi, cos, sin, xc, yc, uc, vc, idx;
        
        for ( let i = 0; i < 4; i ++ ) {
        
            xc = i < 1 || i > 2 ? wi : -wi;
            yc = i < 2 ? hi : -hi;
            
            uc = i < 1 || i > 2 ? ur : ul;
            vc = i < 2 ? vh : vl;
                
            for ( let j = 0; j <= s; j ++ ) {
            
                phi = Math.PI / 2  *  ( i + j / s );
                cos = Math.cos( phi );
                sin = Math.sin( phi );
    
                positions.push( xc + r * cos, yc + r * sin, 0 );
    
                uvs.push( uc + ul * cos, vc + vl * sin );
                        
                if ( j < s ) {
                
                    idx =  ( s + 1 ) * i + j + 4;
                    indices.push( i, idx, idx + 1 );
                    
                }
                
            }
            
        }
            
        const geometry = new BufferGeometry( );
        geometry.setIndex( new BufferAttribute( new Uint32Array( indices ), 1 ) );
        geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( positions ), 3 ) );
        geometry.setAttribute( 'uv', new BufferAttribute( new Float32Array( uvs ), 2 ) );
        
        return geometry;	
        
    }
}
