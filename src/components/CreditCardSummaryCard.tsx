import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme/colors';
import { heroShadow, radius } from '../theme/tokens';
import { formatRs } from '../utils/formatters';
import { StatusTag } from './StatusTag';

interface CreditCardSummaryCardProps {
  onAddCharge: () => void;
  onPayBank: () => void;
}

export const CreditCardSummaryCard: React.FC<CreditCardSummaryCardProps> = ({
  onAddCharge,
  onPayBank,
}) => {
  const {
    totalCardCollected,
    totalCardPaidToBank,
    cardDueToBank,
    cardNetOwedByPeople,
    cardCashHeldForBank,
  } = useWallet();

  const handleAddCharge = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onAddCharge();
  };

  const handlePayBank = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPayBank();
  };

  const displayDueToBank = Math.max(0, cardDueToBank);
  const displayFriendsOwe = Math.max(0, cardNetOwedByPeople);

  return (
    <View style={[styles.card, heroShadow]}>
      {/* Top row: Label & Isolated Badge */}
      <View style={styles.topRow}>
        <Text style={styles.topLabel}>Due to card bank</Text>
        <View style={styles.isolatedPill}>
          <MaterialIcons
            name="verified-user"
            size={12}
            color="rgba(255, 255, 255, 0.85)"
          />
          <Text style={styles.isolatedPillText}>Isolated from wallet</Text>
        </View>
      </View>

      {/* Main Due Amount */}
      <View style={styles.balanceRow}>
        <Text style={styles.currencyPrefix}>Rs.</Text>
        <Text style={styles.balanceText}>
          {Math.round(displayDueToBank).toLocaleString('en-PK')}
        </Text>
      </View>

      {cardDueToBank < 0 && (
        <Text style={styles.overpaidCaption}>
          Overpaid bank by {formatRs(Math.abs(cardDueToBank))}
        </Text>
      )}

      {/* 3-Column Metrics Breakdown */}
      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Friends owe</Text>
          <Text
            style={[styles.statValue, { color: colors.posOnDark }]}
            numberOfLines={1}
          >
            {formatRs(displayFriendsOwe)}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Collected</Text>
          <Text style={styles.statValueLight} numberOfLines={1}>
            {formatRs(totalCardCollected)}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Paid to bank</Text>
          <Text style={styles.statValueLight} numberOfLines={1}>
            {formatRs(totalCardPaidToBank)}
          </Text>
        </View>
      </View>

      {/* Action Buttons: Add Card Use & Pay Bank */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.chargeBtn}
          onPress={handleAddCharge}
          activeOpacity={0.88}
        >
          <View style={styles.chargeCircle}>
            <MaterialIcons name="add" size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.chargeText}>Add card use</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bankBtn}
          onPress={handlePayBank}
          activeOpacity={0.88}
        >
          <View style={styles.bankCircle}>
            <MaterialIcons name="account-balance" size={13} color="#FFFFFF" />
          </View>
          <Text style={styles.bankText}>Pay bank</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Status Strip */}
      <View style={styles.bottomStrip}>
        {cardCashHeldForBank > 0 ? (
          <>
            <Text style={styles.stripLabel}>Held for bank</Text>
            <StatusTag tone="warn">
              Pay bank · {formatRs(cardCashHeldForBank)}
            </StatusTag>
          </>
        ) : cardCashHeldForBank < 0 ? (
          <>
            <Text style={styles.stripLabel}>Paid ahead</Text>
            <StatusTag tone="pos">
              +{formatRs(Math.abs(cardCashHeldForBank))} covered
            </StatusTag>
          </>
        ) : cardDueToBank <= 0 && cardNetOwedByPeople <= 0 ? (
          <>
            <Text style={styles.stripLabel}>Card status</Text>
            <StatusTag tone="pos">All settled</StatusTag>
          </>
        ) : (
          <>
            <Text style={styles.stripLabel}>Card status</Text>
            <StatusTag tone="neutral">Awaiting collections</StatusTag>
          </>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  topLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.72)',
  },
  isolatedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  isolatedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.90)',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    marginTop: 6,
    gap: 6,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
    fontVariant: ['tabular-nums'],
  },
  balanceText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  overpaidCaption: {
    paddingHorizontal: 20,
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.posOnDark,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: 16,
    marginHorizontal: 20,
    paddingTop: 14,
  },
  statCol: {
    flex: 1,
    paddingHorizontal: 4,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  statLabel: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.60)',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
  },
  statValueLight: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  chargeBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(230, 244, 237, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(111, 217, 173, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chargeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.pos,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#084832',
  },
  bankBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bankCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  bottomStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  stripLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
