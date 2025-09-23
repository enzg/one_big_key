import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalletConnect } from '../contexts/WalletConnectContext';
import { useViem } from '../contexts/ViemContext';
import { detectChainType, getChainDisplayName, getNativeCurrency, getMultiChainBalance } from '../utils/chainUtils';
import { MultiChainWalletDisplay } from '../components/MultiChainWalletDisplay';
import { NetworkSelector } from '../components/NetworkSelector';

interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();

  // WalletConnect for mobile wallet connections
  const {
    isConnected: wcConnected,
    account: wcAccount,
    connect: wcConnect,
    disconnect: wcDisconnect,
    chainId: wcChainId,
    walletName: wcWalletName,
  } = useWalletConnect();

  // Viem for web connections
  const {
    viemProvider,
    isConnected: viemConnected,
    account: viemAccount,
    connect: viemConnect,
    disconnect: viemDisconnect,
    isInitializing: viemInitializing,
    balance: viemBalance,
  } = useViem();

  // Determine which provider is active
  const isConnected = Platform.OS === 'web' ? viemConnected : wcConnected;
  const account = Platform.OS === 'web' ? viemAccount : wcAccount;
  const isInitializing = Platform.OS === 'web' ? viemInitializing : false;

  const [onekeyProvider, setOnekeyProvider] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState('0');
  const [connectedWalletName, setConnectedWalletName] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<string | number>(1); // Default to Ethereum mainnet
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleProviderAnnouncement = (event: Event) => {
        const customEvent = event as CustomEvent<EIP6963ProviderDetail>;
        if (customEvent.detail?.info?.name === 'OneKey') {
          setOnekeyProvider(customEvent.detail.provider);
          console.log('OneKey provider detected:', customEvent.detail.info);
        }
      };

      window.addEventListener('eip6963:announceProvider', handleProviderAnnouncement);
      window.dispatchEvent(new Event('eip6963:requestProvider'));

      return () => {
        window.removeEventListener('eip6963:announceProvider', handleProviderAnnouncement);
      };
    }
  }, []);

  const detectConnectedWallet = () => {
    if (Platform.OS === 'web') {
      // For web, check which provider is being used
      if (window.ethereum) {
        if (window.ethereum.isMetaMask) {
          return 'MetaMask';
        } else if (window.ethereum.isOneKey) {
          return 'OneKey';
        } else if (window.ethereum.isRabby) {
          return 'Rabby';
        } else if (window.ethereum.isCoinbaseWallet) {
          return 'Coinbase Wallet';
        } else if (window.ethereum.isTrust) {
          return 'Trust Wallet';
        } else {
          return 'Browser Wallet';
        }
      }
      return 'Unknown Wallet';
    } else {
      // For mobile, use the detected wallet name from WalletConnect session
      return wcWalletName || 'Mobile Wallet';
    }
  };


  const handleNetworkChange = async (newChainId: string | number) => {
    console.log('🔄 Network change requested:', newChainId);
    setCurrentChainId(newChainId);

    // Update balance for new network
    if (account) {
      await getBalance(account, newChainId);
    }
  };

  const getBalance = async (address: string, chainId?: string | number) => {
    try {
      const targetChainId = chainId || currentChainId;
      console.log('Getting balance for address:', address, 'on chain:', targetChainId);

      if (Platform.OS === 'web' && viemProvider && viemConnected) {
        // Use viem for web (Ethereum only)
        const balance = await viemProvider.getBalance(address);
        console.log('Viem balance fetched:', balance);
        setBalance(balance);
      } else if (Platform.OS !== 'web' && wcConnected) {
        // For mobile, determine chain type and use appropriate method
        console.log('Current chain ID:', targetChainId);

        const chainType = detectChainType(targetChainId);
        console.log('Detected chain type:', chainType);

        if (chainType === 'ethereum') {
          // Use WalletConnect for Ethereum chains
          console.log('Fetching Ethereum balance via WalletConnect');
          setBalance('0.0000'); // Placeholder for now
        } else if (chainType === 'solana') {
          // Use Solana Web3.js for Solana chains
          console.log('Fetching Solana balance');
          const solanaBalance = await getMultiChainBalance(address, targetChainId, null);
          setBalance(solanaBalance);
        } else {
          console.log('Unknown chain type, using placeholder balance');
          setBalance('0.0000');
        }
      }
    } catch (error) {
      console.error('Failed to get balance:', error);
      setBalance('0.0000');
    }
  };

  const connectWallet = async () => {
    setConnectionStatus('connecting');
    setIsConnecting(true);

    if (Platform.OS !== 'web') {
      connectMobileWallet();
      return;
    }

    // For web, try viem first, then fallback to OneKey extension
    try {
      await viemConnect();
      setConnectionStatus('connected');
    } catch (error: any) {
      setConnectionStatus('failed');
      // Fallback to OneKey extension detection
      if (!onekeyProvider) {
        Alert.alert('OneKey Not Found', 'Please install OneKey browser extension first', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Download', onPress: openOneKeyDownload },
        ]);
      } else {
        Alert.alert('Connection Error', error.message || 'Failed to connect OneKey wallet');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const connectMobileWallet = async () => {
    setIsConnecting(true);
    setConnectionStatus('connecting');

    try {
      console.log('Connecting via WalletConnect...');
      await wcConnect();

      // Note: Don't set status to 'connected' here - let the WalletConnect events handle it
      // The accountsChanged event will set the proper status when connection succeeds

      // Get balance if connected
      if (wcAccount) {
        await getBalance(wcAccount);
      }
    } catch (error: any) {
      console.error('Error connecting via WalletConnect:', error);
      setConnectionStatus('failed');
      Alert.alert('Connection Failed',
        `Failed to connect to wallet: ${error.message || 'Unknown error'}`,
        [
          { text: 'Retry', onPress: () => setConnectionStatus('idle') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const openOneKeyDownload = () => {
    const url = Platform.select({
      ios: 'https://apps.apple.com/app/onekey-open-source-wallet/id1609559473',
      android: 'https://play.google.com/store/apps/details?id=so.onekey.app.wallet',
      default: 'https://onekey.so/',
    });
    Linking.openURL(url);
  };

  const disconnectWallet = async () => {
    if (Platform.OS === 'web' && viemConnected) {
      viemDisconnect();
    } else if (wcConnected) {
      await wcDisconnect();
    } else {
      setBalance('0');
      Alert.alert('Disconnected', 'Wallet disconnected successfully');
    }
  };

  // Get balance when account changes and detect wallet
  useEffect(() => {
    console.log('👀 Wallet state changed:', {
      platform: Platform.OS,
      viemAccount,
      viemConnected,
      wcAccount,
      wcConnected,
      isConnected,
      account
    });

    if (isConnected && account) {
      // Detect which wallet is connected
      const walletName = detectConnectedWallet();
      setConnectedWalletName(walletName);
      setConnectionStatus('connected');
      console.log('🔍 Detected wallet:', walletName);
      console.log('✅ Connection status updated to: connected');

      // Initialize chain ID from connected wallet
      if (Platform.OS === 'web') {
        setCurrentChainId(1); // Default to Ethereum for web
      } else if (wcChainId) {
        setCurrentChainId(wcChainId);
      }
    } else {
      setConnectedWalletName(null);
      if (connectionStatus === 'connected') {
        setConnectionStatus('idle');
        console.log('❌ Connection status updated to: idle (disconnected)');
      }
    }

    if (Platform.OS === 'web' && viemAccount && viemConnected) {
      getBalance(viemAccount);
    } else if (Platform.OS !== 'web' && wcAccount && wcConnected) {
      getBalance(wcAccount);
    } else if (Platform.OS !== 'web' && !wcConnected) {
      setBalance('0');
    }
  }, [viemAccount, viemConnected, wcAccount, wcConnected, wcWalletName, isConnected, account]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>🔑 Multi-Chain Wallet</Text>
        <Text style={styles.subtitle}>Ethereum + Solana Integration</Text>
      </View>

      {isConnected && account ? (
        <View style={styles.connectedContainer}>
          <NetworkSelector
            currentChainId={currentChainId}
            onNetworkChange={handleNetworkChange}
          />

          <MultiChainWalletDisplay
            account={account}
            chainId={currentChainId}
            balance={balance}
            connectedWalletName={connectedWalletName}
          />

          <TouchableOpacity style={styles.disconnectButton} onPress={disconnectWallet}>
            <Text style={styles.disconnectText}>🚪 Disconnect Wallet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.connectionContainer}>
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot,
              connectionStatus === 'connecting' ? styles.connectingDot :
              connectionStatus === 'connected' ? styles.connectedDot :
              connectionStatus === 'failed' ? styles.failedDot :
              styles.disconnectedDot
            ]} />
            <Text style={styles.statusText}>
              {connectionStatus === 'connecting' ? 'Connecting...' :
               connectionStatus === 'connected' ? `Connected to ${connectedWalletName || 'Wallet'}` :
               connectionStatus === 'failed' ? 'Connection Failed' :
               Platform.OS === 'web'
                ? viemProvider
                  ? 'Viem Ready'
                  : viemInitializing
                    ? 'Initializing...'
                    : 'Viem Not Ready'
                : 'WalletConnect Ready'}
            </Text>
          </View>

          {connectionStatus === 'failed' && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                ❌ Failed to connect to wallet. Please try again or check if OneKey app is installed.
              </Text>
            </View>
          )}

          {connectionStatus === 'connecting' && (
            <View style={styles.connectingContainer}>
              <Text style={styles.connectingText}>
                🔄 Opening OneKey app... Please approve the connection request.
              </Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              {Platform.OS === 'web' ? '🌐 Browser Extension' : '📱 Mobile App'}
            </Text>
            <Text style={styles.infoText}>
              {Platform.OS === 'web'
                ? 'Connect with OneKey browser extension for Ethereum chains using modern Viem v2'
                : 'Connect with OneKey or any multi-chain wallet using WalletConnect v2. Supports both Ethereum (ETH, BSC, Polygon) and Solana networks with automatic chain detection.'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.connectButton,
              isConnecting && styles.connectingButton,
              isInitializing && styles.disabledButton,
            ]}
            onPress={connectWallet}
            disabled={isConnecting || isInitializing}>
            <Text style={[styles.connectText, isInitializing && styles.disabledText]}>
              {isConnecting
                ? 'Connecting...'
                : isInitializing
                  ? 'Initializing...'
                  : 'Connect to OneKey'}
            </Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && !onekeyProvider && (
            <TouchableOpacity style={styles.downloadButton} onPress={openOneKeyDownload}>
              <Text style={styles.downloadText}>⬇️ Download OneKey Extension</Text>
            </TouchableOpacity>
          )}

          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.downloadButton} onPress={openOneKeyDownload}>
              <Text style={styles.downloadText}>⬇️ Get OneKey Mobile App</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  connectedDot: {
    backgroundColor: '#10b981',
  },
  connectingDot: {
    backgroundColor: '#f59e0b',
  },
  failedDot: {
    backgroundColor: '#ef4444',
  },
  disconnectedDot: {
    backgroundColor: '#64748b',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  connectedContainer: {
    alignItems: 'center',
  },
  accountCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  accountLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  accountAddress: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  balanceContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
  },
  disconnectButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  disconnectText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  connectionContainer: {
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  connectingButton: {
    backgroundColor: '#6366f1',
  },
  disabledButton: {
    backgroundColor: '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  connectText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#94a3b8',
  },
  downloadButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  downloadText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  connectingContainer: {
    backgroundColor: '#fffbeb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  connectingText: {
    color: '#d97706',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
});
