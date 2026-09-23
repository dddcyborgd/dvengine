import {
  createConfig,
  http,
  connect,
  disconnect,
  getAccount,
  watchAccount,
} from "@wagmi/core";
import { mainnet, polygon, avalanche, zora, base } from "@wagmi/core/chains";
import { injected } from "@wagmi/connectors";
import type { WalletAdapter, WalletConnection, WalletType } from "./types";

// Singleton wagmi config instance
const config = createConfig({
  chains: [mainnet, polygon, avalanche, zora, base],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [avalanche.id]: http(),
    [zora.id]: http(),
    [base.id]: http(),
  },
});

/**
 * EVM Wallet Adapter implementation using wagmi/core
 * Handles wallet connections for EVM-compatible chains (Ethereum, Polygon, etc.)
 */
export class EvmWalletAdapter implements WalletAdapter {
  readonly walletType: WalletType = "evm";

  /**
   * Connect to an EVM wallet using the injected provider (MetaMask, etc.)
   */
  async connect(): Promise<WalletConnection> {
    const result = await connect(config, {
      connector: injected(),
    });

    const account = result.accounts[0];
    if (!account) {
      throw new Error("No account found after connecting");
    }

    return {
      walletId: account,
      walletType: this.walletType,
      chainId: result.chainId,
      provider: config,
    };
  }

  /**
   * Disconnect from the currently connected wallet
   */
  async disconnect(): Promise<void> {
    await disconnect(config);
  }

  /**
   * Get the currently connected account address
   */
  async getAccount(): Promise<string | null> {
    const account = getAccount(config);
    return account.address ?? null;
  }

  /**
   * Check if a wallet is currently connected
   */
  isConnected(): boolean {
    const account = getAccount(config);
    return account.isConnected;
  }

  /**
   * Subscribe to account change events
   * @returns Unsubscribe function
   */
  onAccountChange(callback: (account: string | null) => void): () => void {
    return watchAccount(config, {
      onChange: (account) => {
        callback(account.address ?? null);
      },
    });
  }

  /**
   * Subscribe to chain change events
   * @returns Unsubscribe function
   */
  onChainChange(callback: (chainId: number) => void): () => void {
    return watchAccount(config, {
      onChange: (account) => {
        if (account.chainId !== undefined) {
          callback(account.chainId);
        }
      },
    });
  }
}

// Singleton instance for lazy loading
let evmAdapterInstance: EvmWalletAdapter | null = null;

/**
 * Get the singleton EVM wallet adapter instance
 */
export function getEvmWalletAdapter(): EvmWalletAdapter {
  if (!evmAdapterInstance) {
    evmAdapterInstance = new EvmWalletAdapter();
  }
  return evmAdapterInstance;
}
