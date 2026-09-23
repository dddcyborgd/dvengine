import {

    Group,

    ObjectLoader,

    MeshBasicMaterial,

    Box3,

    Vector3,

    Vector2,

    ExtrudeGeometry,

    BoxGeometry,

    Mesh,

    Quaternion

} from 'three'

import PipeLineMesh from '@oncyberio/engine/internal/pipeline/pipeline-lines'

const tempBox = new Box3()

const center = new Vector3()

var loader = new ObjectLoader()

const tempVec = new Vector3()

import {

    REAL_VIEW

} from '@oncyberio/engine/internal/constants'



export default class Handles extends Group {
    constructor( onBeforeRender = null  ){

        super()

        this.onBeforeRenderFunc = onBeforeRender

        this.tempPositon = new Vector3()
        this.tempScale = new Vector3()
        this.tempQuaternion = new Quaternion()

    }

    load( json, opts = { extrude: false }){

        var res = null;

        loader.parse( json, ( obj ) => {

            this.updgradeUI( obj, opts )

            obj.scale.set( 0.015, 0.015, 0.015 )

            res = obj
        })

        return res
    }

    updgradeUI( obj, opts  ){

        let toReplace = []

        let toAdd = []

        const extrudeSettings = {
            steps: 1,
            depth: 2,
            bevelEnabled: false,
            bevelThickness: 0,
            bevelSize: 0,
            bevelOffset: 0,
            bevelSegments: 0
        };
        
        let depth = 2 

        obj.children.forEach((child) => {
            if(child.geometry){

                if( opts.extrude ) {

                    const shape = child.geometry.parameters.shapes[0]

                    extrudeSettings.depth = depth
    
                    depth += 2

                    child.geometry = new ExtrudeGeometry( shape, extrudeSettings );
                }

                child.geometry.applyMatrix4(child.matrixWorld)

                child.geometry.computeBoundingBox()

                tempBox.setFromObject( child ).getCenter(center)
                child.geometry.translate(0, 0, -center.z);

            }
        })


        tempBox.setFromObject( obj ).getCenter(center)

        obj.children.forEach((child) => {
            if(child.geometry){
                child.geometry.translate(-center.x, -center.y, -center.z);
            }
          })

        var id = 0

        obj.children.forEach( child => {
            
            child.geometry.scale(1,-1,1)

            child.material.side = 2


            child.material.depthWrite = true
            child.material.depthTest  = true
            child.material.transparent = true


            if( opts.extrude  != true ){

                child.material.depthWrite = false
                child.material.depthTest  = true
            }

           
       
            let newMesh = new PipeLineMesh( 
                child.geometry, 
                child.material, 
                { 
                    occlusionMaterial : new MeshBasicMaterial({ color: 0x000000 }),
                    visibleOnMirror: false
                }
            )

            newMesh.name = child.name 

            if( opts.extrude != true ) {

                newMesh.renderOrder = child.renderOrder

            }

            if( opts.extrude ) {

                newMesh.renderOrder = 10000000
            }

            else {

                // this.matrixAutoUpdate = false

                // this.matrixWorldAutoUpdate = false

                // this.matrixAutoUpdate = false 

                // this.matrixWorldAutoUpdate = false 

                // newMesh.matrixWorldAutoUpdate = false

                // newMesh.matrixAutoUpdate = false

                // this.updateMatrixWorld = function( force ) {
                //     if ( this.matrixAutoUpdate ) this.updateMatrix();
                //     if ( this.matrixWorldNeedsUpdate || force ) {
                //         this.matrixWorld.copy( this.matrix );
                //         this.matrixWorldNeedsUpdate = false;
                //         force = true;
                //     }
                // }

                newMesh.onBeforeRender = ( renderer, scene, camera ) => {

                    newMesh.matrixWorld.decompose( this.tempPositon, this.tempQuaternion, this.tempScale )

                    newMesh.matrixWorld.compose( this.tempPositon, camera.quaternion, this.tempScale )
                }
            }

            toAdd.push( newMesh )

            toReplace.push( child )

        })

        toReplace.forEach( child => {

            obj.remove( child )
        })

        toAdd.forEach( child => {

            obj.add( child )
        })
    }

    get2DPosition( camera, position, additional = null, debug = false ){

        tempVec.copy(position)

        if( additional != null ){
            tempVec.add( additional )
        }

        tempVec.project( camera );

        const v = new Vector2()


        v.x = ( (   tempVec.x + 1 ) * REAL_VIEW.w  / 2 );
        v.y = ( ( - tempVec.y + 1 ) * REAL_VIEW.h / 2  );

        return v
    }

    generateBox(){

        this.box = new Box3()

        this.box.setFromObject( this.object )

        const size   =  this.box.getSize(new Vector3());
        const center =  this.box.getCenter(new Vector3());

        const max = Math.max(size.x, size.y, size.z)

        const boxGeometry = new BoxGeometry(max, max, max );
        
        this.collisionBox = new Mesh( boxGeometry, new MeshBasicMaterial( { color: 0x00ff00, transparent: true  } ) );

        this.collisionBox.position.set(center.x, center.y, center.z)

        this.add( this.collisionBox )

        this.collisionBox.visible = true

        return this.collisionBox
    }

    getCollisionBox(){
            
        return this.collisionBox
    }
}