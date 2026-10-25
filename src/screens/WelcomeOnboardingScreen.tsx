import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

interface WelcomeOnboardingScreenProps {
  onComplete: () => void;
}

export const WelcomeOnboardingScreen: React.FC<WelcomeOnboardingScreenProps> = ({
  onComplete,
}) => {
  const insets = useSafeAreaInsets();
  const { updateUserProfile, updateSecuritySettings, unlockApp } = useWallet();

  const [step, setStep] = useState<1 | 2>(1); // Step 1: Profile info, Step 2: Optional PIN
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorText, setErrorText] = useState('');

  const handleNext = () => {
    setErrorText('');
    if (!name.trim()) {
      setErrorText('Please enter your full name to get started.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorText('Please enter a valid email address.');
      return;
    }
    setStep(2);
  };

  const handleFinish = async (enablePin: boolean) => {
    setErrorText('');
    if (enablePin) {
      if (pin.length !== 4) {
        setErrorText('Passcode PIN must be exactly 4 digits.');
        return;
      }
      if (pin !== confirmPin) {
        setErrorText('PIN confirmation does not match.');
        return;
      }
    }

    const cleanName = name.trim();
    const parts = cleanName.split(/\s+/);
    const initials = parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();

    await updateUserProfile({
      name: cleanName,
      email: email.trim().toLowerCase(),
      avatarInitials: initials,
    });

    if (enablePin) {
      await updateSecuritySettings({
        pin: pin,
        isPinEnabled: true,
      });
    } else {
      await updateSecuritySettings({
        pin: null,
        isPinEnabled: false,
      });
    }

    unlockApp();
    onComplete();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Brand Banner */}
          <View style={styles.topBannerBox}>
            <Image
              source={require('../../assets/logos/logo_mark_symbol_1024x1024.png')}
              style={styles.logoMark}
              resizeMode="contain"
            />
            <Image
              source={require('../../assets/logos/logo_horizontal_light_mode.png')}
              style={styles.logoHorizontal}
              resizeMode="contain"
            />
          </View>

          {step === 1 ? (
            /* STEP 1: Account Creation */
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepBadge}>Step 1 of 2</Text>
                <Text style={styles.stepTitle}>Create your account</Text>
                <Text style={styles.stepSubtitle}>
                  Set up your profile details for personal wallet greeting and offline receipts.
                </Text>
              </View>

              {errorText ? (
                <View style={styles.errorBox}>
                  <MaterialIcons name="error-outline" size={16} color={colors.neg} />
                  <Text style={styles.errorText}>{errorText}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. John Doe"
                  placeholderTextColor={colors.subtle}
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    if (errorText) setErrorText('');
                  }}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. john.doe@example.com"
                  placeholderTextColor={colors.subtle}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (errorText) setErrorText('');
                  }}
                />
              </View>

              <View style={styles.offlineNote}>
                <MaterialIcons name="lock-outline" size={14} color={colors.brand} />
                <Text style={styles.offlineNoteText}>
                  Stored 100% locally on this device. Never sent to remote servers.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.continueBtn}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.continueBtnText}>Continue to Security</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            /* STEP 2: PIN Setup */
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepBadge}>Step 2 of 2</Text>
                <Text style={styles.stepTitle}>Secure with 4-Digit PIN</Text>
                <Text style={styles.stepSubtitle}>
                  Choose a secret PIN to lock your wallet whenever you open the app.
                </Text>
              </View>

              {errorText ? (
                <View style={styles.errorBox}>
                  <MaterialIcons name="error-outline" size={16} color={colors.neg} />
                  <Text style={styles.errorText}>{errorText}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Create 4-Digit PIN</Text>
                <TextInput
                  style={styles.pinInput}
                  placeholder="••••"
                  placeholderTextColor={colors.subtle}
                  value={pin}
                  onChangeText={(t) => {
                    setPin(t.replace(/[^0-9]/g, '').slice(0, 4));
                    if (errorText) setErrorText('');
                  }}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm PIN</Text>
                <TextInput
                  style={styles.pinInput}
                  placeholder="••••"
                  placeholderTextColor={colors.subtle}
                  value={confirmPin}
                  onChangeText={(t) => {
                    setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 4));
                    if (errorText) setErrorText('');
                  }}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.continueBtn,
                  pin.length === 4 && confirmPin.length === 4 ? null : styles.continueBtnDisabled,
                ]}
                onPress={() => handleFinish(true)}
                disabled={pin.length !== 4 || confirmPin.length !== 4}
                activeOpacity={0.8}
              >
                <MaterialIcons name="lock" size={18} color="#FFFFFF" />
                <Text style={styles.continueBtnText}>Lock with PIN &amp; Start</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => handleFinish(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.skipBtnText}>Skip PIN protection for now</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  topBannerBox: {
    alignItems: 'center',
    marginVertical: 18,
  },
  logoMark: {
    width: 72,
    height: 72,
    marginBottom: 10,
  },
  logoHorizontal: {
    width: 195,
    height: 50,
  },
  stepCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.line,
    ...glassCardShadow,
  },
  stepHeader: {
    marginBottom: 20,
  },
  stepBadge: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.negSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12.5,
    color: colors.neg,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
  },
  pinInput: {
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 10,
    textAlign: 'center',
  },
  offlineNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    marginBottom: 20,
    marginTop: 4,
  },
  offlineNoteText: {
    fontSize: 11.5,
    color: colors.brand,
    flex: 1,
    lineHeight: 15,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.muted,
  },
});
