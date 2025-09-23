// Chain detection and utilities

export type ChainType = 'ethereum' | 'solana' | 'unknown';

export function detectChainType(chainId: string | number): ChainType {
  if (typeof chainId === 'number') {
    // EVM chains use numeric chain IDs
    return 'ethereum';
  }

  if (typeof chainId === 'string') {
    if (chainId.startsWith('solana:')) {
      return 'solana';
    }
    // Could be hex ethereum chain ID
    if (chainId.startsWith('0x')) {
      return 'ethereum';
    }
  }

  return 'unknown';
}

export function getChainDisplayName(chainId: string | number): string {
  const chainType = detectChainType(chainId);

  if (chainType === 'ethereum') {
    switch (chainId) {
      case 1: return 'Ethereum';
      case 56: return 'BSC';
      case 137: return 'Polygon';
      default: return 'Ethereum Network';
    }
  }

  if (chainType === 'solana') {
    if (typeof chainId === 'string') {
      if (chainId.includes('5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')) return 'Solana Mainnet';
      if (chainId.includes('EtWTRABZaYq6iMfeYKouRu166VU2xqa1')) return 'Solana Devnet';
    }
    return 'Solana Network';
  }

  return 'Unknown Network';
}

export function getNativeCurrency(chainId: string | number): string {
  const chainType = detectChainType(chainId);

  if (chainType === 'ethereum') {
    switch (chainId) {
      case 1: return 'ETH';
      case 56: return 'BNB';
      case 137: return 'MATIC';
      default: return 'ETH';
    }
  }

  if (chainType === 'solana') {
    return 'SOL';
  }

  return 'TOKEN';
}

export async function getMultiChainBalance(
  address: string,
  chainId: string | number,
  provider: any
): Promise<string> {
  const chainType = detectChainType(chainId);

  try {
    if (chainType === 'ethereum') {
      // Use existing Viem/Web3 logic
      const balance = await provider.getBalance(address);
      return formatEthereumBalance(balance);
    }

    if (chainType === 'solana') {
      // Would need Solana Web3.js integration
      const balance = await getSolanaBalance(address, provider);
      return formatSolanaBalance(balance);
    }

    return '0';
  } catch (error) {
    console.error('Failed to get balance:', error);
    return '0';
  }
}

function formatEthereumBalance(balance: bigint): string {
  // Convert from wei to ETH
  return (Number(balance) / 1e18).toFixed(4);
}

function formatSolanaBalance(balance: number): string {
  // Convert from lamports to SOL
  return (balance / 1e9).toFixed(4);
}

async function getSolanaBalance(address: string, provider: any): Promise<number> {
  try {
    console.log('Getting Solana balance for:', address);

    // Import Solana Web3.js
    const { Connection, PublicKey } = await import('@solana/web3.js');

    // Determine RPC endpoint based on the provider's chain
    let rpcUrl = 'https://api.mainnet-beta.solana.com';
    if (provider && provider.chainId) {
      if (provider.chainId.includes('devnet')) {
        rpcUrl = 'https://api.devnet.solana.com';
      }
    }

    // Create connection to Solana
    const connection = new Connection(rpcUrl, 'confirmed');

    // Get balance
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);

    console.log('Solana balance (lamports):', balance);
    return balance;
  } catch (error) {
    console.error('Error getting Solana balance:', error);
    return 0;
  }
}