import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { CreditCardMember } from '../types';
import { formatRs } from '../utils/formatters';

interface CardMemberRowProps {
  member: CreditCardMember;
  entryCount: number;
  onOpen: (member: CreditCardMember) => void;
}

export const CardMemberRow: React.FC<CardMemberRowProps> = ({
  member,
  entryCount,
  onOpen,
}) => {
  const owed = member.balanceOwed;

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
      onPress={() => onOpen(member)}
      activeOpacity={0.7}
    >
      {/* Avatar Circle */}
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
      </View>

      {/* Middle Info */}
      <View style={styles.infoCol}>
        <Text style={styles.memberName} numberOfLines={1}>
          {member.name}
        </Text>
        <Text style={styles.subText} numberOfLines={1}>
          {entryCount === 0
            ? 'No activity yet'
            : `Used ${formatRs(member.totalCharged)} · Paid ${formatRs(member.totalPaid)}`}
        </Text>
      </View>

      {/* Right Balance */}
      <View style={styles.rightCol}>
        {owed === 0 ? (
          <>
            <Text style={styles.settledAmount}>Rs. 0</Text>
            <Text style={styles.statusLabel}>settled</Text>
          </>
        ) : owed > 0 ? (
          <>
            <Text style={[styles.netAmount, { color: colors.pos }]}>
              {formatRs(owed)}
            </Text>
            <Text style={styles.statusLabel}>owes on card</Text>
          </>
        ) : (
          <>
            <Text style={[styles.netAmount, { color: colors.brand }]}>
              {formatRs(Math.abs(owed))}
            </Text>
            <Text style={styles.statusLabel}>advance credit</Text>
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
  memberName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.ink,
  },
  subText: {
    fontSize: 12.5,
    color: colors.muted,
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
  statusLabel: {
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 1,
  },
});
