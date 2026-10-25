import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
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
import { ScreenHeader } from '../components/ScreenHeader';
import { useWallet } from '../context/WalletContext';
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

  // PIN Setup Modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    await updateUserProfile({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
    });
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully.');
  };

  const handleTogglePin = (value: boolean) => {
    if (value) {
      // Opening PIN setup
      setNewPin('');
      setConfirmPin('');
      setShowPinModal(true);
    } else {
      Alert.alert(
        'Disable App Lock',
        'Are you sure you want to remove your 4-digit PIN security lock?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable PIN',
            style: 'destructive',
            onPress: async () => {
              await updateSecuritySettings({
                isPinEnabled: false,
                pin: null,
              });
            },
          },
        ]
      );
    }
  };

  const handleSavePin = async () => {
    if (newPin.length !== 4) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 numeric digits.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'Confirmation PIN does not match. Please re-enter.');
      return;
    }

    await updateSecuritySettings({
      pin: newPin,
      isPinEnabled: true,
    });
    setShowPinModal(false);
    Alert.alert('Lock Enabled', 'Pocket Wallet is now protected with your 4-digit PIN.');
  };

  const handleResetData = () => {
    Alert.alert(
      'Wipe All Data',
      'This will wipe all your transactions, recurring bills, and friends ledger, resetting your wallet to clean defaults. Your profile info and PIN will be preserved. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe All Data',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            Alert.alert('Done', 'All wallet data has been wiped.');
          },
        },
      ]
    );
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
                {securitySettings.isPinEnabled && securitySettings.pin
                  ? 'Active · 4-digit PIN is protecting wallet'
                  : 'Disabled · Open without passcode'}
              </Text>
            </View>
            <Switch
              value={securitySettings.isPinEnabled && !!securitySettings.pin}
              onValueChange={handleTogglePin}
              trackColor={{ false: colors.line, true: colors.brand }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Change PIN option if already enabled */}
          {securitySettings.isPinEnabled && !!securitySettings.pin && (
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
            source={require('../../assets/logos/logo_horizontal_dark_mode.png')}
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
          <Text style={styles.offlineText}>Offline-First Local Storage · Private & Encrypted</Text>
        </View>
      </ScrollView>

      {/* PIN Setup Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPinModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowPinModal(false)}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboardAvoid}
            >
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
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
});
