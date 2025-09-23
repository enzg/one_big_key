// Viem Context - Modern React Native compatible Web3 solution
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import { ViemProvider } from '../utils/viemProvider';

interface ViemContextType {
  viemProvider: ViemProvider | null;
  isConnected: boolean;
  account: string | null;
  balance: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  isInitializing: boolean;
}

const ViemContext = createContext<ViemContextType>({
  viemProvider: null,
  isConnected: false,
  account: null,
  balance: '0',
  connect: async () => {},
  disconnect: () => {},
  isInitializing: false,
});

export const useViem = () => {
  const context = useContext(ViemContext);
  if (!context) {
    throw new Error('useViem must be used within a ViemProvider');
  }
  return context;
};

interface ViemProviderProps {
  children: ReactNode;
}

export const ViemContextProvider: React.FC<ViemProviderProps> = ({ children }) => {
  const [viemProvider, setViemProvider] = useState<ViemProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    initializeProvider();
  }, []);

  const initializeProvider = async () => {
    // Only initialize Viem provider on web platform
    // Mobile should use Reown AppKit for wallet connections
    if (Platform.OS !== 'web') {
      console.log('Skipping Viem provider initialization on mobile - using Reown AppKit instead');
      setIsInitializing(false);
      return;
    }

    try {
      setIsInitializing(true);
      console.log('Initializing Viem provider for web...');

      const provider = new ViemProvider();

      // Initialize with a public RPC endpoint
      // You can replace this with your own RPC URL (Alchemy, Infura, etc.)
      const initialized = await provider.initializeProvider(
        'https://eth-mainnet.g.alchemy.com/v2/demo'
      );

      if (initialized) {
        setViemProvider(provider);
        console.log('Viem provider initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize Viem provider:', error);
      Alert.alert('Error', 'Failed to initialize Web3 provider');
    } finally {
      setIsInitializing(false);
    }
  };

  const connect = async () => {
    if (!viemProvider) {
      Alert.alert('Error', 'Viem provider not initialized');
      return;
    }

    try {
      console.log('Connecting to OneKey wallet...');

      const address = await viemProvider.connectToOneKey();

      if (address && address !== 'pending_connection') {
        setAccount(address);
        setIsConnected(true);

        // Get balance
        const userBalance = await viemProvider.getBalance(address);
        setBalance(userBalance);

        Alert.alert(
          'Connected!',
          `Successfully connected: ${address.slice(0, 8)}...${address.slice(-6)}`
        );
      } else if (address === 'pending_connection') {
        Alert.alert('Connection Pending', 'Please approve the connection in OneKey app');
      }
    } catch (error: any) {
      console.error('Failed to connect:', error);
      Alert.alert('Connection Error', error.message || 'Failed to connect to wallet');
    }
  };

  const disconnect = () => {
    if (viemProvider) {
      viemProvider.disconnect();
    }
    setIsConnected(false);
    setAccount(null);
    setBalance('0');
    Alert.alert('Disconnected', 'Successfully disconnected from wallet');
  };

  const value: ViemContextType = {
    viemProvider,
    isConnected,
    account,
    balance,
    connect,
    disconnect,
    isInitializing,
  };

  return <ViemContext.Provider value={value}>{children}</ViemContext.Provider>;
};
