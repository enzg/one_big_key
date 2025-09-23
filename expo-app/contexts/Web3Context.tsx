// Web3 Context using ethers.js - React Native compatible
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import { Web3Provider } from '../utils/web3Provider';

interface Web3ContextType {
  provider: Web3Provider | null;
  isConnected: boolean;
  account: string | null;
  balance: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  isInitializing: boolean;
}

const Web3Context = createContext<Web3ContextType>({
  provider: null,
  isConnected: false,
  account: null,
  balance: '0',
  connect: async () => {},
  disconnect: () => {},
  isInitializing: false,
});

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3ContextProvider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [provider, setProvider] = useState<Web3Provider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    initializeProvider();
  }, []);

  const initializeProvider = async () => {
    try {
      setIsInitializing(true);
      console.log('Initializing Web3 provider...');

      const web3Provider = new Web3Provider();

      // Initialize with a public RPC endpoint
      // You can replace this with your own RPC URL (Alchemy, Infura, etc.)
      const initialized = await web3Provider.initializeProvider(
        'https://eth-mainnet.g.alchemy.com/v2/demo'
      );

      if (initialized) {
        setProvider(web3Provider);
        console.log('Web3 provider initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize Web3 provider:', error);
      Alert.alert('Error', 'Failed to initialize Web3 provider');
    } finally {
      setIsInitializing(false);
    }
  };

  const connect = async () => {
    if (!provider) {
      Alert.alert('Error', 'Web3 provider not initialized');
      return;
    }

    try {
      console.log('Connecting to OneKey wallet...');

      const address = await provider.connectToOneKey();

      if (address && address !== 'pending_connection') {
        setAccount(address);
        setIsConnected(true);

        // Get balance
        const userBalance = await provider.getBalance(address);
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
    setIsConnected(false);
    setAccount(null);
    setBalance('0');
    Alert.alert('Disconnected', 'Successfully disconnected from wallet');
  };

  const value: Web3ContextType = {
    provider,
    isConnected,
    account,
    balance,
    connect,
    disconnect,
    isInitializing,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
