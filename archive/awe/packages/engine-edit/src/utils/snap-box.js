// @ts-check

import Camera from "@oncyberio/engine/camera";

import { CANVAS } from "@oncyberio/engine/internal/constants";

import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";

import {
  Group,
  Raycaster,
  Vector3,
  Matrix3,
  Plane,
  Mesh,
  Object3D,
  Box3,
} from "three";

import { getCurrentSpace } from "@oncyberio/engine/internal";

// import { SpaceComponent } from "../abstract/spacecomponent";

const tmpDir = new Vector3();

export class SnapBox {
  constructor() {
    this.getCurrentSpace = getCurrentSpace;

    /** @type { Component3D } */
    this.currentObject = null;

    this.hitMeshes = [];

    this.mouseOffset = new Vector3();
  }

  is2D(object) {
    return (
      object.data.type === "image" ||
      object.data.type === "video" ||
      object.data.type === "text"
    );
  }

  /**
   *
   * @param {Component3D} object
   * @returns
   */
  setCurrentObject(object) {
    if (this.currentObject === object) return;

    this.currentObject = object;

    if (this.currentObject == null) {
      this.snap2D = false;

      this.hitMeshes = [];

      return;
    }

    this.snap2D = this.is2D(object);

    this.hitMeshes = [];

    this.getCurrentSpace().components.forEach((obj) => {
      //
      if (obj === object || obj.isDescendantOf(object) || this.is2D(obj))
        return;

      const mesh = obj.getCollisionMesh();

      if (mesh != null) {
        this.hitMeshes.push(mesh);
      }
    });
  }

  raycaster = new Raycaster();

  mousevec = { x: 0, y: 0 };

  hitNormal = new Vector3();

  getNDC(e) {
    const rect = CANVAS.getBoundingClientRect();

    this.mousevec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;

    this.mousevec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    return this.mousevec;
  }

  /**
   * @param { MouseEvent } e
   * @returns { import('three').Intersection & { spaceItem?: Component3D } }
   */
  hitTest(e) {
    const mousevec = this.getNDC(e);

    // @ts-ignore
    this.raycaster.setFromCamera(mousevec, Camera.current);

    this.raycaster.ray.direction.add(this.mouseOffset).normalize();

    let intersections = this.raycaster?.intersectObjects(this.hitMeshes, false);

    if (intersections.length) return intersections[0];

    return null;
  }

  tmpNormal = new Vector3();

  tmpMat3 = new Matrix3();

  tmpIntersect = new Vector3();

  _bbox = new Box3();

  _dragPlane = new Plane();

  /**
   * @param { MouseEvent } e
   */
  onMouseDown(e) {
    const mousevec = this.getNDC(e);

    // @ts-ignore
    this.raycaster.setFromCamera(mousevec, Camera.current);

    const dir1 = this.raycaster.ray.direction;

    const dir2 = tmpDir.copy(this.currentObject.position);

    dir2.y -= this.getGroundOffset();

    dir2.sub(this.raycaster.ray.origin).normalize();

    this.mouseOffset.subVectors(dir2, dir1);
  }

  // planHelper = new PlaneHelper(this._dragPlane, 100, 0xff0000)

  /**
   * @param { MouseEvent } e
   */
  onMouseMove(e) {
    this.lastDragX = e.clientX;

    this.lastDragY = e.clientY;

    let result = this.hitTest(e);

    if (result == null) {
      this._dragPlane.setFromNormalAndCoplanarPoint(
        this.currentObject.getWorldDirection(this.tmpNormal),
        this.currentObject.position
      );

      // test intersection of line from camera with the drag plane
      let hit = this.raycaster.ray.intersectPlane(
        this._dragPlane,
        this.tmpIntersect
      );

      if (hit == null) {
        //
        hit = this.tmpNormal
          .copy(this.raycaster.ray.direction)
          .setLength(10)
          .add(this.raycaster.ray.origin);
      }

      this.currentObject.position.copy(hit);

      return;
    }

    this.currentObject.position.copy(result.point);
    this.currentObject.position.y += result.point.y - this.getBBox().min.y;

    if (this.snap2D) {
      if (result.face?.normal) {
        this.tmpNormal
          .copy(result.face.normal)
          .applyNormalMatrix(
            this.tmpMat3.getNormalMatrix(result.object.matrixWorld)
          )
          .normalize();

        // console.log("snap2D", this.tmpNormal.clone(), result.point);

        this.currentObject.lookAt(
          this.tmpNormal.add(this.currentObject.position)
        );
      }

      this.currentObject.translateZ(0.01);
    }
  }

  getBBox() {
    return this.currentObject.getBBox(this._bbox);
  }

  getGroundOffset() {
    if (this.currentObject.data.type === "wave") return 0;

    const bbox = this.getBBox();

    return this.currentObject.position.y - bbox.min.y;
  }
}
