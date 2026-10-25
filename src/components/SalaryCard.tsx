import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme/colors';
import { radius } from '../theme/tokens';

interface SalaryCardProps {
  onConfigureSalary?: () => void;
}

export const SalaryCard: React.FC<SalaryCardProps> = ({ onConfigureSalary }) => {
  const { salaryConfig, receiveSalary } = useWallet();

  const today = new Date();
  const currentDay = today.getDate();
  const daysUntilSalary =
    salaryConfig.dayOfMonth >= currentDay
      ? salaryConfig.dayOfMonth - currentDay
      : 30 - (currentDay - salaryConfig.dayOfMonth);

  const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const isReceived = salaryConfig.lastCreditedMonthYear === currentMonthYear;
  const currentMonthName = today.toLocaleString('en-US', { month: 'long' });

  const countdownText =
    daysUntilSalary === 0
      ? 'Payday today'
      : `${daysUntilSalary} ${daysUntilSalary === 1 ? 'day' : 'days'} to payday`;

  const handleReceiveSalary = async () => {
    if (isReceived) return;
    await receiveSalary();
  };

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.leftMetaRow}>
          <View style={styles.iconBox}>
            <MaterialIcons name="work" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.titleText}>Monthly salary</Text>
            <Text style={styles.employerText}>Central Wallet / Primary</Text>
          </View>
        </View>

        <View style={styles.rightActionsRow}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isReceived ? 'rgba(111, 217, 173, 0.20)' : 'rgba(255, 255, 255, 0.16)',
              },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: isReceived ? colors.posOnDark : '#FFFFFF' },
              ]}
            >
              {isReceived ? `Received for ${currentMonthName}` : countdownText}
            </Text>
          </View>

          {onConfigureSalary && (
            <TouchableOpacity
              style={styles.configBtn}
              onPress={onConfigureSalary}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Configure salary"
            >
              <MaterialIcons name="tune" size={16} color="rgba(255, 255, 255, 0.75)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Amount */}
      <View style={styles.amountRow}>
        <Text style={styles.currencyPrefix}>Rs.</Text>
        <Text style={styles.amountText}>
          {salaryConfig.amount.toLocaleString('en-PK')}
        </Text>
      </View>

      {/* Grid details */}
      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
          <Text style={styles.gridLabel}>Payday cycle</Text>
          <Text style={styles.gridValue}>
            {getOrdinal(salaryConfig.dayOfMonth)} of every month
          </Text>
        </View>

        <View style={styles.gridCol}>
          <Text style={styles.gridLabel}>Last received</Text>
          <Text style={styles.gridValue}>
            {salaryConfig.lastCreditedMonthYear
              ? salaryConfig.lastCreditedMonthYear
              : '—'}
          </Text>
        </View>
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={[
          styles.ctaBtn,
          {
            backgroundColor: isReceived ? 'rgba(255, 255, 255, 0.12)' : '#FFFFFF',
          },
        ]}
        onPress={handleReceiveSalary}
        disabled={isReceived}
        activeOpacity={0.88}
      >
        <MaterialIcons
          name={isReceived ? 'check' : 'add'}
          size={18}
          color={isReceived ? 'rgba(255, 255, 255, 0.60)' : colors.brand}
        />
        <Text
          style={[
            styles.ctaBtnText,
            { color: isReceived ? 'rgba(255, 255, 255, 0.60)' : colors.brand },
          ]}
        >
          {isReceived ? 'Credited to wallet' : 'Receive salary now'}
        </Text>
      </TouchableOpacity>
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
  leftMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  employerText: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.70)',
    marginTop: 1,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  configBtn: {
    padding: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 18,
    gap: 6,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  amountText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  gridRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.14)',
    marginTop: 16,
    paddingTop: 14,
  },
  gridCol: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  ctaBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
