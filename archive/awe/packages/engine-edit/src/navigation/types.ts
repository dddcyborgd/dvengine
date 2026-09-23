import type { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import { Engine } from "@oncyberio/engine/index";
import { Mesh, Object3D, PerspectiveCamera } from "three";

export interface EditNavControlsOpts {
    camera: PerspectiveCamera;
    engine: Engine;
}

export type NavMode = { type: "perspective" } | { type: "map" };

export interface FocusOpts {
    target: Mesh;
    transition?: boolean;
    frontDir?: boolean;
}
