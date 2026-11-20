import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { NotificationService } from '../services/notifications';
import { SecurityService } from '../services/security';
import { StorageService } from '../services/storage';
import {
  Bill,
  BillCategory,
  BillFrequency,
  CreditCardBankPayment,
  CreditCardEntryType,
  CreditCardLedgerEntry,
  CreditCardMember,
  DueActionItem,
  Friend,
  FriendEntry,
  FriendRepayment,
  SalaryConfig,
  SecuritySettings,
  UserProfile,
  WalletBackupPayload,
  WalletState,
  WalletTransaction,
} from '../types';
import {
  calculateNextDueDate,
  createUniqueId,
  getDaysUntilSalary,
  getEffectivePayday,
  isDueTodayOrPast,
  isInflowTransaction,
  parseDate,
  toDateString,
} from '../utils/formatters';

type PersistedWalletState = Omit<WalletState, 'isLoaded'>;

interface WalletContextType extends WalletState {
  // Statistics
  monthlyIncome: number;
  monthlyExpenses: number;
  unpaidBillsTotal: number;
  safeToSpend: number;
  daysUntilPayday: number | null;
  dailySafeBudget: number | null;
  netPendingWithFriends: number;
  totalOwedToMe: number;
  totalOwedByMe: number;
  dueActionItems: DueActionItem[];

  // Credit Card Ledger Statistics (completely isolated from Central Wallet & Bills)
  totalCardCharged: number;
  totalCardCollected: number;
  totalCardPaidToBank: number;
  cardDueToBank: number;
  cardNetOwedByPeople: number;
  cardCashHeldForBank: number;

  // Actions
  refreshWallet: () => Promise<void>;
  addIncome: (description: string, amount: number, category?: string) => Promise<void>;
  addExpense: (description: string, amount: number, category?: string) => Promise<void>;
  payBill: (billId: string, paidAmount?: number) => Promise<void>;
  unpayBill: (billId: string) => Promise<void>;
  advanceBillCycle: (billId: string) => Promise<void>;
  addBill: (
    title: string,
    category: BillCategory | string,
    estimatedAmount: number,
    dueDate: string,
    frequency?: BillFrequency,
    frequencyDays?: number
  ) => Promise<void>;
  editBill: (billId: string, updates: Partial<Bill>) => Promise<void>;
  deleteBill: (billId: string) => Promise<void>;
  receiveSalary: (customAmount?: number) => Promise<void>;
  updateSalaryConfig: (config: SalaryConfig) => Promise<void>;
  deleteFriendEntry: (entryId: string) => Promise<void>;
  addFriendEntry: (
    friendName: string,
    amount: number,
    type: 'lent' | 'borrowed',
    description: string,
    recoveryDate: string
  ) => Promise<void>;
  settleFriendEntry: (
    entryId: string,
    settleAmount: number,
    isFull: boolean,
    note?: string
  ) => Promise<void>;
  settleAllFriendEntries: (friendId: string, note?: string) => Promise<void>;
  recordFriendRepayment: (
    friendId: string,
    amount: number,
    note?: string
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  resetAllData: () => Promise<void>;
  importBackupData: (payload: WalletBackupPayload) => Promise<void>;
  deleteFriend: (friendId: string) => Promise<void>;
  addCreditCardEntry: (
    memberName: string,
    amount: number,
    type: CreditCardEntryType,
    description: string,
    date?: string
  ) => Promise<void>;
  deleteCreditCardEntry: (entryId: string) => Promise<void>;
  deleteCreditCardMember: (memberId: string) => Promise<void>;
  addCreditCardBankPayment: (
    amount: number,
    note?: string,
    date?: string
  ) => Promise<void>;
  deleteCreditCardBankPayment: (paymentId: string) => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => Promise<void>;
  isUnlocked: boolean;
  unlockApp: () => void;
  lockApp: () => void;
  setSuppressAutoLock: (suppress: boolean) => void;
  isAutoLockSuppressed: () => boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const INITIAL_SALARY_CONFIG: SalaryConfig = {
  amount: 0,
  dayOfMonth: 1,
  autoPrompt: true,
};

const INITIAL_USER_PROFILE: UserProfile = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '',
  avatarInitials: 'JD',
  currency: 'PKR (Rs.)',
  joinedDate: new Date().toISOString(),
};

const INITIAL_SECURITY_SETTINGS: SecuritySettings = {
  pin: null,
  isPinEnabled: false,
  biometricsEnabled: false,
};

function recomputeFriendStats(
  friendsList: Friend[],
  entriesList: FriendEntry[],
  friendId: string
): Friend[] {
  return friendsList.map((f) => {
    if (f.id !== friendId) return f;
    const fEntries = entriesList.filter((e) => e.friendId === f.id);
    const totalLent = fEntries
      .filter((e) => e.type === 'lent')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalBorrowed = fEntries
      .filter((e) => e.type === 'borrowed')
      .reduce((sum, e) => sum + e.amount, 0);
    const netBalance = fEntries.reduce((acc, e) => {
      if (e.isSettled) return acc;
      return e.type === 'lent'
        ? acc + e.remainingAmount
        : acc - e.remainingAmount;
    }, 0);
    return {
      ...f,
      totalLent,
      totalBorrowed,
      netBalance,
    };
  });
}

function recomputeCardMemberStats(
  membersList: CreditCardMember[],
  entriesList: CreditCardLedgerEntry[],
  memberId: string
): CreditCardMember[] {
  return membersList.map((m) => {
    if (m.id !== memberId) return m;
    const mEntries = entriesList.filter((e) => e.memberId === m.id);
    const totalCharged = mEntries
      .filter((e) => e.type === 'charge')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalPaid = mEntries
      .filter((e) => e.type === 'payment')
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      ...m,
      totalCharged,
      totalPaid,
      balanceOwed: totalCharged - totalPaid,
    };
  });
}

function getTransactionBalanceReversal(tx: WalletTransaction): number {
  switch (tx.type) {
    case 'income':
    case 'salary':
    case 'friend_borrowed':
      return -tx.amount;
    case 'expense':
    case 'bill_payment':
    case 'friend_lent':
      return tx.amount;
    case 'friend_settlement':
      return tx.settlementType === 'received_back' ? -tx.amount : tx.amount;
    default:
      return 0;
  }
}

