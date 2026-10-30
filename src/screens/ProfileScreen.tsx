import { MaterialIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmModal } from '../components/ConfirmModal';
import { ScreenHeader } from '../components/ScreenHeader';
import { useWallet } from '../context/WalletContext';
import { SecurityService } from '../services/security';
import { colors } from '../theme/colors';
import { glassCardShadow, radius } from '../theme/tokens';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    userProfile,
    securitySettings,
    updateUserProfile,
    updateSecuritySettings,
    resetAllData,
  } = useWallet();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email);
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [profileError, setProfileError] = useState<string | null>(null);

  // Biometrics hardware detection state
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricName, setBiometricName] = useState<'Fingerprint' | 'Face ID'>('Fingerprint');

  // PIN Setup Modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Confirm modals
  const [showDisablePinConfirm, setShowDisablePinConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon?: keyof typeof MaterialIcons.glyphMap;
    type?: 'info' | 'danger' | 'warning';
  }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const hasHw = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (hasHw && isEnrolled) {
          setHasBiometrics(true);
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricName('Face ID');
          } else {
            setBiometricName('Fingerprint');
          }
        }
      } catch (err) {
        console.log('Biometrics check error:', err);
      }
    })();
  }, []);

  const handleSaveProfile = async () => {
    setProfileError(null);
    if (!name.trim()) {
      setProfileError('Please enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setProfileError('Please enter a valid email address.');
      return;
    }
    await updateUserProfile({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
    });
    setIsEditing(false);
    setAlertInfo({
      visible: true,
      title: 'Profile Updated',
      message: 'Your personal information has been saved successfully.',
      icon: 'check-circle',
      type: 'info',
    });
  };

  const handleTogglePin = (value: boolean) => {
    if (value) {
      setNewPin('');
      setConfirmPin('');
      setPinError(null);
      setShowPinModal(true);
    } else {
      setShowDisablePinConfirm(true);
    }
  };

  const handleToggleBiometrics = async (val: boolean) => {
    if (val) {
      if (!securitySettings.isPinEnabled) {
        setAlertInfo({
          visible: true,
          title: 'Set PIN First',
          message: 'Please set up a 4-digit PIN first so you always have a passcode fallback if fingerprint fails.',
          icon: 'lock',
          type: 'warning',
        });
        return;
      }

      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Verify ${biometricName} to enable unlock`,
          cancelLabel: 'Cancel',
          disableDeviceFallback: true,
        });

        if (result.success) {
          await updateSecuritySettings({ biometricsEnabled: true });
          setAlertInfo({
            visible: true,
            title: `${biometricName} Enabled`,
            message: `Pocket Wallet can now be unlocked using ${biometricName} or your 4-digit PIN.`,
            icon: biometricName === 'Face ID' ? 'face' : 'fingerprint',
            type: 'info',
          });
        }
      } catch (err) {
        console.log('Biometric verification error:', err);
      }
    } else {
      await updateSecuritySettings({ biometricsEnabled: false });
    }
  };

  const handleSavePin = async () => {
    setPinError(null);
    if (newPin.length !== 4) {
      setPinError('PIN must be exactly 4 numeric digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('Confirmation PIN does not match. Please re-enter.');
      return;
    }

    // Persist PIN salted hash in SecureStore hardware storage
    await SecurityService.setPin(newPin);

    // Save security settings flag without plaintext PIN
    await updateSecuritySettings({
      pin: null,
      isPinEnabled: true,
    });
    setShowPinModal(false);
    setAlertInfo({
      visible: true,
      title: 'Lock Enabled',
      message: 'Pocket Wallet is now protected with your 4-digit PIN.',
      icon: 'lock',
      type: 'info',
    });
  };

  const handleResetData = () => {
    setShowResetConfirm(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        eyebrow="Account & Security"
        title="Settings"
        trailing={
          <TouchableOpacity
            style={styles.aboutPillBtn}
            onPress={() => navigation.navigate('About')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="info-outline" size={18} color={colors.ink} />
            <Text style={styles.aboutPillText}>About</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Header */}
        <View style={styles.profileHeroCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitialsText}>{userProfile.avatarInitials}</Text>
          </View>
          <View style={styles.profileHeroInfo}>
            <Text style={styles.profileHeroName}>{userProfile.name}</Text>
            <Text style={styles.profileHeroEmail}>{userProfile.email}</Text>
            <View style={styles.currencyBadge}>
              <MaterialIcons name="payments" size={13} color={colors.brand} />
              <Text style={styles.currencyBadgeText}>{userProfile.currency}</Text>
            </View>
          </View>
        </View>

        {/* Section: Account Information */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Profile details</Text>
          <TouchableOpacity
            onPress={() => {
              if (isEditing) {
                // cancel
                setName(userProfile.name);
                setEmail(userProfile.email);
                setPhone(userProfile.phone || '');
                setIsEditing(false);
              } else {
                setIsEditing(true);
              }
            }}
          >
            <Text style={styles.editActionText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsGroupCard}>
          {/* Full Name */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={colors.subtle}
              />
            ) : (
              <Text style={styles.fieldValue}>{userProfile.name}</Text>
            )}
          </View>
          <View style={styles.separator} />

          {/* Email Address */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter email"
                placeholderTextColor={colors.subtle}
              />
            ) : (
              <Text style={styles.fieldValue}>{userProfile.email}</Text>
            )}
          </View>
          <View style={styles.separator} />

          {/* Phone Number */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Mobile Phone</Text>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+92 300 0000000"
                placeholderTextColor={colors.subtle}
              />
            ) : (
              <Text style={styles.fieldValue}>{userProfile.phone || 'Not set'}</Text>
            )}
          </View>

          {isEditing && profileError && (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={15} color={colors.neg} />
              <Text style={styles.errorBoxText}>{profileError}</Text>
            </View>
          )}

          {isEditing && (
            <TouchableOpacity
              style={styles.saveProfileBtn}
              onPress={handleSaveProfile}
              activeOpacity={0.8}
            >
              <MaterialIcons name="check" size={18} color="#FFFFFF" />
              <Text style={styles.saveProfileBtnText}>Save changes</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section: Security & Privacy */}
        <Text style={styles.sectionTitle}>Security & Privacy</Text>
        <View style={styles.settingsGroupCard}>
          {/* 4-Digit PIN Toggle */}
          <View style={styles.settingToggleRow}>
            <View style={styles.settingIconBox}>
              <MaterialIcons name="lock-outline" size={20} color={colors.ink} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Require PIN on startup</Text>
              <Text style={styles.settingSubtitle}>
                {securitySettings.isPinEnabled
                  ? 'Active · 4-digit PIN is protecting wallet'
                  : 'Disabled · Open without passcode'}
              </Text>
            </View>
            <Switch
              value={securitySettings.isPinEnabled}
              onValueChange={handleTogglePin}
              trackColor={{ false: colors.line, true: colors.brand }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Change PIN option if already enabled */}
          {securitySettings.isPinEnabled && (
            <>
              <View style={styles.separator} />
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  setNewPin('');
                  setConfirmPin('');
                  setShowPinModal(true);
                }}
              >
                <View style={styles.settingIconBox}>
                  <MaterialIcons name="pin" size={20} color={colors.ink} />
                </View>
                <Text style={styles.actionRowText}>Change 4-digit PIN</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.subtle} />
              </TouchableOpacity>
            </>
          )}

          {/* Biometrics / Fingerprint Toggle — only shown when device supports it */}
          {hasBiometrics && (
            <>
              <View style={styles.separator} />
              <View style={styles.settingToggleRow}>
                <View style={styles.settingIconBox}>
                  <MaterialIcons
                    name={biometricName === 'Face ID' ? 'face' : 'fingerprint'}
                    size={20}
                    color={colors.ink}
                  />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>{biometricName} unlock</Text>
                  <Text style={styles.settingSubtitle}>
                    {!securitySettings.isPinEnabled
                      ? 'Set 4-digit PIN first to activate'
                      : securitySettings.biometricsEnabled
                      ? `Active · Unlock with ${biometricName} or PIN`
                      : `Disabled · Unlock with PIN only`}
                  </Text>
                </View>
                <Switch
                  value={securitySettings.biometricsEnabled && securitySettings.isPinEnabled}
                  onValueChange={handleToggleBiometrics}
                  trackColor={{ false: colors.line, true: colors.brand }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </>
          )}
        </View>

        {/* Section: Data & Backup */}
        <Text style={styles.sectionTitle}>Data management</Text>
        <View style={styles.settingsGroupCard}>
          <TouchableOpacity style={styles.actionRow} onPress={handleResetData}>
            <View style={[styles.settingIconBox, { backgroundColor: colors.negSoft }]}>
              <MaterialIcons name="delete-sweep" size={20} color={colors.neg} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.actionRowText, { color: colors.neg }]}>
                Wipe all data
              </Text>
              <Text style={styles.settingSubtitle}>Clear transactions, bills, and reset wallet</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.subtle} />
          </TouchableOpacity>
        </View>

        {/* Footer Brand Logo & Version */}
        <View style={styles.footerContainer}>
          <Image
            source={require('../../assets/logos/logo_horizontal_light_mode.png')}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.versionText}>Pocket Wallet v1.0.0</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://mzeeshanyousaf.github.io').catch((e) => console.log('Cannot open URL', e))}
            activeOpacity={0.7}
            style={styles.authorButton}
          >
            <Text style={styles.authorText}>
              Made with love by Zeeshan
            </Text>
          </TouchableOpacity>
          <Text style={styles.offlineText}>Offline-First Local Storage · 100% On-Device & Private</Text>
        </View>
      </ScrollView>

      {/* PIN Setup Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowPinModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={() => setShowPinModal(false)}>
            <View style={styles.modalBackdrop}>
              <TouchableWithoutFeedback>
                <View style={styles.pinSheetContainer}>
                  <View style={styles.dragHandle} />
                  <View style={styles.pinModalHeader}>
                    <Text style={styles.pinModalTitle}>
                      {securitySettings.pin ? 'Change 4-digit PIN' : 'Set up 4-digit PIN'}
                    </Text>
                    <Text style={styles.pinModalSubtitle}>
                      This PIN will be required every time you open Pocket Wallet.
                    </Text>
                  </View>

                  {pinError && (
                    <View style={styles.pinErrorBox}>
                      <MaterialIcons name="error-outline" size={15} color={colors.neg} />
                      <Text style={styles.pinErrorText}>{pinError}</Text>
                    </View>
                  )}

                  <View style={styles.pinInputBlock}>
                    <Text style={styles.pinInputLabel}>Choose 4-digit PIN</Text>
                    <TextInput
                      style={styles.pinBoxInput}
                      value={newPin}
                      onChangeText={(t) => setNewPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={4}
                      placeholder="••••"
                      placeholderTextColor={colors.subtle}
                    />
                  </View>

                  <View style={styles.pinInputBlock}>
                    <Text style={styles.pinInputLabel}>Confirm PIN</Text>
                    <TextInput
                      style={styles.pinBoxInput}
                      value={confirmPin}
                      onChangeText={(t) => setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={4}
                      placeholder="••••"
                      placeholderTextColor={colors.subtle}
                    />
                  </View>

                  <View style={styles.pinBtnRow}>
                    <TouchableOpacity
                      style={styles.pinCancelBtn}
                      onPress={() => setShowPinModal(false)}
                    >
                      <Text style={styles.pinCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.pinConfirmBtn,
                        newPin.length === 4 && confirmPin.length === 4
                          ? styles.pinConfirmBtnActive
                          : null,
                      ]}
                      onPress={handleSavePin}
                      disabled={newPin.length !== 4 || confirmPin.length !== 4}
                    >
                      <Text style={styles.pinConfirmBtnText}>Save & Lock</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Disable PIN Confirmation */}
      <ConfirmModal
        visible={showDisablePinConfirm}
        title="Disable App Lock"
        message={
          securitySettings.biometricsEnabled
            ? `Are you sure you want to remove your 4-digit PIN security lock? This will also disable ${biometricName} unlock.`
            : 'Are you sure you want to remove your 4-digit PIN security lock?'
        }
        confirmText="Disable Lock"
        cancelText="Cancel"
        type="warning"
        icon="lock-open"
        onConfirm={async () => {
          setShowDisablePinConfirm(false);
          await SecurityService.removePin();
          await updateSecuritySettings({
            isPinEnabled: false,
            pin: null,
            biometricsEnabled: false,
          });
        }}
        onCancel={() => setShowDisablePinConfirm(false)}
      />

      {/* Wipe All Data Confirmation */}
      <ConfirmModal
        visible={showResetConfirm}
        title="Wipe All Data"
        message="This will completely wipe all transactions, bills, friends ledger entries, and reset wallet balance to 0. Continue?"
        confirmText="Wipe All Data"
        cancelText="Cancel"
        type="danger"
        icon="delete-sweep"
        onConfirm={async () => {
          setShowResetConfirm(false);
          await resetAllData();
          setName('John Doe');
          setEmail('john.doe@example.com');
          setPhone('');
          setAlertInfo({
            visible: true,
            title: 'Data Wiped',
            message: 'All wallet data has been wiped clean.',
            icon: 'check-circle',
            type: 'info',
          });
        }}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* Branded Alert / Info Modal */}
      <ConfirmModal
        visible={alertInfo.visible}
        title={alertInfo.title}
        message={alertInfo.message}
        confirmText="OK"
        type={alertInfo.type || 'info'}
        icon={alertInfo.icon || 'info'}
        onConfirm={() => setAlertInfo({ visible: false, title: '', message: '' })}
      />
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
  aboutPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  aboutPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.ink,
  },
  profileHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 18,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.line,
    ...glassCardShadow,
  },
  avatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarInitialsText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  profileHeroInfo: {
    flex: 1,
  },
  profileHeroName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  profileHeroEmail: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brandSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  currencyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 12,
  },
  editActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand,
  },
  settingsGroupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    marginBottom: 16,
    ...glassCardShadow,
  },
  fieldRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.muted,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.ink,
  },
  fieldInput: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.brand,
    paddingVertical: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.line,
    marginLeft: 16,
  },
  saveProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brand,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  saveProfileBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  settingSubtitle: {
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    flex: 1,
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  footerLogo: {
    width: 140,
    height: 38,
    marginBottom: 6,
  },
  versionText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.muted,
  },
  authorButton: {
    marginVertical: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  authorText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.brand,
  },
  offlineText: {
    fontSize: 11,
    color: colors.subtle,
    marginTop: 2,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 20, 25, 0.55)',
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoid: {
    width: '100%',
  },
  pinSheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pinModalHeader: {
    marginBottom: 16,
  },
  pinModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  pinModalSubtitle: {
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 4,
  },
  pinInputBlock: {
    marginBottom: 14,
  },
  pinInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
  },
  pinBoxInput: {
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 10,
    textAlign: 'center',
  },
  pinBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  pinCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.ink,
  },
  pinConfirmBtn: {
    flex: 2,
    backgroundColor: colors.line,
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinConfirmBtnActive: {
    backgroundColor: colors.brand,
  },
  pinConfirmBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.negSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginVertical: 10,
  },
  errorBoxText: {
    fontSize: 12.5,
    color: colors.neg,
    fontWeight: '500',
    flex: 1,
  },
  pinErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.negSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginBottom: 12,
  },
  pinErrorText: {
    fontSize: 12.5,
    color: colors.neg,
    fontWeight: '500',
    flex: 1,
  },
});
