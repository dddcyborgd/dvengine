import { beforeEach, describe, expect, it, vi } from "vitest";
import { Box3, Vector3 } from "three";
import { getCurrentSpace } from "@oncyberio/engine/internal";
import { Snap3D } from "../src/controls/pivot-controls/snap-3d";

class FakeComponent {
  info: { is2D?: boolean };
  parent: FakeComponent | null;

  private box: Box3;
  private collisionMesh: object | null;

  constructor(
    box: Box3,
    opts: {
      is2D?: boolean;
      hasCollisionMesh?: boolean;
      parent?: FakeComponent | null;
    } = {}
  ) {
    this.box = box.clone();
    this.info = { is2D: opts.is2D };
    this.parent = opts.parent ?? null;
    this.collisionMesh = opts.hasCollisionMesh === false ? null : {};
  }

  getBBox(target = new Box3()) {
    return target.copy(this.box);
  }

  getCollisionMesh() {
    return this.collisionMesh;
  }

  updateMatrixWorld() {}

  isDescendantOf(component: FakeComponent) {
    let current = this.parent;

    while (current != null) {
      if (current === component) {
        return true;
      }

      current = current.parent;
    }

    return false;
  }
}

function makeBox(
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number
) {
  return new Box3(
    new Vector3(minX, minY, minZ),
    new Vector3(maxX, maxY, maxZ)
  );
}

function makeComponent(
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
  opts?: {
    is2D?: boolean;
    hasCollisionMesh?: boolean;
    parent?: FakeComponent | null;
  }
) {
  return new FakeComponent(makeBox(minX, minY, minZ, maxX, maxY, maxZ), opts);
}

function expectVectorClose(actual: Vector3, expected: [number, number, number]) {
  expect(actual.x).toBeCloseTo(expected[0], 10);
  expect(actual.y).toBeCloseTo(expected[1], 10);
  expect(actual.z).toBeCloseTo(expected[2], 10);
}

function primeSnap(
  snap: Snap3D,
  dragged: FakeComponent,
  components: FakeComponent[]
) {
  vi.mocked(getCurrentSpace).mockReturnValue({ components } as any);
  snap.setObject(dragged);
  snap.onPointerDown();
}

describe("Snap3D", () => {
  beforeEach(() => {
    vi.mocked(getCurrentSpace).mockReset();
    vi.mocked(getCurrentSpace).mockReturnValue({ components: [] } as any);
  });

  it("collects only eligible 3d targets on pointer down", () => {
    const snap = new Snap3D();
    const ancestor = makeComponent(-5, -5, -5, 5, 5, 5);
    const dragged = makeComponent(0, 0, 0, 1, 1, 1, { parent: ancestor });
    const descendant = makeComponent(0, 0, 0, 1, 1, 1, { parent: dragged });
    const eligible = makeComponent(2, 0, 0, 3, 1, 1);
    const twoD = makeComponent(2, 0, 0, 3, 1, 1, { is2D: true });
    const noCollision = makeComponent(2, 0, 0, 3, 1, 1, {
      hasCollisionMesh: false,
    });

    primeSnap(snap, dragged, [
      dragged,
      eligible,
      twoD,
      noCollision,
      ancestor,
      descendant,
    ]);

    expect((snap as any).targets).toEqual([eligible]);
  });

  it("snaps contact faces on enabled world axes", () => {
    const snap = new Snap3D();
    const dragged = makeComponent(0, 0, 0, 1, 1, 1);
    const target = makeComponent(1.1, 0, 0, 2.1, 1, 1);

    primeSnap(snap, dragged, [dragged, target]);

    const offset = snap.getWorldAxesSnapOffset([true, false, false]);

    expectVectorClose(offset, [0.1, 0, 0]);
  });

  it("snaps secondary axes by aligned edges after a face contact", () => {
    const snap = new Snap3D();
    const dragged = makeComponent(0, 0, 0, 1, 2, 1);
    const target = makeComponent(1.1, 0.1, 0, 2.1, 4.1, 1);

    primeSnap(snap, dragged, [dragged, target]);

    const offset = snap.getWorldAxesSnapOffset([true, true, false]);

    expectVectorClose(offset, [0.1, 0.1, 0]);
  });

  it("does not snap secondary axes by center alignment", () => {
    const snap = new Snap3D();
    const dragged = makeComponent(0, 0, 0, 1, 2, 1);
    const target = makeComponent(1.1, -1.1, 0, 2.1, 3.3, 1);

    primeSnap(snap, dragged, [dragged, target]);

    const offset = snap.getWorldAxesSnapOffset([true, true, false]);

    expectVectorClose(offset, [0.1, 0, 0]);
  });

  it("chooses the smallest face-contact gap across candidates", () => {
    const snap = new Snap3D();
    const dragged = makeComponent(0, 0, 0, 1, 1, 1);
    const fartherTarget = makeComponent(1.18, 0, 0, 2.18, 1, 1);
    const nearerTarget = makeComponent(1.05, 0, 0, 2.05, 1, 1);

    primeSnap(snap, dragged, [dragged, fartherTarget, nearerTarget]);

    const offset = snap.getWorldAxesSnapOffset([true, false, false]);

    expectVectorClose(offset, [0.05, 0, 0]);
  });

  it("snaps along a drag direction to the nearest contact face", () => {
    const snap = new Snap3D();
    const dragged = makeComponent(0, 0, 0, 1, 1, 1);
    const target = makeComponent(1.1, 0, 0, 2.1, 1, 1);

    primeSnap(snap, dragged, [dragged, target]);

    const offset = snap.getWorldDirectionSnapOffset(new Vector3(1, 0, 0));

    expectVectorClose(offset, [0.1, 0, 0]);
  });

  it("snaps along a drag direction to the nearest aligned min edge", () => {
    const snap = new Snap3D();
    const dragged = makeComponent(0.1, 1, 1, 1.1, 2, 2);
    const target = makeComponent(0, 0, 0, 10, 1, 10);

    primeSnap(snap, dragged, [dragged, target]);

    const offset = snap.getWorldDirectionSnapOffset(new Vector3(1, 0, 0));

    expectVectorClose(offset, [-0.1, 0, 0]);
  });

  it("snaps along a drag direction to the nearest aligned max edge", () => {
    const snap = new Snap3D();
    const dragged = makeComponent(8.9, 1, 1, 9.9, 2, 2);
    const target = makeComponent(0, 0, 0, 10, 1, 10);

    primeSnap(snap, dragged, [dragged, target]);

    const offset = snap.getWorldDirectionSnapOffset(new Vector3(1, 0, 0));

    expectVectorClose(offset, [0.1, 0, 0]);
  });

  it("returns zero when the drag direction is empty", () => {
    const snap = new Snap3D();
    const dragged = makeComponent(0, 0, 0, 1, 1, 1);
    const target = makeComponent(1.1, 0, 0, 2.1, 1, 1);

    primeSnap(snap, dragged, [dragged, target]);

    const offset = snap.getWorldDirectionSnapOffset(new Vector3(0, 0, 0));

    expectVectorClose(offset, [0, 0, 0]);
  });
});
