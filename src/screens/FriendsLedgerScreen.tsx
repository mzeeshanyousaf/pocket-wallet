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
import { AddFriendEntryModal } from '../components/AddFriendEntryModal';
import { FriendDetailModal } from '../components/FriendDetailModal';
import { FriendRow } from '../components/FriendRow';
import { PositionStrip } from '../components/PositionStrip';
import { ScreenHeader } from '../components/ScreenHeader';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme/colors';
import { glassCardShadow, radius } from '../theme/tokens';
import { Friend } from '../types';

export const FriendsLedgerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { friends, friendEntries } = useWallet();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [selectedFriendForDetail, setSelectedFriendForDetail] =
    useState<Friend | null>(null);

  // Filter and sort friends
  const filteredFriends = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = friends.filter((f) => f.name.toLowerCase().includes(q));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getScore = (f: Friend) => {
      const net = f.netBalance;
      if (net === 0) return -1;

      // Check if any overdue recovery exists
      const friendPending = friendEntries.filter(
        (e) => e.friendId === f.id && !e.isSettled
      );
      let isOverdue = false;
      friendPending.forEach((e) => {
        if (new Date(e.recoveryDate).getTime() < today.getTime()) {
          isOverdue = true;
        }
      });

      return (isOverdue ? 1000000000 : 0) + Math.abs(net);
    };

    return list.sort((a, b) => getScore(b) - getScore(a));
  }, [friends, friendEntries, searchQuery]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Screen Header */}
      <ScreenHeader
        eyebrow="Give & take"
        title="Friends ledger"
        trailing={
          <TouchableOpacity
            style={styles.addEntryBtn}
            onPress={() => setShowAddEntryModal(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addEntryBtnText}>Add Entry</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={filteredFriends}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            {/* 2-column Position Strip */}
            <PositionStrip />

            {/* Search Bar */}
            <View style={styles.searchBarWrap}>
              <View style={styles.searchBar}>
                <MaterialIcons name="search" size={18} color={colors.subtle} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search friends"
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
              styles.friendRowWrap,
              index === 0 && styles.friendRowFirst,
              index === filteredFriends.length - 1 && styles.friendRowLast,
            ]}
          >
            <FriendRow
              friend={item}
              entries={friendEntries.filter((e) => e.friendId === item.id)}
              onOpen={(f) => setSelectedFriendForDetail(f)}
            />
            {index < filteredFriends.length - 1 && <View style={styles.divider} />}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <MaterialIcons name="group" size={24} color={colors.subtle} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? `No friends match "${searchQuery}"` : 'No friends recorded yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Tap &quot;+ Add Entry&quot; above to track money lent or borrowed.
            </Text>
          </View>
        }
      />

      {/* Add Friend Entry Modal */}
      <AddFriendEntryModal
        visible={showAddEntryModal}
        onClose={() => setShowAddEntryModal(false)}
        prefilledFriendName=""
      />

      {/* Friend Detail & Settle Modal */}
      {selectedFriendForDetail && (
        <FriendDetailModal
          visible={!!selectedFriendForDetail}
          friend={selectedFriendForDetail}
          onClose={() => setSelectedFriendForDetail(null)}
          onAddNewEntry={() => {
            setSelectedFriendForDetail(null);
            setShowAddEntryModal(true);
          }}
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
  addEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.brand,
  },
  addEntryBtnText: {
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
  friendRowWrap: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  friendRowFirst: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    marginTop: 12,
  },
  friendRowLast: {
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
    paddingVertical: 48,
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
  },
});
