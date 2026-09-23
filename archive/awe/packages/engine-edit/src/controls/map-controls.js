
// @ts-check

import { Box3, MOUSE, TOUCH, Vector3 } from 'three';
import { OrbitControls } from './orbit-controls'
import { CANVAS, IS_MOBILE }  from "@oncyberio/engine/internal/constants"
import { Camera } from "@oncyberio/engine/index"
import emitter from "@oncyberio/engine/internal/engine-emitter"
import Events from "../editor-events"


const TARGET = new Vector3(-10.502310085718126, 0.581587538499533,  0.7745837808404059)

// MapControls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - right mouse, or left mouse + ctrl/meta/shiftKey / touch: two-finger rotate
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - left mouse, or arrow keys / touch: one-finger move

const PseudoDomKeyTarget = {

    addEventListener: (type, cb)=>{

        emitter.on(type, cb)
    },

    removeEventListener: (type, cb)=> {

        emitter.off(type, cb)
    }
}

export class MapControls extends OrbitControls {

	constructor() {

		super( Camera.current, CANVAS );

        this.enabled = false

		this.screenSpacePanning = false; // pan orthogonal to world-space direction camera.up

		this.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.ROTATE, RIGHT: MOUSE.ROTATE };

		this.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };

        this.target.copy( TARGET )

		this.enableRotate = true

        this.fixedPanDistance = 30

        this.zoomSpeed = 2.2

        this.panSpeed = 10

        this.keyPanSpeed = 30

        this.vertKeyPanSpeed = 21

        this.name = "MapControls"

        this.targetRecalc = true

        this.targetRecalcDistance = 150

        this.enableDamping = true

        this.dampingFactor = 0.05


		this.update()

        

	}

    onUpdate = () => {

        this.update()
    }
    
    activate(){

        if (this.enabled) return

		this.enabled = true

        this.listenToKeyEvents(PseudoDomKeyTarget)

        emitter.on(Events.LATE_UPDATE, this.onUpdate)

		this.recalcTarget()

	}

	deactivate(){

		this.enabled = false

        emitter.off(Events.LATE_UPDATE, this.onUpdate)
	}

}
