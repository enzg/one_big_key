// Multi-chain configuration for Ethereum + Solana support

export const CHAIN_CONFIG = {
  // Ethereum chains
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    nativeCurrency: 'ETH',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    type: 'evm'
  },
  // Solana chains
  solana: {
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // Solana mainnet
    name: 'Solana',
    nativeCurrency: 'SOL',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    type: 'solana'
  },
  solanaDevnet: {
    chainId: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    name: 'Solana Devnet',
    nativeCurrency: 'SOL',
    rpcUrl: 'https://api.devnet.solana.com',
    type: 'solana'
  }
};

export const walletConnectConfigMultiChain = {
  projectId: 'e4fe200bc71de910471de92e24f00e53',

  // Ethereum chains
  chains: [1], // Ethereum mainnet
  optionalChains: [1, 56, 137], // EVM chains

  // Solana chains (using CAIP-2 format)
  optionalNamespaces: {
    solana: {
      chains: [
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // Solana mainnet
        'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'  // Solana devnet
      ],
      methods: [
        'solana_signTransaction',
        'solana_signMessage',
        'solana_signAndSendTransaction',
        'solana_requestAccounts',
        'solana_getBalance'
      ],
      events: ['accountsChanged', 'chainChanged']
    }
  },

  // Ethereum methods
  methods: [
    'eth_sendTransaction',
    'eth_signTransaction',
    'eth_sign',
    'personal_sign',
    'eth_signTypedData',
    'eth_getBalance'
  ],

  metadata: {
    name: 'OneKey Multi-Chain Demo',
    description: 'Ethereum + Solana wallet integration',
    url: 'http://192.168.110.155:8081',
    icons: ['https://onekey.so/favicon.ico']
  }
};