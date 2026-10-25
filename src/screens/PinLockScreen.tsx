import { MaterialIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme/colors';

interface PinLockScreenProps {
  onSuccess: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onSuccess }) => {
  const insets = useSafeAreaInsets();
  const { userProfile, securitySettings } = useWallet();
  const [enteredPin, setEnteredPin] = useState('');
  const [errorShake] = useState(new Animated.Value(0));
  const [errorMessage, setErrorMessage] = useState('');
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricTypeLabel, setBiometricTypeLabel] = useState<'Fingerprint' | 'Face ID'>('Fingerprint');

  const triggerShake = () => {
    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate(150);
      } catch (e) {
        console.log('Vibration note:', e);
      }
    }
    Animated.sequence([
      Animated.timing(errorShake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const triggerBiometricAuth = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Pocket Wallet',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: true,
      });

      if (result.success) {
        onSuccess();
      }
    } catch (err) {
      console.log('Biometric auth error:', err);
    }
  }, [onSuccess]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (isMounted && hasHardware && isEnrolled) {
          setBiometricsAvailable(true);
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricTypeLabel('Face ID');
          } else {
            setBiometricTypeLabel('Fingerprint');
          }

          // Automatically prompt for fingerprint if user enabled biometrics
          if (securitySettings.biometricsEnabled) {
            setTimeout(() => {
              if (isMounted) {
                triggerBiometricAuth();
              }
            }, 350);
          }
        }
      } catch (e) {
        console.log('Biometric detection note:', e);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [securitySettings.biometricsEnabled, triggerBiometricAuth]);

  const handleKeyPress = (num: string) => {
    if (enteredPin.length >= 4) return;
    const newPin = enteredPin + num;
    setEnteredPin(newPin);
    setErrorMessage('');

    if (newPin.length === 4) {
      if (newPin === securitySettings.pin) {
        onSuccess();
      } else {
        triggerShake();
        setErrorMessage('Incorrect PIN. Please try again.');
        setTimeout(() => {
          setEnteredPin('');
        }, 300);
      }
    }
  };

  const handleDelete = () => {
    if (enteredPin.length > 0) {
      setEnteredPin(enteredPin.slice(0, -1));
      setErrorMessage('');
    }
  };

  const showBiometrics = biometricsAvailable && securitySettings.biometricsEnabled;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      {/* Brand Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/logos/logo_mark_symbol_1024x1024.png')}
          style={styles.logoMark}
          resizeMode="contain"
        />
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{userProfile.name || 'Pocket Wallet'}</Text>
        <Text style={styles.instruction}>
          {showBiometrics
            ? `Use ${biometricTypeLabel} or enter 4-digit PIN`
            : 'Enter your 4-digit PIN to unlock'}
        </Text>
      </View>

      {/* PIN Dots Display */}
      <Animated.View
        style={[
          styles.dotsContainer,
          { transform: [{ translateX: errorShake }] },
        ]}
      >
        {[0, 1, 2, 3].map((index) => {
          const filled = enteredPin.length > index;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                filled ? styles.dotFilled : null,
                errorMessage ? styles.dotError : null,
              ]}
            />
          );
        })}
      </Animated.View>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : (
        <View style={styles.errorPlaceholder} />
      )}

      {/* Numeric Keypad */}
      <View style={styles.keypad}>
        <View style={styles.keypadRow}>
          {['1', '2', '3'].map((n) => (
            <TouchableOpacity
              key={n}
              style={styles.key}
              onPress={() => handleKeyPress(n)}
              activeOpacity={0.6}
            >
              <Text style={styles.keyText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.keypadRow}>
          {['4', '5', '6'].map((n) => (
            <TouchableOpacity
              key={n}
              style={styles.key}
              onPress={() => handleKeyPress(n)}
              activeOpacity={0.6}
            >
              <Text style={styles.keyText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.keypadRow}>
          {['7', '8', '9'].map((n) => (
            <TouchableOpacity
              key={n}
              style={styles.key}
              onPress={() => handleKeyPress(n)}
              activeOpacity={0.6}
            >
              <Text style={styles.keyText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.keypadRow}>
          {showBiometrics ? (
            <TouchableOpacity
              style={[styles.key, styles.bioKey]}
              onPress={triggerBiometricAuth}
              activeOpacity={0.6}
              accessibilityLabel={`Unlock with ${biometricTypeLabel}`}
            >
              <MaterialIcons
                name={biometricTypeLabel === 'Face ID' ? 'face' : 'fingerprint'}
                size={30}
                color={colors.brand}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyKey} />
          )}
          <TouchableOpacity
            style={styles.key}
            onPress={() => handleKeyPress('0')}
            activeOpacity={0.6}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.key}
            onPress={handleDelete}
            activeOpacity={0.6}
          >
            <MaterialIcons name="backspace" size={24} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Security Tagline */}
      <View style={styles.footerNote}>
        <MaterialIcons name="security" size={14} color={colors.subtle} />
        <Text style={styles.footerNoteText}>Encrypted on-device wallet</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoMark: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  instruction: {
    fontSize: 13,
    color: colors.subtle,
    marginTop: 6,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  dotError: {
    borderColor: colors.neg,
    backgroundColor: colors.neg,
  },
  errorText: {
    fontSize: 13,
    color: colors.neg,
    fontWeight: '600',
    height: 20,
  },
  errorPlaceholder: {
    height: 20,
  },
  keypad: {
    width: '100%',
    maxWidth: 290,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  key: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.ink,
  },
  emptyKey: {
    width: 68,
    height: 68,
  },
  bioKey: {
    backgroundColor: colors.brandSoft,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  footerNoteText: {
    fontSize: 12,
    color: colors.subtle,
  },
});
