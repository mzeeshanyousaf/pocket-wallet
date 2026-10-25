import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors } from '../theme/colors';
import { glassCardShadow, radius } from '../theme/tokens';

interface AboutScreenProps {
  navigation: any;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const handleOpenDocs = () => {
    Linking.openURL('https://mzeeshanyousaf.github.io').catch((e) => console.log('Cannot open URL', e));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        eyebrow="Application"
        title="About"
        trailing={
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={20} color={colors.ink} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Card */}
        <View style={styles.bannerContainer}>
          <Image
            source={require('../../assets/banners/app_store_promo_banner_1024x500.png')}
            style={styles.bannerImage}
            resizeMode="contain"
          />
        </View>

        {/* Brand Overview Card */}
        <View style={styles.card}>
          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/logos/logo_mark_symbol_1024x1024.png')}
              style={styles.brandSymbol}
              resizeMode="contain"
            />
            <View style={styles.brandTextContainer}>
              <Text style={styles.appName}>Pocket Wallet</Text>
              <Text style={styles.tagline}>Smart Cashflow & Giving Ledger</Text>
              <View style={styles.versionPill}>
                <Text style={styles.versionPillText}>v1.0.0 · Production Ready</Text>
              </View>
            </View>
          </View>
          <Text style={styles.descriptionParagraph}>
            Pocket Wallet is an offline-first financial companion built exclusively for the Pakistani rupee (PKR) ecosystem. It combines salary paycheck cycles, recurring household bills, and a dedicated Give &amp; Take friends ledger into a single central wallet.
          </Text>
        </View>

        {/* Feature Highlights */}
        <Text style={styles.sectionTitle}>Key Features</Text>
        <View style={styles.featuresCard}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.brandSoft }]}>
              <MaterialIcons name="account-balance-wallet" size={20} color={colors.brand} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Central Wallet Balance</Text>
              <Text style={styles.featureDesc}>
                Real-time PKR tracking for every cash-in, cash-out, bill payment, and friend repayment.
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.posSoft }]}>
              <MaterialIcons name="calendar-today" size={20} color={colors.pos} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Salary Payday Cycle</Text>
              <Text style={styles.featureDesc}>
                Monthly income prompts with automatic next-payday countdown and 1-tap wallet crediting.
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.warnSoft }]}>
              <MaterialIcons name="receipt-long" size={20} color={colors.warn} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Recurring Utility Bills</Text>
              <Text style={styles.featureDesc}>
                Schedule Electricity, Rent, Gas, and Internet with instant wallet deduction upon settlement.
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.negSoft }]}>
              <MaterialIcons name="handshake" size={20} color={colors.neg} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Give &amp; Take Friends Ledger</Text>
              <Text style={styles.featureDesc}>
                Track who owes you and what you owe, complete with recovery dates and partial repayments.
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: '#EFEFF4' }]}>
              <MaterialIcons name="lock" size={20} color={colors.ink} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Hardware &amp; PIN Security</Text>
              <Text style={styles.featureDesc}>
                4-digit passcode protection with encrypted local AsyncStorage on your device.
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyCard}>
          <MaterialIcons name="verified-user" size={20} color={colors.brand} />
          <Text style={styles.privacyText}>
            100% Offline-First. No remote databases, no tracking, and no external financial account linking. All personal numbers stay strictly on your device.
          </Text>
        </View>

        {/* Links */}
        <TouchableOpacity style={styles.docsButton} onPress={handleOpenDocs} activeOpacity={0.8}>
          <Text style={styles.docsButtonText}>Learn More &amp; Documentation</Text>
          <MaterialIcons name="open-in-new" size={16} color={colors.brand} />
        </TouchableOpacity>

        {/* Footer */}
        <TouchableOpacity
          style={styles.footer}
          onPress={() => Linking.openURL('https://mzeeshanyousaf.github.io').catch((e) => console.log('Cannot open URL', e))}
          activeOpacity={0.7}
        >
          <Text style={styles.footerCopyright}>Made with love by Zeeshan</Text>
          <Text style={styles.footerBuiltFor}>Crafted for Pakistan · 2026</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContainer: {
    width: '100%',
    height: 150,
    borderRadius: radius.card,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#0F1419',
    ...glassCardShadow,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
    ...glassCardShadow,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandSymbol: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginRight: 14,
  },
  brandTextContainer: {
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  tagline: {
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 2,
  },
  versionPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  versionPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand,
  },
  descriptionParagraph: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.muted,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 6,
  },
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 4,
    marginBottom: 16,
    ...glassCardShadow,
  },
  featureItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  featureDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 17,
  },
  separator: {
    height: 1,
    backgroundColor: colors.line,
    marginLeft: 64,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.brandSoft,
    borderRadius: radius.card,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  privacyText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.brand,
    fontWeight: '500',
  },
  docsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 13,
    marginBottom: 24,
  },
  docsButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.brand,
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  footerCopyright: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.muted,
  },
  footerBuiltFor: {
    fontSize: 11,
    color: colors.subtle,
    marginTop: 3,
  },
});
