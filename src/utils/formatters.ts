export function formatRs(
  amount: number,
  options?: { showSign?: boolean; prefix?: string }
): string {
  const prefix = options?.prefix ?? 'Rs. ';
  const absAmount = Math.abs(Math.round(amount || 0));
  const formattedNumber = absAmount
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (options?.showSign) {
    if (amount > 0) {
      return `+${prefix}${formattedNumber}`;
    } else if (amount < 0) {
      return `-${prefix}${formattedNumber}`;
    }
  }

  return `${prefix}${formattedNumber}`;
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
      break;
    case 'custom_days':
      date.setDate(date.getDate() + (frequencyDays > 0 ? frequencyDays : 6));
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'monthly':
    default:
      date.setMonth(date.getMonth() + 1);
      break;
  }
  return toDateString(date);
}

