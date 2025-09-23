// Viem v2 + WalletConnect v2 Integration
// This combines the best of both: viem's modern API with WalletConnect's mobile connectivity

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
import { Platform } from 'react-native';

export class ViemWalletConnectProvider {
  private publicClient: PublicClient | null = null;
  private walletClient: WalletClient | null = null;
  private wcProvider: any = null;
  private currentAccount: string | null = null;
  private balance: string = '0';

  // Initialize viem public client for reading blockchain data
  async initializePublicClient(rpcUrl: string = 'https://eth-mainnet.g.alchemy.com/v2/demo') {
    try {
      this.publicClient = createPublicClient({
        chain: mainnet,
        transport: http(rpcUrl),
      });
      console.log('Viem public client initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize viem public client:', error);
      return false;
    }
  }

  // Set WalletConnect provider and create viem wallet client
  setWalletConnectProvider(wcProvider: any, account: string | null) {
    this.wcProvider = wcProvider;
    this.currentAccount = account;

    if (wcProvider && account) {
      // Create viem wallet client using WalletConnect as transport
      this.walletClient = createWalletClient({
        chain: mainnet,
        transport: custom(wcProvider),
        account: account as `0x${string}`,
      });
      console.log('Viem wallet client created with WalletConnect transport');
    } else {
      this.walletClient = null;
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
      const formattedBalance = formatEther(balance);
      this.balance = formattedBalance;
      return formattedBalance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0';
    }
  }

  // Send transaction using viem + WalletConnect
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

      console.log('Transaction sent via viem + WalletConnect:', hash);
      return hash;
    } catch (error) {
      console.error('Transaction failed:', error);
      return null;
    }
  }

  // Sign message using viem + WalletConnect
  async signMessage(message: string): Promise<string | null> {
    if (!this.walletClient || !this.currentAccount) {
      throw new Error('Wallet client not available or not connected');
    }

    try {
      const signature = await this.walletClient.signMessage({
        account: this.currentAccount as `0x${string}`,
        message,
      });

      console.log('Message signed via viem + WalletConnect:', signature);
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

  // Get current balance
  getCurrentBalance(): string {
    return this.balance;
  }

  // Check if connected
  isConnected(): boolean {
    return !!(this.walletClient && this.currentAccount);
  }

  // Disconnect
  disconnect() {
    this.walletClient = null;
    this.currentAccount = null;
    this.wcProvider = null;
    this.balance = '0';
    console.log('Viem + WalletConnect disconnected');
  }
}
