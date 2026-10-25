export type TransactionType =
  | 'income'
  | 'expense'
  | 'bill_payment'
  | 'salary'
  | 'friend_lent'
  | 'friend_borrowed'
  | 'friend_settlement';

export interface WalletTransaction {
  id: string;
  amount: number; // in Pakistani Rupees (Rs.)
  type: TransactionType;
  description: string;
  category?: string;
  date: string; // ISO string
  relatedBillId?: string;
  relatedFriendId?: string;
  relatedFriendName?: string;
  relatedFriendEntryId?: string;
  relatedRepaymentId?: string;
  settlementType?: 'received_back' | 'repaid';
}

export type BillCategory =
  | 'Rent'
  | 'Electricity'
  | 'Gas'
  | 'Grocery'
  | 'Credit Card'
  | 'Internet'
  | 'Water'
  | 'Other';

export type BillFrequency =
  | 'monthly'
  | 'weekly'
  | 'custom_days'
  | 'quarterly'
  | 'yearly';

export interface Bill {
  id: string;
  title: string;
  category: BillCategory | string;
  estimatedAmount: number;
  dueDate: string; // YYYY-MM-DD or ISO string
  frequency?: BillFrequency;
  frequencyDays?: number; // e.g. 6 for custom_days
  isPaid: boolean;
  lastPaidDate?: string;
  lastPaidAmount?: number;
  notificationId?: string;
  createdAt: string;
}

export interface SalaryConfig {
  amount: number; // e.g. 120000
  dayOfMonth: number; // 1 - 31
  specificDate?: string; // Optional next payday override
  lastCreditedMonthYear?: string; // e.g. '2026-10'
  autoPrompt: boolean;
  notificationId?: string;
}

export type FriendEntryType = 'lent' | 'borrowed'; // 'lent' = I Gave / Lent, 'borrowed' = I Took / Borrowed

export interface FriendRepayment {
  id: string;
  amount: number;
  date: string;
  type: 'partial' | 'full';
  note?: string;
}

export interface FriendEntry {
  id: string;
  friendId: string;
  friendName: string;
  amount: number; // Original amount in Rs.
  remainingAmount: number; // Remaining amount in Rs.
  type: FriendEntryType;
  description: string;
  date: string; // ISO string
  recoveryDate: string; // YYYY-MM-DD or ISO string
  isSettled: boolean;
  settledDate?: string;
  repayments: FriendRepayment[];
  notificationId?: string;
}

export interface Friend {
  id: string;
  name: string; // case-insensitive unique
  totalLent: number; // Total Rs lent to friend
  totalBorrowed: number; // Total Rs borrowed from friend
  netBalance: number; // >0: friend owes me, <0: I owe friend
  createdAt: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  avatarInitials: string;
  currency: string;
  joinedDate: string;
}

export interface SecuritySettings {
  pin: string | null; // 4-digit PIN string or null if disabled
  isPinEnabled: boolean;
  biometricsEnabled: boolean;
}

export interface WalletState {
  balance: number; // Central Wallet Balance (Rs.)
  transactions: WalletTransaction[];
  bills: Bill[];
  salaryConfig: SalaryConfig;
  friends: Friend[];
  friendEntries: FriendEntry[];
  userProfile: UserProfile;
  securitySettings: SecuritySettings;
  isLoaded: boolean;
}

export interface DueActionItem {
  id: string;
  type: 'bill' | 'salary' | 'friend_recovery';
  title: string;
  description: string;
  amount: number;
  date: string;
  referenceId: string;
  friendName?: string;
  isOverdue?: boolean;
}
