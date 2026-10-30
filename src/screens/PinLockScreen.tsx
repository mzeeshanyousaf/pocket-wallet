import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
import { useReducedMotion } from '../hooks/useReducedMotion';
import { SecurityService } from '../services/security';
import { colors } from '../theme/colors';

interface PinLockScreenProps {
  onSuccess: () => void;
}

interface KeypadButtonProps {
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: any;
  accessibilityLabel?: string;
}

const KeypadButton: React.FC<KeypadButtonProps> = ({
  onPress,
  disabled,
  children,
  style,
  accessibilityLabel,
}) => {
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const reducedMotion = useReducedMotion();

  const handlePressIn = () => {
    if (disabled || reducedMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      speed: 60,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || reducedMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      speed: 40,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: disabled ? 0.35 : 1 }}>
      <TouchableOpacity
        style={style}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onSuccess }) => {
  const insets = useSafeAreaInsets();
  const { userProfile, securitySettings } = useWallet();
  const [enteredPin, setEnteredPin] = useState('');
  const [errorShake] = useState(new Animated.Value(0));
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricTypeLabel, setBiometricTypeLabel] = useState<'Fingerprint' | 'Face ID'>('Fingerprint');

  const reducedMotion = useReducedMotion();

  // Check initial rate-limit lockout status
  useEffect(() => {
    SecurityService.getLockoutStatus().then((status) => {
      if (status.isLocked) {
        setLockoutSeconds(status.remainingLockoutSeconds);
        setErrorMessage(`Too many attempts. Locked for ${status.remainingLockoutSeconds}s.`);
      }
    });
  }, []);

  // Active countdown timer during lockout window
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setErrorMessage('');
          return 0;
        }
        setErrorMessage(`Too many attempts. Locked for ${prev - 1}s.`);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const triggerShake = useCallback(() => {
    if (reducedMotion) {
      // Respect accessibility preference for reduced motion
      return;
    }

    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate(100);
      } catch (e) {
        console.log('Vibration note:', e);
      }
    }

    Animated.sequence([
      Animated.timing(errorShake, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [errorShake, reducedMotion]);

  const triggerBiometricAuth = useCallback(async () => {
    if (lockoutSeconds > 0) return;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Pocket Wallet',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: true,
      });

      if (result.success) {
        await SecurityService.resetFailedAttempts();
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        onSuccess();
      }
    } catch (err) {
      console.log('Biometric auth error:', err);
    }
  }, [lockoutSeconds, onSuccess]);

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

          // Automatically prompt for fingerprint if user enabled biometrics and not locked out
          if (securitySettings.biometricsEnabled && lockoutSeconds === 0) {
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
  }, [securitySettings.biometricsEnabled, lockoutSeconds, triggerBiometricAuth]);

  const handleKeyPress = async (num: string) => {
    if (lockoutSeconds > 0) return;
    if (enteredPin.length >= 4) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    const newPin = enteredPin + num;
    setEnteredPin(newPin);
    setErrorMessage('');

    if (newPin.length === 4) {
      const isValid = await SecurityService.verifyPin(newPin);
      if (isValid) {
        await SecurityService.resetFailedAttempts();
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        onSuccess();
      } else {
        const rateResult = await SecurityService.recordFailedAttempt();
        triggerShake();

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }

        if (rateResult.isLocked) {
          setLockoutSeconds(rateResult.remainingLockoutSeconds);
          setErrorMessage(`Too many attempts. Locked for ${rateResult.remainingLockoutSeconds}s.`);
        } else {
          setErrorMessage(`Incorrect PIN. ${rateResult.attempts} failed attempt${rateResult.attempts > 1 ? 's' : ''}.`);
        }

        setTimeout(() => {
          setEnteredPin('');
        }, 300);
      }
    }
  };

  const handleDelete = () => {
    if (lockoutSeconds > 0) return;
    if (enteredPin.length > 0) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      setEnteredPin(enteredPin.slice(0, -1));
      setErrorMessage('');
    }
  };

  const showBiometrics = biometricsAvailable && securitySettings.biometricsEnabled;
  const isKeypadDisabled = lockoutSeconds > 0;

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
          {lockoutSeconds > 0
            ? 'Keypad temporarily locked'
            : showBiometrics
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
        <Text style={[styles.errorText, lockoutSeconds > 0 && styles.lockoutErrorText]}>
          {errorMessage}
        </Text>
      ) : (
        <View style={styles.errorPlaceholder} />
      )}

      {/* Numeric Keypad with Micro-Spring Tactile Interaction */}
      <View style={styles.keypad}>
        <View style={styles.keypadRow}>
          {['1', '2', '3'].map((n) => (
            <KeypadButton
              key={n}
              style={styles.key}
              onPress={() => handleKeyPress(n)}
              disabled={isKeypadDisabled}
              accessibilityLabel={`Digit ${n}`}
            >
              <Text style={styles.keyText}>{n}</Text>
            </KeypadButton>
          ))}
        </View>
        <View style={styles.keypadRow}>
          {['4', '5', '6'].map((n) => (
            <KeypadButton
              key={n}
              style={styles.key}
              onPress={() => handleKeyPress(n)}
              disabled={isKeypadDisabled}
              accessibilityLabel={`Digit ${n}`}
            >
              <Text style={styles.keyText}>{n}</Text>
            </KeypadButton>
          ))}
        </View>
        <View style={styles.keypadRow}>
          {['7', '8', '9'].map((n) => (
            <KeypadButton
              key={n}
              style={styles.key}
              onPress={() => handleKeyPress(n)}
              disabled={isKeypadDisabled}
              accessibilityLabel={`Digit ${n}`}
            >
              <Text style={styles.keyText}>{n}</Text>
            </KeypadButton>
          ))}
        </View>
        <View style={styles.keypadRow}>
          {showBiometrics ? (
            <KeypadButton
              style={[styles.key, styles.bioKey]}
              onPress={triggerBiometricAuth}
              disabled={isKeypadDisabled}
              accessibilityLabel={`Unlock with ${biometricTypeLabel}`}
            >
              <MaterialIcons
                name={biometricTypeLabel === 'Face ID' ? 'face' : 'fingerprint'}
                size={30}
                color={colors.brand}
              />
            </KeypadButton>
          ) : (
            <View style={styles.emptyKey} />
          )}
          <KeypadButton
            style={styles.key}
            onPress={() => handleKeyPress('0')}
            disabled={isKeypadDisabled}
            accessibilityLabel="Digit 0"
          >
            <Text style={styles.keyText}>0</Text>
          </KeypadButton>
          <KeypadButton
            style={styles.key}
            onPress={handleDelete}
            disabled={isKeypadDisabled}
            accessibilityLabel="Backspace"
          >
            <MaterialIcons name="backspace" size={24} color={colors.ink} />
          </KeypadButton>
        </View>
      </View>

      {/* Security Tagline */}
      <View style={styles.footerNote}>
        <MaterialIcons name="security" size={14} color={colors.subtle} />
        <Text style={styles.footerNoteText}>Protected on-device wallet</Text>
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
    textAlign: 'center',
  },
  lockoutErrorText: {
    color: colors.warn,
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
