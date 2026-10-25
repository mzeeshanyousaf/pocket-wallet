import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme/colors';
import { radius } from '../theme/tokens';
import { formatRs } from '../utils/formatters';
import { StatusTag } from './StatusTag';

export const PositionStrip: React.FC = () => {
  const { totalOwedToMe, totalOwedByMe, netPendingWithFriends } = useWallet();

  const net = netPendingWithFriends;

  return (
    <View style={styles.card}>
      {/* 2-column breakdown */}
      <View style={styles.topColumns}>
        <View style={styles.col}>
          <Text style={styles.colLabel}>To receive</Text>
          <Text style={[styles.colAmount, { color: colors.posOnDark }]}>
            {formatRs(totalOwedToMe)}
          </Text>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.col}>
          <Text style={styles.colLabel}>To pay</Text>
          <Text style={[styles.colAmount, { color: colors.negOnDark }]}>
            {formatRs(totalOwedByMe)}
          </Text>
        </View>
      </View>

      {/* Net Position Bottom Strip */}
      <View style={styles.bottomStrip}>
        <Text style={styles.netLabel}>Net position</Text>
        {net > 0 ? (
          <StatusTag tone="pos">To collect · {formatRs(net)}</StatusTag>
        ) : net < 0 ? (
          <StatusTag tone="neg">To repay · {formatRs(Math.abs(net))}</StatusTag>
        ) : (
          <StatusTag tone="neutral">All settled</StatusTag>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    backgroundColor: colors.brand,
    overflow: 'hidden',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  topColumns: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
    padding: 18,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  colLabel: {
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.70)',
  },
  colAmount: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  bottomStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  netLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
