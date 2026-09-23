import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import PipeLineMesh from "@oncyberio/engine/internal/pipeline/pipeline-mesh";
import PipeLineLines from "@oncyberio/engine/internal/pipeline/pipeline-lines";
import { LineMaterial2 } from "@oncyberio/engine/internal/utils/lines/line-material-2";
import { LineSegmentsGeometry } from "@oncyberio/engine/internal/utils/lines/line-segments-geometry";
import {
  Box3,
  BoxGeometry,
  BufferGeometry,
  DoubleSide,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { getCurrentSpace } from "@oncyberio/engine/internal";
import { getOrCreateEditor } from "../../editors/editor-registry";

const lineWidth = 4;

type MagnetName =
  | "centerX"
  | "centerY"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "space1"
  | "space2";

export interface Snap2DOpts {
  dir: Vector3;
  mode?: "scale" | "translate";
}

const _localCenter = new Vector3();
const _magnetCenter = new Vector3();
const vPos1 = new Vector3();
const vPos2 = new Vector3();
const vOffset = new Vector3();
const vScale = new Vector3();

function getMesh(object: Component3D) {
  return getOrCreateEditor(object)?.getSelectionMesh?.();
}

// TODO: provides a more flexible heuristic to select compatible objects
// Right now we rely on the fact that all objects has the same Euler order
// We select only exhibits that look in the same direction
function canAlign(e1: Object3D, e2: Object3D) {
  let r1 = e1.rotation;
  let r2 = e2.rotation;
  return (
    r1.order === r2.order &&
    Math.abs(r1.x - r2.x) < 0.01 &&
    Math.abs(r1.y - r2.y) < 0.01 &&
    Math.abs(r1.z - r2.z) < 0.01
  );
}

type UIHints = Record<MagnetName, LineHint>;

// Used for typed for..in iterations
// see https://stackoverflow.com/questions/59656190/define-key-type-for-object-in-for-in

interface MagnetData {
  // magnet object that we're snapping to
  object: Component3D;
  // box in local space of the magnet object
  boxInLocal: Box3;
  // box in world space of the magnet object
  boxInWorld: Box3;
  // box in local space of the target object
  boxInTargetLocal: Box3;
  //
  debugMesh: Mesh<BoxGeometry, MeshBasicMaterial>;
}

class LineHint extends PipeLineLines {
  private points: [Vector3, Vector3];

  constructor(
    public start: Vector3,
    public end: Vector3,
    material: LineMaterial2,
    renderOrder: number
  ) {
    // debugger;
    super(new LineSegmentsGeometry(), material, {
      visibleOnOcclusion: false,
      visibleOnMirror: false,
    });
    this.start = start.clone();
    this.end = end.clone();
    this.points = [this.start, this.end];
    this.frustumCulled = false;
    this.renderOrder = renderOrder;
    this.update();
  }

  update() {
    this.geometry.setPositions([
      this.points[0].x,
      this.points[0].y,
      this.points[0].z,
      this.points[1].x,
      this.points[1].y,
      this.points[1].z,
    ]);
    this.geometry.attributes.position.needsUpdate = true;
  }

  static createLineMaterial(color: number) {
    //
    let material = new LineMaterial2({
      color,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      fog: false,
      toneMapped: false,
      linewidth: lineWidth * 0.5,
    });

    return material;
  }

  static createHintLines() {
    const renderOrder = 10_000_000;

    let start = new Vector3(0, 0, 0);
    let end = new Vector3(1, 0, 0);

    let centerY = new LineHint(
      start,
      end,
      this.createLineMaterial(0xff0000),
      renderOrder
    );
    let top = new LineHint(
      start,
      end,
      this.createLineMaterial(0xff0000),
      renderOrder
    );
    let bottom = new LineHint(
      start,
      end,
      this.createLineMaterial(0xff0000),
      renderOrder
    );

    let centerX = new LineHint(
      start,
      end,
      this.createLineMaterial(0x00ff00),
      renderOrder
    );
    let left = new LineHint(
      start,
      end,
      this.createLineMaterial(0x00ff00),
      renderOrder
    );
    let right = new LineHint(
      start,
      end,
      this.createLineMaterial(0x00ff00),
      renderOrder
    );

    let space1 = new LineHint(
      start,
      end,
      this.createLineMaterial(0xffa500),
      renderOrder + 1
    );
    let space2 = new LineHint(
      start,
      end,
      this.createLineMaterial(0xffa500),
      renderOrder + 1
    );

    let lines = {
      centerX,
      centerY,
      top,
      bottom,
      left,
      right,
      space1,
      space2,
    };
    return lines;
  }
}

export class Snap2D extends Object3D {
  //
  private object: Component3D;
  private magnets: Array<MagnetData> = [];
  private maxGap: number;

  private uiHints: UIHints;

  private plane: PipeLineMesh;
  private magnetSelectBox: Box3 = new Box3();

  private _targetmatWorld = new Matrix4();
  private _targetmatWorldInverse = new Matrix4();
  private _targetWorldScale = new Vector3();
  private _targetWorldQueternion = new Quaternion();

  constructor(params?: { depth?: number }) {
    //
    super();

    let depth = params?.depth || 0.04;
    this.maxGap = depth * 2;

    this.plane = new PipeLineMesh(
      new BoxGeometry(100000, 100000, depth * 10),
      new MeshBasicMaterial({
        color: 0xffff00,
        side: DoubleSide,
        transparent: true,
        opacity: 0.3,
        toneMapped: false,
      }),
      {
        visibleOnOcclusion: false,
        visibleOnMirror: false,
      }
    );

    this.plane.visible = false;
    this.add(this.plane);
    this.updateMagnetSelectBox();

    this.uiHints = LineHint.createHintLines();
    Object.keys(this.uiHints).forEach((key) => {
      let ui = this.uiHints[key];
      ui.visible = false;
      this.add(ui);
    });
  }

  updateMagnetSelectBox() {
    if (this.plane.geometry.boundingBox == null) {
      this.plane.geometry.computeBoundingBox();
    }
    this.magnetSelectBox.copy(this.plane.geometry.boundingBox);
    this.magnetSelectBox.applyMatrix4(this.plane.matrixWorld);
  }

  updatePlane() {
    this.plane.position.copy(this.object.position);
    this.plane.quaternion.copy(this.object.quaternion);
    this.plane.updateMatrixWorld();
    this.updateMagnetSelectBox();
  }

  canSnapTo(component: Component3D) {
    return component.info.is2D;
  }

  //
  bbCache = new WeakMap<Component3D, MagnetData>();

  getMagnetData(it: Component3D) {
    //
    let magnet = this.bbCache.get(it);

    if (magnet == null) {
      magnet = {
        object: it,
        boxInLocal: new Box3(),
        boxInWorld: new Box3(),
        boxInTargetLocal: new Box3(),
        debugMesh: new Mesh(
          new BoxGeometry(1, 1, 1),
          new MeshBasicMaterial({ wireframe: true })
        ),
      };
      this.bbCache.set(it, magnet);
    }

    const mesh = getMesh(it);
    const geo = mesh.geometry as BufferGeometry;
    if (geo.boundingBox == null) {
      geo.computeBoundingBox();
    }
    magnet.boxInLocal.copy(geo.boundingBox);
    magnet.boxInWorld.copy(magnet.boxInLocal).applyMatrix4(mesh.matrixWorld);
    // this.add(magnet.debugMesh);
    return magnet;
  }

  getAdjacentArtworks() {
    this.updatePlane();
    this.magnets = [];
    getCurrentSpace()?.components.forEach((it) => {
      if (
        it === this.object ||
        !this.canSnapTo(it) ||
        // !it.isVisibleToCamera ||
        !canAlign(this.object, it)
      )
        return;

      if (this.magnetSelectBox.containsPoint(it.position)) {
        let magnet = this.getMagnetData(it);
        this.magnets.push(magnet);
        magnet.boxInWorld.getCenter(magnet.debugMesh.position);
        magnet.boxInWorld.getSize(magnet.debugMesh.scale);
      }
    });
  }

  updateLineHint(
    ui: LineHint,
    xStart: number,
    xEnd: number,
    yStart: number,
    yEnd: number,
    z: number
  ) {
    ui.start.set(xStart, yStart, z).applyMatrix4(this._targetmatWorld);
    ui.end.set(xEnd, yEnd, z).applyMatrix4(this._targetmatWorld);
    ui.update();
    ui.visible = true;
  }

  setObject(object) {
    //
    this.object = null;
    this.clearHints();

    if (object?.info.is2D) {
      this.object = object;
    }
  }

  _runs = [];

  onPointerDown(opts: Snap2DOpts) {
    if (this.object == null) return;
    this._runs = [];
    this.getAdjacentArtworks();

    console.log("onPointerDown", opts);
  }

  onPointerMove(opts: Snap2DOpts) {
    //
    if (this.object == null) return;

    this.clearHints();

    this.snap(opts);
    this.object.syncWithTransform();
  }

  onPointerUp(opts: Snap2DOpts) {
    if (this.object == null) return;
    // this.snapTranslate(opts);
    // this.object.syncWithTransform();
    this.clearHints();
  }

  clearHints() {
    Object.values(this.uiHints).forEach((ui) => {
      ui.visible = false;
    });
  }

  _offset = new Vector3();

  snap(opts: Snap2DOpts) {
    //
    const mesh = getMesh(this.object);
    this.object.updateMatrixWorld(false);
    mesh.updateWorldMatrix(true, false);

    this._targetmatWorld.copy(mesh.matrixWorld);
    const matInv = this._targetmatWorldInverse.copy(mesh.matrixWorld).invert();

    const worldScale = mesh.getWorldScale(this._targetWorldScale);
    const worldQueternion = mesh.getWorldQuaternion(
      this._targetWorldQueternion
    );

    if (mesh.geometry.boundingBox == null) {
      mesh.geometry.computeBoundingBox();
    }

    const maxGapYLocal = this.maxGap / worldScale.y;
    const maxGapXLocal = this.maxGap / worldScale.x;

    const localBBox = mesh.geometry.boundingBox;
    const curMin = localBBox.min;
    const curMax = localBBox.max;
    let curCenter = localBBox.getCenter(_localCenter);

    let minCurY = curMin.y;
    let maxCurY = curMax.y;
    let centerCurY = curCenter.y;

    let minCurX = curMin.x;
    let maxCurX = curMax.x;
    let centerCurX = curCenter.x;

    const offset = this._offset.set(0, 0, 0);

    // Get the magnet bbox in local space of the target object
    this.magnets.forEach((m) => {
      m.boxInTargetLocal.copy(m.boxInWorld).applyMatrix4(matInv);
    });

    // Sort by x-proximity
    this.magnets.sort((m1, m2) => {
      let d1 = Math.abs(
        (m1.boxInTargetLocal.max.x + m1.boxInTargetLocal.min.x) / 2
      );
      let d2 = Math.abs(
        (m2.boxInTargetLocal.max.x + m2.boxInTargetLocal.min.x) / 2
      );
      return d1 - d2;
    });

    const isTranslate = opts.mode === "translate";
    const isScale = opts.mode === "scale";
    const snapCenter = isTranslate;
    const snapBottom = isTranslate || (isScale && opts.dir.y < 0);
    const snapTop = isTranslate || (isScale && opts.dir.y > 0);
    const snapLeft = isTranslate || (isScale && opts.dir.x < 0);
    const snapRight = isTranslate || (isScale && opts.dir.x > 0);

    //#region Snap on Y-axis
    let ui: LineHint;
    for (let i = 0; i < this.magnets.length && ui == null; i++) {
      //
      let magnet = this.magnets[i];

      const magnetMin = magnet.boxInTargetLocal.min;
      const magnetMax = magnet.boxInTargetLocal.max;
      const magnetCenter = magnet.boxInTargetLocal.getCenter(_magnetCenter);

      let magnetMinY = magnetMin.y;
      let magnetMaxY = magnetMax.y;
      let magnetCenterY = magnetCenter.y;

      let magnetMinX = magnetMin.x;
      let magnetMaxX = magnetMax.x;
      let magnetCenterX = magnetCenter.x;

      const leftMostMagnetX = Math.min(curMin.x, magnetMin.x);
      const rightMostMagnetX = Math.max(curMax.x, magnetMax.x);
      const topMostMagnetY = Math.min(curMin.y, magnetMin.y);
      const bottomMostMagnetY = Math.max(curMax.y, magnetMax.y);
      const zUi = curMax.z;

      let centerGapY = magnetCenterY - centerCurY;
      let bottomGap = magnetMinY - minCurY;
      let topGap = magnetMaxY - maxCurY;

      let centerGapX = magnetCenterX - centerCurX;
      let leftGapX = magnetMinX - minCurX;
      let rightGapX = magnetMaxX - maxCurX;

      if (opts.dir.y != 0) {
        //
        if (isTranslate && Math.abs(centerGapY) < maxGapYLocal) {
          //
          offset.y = centerGapY;

          this.updateLineHint(
            this.uiHints.centerY,
            magnetCenter.x,
            curCenter.x,
            magnetCenterY,
            magnetCenterY,
            zUi
          );

          //
        } else if (snapBottom && Math.abs(bottomGap) < maxGapYLocal) {
          //
          this.updateLineHint(
            this.uiHints.bottom,
            leftMostMagnetX,
            rightMostMagnetX,
            magnetMin.y,
            magnetMin.y,
            zUi
          );

          offset.y = bottomGap;
          //
        } else if (snapTop && Math.abs(topGap) < maxGapYLocal) {
          //
          this.updateLineHint(
            this.uiHints.top,
            leftMostMagnetX,
            rightMostMagnetX,
            magnetMax.y,
            magnetMax.y,
            zUi
          );

          offset.y = topGap;
        }
      }

      if (opts.dir.x != 0) {
        if (isTranslate && Math.abs(centerGapX) < maxGapXLocal) {
          //
          offset.x = centerGapX;

          this.updateLineHint(
            this.uiHints.centerX,
            magnetCenterX,
            magnetCenterX,
            magnetCenter.y,
            curCenter.y,
            zUi
          );
        } else if (snapLeft && Math.abs(leftGapX) < maxGapXLocal) {
          //
          this.updateLineHint(
            this.uiHints.left,
            magnetMin.x,
            magnetMin.x,
            topMostMagnetY,
            bottomMostMagnetY,
            zUi
          );

          offset.x = leftGapX;
          //
        } else if (snapRight && Math.abs(rightGapX) < maxGapXLocal) {
          //
          this.updateLineHint(
            this.uiHints.right,
            magnetMax.x,
            magnetMax.x,
            topMostMagnetY,
            bottomMostMagnetY,
            zUi
          );

          offset.x = rightGapX;
        }
      }

      if (offset.x != 0 || offset.y != 0) {
        break;
      }
    }
    //#endregion

    //#region  Snap spacing
    if (isTranslate && offset.x == 0) {
      //
      // split adjacent artworks into left and right ones
      let leftMagnets: MagnetData[] = [],
        rightMagnets: MagnetData[] = [];
      this.magnets.forEach((m) => {
        //
        if (!(m.boxInTargetLocal.min.y < 0 && m.boxInTargetLocal.max.y > 0))
          return;
        if (m.boxInTargetLocal.min.x > localBBox.max.x) {
          rightMagnets.push(m);
        } else if (m.boxInTargetLocal.max.x < localBBox.min.x) {
          leftMagnets.push(m);
        }
      });
      const y = offset.y;
      let snapped = false;
      // case 1: object is in between the 2 adjacent artworks
      if (leftMagnets.length > 0 && rightMagnets.length > 0) {
        //
        let left = leftMagnets[0];
        let right = rightMagnets[0];

        let snap =
          (left.boxInTargetLocal.max.x + right.boxInTargetLocal.min.x) / 2;

        if (Math.abs(snap) < maxGapXLocal) {
          //
          snapped = true;

          offset.x = snap;

          this.updateLineHint(
            this.uiHints.space1,
            left.boxInTargetLocal.max.x,
            curMin.x + snap,
            y,
            y,
            0
          );
          this.updateLineHint(
            this.uiHints.space2,
            curMax.x + snap,
            right.boxInTargetLocal.min.x,
            y,
            y,
            0
          );
        }
      }

      // case 2: object is on the right of the 2 adjacent artworks
      if (!snapped && leftMagnets.length > 1) {
        let left = leftMagnets[1];
        let right = leftMagnets[0];

        let refDistanceX =
          right.boxInTargetLocal.min.x - left.boxInTargetLocal.max.x;
        let curDistanceX = localBBox.min.x - right.boxInTargetLocal.max.x;
        let snap = refDistanceX - curDistanceX;
        if (
          refDistanceX >= 0 &&
          curDistanceX >= 0 &&
          Math.abs(snap) < this.maxGap
        ) {
          snapped = true;
          offset.x = snap;
          // this.object.position.add(tmpVec1);
          // show hints
          this.updateLineHint(
            this.uiHints.space2,
            curMin.x + snap,
            right.boxInTargetLocal.max.x,
            y,
            y,
            0
          );
          this.updateLineHint(
            this.uiHints.space1,
            right.boxInTargetLocal.min.x,
            left.boxInTargetLocal.max.x,
            y,
            y,
            0
          );
        }
      }

      // case 3: object is on the left of the 2 adjacent artworks
      if (!snapped && rightMagnets.length > 1) {
        let left = rightMagnets[0];
        let right = rightMagnets[1];
        let refDistanceX =
          right.boxInTargetLocal.min.x - left.boxInTargetLocal.max.x;
        let curDistanceX = left.boxInTargetLocal.min.x - curMax.x;
        let snap = curDistanceX - refDistanceX;
        if (
          refDistanceX >= 0 &&
          curDistanceX >= 0 &&
          Math.abs(snap) < this.maxGap
        ) {
          snapped = true;
          offset.x = snap;
          // this.object.position.add(tmpVec1);
          // show hints
          this.updateLineHint(
            this.uiHints.space2,
            curMax.x + snap,
            left.boxInTargetLocal.min.x,
            y,
            y,
            0
          );
          this.updateLineHint(
            this.uiHints.space1,
            left.boxInTargetLocal.max.x,
            right.boxInTargetLocal.min.x,
            y,
            y,
            0
          );
        }
      }
    }
    //#endregion

    if (isTranslate) {
      //
      offset.multiply(worldScale).applyQuaternion(worldQueternion);

      this.object.position.add(offset);
      //
    } else if (isScale) {
      //
      if (opts.dir.y !== 0 && offset.y !== 0) {
        //

        const dy = offset.y;
        const ds = 1 + dy / (opts.dir.y < 0 ? curMin.y : curMax.y);
        const scale = this.object.scale;
        this.object.scale.set(scale.x * ds, scale.y * ds, scale.z);
      } else if (opts.dir.x !== 0 && offset.x !== 0) {
        //
        const dx = offset.x;
        const ds = 1 + dx / (opts.dir.x < 0 ? curMin.x : curMax.x);
        const scale = this.object.scale;
        this.object.scale.set(scale.x * ds, scale.y * ds, scale.z);
      }
    }
  }
}
