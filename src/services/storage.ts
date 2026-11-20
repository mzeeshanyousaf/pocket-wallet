import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityService } from './security';
import {
  Bill,
  CreditCardBankPayment,
  CreditCardLedgerEntry,
  CreditCardMember,
  Friend,
  FriendEntry,
  SalaryConfig,
  SecuritySettings,
  UserProfile,
  WalletState,
  WalletTransaction,
} from '../types';

const STORAGE_KEYS = {
  BALANCE: '@pocket_wallet_balance',
  TRANSACTIONS: '@pocket_wallet_transactions',
  BILLS: '@pocket_wallet_bills',
  SALARY_CONFIG: '@pocket_wallet_salary_config',
  FRIENDS: '@pocket_wallet_friends',
  FRIEND_ENTRIES: '@pocket_wallet_friend_entries',
  CREDIT_CARD_MEMBERS: '@pocket_wallet_cc_members',
  CREDIT_CARD_ENTRIES: '@pocket_wallet_cc_entries',
  CREDIT_CARD_BANK_PAYMENTS: '@pocket_wallet_cc_bank_payments',
  USER_PROFILE: '@pocket_wallet_user_profile',
  SECURITY_SETTINGS: '@pocket_wallet_security_settings',
  INITIALIZED: '@pocket_wallet_clean_v3',
  ONBOARDED: '@pocket_wallet_onboarded_flag',
};

// Clean zeroed initial state for fresh start (no demo data)
function getCleanInitialState(): Omit<WalletState, 'isLoaded'> {
  const initialUserProfile: UserProfile = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '',
    avatarInitials: 'JD',
    currency: 'PKR (Rs.)',
    joinedDate: new Date().toISOString(),
  };

  const initialSecuritySettings: SecuritySettings = {
    pin: null,
    isPinEnabled: false,
    biometricsEnabled: false,
  };

  const initialSalaryConfig: SalaryConfig = {
    amount: 0,
    dayOfMonth: 1,
    autoPrompt: true,
  };

  return {
    balance: 0,
    transactions: [],
    bills: [],
    salaryConfig: initialSalaryConfig,
    friends: [],
    friendEntries: [],
    creditCardMembers: [],
    creditCardEntries: [],
    creditCardBankPayments: [],
    userProfile: initialUserProfile,
    securitySettings: initialSecuritySettings,
  };
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : (parsed as T);
  } catch (e) {
    console.warn('Corrupted storage entry recovered with fallback:', e);
    return fallback;
  }
}

