import type {
  Game,
  ComponentData,
} from "@oncyberio/engine";

export type Platform = "desktop" | "mobile";

export type Domain = "awe" | "oncyber" | "runfun";

export interface GameParams {
  private?: boolean;
  draftPrivate?: boolean;
  enableRemixing?: boolean;
  gating?: any;
  excludedPlatforms?: Record<Platform, boolean>;
  looseMode?: boolean;
  stream?: {
    collabsOnly?: boolean;
  };
}

export interface GameData extends Game {
  id: string;
  createdAt: number;
  updatedAt: number;
  contentUpdatedAt?: number;
  headline?: string;
  description?: string;
  cover?: string;
  slug?: string;
  blueprint?: {
    gameId: string;
    version: number;
  };
  engine?: object;
  isDuplicated?: boolean;
  number_of_visits?: number;
  params?: GameParams;
  creatorId: string;
  isLegacy?: boolean;
  isPublished?: boolean;
  editors: string[];
  isTemplate?: boolean;
  template?: {
    gameId?: string;
    slug?: string;
  };
  /****************************** domain management  ******************************/

  // domain where the game was created: awe, oncyber, runfun
  $domain?: Domain;
  // profile defining the permissions when editing the game
  $profile?: string;

  // this is the original template; it's different from template.gameId field
  // since this last is set whenever a game is duplicated
  // We need this one to validate permisisons against its data when
  // the game is published
  $origin?: string;
  // this profile of the template that was used to create the game
  $templateProfile?: string;

  /******************************************************************************/
  //
  mints?: Record<string, any>;
  // THIS IS TO TRACK SELECTED DRAFT VERSION WHEN USER REVERT
  currentDraftVersion?: number;

  // map for old links
  $links?: Record<string, string>;
}

export type GameMetadata = Omit<GameData, "components">;

export type { ComponentData };

export interface GameTreeNode extends ComponentData {
  // for all nodes
  children?: Record<string, GameTreeNode>;
}

export interface GameViewNode extends GameTreeNode {
  // for all nodes
  parent?: GameViewNode;
  root?: GameViewNode;
}
