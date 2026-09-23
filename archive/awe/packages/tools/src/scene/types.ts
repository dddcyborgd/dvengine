export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface SceneComponent {
  id: string;
  name: string;
  type: string;
  position?: XYZ;
  rotation?: XYZ;
  scale?: XYZ;
  parentId?: string;
  data?: Record<string, unknown>;
  collider?: ColliderConfig;
  script?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ColliderConfig {
  rigidbodyType?: "DYNAMIC" | "KINEMATIC" | "FIXED" | "PLAYER";
  colliderType?: "CUBE" | "SPHERE" | "CAPSULE" | "CYLINDER" | "MESH";
  isSensor?: boolean;
  dynamicProps?: {
    mass?: number;
    friction?: number;
    restitution?: number;
    linearDamping?: number;
    angularDamping?: number;
  };
}

export interface SceneData {
  id?: string;
  creatorId?: string;
  editors?: string[];
  components: Record<string, SceneComponent>;
  params?: Record<string, unknown>;
  createdAt?: number;
  updatedAt?: number;
}
