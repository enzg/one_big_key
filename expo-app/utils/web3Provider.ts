// React Native compatible Web3 provider using ethers.js
// ethers.js v6 has better React Native support than web3.js

import { ethers } from 'ethers';
import { Platform, Linking } from 'react-native';

// OneKey deep link configuration
const ONEKEY_DEEP_LINK = {
  scheme: 'onekey-wallet://',
  appStoreUrl: 'https://apps.apple.com/app/onekey-open-source-wallet/id1609559473',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=so.onekey.app.wallet',
};

export class Web3Provider {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  // Initialize with a custom RPC provider for React Native
  async initializeProvider(rpcUrl: string = 'https://eth-mainnet.g.alchemy.com/v2/demo') {
    try {
      // Use JsonRpcProvider for React Native compatibility
      const jsonRpcProvider = new ethers.JsonRpcProvider(rpcUrl);
      this.provider = jsonRpcProvider as any;
      console.log('Web3 provider initialized with RPC:', rpcUrl);
      return true;
    } catch (error) {
      console.error('Failed to initialize provider:', error);
      return false;
    }
  }

  // Connect to OneKey wallet using deep linking
  async connectToOneKey(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // On web, use EIP-6963 to detect OneKey
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
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);

        if (accounts.length > 0) {
          this.provider = provider;
          this.signer = await provider.getSigner();
          console.log('Connected to web wallet:', accounts[0]);
          return accounts[0];
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

        // Note: In a real implementation, you would use WalletConnect v2 or
        // a custom deep linking protocol to get the wallet address back
        // For now, this opens the app for manual connection
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

  // Get balance using ethers.js
  async getBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0';
    }
  }

  // Send transaction (simplified)
  async sendTransaction(to: string, value: string): Promise<string | null> {
    if (!this.signer) {
      throw new Error('Signer not available');
    }

    try {
      const tx = await this.signer.sendTransaction({
        to,
        value: ethers.parseEther(value),
      });

      console.log('Transaction sent:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('Transaction failed:', error);
      return null;
    }
  }

  // Sign message
  async signMessage(message: string): Promise<string | null> {
    if (!this.signer) {
      throw new Error('Signer not available');
    }

    try {
      const signature = await this.signer.signMessage(message);
      console.log('Message signed:', signature);
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }

  // Get current network
  async getNetwork(): Promise<ethers.Network | null> {
    if (!this.provider) {
      return null;
    }

    try {
      return await this.provider.getNetwork();
    } catch (error) {
      console.error('Failed to get network:', error);
      return null;
    }
  }
}
