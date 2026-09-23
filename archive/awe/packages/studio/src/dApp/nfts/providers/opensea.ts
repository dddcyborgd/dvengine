import type {
  INfts,
  Asset,
  Blockchain,
  NftResponse,
  QueryOptions,
  OpenSeaNfts,
  NftsResponse,
} from "../types";
import { getAssetMediaInfo } from "../../utils/get-asset-media-info";

/** OpenSea API key for authentication */
const OPENSEA_API_KEY = process.env.NEXT_PUBLIC_OPENSEA_API_KEY || "";

/** Base URL for OpenSea API v2 */
const OPENSEA_API_BASE = "https://api.opensea.io/api/v2";

/** Default number of items per page */
const DEFAULT_LIMIT = 30;

/**
 * Maps internal chain names to OpenSea API chain identifiers.
 * OpenSea uses "polygon" instead of "matic".
 */
const CHAIN_MAP: Record<string, string> = {
  matic: "polygon",
  ethereum: "ethereum",
  polygon: "polygon",
  arbitrum: "arbitrum",
  base: "base",
  zora: "zora",
  avalanche: "avalanche",
  optimism: "optimism",
  blast: "blast",
  sei: "sei",
};

/**
 * Normalizes chain name to OpenSea API format.
 *
 * @param chain - The blockchain identifier
 * @returns The normalized chain name for OpenSea API
 */
function normalizeChain(chain: string): string {
  return CHAIN_MAP[chain] || chain;
}

/**
 * Transforms an OpenSea NFT response to the internal Asset format.
 *
 * @param nft - The OpenSea NFT data from API response
 * @param blockchain - The blockchain the NFT is on
 * @param ownerAddress - Optional owner address to include
 * @returns The transformed Asset object with media info promise attached
 */
function transformNftToAsset(
  nft: OpenSeaNfts,
  blockchain: Blockchain,
  ownerAddress?: string
): Asset {
  //
  const imageUrl = nft.display_image_url || nft.image_url || "";

  const asset: Asset = {
    url: imageUrl,
    token_id: nft.identifier || "",
    name: nft.name || "",
    contract_address: nft.contract || "",
    description: nft.description || "",
    animation_url: nft.animation_url || nft.display_animation_url || "",
    collection: {
      name: nft.collection || "",
    },
    image_url: imageUrl,
    image_preview_url: nft.display_image_url || "",
    image_original_url: nft.original_image_url || nft.image_url || "",
    animation_original_url: nft.original_animation_url || "",
    token_metadata: nft.metadata_url || "",
    creator: {
      address: nft.creator || "",
    },
    owners: ownerAddress
      ? [{ address: ownerAddress }]
      : nft.owners?.map((o) => ({ address: o.address, quantity: o.quantity })) || [],
    traits: nft.traits?.map((t) => ({
      trait_type: t.trait_type,
      display_type: null,
      max_value: null,
      value: String(t.value || ""),
    })),
    mime_type: "image/png",
    blockchain,
    external_link: nft.opensea_url || "",
    account_base_url: "https://opensea.io",
  };

  const mediaInfoPromise = getAssetMediaInfo(asset);

  Object.defineProperty(asset, "mediaInfoPromise", {
    value: mediaInfoPromise,
    configurable: false,
    enumerable: false,
  });

  console.log("asset", asset);

  return asset;
}

/**
 * OpenSea NFT provider implementation using OpenSea API v2.
 *
 * Provides methods to fetch NFTs from OpenSea marketplace including:
 * - Single NFT retrieval by contract and token ID
 * - Collection NFTs by slug or contract address
 * - User-owned NFTs by wallet address
 *
 * @example
 * ```typescript
 * // Get a single NFT
 * const nft = await OpenSeaNft.getNft(
 *   "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
 *   "ethereum",
 *   "1234"
 * );
 *
 * // Get NFTs from a collection
 * const { assets, next } = await OpenSeaNft.getNftsBySlug("boredapeyachtclub");
 *
 * // Get user's NFTs
 * const userNfts = await OpenSeaNft.getUserNfts(
 *   "0x1234...",
 *   "ethereum"
 * );
 * ```
 *
 * @see https://docs.opensea.io/reference/api-overview
 */
class Nft implements INfts {
  /**
   * Makes an authenticated request to the OpenSea API.
   *
   * @param endpoint - The API endpoint path (without base URL)
   * @param options - Query options including pagination and abort signal
   * @returns The parsed JSON response from the API
   * @throws Error if the API request fails
   * @internal
   */
  async #fetchApi<T>(endpoint: string, options?: QueryOptions): Promise<T> {
    const url = new URL(`${OPENSEA_API_BASE}/${endpoint}`);

    if (options?.limit) {
      url.searchParams.append("limit", String(options.limit));
    } else {
      url.searchParams.append("limit", String(DEFAULT_LIMIT));
    }

    if (options?.next) {
      url.searchParams.append("next", options.next);
    }

    const response = await fetch(url.toString(), {
      headers: {
        "X-API-KEY": OPENSEA_API_KEY,
        Accept: "application/json",
      },
      signal: options?.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `OpenSea API Error: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""
        }`
      );
    }

