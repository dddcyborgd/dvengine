/**
 * Supported blockchain chains for OpenSea API v2.
 * Note: OpenSea uses "polygon" instead of "matic".
 */
export type OpenSeaChain =
  | "ethereum"
  | "polygon"
  | "matic" // Legacy alias for polygon
  | "klaytn"
  | "arbitrum"
  | "bsc"
  | "avalanche"
  | "zora"
  | "base"
  | "optimism"
  | "blast"
  | "sei"
  | "ape_chain"
  | "flow"
  | "b3"
  | "soneium"
  | "ronin"
  | "bera_chain"
  | "shape"
  | "unichain"
  | "gunzilla"
  | "abstract"
  | "hyperevm"
  | "somnia"
  | "monad";

export type Blockchain = OpenSeaChain;

export type Owners = {
  address: string;
  quantity?: number;
};

/**
 * OpenSea NFT trait structure from API v2 response.
 */
export type OpenSeaTrait = {
  trait_type: string;
  display_type?: string;
  max_value?: string;
  value?: string | number;
};

/**
 * OpenSea NFT owner structure from API v2 response.
 */
export type OpenSeaOwner = {
  address: string;
  quantity: number;
};

/**
 * OpenSea NFT structure from API v2 response.
 * @see https://docs.opensea.io/reference/get_nft_1
 */
export type OpenSeaNfts = {
  /** The unique identifier (token ID) of the NFT */
  identifier: string;
  /** The collection slug this NFT belongs to */
  collection: string;
  /** The contract address of the NFT */
  contract: string;
  /** The token standard (e.g., "erc721", "erc1155") */
  token_standard: string;
  /** The name of the NFT */
  name: string;
  /** The description of the NFT */
  description: string;
  /** The raw image URL from metadata */
  image_url: string;
  /** The display-optimized image URL */
  display_image_url: string;
  /** The display-optimized animation URL */
  display_animation_url?: string;
  /** The URL to the NFT's metadata */
  metadata_url: string;
  /** The OpenSea URL for this NFT */
  opensea_url: string;
  /** Last update timestamp */
  updated_at: string;
  /** Whether the NFT is disabled */
  is_disabled: boolean;
  /** Whether the NFT is marked as NSFW */
  is_nsfw: boolean;
  /** Whether the NFT is marked as suspicious */
  is_suspicious?: boolean;
  /** The original image URL */
  original_image_url?: string;
  /** The original animation URL */
  original_animation_url?: string;
  /** The animation URL */
  animation_url?: string;
  /** The creator's address */
  creator: string;
  /** Array of traits/attributes */
  traits?: OpenSeaTrait[];
  /** Array of owners (for ERC-1155) */
  owners?: OpenSeaOwner[];
};

export type MagicedenNfts = {
  mintAddress: string;
  collection: string;
  tokenAddress: string;
  name: string;
  image: string;
  externalUrl: string;
  animation_url: string;
  updated_at: string;
  owner: string;
  properties: {
    creators: Array<{
      address: string;
    }>;
  };
};

export type AssetUrl = {
  urlField: string;
  urls: string[];
};

type AssetAccount = {
  address?: string;
  username?: string;
  user?: {
    username?: string;
    profile_img_url?: string;
  };
  profile_img_url?: string;
};

type Collection = {
  name?: string;
  image_url?: string;
  external_url?: string;
};

type Contract = {
  name?: string;
  schema_name?: string;
};

type Trait = {
  trait_type: string;
  display_type: null;
  max_value: null;
  value: string;
};

export type Asset = {
  url: string;
  name: string;
  token_id: string;
  owners?: Owners[];
  //
  isVrm?: boolean;
  //
  traits?: Trait[];
  mime_type?: string;
  original_mime_type?: string;
  //
  contract?: Contract;
  contract_address: string;
  //
  creator?: AssetAccount;
  blockchain: Blockchain;
  collection?: Collection;
  //
  token_metadata?: string;
  incompatible?: boolean;
  //
  description?: string;
  //
  external_link?: string;
  account_base_url?: string;
  //
  image_url?: string;
  image_preview_url?: string;
  image_original_url?: string;
  dcompressed_image_url?: string;
  //
  animation_url?: string;
  animation_original_url?: string;
  dcompressed_animation_url?: string;

  mediaInfoPromise?: MediaInfoPromise;
};

type MediaInfoPromise = Promise<
  MediaInfo & { mime_type?: string; urlField?: string; url?: string }
>;

export type NftResponse = {
  asset: Asset;
};

export type NftsResponse = {
  next?: string | number;
  assets: Asset[];
};

export type QueryOptions = {
  limit?: number;
  next?: string;
  offset?: number;
  signal?: AbortSignal;
};

export interface INfts {
  getNft: (
    address: string,
    chain: OpenSeaChain,
    identifier: string,
    options?: QueryOptions
  ) => Promise<NftResponse["asset"]>;

  getNftsBySlug: (
    slug: string,
    options?: QueryOptions
  ) => Promise<NftsResponse>;

  getNfts: (
    contract: string,
    chain: OpenSeaChain,
    options?: QueryOptions
  ) => Promise<NftsResponse>;

  getUserNfts: (
    address: string,
    chain: OpenSeaChain,
    options?: QueryOptions
  ) => Promise<NftsResponse>;
}

type NoTypeMediaInfo = { type: "NoTypeInfo" };

export type UnsupportedMediaInfo = { type: "Unsupported"; mime_type: string };

type NotUploadableMediaInfo = {
  type: "NotUploable";
  mime_type: string;
  urlField: string;
  url: string;
  size: number;
};

export type MediaInfo =
  | UnsupportedMediaInfo
  | NotUploadableMediaInfo
  | NoTypeMediaInfo;

export type HeadInfo = {
  url: string;
  media_type: string;
  size: number;
};
