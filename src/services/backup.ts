import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import {
  Bill,
  CreditCardBankPayment,
  CreditCardLedgerEntry,
  CreditCardMember,
  Friend,
  FriendEntry,
  SalaryConfig,
  UserProfile,
  WalletBackupData,
  WalletBackupPayload,
  WalletTransaction,
} from '../types';
import { toDateString } from '../utils/formatters';

export interface BackupSummary {
  transactions: number;
  bills: number;
  friends: number;
  cardMembers: number;
  exportedAt: string;
}

function stripBillNotificationIds(bills: Bill[]): Bill[] {
  return bills.map(({ notificationId: _removed, ...rest }) => ({ ...rest }));
}

function stripFriendEntryNotificationIds(entries: FriendEntry[]): FriendEntry[] {
  return entries.map(({ notificationId: _removed, ...rest }) => ({ ...rest }));
}

function stripSalaryNotificationId(config: SalaryConfig): SalaryConfig {
  const { notificationId: _removed, ...rest } = config;
  return { ...rest };
}

export function createBackupPayload(
  state: WalletBackupData
): WalletBackupPayload {
  return {
    app: 'Pocket Wallet',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      balance: Number.isFinite(state.balance) ? state.balance : 0,
      transactions: [...state.transactions],
      bills: stripBillNotificationIds(state.bills),
      salaryConfig: stripSalaryNotificationId(state.salaryConfig),
      friends: [...state.friends],
      friendEntries: stripFriendEntryNotificationIds(state.friendEntries),
      creditCardMembers: [...state.creditCardMembers],
      creditCardEntries: [...state.creditCardEntries],
      creditCardBankPayments: [...state.creditCardBankPayments],
      userProfile: { ...state.userProfile },
    },
  };
}