function getMonthYearFromIso(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig>(INITIAL_SALARY_CONFIG);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendEntries, setFriendEntries] = useState<FriendEntry[]>([]);
  const [creditCardMembers, setCreditCardMembers] = useState<CreditCardMember[]>([]);
  const [creditCardEntries, setCreditCardEntries] = useState<CreditCardLedgerEntry[]>([]);
  const [creditCardBankPayments, setCreditCardBankPayments] = useState<
    CreditCardBankPayment[]
  >([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(
    INITIAL_SECURITY_SETTINGS
  );
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [dateTick, setDateTick] = useState<string>(() => toDateString(new Date()));

  const suppressAutoLockRef = useRef<boolean>(false);

  const stateRef = useRef<PersistedWalletState>({
    balance: 0,
    transactions: [],
    bills: [],
    salaryConfig: INITIAL_SALARY_CONFIG,
    friends: [],
    friendEntries: [],
    creditCardMembers: [],
    creditCardEntries: [],
    creditCardBankPayments: [],
    userProfile: INITIAL_USER_PROFILE,
    securitySettings: INITIAL_SECURITY_SETTINGS,
  });

  const applyHydratedState = useCallback((data: PersistedWalletState) => {
    stateRef.current = data;
    setBalance(data.balance);
    setTransactions(data.transactions);
    setBills(data.bills);
    setSalaryConfig(data.salaryConfig);
    setFriends(data.friends);
    setFriendEntries(data.friendEntries);
    setCreditCardMembers(data.creditCardMembers);
    setCreditCardEntries(data.creditCardEntries);
    setCreditCardBankPayments(data.creditCardBankPayments);
    setUserProfile(data.userProfile);
    setSecuritySettings(data.securitySettings);
  }, []);

  // Initialize and load persisted data
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const data = await StorageService.loadWalletState();
      if (isMounted) {
        applyHydratedState(data);
        const isLockEnabled =
          data.securitySettings.isPinEnabled ||
          data.securitySettings.biometricsEnabled;
        setIsUnlocked(!isLockEnabled);
        setIsLoaded(true);

        // Request notification permission safely after initial UI render
        setTimeout(() => {
          NotificationService.requestPermissions().catch((err) => {
            console.log('Deferred notification permission note:', err);
          });
        }, 800);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [applyHydratedState]);

  // Keep date-based computations fresh when returning to foreground across midnight
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const currentDay = toDateString(new Date());
        setDateTick((prev) => (prev === currentDay ? prev : currentDay));
      }
    });
    return () => sub.remove();
  }, []);

  const refreshWallet = useCallback(async () => {
    const data = await StorageService.loadWalletState();
    applyHydratedState(data);
    setDateTick(toDateString(new Date()));
  }, [applyHydratedState]);

  const setSuppressAutoLock = useCallback((suppress: boolean) => {
    suppressAutoLockRef.current = suppress;
  }, []);

  const isAutoLockSuppressed = useCallback(() => {
    return suppressAutoLockRef.current;
  }, []);

  // Quick Income
  const addIncome = useCallback(
    async (description: string, amount: number, category = 'General') => {
      const cleanAmount = Math.abs(amount);
      if (cleanAmount <= 0) return;

      const latest = stateRef.current;
      const newTx: WalletTransaction = {
        id: createUniqueId('tx'),
        amount: cleanAmount,
        type: 'income',
        description: description.trim() || 'Income Added',
        category,
        date: new Date().toISOString(),
      };

      const newBalance = latest.balance + cleanAmount;
      const newTransactions = [newTx, ...latest.transactions];

      stateRef.current = {
        ...latest,
        balance: newBalance,
        transactions: newTransactions,
      };

      setBalance(newBalance);
      setTransactions(newTransactions);

      await Promise.all([
        StorageService.saveBalance(newBalance),
        StorageService.saveTransactions(newTransactions),
      ]);
    },
    []
  );

  // Quick Expense
  const addExpense = useCallback(
    async (description: string, amount: number, category = 'General') => {
      const cleanAmount = Math.abs(amount);
      if (cleanAmount <= 0) return;

      const latest = stateRef.current;
      const newTx: WalletTransaction = {
        id: createUniqueId('tx'),
        amount: cleanAmount,
        type: 'expense',
        description: description.trim() || 'Expense',
        category,
        date: new Date().toISOString(),
      };

      const newBalance = latest.balance - cleanAmount;
      const newTransactions = [newTx, ...latest.transactions];

      stateRef.current = {
        ...latest,
        balance: newBalance,
        transactions: newTransactions,
      };

      setBalance(newBalance);
      setTransactions(newTransactions);

      await Promise.all([
        StorageService.saveBalance(newBalance),
        StorageService.saveTransactions(newTransactions),
      ]);
    },
    []
  );

  // Pay Bill
  const payBill = useCallback(async (billId: string, paidAmount?: number) => {
    const latest = stateRef.current;
    const targetBill = latest.bills.find((b) => b.id === billId);
    if (!targetBill || targetBill.isPaid) return;

    const amountToDeduct = Math.abs(paidAmount ?? targetBill.estimatedAmount);
    if (amountToDeduct <= 0) return;

    const nowIso = new Date().toISOString();
    const newBalance = latest.balance - amountToDeduct;

    const newTx: WalletTransaction = {
      id: createUniqueId('tx-bill'),
      amount: amountToDeduct,
      type: 'bill_payment',
      description: `Bill Paid: ${targetBill.title}`,
      category: targetBill.category,
      relatedBillId: billId,
      date: nowIso,
    };

    const newBills = latest.bills.map((b) =>
      b.id === billId
        ? {
            ...b,
            isPaid: true,
            lastPaidDate: nowIso,
            lastPaidAmount: amountToDeduct,
            notificationId: undefined,
          }
        : b
    );

    const newTransactions = [newTx, ...latest.transactions];

    stateRef.current = {
      ...latest,
      balance: newBalance,
      bills: newBills,
      transactions: newTransactions,
    };

    setBalance(newBalance);
    setBills(newBills);
    setTransactions(newTransactions);

    if (targetBill.notificationId) {
      await NotificationService.cancelNotification(targetBill.notificationId);
    }

    await Promise.all([
      StorageService.saveBalance(newBalance),
      StorageService.saveBills(newBills),
      StorageService.saveTransactions(newTransactions),
    ]);
  }, []);

  // Unpay / Reopen Bill — reverses the most recent payment deduction and removes linked tx
  const unpayBill = useCallback(async (billId: string) => {
    const latest = stateRef.current;
    const targetBill = latest.bills.find((b) => b.id === billId);
    if (!targetBill || !targetBill.isPaid) return;

    // Transactions are newest-first, so .find() locates the most recent payment
    const relatedTx = latest.transactions.find(
      (t) =>
        t.type === 'bill_payment' &&
        (t.relatedBillId === billId ||
          (!t.relatedBillId &&
            t.description === `Bill Paid: ${targetBill.title}`))
    );

    let newBalance = latest.balance;
    let updatedTransactions = latest.transactions;

    if (relatedTx) {
      newBalance = latest.balance + relatedTx.amount;
      updatedTransactions = latest.transactions.filter(
        (t) => t.id !== relatedTx.id
      );
    }

    const reopenedBill: Bill = {
      ...targetBill,
      isPaid: false,
      lastPaidDate: undefined,
      lastPaidAmount: undefined,
      notificationId: undefined,
    };

    const newBills = latest.bills.map((b) =>
      b.id === billId ? reopenedBill : b
    );

    stateRef.current = {
      ...latest,
      balance: newBalance,
      transactions: updatedTransactions,
      bills: newBills,
    };

    setBalance(newBalance);
    setTransactions(updatedTransactions);
    setBills(newBills);

    const notifId = await NotificationService.scheduleBillNotification(
      reopenedBill
    );

    let finalBills = stateRef.current.bills;
    if (notifId) {
      finalBills = stateRef.current.bills.map((b) =>
        b.id === billId && !b.isPaid ? { ...b, notificationId: notifId } : b
      );
      stateRef.current = { ...stateRef.current, bills: finalBills };
      setBills(finalBills);
    }

    await Promise.all([
      StorageService.saveBalance(newBalance),
      StorageService.saveTransactions(updatedTransactions),
      StorageService.saveBills(finalBills),
    ]);
  }, []);

  // Add Bill
  const addBill = useCallback(
    async (
      title: string,
      category: BillCategory | string,
      estimatedAmount: number,
      dueDate: string,
      frequency: BillFrequency = 'monthly',
      frequencyDays = 6
    ) => {
      const normalizedDueDate = toDateString(parseDate(dueDate));
      const newBill: Bill = {
        id: createUniqueId('bill'),
        title: title.trim(),
        category,
        estimatedAmount: Math.abs(estimatedAmount),
        dueDate: normalizedDueDate,
        frequency,
        frequencyDays: frequency === 'custom_days' ? frequencyDays : undefined,
        isPaid: false,
        createdAt: new Date().toISOString(),
      };

      const initialLatest = stateRef.current;
      const initialBills = [newBill, ...initialLatest.bills];
      stateRef.current = { ...initialLatest, bills: initialBills };
      setBills(initialBills);

      const notifId = await NotificationService.scheduleBillNotification(newBill);
      let finalBills = stateRef.current.bills;
      if (notifId) {
        finalBills = stateRef.current.bills.map((b) =>
          b.id === newBill.id && !b.isPaid
            ? { ...b, notificationId: notifId }
            : b
        );
        stateRef.current = { ...stateRef.current, bills: finalBills };
        setBills(finalBills);
      }

      await StorageService.saveBills(finalBills);
    },
    []
  );

  // Advance Recurring Bill to Next Cycle (preserves historical payment & balance)
  const advanceBillCycle = useCallback(async (billId: string) => {
    const latest = stateRef.current;
    const target = latest.bills.find((b) => b.id === billId);
    if (!target) return;

    const nextDue = calculateNextDueDate(
      target.dueDate,
      target.frequency,
      target.frequencyDays
    );

    const advancedBill: Bill = {
      ...target,
      dueDate: nextDue,
      isPaid: false,
      lastPaidDate: undefined,
      lastPaidAmount: undefined,
      notificationId: undefined,
    };

    const updatedBills = latest.bills.map((b) =>
      b.id === billId ? advancedBill : b
    );
    stateRef.current = { ...latest, bills: updatedBills };
    setBills(updatedBills);

    if (target.notificationId) {
      await NotificationService.cancelNotification(target.notificationId);
    }

    const notifId = await NotificationService.scheduleBillNotification(
      advancedBill
    );
    let finalBills = stateRef.current.bills;
    if (notifId) {
      finalBills = stateRef.current.bills.map((b) =>
        b.id === billId && !b.isPaid ? { ...b, notificationId: notifId } : b
      );
      stateRef.current = { ...stateRef.current, bills: finalBills };
      setBills(finalBills);
    }

    await StorageService.saveBills(finalBills);
  }, []);

  // Edit Bill — re-schedules notification if dueDate, title, or estimatedAmount changed
  const editBill = useCallback(
    async (billId: string, updates: Partial<Bill>) => {
      const latest = stateRef.current;
      const existing = latest.bills.find((b) => b.id === billId);
      if (!existing) return;

      const normalizedUpdates: Partial<Bill> = {
        ...updates,
        ...(updates.dueDate
          ? { dueDate: toDateString(parseDate(updates.dueDate)) }
          : {}),
      };

      const updatedBill: Bill = { ...existing, ...normalizedUpdates };
      const shouldReschedule =
        (normalizedUpdates.dueDate &&
          normalizedUpdates.dueDate !== existing.dueDate) ||
        (normalizedUpdates.title && normalizedUpdates.title !== existing.title) ||
        (normalizedUpdates.estimatedAmount !== undefined &&
          normalizedUpdates.estimatedAmount !== existing.estimatedAmount);

      const interimBill: Bill = shouldReschedule
        ? { ...updatedBill, notificationId: undefined }
        : updatedBill;

      const interimBills = latest.bills.map((b) =>
        b.id === billId ? interimBill : b
      );
      stateRef.current = { ...latest, bills: interimBills };
      setBills(interimBills);

      let finalBills = stateRef.current.bills;
      if (shouldReschedule) {
        if (existing.notificationId) {
          await NotificationService.cancelNotification(existing.notificationId);
        }
        if (!interimBill.isPaid) {
          const notifId = await NotificationService.scheduleBillNotification(
            interimBill
          );
          if (notifId) {
            finalBills = stateRef.current.bills.map((b) =>
              b.id === billId && !b.isPaid
                ? { ...b, notificationId: notifId }
                : b
            );
            stateRef.current = { ...stateRef.current, bills: finalBills };
            setBills(finalBills);
          }
        }
      }

      await StorageService.saveBills(finalBills);
    },
    []
  );

  // Delete Bill
  const deleteBill = useCallback(async (billId: string) => {
    const latest = stateRef.current;
    const target = latest.bills.find((b) => b.id === billId);
    if (!target) return;

    const newBills = latest.bills.filter((b) => b.id !== billId);
    stateRef.current = { ...latest, bills: newBills };
    setBills(newBills);

    if (target.notificationId) {
      await NotificationService.cancelNotification(target.notificationId);
    }
    await StorageService.saveBills(newBills);
  }, []);

  // Receive Salary — guards against double-credit in same month, then re-schedules next notification
  const receiveSalary = useCallback(async (customAmount?: number) => {
    const latest = stateRef.current;
    const sc = latest.salaryConfig;
    const amountToAdd = Math.abs(customAmount ?? sc.amount);
    if (amountToAdd <= 0) return;

    const now = new Date();
    const monthYearStr = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;

    // Guard: do not allow double-credit in the same calendar month
    if (sc.lastCreditedMonthYear === monthYearStr) return;

    const newTx: WalletTransaction = {
      id: createUniqueId('tx-salary'),
      amount: amountToAdd,
      type: 'salary',
      description: `Monthly Salary Credited (${monthYearStr})`,
      category: 'Salary',
      date: now.toISOString(),
    };

    const newBalance = latest.balance + amountToAdd;
    const newTransactions = [newTx, ...latest.transactions];
    const previousNotifId = sc.notificationId;

    const interimSalaryConfig: SalaryConfig = {
      ...sc,
      lastCreditedMonthYear: monthYearStr,
      notificationId: undefined,
    };

    stateRef.current = {
      ...latest,
      balance: newBalance,
      transactions: newTransactions,
      salaryConfig: interimSalaryConfig,
    };

    setBalance(newBalance);
    setTransactions(newTransactions);
    setSalaryConfig(interimSalaryConfig);

    if (previousNotifId) {
      await NotificationService.cancelNotification(previousNotifId);
    }
    const nextNotifId = await NotificationService.scheduleSalaryNotification(
      sc.amount > 0 ? sc.amount : amountToAdd,
      sc.dayOfMonth,
      true
    );

    const finalSalaryConfig: SalaryConfig = {
      ...stateRef.current.salaryConfig,
      notificationId: nextNotifId ?? undefined,
    };
    stateRef.current = {
      ...stateRef.current,
      salaryConfig: finalSalaryConfig,
    };
    setSalaryConfig(finalSalaryConfig);

    await Promise.all([
      StorageService.saveBalance(newBalance),
      StorageService.saveTransactions(newTransactions),
      StorageService.saveSalaryConfig(finalSalaryConfig),
    ]);
  }, []);

  // Update Salary Configuration
  const updateSalaryConfig = useCallback(async (newConfig: SalaryConfig) => {
    const latest = stateRef.current;
    const oldNotifId = latest.salaryConfig.notificationId;

    const interimConfig: SalaryConfig = {
      ...newConfig,
      notificationId: undefined,
    };
    stateRef.current = { ...latest, salaryConfig: interimConfig };
    setSalaryConfig(interimConfig);

    if (oldNotifId) {
      await NotificationService.cancelNotification(oldNotifId);
    }

    let notifId: string | undefined;
    if (newConfig.amount > 0) {
      notifId = await NotificationService.scheduleSalaryNotification(
        newConfig.amount,
        newConfig.dayOfMonth
      );
    }

    const finalized: SalaryConfig = {
      ...stateRef.current.salaryConfig,
      notificationId: notifId,
    };
    stateRef.current = { ...stateRef.current, salaryConfig: finalized };
    setSalaryConfig(finalized);

    await StorageService.saveSalaryConfig(finalized);
  }, []);

  // Add Friend Give & Take Entry (Auto friend creation + Wallet Sync)
  const addFriendEntry = useCallback(
    async (
      friendNameRaw: string,
      amount: number,
      type: 'lent' | 'borrowed',
      description: string,
      recoveryDate: string
    ) => {
      const cleanName = friendNameRaw.trim();
      if (!cleanName || amount <= 0) return;

      const cleanAmount = Math.abs(amount);
      const normalizedRecoveryDate = toDateString(parseDate(recoveryDate));
      const nowIso = new Date().toISOString();
      const entryId = createUniqueId('f-entry');

      const initialLatest = stateRef.current;
      const initialExistingFriend = initialLatest.friends.find(
        (f) => f.name.toLowerCase() === cleanName.toLowerCase()
      );
      const draftFriendId = initialExistingFriend?.id ?? createUniqueId('friend');
      const draftFriendName = initialExistingFriend?.name ?? cleanName;

      const draftEntry: FriendEntry = {
        id: entryId,
        friendId: draftFriendId,
        friendName: draftFriendName,
        amount: cleanAmount,
        remainingAmount: cleanAmount,
        type,
        description: description.trim(),
        date: nowIso,
        recoveryDate: normalizedRecoveryDate,
        isSettled: false,
        repayments: [],
      };

      const notifId =
        await NotificationService.scheduleFriendRecoveryNotification(draftEntry);

      const latest = stateRef.current;
      const existingFriend = latest.friends.find(
        (f) => f.name.toLowerCase() === cleanName.toLowerCase()
      );

      let resolvedFriend: Friend;
      let updatedFriends = [...latest.friends];

      if (existingFriend) {
        resolvedFriend = { ...existingFriend };
      } else {
        resolvedFriend = {
          id: draftFriendId,
          name: cleanName,
          totalLent: 0,
          totalBorrowed: 0,
          netBalance: 0,
          createdAt: nowIso,
        };
        updatedFriends.push(resolvedFriend);
      }

      const newEntry: FriendEntry = {
        ...draftEntry,
        friendId: resolvedFriend.id,
        friendName: resolvedFriend.name,
        ...(notifId ? { notificationId: notifId } : {}),
      };

      const updatedEntries = [newEntry, ...latest.friendEntries];
      updatedFriends = recomputeFriendStats(
        updatedFriends,
        updatedEntries,
        resolvedFriend.id
      );

      const newBalance =
        type === 'lent'
          ? latest.balance - cleanAmount
          : latest.balance + cleanAmount;
      const txType: 'friend_lent' | 'friend_borrowed' =
        type === 'lent' ? 'friend_lent' : 'friend_borrowed';
      const txDesc =
        type === 'lent'
          ? `Gave / Lent to ${resolvedFriend.name}: ${
              description.trim() || 'Money Lent'
            }`
          : `Took / Borrowed from ${resolvedFriend.name}: ${
              description.trim() || 'Borrowed'
            }`;

      const newTx: WalletTransaction = {
        id: createUniqueId('tx-f'),
        amount: cleanAmount,
        type: txType,
        description: txDesc,
        category: 'Friends Ledger',
        date: nowIso,
        relatedFriendId: resolvedFriend.id,
        relatedFriendName: resolvedFriend.name,
        relatedFriendEntryId: newEntry.id,
      };

      const updatedTransactions = [newTx, ...latest.transactions];

      stateRef.current = {
        ...latest,
        balance: newBalance,
        friends: updatedFriends,
        friendEntries: updatedEntries,
        transactions: updatedTransactions,
      };

      setBalance(newBalance);
      setFriends(updatedFriends);
      setFriendEntries(updatedEntries);
      setTransactions(updatedTransactions);

      await Promise.all([
        StorageService.saveBalance(newBalance),
        StorageService.saveFriends(updatedFriends),
        StorageService.saveFriendEntries(updatedEntries),
        StorageService.saveTransactions(updatedTransactions),
      ]);
    },
    []
  );

  // Settle Single Friend Entry (Partial or Full)
  const settleFriendEntry = useCallback(
    async (
      entryId: string,
      settleAmount: number,
      isFull: boolean,
      note = ''
    ) => {
      const latest = stateRef.current;
      const entry = latest.friendEntries.find((e) => e.id === entryId);
      if (!entry || entry.isSettled) return;

      const cleanAmount = isFull
        ? entry.remainingAmount
        : Math.min(Math.abs(settleAmount), entry.remainingAmount);

      if (cleanAmount <= 0) return;

      const remainingAfter = Math.max(0, entry.remainingAmount - cleanAmount);
      const isNowSettled = isFull || remainingAfter === 0;
      const nowIso = new Date().toISOString();

      const repayment: FriendRepayment = {
        id: createUniqueId('repay'),
        amount: cleanAmount,
        date: nowIso,
        type: isNowSettled ? 'full' : 'partial',
        note: note.trim() || undefined,
      };

      let newBalance = latest.balance;
      let txDesc = '';
      let settlementType: 'received_back' | 'repaid';

      if (entry.type === 'lent') {
        newBalance = latest.balance + cleanAmount;
        settlementType = 'received_back';
        txDesc = isNowSettled
          ? `Settled in full by ${entry.friendName} (+${cleanAmount})`
          : `Partial payment from ${entry.friendName} (+${cleanAmount})`;
      } else {
        newBalance = latest.balance - cleanAmount;
        settlementType = 'repaid';
        txDesc = isNowSettled
          ? `Repaid debt in full to ${entry.friendName} (-${cleanAmount})`
          : `Partial debt repayment to ${entry.friendName} (-${cleanAmount})`;
      }

      const notifToCancel = isNowSettled ? entry.notificationId : undefined;

      const updatedEntries = latest.friendEntries.map((e) => {
        if (e.id === entryId) {
          return {
            ...e,
            remainingAmount: remainingAfter,
            isSettled: isNowSettled,
            settledDate: isNowSettled ? nowIso : undefined,
            notificationId: isNowSettled ? undefined : e.notificationId,
            repayments: [repayment, ...e.repayments],
          };
        }
        return e;
      });

      const updatedFriends = recomputeFriendStats(
        latest.friends,
        updatedEntries,
        entry.friendId
      );

      const newTx: WalletTransaction = {
        id: createUniqueId('tx-settle'),
        amount: cleanAmount,
        type: 'friend_settlement',
        description: txDesc,
        category: 'Debt Settlement',
        date: nowIso,
        relatedFriendId: entry.friendId,
        relatedFriendName: entry.friendName,
        relatedFriendEntryId: entry.id,
        relatedRepaymentId: repayment.id,
        settlementType,
      };

      const updatedTransactions = [newTx, ...latest.transactions];

      stateRef.current = {
        ...latest,
        balance: newBalance,
        friendEntries: updatedEntries,
        friends: updatedFriends,
        transactions: updatedTransactions,
      };

      setBalance(newBalance);
      setFriendEntries(updatedEntries);
      setFriends(updatedFriends);
      setTransactions(updatedTransactions);

      if (notifToCancel) {
        await NotificationService.cancelNotification(notifToCancel);
      }

      await Promise.all([
        StorageService.saveBalance(newBalance),
        StorageService.saveFriendEntries(updatedEntries),
        StorageService.saveFriends(updatedFriends),
        StorageService.saveTransactions(updatedTransactions),
      ]);
    },
    []
  );

  // Atomically settle all pending entries for a friend in a single state/storage commit
  const settleAllFriendEntries = useCallback(
    async (friendId: string, note = 'Settled in full') => {
      const latest = stateRef.current;
      const pending = latest.friendEntries.filter(
        (e) =>
          e.friendId === friendId && !e.isSettled && e.remainingAmount > 0
      );
      if (pending.length === 0) return;

      const nowIso = new Date().toISOString();
      const cleanNote = note.trim() || 'Settled in full';
      let newBalance = latest.balance;
      const newTxs: WalletTransaction[] = [];
      const notifIdsToCancel: string[] = [];
      const entryUpdates = new Map<string, FriendEntry>();

      pending.forEach((entry) => {
        const settleAmt = entry.remainingAmount;
        const repayment: FriendRepayment = {
          id: createUniqueId('repay'),
          amount: settleAmt,
          date: nowIso,
          type: 'full',
          note: cleanNote,
        };

        let settlementType: 'received_back' | 'repaid';
        let txDesc: string;

        if (entry.type === 'lent') {
          newBalance += settleAmt;
          settlementType = 'received_back';
          txDesc = `Settled in full by ${entry.friendName} (+${settleAmt})`;
        } else {
          newBalance -= settleAmt;
          settlementType = 'repaid';
          txDesc = `Repaid debt in full to ${entry.friendName} (-${settleAmt})`;
        }

        if (entry.notificationId) {
          notifIdsToCancel.push(entry.notificationId);
        }

        entryUpdates.set(entry.id, {
          ...entry,
          remainingAmount: 0,
          isSettled: true,
          settledDate: nowIso,
          notificationId: undefined,
          repayments: [repayment, ...entry.repayments],
        });

        newTxs.push({
          id: createUniqueId('tx-settle'),
          amount: settleAmt,
          type: 'friend_settlement',
          description: txDesc,
          category: 'Debt Settlement',
          date: nowIso,
          relatedFriendId: entry.friendId,
          relatedFriendName: entry.friendName,
          relatedFriendEntryId: entry.id,
          relatedRepaymentId: repayment.id,
          settlementType,
        });
      });

      const updatedEntries = latest.friendEntries.map(
        (e) => entryUpdates.get(e.id) ?? e
      );
      const updatedFriends = recomputeFriendStats(
        latest.friends,
        updatedEntries,
        friendId
      );
      const updatedTransactions = [...newTxs.reverse(), ...latest.transactions];

      stateRef.current = {
        ...latest,
        balance: newBalance,
        friendEntries: updatedEntries,
        friends: updatedFriends,
        transactions: updatedTransactions,
      };

      setBalance(newBalance);
      setFriendEntries(updatedEntries);
      setFriends(updatedFriends);
      setTransactions(updatedTransactions);

      await Promise.all([
        ...notifIdsToCancel.map((id) =>
          NotificationService.cancelNotification(id)
        ),
        StorageService.saveBalance(newBalance),
        StorageService.saveFriendEntries(updatedEntries),
        StorageService.saveFriends(updatedFriends),
        StorageService.saveTransactions(updatedTransactions),
      ]);
    },
    []
  );

  // Cascade a repayment across a friend's oldest matching pending entries atomically
  const recordFriendRepayment = useCallback(
    async (friendId: string, amount: number, note = 'Repayment') => {
      const cleanInput = Math.abs(amount);
      if (cleanInput <= 0) return;

      const latest = stateRef.current;
      const liveFriend = latest.friends.find((f) => f.id === friendId);
      if (!liveFriend || liveFriend.netBalance === 0) return;

      const targetDirection: 'lent' | 'borrowed' =
        liveFriend.netBalance > 0 ? 'lent' : 'borrowed';

      const matchingPending = latest.friendEntries
        .filter(
          (e) =>
            e.friendId === friendId &&
            !e.isSettled &&
            e.remainingAmount > 0 &&
            e.type === targetDirection
        )
        .sort(
          (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
        );

      if (matchingPending.length === 0) return;

      let remainingToAllocate = cleanInput;
      let newBalance = latest.balance;
      const nowIso = new Date().toISOString();
      const cleanNote = note.trim() || 'Repayment';
      const newTxs: WalletTransaction[] = [];
      const notifIdsToCancel: string[] = [];
      const entryUpdates = new Map<string, FriendEntry>();

      for (const entry of matchingPending) {
        if (remainingToAllocate <= 0) break;

        const applied = Math.min(remainingToAllocate, entry.remainingAmount);
        remainingToAllocate -= applied;

        const remainingAfter = Math.max(0, entry.remainingAmount - applied);
        const isNowSettled = remainingAfter === 0;

        const repayment: FriendRepayment = {
          id: createUniqueId('repay'),
          amount: applied,
          date: nowIso,
          type: isNowSettled ? 'full' : 'partial',
          note: cleanNote,
        };

        let settlementType: 'received_back' | 'repaid';
        let txDesc: string;

        if (entry.type === 'lent') {
          newBalance += applied;
          settlementType = 'received_back';
          txDesc = isNowSettled
            ? `Settled in full by ${entry.friendName} (+${applied})`
            : `Partial payment from ${entry.friendName} (+${applied})`;
        } else {
          newBalance -= applied;
          settlementType = 'repaid';
          txDesc = isNowSettled
            ? `Repaid debt in full to ${entry.friendName} (-${applied})`
            : `Partial debt repayment to ${entry.friendName} (-${applied})`;
        }

        if (isNowSettled && entry.notificationId) {
          notifIdsToCancel.push(entry.notificationId);
        }

        entryUpdates.set(entry.id, {
          ...entry,
          remainingAmount: remainingAfter,
          isSettled: isNowSettled,
          settledDate: isNowSettled ? nowIso : undefined,
          notificationId: isNowSettled ? undefined : entry.notificationId,
          repayments: [repayment, ...entry.repayments],
        });

        newTxs.push({
          id: createUniqueId('tx-settle'),
          amount: applied,
          type: 'friend_settlement',
          description: txDesc,
          category: 'Debt Settlement',
          date: nowIso,
          relatedFriendId: entry.friendId,
          relatedFriendName: entry.friendName,
          relatedFriendEntryId: entry.id,
          relatedRepaymentId: repayment.id,
          settlementType,
        });
      }

      if (newTxs.length === 0) return;

      const updatedEntries = latest.friendEntries.map(
        (e) => entryUpdates.get(e.id) ?? e
      );
      const updatedFriends = recomputeFriendStats(
        latest.friends,
        updatedEntries,
        friendId
      );
      const updatedTransactions = [...newTxs.reverse(), ...latest.transactions];

      stateRef.current = {
        ...latest,
        balance: newBalance,
        friendEntries: updatedEntries,
        friends: updatedFriends,
        transactions: updatedTransactions,
      };

      setBalance(newBalance);
      setFriendEntries(updatedEntries);
      setFriends(updatedFriends);
      setTransactions(updatedTransactions);

      await Promise.all([
        ...notifIdsToCancel.map((id) =>
          NotificationService.cancelNotification(id)
        ),
        StorageService.saveBalance(newBalance),
        StorageService.saveFriendEntries(updatedEntries),
        StorageService.saveFriends(updatedFriends),
        StorageService.saveTransactions(updatedTransactions),
      ]);
    },
    []
  );

  // Delete Friend Entry (Rolls back original entry + all linked settlements & wallet balance)
  const deleteFriendEntry = useCallback(async (entryId: string) => {
    const latest = stateRef.current;
    const targetEntry = latest.friendEntries.find((e) => e.id === entryId);
    if (!targetEntry) return;

    const directlyLinkedTxs = latest.transactions.filter(
      (t) => t.relatedFriendEntryId === entryId
    );

    const txsToRemove =
      directlyLinkedTxs.length > 0
        ? directlyLinkedTxs
        : (() => {
            const legacyTx = latest.transactions.find(
              (t) =>
                !t.relatedFriendEntryId &&
                t.relatedFriendId === targetEntry.friendId &&
                t.amount === targetEntry.amount &&
                t.type ===
                  (targetEntry.type === 'lent'
                    ? 'friend_lent'
                    : 'friend_borrowed')
            );
            return legacyTx ? [legacyTx] : [];
          })();

    const removedIds = new Set(txsToRemove.map((t) => t.id));
    const balanceAdjustment = txsToRemove.reduce(
      (acc, t) => acc + getTransactionBalanceReversal(t),
      0
    );

    const newBalance = latest.balance + balanceAdjustment;
    const updatedTransactions = latest.transactions.filter(
      (t) => !removedIds.has(t.id)
    );
    const updatedEntries = latest.friendEntries.filter((e) => e.id !== entryId);
    const updatedFriends = recomputeFriendStats(
      latest.friends,
      updatedEntries,
      targetEntry.friendId
    );

    stateRef.current = {
      ...latest,
      balance: newBalance,
      transactions: updatedTransactions,
      friendEntries: updatedEntries,
      friends: updatedFriends,
    };

    setBalance(newBalance);
    setTransactions(updatedTransactions);
    setFriendEntries(updatedEntries);
    setFriends(updatedFriends);

    if (targetEntry.notificationId) {
      await NotificationService.cancelNotification(targetEntry.notificationId);
    }

    await Promise.all([
      StorageService.saveBalance(newBalance),
      StorageService.saveTransactions(updatedTransactions),
      StorageService.saveFriendEntries(updatedEntries),
      StorageService.saveFriends(updatedFriends),
    ]);
  }, []);

  // Delete transaction with wallet balance rollback & bidirectional Friends/Bills/Salary sync
  const deleteTransaction = useCallback(async (id: string) => {
    const latest = stateRef.current;
    const tx = latest.transactions.find((t) => t.id === id);
    if (!tx) return;

    let balanceAdjustment = getTransactionBalanceReversal(tx);
    const removedTxIds = new Set<string>([id]);

    let updatedFriendEntries = [...latest.friendEntries];
    let updatedFriends = [...latest.friends];
    let updatedBills = [...latest.bills];
    let updatedSalaryConfig = { ...latest.salaryConfig };
    let salaryChanged = false;

    const notifIdsToCancel: string[] = [];
    let friendEntryToRescheduleId: string | null = null;
    let billToRescheduleId: string | null = null;
    let shouldRescheduleSalary = false;

    // 1. Sync Friends Ledger
    if (tx.type === 'friend_lent' || tx.type === 'friend_borrowed') {
      const targetEntry = tx.relatedFriendEntryId
        ? updatedFriendEntries.find((e) => e.id === tx.relatedFriendEntryId)
        : updatedFriendEntries.find(
            (e) =>
              tx.relatedFriendId &&
              e.friendId === tx.relatedFriendId &&
              e.amount === tx.amount &&
              e.type === (tx.type === 'friend_lent' ? 'lent' : 'borrowed')
          );

      if (targetEntry) {
        if (targetEntry.notificationId) {
          notifIdsToCancel.push(targetEntry.notificationId);
        }

        const linkedSettlements = latest.transactions.filter(
          (other) =>
            other.id !== id &&
            other.type === 'friend_settlement' &&
            other.relatedFriendEntryId === targetEntry.id
        );
        linkedSettlements.forEach((sTx) => {
          removedTxIds.add(sTx.id);
          balanceAdjustment += getTransactionBalanceReversal(sTx);
        });

        updatedFriendEntries = updatedFriendEntries.filter(
          (e) => e.id !== targetEntry.id
        );
        updatedFriends = recomputeFriendStats(
          updatedFriends,
          updatedFriendEntries,
          targetEntry.friendId
        );
      }
    } else if (tx.type === 'friend_settlement') {
      const targetEntry = tx.relatedFriendEntryId
        ? updatedFriendEntries.find((e) => e.id === tx.relatedFriendEntryId)
        : updatedFriendEntries.find(
            (e) => tx.relatedFriendId && e.friendId === tx.relatedFriendId
          );

      if (targetEntry) {
        const updatedRepayments = tx.relatedRepaymentId
          ? targetEntry.repayments.filter((r) => r.id !== tx.relatedRepaymentId)
          : targetEntry.repayments.slice(1);

        const remainingAmount = Math.min(
          targetEntry.amount,
          targetEntry.remainingAmount + tx.amount
        );
        const isNowSettled = remainingAmount <= 0;

        if (targetEntry.isSettled && !isNowSettled) {
          friendEntryToRescheduleId = targetEntry.id;
        }

        updatedFriendEntries = updatedFriendEntries.map((e) =>
          e.id === targetEntry.id
            ? {
                ...e,
                remainingAmount,
                isSettled: isNowSettled,
                settledDate: isNowSettled ? e.settledDate : undefined,
                repayments: updatedRepayments,
              }
            : e
        );

        updatedFriends = recomputeFriendStats(
          updatedFriends,
          updatedFriendEntries,
          targetEntry.friendId
        );
      }
    }

    const updatedTransactions = latest.transactions.filter(
      (t) => !removedTxIds.has(t.id)
    );

    // 2. Sync Bills
    if (tx.type === 'bill_payment' || tx.relatedBillId) {
      const targetBill = tx.relatedBillId
        ? updatedBills.find((b) => b.id === tx.relatedBillId)
        : tx.description
        ? updatedBills.find((b) => tx.description === `Bill Paid: ${b.title}`)
        : undefined;

      if (targetBill && targetBill.isPaid) {
        const hasRemainingPayment = updatedTransactions.some(
          (t) =>
            t.type === 'bill_payment' &&
            (t.relatedBillId === targetBill.id ||
              (!t.relatedBillId &&
                t.description === `Bill Paid: ${targetBill.title}`))
        );

        if (!hasRemainingPayment) {
          billToRescheduleId = targetBill.id;
          updatedBills = updatedBills.map((b) =>
            b.id === targetBill.id
              ? {
                  ...b,
                  isPaid: false,
                  lastPaidDate: undefined,
                  lastPaidAmount: undefined,
                  notificationId: undefined,
                }
              : b
          );
        }
      }
    }

    // 3. Sync Salary
    if (tx.type === 'salary') {
      const txMonthYear = getMonthYearFromIso(tx.date);
      const hasOtherSalarySameMonth = updatedTransactions.some(
        (t) => t.type === 'salary' && getMonthYearFromIso(t.date) === txMonthYear
      );

      if (
        updatedSalaryConfig.lastCreditedMonthYear === txMonthYear &&
        !hasOtherSalarySameMonth
      ) {
        const remainingSalaries = updatedTransactions
          .filter((t) => t.type === 'salary')
          .sort(
            (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()
          );
        const prevMonthYear =
          remainingSalaries.length > 0
            ? getMonthYearFromIso(remainingSalaries[0].date)
            : undefined;

        if (updatedSalaryConfig.notificationId) {
          notifIdsToCancel.push(updatedSalaryConfig.notificationId);
        }
        updatedSalaryConfig = {
          ...updatedSalaryConfig,
          lastCreditedMonthYear: prevMonthYear,
          notificationId: undefined,
        };
        salaryChanged = true;
        shouldRescheduleSalary = updatedSalaryConfig.amount > 0;
      }
    }

    const newBalance = latest.balance + balanceAdjustment;

    stateRef.current = {
      ...latest,
      balance: newBalance,
      transactions: updatedTransactions,
      friendEntries: updatedFriendEntries,
      friends: updatedFriends,
      bills: updatedBills,
      salaryConfig: updatedSalaryConfig,
    };

    setBalance(newBalance);
    setTransactions(updatedTransactions);
    setFriendEntries(updatedFriendEntries);
    setFriends(updatedFriends);
    setBills(updatedBills);
    if (salaryChanged) {
      setSalaryConfig(updatedSalaryConfig);
    }

    if (notifIdsToCancel.length > 0) {
      await Promise.all(
        notifIdsToCancel.map((nId) =>
          NotificationService.cancelNotification(nId)
        )
      );
    }

    let finalEntries = stateRef.current.friendEntries;
    if (friendEntryToRescheduleId) {
      const entryObj = finalEntries.find(
        (e) => e.id === friendEntryToRescheduleId
      );
      if (entryObj && !entryObj.isSettled) {
        const nId = await NotificationService.scheduleFriendRecoveryNotification(
          entryObj
        );
        if (nId) {
          finalEntries = stateRef.current.friendEntries.map((e) =>
            e.id === friendEntryToRescheduleId && !e.isSettled
              ? { ...e, notificationId: nId }
              : e
          );
          stateRef.current = {
            ...stateRef.current,
            friendEntries: finalEntries,
          };
          setFriendEntries(finalEntries);
        }
      }
    }

    let finalBills = stateRef.current.bills;
    if (billToRescheduleId) {
      const billObj = finalBills.find((b) => b.id === billToRescheduleId);
      if (billObj && !billObj.isPaid) {
        const nId = await NotificationService.scheduleBillNotification(billObj);
        if (nId) {
          finalBills = stateRef.current.bills.map((b) =>
            b.id === billToRescheduleId && !b.isPaid
              ? { ...b, notificationId: nId }
              : b
          );
          stateRef.current = { ...stateRef.current, bills: finalBills };
          setBills(finalBills);
        }
      }
    }

    let finalSalaryConfig = stateRef.current.salaryConfig;
    if (shouldRescheduleSalary && finalSalaryConfig.amount > 0) {
      const nId = await NotificationService.scheduleSalaryNotification(
        finalSalaryConfig.amount,
        finalSalaryConfig.dayOfMonth
      );
      if (nId) {
        finalSalaryConfig = {
          ...stateRef.current.salaryConfig,
          notificationId: nId,
        };
        stateRef.current = {
          ...stateRef.current,
          salaryConfig: finalSalaryConfig,
        };
        setSalaryConfig(finalSalaryConfig);
      }
    }

    await Promise.all([
      StorageService.saveBalance(newBalance),
      StorageService.saveTransactions(updatedTransactions),
      StorageService.saveFriendEntries(finalEntries),
      StorageService.saveFriends(updatedFriends),
      StorageService.saveBills(finalBills),
      ...(salaryChanged
        ? [StorageService.saveSalaryConfig(finalSalaryConfig)]
        : []),
    ]);
  }, []);

  // Reset all financial data & security settings while preserving user's profile
  const resetAllData = useCallback(async () => {
    await NotificationService.cancelAllNotifications();
    await SecurityService.removePin();

    const data = await StorageService.resetToDefaults(
      stateRef.current.userProfile
    );
    applyHydratedState(data);
    setIsUnlocked(true);
  }, [applyHydratedState]);

  // Delete a friend record and all associated entries, with full balance rollback
  const deleteFriend = useCallback(async (friendId: string) => {
    const latest = stateRef.current;
    const friendToDelete = latest.friends.find((f) => f.id === friendId);
    if (!friendToDelete) return;

    const friendEntriesForFriend = latest.friendEntries.filter(
      (e) => e.friendId === friendId
    );

    const entryIds = new Set(friendEntriesForFriend.map((e) => e.id));
    const txsToRemove = latest.transactions.filter(
      (t) =>
        (t.relatedFriendEntryId && entryIds.has(t.relatedFriendEntryId)) ||
        (t.relatedFriendId === friendId &&
          (t.type === 'friend_lent' ||
            t.type === 'friend_borrowed' ||
            t.type === 'friend_settlement'))
    );
    const removedTxIds = new Set(txsToRemove.map((t) => t.id));

    let balanceAdjustment = 0;
    if (txsToRemove.length > 0) {
      balanceAdjustment = txsToRemove.reduce(
        (acc, t) => acc + getTransactionBalanceReversal(t),
        0
      );
    } else {
      friendEntriesForFriend.forEach((e) => {
        if (!e.isSettled) {
          balanceAdjustment +=
            e.type === 'lent' ? e.remainingAmount : -e.remainingAmount;
        }
      });
    }

    const newBalance = latest.balance + balanceAdjustment;
    const updatedTransactions = latest.transactions.filter(
      (t) => !removedTxIds.has(t.id)
    );
    const updatedEntries = latest.friendEntries.filter(
      (e) => e.friendId !== friendId
    );
    const updatedFriends = latest.friends.filter((f) => f.id !== friendId);

    stateRef.current = {
      ...latest,
      balance: newBalance,
      transactions: updatedTransactions,
      friendEntries: updatedEntries,
      friends: updatedFriends,
    };

    setBalance(newBalance);
    setTransactions(updatedTransactions);
    setFriendEntries(updatedEntries);
    setFriends(updatedFriends);

    await Promise.all([
      ...friendEntriesForFriend
        .filter((e) => e.notificationId)
        .map((e) => NotificationService.cancelNotification(e.notificationId)),
      StorageService.saveBalance(newBalance),
      StorageService.saveTransactions(updatedTransactions),
      StorageService.saveFriendEntries(updatedEntries),
      StorageService.saveFriends(updatedFriends),
    ]);
  }, []);

  // ── Isolated Credit Card Ledger Actions ────────────────────────────────────
  const addCreditCardEntry = useCallback(
    async (
      memberNameRaw: string,
      amount: number,
      type: CreditCardEntryType,
      description: string,
      dateStr?: string
    ) => {
      const cleanName = memberNameRaw.trim();
      const cleanAmount = Math.abs(amount);
      if (!cleanName || cleanAmount <= 0) return;

      const latest = stateRef.current;
      const nowIso = new Date().toISOString();
      const entryDate = toDateString(
        parseDate(dateStr || toDateString(new Date()))
      );

      const existingMember = latest.creditCardMembers.find(
        (m) => m.name.toLowerCase() === cleanName.toLowerCase()
      );
      let resolvedMember: CreditCardMember;
      let updatedMembers = [...latest.creditCardMembers];

      if (existingMember) {
        resolvedMember = { ...existingMember };
      } else {
        resolvedMember = {
          id: createUniqueId('cc-member'),
          name: cleanName,
          totalCharged: 0,
          totalPaid: 0,
          balanceOwed: 0,
          createdAt: nowIso,
        };
        updatedMembers.push(resolvedMember);
      }

      const newEntry: CreditCardLedgerEntry = {
        id: createUniqueId('cc-entry'),
        memberId: resolvedMember.id,
        memberName: resolvedMember.name,
        type,
        amount: cleanAmount,
        description:
          description.trim() ||
          (type === 'charge' ? 'Card spend' : 'Payment received'),
        date: entryDate,
        createdAt: nowIso,
      };

      const updatedEntries = [newEntry, ...latest.creditCardEntries];
      updatedMembers = recomputeCardMemberStats(
        updatedMembers,
        updatedEntries,
        resolvedMember.id
      );

      stateRef.current = {
        ...latest,
        creditCardMembers: updatedMembers,
        creditCardEntries: updatedEntries,
      };

      setCreditCardMembers(updatedMembers);
      setCreditCardEntries(updatedEntries);

      await Promise.all([
        StorageService.saveCreditCardMembers(updatedMembers),
        StorageService.saveCreditCardEntries(updatedEntries),
      ]);
    },
    []
  );

  const deleteCreditCardEntry = useCallback(async (entryId: string) => {
    const latest = stateRef.current;
    const target = latest.creditCardEntries.find((e) => e.id === entryId);
    if (!target) return;

    const updatedEntries = latest.creditCardEntries.filter(
      (e) => e.id !== entryId
    );
    const updatedMembers = recomputeCardMemberStats(
      latest.creditCardMembers,
      updatedEntries,
      target.memberId
    );

    stateRef.current = {
      ...latest,
      creditCardMembers: updatedMembers,
      creditCardEntries: updatedEntries,
    };

    setCreditCardMembers(updatedMembers);
    setCreditCardEntries(updatedEntries);

    await Promise.all([
      StorageService.saveCreditCardMembers(updatedMembers),
      StorageService.saveCreditCardEntries(updatedEntries),
    ]);
  }, []);

  const deleteCreditCardMember = useCallback(async (memberId: string) => {
    const latest = stateRef.current;
    const exists = latest.creditCardMembers.some((m) => m.id === memberId);
    if (!exists) return;

    const updatedMembers = latest.creditCardMembers.filter(
      (m) => m.id !== memberId
    );
    const updatedEntries = latest.creditCardEntries.filter(
      (e) => e.memberId !== memberId
    );

    stateRef.current = {
      ...latest,
      creditCardMembers: updatedMembers,
      creditCardEntries: updatedEntries,
    };

    setCreditCardMembers(updatedMembers);
    setCreditCardEntries(updatedEntries);

    await Promise.all([
      StorageService.saveCreditCardMembers(updatedMembers),
      StorageService.saveCreditCardEntries(updatedEntries),
    ]);
  }, []);

  const addCreditCardBankPayment = useCallback(
    async (amount: number, note = '', dateStr?: string) => {
      const cleanAmount = Math.abs(amount);
      if (cleanAmount <= 0) return;

      const latest = stateRef.current;
      const nowIso = new Date().toISOString();
      const payDate = toDateString(
        parseDate(dateStr || toDateString(new Date()))
      );

      const newPayment: CreditCardBankPayment = {
        id: createUniqueId('cc-bank'),
        amount: cleanAmount,
        note: note.trim() || 'Paid to card bank',
        date: payDate,
        createdAt: nowIso,
      };

      const updatedPayments = [newPayment, ...latest.creditCardBankPayments];

      stateRef.current = {
        ...latest,
        creditCardBankPayments: updatedPayments,
      };

      setCreditCardBankPayments(updatedPayments);
      await StorageService.saveCreditCardBankPayments(updatedPayments);
    },
    []
  );

  const deleteCreditCardBankPayment = useCallback(async (paymentId: string) => {
    const latest = stateRef.current;
    const updatedPayments = latest.creditCardBankPayments.filter(
      (p) => p.id !== paymentId
    );

    stateRef.current = {
      ...latest,
      creditCardBankPayments: updatedPayments,
    };

    setCreditCardBankPayments(updatedPayments);
    await StorageService.saveCreditCardBankPayments(updatedPayments);
  }, []);

  // Restore full wallet backup (preserves device security settings & reschedules reminders)
  const importBackupData = useCallback(
    async (payload: WalletBackupPayload) => {
      await NotificationService.cancelAllNotifications();

      const currentSecurity = stateRef.current.securitySettings;
      const d = payload.data;

      const cleanBills: Bill[] = d.bills.map(
        ({ notificationId: _removed, ...rest }) => ({ ...rest })
      );
      const cleanFriendEntries: FriendEntry[] = d.friendEntries.map(
        ({ notificationId: _removed, ...rest }) => ({ ...rest })
      );
      const { notificationId: _removedSalaryNotif, ...cleanSalaryRest } =
        d.salaryConfig;
      const cleanSalary: SalaryConfig = { ...cleanSalaryRest };

      const nextState: PersistedWalletState = {
        balance: d.balance,
        transactions: [...d.transactions],
        bills: cleanBills,
        salaryConfig: cleanSalary,
        friends: [...d.friends],
        friendEntries: cleanFriendEntries,
        creditCardMembers: [...d.creditCardMembers],
        creditCardEntries: [...d.creditCardEntries],
        creditCardBankPayments: [...d.creditCardBankPayments],
        userProfile: { ...d.userProfile },
        securitySettings: { ...currentSecurity },
      };

      applyHydratedState(nextState);
      await StorageService.saveAllState(nextState);

      // Reschedule local notifications for imported unpaid bills, unsettled friend entries, and salary
      const billNotifs = new Map<string, string>();
      for (const b of cleanBills) {
        if (!b.isPaid) {
          const nId = await NotificationService.scheduleBillNotification(b);
          if (nId) billNotifs.set(b.id, nId);
        }
      }

      const entryNotifs = new Map<string, string>();
      for (const e of cleanFriendEntries) {
        if (!e.isSettled) {
          const nId =
            await NotificationService.scheduleFriendRecoveryNotification(e);
          if (nId) entryNotifs.set(e.id, nId);
        }
      }

      let salaryNotifId: string | undefined;
      if (cleanSalary.amount > 0) {
        salaryNotifId = await NotificationService.scheduleSalaryNotification(
          cleanSalary.amount,
          cleanSalary.dayOfMonth
        );
      }

      const latest = stateRef.current;
      const updates: Promise<void>[] = [];

      if (billNotifs.size > 0) {
        const updatedBills = latest.bills.map((b) =>
          billNotifs.has(b.id)
            ? { ...b, notificationId: billNotifs.get(b.id) }
            : b
        );
        stateRef.current = { ...stateRef.current, bills: updatedBills };
        setBills(updatedBills);
        updates.push(StorageService.saveBills(updatedBills));
      }

      if (entryNotifs.size > 0) {
        const updatedEntries = latest.friendEntries.map((e) =>
          entryNotifs.has(e.id)
            ? { ...e, notificationId: entryNotifs.get(e.id) }
            : e
        );
        stateRef.current = {
          ...stateRef.current,
          friendEntries: updatedEntries,
        };
        setFriendEntries(updatedEntries);
        updates.push(StorageService.saveFriendEntries(updatedEntries));
      }

      if (salaryNotifId) {
        const updatedSalary = {
          ...stateRef.current.salaryConfig,
          notificationId: salaryNotifId,
        };
        stateRef.current = {
          ...stateRef.current,
          salaryConfig: updatedSalary,
        };
        setSalaryConfig(updatedSalary);
        updates.push(StorageService.saveSalaryConfig(updatedSalary));
      }

      if (updates.length > 0) {
        await Promise.all(updates);
      }
    },
    [applyHydratedState]
  );

  // Update User Profile
  const updateUserProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      const latest = stateRef.current;
      const next: UserProfile = { ...latest.userProfile, ...updates };
      if (
        updates.name &&
        (!updates.avatarInitials || updates.avatarInitials.trim() === '')
      ) {
        const parts = updates.name.trim().split(/\s+/);
        const initials =
          parts.length > 1
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
        next.avatarInitials = initials;
      }
      stateRef.current = { ...latest, userProfile: next };
      setUserProfile(next);
      await StorageService.saveUserProfile(next);
    },
    []
  );

  // Update Security Settings
  const updateSecuritySettings = useCallback(
    async (updates: Partial<SecuritySettings>) => {
      const latest = stateRef.current;
      const next: SecuritySettings = {
        ...latest.securitySettings,
        ...updates,
      };
      stateRef.current = { ...latest, securitySettings: next };
      setSecuritySettings(next);
      await StorageService.saveSecuritySettings(next);
    },
    []
  );

  const unlockApp = useCallback(() => {
    setIsUnlocked(true);
  }, []);

  const lockApp = useCallback(() => {
    const sec = stateRef.current.securitySettings;
    if (sec.isPinEnabled || sec.biometricsEnabled) {
      setIsUnlocked(false);
    }
  }, []);

  // Compute Monthly Statistics (consistent with BalanceCard & Cashflow filter)
  const { monthlyIncome, monthlyExpenses } = useMemo(() => {
    const refDate = parseDate(dateTick);
    const currentMonth = refDate.getMonth();
    const currentYear = refDate.getFullYear();

    let inc = 0;
    let exp = 0;

    transactions.forEach((tx) => {
      const txDate = parseDate(tx.date);
      if (
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear
      ) {
        if (isInflowTransaction(tx)) {
          inc += tx.amount;
        } else {
          exp += tx.amount;
        }
      }
    });

    return { monthlyIncome: inc, monthlyExpenses: exp };
  }, [transactions, dateTick]);

  // Compute Safe to Spend after unpaid bills & daily budget until next payday
  const {
    unpaidBillsTotal,
    safeToSpend,
    daysUntilPayday,
    dailySafeBudget,
  } = useMemo(() => {
    const unpaid = bills
      .filter((b) => !b.isPaid)
      .reduce((sum, b) => sum + b.estimatedAmount, 0);
    const safe = balance - unpaid;

    if (salaryConfig.amount > 0) {
      const days = getDaysUntilSalary(
        salaryConfig.dayOfMonth,
        parseDate(dateTick)
      );
      const daily =
        safe > 0 ? Math.floor(safe / Math.max(1, days)) : 0;
      return {
        unpaidBillsTotal: unpaid,
        safeToSpend: safe,
        daysUntilPayday: days,
        dailySafeBudget: daily,
      };
    }

    return {
      unpaidBillsTotal: unpaid,
      safeToSpend: safe,
      daysUntilPayday: null,
      dailySafeBudget: null,
    };
  }, [balance, bills, salaryConfig, dateTick]);

  // Compute Friend Ledger summary
  const { totalOwedToMe, totalOwedByMe, netPendingWithFriends } =
    useMemo(() => {
      let owedToMe = 0;
      let owedByMe = 0;

      friendEntries.forEach((entry) => {
        if (!entry.isSettled && entry.remainingAmount > 0) {
          if (entry.type === 'lent') {
            owedToMe += entry.remainingAmount;
          } else {
            owedByMe += entry.remainingAmount;
          }
        }
      });

      return {
        totalOwedToMe: owedToMe,
        totalOwedByMe: owedByMe,
        netPendingWithFriends: owedToMe - owedByMe,
      };
    }, [friendEntries]);

  // Compute isolated Credit Card Ledger summary
  const {
    totalCardCharged,
    totalCardCollected,
    totalCardPaidToBank,
    cardDueToBank,
    cardNetOwedByPeople,
    cardCashHeldForBank,
  } = useMemo(() => {
    let charged = 0;
    let collected = 0;

    creditCardEntries.forEach((entry) => {
      if (entry.type === 'charge') {
        charged += entry.amount;
      } else {
        collected += entry.amount;
      }
    });

    const paidToBank = creditCardBankPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    return {
      totalCardCharged: charged,
      totalCardCollected: collected,
      totalCardPaidToBank: paidToBank,
      cardDueToBank: charged - paidToBank,
      cardNetOwedByPeople: charged - collected,
      cardCashHeldForBank: collected - paidToBank,
    };
  }, [creditCardEntries, creditCardBankPayments]);

  // Compute Action Required / Due Today items
  const dueActionItems = useMemo(() => {
    const items: DueActionItem[] = [];
    const today = parseDate(dateTick);
    const currentMonthYear = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, '0')}`;

    // 1. Unpaid bills due today or past
    bills.forEach((bill) => {
      if (!bill.isPaid && isDueTodayOrPast(bill.dueDate)) {
        items.push({
          id: `action-bill-${bill.id}`,
          type: 'bill',
          title: `Bill Due: ${bill.title}`,
          description: 'Add to Expenses & Deduct from Wallet?',
          amount: bill.estimatedAmount,
          date: bill.dueDate,
          referenceId: bill.id,
          isOverdue: getDaysDiffFromToday(bill.dueDate, today) < 0,
        });
      }
    });

    // 2. Salary Day due check (respects autoPrompt and short-month payday clamping)
    if (
      salaryConfig.autoPrompt !== false &&
      salaryConfig.amount > 0 &&
      today.getDate() >=
        getEffectivePayday(
          today.getFullYear(),
          today.getMonth(),
          salaryConfig.dayOfMonth
        ) &&
      salaryConfig.lastCreditedMonthYear !== currentMonthYear
    ) {
      items.push({
        id: `action-salary-${currentMonthYear}`,
        type: 'salary',
        title: 'Salary Day!',
        description: 'Credit scheduled salary to Central Wallet?',
        amount: salaryConfig.amount,
        date: toDateString(today),
        referenceId: 'salary-action',
      });
    }

    // 3. Friend recovery due today or past
    friendEntries.forEach((entry) => {
      if (!entry.isSettled && isDueTodayOrPast(entry.recoveryDate)) {
        const isLent = entry.type === 'lent';
        items.push({
          id: `action-friend-${entry.id}`,
          type: 'friend_recovery',
          title: isLent
            ? `Collect from ${entry.friendName}`
            : `Repay Debt: ${entry.friendName}`,
          description: isLent
            ? `Reminder to collect back Rs. ${entry.remainingAmount}`
            : `Reminder to repay Rs. ${entry.remainingAmount}`,
          amount: entry.remainingAmount,
          date: entry.recoveryDate,
          referenceId: entry.id,
          friendName: entry.friendName,
          isOverdue: getDaysDiffFromToday(entry.recoveryDate, today) < 0,
        });
      }
    });

    return items;
  }, [bills, friendEntries, salaryConfig, dateTick]);

  return (
    <WalletContext.Provider
      value={{
        balance,
        transactions,
        bills,
        salaryConfig,
        friends,
        friendEntries,
        creditCardMembers,
        creditCardEntries,
        creditCardBankPayments,
        isLoaded,
        monthlyIncome,
        monthlyExpenses,
        unpaidBillsTotal,
        safeToSpend,
        daysUntilPayday,
        dailySafeBudget,
        netPendingWithFriends,
        totalOwedToMe,
        totalOwedByMe,
        totalCardCharged,
        totalCardCollected,
        totalCardPaidToBank,
        cardDueToBank,
        cardNetOwedByPeople,
        cardCashHeldForBank,
        dueActionItems,
        userProfile,
        securitySettings,
        isUnlocked,
        unlockApp,
        lockApp,
        setSuppressAutoLock,
        isAutoLockSuppressed,
        refreshWallet,
        updateUserProfile,
        updateSecuritySettings,
        addIncome,
        addExpense,
        payBill,
        unpayBill,
        advanceBillCycle,
        addBill,
        editBill,
        deleteBill,
        receiveSalary,
        updateSalaryConfig,
        addFriendEntry,
        settleFriendEntry,
        settleAllFriendEntries,
        recordFriendRepayment,
        deleteFriendEntry,
        deleteFriend,
        addCreditCardEntry,
        deleteCreditCardEntry,
        deleteCreditCardMember,
        addCreditCardBankPayment,
        deleteCreditCardBankPayment,
        deleteTransaction,
        resetAllData,
        importBackupData,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

function getDaysDiffFromToday(dateStr: string, refNow: Date = new Date()): number {
  const target = parseDate(dateStr);
  const targetMidnight = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );
  const nowMidnight = new Date(
    refNow.getFullYear(),
    refNow.getMonth(),
    refNow.getDate()
  );
  const diffTime = targetMidnight.getTime() - nowMidnight.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
