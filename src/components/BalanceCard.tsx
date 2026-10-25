import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme/colors';
import { heroShadow, radius } from '../theme/tokens';

interface BalanceCardProps {
  balanceHidden: boolean;
  onToggleBalance: () => void;
  onCashIn: () => void;
  onCashOut: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balanceHidden,
  onToggleBalance,
  onCashIn,
  onCashOut,
}) => {
  const { balance, monthlyIncome, monthlyExpenses } = useWallet();

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });

  const maskValue = (val: string) => (balanceHidden ? '••••••' : val);

  return (
    <View style={[styles.card, heroShadow]}>
      {/* Top row: Label & Visibility Eye */}
      <View style={styles.topRow}>
        <Text style={styles.topLabel}>Available balance</Text>
        <TouchableOpacity
          onPress={onToggleBalance}
          style={styles.eyeBtn}
          accessibilityLabel={balanceHidden ? 'Show balance' : 'Hide balance'}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons
            name={balanceHidden ? 'visibility-off' : 'visibility'}
            size={18}
            color="rgba(255, 255, 255, 0.75)"
          />
        </TouchableOpacity>
      </View>

      {/* Main Balance */}
      <View style={styles.balanceRow}>
        <Text style={styles.currencyPrefix}>
          {balance < 0 && !balanceHidden ? '−Rs.' : 'Rs.'}
        </Text>
        <Text style={styles.balanceText}>
          {maskValue(Math.abs(balance).toLocaleString('en-PK'))}
        </Text>
      </View>

      {/* Monthly Cashflow Breakdown */}
      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>In · {currentMonthName}</Text>
          <Text style={[styles.statValue, { color: colors.posOnDark }]}>
            +Rs. {maskValue(monthlyIncome.toLocaleString('en-PK'))}
          </Text>
        </View>

        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Out · {currentMonthName}</Text>
          <Text style={[styles.statValue, { color: colors.negOnDark }]}>
            −Rs. {maskValue(monthlyExpenses.toLocaleString('en-PK'))}
          </Text>
        </View>
      </View>

      {/* Action Buttons: Cash In & Cash Out */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.cashInBtn}
          onPress={onCashIn}
          activeOpacity={0.88}
        >
          <View style={styles.plusCircle}>
            <MaterialIcons name="add" size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.cashInText}>Cash in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cashOutBtn}
          onPress={onCashOut}
          activeOpacity={0.88}
        >
          <View style={styles.minusCircle}>
            <MaterialIcons name="remove" size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.cashOutText}>Cash out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    backgroundColor: colors.brand,
    padding: 20,
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
  },
  topLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  eyeBtn: {
    padding: 4,
    borderRadius: radius.pill,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
    gap: 6,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  balanceText: {
    fontSize: 38,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.10)',
    marginTop: 20,
    paddingTop: 16,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.50)',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cashInBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(230, 244, 237, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(111, 217, 173, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  plusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.pos,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashInText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#084832',
  },
  cashOutBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(251, 236, 235, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(245, 163, 163, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  minusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.neg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashOutText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#6E1616',
  },
});
