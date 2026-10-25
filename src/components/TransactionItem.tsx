import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { WalletTransaction } from '../types';
import { formatRs, formatTimeDisplay } from '../utils/formatters';

interface TransactionItemProps {
  transaction: WalletTransaction;
  onDelete: (id: string) => void;
  balanceHidden?: boolean;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onDelete,
  balanceHidden = false,
}) => {
  const isIn =
    transaction.type === 'income' ||
    transaction.type === 'salary' ||
    (transaction.type === 'friend_settlement' &&
      transaction.settlementType === 'received_back');

  const getCategoryIcon = (): keyof typeof MaterialIcons.glyphMap => {
    const cat = (transaction.category || '').toLowerCase();
    if (transaction.type === 'salary' || cat === 'salary') return 'payments';
    if (transaction.type === 'bill_payment' || cat === 'bills') return 'receipt-long';
    if (transaction.type.startsWith('friend')) return 'group';
    if (cat.includes('food') || cat.includes('restaurant')) return 'restaurant';
    if (cat.includes('grocer')) return 'shopping-cart';
    if (cat.includes('transport') || cat.includes('fuel')) return 'directions-car';
    if (cat.includes('shop')) return 'shopping-bag';
    if (cat.includes('health') || cat.includes('med')) return 'medical-services';
    if (cat.includes('free') || cat.includes('work')) return 'laptop';
    return isIn ? 'south-west' : 'north-east';
  };

  const categoryLabel =
    transaction.category ||
    (transaction.type === 'salary'
      ? 'Salary'
      : transaction.type === 'bill_payment'
      ? 'Bill'
      : transaction.type.startsWith('friend')
      ? 'Friends'
      : isIn
      ? 'Inflow'
      : 'Expense');

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry?',
      `Remove "${transaction.description}" of ${formatRs(transaction.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(transaction.id),
        },
      ]
    );
  };

  return (
    <View style={styles.row}>
      {/* Category Squircle Icon */}
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: isIn ? colors.posSoft : colors.canvas,
          },
        ]}
      >
        <MaterialIcons
          name={getCategoryIcon()}
          size={18}
          color={isIn ? colors.pos : colors.ink}
        />
      </View>

      {/* Title & Subtitle */}
      <View style={styles.contentCol}>
        <Text style={styles.titleText} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.subtitleText} numberOfLines={1}>
          {categoryLabel} · {formatTimeDisplay(transaction.date)}
        </Text>
      </View>

      {/* Amount */}
      <Text
        style={[
          styles.amountText,
          { color: isIn ? colors.pos : colors.ink },
        ]}
      >
        {isIn ? '+' : '−'}
        {balanceHidden ? 'Rs. •••' : formatRs(transaction.amount)}
      </Text>

      {/* Delete Action */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={handleDelete}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        accessibilityLabel="Delete transaction"
      >
        <MaterialIcons name="close" size={15} color={colors.subtle} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 10,
    backgroundColor: colors.surface,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentCol: {
    flex: 1,
    marginRight: 8,
  },
  titleText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.ink,
  },
  subtitleText: {
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 2,
  },
  amountText: {
    fontSize: 14.5,
    fontWeight: '700',
    marginRight: 8,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
