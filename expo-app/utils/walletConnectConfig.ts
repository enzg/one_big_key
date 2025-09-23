// Polyfills are loaded in _layout.tsx

export const walletConnectProjectId = 'e4fe200bc71de910471de92e24f00e53'; // You should get this from walletconnect.com

export const walletConnectMetadata = {
  name: 'OneKey Integration Demo',
  description: 'Demo app for OneKey wallet integration',
  url: `http://192.168.110.155:8081`, // Match the actual development URL
  icons: ['https://onekey.so/favicon.ico'],
  redirect: {
    native: 'onekeyintegration://',
    universal: `http://192.168.110.155:8081`,
  },
};

export const walletConnectProviderOpts = {
  projectId: walletConnectProjectId,

  // Ethereum chains (EIP-155 namespace)
  chains: [1], // Ethereum mainnet
  optionalChains: [1, 56, 137], // Ethereum, BSC, Polygon

  // Solana chains (Solana namespace)
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
      events: ['accountsChanged', 'chainChanged'],
      rpcMap: {
        '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'https://api.mainnet-beta.solana.com',
        'EtWTRABZaYq6iMfeYKouRu166VU2xqa1': 'https://api.devnet.solana.com'
      }
    }
  },

  // Ethereum methods (EIP-155 namespace)
  methods: [
    'eth_sendTransaction',
    'eth_signTransaction',
    'eth_sign',
    'personal_sign',
    'eth_signTypedData',
    'eth_signTypedData_v4',
    'eth_sendRawTransaction',
    'eth_getBalance',
    'eth_getTransactionCount',
    'eth_getTransactionReceipt',
    'eth_estimateGas',
    'eth_gasPrice',
    'eth_blockNumber',
    'eth_getBlockByNumber',
    'eth_getCode',
    'eth_call',
    'eth_getLogs',
    'net_version',
    'web3_clientVersion',
  ],

  events: ['chainChanged', 'accountsChanged', 'disconnect', 'connect'],
  metadata: {
    ...walletConnectMetadata,
    name: 'OneKey Multi-Chain Demo',
    description: 'Ethereum + Solana wallet integration'
  },

  // Disable QR modal for React Native
  showQrModal: false,
  // React Native specific options
  disableProviderPing: true,
  relayUrl: 'wss://relay.walletconnect.com',

  // RPC endpoints for different chains
  rpcMap: {
    1: 'https://eth-mainnet.g.alchemy.com/v2/demo', // Ethereum mainnet
    56: 'https://bsc-dataseed.binance.org', // BSC
    137: 'https://polygon-rpc.com' // Polygon
  },
};
