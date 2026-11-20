import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddCardEntryModal } from '../components/AddCardEntryModal';
import { CardBankPaymentModal } from '../components/CardBankPaymentModal';
import { CardMemberDetailModal } from '../components/CardMemberDetailModal';
import { CardMemberRow } from '../components/CardMemberRow';
import { ConfirmModal } from '../components/ConfirmModal';
import { CreditCardSummaryCard } from '../components/CreditCardSummaryCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme/colors';
import { glassCardShadow, radius } from '../theme/tokens';
import { CreditCardMember } from '../types';
import { formatDateDisplay, formatRs, parseDate } from '../utils/formatters';

export const CreditCardLedgerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    creditCardMembers,
    creditCardEntries,
    creditCardBankPayments,
    deleteCreditCardBankPayment,
  } = useWallet();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [showBankPaymentModal, setShowBankPaymentModal] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<CreditCardMember | null>(null);
  const [deletingBankPaymentId, setDeletingBankPaymentId] = useState<
    string | null
  >(null);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = creditCardMembers.filter((m) =>
      m.name.toLowerCase().includes(q)
    );

    const getBucket = (m: CreditCardMember) => {
      if (m.balanceOwed > 0) return 0;
      if (m.balanceOwed < 0) return 1;
      return 2;
    };

    return list.sort((a, b) => {
      const bucketDiff = getBucket(a) - getBucket(b);
      if (bucketDiff !== 0) return bucketDiff;
      if (a.balanceOwed > 0) return b.balanceOwed - a.balanceOwed;
      if (a.balanceOwed < 0) {
        return Math.abs(b.balanceOwed) - Math.abs(a.balanceOwed);
      }
      return a.name.localeCompare(b.name);
    });
  }, [creditCardMembers, searchQuery]);

  const sortedBankPayments = useMemo(() => {
    return [...creditCardBankPayments].sort((a, b) => {
      const dateDiff =
        parseDate(b.date).getTime() - parseDate(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (
        parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime()
      );
    });
  }, [creditCardBankPayments]);

  const entryCountByMember = useMemo(() => {
    const counts = new Map<string, number>();
    creditCardEntries.forEach((e) => {
      counts.set(e.memberId, (counts.get(e.memberId) ?? 0) + 1);
    });
    return counts;
  }, [creditCardEntries]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        eyebrow="Friends & family card"
        title="Credit card"
        trailing={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddEntryModal(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <CreditCardSummaryCard
              onAddCharge={() => setShowAddEntryModal(true)}
              onPayBank={() => setShowBankPaymentModal(true)}
            />

            {/* Search Bar */}
            <View style={styles.searchBarWrap}>
              <View style={styles.searchBar}>
                <MaterialIcons name="search" size={18} color={colors.subtle} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search people on card"
                  placeholderTextColor={colors.subtle}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="close" size={16} color={colors.subtle} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.memberRowWrap,
              index === 0 && styles.memberRowFirst,
              index === filteredMembers.length - 1 && styles.memberRowLast,
            ]}
          >
            <CardMemberRow
              member={item}
              entryCount={entryCountByMember.get(item.id) ?? 0}
              onOpen={(m) => setSelectedMember(m)}
            />
            {index < filteredMembers.length - 1 && (
              <View style={styles.divider} />
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <MaterialIcons name="credit-card" size={24} color={colors.subtle} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery
                ? `No people match "${searchQuery}"`
                : 'No credit card entries yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Tap &quot;+ Add&quot; above to track when friends or family use your card and send random payments — kept separate from your Bills and Wallet.
            </Text>
          </View>
        }
        ListFooterComponent={
          sortedBankPayments.length > 0 ? (
            <View style={styles.bankSection}>
              <View style={styles.bankHeaderRow}>
                <Text style={styles.bankSectionTitle}>
                  Bank payments history ({sortedBankPayments.length})
                </Text>
                <TouchableOpacity
                  onPress={() => setShowBankPaymentModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.logBankAction}>+ Log bank payment</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bankListCard}>
                {sortedBankPayments.map((p, idx) => (
                  <View
                    key={p.id}
                    style={[
                      styles.bankRow,
                      idx < sortedBankPayments.length - 1 &&
                        styles.bankRowBorder,
                    ]}
                  >
                    <View style={styles.bankIconBox}>
                      <MaterialIcons
                        name="account-balance"
                        size={17}
                        color={colors.brand}
                      />
                    </View>

                    <View style={styles.bankInfoCol}>
                      <Text style={styles.bankNote} numberOfLines={1}>
                        {p.note}
                      </Text>
                      <Text style={styles.bankDate}>
                        {formatDateDisplay(p.date)}
                      </Text>
                    </View>

                    <Text style={styles.bankAmount}>{formatRs(p.amount)}</Text>

                    <TouchableOpacity
                      style={styles.bankDeleteBtn}
                      onPress={() => setDeletingBankPaymentId(p.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Delete bank payment"
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={17}
                        color={colors.subtle}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          ) : null
        }
      />

      {/* Add Card Entry Modal */}
      <AddCardEntryModal
        visible={showAddEntryModal}
        onClose={() => setShowAddEntryModal(false)}
        defaultType="charge"
      />

      {/* Pay Bank Modal */}
      <CardBankPaymentModal
        visible={showBankPaymentModal}
        onClose={() => setShowBankPaymentModal(false)}
      />

      {/* Card Member Detail Modal */}
      {selectedMember && (
        <CardMemberDetailModal
          visible={!!selectedMember}
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* Delete Bank Payment Confirmation */}
      <ConfirmModal
        visible={deletingBankPaymentId !== null}
        title="Delete Bank Payment?"
        message="Remove this bank payment record from the Credit Card Ledger? Your Central Wallet and Bills will not be affected."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        icon="delete-outline"
        onConfirm={async () => {
          if (!deletingBankPaymentId) return;
          const id = deletingBankPaymentId;
          setDeletingBankPaymentId(null);
          await deleteCreditCardBankPayment(id);
        }}
        onCancel={() => setDeletingBankPaymentId(null)}
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.brand,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerStack: {
    gap: 16,
  },
  searchBarWrap: {
    paddingHorizontal: 16,
  },
  searchBar: {
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    color: colors.ink,
    paddingVertical: 0,
  },
  memberRowWrap: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  memberRowFirst: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    marginTop: 12,
  },
  memberRowLast: {
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
    paddingVertical: 44,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  bankSection: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  bankHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  bankSectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logBankAction: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.brand,
  },
  bankListCard: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...glassCardShadow,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  bankRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  bankIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankInfoCol: {
    flex: 1,
  },
  bankNote: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  bankDate: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  bankAmount: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  bankDeleteBtn: {
    padding: 6,
    marginLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