export function parseAndValidateBackup(rawText: string): {
  payload: WalletBackupPayload;
  summary: BackupSummary;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Selected file is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Backup file structure is invalid.');
  }

  const record = parsed as Record<string, unknown>;
  if (record.app !== 'Pocket Wallet') {
    throw new Error('This file is not a Pocket Wallet backup.');
  }
  if (record.schemaVersion !== 1) {
    throw new Error(
      `Unsupported backup version: ${String(record.schemaVersion ?? 'unknown')}.`
    );
  }
  if (!record.data || typeof record.data !== 'object') {
    throw new Error('Backup file is missing wallet data.');
  }

  const rawData = record.data as Record<string, unknown>;
  if (typeof rawData.balance !== 'number' || !Number.isFinite(rawData.balance)) {
    throw new Error('Backup contains an invalid wallet balance.');
  }
  if (!Array.isArray(rawData.transactions)) {
    throw new Error('Backup is missing transactions list.');
  }
  if (!Array.isArray(rawData.bills)) {
    throw new Error('Backup is missing bills list.');
  }
  if (!Array.isArray(rawData.friends) || !Array.isArray(rawData.friendEntries)) {
    throw new Error('Backup is missing friends ledger data.');
  }
  if (!rawData.salaryConfig || typeof rawData.salaryConfig !== 'object') {
    throw new Error('Backup is missing salary configuration.');
  }
  if (!rawData.userProfile || typeof rawData.userProfile !== 'object') {
    throw new Error('Backup is missing user profile.');
  }

  const rawSalary = rawData.salaryConfig as SalaryConfig;
  const rawProfile = rawData.userProfile as UserProfile;

  const cleanData: WalletBackupData = {
    balance: rawData.balance,
    transactions: rawData.transactions as WalletTransaction[],
    bills: stripBillNotificationIds(rawData.bills as Bill[]),
    salaryConfig: stripSalaryNotificationId({
      amount: Number.isFinite(rawSalary.amount) ? rawSalary.amount : 0,
      dayOfMonth:
        typeof rawSalary.dayOfMonth === 'number' &&
        rawSalary.dayOfMonth >= 1 &&
        rawSalary.dayOfMonth <= 31
          ? rawSalary.dayOfMonth
          : 1,
      specificDate: rawSalary.specificDate,
      lastCreditedMonthYear: rawSalary.lastCreditedMonthYear,
      autoPrompt: rawSalary.autoPrompt !== false,
    }),
    friends: rawData.friends as Friend[],
    friendEntries: stripFriendEntryNotificationIds(
      rawData.friendEntries as FriendEntry[]
    ),
    creditCardMembers: Array.isArray(rawData.creditCardMembers)
      ? (rawData.creditCardMembers as CreditCardMember[])
      : [],
    creditCardEntries: Array.isArray(rawData.creditCardEntries)
      ? (rawData.creditCardEntries as CreditCardLedgerEntry[])
      : [],
    creditCardBankPayments: Array.isArray(rawData.creditCardBankPayments)
      ? (rawData.creditCardBankPayments as CreditCardBankPayment[])
      : [],
    userProfile: {
      name:
        typeof rawProfile.name === 'string' && rawProfile.name.trim()
          ? rawProfile.name
          : 'Pocket Wallet User',
      email: typeof rawProfile.email === 'string' ? rawProfile.email : '',
      phone: typeof rawProfile.phone === 'string' ? rawProfile.phone : '',
      avatarInitials:
        typeof rawProfile.avatarInitials === 'string' &&
        rawProfile.avatarInitials.trim()
          ? rawProfile.avatarInitials
          : 'PW',
      currency:
        typeof rawProfile.currency === 'string'
          ? rawProfile.currency
          : 'PKR (Rs.)',
      joinedDate:
        typeof rawProfile.joinedDate === 'string'
          ? rawProfile.joinedDate
          : new Date().toISOString(),
    },
  };

  const exportedAt =
    typeof record.exportedAt === 'string'
      ? record.exportedAt
      : new Date().toISOString();

  const payload: WalletBackupPayload = {
    app: 'Pocket Wallet',
    schemaVersion: 1,
    exportedAt,
    data: cleanData,
  };

  return {
    payload,
    summary: {
      transactions: cleanData.transactions.length,
      bills: cleanData.bills.length,
      friends: cleanData.friends.length,
      cardMembers: cleanData.creditCardMembers.length,
      exportedAt,
    },
  };
}

export const BackupService = {
  async exportBackup(state: WalletBackupData): Promise<{ fileName: string }> {
    const fileName = `pocket-wallet-backup-${toDateString(new Date())}.json`;
    const jsonString = JSON.stringify(createBackupPayload(state), null, 2);

    if (Platform.OS === 'web') {
      const g = globalThis as Record<string, any>;
      if (!g.document || !g.Blob || !g.URL?.createObjectURL) {
        throw new Error('File export is not supported in this browser context.');
      }
      const blob = new g.Blob([jsonString], { type: 'application/json' });
      const url = g.URL.createObjectURL(blob);
      const anchor = g.document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      g.document.body.appendChild(anchor);
      anchor.click();
      g.document.body.removeChild(anchor);
      g.URL.revokeObjectURL(url);
      return { fileName };
    }

    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    file.write(jsonString);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error('Sharing is not available on this device.');
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Pocket Wallet Backup',
      UTI: 'public.json',
    });

    return { fileName };
  },

  async pickAndReadBackup(): Promise<{
    fileName: string;
    payload: WalletBackupPayload;
    summary: BackupSummary;
  } | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    let rawText = '';

    if (Platform.OS === 'web') {
      if (asset.file && typeof asset.file.text === 'function') {
        rawText = await asset.file.text();
      } else {
        const res = await fetch(asset.uri);
        rawText = await res.text();
      }
    } else {
      const pickedFile = new File(asset.uri);
      rawText = await pickedFile.text();
    }

    const { payload, summary } = parseAndValidateBackup(rawText);
    return {
      fileName: asset.name || 'backup.json',
      payload,
      summary,
    };
  },
};
