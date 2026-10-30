import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { Friend, FriendEntry } from '../types';
import { formatRs } from '../utils/formatters';

interface FriendRowProps {
  friend: Friend;
  entries?: FriendEntry[];
  onOpen: (friend: Friend) => void;
}

export const FriendRow: React.FC<FriendRowProps> = ({
  friend,
  entries = [],
  onOpen,
}) => {
  const net = friend.netBalance;

  // Find next pending recovery date
  const pendingEntries = entries.filter((e) => !e.isSettled);
  let nextDueDate: string | null = null;
  if (pendingEntries.length > 0) {
    const sorted = [...pendingEntries].sort(
      (a, b) => new Date(a.recoveryDate).getTime() - new Date(b.recoveryDate).getTime()
    );
    nextDueDate = sorted[0].recoveryDate;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let subText = 'All settled';
  let subColor = colors.muted;

  if (net !== 0) {
    if (nextDueDate) {
      const due = new Date(nextDueDate);
      due.setHours(0, 0, 0, 0);
      const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diff < 0) {
        subText = `${net > 0 ? 'Recovery' : 'Repayment'} overdue · ${Math.abs(diff)}d`;
        subColor = colors.neg;
      } else if (diff === 0) {
        subText = 'Due today';
        subColor = colors.warn;
      } else {
        subText = `Due in ${diff} ${diff === 1 ? 'day' : 'days'}`;
        subColor = colors.muted;
      }
    } else {
      subText = 'No due date';
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onOpen(friend)}
      activeOpacity={0.7}
    >
      {/* Avatar Circle */}
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{getInitials(friend.name)}</Text>
      </View>

      {/* Middle info */}
      <View style={styles.infoCol}>
        <Text style={styles.friendName} numberOfLines={1}>
          {friend.name}
        </Text>
        <Text style={[styles.subText, { color: subColor }]} numberOfLines={1}>
          {subText}
        </Text>
      </View>

      {/* Right Balance */}
      <View style={styles.rightCol}>
        {net === 0 ? (
          <Text style={styles.settledAmount}>Rs. 0</Text>
        ) : (
          <>
            <Text
              style={[
                styles.netAmount,
                { color: net > 0 ? colors.pos : colors.neg },
              ]}
            >
              {net > 0 ? '+' : '−'}
              {formatRs(Math.abs(net))}
            </Text>
            <Text style={styles.owesLabel}>
              {net > 0 ? 'owes you' : 'you owe'}
            </Text>
          </>
        )}
      </View>

      <MaterialIcons name="chevron-right" size={18} color={colors.subtle} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand,
  },
  infoCol: {
    flex: 1,
  },
  friendName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.ink,
  },
  subText: {
    fontSize: 12.5,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  settledAmount: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.subtle,
    fontVariant: ['tabular-nums'],
  },
  netAmount: {
    fontSize: 14.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  owesLabel: {
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 1,
  },
});