    return response.json();
  }

  /**
   * Retrieves a single NFT by its contract address and token identifier.
   *
   * @param address - The contract address of the NFT collection
   * @param chain - The blockchain network (e.g., "ethereum", "polygon")
   * @param identifier - The token ID of the NFT
   * @param options - Optional query options including abort signal
   * @returns The NFT asset data
   * @throws Error if the NFT is not found or API request fails
   *
   * @example
   * ```typescript
   * const nft = await OpenSeaNft.getNft(
   *   "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
   *   "ethereum",
   *   "1234"
   * );
   * console.log(nft.name, nft.image_url);
   * ```
   */
  async getNft(
    address: string,
    chain: Blockchain,
    identifier: string,
    options?: QueryOptions
  ): Promise<NftResponse["asset"]> {
    //
    const normalizedChain = normalizeChain(chain);
    const endpoint = `chain/${normalizedChain}/contract/${address}/nfts/${identifier}`;

    const data = await this.#fetchApi<{ nft: OpenSeaNfts }>(endpoint, options);

    return transformNftToAsset(data.nft, chain);
  }

  /**
   * Retrieves collection contract information by collection slug.
   *
   * @param slug - The OpenSea collection slug (e.g., "boredapeyachtclub")
   * @returns The contract address and chain for the collection
   * @throws Error if the collection is not found or API request fails
   *
   * @example
   * ```typescript
   * const contract = await OpenSeaNft.getCollectionContract("boredapeyachtclub");
   * console.log(contract.address, contract.chain);
   * ```
   */
  async getCollectionContract(slug: string): Promise<{
    address: string;
    chain: Blockchain;
  }> {

    debugger;

    const response = await fetch(
      `${OPENSEA_API_BASE}/collections/${slug}`,
      {
        headers: {
          "X-API-KEY": OPENSEA_API_KEY,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `OpenSea API Error: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""
        }`
      );
    }

    const data = await response.json();

    return data?.contracts?.[0] || null;
  }

  /**
   * Retrieves all NFTs in a collection by its slug.
   *
   * Uses OpenSea's collection endpoint directly which is more efficient
   * than fetching by contract address.
   *
   * @param slug - The OpenSea collection slug (e.g., "boredapeyachtclub")
   * @param options - Optional query options including pagination and abort signal
   * @returns Object containing array of NFT assets and pagination cursor
   *
   * @example
   * ```typescript
   * // First page
   * const { assets, next } = await OpenSeaNft.getNftsBySlug("boredapeyachtclub");
   *
   * // Next page
   * const page2 = await OpenSeaNft.getNftsBySlug("boredapeyachtclub", { next });
   * ```
   */
  async getNftsBySlug(
    slug: string,
    options?: QueryOptions
  ): Promise<NftsResponse> {
    const endpoint = `collection/${slug}/nfts`;

    const data = await this.#fetchApi<{ nfts: OpenSeaNfts[]; next?: string }>(
      endpoint,
      options
    );

    const nfts = data.nfts || [];

    const assets = nfts
      .filter((nft) => nft.image_url || nft.display_image_url)
      .map((nft) => transformNftToAsset(nft, "ethereum"));

    return {
      assets,
      next: data.next || null,
    };
  }

  /**
   * Retrieves NFTs from a collection by contract address.
   *
   * Note: This method first fetches the collection slug from the contract,
   * then retrieves NFTs. For better performance, use getNftsBySlug if you
   * already know the collection slug.
   *
   * @param contract - The contract address of the NFT collection
   * @param chain - The blockchain network (e.g., "ethereum", "polygon")
   * @param options - Optional query options including pagination and abort signal
   * @returns Object containing array of NFT assets and pagination cursor
   *
   * @example
   * ```typescript
   * const { assets, next } = await OpenSeaNft.getNfts(
   *   "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
   *   "ethereum"
   * );
   * ```
   */
  async getNfts(
    contract: string,
    chain: Blockchain,
    options?: QueryOptions
  ): Promise<NftsResponse> {

    debugger;

    const normalizedChain = normalizeChain(chain);
    const endpoint = `chain/${normalizedChain}/contract/${contract}/nfts`;

    const data = await this.#fetchApi<{ nfts: OpenSeaNfts[]; next?: string }>(
      endpoint,
      options
    );

    const nfts = data.nfts || [];

    const assets = nfts
      .filter((nft) => nft.image_url || nft.display_image_url)
      .map((nft) => transformNftToAsset(nft, chain));

    return {
      assets,
      next: data.next || null,
    };
  }

  /**
   * Retrieves all NFTs owned by a specific wallet address.
   *
   * @param address - The wallet address to fetch NFTs for
   * @param chain - The blockchain network (e.g., "ethereum", "polygon")
   * @param options - Optional query options including pagination and abort signal
   * @returns Object containing array of NFT assets and pagination cursor
   *
   * @example
   * ```typescript
   * // Get user's NFTs on Ethereum
   * const { assets, next } = await OpenSeaNft.getUserNfts(
   *   "0x1234567890abcdef...",
   *   "ethereum"
   * );
   *
   * // Get next page
   * const page2 = await OpenSeaNft.getUserNfts(
   *   "0x1234567890abcdef...",
   *   "ethereum",
   *   { next }
   * );
   * ```
   */
  async getUserNfts(
    address: string,
    chain: Blockchain,
    options?: QueryOptions
  ): Promise<NftsResponse> {
    const normalizedChain = normalizeChain(chain);
    const endpoint = `chain/${normalizedChain}/account/${address}/nfts`;

    const data = await this.#fetchApi<{ nfts: OpenSeaNfts[]; next?: string }>(
      endpoint,
      options
    );

    const nfts = data.nfts || [];

    const assets = nfts
      .filter((nft) => nft.image_url || nft.display_image_url)
      .map((nft) => transformNftToAsset(nft, chain, address));

    return {
      assets,
      next: data.next || null,
    };
  }
}

export const OpenSeaNft = new Nft();