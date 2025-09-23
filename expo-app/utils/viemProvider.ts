// React Native compatible Web3 provider using viem v2
// Viem is the modern replacement for web3.js with better React Native support

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  formatEther,
  parseEther,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { mainnet } from 'viem/chains';
import { Platform, Linking } from 'react-native';

// OneKey deep link configuration
const ONEKEY_DEEP_LINK = {
  scheme: 'onekey-wallet://',
  appStoreUrl: 'https://apps.apple.com/app/onekey-open-source-wallet/id1609559473',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=so.onekey.app.wallet',
};

export class ViemProvider {
  private publicClient: PublicClient | null = null;
  private walletClient: WalletClient | null = null;
  private currentAccount: string | null = null;

  // Initialize with a public RPC provider for React Native
  async initializeProvider(rpcUrl: string = 'https://eth-mainnet.g.alchemy.com/v2/demo') {
    try {
      // Create public client for reading blockchain data
      this.publicClient = createPublicClient({
        chain: mainnet,
        transport: http(rpcUrl),
      });

      console.log('Viem provider initialized with RPC:', rpcUrl);
      return true;
    } catch (error) {
      console.error('Failed to initialize viem provider:', error);
      return false;
    }
  }

  // Connect to OneKey wallet using platform-specific methods
  async connectToOneKey(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // On web, use EIP-6963 to detect OneKey or fallback to window.ethereum
        return this.connectWebWallet();
      } else {
        // On mobile, use deep linking
        return this.connectMobileWallet();
      }
    } catch (error) {
      console.error('Failed to connect to OneKey:', error);
      return null;
    }
  }

  // Web wallet connection using window.ethereum
  private async connectWebWallet(): Promise<string | null> {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        // Create wallet client for signing transactions
        this.walletClient = createWalletClient({
          chain: mainnet,
          transport: custom((window as any).ethereum),
        });

        // Request account access
        const [account] = await this.walletClient.requestAddresses();

        if (account) {
          this.currentAccount = account;
          console.log('Connected to web wallet:', account);
          return account;
        }
      } catch (error) {
        console.error('Web wallet connection error:', error);
      }
    }
    return null;
  }

  // Mobile wallet connection using deep linking
  private async connectMobileWallet(): Promise<string | null> {
    try {
      // Check if OneKey is installed
      const canOpen = await Linking.canOpenURL(ONEKEY_DEEP_LINK.scheme);

      if (canOpen) {
        // Open OneKey app
        await Linking.openURL(ONEKEY_DEEP_LINK.scheme);

        // Note: In a real implementation, you would use WalletConnect v2
        // to get the wallet address back from the mobile app
        console.log('OneKey app opened for connection');
        return 'pending_connection';
      } else {
        // Prompt to install OneKey
        const storeUrl =
          Platform.OS === 'ios' ? ONEKEY_DEEP_LINK.appStoreUrl : ONEKEY_DEEP_LINK.playStoreUrl;

        console.log('OneKey not installed, opening store:', storeUrl);
        await Linking.openURL(storeUrl);
        return null;
      }
    } catch (error) {
      console.error('Mobile wallet connection error:', error);
      return null;
    }
  }

  // Get balance using viem
  async getBalance(address: string): Promise<string> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    try {
      const balance = await this.publicClient.getBalance({
        address: address as `0x${string}`,
      });
      return formatEther(balance);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0';
    }
  }

  // Send transaction using viem
  async sendTransaction(to: string, value: string): Promise<string | null> {
    if (!this.walletClient || !this.currentAccount) {
      throw new Error('Wallet client not available or not connected');
    }

    try {
      const hash = await this.walletClient.sendTransaction({
        account: this.currentAccount as `0x${string}`,
        to: to as `0x${string}`,
        value: parseEther(value),
      });

      console.log('Transaction sent:', hash);
      return hash;
    } catch (error) {
      console.error('Transaction failed:', error);
      return null;
    }
  }

  // Sign message using viem
  async signMessage(message: string): Promise<string | null> {
    if (!this.walletClient || !this.currentAccount) {
      throw new Error('Wallet client not available or not connected');
    }

    try {
      const signature = await this.walletClient.signMessage({
        account: this.currentAccount as `0x${string}`,
        message,
      });

      console.log('Message signed:', signature);
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }

  // Get current network using viem
  async getChain() {
    if (!this.publicClient) {
      return null;
    }

    try {
      return this.publicClient.chain;
    } catch (error) {
      console.error('Failed to get chain:', error);
      return null;
    }
  }

  // Get current account
  getCurrentAccount(): string | null {
    return this.currentAccount;
  }

  // Disconnect wallet
  disconnect() {
    this.walletClient = null;
    this.currentAccount = null;
    console.log('Wallet disconnected');
  }
}
