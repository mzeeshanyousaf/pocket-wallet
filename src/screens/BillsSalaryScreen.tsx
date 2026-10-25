import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddBillModal } from '../components/AddBillModal';
import { BillRow } from '../components/BillRow';
import { EditBillModal } from '../components/EditBillModal';
import { PayBillModal } from '../components/PayBillModal';
import { SalaryCard } from '../components/SalaryCard';
import { SalaryConfigModal } from '../components/SalaryConfigModal';
import { ScreenHeader } from '../components/ScreenHeader';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme/colors';
import { glassCardShadow, radius } from '../theme/tokens';
import { Bill } from '../types';
import { formatRs } from '../utils/formatters';

export const BillsSalaryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { bills, unpayBill, advanceBillCycle } = useWallet();

  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [showSalaryConfigModal, setShowSalaryConfigModal] = useState(false);
  const [selectedBillForPay, setSelectedBillForPay] = useState<Bill | null>(null);
  const [selectedBillForEdit, setSelectedBillForEdit] = useState<Bill | null>(null);

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });

  // Calculate totals and progress
  const { total, paid, remaining, percentPaid } = useMemo(() => {
    const tot = bills.reduce((sum, b) => sum + b.estimatedAmount, 0);
    const pd = bills
      .filter((b) => b.isPaid)
      .reduce((sum, b) => sum + (b.lastPaidAmount ?? b.estimatedAmount), 0);
    const rem = Math.max(0, tot - pd);
    const pct = tot > 0 ? Math.min(100, Math.round((pd / tot) * 100)) : 0;
    return { total: tot, paid: pd, remaining: rem, percentPaid: pct };
  }, [bills]);

  // Sort bills: overdue -> today -> upcoming -> paid
  const sortedBills = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getRank = (b: Bill) => {
      if (b.isPaid) return 4;
      const due = new Date(b.dueDate);
      due.setHours(0, 0, 0, 0);
      const diff = due.getTime() - today.getTime();
      if (diff < 0) return 1; // overdue
      if (diff === 0) return 2; // today
      return 3; // upcoming
    };

    return [...bills].sort((a, b) => {
      const rankDiff = getRank(a) - getRank(b);
      if (rankDiff !== 0) return rankDiff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [bills]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Screen Header */}
      <ScreenHeader
        eyebrow={`${currentMonthName} cycle`}
        title="Bills & Salary"
        trailing={
          <TouchableOpacity
            style={styles.addBillBtn}
            onPress={() => setShowAddBillModal(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBillBtnText}>Add Bill</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={sortedBills}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            {/* Salary Card */}
            <SalaryCard onConfigureSalary={() => setShowSalaryConfigModal(true)} />

            {/* Recurring Bills Progress & Header */}
            <View style={styles.billsSection}>
              <View style={styles.billsTitleRow}>
                <Text style={styles.billsTitle}>Recurring bills</Text>
                <Text style={styles.remainingText}>
                  <Text style={styles.remainingBold}>{formatRs(remaining)}</Text> left
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${percentPaid}%` },
                  ]}
                />
              </View>

              <Text style={styles.progressCaption}>
                {formatRs(paid)} of {formatRs(total)} paid this month
              </Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.billRowWrap,
              index === 0 && styles.billRowFirst,
              index === sortedBills.length - 1 && styles.billRowLast,
            ]}
          >
            <BillRow
              bill={item}
              onPay={(b) => setSelectedBillForPay(b)}
              onEdit={(b) => setSelectedBillForEdit(b)}
              onUnpay={(id) => unpayBill(id)}
              onAdvance={(id) => advanceBillCycle(id)}
            />
            {index < sortedBills.length - 1 && <View style={styles.divider} />}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <MaterialIcons name="receipt-long" size={24} color={colors.subtle} />
            </View>
            <Text style={styles.emptyTitle}>No recurring bills yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap &quot;+ Add Bill&quot; above to schedule Rent, Electricity, Gas, or Internet.
            </Text>
          </View>
        }
      />

      {/* Modals */}
      <AddBillModal
        visible={showAddBillModal}
        onClose={() => setShowAddBillModal(false)}
      />

      {selectedBillForEdit && (
        <EditBillModal
          visible={!!selectedBillForEdit}
          bill={selectedBillForEdit}
          onClose={() => setSelectedBillForEdit(null)}
        />
      )}

      {selectedBillForPay && (
        <PayBillModal
          visible={!!selectedBillForPay}
          bill={selectedBillForPay}
          onClose={() => setSelectedBillForPay(null)}
        />
      )}

      <SalaryConfigModal
        visible={showSalaryConfigModal}
        onClose={() => setShowSalaryConfigModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  listContent: {
    paddingTop: 6,
  },
  addBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.brand,
  },
  addBillBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerStack: {
    gap: 24,
  },
  billsSection: {
    paddingHorizontal: 20,
  },
  billsTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  billsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  remainingText: {
    fontSize: 13,
    color: colors.muted,
  },
  remainingBold: {
    fontWeight: '700',
    color: colors.ink,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  progressCaption: {
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 6,
  },
  billRowWrap: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  billRowFirst: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    marginTop: 14,
  },
  billRowLast: {
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
    ...glassCardShadow,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginLeft: 68,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  emptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
  },
});
