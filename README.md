# Pocket Wallet

A fast, offline-first personal finance, bills, shared credit card, and friends ledger mobile application built with **Expo (SDK 57)** and **React Native**.

Designed around a clean, high-contrast light editorial ledger aesthetic (**Canvas `#F4F5F7`**, **Surface `#FFFFFF`**, **Deep Forest Emerald `#0D5C4A`**), Pocket Wallet gives you instant visibility into what is actually safe to spend after upcoming bills, keeps shared credit card spending strictly isolated from your personal budget, and stores every record locally on your device.

---

## Core Features

### 1. Central Wallet, Safe to Spend & Monthly Insights (`Wallet` Tab)
- **Live Balance & Cashflow**: Record income and expense entries via a quick bottom-sheet modal with category tags and optional notes (`QuickEntryModal`).
- **Safe to Spend Footer**: The `BalanceCard` surfaces your true discretionary balance (`balance - unpaidBillsTotal`), unpaid bills context, and an estimated daily safe budget (`~Rs. X/day · Nd left`) until your next payday.
- **Month Switcher & Category Breakdown (`MonthlyInsightsCard`)**: Step backward or forward across months (`< Month Year >`) with a 1-tap `Today` jump pill, inspect monthly **In / Out / Net** totals, expand top expense categories with proportional progress bars, and filter the Cashflow feed to the selected month.

### 2. Bills & Salary Payday Cycle (`Bills` Tab)
- **Salary Configuration**: Set your monthly salary amount and payday day-of-month with automatic month-end clamping and payday cycle advancement (`SalaryCard`, `SalaryConfigModal`).
- **Recurring & One-Off Bills**: Add, edit, and pay utility bills (`AddBillModal`, `EditBillModal`, `PayBillModal`) with local due-date reminder notifications (`expo-notifications`).
- **Home Action Queue**: Upcoming unpaid bills and overdue items surface cleanly in `ActionRequiredCard` without cluttering settled history.

### 3. Isolated Credit Card Ledger (`Card` Tab)
- **Strict Accounting Isolation**: Track purchases made when you lend your credit card to friends or family and their random/partial repayments completely separated from your personal wallet balance, cashflow transactions, utility bills, monthly totals, and home due action items.
- **Card Summary & Bank Payments**: Monitor total member balances due, total repayments held for the card bank, and log lump-sum payments made to your bank (`CreditCardSummaryCard`, `CardBankPaymentModal`).
- **Per-Member Breakdown & Statement Sharing**: Open any member in `CardMemberDetailModal` to record charges or partial settlements and export a clean itemized summary in one tap.

### 4. Give & Take Friends Ledger (`Friends` Tab)
- **Receivables & Payables**: Track what others owe you (`to_receive`) and what you owe (`to_pay`) with expected recovery dates and automated reminder notifications (`AddFriendEntryModal`).
- **Partial Repayments**: Log incremental payments in `FriendDetailModal` until an entry settles automatically.

### 5. Local JSON Backup & 1-Tap WhatsApp Statement Sharing
- **Full Data Backup & Restore (`Profile` Tab)**:
  - **Export (`BackupService.exportBackup`)**: Serializes all wallet data (balance, cashflow transactions, salary configuration, bills, friends ledger, and credit card ledger — excluding device-specific security settings) as a `schemaVersion: 1` JSON file via `expo-file-system` and shares/saves it via `expo-sharing` (with browser download fallback on web).
  - **Restore (`BackupService.pickAndReadBackup`)**: Picks a `.json` backup via `expo-document-picker`, validates structure and schema, preserves local PIN/biometric preferences, cancels stale notifications, and reschedules reminders for active bills, unsettled friend entries, and salary cycles.
- **1-Tap Statement Sharing**: Both `CardMemberDetailModal` and `FriendDetailModal` include a **Share** action that formats a crisp, emoji-clean WhatsApp/Messages statement summarizing totals and recent itemized entries (`formatCardMemberStatement`, `formatFriendStatement`).

### 6. Dual-Layer Device Security & Privacy
- **4-Digit Passcode**: Optional PIN lock (`PinLockScreen`) hashed with a cryptographic per-PIN salt (SHA-256) and stored in hardware-backed **`expo-secure-store`** — never in plain AsyncStorage and never included in JSON backups.
- **Biometric Unlock**: Optional Face ID / Fingerprint unlock via `expo-local-authentication` with safe auto-lock suppression during share sheets and file pickers.
- **Background Privacy Shield**: Automatically masks wallet figures in the OS app-switcher when the app enters the background (`App.tsx`).
- **100% Local On-Device Storage**: Wallet JSON records live locally on your device via `@react-native-async-storage/async-storage` (`@pocket_wallet_data`) with zero third-party analytics or cloud tracking.

---

## Design Tokens (`src/theme/colors.ts`)

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `canvas` / `bg` | `#F4F5F7` | Primary screen canvas |
| `surface` | `#FFFFFF` | Cards, rows, and bottom sheets |
| `line` | `#E6E8EC` | Hairline borders and dividers |
| `ink` | `#0F1419` | Primary headings and balances |
| `muted` | `#5F6672` | Secondary labels and timestamps |
| `subtle` | `#9AA1AB` | Tertiary captions and placeholders |
| `brand` | `#0D5C4A` | Deep forest emerald brand accent (`brandSoft`: `#E5F0EC`) |
| `pos` | `#0B7A52` | Income & positive balances (`posSoft`: `#E6F4ED`) |
| `neg` | `#B42A2A` | Expenses & amounts due (`negSoft`: `#FBECEB`) |
| `warn` | `#9A5A06` | Upcoming / pending due alerts (`warnSoft`: `#FCF2E1`) |
| `accentBlue` | `#2563EB` | Credit card ledger highlights (`accentBlueMuted`: `#EFF6FF`) |

