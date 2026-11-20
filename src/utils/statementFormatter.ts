import {
  CreditCardLedgerEntry,
  CreditCardMember,
  Friend,
  FriendEntry,
} from '../types';
import { formatDateDisplay, formatRs, parseDate, toDateString } from './formatters';

const MAX_STATEMENT_LINES = 15;

export function formatCardMemberStatement(
  member: CreditCardMember,
  entries: CreditCardLedgerEntry[]
): string {
  const todayLabel = formatDateDisplay(toDateString(new Date()));
  const sorted = [...entries].sort((a, b) => {
    const dateDiff = parseDate(b.date).getTime() - parseDate(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime();
  });

  const balanceLine =
    member.balanceOwed > 0
      ? `*Remaining Balance: ${formatRs(member.balanceOwed)} (To Pay)*`
      : member.balanceOwed < 0
      ? `*Advance Credit: ${formatRs(Math.abs(member.balanceOwed))}*`
      : '*Remaining Balance: Rs. 0 (All Settled)*';

  const lines: string[] = [
    '*Pocket Wallet — Credit Card Statement*',
    `Person: ${member.name}`,
    `Date: ${todayLabel}`,
    '',
    `Total Card Used: ${formatRs(member.totalCharged)}`,
    `Total Paid: ${formatRs(member.totalPaid)}`,
    balanceLine,
  ];

  if (sorted.length > 0) {
    lines.push('', '*Recent Entries:*');
    const recent = sorted.slice(0, MAX_STATEMENT_LINES);
    recent.forEach((e) => {
      const tag = e.type === 'charge' ? 'Card Used' : 'Payment';
      lines.push(
        `• ${tag}: ${formatRs(e.amount)} — ${e.description} (${formatDateDisplay(e.date)})`
      );
    });
    if (sorted.length > MAX_STATEMENT_LINES) {
      lines.push(`...and ${sorted.length - MAX_STATEMENT_LINES} earlier entries`);
    }
  }

  return lines.join('\n');
}

export function formatFriendStatement(
  friend: Friend,
  entries: FriendEntry[]
): string {
  const todayLabel = formatDateDisplay(toDateString(new Date()));
  const pending = entries
    .filter((e) => !e.isSettled)
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  const settled = entries
    .filter((e) => e.isSettled)
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  const ordered = [...pending, ...settled];

  const balanceLine =
    friend.netBalance > 0
      ? `*Net Balance: ${formatRs(friend.netBalance)} (Owes me)*`
      : friend.netBalance < 0
      ? `*Net Balance: ${formatRs(Math.abs(friend.netBalance))} (I owe)*`
      : '*Net Balance: Rs. 0 (All Settled)*';

  const lines: string[] = [
    '*Pocket Wallet — Friends Ledger Statement*',
    `Person: ${friend.name}`,
    `Date: ${todayLabel}`,
    '',
    `Total Lent: ${formatRs(friend.totalLent)}`,
    `Total Borrowed: ${formatRs(friend.totalBorrowed)}`,
    balanceLine,
  ];

  if (ordered.length > 0) {
    lines.push('', '*Entries:*');
    const recent = ordered.slice(0, MAX_STATEMENT_LINES);
    recent.forEach((e) => {
      const kind = e.type === 'lent' ? 'Lent' : 'Borrowed';
      if (!e.isSettled) {
        lines.push(
          `• [${kind}] ${e.description}: ${formatRs(e.amount)} (Rem: ${formatRs(e.remainingAmount)}, Due ${formatDateDisplay(e.recoveryDate)})`
        );
      } else {
        lines.push(
          `• [Settled ${kind}] ${e.description}: ${formatRs(e.amount)} (${formatDateDisplay(e.date)})`
        );
      }
    });
    if (ordered.length > MAX_STATEMENT_LINES) {
      lines.push(`...and ${ordered.length - MAX_STATEMENT_LINES} earlier entries`);
    }
  }

  return lines.join('\n');
}
