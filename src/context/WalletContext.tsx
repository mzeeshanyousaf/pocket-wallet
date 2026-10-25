import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { NotificationService } from '../services/notifications';
import { StorageService } from '../services/storage';
import {
  Bill,
  BillCategory,
  BillFrequency,
  DueActionItem,
  Friend,
  FriendEntry,
  FriendRepayment,
  SalaryConfig,
  SecuritySettings,
  UserProfile,
  WalletState,
  WalletTransaction,
} from '../types';
import {
  calculateNextDueDate,
  isDueTodayOrPast,
  parseDate,
  toDateString,
} from '../utils/formatters';

interface WalletContextType extends WalletState {
  // Statistics
  monthlyIncome: number;
  monthlyExpenses: number;
  netPendingWithFriends: number;
  totalOwedToMe: number;
  totalOwedByMe: number;
  dueActionItems: DueActionItem[];

  // Actions
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
  deleteTransaction: (id: string) => Promise<void>;
  resetAllData: () => Promise<void>;
  deleteFriend: (friendId: string) => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => Promise<void>;
  isUnlocked: boolean;
  unlockApp: () => void;
  lockApp: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig>({
    amount: 0,
    dayOfMonth: 1,
    autoPrompt: true,
  });
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendEntries, setFriendEntries] = useState<FriendEntry[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '',
    avatarInitials: 'JD',
    currency: 'PKR (Rs.)',
    joinedDate: new Date().toISOString(),
  });
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    pin: null,
    isPinEnabled: false,
    biometricsEnabled: false,
  });
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Initialize and load persisted data
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const data = await StorageService.loadWalletState();
      if (isMounted) {
        setBalance(data.balance);
        setTransactions(data.transactions);
        setBills(data.bills);
        setSalaryConfig(data.salaryConfig);
        setFriends(data.friends);
        setFriendEntries(data.friendEntries);
        setUserProfile(data.userProfile);
        setSecuritySettings(data.securitySettings);
        // If PIN is not enabled or not set, automatically unlock
        if (!data.securitySettings.isPinEnabled || !data.securitySettings.pin) {
          setIsUnlocked(true);
        } else {
          setIsUnlocked(false);
        }
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
  }, []);

  // Quick Income
  const addIncome = useCallback(
    async (description: string, amount: number, category = 'General') => {
      const cleanAmount = Math.abs(amount);
      if (cleanAmount <= 0) return;

      const newTx: WalletTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        amount: cleanAmount,
        type: 'income',
        description: description.trim() || 'Income Added',
        category,
        date: new Date().toISOString(),
      };

      const newBalance = balance + cleanAmount;
      const newTransactions = [newTx, ...transactions];

      setBalance(newBalance);
      setTransactions(newTransactions);

      await Promise.all([
        StorageService.saveBalance(newBalance),
        StorageService.saveTransactions(newTransactions),
      ]);
    },
    [balance, transactions]
  );

  // Quick Expense
  const addExpense = useCallback(
    async (description: string, amount: number, category = 'General') => {
      const cleanAmount = Math.abs(amount);
      if (cleanAmount <= 0) return;

      const newTx: WalletTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        amount: cleanAmount,
        type: 'expense',
        description: description.trim() || 'Expense',
        category,
        date: new Date().toISOString(),
      };

      const newBalance = balance - cleanAmount;
      const newTransactions = [newTx, ...transactions];

      setBalance(newBalance);
      setTransactions(newTransactions);

      await Promise.all([
        StorageService.saveBalance(newBalance),
        StorageService.saveTransactions(newTransactions),
      ]);
    },
    [balance, transactions]
  );

  // Pay Bill
  const payBill = useCallback(
    async (billId: string, paidAmount?: number) => {
      const targetBill = bills.find((b) => b.id === billId);
      if (!targetBill) return;

      const amountToDeduct = Math.abs(paidAmount ?? targetBill.estimatedAmount);
      const newBalance = balance - amountToDeduct;

      const newTx: WalletTransaction = {
        id: `tx-bill-${Date.now()}`,
        amount: amountToDeduct,
        type: 'bill_payment',
        description: `Bill Paid: ${targetBill.title}`,
        category: targetBill.category,
        relatedBillId: billId,
        date: new Date().toISOString(),
      };

      const newBills = bills.map((b) => {
        if (b.id === billId) {
          return {
            ...b,
            isPaid: true,
            lastPaidDate: new Date().toISOString(),
            lastPaidAmount: amountToDeduct,
          };
        }
        return b;
      });

      const newTransactions = [newTx, ...transactions];

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
    },
    [balance, bills, transactions]
  );

  // Unpay / Reopen Bill — reverses the balance deduction and removes linked bill_payment tx
  const unpayBill = useCallback(
    async (billId: string) => {
      const targetBill = bills.find((b) => b.id === billId);
      if (!targetBill || !targetBill.isPaid) return;

      // Find the most recent bill_payment transaction for this bill to reverse
      const relatedTx = [...transactions]
        .reverse()
        .find(
          (t) =>
            t.type === 'bill_payment' &&
            (t.relatedBillId === billId || t.description?.includes(targetBill.title))
        );

      let newBalance = balance;
      let updatedTransactions = transactions;

      if (relatedTx) {
        // Refund the amount that was deducted
        newBalance = balance + relatedTx.amount;
        updatedTransactions = transactions.filter((t) => t.id !== relatedTx.id);
      }

      const newBills = bills.map((b) => {
        if (b.id === billId) {
          return {
            ...b,
            isPaid: false,
            lastPaidDate: undefined,
            lastPaidAmount: undefined,
          };
        }
        return b;
      });

      setBalance(newBalance);
      setTransactions(updatedTransactions);
      setBills(newBills);

      await Promise.all([
        StorageService.saveBalance(newBalance),
        StorageService.saveTransactions(updatedTransactions),
        StorageService.saveBills(newBills),
      ]);
    },
    [balance, bills, transactions]
  );

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
      const newBill: Bill = {
        id: `bill-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: title.trim(),
        category,
        estimatedAmount: Math.abs(estimatedAmount),
        dueDate,
        frequency,
        frequencyDays: frequency === 'custom_days' ? frequencyDays : undefined,
        isPaid: false,
        createdAt: new Date().toISOString(),
      };

      const notifId = await NotificationService.scheduleBillNotification(newBill);
      if (notifId) {
        newBill.notificationId = notifId;
      }

      const newBills = [newBill, ...bills];
      setBills(newBills);
      await StorageService.saveBills(newBills);
    },
    [bills]
  );

  // Advance Recurring Bill to Next Cycle
  // If the bill was paid, first reverses the balance/transaction (unpay), then advances.
  const advanceBillCycle = useCallback(
    async (billId: string) => {
      const target = bills.find((b) => b.id === billId);
      if (!target) return;

      const nextDue = calculateNextDueDate(
        target.dueDate,
        target.frequency,
        target.frequencyDays
      );

      // If the bill is currently paid, reverse its payment transaction first
      let newBalance = balance;
      let updatedTransactions = transactions;
      if (target.isPaid) {
        const relatedTx = [...transactions]
          .reverse()
          .find(
            (t) =>
              t.type === 'bill_payment' &&
              (t.relatedBillId === billId || t.description?.includes(target.title))
          );
        if (relatedTx) {
          newBalance = balance + relatedTx.amount;
          updatedTransactions = transactions.filter((t) => t.id !== relatedTx.id);
        }
      }

      const updatedBills = await Promise.all(
        bills.map(async (b) => {
          if (b.id === billId) {
            if (b.notificationId) {
              await NotificationService.cancelNotification(b.notificationId);
            }
            const updated: Bill = {
              ...b,
              dueDate: nextDue,
              isPaid: false,
              lastPaidDate: undefined,
              lastPaidAmount: undefined,
            };
            const notifId = await NotificationService.scheduleBillNotification(updated);
            updated.notificationId = notifId ?? undefined;
            return updated;
          }
          return b;
        })
      );

      setBalance(newBalance);
      setTransactions(updatedTransactions);
      setBills(updatedBills);

      await Promise.all([
        StorageService.saveBalance(newBalance),
        StorageService.saveTransactions(updatedTransactions),
        StorageService.saveBills(updatedBills),
      ]);
    },
    [balance, bills, transactions]
  );

  // Edit Bill — re-schedules notification if dueDate, title, or estimatedAmount changed
  const editBill = useCallback(
    async (billId: string, updates: Partial<Bill>) => {
      const updatedBills = await Promise.all(
        bills.map(async (b) => {
          if (b.id === billId) {
            const updated = { ...b, ...updates };
            const shouldReschedule =
              (updates.dueDate && updates.dueDate !== b.dueDate) ||
              (updates.title && updates.title !== b.title) ||
              (updates.estimatedAmount !== undefined &&
                updates.estimatedAmount !== b.estimatedAmount);

            if (shouldReschedule) {
              if (b.notificationId) {
                await NotificationService.cancelNotification(b.notificationId);
              }
              const notifId =
                await NotificationService.scheduleBillNotification(updated);
              updated.notificationId = notifId;
            }
            return updated;
          }
          return b;
        })
      );

      setBills(updatedBills);
      await StorageService.saveBills(updatedBills);
    },
    [bills]
  );

  // Delete Bill
  const deleteBill = useCallback(
    async (billId: string) => {
      const target = bills.find((b) => b.id === billId);
      if (target?.notificationId) {
        await NotificationService.cancelNotification(target.notificationId);
      }
      const newBills = bills.filter((b) => b.id !== billId);
      setBills(newBills);
      await StorageService.saveBills(newBills);
    },
    [bills]
  );

  // Receive Salary — guards against double-credit in same month, then re-schedules next notification
  const receiveSalary = useCallback(
    async (customAmount?: number) => {
      const amountToAdd = Math.abs(customAmount ?? salaryConfig.amount);
      if (amountToAdd <= 0) return;

      const now = new Date();
      const monthYearStr = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}`;

      // Guard: do not allow double-credit in the same calendar month
      if (salaryConfig.lastCreditedMonthYear === monthYearStr) return;

      const newTx: WalletTransaction = {
        id: `tx-salary-${Date.now()}`,
        amount: amountToAdd,
        type: 'salary',
        description: `Monthly Salary Credited (${monthYearStr})`,
        category: 'Salary',
        date: now.toISOString(),
      };

      const newBalance = balance + amountToAdd;
      const newTransactions = [newTx, ...transactions];

      // Cancel current salary notification and schedule next month's
      if (salaryConfig.notificationId) {
        await NotificationService.cancelNotification(salaryConfig.notificationId);
      }
      const nextNotifId = await NotificationService.scheduleSalaryNotification(
        salaryConfig.amount,
        salaryConfig.dayOfMonth,
        true
      );

      const updatedSalaryConfig: SalaryConfig = {
        ...salaryConfig,
        lastCreditedMonthYear: monthYearStr,
        notificationId: nextNotifId ?? undefined,
      };

      setBalance(newBalance);
      setTransactions(newTransactions);
      setSalaryConfig(updatedSalaryConfig);

      await Promise.all([
        StorageService.saveBalance(newBalance),
        StorageService.saveTransactions(newTransactions),
        StorageService.saveSalaryConfig(updatedSalaryConfig),
      ]);
    },
    [balance, salaryConfig, transactions]
  );

  // Update Salary Configuration
  const updateSalaryConfig = useCallback(
    async (newConfig: SalaryConfig) => {
      if (salaryConfig.notificationId) {
        await NotificationService.cancelNotification(salaryConfig.notificationId);
      }
      const notifId = await NotificationService.scheduleSalaryNotification(
        newConfig.amount,
        newConfig.dayOfMonth
      );
      const finalized = { ...newConfig, notificationId: notifId };

      setSalaryConfig(finalized);
      await StorageService.saveSalaryConfig(finalized);
    },
    [salaryConfig]
  );

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

      // 1. Check or auto-create friend
      let targetFriend = friends.find(
        (f) => f.name.toLowerCase() === cleanName.toLowerCase()
      );
      let updatedFriends = [...friends];

      if (!targetFriend) {
        targetFriend = {
          id: `friend-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: cleanName,
          totalLent: 0,
          totalBorrowed: 0,
          netBalance: 0,
          createdAt: new Date().toISOString(),
        };
        updatedFriends.push(targetFriend);
      }

      // 2. Wallet Balance & Friend Net calculations
      // Gave / Lent: I gave money out of my wallet -> wallet deducts! Friend owes me.
      // Took / Borrowed: I took money into my wallet -> wallet adds! I owe friend.
      let newBalance = balance;
      let txType: 'friend_lent' | 'friend_borrowed';
      let txDesc = '';

      if (type === 'lent') {
        newBalance = balance - cleanAmount;
        txType = 'friend_lent';
        txDesc = `Gave / Lent to ${targetFriend.name}: ${
          description.trim() || 'Money Lent'
        }`;
        targetFriend.totalLent += cleanAmount;
        targetFriend.netBalance += cleanAmount; // Positive = friend owes me
      } else {
        newBalance = balance + cleanAmount;
        txType = 'friend_borrowed';
        txDesc = `Took / Borrowed from ${targetFriend.name}: ${
          description.trim() || 'Borrowed'
        }`;
        targetFriend.totalBorrowed += cleanAmount;
        targetFriend.netBalance -= cleanAmount; // Negative = I owe friend
      }

      // Update friend in array
      updatedFriends = updatedFriends.map((f) =>
        f.id === targetFriend!.id ? targetFriend! : f
      );

      // 3. Create Friend Entry
      const newEntry: FriendEntry = {
        id: `f-entry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        friendId: targetFriend.id,
        friendName: targetFriend.name,
        amount: cleanAmount,
        remainingAmount: cleanAmount,
        type,
        description: description.trim(),
        date: new Date().toISOString(),
        recoveryDate,
        isSettled: false,
        repayments: [],
      };

      const notifId =
        await NotificationService.scheduleFriendRecoveryNotification(newEntry);
      if (notifId) {
        newEntry.notificationId = notifId;
      }

      // 4. Create Wallet Transaction
      const newTx: WalletTransaction = {
        id: `tx-f-${Date.now()}`,
        amount: cleanAmount,
        type: txType,
        description: txDesc,
        category: 'Friends Ledger',
        date: new Date().toISOString(),
        relatedFriendId: targetFriend.id,
        relatedFriendName: targetFriend.name,
        relatedFriendEntryId: newEntry.id,
      };

      const updatedEntries = [newEntry, ...friendEntries];
      const updatedTransactions = [newTx, ...transactions];

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
    [balance, friendEntries, friends, transactions]
  );

  // Settle Friend Entry (Partial or Full)
  // Recalculates friend's totalLent, totalBorrowed, netBalance from ground truth after settlement.
  const settleFriendEntry = useCallback(
    async (
      entryId: string,
      settleAmount: number,
      isFull: boolean,
      note = ''
    ) => {
      const entry = friendEntries.find((e) => e.id === entryId);
      if (!entry || entry.isSettled) return;

      const cleanAmount = isFull
        ? entry.remainingAmount
        : Math.min(Math.abs(settleAmount), entry.remainingAmount);

      if (cleanAmount <= 0) return;

      const remainingAfter = Math.max(0, entry.remainingAmount - cleanAmount);
      const isNowSettled = isFull || remainingAfter === 0;

      const repayment: FriendRepayment = {
        id: `repay-${Date.now()}`,
        amount: cleanAmount,
        date: new Date().toISOString(),
        type: isNowSettled ? 'full' : 'partial',
        note: note.trim() || undefined,
      };

      let newBalance = balance;
      let txDesc = '';
      let settlementType: 'received_back' | 'repaid';

      if (entry.type === 'lent') {
        // Friend was owing me money -> friend pays me back -> cash enters my wallet!
        newBalance = balance + cleanAmount;
        settlementType = 'received_back';
        txDesc = isNowSettled
          ? `Settled in full by ${entry.friendName} (+${cleanAmount})`
          : `Partial payment from ${entry.friendName} (+${cleanAmount})`;
      } else {
        // I was owing friend money -> I pay friend back -> cash leaves my wallet!
        newBalance = balance - cleanAmount;
        settlementType = 'repaid';
        txDesc = isNowSettled
          ? `Repaid debt in full to ${entry.friendName} (-${cleanAmount})`
          : `Partial debt repayment to ${entry.friendName} (-${cleanAmount})`;
      }

      // Update entry
      const updatedEntries = friendEntries.map((e) => {
        if (e.id === entryId) {
          return {
            ...e,
            remainingAmount: remainingAfter,
            isSettled: isNowSettled,
            settledDate: isNowSettled ? new Date().toISOString() : undefined,
            repayments: [repayment, ...e.repayments],
          };
        }
        return e;
      });

      // Recompute friend totals from ground truth (same pattern as deleteFriendEntry)
      const updatedFriends = friends.map((f) => {
        if (f.id === entry.friendId) {
          const fEntries = updatedEntries.filter((e) => e.friendId === f.id);
          const totalLent = fEntries
            .filter((e) => e.type === 'lent')
            .reduce((sum, e) => sum + e.amount, 0);
          const totalBorrowed = fEntries
            .filter((e) => e.type === 'borrowed')
            .reduce((sum, e) => sum + e.amount, 0);
          const netBalance = fEntries.reduce((acc, e) => {
            if (e.isSettled) return acc;
            return e.type === 'lent' ? acc + e.remainingAmount : acc - e.remainingAmount;
          }, 0);
          return { ...f, totalLent, totalBorrowed, netBalance };
        }
        return f;
      });

      // Create transaction
      const newTx: WalletTransaction = {
        id: `tx-settle-${Date.now()}`,
        amount: cleanAmount,
        type: 'friend_settlement',
        description: txDesc,
        category: 'Debt Settlement',
        date: new Date().toISOString(),
        relatedFriendId: entry.friendId,
        relatedFriendName: entry.friendName,
        relatedFriendEntryId: entry.id,
        relatedRepaymentId: repayment.id,
        settlementType,
      };

      const updatedTransactions = [newTx, ...transactions];

      if (isNowSettled && entry.notificationId) {
        await NotificationService.cancelNotification(entry.notificationId);
      }

      setBalance(newBalance);
      setFriendEntries(updatedEntries);
      setFriends(updatedFriends);
      setTransactions(updatedTransactions);

      await Promise.all([
        StorageService.saveBalance(newBalance),
        StorageService.saveFriendEntries(updatedEntries),
        StorageService.saveFriends(updatedFriends),
        StorageService.saveTransactions(updatedTransactions),
      ]);
    },
    [balance, friendEntries, friends, transactions]
  );

  // Delete Friend Entry (Rolls back wallet balance & linked transaction)
  // Uses strict relatedFriendEntryId lookup to avoid reversing the wrong transaction.
  const deleteFriendEntry = useCallback(
    async (entryId: string) => {
      const targetEntry = friendEntries.find((e) => e.id === entryId);
      if (!targetEntry) return;

      if (targetEntry.notificationId) {
        await NotificationService.cancelNotification(targetEntry.notificationId);
      }

      // Strict lookup by entry ID first; only fall back to loose match if no direct link exists
      const relatedTx =
        transactions.find((t) => t.relatedFriendEntryId === entryId) ??
        transactions.find(
          (t) =>
            t.relatedFriendId === targetEntry.friendId &&
            t.amount === targetEntry.amount &&
            t.type === (targetEntry.type === 'lent' ? 'friend_lent' : 'friend_borrowed') &&
            !transactions.some(
              (other) => other.relatedFriendEntryId === t.relatedFriendEntryId && other.id !== t.id
            )
        );

      let newBalance = balance;
      let updatedTransactions = transactions;

      if (relatedTx) {
        if (relatedTx.type === 'friend_borrowed') {
          // Borrowed added to wallet, so delete removes it
          newBalance = balance - relatedTx.amount;
        } else if (relatedTx.type === 'friend_lent') {
          // Lent deducted from wallet, so delete refunds it
          newBalance = balance + relatedTx.amount;
        }
        updatedTransactions = transactions.filter((t) => t.id !== relatedTx.id);
      }

      const updatedEntries = friendEntries.filter((e) => e.id !== entryId);
      const friendId = targetEntry.friendId;

      // Recalculate friend's totals from ground truth remaining entries
      const updatedFriends = friends.map((f) => {
        if (f.id === friendId) {
          const fEntries = updatedEntries.filter((e) => e.friendId === f.id);
          const totalLent = fEntries
            .filter((e) => e.type === 'lent')
            .reduce((sum, e) => sum + e.amount, 0);
          const totalBorrowed = fEntries
            .filter((e) => e.type === 'borrowed')
            .reduce((sum, e) => sum + e.amount, 0);
          const netBalance = fEntries.reduce((acc, e) => {
            if (e.isSettled) return acc;
            return e.type === 'lent' ? acc + e.remainingAmount : acc - e.remainingAmount;
          }, 0);
          return {
            ...f,
            totalLent,
            totalBorrowed,
            netBalance,
          };
        }
        return f;
      });

      setBalance(newBalance);
      setTransactions(updatedTransactions);
      setFriendEntries(updatedEntries);
      setFriends(updatedFriends);

      await Promise.all([
        StorageService.saveBalance(newBalance),
        StorageService.saveTransactions(updatedTransactions),
        StorageService.saveFriendEntries(updatedEntries),
        StorageService.saveFriends(updatedFriends),
      ]);
    },
    [balance, friendEntries, friends, transactions]
  );

  // Delete transaction with wallet balance rollback & bidirectional Friends/Bills sync
  const deleteTransaction = useCallback(
    async (id: string) => {
      const tx = transactions.find((t) => t.id === id);
      if (!tx) return;

      let balanceAdjustment = 0;
      switch (tx.type) {
        case 'income':
        case 'salary':
        case 'friend_borrowed':
          // Added money originally -> remove it now
          balanceAdjustment = -tx.amount;
          break;
        case 'expense':
        case 'bill_payment':
        case 'friend_lent':
          // Deducted money originally -> refund it now
          balanceAdjustment = tx.amount;
          break;
        case 'friend_settlement':
          if (tx.settlementType === 'received_back') {
            balanceAdjustment = -tx.amount;
          } else {
            balanceAdjustment = tx.amount;
          }
          break;
      }

      const newBalance = balance + balanceAdjustment;
      const updatedTransactions = transactions.filter((t) => t.id !== id);

      let updatedFriendEntries = [...friendEntries];
      let updatedFriends = [...friends];
      let updatedBills = [...bills];

      // 1. Sync Friends Ledger: if transaction was a friend loan/borrow
      if (tx.type === 'friend_lent' || tx.type === 'friend_borrowed') {
        const targetEntry = updatedFriendEntries.find(
          (e) =>
            e.id === tx.relatedFriendEntryId ||
            (tx.relatedFriendId &&
              e.friendId === tx.relatedFriendId &&
              e.amount === tx.amount &&
              e.type === (tx.type === 'friend_lent' ? 'lent' : 'borrowed'))
        );

        if (targetEntry) {
          if (targetEntry.notificationId) {
            await NotificationService.cancelNotification(targetEntry.notificationId);
          }
          updatedFriendEntries = updatedFriendEntries.filter((e) => e.id !== targetEntry.id);
          const friendId = targetEntry.friendId;

          // Recompute friend stats from remaining entries
          updatedFriends = updatedFriends.map((f) => {
            if (f.id === friendId) {
              const fEntries = updatedFriendEntries.filter((e) => e.friendId === f.id);
              const totalLent = fEntries
                .filter((e) => e.type === 'lent')
                .reduce((sum, e) => sum + e.amount, 0);
              const totalBorrowed = fEntries
                .filter((e) => e.type === 'borrowed')
                .reduce((sum, e) => sum + e.amount, 0);
              const netBalance = fEntries.reduce((acc, e) => {
                if (e.isSettled) return acc;
                return e.type === 'lent' ? acc + e.remainingAmount : acc - e.remainingAmount;
              }, 0);
              return {
                ...f,
                totalLent,
                totalBorrowed,
                netBalance,
              };
            }
            return f;
          });
        }
      } else if (tx.type === 'friend_settlement') {
        // Reverse repayment in entry
        const targetEntry = updatedFriendEntries.find(
          (e) =>
            e.id === tx.relatedFriendEntryId ||
            (tx.relatedFriendId && e.friendId === tx.relatedFriendId)
        );

        if (targetEntry) {
          const updatedRepayments = tx.relatedRepaymentId
            ? targetEntry.repayments.filter((r) => r.id !== tx.relatedRepaymentId)
            : targetEntry.repayments.slice(1);

          const remainingAmount = targetEntry.remainingAmount + tx.amount;
          updatedFriendEntries = updatedFriendEntries.map((e) => {
            if (e.id === targetEntry.id) {
              return {
                ...e,
                remainingAmount,
                isSettled: false,
                settledDate: undefined,
                repayments: updatedRepayments,
              };
            }
            return e;
          });

          const friendId = targetEntry.friendId;
          updatedFriends = updatedFriends.map((f) => {
            if (f.id === friendId) {
              const fEntries = updatedFriendEntries.filter((e) => e.friendId === f.id);
              const totalLent = fEntries
                .filter((e) => e.type === 'lent')
                .reduce((sum, e) => sum + e.amount, 0);
              const totalBorrowed = fEntries
                .filter((e) => e.type === 'borrowed')
                .reduce((sum, e) => sum + e.amount, 0);
              const netBalance = fEntries.reduce((acc, e) => {
                if (e.isSettled) return acc;
                return e.type === 'lent' ? acc + e.remainingAmount : acc - e.remainingAmount;
              }, 0);
              return {
                ...f,
                totalLent,
                totalBorrowed,
                netBalance,
              };
            }
            return f;
          });
        }
      }

      // 2. Sync Bills: if transaction was a bill payment
      if (tx.type === 'bill_payment' || tx.relatedBillId) {
        const targetBill = updatedBills.find(
          (b) => b.id === tx.relatedBillId || (tx.description && tx.description.includes(b.title))
        );
        if (targetBill) {
          updatedBills = updatedBills.map((b) => {
            if (b.id === targetBill.id) {
              return {
                ...b,
                isPaid: false,
                lastPaidDate: undefined,
                lastPaidAmount: undefined,
              };
            }
            return b;
          });
        }
      }

      setBalance(newBalance);
      setTransactions(updatedTransactions);
      setFriendEntries(updatedFriendEntries);
      setFriends(updatedFriends);
      setBills(updatedBills);

      await Promise.all([
        StorageService.saveBalance(newBalance),
        StorageService.saveTransactions(updatedTransactions),
        StorageService.saveFriendEntries(updatedFriendEntries),
        StorageService.saveFriends(updatedFriends),
        StorageService.saveBills(updatedBills),
      ]);
    },
    [balance, transactions, friendEntries, friends, bills]
  );

  // Reset all to clean defaults — also cancels all notifications and re-locks the app
  const resetAllData = useCallback(async () => {
    // Cancel every scheduled notification before wiping data
    await NotificationService.cancelAllNotifications();

    const data = await StorageService.resetToDefaults();
    setBalance(data.balance);
    setTransactions(data.transactions);
    setBills(data.bills);
    setSalaryConfig(data.salaryConfig);
    setFriends(data.friends);
    setFriendEntries(data.friendEntries);
    setUserProfile(data.userProfile);
    setSecuritySettings(data.securitySettings);
    // Re-lock the app since PIN/biometrics have been cleared
    setIsUnlocked(true); // No lock is set after reset, so keep it accessible
  }, []);

  // Delete a friend record and all associated entries, with full balance rollback
  const deleteFriend = useCallback(
    async (friendId: string) => {
      const friendToDelete = friends.find((f) => f.id === friendId);
      if (!friendToDelete) return;

      // Cancel all notifications for this friend's entries
      const friendEntriesForFriend = friendEntries.filter((e) => e.friendId === friendId);
      await Promise.all(
        friendEntriesForFriend
          .filter((e) => e.notificationId)
          .map((e) => NotificationService.cancelNotification(e.notificationId))
      );

      // Reverse all unsettled balance impacts
      let balanceAdjustment = 0;
      friendEntriesForFriend.forEach((e) => {
        if (!e.isSettled) {
          // lent = money left wallet (refund), borrowed = money entered wallet (remove)
          balanceAdjustment += e.type === 'lent' ? e.remainingAmount : -e.remainingAmount;
        }
      });

      // Remove all linked transactions
      const entryIds = new Set(friendEntriesForFriend.map((e) => e.id));
      const updatedTransactions = transactions.filter(
        (t) => t.relatedFriendId !== friendId || !entryIds.has(t.relatedFriendEntryId ?? '')
      );
      // Remove friend_lent / friend_borrowed for these entries
      const strictUpdatedTransactions = updatedTransactions.filter(
        (t) => !(t.relatedFriendId === friendId && (t.type === 'friend_lent' || t.type === 'friend_borrowed' || t.type === 'friend_settlement'))
      );

      const newBalance = balance + balanceAdjustment;
      const updatedEntries = friendEntries.filter((e) => e.friendId !== friendId);
      const updatedFriends = friends.filter((f) => f.id !== friendId);

      setBalance(newBalance);
      setTransactions(strictUpdatedTransactions);
      setFriendEntries(updatedEntries);
      setFriends(updatedFriends);

      await Promise.all([
        StorageService.saveBalance(newBalance),
        StorageService.saveTransactions(strictUpdatedTransactions),
        StorageService.saveFriendEntries(updatedEntries),
        StorageService.saveFriends(updatedFriends),
      ]);
    },
    [balance, friendEntries, friends, transactions]
  );

  // Update User Profile
  const updateUserProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      setUserProfile((prev) => {
        const next = { ...prev, ...updates };
        if (updates.name && (!updates.avatarInitials || updates.avatarInitials.trim() === '')) {
          const parts = updates.name.trim().split(/\s+/);
          const initials = parts.length > 1
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
          next.avatarInitials = initials;
        }
        StorageService.saveUserProfile(next);
        return next;
      });
    },
    []
  );

  // Update Security Settings
  const updateSecuritySettings = useCallback(
    async (updates: Partial<SecuritySettings>) => {
      setSecuritySettings((prev) => {
        const next = { ...prev, ...updates };
        StorageService.saveSecuritySettings(next);
        return next;
      });
    },
    []
  );

  const unlockApp = useCallback(() => {
    setIsUnlocked(true);
  }, []);

  const lockApp = useCallback(() => {
    if (securitySettings.isPinEnabled && securitySettings.pin) {
      setIsUnlocked(false);
    }
  }, [securitySettings]);

  // Compute Monthly Statistics
  const { monthlyIncome, monthlyExpenses } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let inc = 0;
    let exp = 0;

    transactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      if (
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear
      ) {
        if (
          tx.type === 'income' ||
          tx.type === 'salary' ||
          (tx.type === 'friend_settlement' &&
            tx.settlementType === 'received_back')
        ) {
          inc += tx.amount;
        } else if (
          tx.type === 'expense' ||
          tx.type === 'bill_payment' ||
          (tx.type === 'friend_settlement' && tx.settlementType === 'repaid')
        ) {
          exp += tx.amount;
        }
      }
    });

    return { monthlyIncome: inc, monthlyExpenses: exp };
  }, [transactions]);

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

  // Compute Action Required / Due Today items
  const dueActionItems = useMemo(() => {
    const items: DueActionItem[] = [];
    const today = new Date();
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
          description: `Add to Expenses & Deduct from Wallet?`,
          amount: bill.estimatedAmount,
          date: bill.dueDate,
          referenceId: bill.id,
          isOverdue: getDaysDiffFromToday(bill.dueDate) < 0,
        });
      }
    });

    // 2. Salary Day due check (if today's day >= payday and not credited this month yet)
    if (
      salaryConfig.amount > 0 &&
      today.getDate() >= salaryConfig.dayOfMonth &&
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
          isOverdue: getDaysDiffFromToday(entry.recoveryDate) < 0,
        });
      }
    });

    return items;
  }, [bills, friendEntries, salaryConfig]);

  return (
    <WalletContext.Provider
      value={{
        balance,
        transactions,
        bills,
        salaryConfig,
        friends,
        friendEntries,
        isLoaded,
        monthlyIncome,
        monthlyExpenses,
        netPendingWithFriends,
        totalOwedToMe,
        totalOwedByMe,
        dueActionItems,
        userProfile,
        securitySettings,
        isUnlocked,
        unlockApp,
        lockApp,
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
        deleteFriendEntry,
        deleteFriend,
        deleteTransaction,
        resetAllData,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

function getDaysDiffFromToday(dateStr: string): number {
  const target = parseDate(dateStr);
  const now = new Date();
  const targetMidnight = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );
  const nowMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
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
