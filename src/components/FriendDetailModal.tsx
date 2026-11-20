import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme/colors';
import { glassCardShadow, radius } from '../theme/tokens';
import { Friend } from '../types';
import {
  formatDateDisplay,
  formatRs,
  parseDate,
  toDateString,
} from '../utils/formatters';
import { formatFriendStatement } from '../utils/statementFormatter';
import { ConfirmModal } from './ConfirmModal';

interface FriendDetailModalProps {
  visible: boolean;
  friend: Friend | null;
  onClose: () => void;
}

export const FriendDetailModal: React.FC<FriendDetailModalProps> = ({
  visible,
  friend,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const {
    friends,
    friendEntries,
    settleAllFriendEntries,
    recordFriendRepayment,
    addFriendEntry,
    deleteFriendEntry,
    deleteFriend,
    setSuppressAutoLock,
  } = useWallet();

  const [amountStr, setAmountStr] = useState('');
  const [noteStr, setNoteStr] = useState('');
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [showDeleteFriendConfirm, setShowDeleteFriendConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetTransientState = () => {
    setAmountStr('');
    setNoteStr('');
    setShowSettleConfirm(false);
    setDeletingEntryId(null);
    setShowDeleteFriendConfirm(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetTransientState();
    onClose();
  };

  if (!friend) return null;

  const liveFriend = friends.find((f) => f.id === friend.id) ?? friend;
  const net = liveFriend.netBalance;
  const firstName = liveFriend.name.split(' ')[0];

  const thisFriendEntries = friendEntries
    .filter((e) => e.friendId === liveFriend.id)
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

  const pendingEntries = thisFriendEntries.filter((e) => !e.isSettled);

  // Find next recovery date
  let nextRecoveryDate: string | null = null;
  if (pendingEntries.length > 0) {
    const sortedPending = [...pendingEntries].sort(
      (a, b) =>
        parseDate(a.recoveryDate).getTime() -
        parseDate(b.recoveryDate).getTime()
    );
    nextRecoveryDate = sortedPending[0].recoveryDate;
  }

  const numAmount = parseFloat(amountStr) || 0;

  // Determine button labels based on net position
  const actions =
    net > 0
      ? {
          primary: { label: 'Received repayment', type: 'repayment' as const },
          secondary: { label: 'Lent more', type: 'lent' as const },
        }
      : net < 0
      ? {
          primary: { label: 'Paid back', type: 'repayment' as const },
          secondary: { label: 'Borrowed more', type: 'borrowed' as const },
        }
      : {
          primary: { label: 'Lent money', type: 'lent' as const },
          secondary: { label: 'Borrowed', type: 'borrowed' as const },
        };

  const handleSettleInFull = () => {
    if (pendingEntries.length === 0 || isSubmitting) return;
    setShowSettleConfirm(true);
  };

  const confirmSettleInFull = async () => {
    if (isSubmitting) return;
    setShowSettleConfirm(false);
    setIsSubmitting(true);
    try {
      await settleAllFriendEntries(liveFriend.id, 'Settled in full');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    if (isSubmitting) return;
    setDeletingEntryId(entryId);
  };

  const confirmDeleteEntry = async () => {
    if (!deletingEntryId || isSubmitting) return;
    const id = deletingEntryId;
    setDeletingEntryId(null);
    setIsSubmitting(true);
    try {
      await deleteFriendEntry(id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (actionType: 'repayment' | 'lent' | 'borrowed') => {
    if (numAmount <= 0 || isSubmitting) return;
    const finalNote =
      noteStr.trim() || (actionType === 'repayment' ? 'Repayment' : 'Entry');

    setIsSubmitting(true);
    try {
      if (actionType === 'repayment') {
        await recordFriendRepayment(liveFriend.id, numAmount, finalNote);
      } else {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 14);
        await addFriendEntry(
          liveFriend.name,
          numAmount,
          actionType,
          finalNote,
          toDateString(futureDate)
        );
      }

      setAmountStr('');
      setNoteStr('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareStatement = async () => {
    setSuppressAutoLock(true);
    try {
      const message = formatFriendStatement(liveFriend, thisFriendEntries);
      await Share.share({
        message,
        title: `${liveFriend.name} — Friends Ledger Statement`,
      });
    } catch (err) {
      console.log('Share statement note:', err);
    } finally {
      setTimeout(() => {
        setSuppressAutoLock(false);
      }, 400);
    }
  };

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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onShow={resetTransientState}
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Full-Screen Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.ink} />
          </TouchableOpacity>

          <View style={styles.headerTitleCol}>
            <Text style={styles.headerEyebrow}>Friend Ledger</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {liveFriend.name}
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: colors.brandSoft }]}
              onPress={handleShareStatement}
              activeOpacity={0.7}
              accessibilityLabel="Share friend ledger statement"
            >
              <MaterialIcons name="share" size={19} color={colors.brand} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: colors.negSoft }]}
              onPress={() => setShowDeleteFriendConfirm(true)}
              disabled={isSubmitting}
              activeOpacity={0.7}
              accessibilityLabel="Delete friend"
            >
              <MaterialIcons name="person-remove" size={20} color={colors.neg} />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom + 24, 40) },
            ]}
          >
            {/* Hero Friend Card */}
            <View style={styles.heroCard}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>
                  {getInitials(liveFriend.name)}
                </Text>
              </View>

              <View style={styles.heroTextCol}>
                <View style={styles.heroBadgeRow}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          net > 0
                            ? colors.posSoft
                            : net < 0
                            ? colors.negSoft
                            : colors.canvas,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            net > 0
                              ? colors.pos
                              : net < 0
                              ? colors.neg
                              : colors.muted,
                        },
                      ]}
                    >
                      {net > 0 ? 'You Lent' : net < 0 ? 'You Borrowed' : 'Settled'}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.heroAmount,
                    {
                      color:
                        net > 0
                          ? colors.pos
                          : net < 0
                          ? colors.neg
                          : colors.ink,
                    },
                  ]}
                >
                  {formatRs(Math.abs(net))}
                </Text>

                <Text style={styles.heroSubLabel}>
                  {net > 0
                    ? `${firstName} owes you this amount`
                    : net < 0
                    ? `You owe ${firstName} this amount`
                    : `All settled up with ${firstName}`}
                </Text>

                {nextRecoveryDate && net !== 0 && (
                  <View style={styles.recoveryDateRow}>
                    <MaterialIcons name="event" size={13} color={colors.brand} />
                    <Text style={styles.recoveryDateText}>
                      Expected due {formatDateDisplay(nextRecoveryDate)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Settle in Full CTA */}
            {net !== 0 && (
              <TouchableOpacity
                style={styles.settleInFullCard}
                onPress={handleSettleInFull}
                activeOpacity={0.85}
              >
                <View style={styles.settleIconWrap}>
                  <MaterialIcons name="check-circle" size={20} color={colors.brand} />
                </View>
                <View style={styles.settleTextWrap}>
                  <Text style={styles.settleTitle}>Settle in full</Text>
                  <Text style={styles.settleSubtitle}>
                    Mark all pending entries as completely paid
                  </Text>
                </View>
                <Text style={styles.settleAmountText}>
                  {formatRs(Math.abs(net))}
                </Text>
              </TouchableOpacity>
            )}

            {/* Record Repayment or New Entry Card */}
            <View style={styles.formCard}>
              <Text style={styles.cardSectionHeading}>Record payment or entry</Text>
              <Text style={styles.cardSectionSub}>
                Enter amount below to record repayment or adjust ledger
              </Text>

              {/* Centered Large Cash Input */}
              <View style={styles.amountInputRow}>
                <Text style={styles.amountPrefix}>Rs.</Text>
                <TextInput
                  style={[
                    styles.amountInput,
                    { color: net < 0 ? colors.neg : colors.brand },
                  ]}
                  placeholder="0"
                  placeholderTextColor={colors.line}
                  keyboardType="numeric"
                  maxLength={10}
                  value={amountStr}
                  onChangeText={(txt) => setAmountStr(txt.replace(/[^0-9]/g, ''))}
                />
              </View>

              {/* Optional Note */}
              <TextInput
                style={styles.noteInput}
                placeholder="Optional note (e.g. Lunch, Cash, Bank transfer)..."
                placeholderTextColor={colors.subtle}
                value={noteStr}
                onChangeText={setNoteStr}
              />

              {/* Dual Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryBtn,
                    (numAmount <= 0 || isSubmitting) && styles.btnDisabled,
                  ]}
                  disabled={numAmount <= 0 || isSubmitting}
                  onPress={() => handleAction(actions.secondary.type)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryBtnText}>
                    {actions.secondary.label}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (numAmount <= 0 || isSubmitting) && styles.btnDisabled,
                  ]}
                  disabled={numAmount <= 0 || isSubmitting}
                  onPress={() => handleAction(actions.primary.type)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>
                    {actions.primary.label}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Transaction History Section */}
            <View style={styles.historyHeaderRow}>
              <Text style={styles.historyHeading}>
                History ({thisFriendEntries.length})
              </Text>
            </View>

            {thisFriendEntries.length === 0 ? (
              <View style={styles.emptyHistoryCard}>
                <MaterialIcons name="history" size={28} color={colors.subtle} />
                <Text style={styles.noHistoryText}>No transactions recorded yet.</Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {thisFriendEntries.map((e, idx) => {
                  const isGave = e.type === 'lent';
                  return (
                    <View
                      key={e.id}
                      style={[
                        styles.historyRow,
                        idx < thisFriendEntries.length - 1 && styles.rowBorder,
                      ]}
                    >
                      <View
                        style={[
                          styles.entryIconBox,
                          {
                            backgroundColor: e.isSettled
                              ? '#EFEFF4'
                              : isGave
                              ? colors.negSoft
                              : colors.posSoft,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={
                            e.isSettled
                              ? 'check'
                              : isGave
                              ? 'arrow-upward'
                              : 'arrow-downward'
                          }
                          size={16}
                          color={
                            e.isSettled
                              ? colors.muted
                              : isGave
                              ? colors.neg
                              : colors.pos
                          }
                        />
                      </View>

                      <View style={styles.entryDetailsCol}>
                        <Text style={styles.entryDesc} numberOfLines={1}>
                          {e.description}
                        </Text>
                        <Text style={styles.entrySub}>
                          {isGave ? 'You gave' : 'You got'} · {formatDateDisplay(e.date)}
                        </Text>
                      </View>

                      <View style={styles.entryRightCol}>
                        <Text
                          style={[
                            styles.entryAmount,
                            {
                              color: e.isSettled
                                ? colors.muted
                                : isGave
                                ? colors.neg
                                : colors.pos,
                            },
                          ]}
                        >
                          {isGave ? '−' : '+'}
                          {formatRs(e.amount)}
                        </Text>
                        {e.isSettled ? (
                          <Text style={styles.settledBadgeText}>Settled</Text>
                        ) : e.remainingAmount !== e.amount ? (
                          <Text style={styles.partialBadgeText}>
                            Rem: {formatRs(e.remainingAmount)}
                          </Text>
                        ) : null}
                      </View>

                      <TouchableOpacity
                        style={styles.entryDeleteBtn}
                        onPress={() => handleDeleteEntry(e.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons name="delete-outline" size={17} color={colors.subtle} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Settle in Full Confirmation */}
        <ConfirmModal
          visible={showSettleConfirm}
          title="Settle in Full?"
          message={`Mark all pending entries with ${firstName} as completely settled?`}
          confirmText="Confirm Settle"
          cancelText="Cancel"
          type="info"
          icon="check-circle"
          onConfirm={confirmSettleInFull}
          onCancel={() => setShowSettleConfirm(false)}
        />

        {/* Delete Entry Confirmation */}
        <ConfirmModal
          visible={deletingEntryId !== null}
          title="Delete Entry"
          message="This will delete this entry from the ledger and reverse the transaction from your Central Wallet. Continue?"
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          icon="delete-outline"
          onConfirm={confirmDeleteEntry}
          onCancel={() => setDeletingEntryId(null)}
        />

        {/* Remove Friend Confirmation */}
        <ConfirmModal
          visible={showDeleteFriendConfirm}
          title={`Remove ${firstName}?`}
          message={`This will permanently delete ${liveFriend.name} and all their ledger entries. Unsettled balances will be reversed from your Central Wallet. This cannot be undone.`}
          confirmText="Remove Friend"
          cancelText="Cancel"
          type="danger"
          icon="person-remove"
          onConfirm={async () => {
            if (isSubmitting) return;
            setShowDeleteFriendConfirm(false);
            setIsSubmitting(true);
            try {
              await deleteFriend(liveFriend.id);
              handleClose();
            } finally {
              setIsSubmitting(false);
            }
          }}
          onCancel={() => setShowDeleteFriendConfirm(false)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
    ...glassCardShadow,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.brand,
  },
  heroTextCol: {
    flex: 1,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  heroAmount: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  heroSubLabel: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.muted,
    marginTop: 2,
  },
  recoveryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  recoveryDateText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.brand,
  },
  settleInFullCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    marginBottom: 14,
    gap: 12,
    ...glassCardShadow,
  },
  settleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleTextWrap: {
    flex: 1,
  },
  settleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  settleSubtitle: {
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 1,
  },
  settleAmountText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
    ...glassCardShadow,
  },
  cardSectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  cardSectionSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 12,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.canvas,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  amountPrefix: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.subtle,
    includeFontPadding: false,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'left',
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  noteInput: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    fontSize: 13.5,
    color: colors.ink,
    backgroundColor: colors.canvas,
    marginBottom: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  historyHeaderRow: {
    marginBottom: 10,
  },
  historyHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyHistoryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  noHistoryText: {
    fontSize: 13,
    color: colors.muted,
  },
  historyList: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...glassCardShadow,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  entryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryDetailsCol: {
    flex: 1,
  },
  entryDesc: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.ink,
  },
  entrySub: {
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 2,
  },
  entryRightCol: {
    alignItems: 'flex-end',
  },
  entryAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  settledBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.pos,
    marginTop: 2,
  },
  partialBadgeText: {
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 2,
  },
  entryDeleteBtn: {
    padding: 6,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
