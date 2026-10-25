import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Bill, FriendEntry } from '../types';
import { formatRs, parseDate } from '../utils/formatters';

let handlerInitialized = false;

function ensureNotificationHandler() {
  if (handlerInitialized || Platform.OS === 'web') return;
  try {
    if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      handlerInitialized = true;
    }
  } catch (e) {
    console.log('Notifications setup note:', e);
  }
}

export const NotificationService = {
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      ensureNotificationHandler();
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Pocket Wallet Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
        });
      }

      return true;
    } catch (e) {
      console.log('Error requesting notification permissions:', e);
      return false;
    }
  },

  /**
   * Schedule a local notification for 9:00 AM on a target date
   */
  async scheduleAtNineAM(
    targetDateStr: string,
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<string | undefined> {
    if (Platform.OS === 'web') return undefined;
    try {
      ensureNotificationHandler();
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return undefined;

      const date = parseDate(targetDateStr);
      // Set time to 9:00 AM
      const triggerDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        9,
        0,
        0
      );

      // If 9 AM today has already passed, schedule 1 minute from now for testing/demo
      const now = new Date();
      let finalTriggerDate = triggerDate;
      if (triggerDate.getTime() <= now.getTime()) {
        // If the date is strictly today and past 9am, or in the past, don't schedule in past
        const isToday =
          triggerDate.getFullYear() === now.getFullYear() &&
          triggerDate.getMonth() === now.getMonth() &&
          triggerDate.getDate() === now.getDate();
        if (isToday) {
          finalTriggerDate = new Date(now.getTime() + 60 * 1000); // 1 minute from now
        } else {
          return undefined; // Already past date
        }
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: finalTriggerDate,
        },
      });

      return id;
    } catch (e) {
      console.log('Failed to schedule notification:', e);
      return undefined;
    }
  },

  async scheduleBillNotification(bill: Bill): Promise<string | undefined> {
    if (bill.isPaid) return undefined;
    const amountStr = formatRs(bill.estimatedAmount);
    return await this.scheduleAtNineAM(
      bill.dueDate,
      `⏰ Bill Due Today: ${bill.title}`,
      `Your bill of ${amountStr} for ${bill.title} is due today. Open Pocket Wallet to confirm and pay.`,
      { type: 'bill', id: bill.id }
    );
  },

  async scheduleSalaryNotification(
    salaryAmount: number,
    dayOfMonth: number
  ): Promise<string | undefined> {
    const today = new Date();
    // Determine the next target date for this dayOfMonth
    let targetYear = today.getFullYear();
    let targetMonth = today.getMonth();

    if (today.getDate() > dayOfMonth) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }

    const targetDate = new Date(targetYear, targetMonth, dayOfMonth);
    const amountStr = formatRs(salaryAmount);

    return await this.scheduleAtNineAM(
      targetDate.toISOString(),
      '🎉 Salary Day!',
      `Scheduled Salary of ${amountStr} is ready. Tap to credit your Central Wallet.`,
      { type: 'salary', amount: salaryAmount }
    );
  },

  async scheduleFriendRecoveryNotification(
    entry: FriendEntry
  ): Promise<string | undefined> {
    if (entry.isSettled) return undefined;
    const amountStr = formatRs(entry.remainingAmount);

    const title =
      entry.type === 'lent'
        ? `🤝 Payment Reminder: ${entry.friendName}`
        : `🤝 Repayment Due: ${entry.friendName}`;

    const body =
      entry.type === 'lent'
        ? `Reminder to collect ${amountStr} back from ${entry.friendName} today.`
        : `Reminder to repay ${amountStr} to ${entry.friendName} today.`;

    return await this.scheduleAtNineAM(entry.recoveryDate, title, body, {
      type: 'friend_recovery',
      id: entry.id,
      friendId: entry.friendId,
    });
  },

  async cancelNotification(notificationId?: string): Promise<void> {
    if (!notificationId || Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (e) {
      console.log('Error canceling notification:', e);
    }
  },

  async cancelAllNotifications(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.log('Error canceling all notifications:', e);
    }
  },
};
