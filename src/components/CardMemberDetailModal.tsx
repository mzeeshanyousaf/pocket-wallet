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
import { CreditCardEntryType, CreditCardMember } from '../types';
import { formatDateDisplay, formatRs, parseDate } from '../utils/formatters';
import { formatCardMemberStatement } from '../utils/statementFormatter';
import { ConfirmModal } from './ConfirmModal';

interface CardMemberDetailModalProps {
  visible: boolean;
  member: CreditCardMember | null;
  onClose: () => void;
}

export const CardMemberDetailModal: React.FC<CardMemberDetailModalProps> = ({
  visible,
  member,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const {
    creditCardMembers,
    creditCardEntries,
    addCreditCardEntry,
    deleteCreditCardEntry,
    deleteCreditCardMember,
    setSuppressAutoLock,
  } = useWallet();

  const [amountStr, setAmountStr] = useState('');
  const [noteStr, setNoteStr] = useState('');
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [showDeleteMemberConfirm, setShowDeleteMemberConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetTransientState = () => {
    setAmountStr('');
    setNoteStr('');
    setShowSettleConfirm(false);
    setDeletingEntryId(null);
    setShowDeleteMemberConfirm(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetTransientState();
    onClose();
  };

  if (!member) return null;

  const liveMember =
    creditCardMembers.find((m) => m.id === member.id) ?? member;
  const owed = liveMember.balanceOwed;
  const firstName = liveMember.name.split(' ')[0];

  const memberEntries = creditCardEntries
    .filter((e) => e.memberId === liveMember.id)
    .sort((a, b) => {
      const dateDiff =
        parseDate(b.date).getTime() - parseDate(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (
        parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime()
      );
    });

  const numAmount = parseFloat(amountStr) || 0;

  const handleSettleRemaining = () => {
    if (owed <= 0 || isSubmitting) return;
    setShowSettleConfirm(true);
  };

  const confirmSettleRemaining = async () => {
    if (owed <= 0 || isSubmitting) return;
    setShowSettleConfirm(false);
    setIsSubmitting(true);
    try {
      await addCreditCardEntry(
        liveMember.name,
        owed,
        'payment',
        'Settled in full'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAction = async (entryType: CreditCardEntryType) => {
    if (numAmount <= 0 || isSubmitting) return;
    const finalNote =
      noteStr.trim() ||
      (entryType === 'charge' ? 'Card spend' : 'Random payment');

    setIsSubmitting(true);
    try {
      await addCreditCardEntry(
        liveMember.name,
        numAmount,
        entryType,
        finalNote
      );
      setAmountStr('');
      setNoteStr('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteEntry = async () => {
    if (!deletingEntryId || isSubmitting) return;
    const id = deletingEntryId;
    setDeletingEntryId(null);
    setIsSubmitting(true);
    try {
      await deleteCreditCardEntry(id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareStatement = async () => {
    setSuppressAutoLock(true);
    try {
      const message = formatCardMemberStatement(liveMember, memberEntries);
      await Share.share({
        message,
        title: `${liveMember.name} — Credit Card Statement`,
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
            <Text style={styles.headerEyebrow}>Card Ledger</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {liveMember.name}
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: colors.brandSoft }]}
              onPress={handleShareStatement}
              activeOpacity={0.7}
              accessibilityLabel="Share credit card statement"
            >
              <MaterialIcons name="share" size={19} color={colors.brand} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: colors.negSoft }]}
              onPress={() => setShowDeleteMemberConfirm(true)}
              disabled={isSubmitting}
              activeOpacity={0.7}
              accessibilityLabel="Delete person from card ledger"
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
            {/* Hero Member Card */}
            <View style={styles.heroCard}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>
                  {getInitials(liveMember.name)}
                </Text>
              </View>

              <View style={styles.heroTextCol}>
                <View style={styles.heroBadgeRow}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          owed > 0
                            ? colors.posSoft
                            : owed < 0
                            ? colors.brandSoft
                            : colors.canvas,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            owed > 0
                              ? colors.pos
                              : owed < 0
                              ? colors.brand
                              : colors.muted,
                        },
                      ]}
                    >
                      {owed > 0
                        ? 'Owes on Card'
                        : owed < 0
                        ? 'Advance Credit'
                        : 'Settled'}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.heroAmount,
                    {
                      color:
                        owed > 0
                          ? colors.pos
                          : owed < 0
                          ? colors.brand
                          : colors.ink,
                    },
                  ]}
                >
                  {formatRs(Math.abs(owed))}
                </Text>

                <Text style={styles.heroSubLabel}>
                  Total used: {formatRs(liveMember.totalCharged)} · Paid:{' '}
                  {formatRs(liveMember.totalPaid)}
                </Text>
              </View>
            </View>

            {/* Quick Settle Remaining CTA */}
            {owed > 0 && (
              <TouchableOpacity
                style={styles.settleInFullCard}
                onPress={handleSettleRemaining}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <View style={styles.settleIconWrap}>
                  <MaterialIcons name="check-circle" size={20} color={colors.brand} />
                </View>
                <View style={styles.settleTextWrap}>
                  <Text style={styles.settleTitle}>Settle remaining in full</Text>
                  <Text style={styles.settleSubtitle}>
                    Record full payment of {formatRs(owed)} in Card Ledger
                  </Text>
                </View>
                <Text style={styles.settleAmountText}>{formatRs(owed)}</Text>
              </TouchableOpacity>
            )}

            {/* Quick Inline Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.cardSectionHeading}>
                Record random payment or card use
              </Text>
              <Text style={styles.cardSectionSub}>
                Payments stay in this Credit Card Ledger without affecting your Central Wallet
              </Text>

              <View style={styles.amountInputRow}>
                <Text style={styles.amountPrefix}>Rs.</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.brand }]}
                  placeholder="0"
                  placeholderTextColor={colors.line}
                  keyboardType="numeric"
                  maxLength={10}
                  value={amountStr}
                  onChangeText={(txt) => setAmountStr(txt.replace(/[^0-9]/g, ''))}
                />
              </View>

              <TextInput
                style={styles.noteInput}
                placeholder="Optional note (e.g. EasyPaisa, Daraz, Petrol)..."
                placeholderTextColor={colors.subtle}
                value={noteStr}
                onChangeText={setNoteStr}
              />

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryBtn,
                    (numAmount <= 0 || isSubmitting) && styles.btnDisabled,
                  ]}
                  disabled={numAmount <= 0 || isSubmitting}
                  onPress={() => handleQuickAction('charge')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryBtnText}>+ Card Used</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (numAmount <= 0 || isSubmitting) && styles.btnDisabled,
                  ]}
                  disabled={numAmount <= 0 || isSubmitting}
                  onPress={() => handleQuickAction('payment')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>Got Payment</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Chronological History List */}
            <View style={styles.historyHeaderRow}>
              <Text style={styles.historyHeading}>
                History ({memberEntries.length})
              </Text>
            </View>

            {memberEntries.length === 0 ? (
              <View style={styles.emptyHistoryCard}>
                <MaterialIcons name="history" size={28} color={colors.subtle} />
                <Text style={styles.noHistoryText}>
                  No card entries recorded yet.
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {memberEntries.map((e, idx) => {
                  const isCharge = e.type === 'charge';
                  return (
                    <View
                      key={e.id}
                      style={[
                        styles.historyRow,
                        idx < memberEntries.length - 1 && styles.rowBorder,
                      ]}
                    >
                      <View
                        style={[
                          styles.entryIconBox,
                          {
                            backgroundColor: isCharge
                              ? colors.negSoft
                              : colors.posSoft,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={isCharge ? 'credit-card' : 'arrow-downward'}
                          size={16}
                          color={isCharge ? colors.neg : colors.pos}
                        />
                      </View>

                      <View style={styles.entryDetailsCol}>
                        <Text style={styles.entryDesc} numberOfLines={1}>
                          {e.description}
                        </Text>
                        <Text style={styles.entrySub}>
                          {isCharge ? 'Card used' : 'Payment received'} ·{' '}
                          {formatDateDisplay(e.date)}
                        </Text>
                      </View>

                      <View style={styles.entryRightCol}>
                        <Text
                          style={[
                            styles.entryAmount,
                            { color: isCharge ? colors.neg : colors.pos },
                          ]}
                        >
                          {isCharge ? '−' : '+'}
                          {formatRs(e.amount)}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.entryDeleteBtn}
                        onPress={() => setDeletingEntryId(e.id)}
                        disabled={isSubmitting}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons
                          name="delete-outline"
                          size={17}
                          color={colors.subtle}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Settle Remaining Confirmation */}
        <ConfirmModal
          visible={showSettleConfirm}
          title="Settle Remaining?"
          message={`Record a payment of ${formatRs(Math.max(0, owed))} from ${firstName} in the Credit Card Ledger?`}
          confirmText="Confirm Payment"
          cancelText="Cancel"
          type="info"
          icon="check-circle"
          onConfirm={confirmSettleRemaining}
          onCancel={() => setShowSettleConfirm(false)}
        />

        {/* Delete Entry Confirmation */}
        <ConfirmModal
          visible={deletingEntryId !== null}
          title="Delete Card Entry"
          message="Remove this entry from the Credit Card Ledger? Your Central Wallet and Bills will not be affected."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          icon="delete-outline"
          onConfirm={confirmDeleteEntry}
          onCancel={() => setDeletingEntryId(null)}
        />

        {/* Delete Member Confirmation */}
        <ConfirmModal
          visible={showDeleteMemberConfirm}
          title={`Remove ${firstName}?`}
          message={`Permanently delete ${liveMember.name} and all their Credit Card Ledger entries? This will not affect your Central Wallet or Bills.`}
          confirmText="Remove Person"
          cancelText="Cancel"
          type="danger"
          icon="person-remove"
          onConfirm={async () => {
            if (isSubmitting) return;
            setShowDeleteMemberConfirm(false);
            setIsSubmitting(true);
            try {
              await deleteCreditCardMember(liveMember.id);
              handleClose();
            } finally {
              setIsSubmitting(false);
            }
          }}
          onCancel={() => setShowDeleteMemberConfirm(false)}
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
    fontVariant: ['tabular-nums'],
  },
  heroSubLabel: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.muted,
    marginTop: 3,
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
    fontVariant: ['tabular-nums'],
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
    backgroundColor: colors.brand,
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
    fontVariant: ['tabular-nums'],
  },
  entryDeleteBtn: {
    padding: 6,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
