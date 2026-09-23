import Scene from "@oncyberio/engine/internal/scene";
import GridMesh, { GridMode } from "@oncyberio/engine/internal/grid/grid-mesh";
import emitter from "@oncyberio/engine/internal/engine-emitter";
import { EngineEvents } from "@oncyberio/engine/internal/engine-events";
import Events from "../editor-events";
import { ArrowHelper, BoxGeometry, PerspectiveCamera, Vector3 } from "three";
import { NavGridMode } from "../types";

import CubeMaterial from "./material/cube-edges";

import FontMeshFactory from "@oncyberio/engine/internal/font";

import Camera from "@oncyberio/engine/camera";

import {
    Scene as THREEScene,
    AxesHelper,
    Object3D,
    Raycaster,
    Vector2,
} from "three";

import Renderer from "@oncyberio/engine/internal/renderer";

import { REAL_VIEW } from "@oncyberio/engine/internal/constants";

import {
    OrthographicCamera,
    PlaneGeometry,
    MeshBasicMaterial,
    Mesh,
} from "three";

const tempObj = new Object3D();
const tempVec = new Vector3();

import Augmented from "@oncyberio/engine/internal/events/augmented";

const dist = -30;

export class Grid extends Augmented {
    //
    _mesh: GridMesh;

    lockFlipping: boolean = false;

    raycaster: Raycaster;

    // arrowHelper = new ArrowHelper();

    currentIntersection: any = null;

    private _mode: NavGridMode;

    private _postUIScene: THREEScene;

    private _pointer: Vector2 = new Vector2();

    private _postUICamera: PerspectiveCamera;

    private cube: Mesh;

    constructor() {
        //

        super();

        this._mesh = new GridMesh();

        this._mode = this._mesh.mode;

        Scene.add(this._mesh);

        this.enabled = false;

        this._postUIScene = new THREEScene();

        this._postUICamera = new PerspectiveCamera(10, 1, 0.1, 400);

        this._postUICamera.position.set(0, 0, dist);

        this._postUICamera.lookAt(0, 0, 0);

        this.buildPostUI();

        this.onPostUpdate(0);

        this.onResize(window.innerWidth, window.innerHeight);
    }

    buildPostUI() {
        this.raycaster = new Raycaster();

        let geometry = new BoxGeometry(1, 1, 1);

        let material = new CubeMaterial();

        // geometry.rotateX(-Math.PI/2)

        this.cube = new Mesh(geometry, material);

        // this.cube.scale.set(0.65, 0.65, 0.65 )

        this._postUIScene.add(this.cube);

        // this._postUIScene.add(this.arrowHelper);

        var fontScale = 0.45;

        const defaultOpts = {
            color: [1, 1, 1],
            font: "aeonik-bold",
            scale: { x: 1, y: 1, z: 1 },
            align: "center",
            verticalalign: "center",
            width: 500,
            instanced: false,
        };
        // back
        FontMeshFactory.get(
            Object.assign({}, defaultOpts, { text: "Back" })
        ).then((res: any) => {
            this.cube.add(res);
            res.scale.set(fontScale, fontScale, fontScale);
            res.position.set(0, 0, -0.51);
            res.rotation.y = Math.PI;
        });

        // front
        FontMeshFactory.get(
            Object.assign({}, defaultOpts, { text: "Front" })
        ).then((res: any) => {
            this.cube.add(res);
            res.scale.set(fontScale, fontScale, fontScale);
            res.position.set(0, 0, 0.51);
        });

        // left
        FontMeshFactory.get(
            Object.assign({}, defaultOpts, { text: "Left" })
        ).then((res: any) => {
            this.cube.add(res);
            res.scale.set(fontScale, fontScale, fontScale);
            res.position.set(0.51, 0, 0);
            res.rotation.y = Math.PI / 2;
        });

        // right
        FontMeshFactory.get(
            Object.assign({}, defaultOpts, { text: "Right" })
        ).then((res: any) => {
            this.cube.add(res);
            res.scale.set(fontScale, fontScale, fontScale);
            res.position.set(-0.51, 0, 0);
            res.rotation.y = -Math.PI / 2;
        });

        // top
        FontMeshFactory.get(
            Object.assign({}, defaultOpts, { text: "Top" })
        ).then((res: any) => {
            this.cube.add(res);
            res.scale.set(fontScale, fontScale, fontScale);
            res.position.set(0, 0.51, 0);
            res.rotation.x = -Math.PI / 2;
        });

        // bottom
        FontMeshFactory.get(
            Object.assign({}, defaultOpts, { text: "Bottom" })
        ).then((res: any) => {
            this.cube.add(res);
            res.scale.set(fontScale, fontScale, fontScale);
            res.position.set(0, -0.51, 0);
            res.rotation.x = Math.PI / 2;
        });

        this.onResize(window.innerWidth, window.innerHeight);

        // const axesHelper = new AxesHelper( 2 );
        // axesHelper.position.set(-0.6,-0.6,-0.6)
        // cube.add( axesHelper )
    }

    private _enabled = false;

    get enabled() {
        return this._enabled;
    }

    set enabled(val) {
        //
        const changed = val !== this._enabled;

        this._enabled = val;

        this._mesh.visible = val;

        if (!changed) return;

        if (val) {
            this.addEvents();
        } else {
            this.removeEvents();
        }
    }

    getMode() {
        return this._mode;
    }

