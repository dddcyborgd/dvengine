import { getCurrentSpace } from "@oncyberio/engine/internal";
import type { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { Box3, Vector3 } from "three";

type AxisName = "x" | "y" | "z";

const AXES: AxisName[] = ["x", "y", "z"];

function isSnappableObject(object: unknown): object is Component3D {
  return (
    object != null &&
    typeof (object as Component3D).getBBox === "function" &&
    typeof (object as Component3D).getCollisionMesh === "function"
  );
}

function rangesOverlap(
  minA: number,
  maxA: number,
  minB: number,
  maxB: number,
  padding = 0
) {
  return maxA + padding >= minB && maxB + padding >= minA;
}

function overlapsOnOtherAxes(
  boxA: Box3,
  boxB: Box3,
  ignoredAxis: AxisName | null
) {
  for (const axis of AXES) {
    if (axis === ignoredAxis) continue;

    if (
      !rangesOverlap(
        boxA.min[axis],
        boxA.max[axis],
        boxB.min[axis],
        boxB.max[axis]
      )
    ) {
      return false;
    }
  }

  return true;
}

function hasCompatibleLateralPosition(
  boxA: Box3,
  boxB: Box3,
  ignoredAxis: AxisName,
  maxGap: number
) {
  for (const axis of AXES) {
    if (axis === ignoredAxis) continue;

    if (rangesOverlap(boxA.min[axis], boxA.max[axis], boxB.min[axis], boxB.max[axis])) {
      continue;
    }

    const gaps = [
      boxB.min[axis] - boxA.min[axis],
      boxB.max[axis] - boxA.max[axis],
    ];

    if (gaps.some((gap) => Math.abs(gap) <= maxGap)) {
      continue;
    }

    return false;
  }

  return true;
}

function hasContactOnOtherAxis(
  boxA: Box3,
  boxB: Box3,
  ignoredAxis: AxisName,
  maxGap: number
) {
  for (const axis of AXES) {
    if (axis === ignoredAxis) continue;

    const contactGaps = [
      boxB.min[axis] - boxA.max[axis],
      boxB.max[axis] - boxA.min[axis],
    ];

    if (!contactGaps.some((gap) => Math.abs(gap) <= maxGap)) {
      continue;
    }

    let overlapsRemainingAxes = true;

    for (const otherAxis of AXES) {
      if (otherAxis === ignoredAxis || otherAxis === axis) continue;

      if (
        !rangesOverlap(
          boxA.min[otherAxis],
          boxA.max[otherAxis],
          boxB.min[otherAxis],
          boxB.max[otherAxis]
        )
      ) {
        overlapsRemainingAxes = false;
        break;
      }
    }

    if (overlapsRemainingAxes) {
      return true;
    }
  }

  return false;
}

export class Snap3D {
  private object: Component3D | null = null;
  private targets: Component3D[] = [];

  maxGap = 0.2;

  private currentBox = new Box3();
  private targetBox = new Box3();
  private shiftedBox = new Box3();

  private normalizedDirection = new Vector3();
  private candidateOffset = new Vector3();

  setObject(object: unknown) {
    if (
      isSnappableObject(object) &&
      object.info?.is2D !== true &&
      object.getCollisionMesh?.() != null
    ) {
      this.object = object;
      return;
    }

    this.object = null;
    this.targets = [];
  }

  onPointerDown() {
    if (this.object == null || this.maxGap <= 0) return;

    this.targets = [];

    getCurrentSpace()?.components.forEach((component) => {
      if (
        component == null ||
        component === this.object ||
        component.info?.is2D === true ||
        component.getCollisionMesh?.() == null ||
        component.isDescendantOf(this.object) ||
        this.object.isDescendantOf(component)
      ) {
        return;
      }

      this.targets.push(component);
    });
  }

  getWorldAxesSnapOffset(
    axes: [boolean, boolean, boolean],
    target = new Vector3()
  ) {
    target.set(0, 0, 0);

    if (this.object == null || this.targets.length === 0 || this.maxGap <= 0) {
      return target;
    }

    this.object.updateMatrixWorld(true);
    this.object.getBBox(this.currentBox);

    const best = {
      x: Number.POSITIVE_INFINITY,
      y: Number.POSITIVE_INFINITY,
      z: Number.POSITIVE_INFINITY,
    };

    const candidateContacts: Partial<Record<AxisName, number>> = {};

    for (const candidate of this.targets) {
      candidate.updateMatrixWorld(true);
      candidate.getBBox(this.targetBox);

      for (const axis of AXES) {
        delete candidateContacts[axis];
      }

      for (let index = 0; index < AXES.length; index++) {
        if (!axes[index]) continue;

        const axis = AXES[index];

        if (
          !hasCompatibleLateralPosition(
            this.currentBox,
            this.targetBox,
            axis,
            this.maxGap
          )
        ) {
          continue;
        }

        const contactGaps = [
          this.targetBox.min[axis] - this.currentBox.max[axis],
          this.targetBox.max[axis] - this.currentBox.min[axis],
        ];

        for (const gap of contactGaps) {
          if (Math.abs(gap) > this.maxGap) continue;

          const bestGap = candidateContacts[axis];

          if (bestGap == null || Math.abs(gap) < Math.abs(bestGap)) {
            candidateContacts[axis] = gap;
          }
        }
      }

      let hasContact = false;

      for (let index = 0; index < AXES.length; index++) {
        if (!axes[index]) continue;

        const axis = AXES[index];
        const gap = candidateContacts[axis];

        if (gap == null) continue;

        hasContact = true;

        if (Math.abs(gap) < best[axis]) {
          best[axis] = Math.abs(gap);
          target[axis] = gap;
        }
      }

      if (!hasContact) {
        continue;
      }

      for (let index = 0; index < AXES.length; index++) {
        if (!axes[index]) continue;

        const axis = AXES[index];

        if (candidateContacts[axis] != null) {
          continue;
        }

        const alignmentGaps = [
          this.targetBox.min[axis] - this.currentBox.min[axis],
          this.targetBox.max[axis] - this.currentBox.max[axis],
        ];

        for (const gap of alignmentGaps) {
          if (Math.abs(gap) > this.maxGap) continue;

          if (Math.abs(gap) < best[axis]) {
            best[axis] = Math.abs(gap);
            target[axis] = gap;
          }
        }
      }
    }

    return target;
  }

  getWorldDirectionSnapOffset(direction: Vector3, target = new Vector3()) {
    target.set(0, 0, 0);

    if (this.object == null || this.targets.length === 0 || this.maxGap <= 0) {
      return target;
    }

    if (direction.lengthSq() === 0) return target;

    this.object.updateMatrixWorld(true);
    this.object.getBBox(this.currentBox);

    this.normalizedDirection.copy(direction).normalize();

    let bestAlignmentDistance = Number.POSITIVE_INFINITY;
    let bestContactDistance = Number.POSITIVE_INFINITY;
    const bestAlignmentOffset = new Vector3();
    const bestContactOffset = new Vector3();

    for (const candidate of this.targets) {
      candidate.updateMatrixWorld(true);
      candidate.getBBox(this.targetBox);

      for (const axis of AXES) {
        const axisDirection = this.normalizedDirection[axis];

        if (Math.abs(axisDirection) < 1e-4) continue;

        const alignmentDistances = [
          (this.targetBox.min[axis] - this.currentBox.min[axis]) /
            axisDirection,
          (this.targetBox.max[axis] - this.currentBox.max[axis]) /
            axisDirection,
        ];

        const contactDistances = [
          (this.targetBox.min[axis] - this.currentBox.max[axis]) /
            axisDirection,
          (this.targetBox.max[axis] - this.currentBox.min[axis]) /
            axisDirection,
        ];

        for (const alignmentDistance of alignmentDistances) {
          if (Math.abs(alignmentDistance) > this.maxGap) continue;

          this.candidateOffset
            .copy(this.normalizedDirection)
            .multiplyScalar(alignmentDistance);

          this.shiftedBox
            .copy(this.currentBox)
            .translate(this.candidateOffset);

          if (
            hasContactOnOtherAxis(
              this.shiftedBox,
              this.targetBox,
              axis,
              this.maxGap
            ) &&
            Math.abs(alignmentDistance) < bestAlignmentDistance
          ) {
            bestAlignmentDistance = Math.abs(alignmentDistance);
            bestAlignmentOffset.copy(this.candidateOffset);
          }
        }

        for (const distance of contactDistances) {
          if (Math.abs(distance) > this.maxGap) continue;

          this.candidateOffset
            .copy(this.normalizedDirection)
            .multiplyScalar(distance);

          this.shiftedBox
            .copy(this.currentBox)
            .translate(this.candidateOffset);

          if (!overlapsOnOtherAxes(this.shiftedBox, this.targetBox, axis)) {
            continue;
          }

          if (Math.abs(distance) < bestContactDistance) {
            bestContactDistance = Math.abs(distance);
            bestContactOffset.copy(this.candidateOffset);
          }
        }
      }
    }

    if (bestAlignmentDistance !== Number.POSITIVE_INFINITY) {
      target.copy(bestAlignmentOffset);
    } else if (bestContactDistance !== Number.POSITIVE_INFINITY) {
      target.copy(bestContactOffset);
    } else {
      target.set(0, 0, 0);
    }

    return target;
  }
}
