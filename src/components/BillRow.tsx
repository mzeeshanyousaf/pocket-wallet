import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { Bill } from '../types';
import { formatBillFrequency, formatDateDisplay, formatRs } from '../utils/formatters';
import { StatusTag, TagTone } from './StatusTag';

interface BillRowProps {
  bill: Bill;
  onPay: (bill: Bill) => void;
  onEdit?: (bill: Bill) => void;
  onUnpay?: (billId: string) => void;
  onAdvance?: (billId: string) => void;
}

export const BillRow: React.FC<BillRowProps> = ({
  bill,
  onPay,
  onEdit,
  onUnpay,
  onAdvance,
}) => {
  const isPaid = bill.isPaid;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(bill.dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const isToday = diffDays === 0;
  const isOverdue = diffDays < 0 && !isPaid;

  let tag: { tone: TagTone; label: string; detail: string } = {
    tone: 'neutral',
    label: 'Upcoming',
    detail: `in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`,
  };

  if (isPaid) {
    tag = {
      tone: 'pos',
      label: 'Paid',
      detail: bill.lastPaidDate
        ? `Paid ${formatDateDisplay(bill.lastPaidDate)}`
        : 'Settled',
    };
  } else if (isOverdue) {
    const overdueDays = Math.abs(diffDays);
    tag = {
      tone: 'neg',
      label: 'Overdue',
      detail: `${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} late`,
    };
  } else if (isToday) {
    tag = {
      tone: 'warn',
      label: 'Due today',
      detail: formatDateDisplay(bill.dueDate),
    };
  }

  const getCategoryIcon = (cat: string): keyof typeof MaterialIcons.glyphMap => {
    switch (cat.toLowerCase()) {
      case 'electricity':
        return 'bolt';
      case 'rent':
        return 'home';
      case 'gas':
        return 'whatshot';
      case 'grocery':
        return 'shopping-cart';
      case 'credit card':
        return 'credit-card';
      case 'internet':
        return 'wifi';
      case 'water':
        return 'water-drop';
      default:
        return 'receipt-long';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => (onEdit ? onEdit(bill) : null)}
      activeOpacity={0.7}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <MaterialIcons
            name={getCategoryIcon(bill.category)}
            size={18}
            color={isPaid ? colors.muted : colors.ink}
          />
        </View>

        <View style={styles.titleCol}>
          <Text
            style={[
              styles.billTitle,
              isPaid && styles.billTitlePaid,
            ]}
            numberOfLines={1}
          >
            {bill.title}
          </Text>
          <Text style={styles.providerText} numberOfLines={1}>
            {bill.category} · {formatBillFrequency(bill.frequency, bill.frequencyDays)} · Due {formatDateDisplay(bill.dueDate)}
          </Text>
        </View>

        <Text
          style={[
            styles.amountText,
            isPaid && styles.amountTextPaid,
          ]}
        >
          {formatRs(bill.estimatedAmount)}
        </Text>
      </View>

      {/* Bottom Sub-row with StatusTag & Action button */}
      <View style={styles.bottomRow}>
        <View style={styles.statusMetaRow}>
          <StatusTag tone={tag.tone}>{tag.label}</StatusTag>
          <Text
            style={[
              styles.detailText,
              isOverdue && styles.detailTextOverdue,
            ]}
          >
            {tag.detail}
          </Text>
        </View>

        {isPaid ? (
          <View style={styles.paidActionsWrap}>
            <TouchableOpacity
              style={styles.settledRow}
              onPress={() => (onUnpay ? onUnpay(bill.id) : null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="check" size={14} color={colors.pos} />
              <Text style={styles.settledText}>Settled</Text>
            </TouchableOpacity>

            {onAdvance && (
              <TouchableOpacity
                style={styles.advanceBtn}
                onPress={() => onAdvance(bill.id)}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="replay" size={13} color={colors.brand} />
                <Text style={styles.advanceBtnText}>Next cycle</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.payBtn}
            onPress={() => onPay(bill)}
            activeOpacity={0.85}
          >
            <Text style={styles.payBtnText}>Pay & deduct</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
  },
  billTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.ink,
  },
  billTitlePaid: {
    color: colors.muted,
  },
  providerText: {
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 2,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  amountTextPaid: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 52,
    marginTop: 10,
    gap: 8,
  },
  statusMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  detailText: {
    fontSize: 12.5,
    color: colors.muted,
  },
  detailTextOverdue: {
    color: colors.neg,
    fontWeight: '600',
  },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settledText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.pos,
  },
  paidActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  advanceBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.brand,
  },
  payBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
