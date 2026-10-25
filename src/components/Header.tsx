import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';
import { ConfirmModal } from './ConfirmModal';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Pocket Wallet',
  subtitle,
}) => {
  const { resetAllData } = useWallet();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/logos/logo_mark_symbol_1024x1024.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? (
              <Text style={styles.subtitle}>{subtitle}</Text>
            ) : (
              <Text style={styles.subtitle}>Pakistani Rupees (Rs.)</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.rightActions}>
        <View style={styles.currencyBadge}>
          <Text style={styles.currencyText}>PKR</Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowConfirm(true)}
          accessibilityLabel="Wipe all data"
          activeOpacity={0.7}
        >
          <MaterialIcons name="refresh" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ConfirmModal
        visible={showConfirm}
        title="Wipe All Data"
        message="This will completely wipe all your transactions, bills, and friends ledger to clean defaults. Continue?"
        confirmText="Wipe All Data"
        cancelText="Cancel"
        type="danger"
        icon="delete-sweep"
        onConfirm={async () => {
          setShowConfirm(false);
          await resetAllData();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleContainer: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryLight,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyBadge: {
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
