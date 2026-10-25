import React, { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionRequiredCard } from '../components/ActionRequiredCard';
import { BalanceCard } from '../components/BalanceCard';
import { FriendDetailModal } from '../components/FriendDetailModal';
import { PayBillModal } from '../components/PayBillModal';
import { QuickEntryModal } from '../components/QuickEntryModal';
import { ScreenHeader } from '../components/ScreenHeader';
import { TransactionItem } from '../components/TransactionItem';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme/colors';
import { radius } from '../theme/tokens';
import { Bill, DueActionItem, Friend, WalletTransaction } from '../types';
import { formatDateDisplay } from '../utils/formatters';

interface HomeScreenProps {
  navigation: any;
}

type CashflowFilter = 'all' | 'in' | 'out';

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const {
    transactions,
    bills,
    friends,
    dueActionItems,
    userProfile,
    deleteTransaction,
  } = useWallet();

  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [quickEntryModalVisible, setQuickEntryModalVisible] = useState(false);
  const [quickEntryType, setQuickEntryType] = useState<'income' | 'expense'>('expense');
  const [cashflowFilter, setCashflowFilter] = useState<CashflowFilter>('all');
  const [selectedBillForPay, setSelectedBillForPay] = useState<Bill | null>(null);
  const [selectedFriendForDetail, setSelectedFriendForDetail] = useState<Friend | null>(null);

  // Group transactions by date
  const filteredAndGroupedTransactions = useMemo(() => {
    const list = transactions.filter((tx) => {
      const isIn =
        tx.type === 'income' ||
        tx.type === 'salary' ||
        (tx.type === 'friend_settlement' && tx.settlementType === 'received_back');
      if (cashflowFilter === 'in') return isIn;
      if (cashflowFilter === 'out') return !isIn;
      return true;
    });

    const groups: { dateLabel: string; items: WalletTransaction[] }[] = [];
    const dateMap = new Map<string, WalletTransaction[]>();

    list.forEach((tx) => {
      const label = formatDateDisplay(tx.date);
      if (!dateMap.has(label)) {
        dateMap.set(label, []);
      }
      dateMap.get(label)!.push(tx);
    });

    dateMap.forEach((items, dateLabel) => {
      groups.push({ dateLabel, items });
    });

    return groups;
  }, [transactions, cashflowFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 400);
  };

  const handleOpenCashIn = () => {
    setQuickEntryType('income');
    setQuickEntryModalVisible(true);
  };

  const handleOpenCashOut = () => {
    setQuickEntryType('expense');
    setQuickEntryModalVisible(true);
  };

  const handleActionItemPress = (item: DueActionItem) => {
    if (item.type === 'bill') {
      const foundBill = bills.find((b) => b.id === item.referenceId);
      if (foundBill) {
        setSelectedBillForPay(foundBill);
      } else {
        navigation.navigate('Bills & Salary');
      }
    } else if (item.type === 'friend_recovery') {
      const foundFriend = friends.find((f) => f.name.toLowerCase() === item.friendName?.toLowerCase());
      if (foundFriend) {
        setSelectedFriendForDetail(foundFriend);
      } else {
        navigation.navigate('Give & Take');
      }
    } else {
      navigation.navigate('Bills & Salary');
    }
  };

  // Formatted date string for eyebrow
  const todayEyebrow = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const firstName = userProfile.name ? userProfile.name.split(' ')[0] : 'there';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Screen Header matching wallet-app-desgin */}
      <ScreenHeader
        eyebrow={todayEyebrow}
        title={`Hi, ${firstName}`}
        trailing={
          <TouchableOpacity
            style={styles.avatarPill}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
            accessibilityLabel="User profile and settings"
          >
            <Text style={styles.avatarText}>{userProfile.avatarInitials || 'AR'}</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={filteredAndGroupedTransactions}
        keyExtractor={(item) => item.dateLabel}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* Hero Dark Balance Card */}
            <BalanceCard
              balanceHidden={balanceHidden}
              onToggleBalance={() => setBalanceHidden((prev) => !prev)}
              onCashIn={handleOpenCashIn}
              onCashOut={handleOpenCashOut}
            />

            {/* Action Required Alert Section */}
            {dueActionItems.length > 0 && (
              <View style={styles.actionCardWrap}>
                <ActionRequiredCard
                  onPressItem={handleActionItemPress}
                  onNavigateTab={(tab) => navigation.navigate(tab)}
                />
              </View>
            )}

            {/* Cashflow Stream Title & Segmented Filter Bar */}
            <View style={styles.cashflowHeaderRow}>
              <Text style={styles.cashflowTitle}>Cashflow</Text>
              <View style={styles.filterPillsRow}>
                {(['all', 'in', 'out'] as CashflowFilter[]).map((f) => {
                  const isActive = cashflowFilter === f;
                  const label = f === 'all' ? 'All' : f === 'in' ? 'Inflows' : 'Outflows';
                  return (
                    <TouchableOpacity
                      key={f}
                      style={[styles.filterPill, isActive && styles.filterPillActive]}
                      onPress={() => setCashflowFilter(f)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          isActive && styles.filterPillTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.dateGroupContainer}>
            <Text style={styles.dateGroupHeader}>{item.dateLabel}</Text>
            <View style={styles.dateGroupCard}>
              {item.items.map((tx, idx) => (
                <View key={tx.id}>
                  <TransactionItem
                    transaction={tx}
                    onDelete={deleteTransaction}
                    balanceHidden={balanceHidden}
                  />
                  {idx < item.items.length - 1 && <View style={styles.rowDivider} />}
                </View>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Text style={styles.emptyInboxEmoji}>📥</Text>
            </View>
            <Text style={styles.emptyTitle}>
              No {cashflowFilter === 'in' ? 'inflows' : cashflowFilter === 'out' ? 'outflows' : 'transactions'} yet
            </Text>
            <Text style={styles.emptySubtitle}>
              Use Cash in or Cash out to log money as it moves.
            </Text>
          </View>
        }
      />

      {/* Cash In / Out Quick Entry Sheet */}
      <QuickEntryModal
        visible={quickEntryModalVisible}
        onClose={() => setQuickEntryModalVisible(false)}
        defaultType={quickEntryType}
      />

      {/* Quick Pay Bill Modal */}
      {selectedBillForPay && (
        <PayBillModal
          visible={!!selectedBillForPay}
          bill={selectedBillForPay}
          onClose={() => setSelectedBillForPay(null)}
        />
      )}

      {/* Quick Settle Friend Modal */}
      {selectedFriendForDetail && (
        <FriendDetailModal
          visible={!!selectedFriendForDetail}
          friend={selectedFriendForDetail}
          onClose={() => setSelectedFriendForDetail(null)}
        />
      )}
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
  avatarPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSection: {
    gap: 16,
  },
  actionCardWrap: {
    marginTop: 2,
  },
  cashflowHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
  },
  cashflowTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  filterPillsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(230, 232, 236, 0.7)',
    borderRadius: 999,
    padding: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: colors.surface,
    shadowColor: '#0F1419',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.muted,
  },
  filterPillTextActive: {
    color: colors.ink,
    fontWeight: '700',
  },
  dateGroupContainer: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  dateGroupHeader: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.muted,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  dateGroupCard: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: '#0F1419',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginLeft: 68,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    marginHorizontal: 16,
    marginTop: 16,
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
  emptyInboxEmoji: {
    fontSize: 20,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
  },
});
