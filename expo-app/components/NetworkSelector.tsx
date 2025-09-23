// Simple network selector for testing multi-chain functionality
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { detectChainType, getChainDisplayName } from '../utils/chainUtils';

interface NetworkOption {
  chainId: string | number;
  name: string;
  type: 'ethereum' | 'solana';
  color: string;
  icon: string;
}

const NETWORK_OPTIONS: NetworkOption[] = [
  {
    chainId: 1,
    name: 'Ethereum',
    type: 'ethereum',
    color: '#627EEA',
    icon: '⟠'
  },
  {
    chainId: 56,
    name: 'BSC',
    type: 'ethereum',
    color: '#F3BA2F',
    icon: '🟡'
  },
  {
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    name: 'Solana',
    type: 'solana',
    color: '#9945FF',
    icon: '◎'
  },
  {
    chainId: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    name: 'Solana Devnet',
    type: 'solana',
    color: '#9945FF',
    icon: '◎'
  }
];

interface NetworkSelectorProps {
  currentChainId: string | number;
  onNetworkChange: (chainId: string | number) => void;
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  currentChainId,
  onNetworkChange
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌐 Select Network for Testing</Text>
      <Text style={styles.subtitle}>Choose a network to test multi-chain support</Text>

      <View style={styles.networkGrid}>
        {NETWORK_OPTIONS.map((network) => {
          const isSelected = network.chainId === currentChainId;

          return (
            <TouchableOpacity
              key={network.chainId.toString()}
              style={[
                styles.networkButton,
                isSelected && styles.selectedNetwork,
                { borderColor: network.color }
              ]}
              onPress={() => onNetworkChange(network.chainId)}
            >
              <Text style={styles.networkIcon}>{network.icon}</Text>
              <Text style={styles.networkName}>{network.name}</Text>
              <Text style={styles.networkType}>({network.type})</Text>
              {isSelected && (
                <View style={[styles.selectedIndicator, { backgroundColor: network.color }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.note}>
        Note: This selector simulates different networks for testing.
        Real wallet connections will use the network selected in the wallet app.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    textAlign: 'center',
  },
  networkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  networkButton: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  selectedNetwork: {
    borderWidth: 3,
  },
  networkIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  networkName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  networkType: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  note: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});