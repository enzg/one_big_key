import EthereumProvider from '@walletconnect/ethereum-provider';

export class WalletOperations {
  private provider: EthereumProvider;

  constructor(provider: EthereumProvider) {
    this.provider = provider;
  }

  // Get account balance
  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      return (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4);
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  // Send a transaction
  async sendTransaction(to: string, value: string, data?: string): Promise<string> {
    try {
      const accounts = await this.provider.request({
        method: 'eth_requestAccounts',
      });

      const txHash = await this.provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: accounts[0],
            to,
            value: `0x${(parseFloat(value) * Math.pow(10, 18)).toString(16)}`, // Convert ETH to wei
            data: data || '0x',
          },
        ],
      });

      return txHash;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  }

  // Sign a message
  async signMessage(message: string): Promise<string> {
    try {
      const accounts = await this.provider.request({
        method: 'eth_requestAccounts',
      });

      const signature = await this.provider.request({
        method: 'personal_sign',
        params: [message, accounts[0]],
      });

      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  // Get current network
  async getNetwork(): Promise<number> {
    try {
      const chainId = await this.provider.request({
        method: 'eth_chainId',
      });
      return parseInt(chainId, 16);
    } catch (error) {
      console.error('Failed to get network:', error);
      throw error;
    }
  }

  // Switch network
  async switchNetwork(chainId: number): Promise<void> {
    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  }

  // Get transaction receipt
  async getTransactionReceipt(txHash: string): Promise<any> {
    try {
      const receipt = await this.provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });
      return receipt;
    } catch (error) {
      console.error('Failed to get transaction receipt:', error);
      throw error;
    }
  }

  // Estimate gas for a transaction
  async estimateGas(to: string, value: string, data?: string): Promise<string> {
    try {
      const accounts = await this.provider.request({
        method: 'eth_requestAccounts',
      });

      const gasEstimate = await this.provider.request({
        method: 'eth_estimateGas',
        params: [
          {
            from: accounts[0],
            to,
            value: `0x${(parseFloat(value) * Math.pow(10, 18)).toString(16)}`,
            data: data || '0x',
          },
        ],
      });

      return parseInt(gasEstimate, 16).toString();
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      throw error;
    }
  }
}
