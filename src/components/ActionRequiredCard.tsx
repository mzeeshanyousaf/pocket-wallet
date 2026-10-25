import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme/colors';
import { radius } from '../theme/tokens';
import { DueActionItem } from '../types';
import { formatRs } from '../utils/formatters';

interface ActionRequiredProps {
  onPressItem?: (item: DueActionItem) => void;
  onNavigateTab?: (tabName: 'Bills & Salary' | 'Give & Take') => void;
}

export const ActionRequiredCard: React.FC<ActionRequiredProps> = ({
  onPressItem,
  onNavigateTab,
}) => {
  const { dueActionItems } = useWallet();

  if (!dueActionItems || dueActionItems.length === 0) return null;

  return (
    <View style={styles.outerContainer}>
      {/* Header bar */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="warning" size={16} color={colors.warn} />
          <Text style={styles.headerTitle}>Action required</Text>
        </View>
        <Text style={styles.countText}>
          {dueActionItems.length} {dueActionItems.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      {/* Inner card with item rows */}
      <View style={styles.innerCard}>
        {dueActionItems.map((item, index) => {
          const isOverdue = item.isOverdue;
          const toneColor = isOverdue ? colors.neg : colors.warn;

          let detailText = '';
          if (item.type === 'bill') {
            detailText = isOverdue ? 'Bill overdue' : 'Due today';
          } else if (item.type === 'salary') {
            detailText = 'Monthly payday ready';
          } else if (item.type === 'friend_recovery') {
            detailText = isOverdue ? 'Recovery overdue' : 'Recovery due today';
          }

          const handlePress = () => {
            if (onPressItem) {
              onPressItem(item);
            } else if (onNavigateTab) {
              if (item.type === 'bill' || item.type === 'salary') {
                onNavigateTab('Bills & Salary');
              } else {
                onNavigateTab('Give & Take');
              }
            }
          };

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.itemRow,
                index < dueActionItems.length - 1 && styles.itemBorderBottom,
              ]}
              onPress={handlePress}
              activeOpacity={0.7}
            >
              <View style={[styles.dot, { backgroundColor: toneColor }]} />
              <View style={styles.textCol}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.itemDetail, { color: toneColor }]}>
                  {detailText}
                </Text>
              </View>
              <Text style={styles.amountText}>{formatRs(item.amount)}</Text>
              <MaterialIcons
                name="chevron-right"
                size={18}
                color={colors.subtle}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    backgroundColor: colors.warnSoft,
    padding: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.warn,
  },
  countText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.warn,
    opacity: 0.85,
  },
  innerCard: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  itemBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  itemDetail: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
});