export const StorageService = {
  async loadWalletState(): Promise<Omit<WalletState, 'isLoaded'>> {
    try {
      const initialized = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!initialized) {
        const cleanState = getCleanInitialState();
        await this.saveAllState(cleanState);
        await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
        return cleanState;
      }

      const [
        balanceStr,
        txsStr,
        billsStr,
        salaryStr,
        friendsStr,
        friendEntriesStr,
        ccMembersStr,
        ccEntriesStr,
        ccBankPaymentsStr,
        profileStr,
        securityStr,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.BALANCE),
        AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
        AsyncStorage.getItem(STORAGE_KEYS.BILLS),
        AsyncStorage.getItem(STORAGE_KEYS.SALARY_CONFIG),
        AsyncStorage.getItem(STORAGE_KEYS.FRIENDS),
        AsyncStorage.getItem(STORAGE_KEYS.FRIEND_ENTRIES),
        AsyncStorage.getItem(STORAGE_KEYS.CREDIT_CARD_MEMBERS),
        AsyncStorage.getItem(STORAGE_KEYS.CREDIT_CARD_ENTRIES),
        AsyncStorage.getItem(STORAGE_KEYS.CREDIT_CARD_BANK_PAYMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.SECURITY_SETTINGS),
      ]);

      const defaults = getCleanInitialState();
      const parsedBalance = balanceStr ? parseFloat(balanceStr) : 0;
      const balance = Number.isFinite(parsedBalance) ? parsedBalance : 0;
      const transactions = safeJsonParse<WalletTransaction[]>(txsStr, []);
      const bills = safeJsonParse<Bill[]>(billsStr, []);
      const salaryConfig = safeJsonParse<SalaryConfig>(
        salaryStr,
        defaults.salaryConfig
      );
      const friends = safeJsonParse<Friend[]>(friendsStr, []);
      const friendEntries = safeJsonParse<FriendEntry[]>(friendEntriesStr, []);
      const creditCardMembers = safeJsonParse<CreditCardMember[]>(
        ccMembersStr,
        []
      );
      const creditCardEntries = safeJsonParse<CreditCardLedgerEntry[]>(
        ccEntriesStr,
        []
      );
      const creditCardBankPayments = safeJsonParse<CreditCardBankPayment[]>(
        ccBankPaymentsStr,
        []
      );
      const userProfile = safeJsonParse<UserProfile>(
        profileStr,
        defaults.userProfile
      );
      const securitySettings = safeJsonParse<SecuritySettings>(
        securityStr,
        defaults.securitySettings
      );

      // Security Migration: If legacy plaintext PIN exists in AsyncStorage, migrate to SecureStore and scrub
      if (securitySettings.pin) {
        await SecurityService.setPin(securitySettings.pin);
        securitySettings.pin = null;
        await this.saveSecuritySettings(securitySettings);
      }

      // Check whether a PIN is actually enrolled in SecureStore
      const hasSecurePin = await SecurityService.hasPin();
      if (
        !hasSecurePin &&
        (securitySettings.isPinEnabled || securitySettings.biometricsEnabled)
      ) {
        securitySettings.isPinEnabled = false;
        securitySettings.biometricsEnabled = false;
        await this.saveSecuritySettings(securitySettings);
      }

      return {
        balance,
        transactions,
        bills,
        salaryConfig,
        friends,
        friendEntries,
        creditCardMembers,
        creditCardEntries,
        creditCardBankPayments,
        userProfile,
        securitySettings,
      };
    } catch (error) {
      console.error('Error loading wallet state from AsyncStorage:', error);
      return getCleanInitialState();
    }
  },

  async saveBalance(balance: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BALANCE, balance.toString());
    } catch (e) {
      console.error('Error saving balance:', e);
    }
  },

  async saveTransactions(transactions: WalletTransaction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.TRANSACTIONS,
        JSON.stringify(transactions)
      );
    } catch (e) {
      console.error('Error saving transactions:', e);
    }
  },

  async saveBills(bills: Bill[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
    } catch (e) {
      console.error('Error saving bills:', e);
    }
  },

  async saveSalaryConfig(config: SalaryConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SALARY_CONFIG,
        JSON.stringify(config)
      );
    } catch (e) {
      console.error('Error saving salary config:', e);
    }
  },

  async saveFriends(friends: Friend[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.FRIENDS,
        JSON.stringify(friends)
      );
    } catch (e) {
      console.error('Error saving friends:', e);
    }
  },

  async saveFriendEntries(entries: FriendEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.FRIEND_ENTRIES,
        JSON.stringify(entries)
      );
    } catch (e) {
      console.error('Error saving friend entries:', e);
    }
  },

  async saveCreditCardMembers(members: CreditCardMember[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CREDIT_CARD_MEMBERS,
        JSON.stringify(members)
      );
    } catch (e) {
      console.error('Error saving credit card members:', e);
    }
  },

  async saveCreditCardEntries(entries: CreditCardLedgerEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CREDIT_CARD_ENTRIES,
        JSON.stringify(entries)
      );
    } catch (e) {
      console.error('Error saving credit card entries:', e);
    }
  },

  async saveCreditCardBankPayments(
    payments: CreditCardBankPayment[]
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CREDIT_CARD_BANK_PAYMENTS,
        JSON.stringify(payments)
      );
    } catch (e) {
      console.error('Error saving credit card bank payments:', e);
    }
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PROFILE,
        JSON.stringify(profile)
      );
    } catch (e) {
      console.error('Error saving user profile:', e);
    }
  },

  async saveSecuritySettings(settings: SecuritySettings): Promise<void> {
    try {
      // Security hygiene: Never write plaintext PIN to AsyncStorage
      const scrubbed: SecuritySettings = {
        ...settings,
        pin: null,
      };
      await AsyncStorage.setItem(
        STORAGE_KEYS.SECURITY_SETTINGS,
        JSON.stringify(scrubbed)
      );
    } catch (e) {
      console.error('Error saving security settings:', e);
    }
  },

  async saveAllState(state: Omit<WalletState, 'isLoaded'>): Promise<void> {
    await Promise.all([
      this.saveBalance(state.balance),
      this.saveTransactions(state.transactions),
      this.saveBills(state.bills),
      this.saveSalaryConfig(state.salaryConfig),
      this.saveFriends(state.friends),
      this.saveFriendEntries(state.friendEntries),
      this.saveCreditCardMembers(state.creditCardMembers),
      this.saveCreditCardEntries(state.creditCardEntries),
      this.saveCreditCardBankPayments(state.creditCardBankPayments),
      this.saveUserProfile(state.userProfile),
      this.saveSecuritySettings(state.securitySettings),
    ]);
  },

  async getIsOnboarded(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDED);
      return val === 'true';
    } catch {
      return false;
    }
  },

  async setOnboarded(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
    } catch (e) {
      console.error('Error saving onboarded status:', e);
    }
  },

  async resetToDefaults(
    preserveProfile?: UserProfile
  ): Promise<Omit<WalletState, 'isLoaded'>> {
    const cleanState = getCleanInitialState();
    if (preserveProfile) {
      cleanState.userProfile = preserveProfile;
    }
    await this.saveAllState(cleanState);
    return cleanState;
  },
};
