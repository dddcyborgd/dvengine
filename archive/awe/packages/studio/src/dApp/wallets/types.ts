import type { Blockchain } from "../nfts/types";

/**
 * Wallet type categories for different blockchain ecosystems
 */
export type WalletType = "evm";

/**
 * Unified wallet connection result returned by all adapters
 */
export interface WalletConnection {
  walletId: string;
  walletType: WalletType;
  chainId?: string | number;
  provider: unknown;
}

/**
 * Common interface that all wallet adapters must implement
 */
export interface WalletAdapter {
  readonly walletType: WalletType;

  /**
   * Connect to the wallet and return connection details
   */
  connect(): Promise<WalletConnection>;

  /**
   * Disconnect from the wallet
   */
  disconnect(): Promise<void>;

  /**
   * Get the currently connected account address
   */
  getAccount(): Promise<string | null>;

  /**
   * Check if the wallet is currently connected
   */
  isConnected(): boolean;

  /**
   * Subscribe to account change events
   */
  onAccountChange?(callback: (account: string | null) => void): () => void;

  /**
   * Subscribe to chain change events (EVM only)
   */
  onChainChange?(callback: (chainId: number) => void): () => void;
}

/**
 * Map blockchain names to their wallet types
 */
export function getWalletType(chain: Blockchain): WalletType {
  // All chains are now EVM-compatible
  return "evm";
}

/**
 * Check if a blockchain is EVM-compatible
 */
export function isEvmChain(chain: Blockchain): boolean {
  return getWalletType(chain) === "evm";
}
