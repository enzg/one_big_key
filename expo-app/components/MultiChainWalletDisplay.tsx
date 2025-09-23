// Multi-chain wallet display component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { detectChainType, getChainDisplayName, getNativeCurrency } from '../utils/chainUtils';

interface MultiChainWalletDisplayProps {
  account: string;
  chainId: string | number;
  balance: string;
  connectedWalletName: string | null;
}

export const MultiChainWalletDisplay: React.FC<MultiChainWalletDisplayProps> = ({
  account,
  chainId,
  balance,
  connectedWalletName
}) => {
  const chainType = detectChainType(chainId);
  const chainName = getChainDisplayName(chainId);
  const currency = getNativeCurrency(chainId);

  const getChainIcon = () => {
    switch (chainType) {
      case 'ethereum': return '⟠';
      case 'solana': return '◎';
      default: return '🔗';
    }
  };

  const getChainColor = () => {
    switch (chainType) {
      case 'ethereum': return '#627EEA';
      case 'solana': return '#9945FF';
      default: return '#666';
    }
  };

  return (
    <View style={styles.container}>
      {/* Status Indicator */}
      <View style={styles.statusIndicator}>
        <View style={[styles.connectedDot, { backgroundColor: getChainColor() }]} />
        <Text style={styles.statusText}>
          {connectedWalletName ? `Connected to ${connectedWalletName}` : 'Connected'}
        </Text>
      </View>

      {/* Account Card */}
      <View style={styles.accountCard}>
        {/* Chain Info */}
        <View style={styles.chainHeader}>
          <Text style={styles.chainIcon}>{getChainIcon()}</Text>
          <Text style={styles.chainName}>{chainName}</Text>
          <Text style={styles.chainType}>({chainType})</Text>
        </View>

        {/* Address */}
        <View style={styles.addressSection}>
          <Text style={styles.addressLabel}>
            {connectedWalletName ? `${connectedWalletName} Address` : 'Wallet Address'}
          </Text>
          <Text style={styles.addressText}>
            {account.slice(0, 8)}...{account.slice(-8)}
          </Text>
        </View>

        {/* Balance */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>{currency} Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceValue}>{balance}</Text>
            <Text style={styles.balanceCurrency}>{currency}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  connectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
  chainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  chainIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  chainName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  chainType: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  addressSection: {
    marginBottom: 20,
  },
  addressLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    fontFamily: 'monospace',
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
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
    marginRight: 8,
  },
  balanceCurrency: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
  },
});