---

## Project Architecture

```text
wallet/
├── App.tsx                         # Navigation tabs, lock/onboarding gates, privacy shield, notification routing
├── index.ts                        # Expo entry point
├── app.json                        # Expo config, permissions, and config plugins
├── eas.json                        # EAS Build profiles
├── eslint.config.js                # ESLint configuration (eslint-config-expo)
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript config
├── assets/
│   ├── banners/                    # Splash & promotional assets
│   └── logos/                      # App icons and brand mark
└── src/
    ├── components/
    │   ├── ActionRequiredCard.tsx  # Home card for unpaid bills & overdue reminders
    │   ├── AddBillModal.tsx        # Create recurring or one-off bills
    │   ├── AddCardEntryModal.tsx   # Log credit card purchase or friend repayment
    │   ├── AddFriendEntryModal.tsx # Create Give & Take ledger entry
    │   ├── BalanceCard.tsx         # Central balance + Safe to Spend & daily budget footer
    │   ├── BillRow.tsx             # Utility bill item row
    │   ├── CardBankPaymentModal.tsx# Record payment sent to credit card bank
    │   ├── CardMemberDetailModal.tsx# Member card ledger, partial settlement & Share button
    │   ├── CardMemberRow.tsx       # Aggregated credit card member summary row
    │   ├── ConfirmModal.tsx        # Reusable destructive/restore confirmation dialog
    │   ├── CreditCardSummaryCard.tsx# Credit card total due & cash held for bank card
    │   ├── DatePickerModal.tsx     # Cross-platform calendar date selector
    │   ├── EditBillModal.tsx       # Edit existing bill details
    │   ├── FriendDetailModal.tsx   # Give & Take entry details, repayments & Share button
    │   ├── FriendRow.tsx           # Friend ledger item row
    │   ├── Header.tsx              # Reusable compact header
    │   ├── MonthlyInsightsCard.tsx # Month switcher, In/Out/Net strip & category breakdown
    │   ├── PayBillModal.tsx        # Record bill payment from wallet balance
    │   ├── PositionStrip.tsx       # Net Give & Take summary strip
    │   ├── QuickEntryModal.tsx     # Fast income/expense cashflow bottom sheet
    │   ├── SalaryCard.tsx          # Payday countdown & salary cycle card
    │   ├── SalaryConfigModal.tsx   # Configure salary amount and payday date
    │   ├── ScreenHeader.tsx        # Standard screen header with optional action
    │   ├── StatusTag.tsx           # Compact semantic pill badge
    │   ├── TransactionItem.tsx     # Cashflow transaction row
    │   └── UpcomingBillsBanner.tsx # Condensed upcoming bills banner
    ├── context/
    │   └── WalletContext.tsx       # App state, Safe to Spend metrics, isolation guarantees & backup import
    ├── hooks/
    │   └── useReducedMotion.ts     # Accessibility reduced-motion helper hook
    ├── screens/
    │   ├── AboutScreen.tsx         # App guide, feature overview & privacy breakdown
    │   ├── BillsSalaryScreen.tsx   # Salary cycle and recurring bills tab
    │   ├── CreditCardLedgerScreen.tsx# Isolated Credit Card Ledger tab
    │   ├── FriendsLedgerScreen.tsx # Give & Take Friends Ledger tab
    │   ├── HomeScreen.tsx          # Wallet tab with Safe to Spend, Monthly Insights & Cashflow
    │   ├── PinLockScreen.tsx       # PIN & biometric unlock screen
    │   ├── ProfileScreen.tsx       # Security settings, notifications, JSON backup/restore & About link
    │   └── WelcomeOnboardingScreen.tsx# First-launch setup flow
    ├── services/
    │   ├── backup.ts               # JSON backup serialization, validation, export & document picker
    │   ├── notifications.ts        # Local notification permissions, scheduling & cancellation
    │   ├── security.ts             # Salted SHA-256 PIN hashing in expo-secure-store & biometrics
    │   └── storage.ts              # Local AsyncStorage persistence layer
    ├── theme/
    │   ├── colors.ts               # Light editorial color tokens
    │   └── tokens.ts               # Spacing, radii & typography tokens
    ├── types/
    │   └── index.ts                # TypeScript domain models, wallet state & backup schemas
    └── utils/
        ├── formatters.ts           # Currency, date, payday countdown & month helpers
        └── statementFormatter.ts   # WhatsApp-ready friend & credit card statement formatters
```

---

## Development & Verification

Install dependencies and launch the Expo dev server:

```bash
npm install
npx expo start
```

Typecheck, lint, and verify Expo project health:

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

> **Note (Windows PowerShell):** If PowerShell blocks `.ps1` execution policies for `npx`, invoke `npx.cmd` instead (e.g., `npx.cmd tsc --noEmit`).
> Because the app uses native security, notification, sharing, and document picker modules, use a development or EAS build (`npx eas-cli@latest build --profile development`) to test all native capabilities on physical hardware.
