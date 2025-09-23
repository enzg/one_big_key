import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import { walletConnectProviderOpts } from '../utils/walletConnectConfig';

interface WalletConnectContextType {
  provider: any | null;
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  walletName: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isInitializing: boolean;
}

const WalletConnectContext = createContext<WalletConnectContextType>({
  provider: null,
  isConnected: false,
  account: null,
  chainId: null,
  walletName: null,
  connect: async () => {},
  disconnect: async () => {},
  isInitializing: false,
});

export const useWalletConnect = () => {
  const context = useContext(WalletConnectContext);
  if (!context) {
    throw new Error('useWalletConnect must be used within a WalletConnectProvider');
  }
  return context;
};

interface WalletConnectProviderProps {
  children: ReactNode;
}

export const WalletConnectProvider: React.FC<WalletConnectProviderProps> = ({ children }) => {
  const [provider, setProvider] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Lazy initialization - only initialize when this context is actually used
  useEffect(() => {
    // Don't auto-initialize to avoid conflicts with AppKit
    // Only initialize when connect() is called
  }, []);

  const detectWalletFromSession = (provider: any) => {
    try {
      // Check if we have session metadata
      const session = provider.session;
      if (session && session.peer && session.peer.metadata) {
        const peerName = session.peer.metadata.name;
        console.log('🔍 Detected wallet from session metadata:', peerName);

        // Map common wallet names
        if (peerName.toLowerCase().includes('onekey')) {
          return 'OneKey';
        } else if (peerName.toLowerCase().includes('metamask')) {
          return 'MetaMask';
        } else if (peerName.toLowerCase().includes('trust')) {
          return 'Trust Wallet';
        } else if (peerName.toLowerCase().includes('coinbase')) {
          return 'Coinbase Wallet';
        } else if (peerName.toLowerCase().includes('rainbow')) {
          return 'Rainbow';
        } else if (peerName.toLowerCase().includes('argent')) {
          return 'Argent';
        } else if (peerName.toLowerCase().includes('imtoken')) {
          return 'imToken';
        } else if (peerName.toLowerCase().includes('tokenpocket')) {
          return 'TokenPocket';
        } else if (peerName.toLowerCase().includes('safepal')) {
          return 'SafePal';
        } else {
          // Return the original name if no mapping found
          return peerName;
        }
      }

      // Fallback: try to detect from provider properties
      if (provider.connector && provider.connector.peerMeta) {
        const peerName = provider.connector.peerMeta.name;
        console.log('🔍 Detected wallet from connector metadata:', peerName);
        return peerName;
      }

      return null;
    } catch (error) {
      console.error('Error detecting wallet from session:', error);
      return null;
    }
  };

  const initializeProvider = async () => {
    try {
      setIsInitializing(true);
      console.log('Initializing WalletConnect provider...');

      // Polyfills are loaded in _layout.tsx
      console.log('Initializing with industry-standard polyfills...');

      // Mock network connectivity for WalletConnect (avoid read-only property error)
      if (global.navigator && !Object.getOwnPropertyDescriptor(global.navigator, 'onLine')?.configurable) {
        try {
          global.navigator.onLine = true;
        } catch (error) {
          console.log('Navigator.onLine is read-only, skipping assignment');
        }
      }

      // Dynamically import to avoid initial module loading issues
      const { default: EthereumProvider } = await import('@walletconnect/ethereum-provider');

      const ethereumProvider = await EthereumProvider.init({
        ...walletConnectProviderOpts,
        // Additional options to prevent network detection issues
        disableProviderPing: true,
        // @ts-ignore - internal option to skip network checks
        skipNetworkCheck: true,
      });

      setProvider(ethereumProvider);

      // Set up event listeners for real-time state updates
      ethereumProvider.on('accountsChanged', (accounts: string[]) => {
        console.log('🔄 Accounts changed:', accounts);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);

          // Detect wallet name from session
          const detectedWalletName = detectWalletFromSession(ethereumProvider);
          setWalletName(detectedWalletName);

          console.log('✅ Wallet connected via accountsChanged:', accounts[0]);
          console.log('🔍 Detected wallet:', detectedWalletName);

          Alert.alert(
            'Connected!',
            `Successfully connected to ${detectedWalletName || 'wallet'}: ${accounts[0].slice(0, 8)}...${accounts[0].slice(-6)}`
          );
        } else {
          setAccount(null);
          setIsConnected(false);
          setWalletName(null);
          console.log('❌ Wallet disconnected via accountsChanged');
        }
      });

      ethereumProvider.on('chainChanged', (chainId: string) => {
        console.log('🔄 Chain changed:', chainId);
        setChainId(parseInt(chainId, 16));
      });

      ethereumProvider.on('disconnect', () => {
        console.log('🔄 WalletConnect disconnected');
        setIsConnected(false);
        setAccount(null);
        setChainId(null);
        setWalletName(null);
        Alert.alert('Disconnected', 'Wallet has been disconnected');
      });

      // Additional event for connection establishment
      ethereumProvider.on('connect', (info: { chainId: string }) => {
        console.log('🔄 WalletConnect connected:', info);
        setChainId(parseInt(info.chainId, 16));

        // Force check provider state on connect event
        setTimeout(() => {
          console.log('🔍 Checking provider state after connect event:');
          const detectedWalletName = detectWalletFromSession(ethereumProvider);
          console.log('🔍 Provider accounts:', ethereumProvider.accounts);
          console.log('🔍 Provider connected:', ethereumProvider.connected);
          console.log('🔍 Detected wallet name:', detectedWalletName);

          if (ethereumProvider.accounts?.length > 0 && !account) {
            console.log('🔧 Connect event: Force syncing provider state');
            setAccount(ethereumProvider.accounts[0]);
            setIsConnected(true);
            setWalletName(detectedWalletName);
          }
        }, 1000);
      });

      // Session update events
      ethereumProvider.on('session_event', (event: any) => {
        console.log('🔄 Session event:', event);
      });

      ethereumProvider.on('session_update', ({ accounts, chainId }: any) => {
        console.log('🔄 Session update:', { accounts, chainId });
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          setChainId(chainId);

          // Detect wallet name from updated session
          const detectedWalletName = detectWalletFromSession(ethereumProvider);
          setWalletName(detectedWalletName);
        }
      });

      // Check if already connected
      if (ethereumProvider.accounts?.length > 0) {
        setAccount(ethereumProvider.accounts[0]);
        setIsConnected(true);
        setChainId(ethereumProvider.chainId);

        // Detect wallet name from existing session
        const detectedWalletName = detectWalletFromSession(ethereumProvider);
        setWalletName(detectedWalletName);
      }

      console.log('WalletConnect provider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WalletConnect provider:', error);
      Alert.alert('Error', 'Failed to initialize WalletConnect');
    } finally {
      setIsInitializing(false);
    }
  };

  const connect = async () => {
    if (!provider) {
      console.log('Provider not initialized, initializing now...');
      await initializeProvider();
      if (!provider) {
        Alert.alert('Error', 'Failed to initialize WalletConnect provider');
        return;
      }
    }

    try {
      console.log('Connecting to WalletConnect...');
      console.log('Provider state:', {
        connected: provider.connected,
        accounts: provider.accounts,
        chainId: provider.chainId,
      });

      // Enable the provider (this should trigger deep linking to OneKey app on mobile)
      console.log('Calling provider.enable()...');
      console.log('Platform:', Platform.OS);

      // For React Native, we need to handle the connection differently
      console.log('Starting WalletConnect connection...');

      let accounts;

      if (Platform.OS !== 'web') {
        // Create a session and get the URI for mobile
        const uri = await new Promise((resolve, reject) => {
          provider.on('display_uri', (uri) => {
            console.log('🔗 WalletConnect URI generated:', uri);
            console.log('🔗 URI length:', uri.length);
            console.log('🔗 URI starts with:', uri.substring(0, 50));
            resolve(uri);
          });

          // Monitor connection proposal events
          provider.on('session_proposal', (proposal) => {
            console.log('🔔 Session proposal created:', proposal);
          });

          provider.on('session_approve', (approval) => {
            console.log('✅ Session approved:', approval);
          });

          provider.on('session_reject', (rejection) => {
            console.log('❌ Session rejected:', rejection);
          });

          // Try to enable and catch the URI from display_uri event
          provider.enable().catch(reject);

          // Timeout if no URI is received
          setTimeout(() => reject(new Error('No connection URI received')), 15000); // Increase timeout
        });

        console.log('Got WalletConnect URI, opening with OneKey...');

        // First, test some known schemes to verify Linking.canOpenURL works
        console.log('Testing platform and Linking.canOpenURL functionality...');
        const testSchemes = ['https://apple.com', 'tel://', 'mailto://'];
        for (const testScheme of testSchemes) {
          const canOpen = await Linking.canOpenURL(testScheme);
          console.log(`Test scheme ${testScheme}: ${canOpen}`);
        }

        // Try mobile app URL schemes only (avoid web URLs that open browser)
        // Also try some generic WalletConnect schemes
        const onekeySchemes = [
          'onekey-wallet://',
          'onekey://',
          'com.onekey.app.wallet://',
          'so.onekey.app.wallet://',
          'onekey-app://',
          'onekeywallet://',
          'OneKeyWallet://',
          'onekey.so.app.wallet://',
          // Try WalletConnect generic schemes
          'wc://',
          'walletconnect://',
          // Try some common variations
          'onekey-ios://',
          'OneKey://'
        ];

        let canOpenOneKey = false;
        let workingScheme = null;

        for (const scheme of onekeySchemes) {
          console.log(`Testing OneKey scheme: ${scheme}`);
          const canOpen = await Linking.canOpenURL(scheme);
          console.log(`Can open ${scheme}: ${canOpen}`);

          if (canOpen) {
            canOpenOneKey = true;
            workingScheme = scheme;
            break;
          }
        }

        if (canOpenOneKey && workingScheme) {
          let onekeyUri;

          // Format URI differently based on scheme type
          if (workingScheme.startsWith('https://')) {
            // For web scheme, use a different parameter format
            onekeyUri = `${workingScheme}?wc=${encodeURIComponent(uri)}`;
          } else {
            // For app schemes, use the standard format
            onekeyUri = `${workingScheme}wc?uri=${encodeURIComponent(uri)}`;
          }

          console.log(`Opening OneKey with working scheme: ${workingScheme}`);
          console.log(`Final OneKey URI: ${onekeyUri}`);

          try {
            await Linking.openURL(onekeyUri);
            console.log('Successfully opened OneKey app with WalletConnect URI');
          } catch (error) {
            console.error('Failed to open OneKey app:', error);
            Alert.alert(
              'Connection Error',
              'Could not open OneKey app. Please scan this URI manually:\n\n' + uri,
              [{ text: 'OK' }]
            );
          }
        } else {
          console.log('OneKey mobile app not detected with any known scheme');
          console.log('This likely means OneKey app is not installed or URL schemes not registered');
          console.log('WalletConnect URI:', uri);

          Alert.alert(
            'OneKey App Required',
            'OneKey mobile app was not detected on this device.\n\n' +
            'Options:\n' +
            '1. Install OneKey mobile app from App Store\n' +
            '2. Copy the connection URI below and paste it in OneKey app\n\n' +
            'Connection URI:\n' + uri,
            [
              { text: 'Copy URI', onPress: () => {
                console.log('User chose to copy URI:', uri);
                // In a real app, you'd use Clipboard.setString(uri)
              }},
              { text: 'App Store', onPress: () => {
                Linking.openURL('https://apps.apple.com/app/onekey-open-source-wallet/id1609559473');
              }},
              { text: 'OK' }
            ]
          );
        }

        // Don't wait for provider.enable() on mobile - let event listeners handle state updates
        console.log('Mobile connection initiated. Waiting for user approval in OneKey app...');
        console.log('Connection state will be updated automatically via event listeners.');

        // Start aggressive monitoring during connection attempt
        const connectionTimeout = setTimeout(() => {
          console.log('⏰ Connection timeout reached, checking provider state...');
          checkProviderState();
        }, 5000); // Check after 5 seconds

        // Start the connection process but don't wait for it
        provider.enable()
          .then((accounts: string[]) => {
            clearTimeout(connectionTimeout);
            console.log('✅ Mobile provider.enable() resolved:', accounts);
            if (accounts && accounts.length > 0 && !account) {
              console.log('🔧 Mobile enable() success: Force syncing provider state');
              const detectedWalletName = detectWalletFromSession(provider);
              setAccount(accounts[0]);
              setIsConnected(true);
              setChainId(provider.chainId);
              setWalletName(detectedWalletName);
            }
          })
          .catch((error: any) => {
            clearTimeout(connectionTimeout);
            if (!error.message?.includes('User rejected') && !error.message?.includes('Proposal expired')) {
              console.error('Connection error:', error);
            } else {
              console.log('⏰ Connection proposal expired or rejected:', error.message);
            }
          });
      } else {
        // Web flow - can wait for immediate result
        accounts = await provider.enable();
        console.log('provider.enable() returned:', accounts);

        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          setChainId(provider.chainId);
          console.log('Connected to wallet:', accounts[0]);

          Alert.alert(
            'Connected!',
            `Successfully connected to wallet: ${accounts[0].slice(0, 8)}...${accounts[0].slice(-6)}`
          );
        }
      }
    } catch (error: any) {
      console.error('Failed to connect:', error);
      if (error.message && !error.message.includes('User rejected')) {
        Alert.alert('Connection Error', error.message || 'Failed to connect to wallet');
      }
    }
  };

  const disconnect = async () => {
    if (!provider) return;

    try {
      console.log('Disconnecting from WalletConnect...');
      await provider.disconnect();
      setIsConnected(false);
      setAccount(null);
      setChainId(null);
      setWalletName(null);

      Alert.alert('Disconnected', 'Successfully disconnected from wallet');
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      Alert.alert('Error', 'Failed to disconnect from wallet');
    }
  };

  const checkProviderState = () => {
    if (!provider) {
      console.log('No provider available');
      return;
    }

    console.log('🔍 Current provider state:', {
      connected: provider.connected,
      accounts: provider.accounts,
      chainId: provider.chainId,
      isWalletConnect: provider.isWalletConnect,
      session: provider.session ? 'exists' : 'null'
    });

    // Force sync state if provider shows connection but we don't
    if (provider.connected && provider.accounts?.length > 0 && !isConnected) {
      console.log('🔧 Periodic check: Force syncing provider state to React state');
      const detectedWalletName = detectWalletFromSession(provider);
      setAccount(provider.accounts[0]);
      setIsConnected(true);
      setChainId(provider.chainId);
      setWalletName(detectedWalletName);

      Alert.alert(
        'Connected!',
        `Successfully connected to ${detectedWalletName || 'wallet'}: ${provider.accounts[0].slice(0, 8)}...${provider.accounts[0].slice(-6)}`
      );
    }
  };

  // Check provider state very frequently to catch connections
  useEffect(() => {
    if (provider) {
      console.log('🔄 Setting up frequent state monitoring...');
      const interval = setInterval(checkProviderState, 500); // Check every 500ms
      return () => clearInterval(interval);
    }
  }, [provider, isConnected]);

  // Add additional monitoring during connection attempts
  useEffect(() => {
    if (provider) {
      console.log('🔄 Setting up connection-specific event monitoring...');

      // Monitor all possible events
      const events = [
        'connect',
        'disconnect',
        'accountsChanged',
        'chainChanged',
        'session_update',
        'session_event',
        'session_approve',
        'session_reject',
        'session_ping',
        'session_request',
        'proposal_approve',
        'proposal_reject'
      ];

      events.forEach(eventName => {
        provider.on(eventName, (...args: any[]) => {
          console.log(`🔄 Event '${eventName}' fired:`, args);
        });
      });

      return () => {
        events.forEach(eventName => {
          provider.removeAllListeners(eventName);
        });
      };
    }
  }, [provider]);

  const value: WalletConnectContextType = {
    provider,
    isConnected,
    account,
    chainId,
    walletName,
    connect,
    disconnect,
    isInitializing,
  };

  return <WalletConnectContext.Provider value={value}>{children}</WalletConnectContext.Provider>;
};
