import { createAppKit, defaultWagmiConfig } from '@reown/appkit-wagmi-react-native';
import { mainnet, bsc } from 'viem/chains';
import { walletConnectProjectId } from '../utils/walletConnectConfig';

// Metadata
const metadata = {
  name: 'OneKey Multi-Chain Demo',
  description: 'Production-ready multi-chain wallet integration',
  url: 'http://192.168.110.155:8081',
  icons: ['https://onekey.so/favicon.ico'],
  redirect: {
    native: 'onekeyintegration://',
    universal: 'http://192.168.110.155:8081',
  },
};

// Create chains
const chains = [mainnet, bsc] as const;

// Setup Wagmi config using defaultWagmiConfig
export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId: walletConnectProjectId,
  metadata,
});

// Create AppKit instance with enhanced network resilience
createAppKit({
  projectId: walletConnectProjectId,
  wagmiConfig,
  defaultChain: mainnet,
  enableAnalytics: false, // Disable analytics to reduce conflicts
  metadata,
  enableWalletConnect: true,
  enableInjected: true, // Enable injected wallets (browser extensions)
  enableEIP6963: true, // Enable EIP-6963 for automatic wallet detection
  enableCoinbase: true, // Enable Coinbase Wallet
  // React Native specific modal configuration
  themeMode: 'light',
  themeVariables: {
    '--w3m-z-index': '999999'
  },
  // Enhanced configuration for React Native and web wallet detection
  allowUnsupportedChain: false,
  siweConfig: undefined, // Disable SIWE for now to avoid complexity
  // Platform-specific features
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // OneKey
    'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663bb28705e95034a', // MetaMask
  ],
  // Ensure proper wallet discovery
  enableOnramp: false,
  enableSwaps: false,
  // Add custom network configuration to help with connectivity
  allWallets: 'ONLY_EXTERNAL', // Only show external wallets to reduce conflicts
});