import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { glassCardShadow, radius } from '../theme/tokens';
import { WalletTransaction } from '../types';
import { formatRs, isInflowTransaction } from '../utils/formatters';

interface MonthlyInsightsCardProps {
  selectedYear: number;
  selectedMonth: number;
  isCurrentMonth: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onJumpToCurrent: () => void;
  transactions: WalletTransaction[];
  balanceHidden?: boolean;
}

export const MonthlyInsightsCard: React.FC<MonthlyInsightsCardProps> = ({
  selectedYear,
  selectedMonth,
  isCurrentMonth,
  onPrevMonth,
  onNextMonth,
  onJumpToCurrent,
  transactions,
  balanceHidden = false,
}) => {
  const [showAllCategories, setShowAllCategories] = useState(false);

  const monthLabel = new Date(selectedYear, selectedMonth, 1).toLocaleString(
    'en-US',
    { month: 'long', year: 'numeric' }
  );

  const { totalIn, totalOut, net, categories } = useMemo(() => {
    let inc = 0;
    let out = 0;
    const catTotals = new Map<string, number>();

    transactions.forEach((tx) => {
      if (isInflowTransaction(tx)) {
        inc += tx.amount;
      } else {
        out += tx.amount;
        const cat = tx.category?.trim() || 'Other';
        catTotals.set(cat, (catTotals.get(cat) ?? 0) + tx.amount);
      }
    });

    const sortedCats = Array.from(catTotals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percent: out > 0 ? Math.round((amount / out) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalIn: inc,
      totalOut: out,
      net: inc - out,
      categories: sortedCats,
    };
  }, [transactions]);

  const visibleCategories = showAllCategories
    ? categories
    : categories.slice(0, 4);

  const mask = (val: string) => (balanceHidden ? 'Rs. •••' : val);

  return (
    <View style={[styles.card, glassCardShadow]}>
      {/* Month Navigator Row */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={onPrevMonth}
          activeOpacity={0.75}
          accessibilityLabel="Previous month"
        >
          <MaterialIcons name="chevron-left" size={20} color={colors.ink} />
        </TouchableOpacity>

        <View style={styles.monthCenter}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          {!isCurrentMonth && (
            <TouchableOpacity
              style={styles.todayPill}
              onPress={onJumpToCurrent}
              activeOpacity={0.75}
            >
              <Text style={styles.todayPillText}>Today</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.navBtn, isCurrentMonth && styles.navBtnDisabled]}
          onPress={onNextMonth}
          disabled={isCurrentMonth}
          activeOpacity={0.75}
          accessibilityLabel="Next month"
        >
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={isCurrentMonth ? colors.subtle : colors.ink}
          />
        </TouchableOpacity>
      </View>

      {/* 3-Column Month Summary Strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>In</Text>
          <Text
            style={[styles.summaryValue, { color: colors.pos }]}
            numberOfLines={1}
          >
            {mask(formatRs(totalIn))}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Out</Text>
          <Text
            style={[styles.summaryValue, { color: colors.neg }]}
            numberOfLines={1}
          >
            {mask(formatRs(totalOut))}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Net</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: net >= 0 ? colors.brand : colors.neg },
            ]}
            numberOfLines={1}
          >
            {balanceHidden
              ? 'Rs. •••'
              : formatRs(net, { showSign: net !== 0 })}
          </Text>
        </View>
      </View>

      {/* Category Spending Breakdown */}
      <View style={styles.breakdownSection}>
        <View style={styles.breakdownHeader}>
          <Text style={styles.breakdownHeading}>Spending by category</Text>
          {categories.length > 4 && (
            <TouchableOpacity
              onPress={() => setShowAllCategories((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleText}>
                {showAllCategories
                  ? 'Show less'
                  : `Show all (${categories.length})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {categories.length === 0 ? (
          <Text style={styles.emptyText}>
            No outflows recorded in {monthLabel}.
          </Text>
        ) : (
          <View style={styles.categoryList}>
            {visibleCategories.map((item) => (
              <View key={item.category} style={styles.categoryRow}>
                <View style={styles.categoryMetaRow}>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {item.category}
                  </Text>
                  <View style={styles.categoryValuesRow}>
                    <Text style={styles.categoryPercent}>{item.percent}%</Text>
                    <Text style={styles.categoryAmount}>
                      {mask(formatRs(item.amount))}
                    </Text>
                  </View>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.max(4, Math.min(100, item.percent))}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.45,
  },
  monthCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  todayPill: {
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.line,
  },
  summaryLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.muted,
  },
  summaryValue: {
    fontSize: 13.5,
    fontWeight: '700',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  breakdownSection: {
    marginTop: 14,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  breakdownHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand,
  },
  emptyText: {
    fontSize: 12.5,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  categoryList: {
    gap: 10,
  },
  categoryRow: {
    gap: 5,
  },
  categoryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    flex: 1,
    marginRight: 8,
  },
  categoryValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPercent: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.canvas,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
});
