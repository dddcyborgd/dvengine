import { eachKey } from "../../../utils/js";
import { AddComponentCommand } from "./add-component";
import { DeleteComponentsCommand } from "./delete-components";
import { UpdateComponents } from "./update-components";
import { UpdateComponentCommand } from "./update-component-command";
import { DuplicateComponentsCommand } from "./duplicate-components";
import { ChangeLockCommand } from "./change-lock-command";
import { ReplaceComponentCommand } from "./replace-component";
import { ChangeParentCommand } from "./change-parent";
import { CreateGroupCommand } from "./create-group";
import { UngroupComponentsCommand } from "./ungroup-components";
import { AddComponentBatch } from "./add-component-batch";
import { DeleteSuperCommand } from "./delete-super-command";
import { AutoBatchCommand } from "./auto-batch-command";

export const CommandMap = {
  AddComponent: AddComponentCommand,
  AddComponentBatch: AddComponentBatch,
  ReplaceComponent: ReplaceComponentCommand,
  DuplicateComponents: DuplicateComponentsCommand,
  DeleteComponents: DeleteComponentsCommand,
  UpdateComponent: UpdateComponentCommand,
  UpdateComponents: UpdateComponents,
  ChangeLock: ChangeLockCommand,
  ChangeParent: ChangeParentCommand,
  CreateGroup: CreateGroupCommand,
  Ungroup: UngroupComponentsCommand,
  AutoBatch: AutoBatchCommand,

  //
  DeleteSuper: DeleteSuperCommand,
} as const;

export type CommandType = keyof typeof CommandMap;

export type CommandOptsMap = {
  [K in CommandType]: ConstructorParameters<(typeof CommandMap)[K]>[1];
};

export type CommandInstanceMap = {
  [K in CommandType]: InstanceType<(typeof CommandMap)[K]>;
};

export type CommandTypeMap = {
  [K in CommandType]: K;
};

export const Commands: CommandTypeMap = eachKey(
  CommandMap,
  (_, key) => key
) as any;
