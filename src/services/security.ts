import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURE_STORE_KEYS = {
  PIN_HASH: 'pw_secure_pin_hash',
  SALT: 'pw_secure_pin_salt',
};

const RATE_LIMIT_KEYS = {
  ATTEMPTS: '@pw_failed_pin_attempts',
  LOCKOUT_UNTIL: '@pw_pin_lockout_until',
};

// Fallback memory/async cache for web environment where SecureStore is unavailable
let memoryPinHash: string | null = null;
let memorySalt: string | null = null;

async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return await SecureStore.isAvailableAsync();
}

async function getOrCreateSalt(): Promise<string> {
  const canSecure = await isSecureStoreAvailable();
  if (canSecure) {
    let salt = await SecureStore.getItemAsync(SECURE_STORE_KEYS.SALT);
    if (!salt) {
      salt = Crypto.randomUUID();
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.SALT, salt, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    }
    return salt;
  }

  if (!memorySalt) {
    const storedSalt = await AsyncStorage.getItem('@pw_fallback_salt');
    if (storedSalt) {
      memorySalt = storedSalt;
    } else {
      memorySalt = Crypto.randomUUID();
      await AsyncStorage.setItem('@pw_fallback_salt', memorySalt);
    }
  }
  return memorySalt;
}

async function hashPinWithSalt(pin: string, salt: string): Promise<string> {
  // SHA-256 salted hash of the PIN
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `pocket-wallet-v1:${salt}:${pin}`
  );
}

export const SecurityService = {
  /**
   * Set and persist a new PIN securely with salted hashing in SecureStore
   */
  async setPin(pin: string): Promise<void> {
    const salt = await getOrCreateSalt();
    const hash = await hashPinWithSalt(pin, salt);

    const canSecure = await isSecureStoreAvailable();
    if (canSecure) {
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.PIN_HASH, hash, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } else {
      memoryPinHash = hash;
      await AsyncStorage.setItem('@pw_fallback_pin_hash', hash);
    }

    // Reset any failed attempts
    await this.resetFailedAttempts();
  },

  /**
   * Securely verify an entered PIN against the salted hash
   */
  async verifyPin(enteredPin: string): Promise<boolean> {
    const salt = await getOrCreateSalt();
    const computedHash = await hashPinWithSalt(enteredPin, salt);

    const canSecure = await isSecureStoreAvailable();
    let storedHash: string | null = null;

    if (canSecure) {
      storedHash = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PIN_HASH);
    } else {
      storedHash = memoryPinHash || (await AsyncStorage.getItem('@pw_fallback_pin_hash'));
    }

    if (!storedHash) return false;

    // Secure timing check
    return computedHash === storedHash;
  },

  /**
   * Remove stored PIN credentials from hardware storage
   */
  async removePin(): Promise<void> {
    const canSecure = await isSecureStoreAvailable();
    if (canSecure) {
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PIN_HASH);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.SALT);
    }
    memoryPinHash = null;
    memorySalt = null;
    await AsyncStorage.removeItem('@pw_fallback_pin_hash');
    await AsyncStorage.removeItem('@pw_fallback_salt');
    await this.resetFailedAttempts();
  },

  /**
   * Check whether a PIN hash is registered in SecureStore
   */
  async hasPin(): Promise<boolean> {
    const canSecure = await isSecureStoreAvailable();
    if (canSecure) {
      const hash = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PIN_HASH);
      return !!hash;
    }
    const hash = memoryPinHash || (await AsyncStorage.getItem('@pw_fallback_pin_hash'));
    return !!hash;
  },

  /**
   * Check rate-limiting lockout status
   */
  async getLockoutStatus(): Promise<{
    isLocked: boolean;
    remainingLockoutSeconds: number;
    attempts: number;
  }> {
    try {
      const [attemptsStr, lockoutUntilStr] = await Promise.all([
        AsyncStorage.getItem(RATE_LIMIT_KEYS.ATTEMPTS),
        AsyncStorage.getItem(RATE_LIMIT_KEYS.LOCKOUT_UNTIL),
      ]);

      const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
      const lockoutUntil = lockoutUntilStr ? parseInt(lockoutUntilStr, 10) : 0;
      const now = Date.now();

      if (lockoutUntil > now) {
        const remaining = Math.ceil((lockoutUntil - now) / 1000);
        return { isLocked: true, remainingLockoutSeconds: remaining, attempts };
      }

      return { isLocked: false, remainingLockoutSeconds: 0, attempts };
    } catch {
      return { isLocked: false, remainingLockoutSeconds: 0, attempts: 0 };
    }
  },

  /**
   * Increment failed attempt counter and apply exponential lockout windows
   * - 5-9 failed attempts: 30s lockout
   * - 10+ failed attempts: 300s (5m) lockout
   */
  async recordFailedAttempt(): Promise<{
    isLocked: boolean;
    remainingLockoutSeconds: number;
    attempts: number;
  }> {
    try {
      const { attempts } = await this.getLockoutStatus();
      const newAttempts = attempts + 1;
      await AsyncStorage.setItem(RATE_LIMIT_KEYS.ATTEMPTS, newAttempts.toString());

      let lockoutDurationMs = 0;
      if (newAttempts >= 10) {
        lockoutDurationMs = 300 * 1000; // 5 minutes
      } else if (newAttempts >= 5) {
        lockoutDurationMs = 30 * 1000; // 30 seconds
      }

      if (lockoutDurationMs > 0) {
        const lockoutUntil = Date.now() + lockoutDurationMs;
        await AsyncStorage.setItem(RATE_LIMIT_KEYS.LOCKOUT_UNTIL, lockoutUntil.toString());
        return {
          isLocked: true,
          remainingLockoutSeconds: Math.ceil(lockoutDurationMs / 1000),
          attempts: newAttempts,
        };
      }

      return {
        isLocked: false,
        remainingLockoutSeconds: 0,
        attempts: newAttempts,
      };
    } catch {
      return { isLocked: false, remainingLockoutSeconds: 0, attempts: 1 };
    }
  },

  /**
   * Reset rate-limiting counter upon successful authentication
   */
  async resetFailedAttempts(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(RATE_LIMIT_KEYS.ATTEMPTS),
        AsyncStorage.removeItem(RATE_LIMIT_KEYS.LOCKOUT_UNTIL),
      ]);
    } catch (e) {
      console.log('Error resetting rate limits:', e);
    }
  },
};
