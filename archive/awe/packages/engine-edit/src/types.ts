import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { Grid } from "./grid";
import { GridMode } from "@oncyberio/engine/internal/grid/grid-mesh";

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface Coords {
  position?: XYZ;
  rotation?: XYZ;
  scale?: XYZ;
}

export interface TransformChange {
  targetMesh: Component3D;
  changes: any;
  undo: any;
}

export interface TransformModes {
  enableTranslate: boolean;
  enableRotate: boolean;
  enableScale: boolean;
  enableLocalSpace: boolean;
}

export interface ComponentLock {
  [key: string]: boolean | string;
}

export type NavView = "X" | "Y" | "Z" | "-X" | "-Y" | "-Z";

export type NavGridMode = `${"-" | ""}${GridMode}`;

export const navViewToGridMode: Record<NavView, NavGridMode> = {
  X: "YZ",
  "-X": "-YZ",
  Y: "XZ",
  "-Y": "-XZ",
  Z: "XY",
  "-Z": "-XY",
};

export type * from "./component-editor/store";

export type * from "./component-editor/ui-editor";
