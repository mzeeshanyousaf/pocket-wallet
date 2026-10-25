import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';
import { Bill } from '../types';
import { formatDateDisplay, formatRs, getDaysUntil } from '../utils/formatters';

interface UpcomingBillsBannerProps {
  bills: Bill[];
  onSelectBill: (bill: Bill) => void;
  onViewAllBills: () => void;
}

export const UpcomingBillsBanner: React.FC<UpcomingBillsBannerProps> = ({
  bills,
  onSelectBill,
  onViewAllBills,
}) => {
  // Filter unpaid bills, sorted by nearest due date
  const upcomingBills = bills
    .filter((b) => !b.isPaid)
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

  if (upcomingBills.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="check-circle" size={16} color={colors.primaryLight} />
        <Text style={styles.emptyText}>All scheduled bills are fully paid</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Upcoming Bills</Text>
        <TouchableOpacity onPress={onViewAllBills} activeOpacity={0.7}>
          <Text style={styles.viewAllText}>View All ({upcomingBills.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {upcomingBills.map((bill) => {
          const { label, isToday, isPast } = getDaysUntil(bill.dueDate);
          const badgeBg = isToday || isPast ? colors.accentCoralMuted : colors.accentBlueMuted;
          const badgeColor = isToday || isPast ? colors.accentCoral : colors.accentBlue;

          return (
            <TouchableOpacity
              key={bill.id}
              style={styles.billChip}
              onPress={() => onSelectBill(bill)}
              activeOpacity={0.8}
            >
              <View style={styles.chipTop}>
                <Text style={styles.billTitle} numberOfLines={1}>
                  {bill.title}
                </Text>
                <Text style={styles.billAmount}>
                  {formatRs(bill.estimatedAmount)}
                </Text>
              </View>

              <View style={styles.chipBottom}>
                <Text style={styles.dueDateText}>
                  Due {formatDateDisplay(bill.dueDate)}
                </Text>
                <View style={[styles.countdownBadge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.countdownText, { color: badgeColor }]}>
                    {label}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  billChip: {
    width: 200,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    justifyContent: 'space-between',
  },
  chipTop: {
    marginBottom: 8,
  },
  billTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  billAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  chipBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  countdownBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  countdownText: {
    fontSize: 9,
    fontWeight: '800',
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 12,
    color: colors.primaryLight,
    fontWeight: '600',
  },
});
