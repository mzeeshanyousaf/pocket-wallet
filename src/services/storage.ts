import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Bill,
  Friend,
  FriendEntry,
  SalaryConfig,
  SecuritySettings,
  UserProfile,
  WalletState,
  WalletTransaction,
} from '../types';
import { toDateString } from '../utils/formatters';

const STORAGE_KEYS = {
  BALANCE: '@pocket_wallet_balance',
  TRANSACTIONS: '@pocket_wallet_transactions',
  BILLS: '@pocket_wallet_bills',
  SALARY_CONFIG: '@pocket_wallet_salary_config',
  FRIENDS: '@pocket_wallet_friends',
  FRIEND_ENTRIES: '@pocket_wallet_friend_entries',
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
    userProfile: initialUserProfile,
    securitySettings: initialSecuritySettings,
  };
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
        profileStr,
        securityStr,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.BALANCE),
        AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
        AsyncStorage.getItem(STORAGE_KEYS.BILLS),
        AsyncStorage.getItem(STORAGE_KEYS.SALARY_CONFIG),
        AsyncStorage.getItem(STORAGE_KEYS.FRIENDS),
        AsyncStorage.getItem(STORAGE_KEYS.FRIEND_ENTRIES),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.SECURITY_SETTINGS),
      ]);

      const balance = balanceStr ? parseFloat(balanceStr) : 0;
      const transactions = txsStr ? JSON.parse(txsStr) : [];
      const bills = billsStr ? JSON.parse(billsStr) : [];
      const salaryConfig = salaryStr
        ? JSON.parse(salaryStr)
        : { amount: 0, dayOfMonth: 1, autoPrompt: true };
      const friends = friendsStr ? JSON.parse(friendsStr) : [];
      const friendEntries = friendEntriesStr
        ? JSON.parse(friendEntriesStr)
        : [];
      const userProfile: UserProfile = profileStr
        ? JSON.parse(profileStr)
        : {
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '',
            avatarInitials: 'JD',
            currency: 'PKR (Rs.)',
            joinedDate: new Date().toISOString(),
          };
      const securitySettings: SecuritySettings = securityStr
        ? JSON.parse(securityStr)
        : {
            pin: null,
            isPinEnabled: false,
            biometricsEnabled: false,
          };

      return {
        balance,
        transactions,
        bills,
        salaryConfig,
        friends,
        friendEntries,
        userProfile,
        securitySettings,
      };
    } catch (error) {
      console.error('Error loading wallet state from AsyncStorage:', error);
      return getInitialSeedData();
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
      await AsyncStorage.setItem(
        STORAGE_KEYS.SECURITY_SETTINGS,
        JSON.stringify(settings)
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

  async resetToDefaults(): Promise<Omit<WalletState, 'isLoaded'>> {
    const cleanState = getCleanInitialState();
    await this.saveAllState(cleanState);
    return cleanState;
  },
};
