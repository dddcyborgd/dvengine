import ArrowJson from './jsons/arrow.json'

import Abstract from './abstract'

import { Vector3 } from 'three'


// import VisualLine from './visualline'

const debug = true

// import { MODES, COLORS } from './constants'

export default class Arrow extends Abstract {

    constructor(){

        super()

        this.object =   this.load(ArrowJson, { extrude : true })

        // this.generateBox( this.onRaycast.bind(this) )

       
        this.add( this.object )

        // this.mode = mode

        // this.color = COLORS.X

        // if( this.mode == MODES.X ){

        //     this.setColor( COLORS.X )

        //     // this.rotation.set( 0, 0, -Math.PI * 0.5 )
            
        //     // this..set( 10, 0, 0 )
        // }

        // if( this.mode == MODES.Y ){
        //     this.setColor( COLORS.Y )
        //     // this.orientationVec.set( 0, 10, 0 )
        // }

        // if( this.mode == MODES.Z ){
        //     this.setColor( COLORS.Z )

        //     // this.rotation.set( Math.PI * 0.5, Math.PI * 0.5, 0 )
        //     // this.orientationVec.set( 0, 0, 10 )
        // }

        // this.visualLine  = new VisualLine( this.mode, 5 )

        // this.add(this.visualLine )

        // this.visualLine.visible = false 

        // if( debug && this.mode == MODES.X ){

        //     this.originDom = document.createElement('div')
        //     this.originDom.style.position = 'absolute'
        //     this.originDom.style.backgroundColor = 'red'
        //     this.originDom.style.zIndex = 10000000
        //     this.originDom.style.width = "10px"
        //     this.originDom.style.height = "10px"

        //     document.body.appendChild( this.originDom ) 


        //     this.targetDom = document.createElement('div')
        //     this.targetDom.style.position = 'absolute'
        //     this.targetDom.style.backgroundColor = 'green'
        //     this.targetDom.style.zIndex = 10000000
        //     this.targetDom.style.width = "10px"
        //     this.targetDom.style.height = "10px"

        //     document.body.appendChild( this.targetDom )
        // }
        
    }

    setOrientation( renderer, scene, camera, scope ){

        const origin =  this.get2DPosition( camera, this.position )

        const axes   = this.get2DPosition( camera,  this.position , this.orientationVec, this.mode == 2  )


        if( debug && this.mode == MODES.X ) {

            this.originDom.style.left = origin.x + 'px'
            this.originDom.style.top = origin.y + 'px'

            this.targetDom.style.left = axes.x + 'px'
            this.targetDom.style.top = axes.y + 'px'
        }
      

        var angle = this.angleBetweenVectors(origin, axes)

        scope.rotation.z = angle
    }
    

    angleBetweenVectors(v1, v2) {
        // Calculate the angle between the vectors
        let angle = -Math.atan2(v1.y - v2.y, v1.x - v2.x);
      
        // Adjust angle to be in the range [0, 2π] if it's negative
        if (angle < 0) {
          angle += 2 * Math.PI;
        }
      
        return angle;
      }
    // set arrow color 
    setColor( color ){

        this.color = color 

        let i = 0


        this.object.children[2].material.color.set( color )
    }

    setOpacity( opacity ){

        let i = 0
        while(i < this.object.children.length){
            this.object.children[i].material.opacity = opacity
            i++
        }
    }

    onRaycast( val ){

        // this.visualLine.visible = val
    }
   
}