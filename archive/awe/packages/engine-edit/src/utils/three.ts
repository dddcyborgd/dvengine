import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import {
    Box3,
    Camera,
    Euler,
    Frustum,
    MathUtils,
    Matrix4,
    Mesh,
    Object3D,
    PerspectiveCamera,
    Quaternion,
    Vector3,
} from "three";

const bbSize = new Vector3();

const meshScale = new Vector3();

export function lookAtDistance(mesh: Mesh, camera: PerspectiveCamera) {
    const geo = mesh.geometry;

    if (geo.boundingBox == null) {
        geo.computeBoundingBox();
    }

    geo.boundingBox.getSize(bbSize);

    mesh.getWorldScale(meshScale);

    const radius =
        Math.max(
            bbSize.x * meshScale.x,
            bbSize.y * meshScale.y,
            bbSize.z * meshScale.z
        ) / 2;

    return getDistanceToFitSphere(camera, radius);
}

export function getDistanceToFitSphere(camera, radius) {
    const vFOV = camera.getEffectiveFOV() * MathUtils.DEG2RAD;

    const hFOV = Math.atan(Math.tan(vFOV * 0.5) * camera.aspect) * 2;

    const fov = 1 < camera.aspect ? vFOV : hFOV;

    return radius / Math.sin(fov * 0.5);
}

export function toXYZ(o: Vector3 | Euler) {
    return {
        x: o.x,
        y: o.y,
        z: o.z,
    };
}

const cameraPosition = new Vector3();

const cameraDirection = new Vector3();

export function getDefaultAssetPosition(
    camera: PerspectiveCamera,
    distance: number
) {
    cameraPosition.copy(camera.position);

    camera.getWorldDirection(cameraDirection);

    cameraDirection.normalize();

    const position = cameraDirection
        .clone()
        .multiplyScalar(distance)
        .add(cameraPosition);

    // position.y = cameraPosition.y;

    return position;
}

const quat = new Quaternion();
const tmpV3 = new Vector3();

export function getDefaultAssetRotation(camera: PerspectiveCamera) {
    const euler = new Euler();

    camera.getWorldPosition(cameraPosition);

    camera.getWorldDirection(cameraDirection);

    tmpV3
        .copy(cameraPosition)
        .add(cameraDirection)
        .setY(cameraPosition.y)
        .sub(cameraPosition)
        .negate();

    euler.setFromQuaternion(
        quat.setFromUnitVectors(new Vector3(0, 0, 1), tmpV3)
    );

    return euler;
}

const tmpVec3 = new Vector3();

/**
 * Translates the object on the axis perpendicular to the camera-to-object vector on the XZ plane
 */
export function offsetHorz(
    position: Vector3,
    camera: Camera,
    offset: number,
    target: Vector3 = position
) {
    tmpVec3.subVectors(position, camera.position).setY(0).normalize();

    // Calculate the lateral offset vector (perpendicular on the XZ plane)
    // if offset is to the right otherwise to the left
    tmpVec3.cross(camera.up);

    // Apply the offset
    target.addScaledVector(tmpVec3, offset);

    return target;
}

const frustum = new Frustum();

const tmpMatrix = new Matrix4();

export function isInFrustum(box: Box3, camera: Camera) {
    const matrix = tmpMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
    );

    frustum.setFromProjectionMatrix(matrix);

    return frustum.intersectsBox(box);
}

const tmpBBox = new Box3();

function yAdjust(mesh: Mesh, targetPos: Vector3) {
    //
    tmpBBox.setFromObject(mesh);

    // Calculate the offset needed to move the mesh down so its minimum Y aligns with y = 0
    let offset = targetPos.y - tmpBBox.min.y;

    return offset;
}
