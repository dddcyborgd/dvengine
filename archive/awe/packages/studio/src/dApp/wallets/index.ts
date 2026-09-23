// Types
export * from "./types";

export type { WalletAdapter, WalletConnection, WalletType };

// EVM Adapter
export * from "./evm-adapter";

// Factory functions
import type { Blockchain } from "../nfts/types";
import { getEvmWalletAdapter } from "./evm-adapter";
import { getWalletType, isEvmChain } from "./types";
import type { WalletAdapter, WalletConnection, WalletType } from "./types";

/**
 * Get the appropriate wallet adapter for a blockchain
 */
export async function getWalletAdapter(
  chain: Blockchain
): Promise<WalletAdapter> {
  const walletType = getWalletType(chain);
  return getAdapterByType(walletType);
}

/**
 * Get adapter by wallet type directly
 */
export async function getAdapterByType(
  walletType: WalletType
): Promise<WalletAdapter> {
  switch (walletType) {
    case "evm":
      return getEvmWalletAdapter();
    default:
      throw new Error(`Unsupported wallet type: ${walletType}`);
  }
}

/**
 * Connect to a wallet for a specific blockchain
 * Unified factory function that handles all wallet types
 */
export async function WalletFactory(chain: Blockchain): Promise<WalletConnection> {
  const adapter = await getWalletAdapter(chain);
  return adapter.connect();
}

/**
 * Disconnect from a wallet for a specific blockchain
 */
export async function disconnectWallet(chain: Blockchain): Promise<void> {
  const adapter = await getWalletAdapter(chain);
  return adapter.disconnect();
}

/**
 * Get the current account for a specific blockchain
 */
export async function getWalletAccount(
  chain: Blockchain
): Promise<string | null> {
  const adapter = await getWalletAdapter(chain);
  return adapter.getAccount();
}

/**
 * Check if wallet is connected for a specific blockchain
 */
export async function isWalletConnected(chain: Blockchain): Promise<boolean> {
  const adapter = await getWalletAdapter(chain);
  return adapter.isConnected();
}

/**
 * @deprecated Use WalletFactory instead
 * Legacy factory function for backward compatibility
 */
export async function FactoryConnect(
  chain: Blockchain
): Promise<{ provider: any; walletId: string }> {
  const result = await WalletFactory(chain);
  return {
    provider: result.provider,
    walletId: result.walletId,
  };
}

// Re-export utilities
export { getWalletType, isEvmChain };
