import RotationArrowJson from './jsons/rotation.json'

import Abstract from './abstract'
import { Quaternion, Vector3 } from 'three'

export default class RotatorArrow extends Abstract {

    constructor(){

        super()

        this.tempPositon = new Vector3()
        this.tempScale = new Vector3()
        this.tempQuaternion = new Quaternion()

        this.object =   this.load(RotationArrowJson )
       
        this.add( this.object )

        // this.object.traverse( ( child ) => {

        //     if(child.geometry ) {

        //         child.onBeforeRender = ( renderer, scene, camera )=>{

        //             child.matrixWorld.decompose( this.tempPositon, this.tempQuaternion, this.tempScale )
        
        //             child.matrixWorld.compose( this.tempPositon, camera.quaternion, this.tempScale )
        //         }

        //     }
        // })

      
        
    }

    // set arrow color 
    setColor( color ){

        this.color = color 

        let i = 0

        console.log( this.object )

        // debugger;

        this.object.children[4].material.color.set( color )
        this.object.children[5].material.color.set( color )
    }

    setOpacity( opacity ){


        let i = 0
        while(i < this.object.children.length){
            this.object.children[i].material.opacity = opacity
            i++
        }
    }
    
}