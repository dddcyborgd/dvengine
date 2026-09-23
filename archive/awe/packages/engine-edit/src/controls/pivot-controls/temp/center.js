import {

    Group,

} from 'three'

import CenterJson from './jsons/center.json'

import Abstract from './abstract'


export default class Center extends Abstract {

    constructor(){

        super()

        this.object = this.load(CenterJson)

        this.add( this.object )

        // this.raycastMesh = this.generateBox()

        // this.raycastMesh.name = 'center collision'
    }
}