    setMode(val: NavGridMode, target?: Vector3) {
        //
        if (val === this._mode || this.lockFlipping == false) return;

        this._mode = val;

        val = val.replace("-", "") as GridMode;

        this._mesh.setMode(val, target);
    }

    onCameraMove = () => {
        //
        this.setMode("XZ");
    };

    checkIntersection() {
        this.currentIntersection = null;

        this.raycaster.setFromCamera(this._pointer, this._postUICamera);

        // this.arrowHelper.setDirection(this.raycaster.ray.direction);
        // this.arrowHelper.position.copy(this.raycaster.ray.origin);
        // this.arrowHelper.setLength(300);

        const intersects = this.raycaster.intersectObject(this.cube, false);

        console.log("intersects", intersects);

        if (intersects.length > 0) {
            const intersect = intersects[0];

            const normal = intersect.normal || intersect.face.normal;

            if (normal.x == 0 && normal.y == 0 && normal.z == 1) {
                this.currentIntersection = "Z";
            }

            if (normal.x == 0 && normal.y == 0 && normal.z == -1) {
                this.currentIntersection = "-Z";
            }

            if (normal.x == 1 && normal.y == 0 && normal.z == 0) {
                this.currentIntersection = "X";
            }

            if (normal.x == -1 && normal.y == 0 && normal.z == 0) {
                this.currentIntersection = "-X";
            }

            if (normal.x == 0 && normal.y == 1 && normal.z == 0) {
                this.currentIntersection = "Y";
            }

            if (normal.x == 0 && normal.y == -1 && normal.z == 0) {
                this.currentIntersection = "-Y";
            }
        }

        if (this.currentIntersection != null) {
            this.emit("gridmodechange", this.currentIntersection);
        }
        // console.log( this.currentIntersection )
    }

    onPostUpdate = (delta) => {
        Camera.current.getWorldDirection(tempVec);

        tempVec.multiplyScalar(dist);

        this._postUICamera.position.copy(tempVec);
        this._postUICamera.lookAt(0, 0, 0);
        // console.log( tempVec )

        let autoClear = Renderer.autoClear;

        Renderer.autoClear = false;

        Renderer.clearDepth();

        Renderer.render(this._postUIScene, this._postUICamera);

        Renderer.autoClear = autoClear;
    };

    onMouseMove = (e) => {
        // this._pointer.x =
        // (e.rawEvent.clientX / REAL_VIEW.w) * 2 - 1;
        // this._pointer.y =
        //     -(e.rawEvent.clientY / REAL_VIEW.h) * 2 + 1;
        // this.checkIntersection()
    };

    onMouseDown = (e) => {
        const rect = Renderer.domElement.getBoundingClientRect();
        const x = e.rawEvent.clientX - rect.left;
        const y = e.rawEvent.clientY - rect.top;

        this._pointer.x = (x / rect.width) * 2 - 1;
        this._pointer.y = -(y / rect.height) * 2 + 1;

        this.checkIntersection();
    };

    onResize = (w, h) => {
        this._postUICamera.aspect = w / h;
        this._postUICamera.updateProjectionMatrix();

        this.setScreenSizedHeight(h, 60);

        const ww = -w * 0.5 + 130;

        const hh = h * 0.5 - 65;

        this._postUICamera.setViewOffset(w, h, ww, hh, w, h);
    };

    setScreenSizedHeight(h, desiredHeight = 100) {
        const vFOV = (this._postUICamera.fov * Math.PI) / 180; // Convert vertical fov to radians
        const height =
            2 *
            Math.tan(vFOV / 2) *
            this._postUICamera.position.distanceTo(this.cube.position);
        const worldHeight = h;
        const scale = (desiredHeight / worldHeight) * height;

        this.cube.scale.set(scale, scale, scale);
    }

    addEvents() {
        //
        emitter.on(Events.CAMERA_CONTROL, this.onCameraMove);

        emitter.on(Events.POST_RENDER, this.onPostUpdate);
        emitter.on(Events.RESIZE, this.onResize);

        emitter.on(EngineEvents.MOUSE_MOVE, this.onMouseMove);
        emitter.on(EngineEvents.MOUSE_DOWN, this.onMouseDown);
    }

    removeEvents() {
        //
        emitter.off(Events.CAMERA_CONTROL, this.onCameraMove);

        emitter.off(Events.POST_RENDER, this.onPostUpdate);
        emitter.off(Events.RESIZE, this.onResize);

        emitter.off(EngineEvents.MOUSE_MOVE, this.onMouseMove);
        emitter.off(EngineEvents.MOUSE_DOWN, this.onMouseDown);
    }

    dispose() {
        //
        this.removeEvents();

        Scene.remove(this._mesh);

        this._mesh.dispose();

        this._mesh = null;

        this.cube.traverse((child) => {
            // Handle objects with custom dispose method (e.g., font meshes)
            const disposable = child as { dispose?: () => void };
            if (typeof disposable.dispose === 'function') {
                disposable.dispose();
            }

            // Dispose geometry and materials for Mesh objects
            if (child instanceof Mesh) {
                const material = child.material;
                if (Array.isArray(material)) {
                    material.forEach(m => m.dispose());
                } else {
                    material.dispose();
                }
                child.geometry.dispose();
            }
        });

        // Dispose cube's material and geometry
        const material = this.cube.material;
        if (Array.isArray(material)) {
            material.forEach(m => m.dispose());
        } else {
            material.dispose();
        }
        this.cube.geometry.dispose();

        this.cube = null;
    }
}
