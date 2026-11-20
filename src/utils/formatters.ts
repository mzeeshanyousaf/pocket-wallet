import type { WalletTransaction } from '../types';

export function formatRs(
  amount: number,
  options?: { showSign?: boolean; prefix?: string }
): string {
  const prefix = options?.prefix ?? 'Rs. ';
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const rounded = Math.round(safeAmount);
  const absAmount = Math.abs(rounded);
  const formattedNumber = absAmount
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (options?.showSign) {
    if (rounded > 0) {
      return `+${prefix}${formattedNumber}`;
    } else if (rounded < 0) {
      return `-${prefix}${formattedNumber}`;
    }
    return `${prefix}${formattedNumber}`;
  }

  if (rounded < 0) {
    return `-${prefix}${formattedNumber}`;
  }

  return `${prefix}${formattedNumber}`;
}

export function isInflowTransaction(tx: WalletTransaction): boolean {
  return (
    tx.type === 'income' ||
    tx.type === 'salary' ||
    tx.type === 'friend_borrowed' ||
    (tx.type === 'friend_settlement' && tx.settlementType === 'received_back')
  );
}

export function createUniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = Math.abs(Math.trunc(n)) % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getEffectivePayday(
  year: number,
  monthIndex: number,
  dayOfMonth: number
): number {
  return Math.min(Math.max(1, dayOfMonth), getDaysInMonth(year, monthIndex));
}

export function getDaysUntilSalary(
  dayOfMonth: number,
  now: Date = new Date()
): number {
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const thisMonthPayday = getEffectivePayday(
    now.getFullYear(),
    now.getMonth(),
    dayOfMonth
  );

  let targetDate: Date;
  if (thisMonthPayday >= now.getDate()) {
    targetDate = new Date(now.getFullYear(), now.getMonth(), thisMonthPayday);
  } else {
    let nextMonth = now.getMonth() + 1;
    let nextYear = now.getFullYear();
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    const nextMonthPayday = getEffectivePayday(
      nextYear,
      nextMonth,
      dayOfMonth
    );
    targetDate = new Date(nextYear, nextMonth, nextMonthPayday);
  }

  const diffTime = targetDate.getTime() - todayMidnight.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function toDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 12, 0, 0);
  }
  return new Date(dateStr);
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

export function formatTimeDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getDaysUntil(dateStr: string): {
  days: number;
  label: string;
  isPast: boolean;
  isToday: boolean;
} {
  const target = parseDate(dateStr);
  const now = new Date();

  // Normalize to midnight
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
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { days: 0, label: 'Due Today', isPast: false, isToday: true };
  } else if (diffDays === 1) {
    return { days: 1, label: 'Tomorrow', isPast: false, isToday: false };
  } else if (diffDays > 1) {
    return {
      days: diffDays,
      label: `${diffDays} days left`,
      isPast: false,
      isToday: false,
    };
  } else if (diffDays === -1) {
    return { days: -1, label: 'Overdue (1 day)', isPast: true, isToday: false };
  } else {
    return {
      days: diffDays,
      label: `Overdue (${Math.abs(diffDays)} days)`,
      isPast: true,
      isToday: false,
    };
  }
}

export function isDueTodayOrPast(dateStr: string): boolean {
  const { isPast, isToday } = getDaysUntil(dateStr);
  return isPast || isToday;
}

export function formatBillFrequency(
  frequency?: string,
  frequencyDays?: number
): string {
  switch (frequency) {
    case 'weekly':
      return 'Weekly';
    case 'custom_days':
      return `Every ${frequencyDays && frequencyDays > 0 ? frequencyDays : 6} days`;
    case 'quarterly':
      return 'Every 3 months';
    case 'yearly':
      return 'Yearly';
    case 'monthly':
    default:
      return 'Monthly';
  }
}

function addMonthsClamped(date: Date, monthsToAdd: number): Date {
  const totalMonths = date.getFullYear() * 12 + date.getMonth() + monthsToAdd;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = totalMonths % 12;
  const maxDay = getDaysInMonth(targetYear, targetMonth);
  const clampedDay = Math.min(date.getDate(), maxDay);
  return new Date(targetYear, targetMonth, clampedDay, 12, 0, 0);
}

export function calculateNextDueDate(
  currentDueDate: string,
  frequency?: string,
  frequencyDays = 6
): string {
  const date = parseDate(currentDueDate);
  if (isNaN(date.getTime())) return toDateString(new Date());

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      return toDateString(date);
    case 'custom_days':
      date.setDate(date.getDate() + (frequencyDays > 0 ? frequencyDays : 6));
      return toDateString(date);
    case 'quarterly':
      return toDateString(addMonthsClamped(date, 3));
    case 'yearly':
      return toDateString(addMonthsClamped(date, 12));
    case 'monthly':
    default:
      return toDateString(addMonthsClamped(date, 1));
  }
}

