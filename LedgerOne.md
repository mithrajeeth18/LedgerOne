# Money Lending App — Complete Project Workflow

> A field-first daily collection management app for licensed money lenders.
> Built for two collectors operating across multiple locations in Panvel, Maharashtra.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Database Schema](#4-database-schema)
5. [Backend API — Routes & Logic](#5-backend-api--routes--logic)
6. [Frontend Screens & Flow](#6-frontend-screens--flow)
7. [Core Business Logic](#7-core-business-logic)
8. [Offline Sync Strategy](#8-offline-sync-strategy)
9. [Auth Flow](#9-auth-flow)
10. [Build & Deployment](#10-build--deployment)
11. [Environment Variables](#11-environment-variables)
12. [Development Phases](#12-development-phases)

---

## 1. Project Overview

### What it does
- Tracks daily loan collections from small shop owners and vendors
- Manages multiple collector groups (Sukapur, Yard Market, Old Panvel, New Panvel, etc.)
- Marks daily payments as paid / underpaid / skipped per customer loan
- Calculates running balances, carries over remaining amounts into new loans
- Syncs between two collectors in real time via cloud
- Supports overdue loans past end date with optional collector-set penalties
- Each group maintains its own sequential loan numbering (1–500, never repeating)

### Who uses it
- Two collectors with separate logins and equal access — mark payments in the field
- No customer-facing features in Phase 1

### Key constraints
- Must work in sunlight, rain, one hand — ultra minimal UI
- Offline support — mark payments without internet, sync when back online
- Data stays on a private cloud (no third-party finance apps)
- Biometric / PIN lock before app access
- Two separate collector accounts seeded manually by admin (no public signup)
- Each customer belongs to exactly one group only
- Loan creation is always separate from customer creation — done from customer profile

---

## 2. Tech Stack

### Mobile App (Frontend)
| Layer | Choice | Reason |
|---|---|---|
| Framework | React Native + Expo (SDK 51+) | Reuses React knowledge, single codebase for Android |
| Navigation | Expo Router (file-based) | Clean tab + stack routing, works with Expo |
| State management | Zustand | Lightweight, simple, no boilerplate |
| Offline storage | WatermelonDB | Built for React Native, sync-ready, handles large local datasets |
| API calls | Axios | Familiar, interceptors for auth headers |
| UI library | Custom components only | No heavy UI lib — controls must be large and sunlight-safe |
| Language | TypeScript | Catches bugs early, better IDE support |
| i18n | i18next + react-i18next | English + Tamil support (UI strings only, app name stays in English) |
| Biometrics | expo-local-authentication | Fingerprint / face unlock |
| Secure storage | expo-secure-store | PIN and JWT storage |
| Notifications | expo-notifications | Local scheduled notifications per customer |

### Backend
| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 20 LTS | Familiar ecosystem |
| Framework | Express.js | Minimal, fast, easy to structure |
| Database | MongoDB Atlas (M0 free tier to start) | Flexible schema, cloud-hosted, encrypted at rest |
| ODM | Mongoose | Schema validation, easy querying |
| Auth | JWT (access token 15min + refresh token 30 days) | Stateless, works with mobile |
| Password hashing | bcryptjs | Industry standard |
| OTP (forgot PIN) | Nodemailer + Gmail SMTP | Simple, free |
| Validation | Zod (shared with frontend) | Validate once, use everywhere |
| Hosting | Railway.app | Free tier, simple deploys, supports Node |

### Dev Tools
| Tool | Use |
|---|---|
| ESLint + Prettier | Code formatting |
| Husky + lint-staged | Pre-commit hooks |
| Postman / Thunder Client | API testing |
| EAS Build (Expo) | Building APK for distribution |
| MongoDB Compass | Database GUI for dev |

---

## 3. Folder Structure

### Backend (`/server`)

```
server/
├── src/
│   ├── config/
│   │   ├── db.js               # MongoDB connection
│   │   └── mailer.js           # Nodemailer setup
│   ├── models/
│   │   ├── User.js
│   │   ├── Group.js
│   │   ├── Customer.js
│   │   ├── Loan.js
│   │   ├── Payment.js
│   │   └── Penalty.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── group.routes.js
│   │   ├── customer.routes.js
│   │   ├── loan.routes.js
│   │   ├── payment.routes.js
│   │   └── penalty.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── group.controller.js
│   │   ├── customer.controller.js
│   │   ├── loan.controller.js
│   │   ├── payment.controller.js
│   │   └── penalty.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── utils/
│   │   ├── loanCalculator.js
│   │   └── otp.js
│   ├── seed/
│   │   └── seedUsers.js        # One-time script to create 2 collector accounts
│   └── app.js
├── .env
├── package.json
└── server.js
```

### Mobile App (`/app`)

```
app/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   ├── biometric.tsx
│   │   │   └── forgot-pin.tsx
│   │   ├── (tabs)/
│   │   │   ├── index.tsx           # Home / today's collection
│   │   │   ├── groups.tsx          # Groups list
│   │   │   ├── customers.tsx       # All customers
│   │   │   └── settings.tsx
│   │   ├── group/
│   │   │   └── [id].tsx            # Group detail — customer list for this group
│   │   ├── customer/
│   │   │   ├── [id].tsx            # Customer profile
│   │   │   └── new.tsx             # Add customer form (name, phone, group only)
│   │   ├── loan/
│   │   │   ├── [id].tsx            # Loan detail + day grid
│   │   │   ├── new.tsx             # New loan form (reached only from customer profile)
│   │   │   └── rollover.tsx        # Loan closure + rollover
│   │   └── bin.tsx
│   ├── components/
│   │   ├── DayGrid.tsx
│   │   ├── PaymentModal.tsx
│   │   ├── PenaltyModal.tsx
│   │   ├── LoanCard.tsx
│   │   ├── CustomerCard.tsx
│   │   ├── CollectionSummary.tsx
│   │   └── OfflineBanner.tsx
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── syncStore.ts
│   │   └── uiStore.ts
│   ├── db/
│   │   ├── schema.ts
│   │   ├── models/
│   │   └── sync.ts
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.api.ts
│   │   ├── groups.api.ts
│   │   ├── customers.api.ts
│   │   ├── loans.api.ts
│   │   ├── payments.api.ts
│   │   └── penalties.api.ts
│   ├── i18n/
│   │   ├── en.json
│   │   └── ta.json
│   ├── utils/
│   │   ├── loanCalculator.ts
│   │   └── formatCurrency.ts
│   └── theme/
│       └── colors.ts
├── assets/
├── app.json
└── package.json
```

---

## 4. Database Schema

### `users`
```js
{
  _id: ObjectId,
  name: String,               // "Collector 1" / "Collector 2"
  email: String,              // unique — seeded manually, no public signup
  passwordHash: String,
  appPin: String,             // bcrypt hashed 4-6 digit PIN
  biometricEnabled: Boolean,
  otpCode: String,            // temp OTP for forgot PIN flow
  otpExpiry: Date,            // OTP valid for 10 minutes
  createdAt: Date
}
```

> Only 2 user documents will ever exist. Created via `seed/seedUsers.js` run once by developer.

### `groups`
```js
{
  _id: ObjectId,
  name: String,               // "Sukapur", "Yard Market", "Old Panvel"
  loanCounter: Number,        // current highest loan number used in this group, starts at 0
                              // max 500 — increments by 1 on every new loan creation
  createdBy: ObjectId,        // ref: users
  isDeleted: Boolean,
  deletedAt: Date,            // bin expires 30 days after this — clock never resets
  createdAt: Date
}
```

### `customers`
```js
{
  _id: ObjectId,
  name: String,               // can be in Tamil script or English
  phone: String,              // Indian format, +91 prefix
  groupId: ObjectId,          // ref: groups — ONE group per customer, always
  isDeleted: Boolean,
  deletedAt: Date,            // bin expires 30 days after this — clock never resets
  createdAt: Date
}
```

> A customer belongs to exactly ONE group. No junction table needed.
> Customer creation and loan creation are always separate actions.
> A customer can exist with no active loan.

### `loans`
```js
{
  _id: ObjectId,
  loanNumber: Number,         // sequential within the group, e.g. 21
                              // assigned from group.loanCounter at creation
                              // unique per group, never reused after closure
                              // range: 1–500 per group
  groupId: ObjectId,          // ref: groups — which group this loan number belongs to
                              // loanNumber + groupId = unique combination
  customerId: ObjectId,       // ref: customers
  principalAmount: Number,    // only set in principal+interest mode
  interestRate: Number,       // flat percent, default 12, editable per customer
  totalDays: Number,          // default 50, editable (45, 60, etc.)
  dailyAmount: Number,        // lender-set in daily mode OR calculated in principal mode
  startDate: Date,            // can be past, today, or future — backdating allowed
  status: String,             // "active" | "closed" | "rolled_over"
  isOverdue: Boolean,         // true when daysPassed > totalDays and still active
  previousLoanId: ObjectId,   // ref: loans — chain for rollover history
  carriedOverBalance: Number, // remaining balance brought from previous loan
  closedAt: Date,
  createdBy: ObjectId         // ref: users
}
```

### `payments`
```js
{
  _id: ObjectId,
  loanId: ObjectId,           // ref: loans
  collectedBy: ObjectId,      // ref: users — which collector marked this
  paymentDate: Date,          // which calendar day this entry covers
  expectedAmount: Number,     // loan's dailyAmount for this day
  paidAmount: Number,         // actual amount paid (0 if skipped)
  status: String,             // "paid" | "underpaid" | "skipped" | "overpaid"
  paymentMode: String,        // "cash" | "online" — label only, no payment gateway
  extraAmount: Number,        // paidAmount - expectedAmount when positive
  cumulativePending: Number,  // running total of all unpaid amounts up to this day
  isLocked: Boolean,          // true when paymentDate < (today - 1 day)
  isOfflineEntry: Boolean,
  syncedAt: Date,
  createdAt: Date
}
```

> Edit window: same day or previous day only. After 2 days isLocked = true.
> Locked entries show: "This entry is locked. Adjust in a future payment."
> Lock is enforced on the server side, not just frontend.

### `penalties`
```js
{
  _id: ObjectId,
  loanId: ObjectId,           // ref: loans
  addedBy: ObjectId,          // ref: users
  amount: Number,             // collector-set — can be ₹0 if waived
  reason: String,             // optional, e.g. "Overdue — crossed 50 days"
  addedAt: Date
}
```

> Penalties are completely separate from loan daily amounts.
> They add to total outstanding display only — never change dailyAmount.
> ₹0 penalty is valid (collector recording overdue but waiving the fee).

### `reminders`
```js
{
  _id: ObjectId,
  loanId: ObjectId,
  customerId: ObjectId,
  createdBy: ObjectId,
  reminderTime: String,       // "HH:MM" 24hr format
  repeatType: String,         // "once" | "daily"
  reminderDate: Date,         // only used when repeatType = "once"
  isActive: Boolean,
  createdAt: Date
}
```

> Reminders fire as local notifications via expo-notifications.
> Stored in DB for sync/backup only.

---

## 5. Backend API — Routes & Logic

### Auth routes `/api/auth`
| Method | Route | Description |
|---|---|---|
| POST | `/login` | Email + password → JWT access + refresh token |
| POST | `/refresh` | Refresh token → new access token |
| POST | `/forgot-pin` | Send 6-digit OTP to email (valid 10 min) |
| POST | `/verify-otp` | Verify OTP |
| POST | `/reset-pin` | Save new bcrypt-hashed PIN |
| POST | `/logout` | Invalidate refresh token |

### Group routes `/api/groups`
| Method | Route | Description |
|---|---|---|
| GET | `/` | All active groups with loanCounter |
| POST | `/` | Create group (loanCounter starts at 0) |
| PUT | `/:id` | Edit group name |
| DELETE | `/:id` | Soft delete |
| GET | `/bin` | Deleted groups within 30-day window |
| POST | `/:id/restore` | Restore from bin |

### Customer routes `/api/customers`
| Method | Route | Description |
|---|---|---|
| GET | `/` | All active customers |
| GET | `/group/:groupId` | All customers in a specific group |
| POST | `/` | Create customer with name, phone, groupId |
| PUT | `/:id` | Edit name or phone |
| DELETE | `/:id` | Soft delete |
| GET | `/bin` | Deleted customers within 30-day window |
| POST | `/:id/restore` | Restore from bin |

> No group assignment endpoint needed — groupId is set at creation and never changes.

### Loan routes `/api/loans`
| Method | Route | Description |
|---|---|---|
| GET | `/customer/:customerId` | All loans for a customer (active + archived) |
| POST | `/` | Create loan — auto-increments group loanCounter, assigns loanNumber |
| PUT | `/:id/close` | Close loan |
| POST | `/:id/rollover` | Close current + create new with carried balance + new loanNumber |
| PUT | `/:id/overdue` | Mark loan as overdue |
| GET | `/:id` | Loan detail with payments and penalties |

> On POST /loans:
> - Receive groupId
> - group.loanCounter += 1
> - loan.loanNumber = group.loanCounter
> - Reject if group.loanCounter > 500
> - loanNumber + groupId must be unique

### Payment routes `/api/payments`
| Method | Route | Description |
|---|---|---|
| POST | `/` | Mark a payment for a specific day |
| PUT | `/:id` | Edit payment — server checks isLocked before allowing |
| GET | `/today` | All today's payments by collector and by group |
| POST | `/sync` | Bulk upsert for offline entries |

### Penalty routes `/api/penalties`
| Method | Route | Description |
|---|---|---|
| POST | `/` | Add penalty to overdue loan |
| GET | `/loan/:loanId` | All penalties for a loan |

### Reminder routes `/api/reminders`
| Method | Route | Description |
|---|---|---|
| POST | `/` | Save reminder |
| GET | `/` | All reminders for logged-in collector |
| DELETE | `/:id` | Delete reminder |

---

## 6. Frontend Screens & Flow

### Auth flow
```
App launch
  └─ Check stored JWT
       ├─ No JWT → Login (email + password)
       └─ JWT found → Biometric prompt
                        ├─ Success → Home
                        └─ Fail 3x → PIN entry
                                       ├─ Correct → Home
                                       └─ Forgot PIN → OTP → Reset PIN → Home
```

### Main tabs
- **Home** — today's collection summary
- **Groups** — location groups list
- **Customers** — all customers across all groups, searchable
- **Settings** — PIN, biometric, language, reminders, collector profile

### Groups screen
- Each group card shows:
  - Group name (Title Case, not ALL CAPS)
  - Customer count
  - Progress: X / Y collected today
  - Green check circle when all collected (route finished state)
  - Plain number "X / Y" when incomplete — no icon
- Tap group → Group detail (customer list for that group)

### Group detail screen
- Header: group name + back arrow
- Customer list sorted: PENDING first, PAID below, NO LOAN at bottom
- Each customer card shows: name, phone, ₹daily/day, PAID/PENDING/NO LOAN dot
- NO LOAN customers show name and phone only — no ₹0/day line
- Floating green + button → Add Customer form
- Bottom padding 80px minimum so last card never hides behind + button

### Customer profile screen

**State 1 — No active loan:**
```
[Name]    [Avatar initial]    [Bell icon]
[Phone]
[Group badge]

┌─────────────────────────────┐
│  No active loan             │
│                             │
│     [ + Add Loan ]          │
└─────────────────────────────┘
```

**State 2 — Active loan:**
```
[Name]    [Avatar initial]    [Bell icon]
[Phone]
[Group badge]

┌─────────────────────────────────┐
│  TODAY          Loan #21        │
│  Day 13 of 50                   │
│  Collection today:  ₹300        │
│  Pending:           ₹600  (red) │
│  Status:  [ PENDING ]           │
└─────────────────────────────────┘

[ Collect ₹300 ]          ← large green primary
[ View loan history ]     ← small outline secondary → day grid
```

> CLOSE / ROLLOVER is accessible only from the day grid screen's three dot menu.
> GOOD STANDING badge removed entirely.
> Progress bar removed — Day X of Y text is sufficient.

### Add customer form
- Full name (supports Tamil script)
- Phone number (+91 prefix)
- Group — single select only (one group per customer, always)
- Save Customer button
- Muted note below: "A loan can be added from the customer's profile"
- On save → navigate to that customer's profile

### New loan form
- Only reachable from customer profile "+ Add Loan" button
- Customer name shown at top: "CUSTOMER: RAM"
- Mode toggle: Daily Amount (default) | Principal + Int
- **Daily Amount mode:** daily amount input, duration (default 50), start date (past/today/future all allowed)
- **Principal mode:** principal, interest % (default 12), duration, start date
- Preview card: Total to Collect and Daily Collection (no decimals for rupees)
- On CREATE LOAN → navigate to loan detail day grid

### Loan detail screen
- Header: customer name, ₹daily/day, "Loan #21" in muted green, three dot menu
- Three dot menu contains: "View full history" and "Close / Rollover" only
- Subheader: "Day 13 of 50 · Start: 01 Jul 2026 · Total: ₹15,000"
- Overdue banner when past totalDays: "Loan overdue by N days · Add penalty"
- Day grid — each cell:
  - Pre-loan days or locked past days: day number in gray, light gray background, NO lock icon
  - TODAY cell: day number + "TODAY" label in tiny green text + bold border
  - ✅ paid
  - ✅ + green extra badge if overpaid
  - ❌ + amount if underpaid
  - — if skipped
  - Empty dashed cell for future days
  - Locked cell (>2 days ago): gray, tap shows "This entry is locked. Adjust in a future payment."
- Footer: Expected so far | Collected (green) | Pending (red, bold even when ₹0)
- COLLECT ₹300 button pinned at bottom

### Mark payment modal (bottom sheet)
```
CUSTOMER          EXPECTED
Ram · Day 12      ₹300

[ ✅  Paid Full (₹300) ]    ← solid light green background, most prominent

OR ENTER AMOUNT
┌──────────────────────┐
│  ₹  600              │   ← large text display, number pad input
└──────────────────────┘

[ 1 ] [ 2 ] [ 3 ]
[ 4 ] [ 5 ] [ 6 ]
[ 7 ] [ 8 ] [ 9 ]
[ C ] [ 0 ] [ ⌫ ]     ← C = clear, ⌫ = backspace. NO "00" key

PAYMENT MODE
[ 💵 Cash ]   [ 📱 Online ]

Saving: ₹600 · Cash · Day 12 · Ram    ← confirmation line

[ SAVE PAYMENT ]
```

### Loan closure + rollover screen
```
CLOSING LOAN FOR: RAM   (Loan #21)

Current loan:
  Original amount:    ₹15,000
  Paid to date:       ₹12,000
  Remaining balance:  ₹3,000  ← carries forward

New Loan Amount (₹): [ 5,000 ]
Duration (Days):     [ 50 ▼ ]   ← default 50
Start Date:          [ 26/06/2026 ]

Rollover Calculation:
  Carried balance:    ₹3,000
  + New amount:       ₹5,000
  + Interest (12%):   ₹960
  ─────────────────────────
  Combined principal: ₹8,960
  New daily amount:   ₹179/day

  New loan number: Loan #22    ← auto-assigned

[ ✅ Confirm & Create New Loan ]
```

### Penalty screen
```
ADD PENALTY · RAM

PENALTY AMOUNT (₹)
┌──────────────────┐
│  ₹  0.00         │
└──────────────────┘
Note: Enter ₹0 to record overdue without a financial penalty.

REASON (OPTIONAL)
[ Brief description... ]

[ Add penalty ]      ← red button, sentence case
[ Skip — no penalty ]

→ After save: back to loan detail day grid
```

### Today's collection — Home screen
- SYNCED / OFFLINE banner at very top
- Today's date header
- Total Collected card — large ₹ amount
- Cash collected | Online collected side by side
- By Collector section: Collector 1 (N collections · ₹X) / Collector 2 (N collections · ₹X)
- By Group section: each group shows ₹collected / ₹expected + progress bar
- Groups shown: Sukapur, Yard Market, Old Panvel, New Panvel (actual groups only)
- All amounts in ₹ — no $ anywhere in the app

### Settings screen
```
[C1]  Collector 1
      collector1@gmail.com

SECURITY & ACCESS
  [ 🔒 Change PIN          > ]
  [ 👆 Biometric Login  [ON] ]

NOTIFICATIONS
  [ 🔔 Reminders           > ]

PREFERENCES
  [ 🌐 Language    English ▼ ]   ← options: English / Tamil (தமிழ்)

SYSTEM
  [ ℹ App Version    v1.0.0  ]
  [ 🔄 Database Sync  [SYNC NOW] ]
    Up to date

[ Logout ]    ← sentence case, red outline, not ALL CAPS
```

### Bin screen
- Tabs: Customers | Groups
- Search bar at top
- Each card: name, deleted date, days left before permanent removal
- "Restore" button per card
- "Delete permanently" — must type exact customer name to confirm
- Records auto-expire 30 days after deletedAt — clock never resets on viewing

---

## 7. Core Business Logic

### Customer → Group rule
```
One customer belongs to exactly one group.
groupId is set at customer creation.
groupId never changes after creation.
No junction table. No multi-group assignment.
```

### Loan creation flow
```
1. Collector taps "+ Add Loan" on customer profile
2. New Loan form opens with customer name pre-filled
3. Collector enters daily amount (or principal + interest)
4. On CREATE LOAN:
   a. Fetch group.loanCounter for the customer's group
   b. group.loanCounter += 1
   c. loan.loanNumber = group.loanCounter
   d. Reject if loanCounter > 500
   e. Save loan with loanNumber + groupId
5. Navigate to loan detail day grid
```

### Loan numbering rules
```
- Each group has its own sequential counter starting at 0
- On every new loan: group.loanCounter += 1, loan.loanNumber = counter
- loanNumber + groupId = unique combination (compound unique index)
- Maximum 500 loans per group — after 500 show error "Contact developer"
- Numbers never repeat even after loan closure or rollover
- Rollover creates a brand new loan with the next number
  Example: Loan #21 closes → new loan gets #22 automatically
- Loan number is shown as "Loan #21" everywhere it appears:
  - Customer profile today card (top right of card)
  - Loan detail screen header
  - Archived loans list
  - Rollover screen (old number and new number both shown)
```

### Loan input modes

**Daily amount mode (default)**
```
lender enters daily amount directly
totalAmount = dailyAmount × totalDays
lender is responsible for their own interest math
app displays total but never validates or enforces it
```

**Principal + interest mode**
```
interest    = principal × (interestRate / 100)   ← flat, never compound
totalAmount = principal + interest
dailyAmount = totalAmount / totalDays             ← no decimal for display
```

### Payment status logic
```
paidAmount == 0               → "skipped"   → —
paidAmount == expectedAmount  → "paid"      → ✅
paidAmount > expectedAmount   → "overpaid"  → ✅ + green extra badge
paidAmount < expectedAmount   → "underpaid" → ❌ + shows paid and gap
```

### Cumulative pending
```
cumulativePending =
  sum of all expectedAmounts for all days with entries up to today
  minus sum of all paidAmounts up to today

Overpaid days reduce cumulativePending directly.
Skipped days increase cumulativePending.
Extra payments do NOT change tomorrow's expected dailyAmount.
```

### Payment edit window
```
paymentDate == today           → editable
paymentDate == yesterday       → editable
paymentDate < (today - 1 day)  → isLocked = true
                                  Server enforces this on PUT /payments/:id
                                  App shows: "This entry is locked. Adjust in a future payment."
No edit confirmation dialog — silently locked.
```

### Overdue loan
```
daysPassed = (today - startDate) in calendar days

if daysPassed > totalDays AND loan.status == "active":
  loan.isOverdue = true
  Show overdue banner on loan detail: "Loan overdue by N days"

Loan stays active — never auto-closes.
Collector can optionally add a penalty (separate record).
Penalty amount can be ₹0 (waiver — still valid, not a validation error).
Penalty adds to total outstanding display only.
Penalty never changes dailyAmount or payment schedule.
```

### Rollover logic
```
Step 1: Close existing loan
  loan.status   = "rolled_over"
  loan.closedAt = now
  remainingBal  = cumulativePending at time of closure

Step 2: Create new loan
  newLoan.previousLoanId     = closedLoan._id
  newLoan.carriedOverBalance  = remainingBal
  newLoan.principalAmount     = newAmountEntered + remainingBal
  newLoan.interestRate        = 12 (or collector-edited)
  newLoan.dailyAmount         = recalculated on combined principal
  newLoan.groupId             = same as closed loan
  newLoan.loanNumber          = group.loanCounter + 1 (auto-assigned)
  newLoan.startDate           = collector chosen
```

### Soft delete + bin
```
On delete:
  record.isDeleted = true
  record.deletedAt = now

Bin query:
  isDeleted == true AND deletedAt >= (now - 30 days)

Permanent removal:
  isDeleted == true AND deletedAt < (now - 30 days)

30-day clock never resets — viewing a bin record does not extend it.
Permanent delete requires typing exact customer/group name to confirm.
```

---

## 8. Offline Sync Strategy

### How it works
WatermelonDB stores a full local copy on device. App reads and writes locally first, syncs to server when internet is restored.

### Allowed offline
- Mark payments on existing loans ✅
- View all customers, loans, payment history ✅
- Set local reminders ✅

### Requires internet
- Create new customer ❌
- Create new loan ❌
- Add penalty ❌
- Restore from bin ❌

### Sync flow
```
1. NetInfo detects connection restored
2. Read pendingSyncQueue from Zustand
3. POST /api/payments/sync — bulk upsert (loanId + paymentDate = unique key)
4. Server returns updated records
5. WatermelonDB full pull
6. Clear queue
7. Show green "Synced" banner
```

### Conflict resolution
- Two collectors marking the same customer offline simultaneously is not expected
- If it happens: last-write-wins by createdAt
- No complex merge needed at this stage

### Offline indicator
- Persistent banner: "No internet — N entries will sync when connected"
- Green "Synced" banner briefly on successful sync

---

## 9. Auth Flow

### Account setup (one-time, developer only)
```
node src/seed/seedUsers.js
→ Creates 2 users with name, email, hashed password
→ No PIN yet (set by collector on first login)
→ biometricEnabled = false (collector enables in settings)
Script is idempotent — safe to run twice without duplicates
```

### First-time device login
```
1. Enter email + password
2. Server returns accessToken (15min) + refreshToken (30 days)
3. Stored in expo-secure-store
4. Set app PIN (4–6 digits, bcrypt hashed)
5. Enable biometric? → sets biometricEnabled
6. Home tab
```

### Returning to app
```
1. Check expo-secure-store for tokens
2. biometricEnabled → fingerprint prompt
   - Success → refresh token silently if needed → Home
   - Fail 3x → PIN entry
3. biometricEnabled = false → PIN entry directly
4. accessToken expired → use refreshToken silently
5. refreshToken expired → back to email + password login
```

### Forgot PIN
```
1. "Forgot PIN" on PIN screen
2. Enter email
3. 6-digit OTP via Gmail SMTP (valid 10 min)
4. Enter OTP
5. Set new PIN
6. Back to login
```

### Security
- PIN: always bcrypt hashed, never stored plain
- JWT secrets in .env, never committed to git
- All routes: verifyToken middleware
- Refresh tokens invalidated on logout

---

## 10. Build & Deployment

### Development
```bash
# Backend
cd server && npm install && npm run dev   # port 5000

# Seed accounts (once only)
node src/seed/seedUsers.js

# Mobile
cd app && npm install && npx expo start
# Scan QR with Expo Go on Android
```

### Building APK
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
# Download APK from EAS dashboard → send via WhatsApp
# Client: Settings → Install unknown apps → install
```

### Backend (Railway)
```bash
git push origin main   # Railway auto-deploys
# Set .env vars in Railway dashboard → Variables
# Copy public URL → app's EXPO_PUBLIC_API_URL
```

---

## 11. Environment Variables

### Backend `.env`
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/moneylender
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_different
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
NODE_ENV=development
```

### Mobile `.env`
```env
EXPO_PUBLIC_API_URL=https://your-app.up.railway.app/api
```

---

## 12. Development Phases

### Phase 1 — Core owner app

| Sprint | What gets built | Est. time |
|---|---|---|
| 1 | Project setup, MongoDB Atlas, Express boilerplate, seed script | 3 days |
| 2 | Auth — login, PIN, biometric, forgot PIN + OTP | 4 days |
| 3 | Groups CRUD — create, edit, soft delete, bin, loan counter field | 3 days |
| 4 | Customer CRUD — one group per customer, soft delete, bin | 3 days |
| 5 | Loan creation — daily mode + principal mode, loan numbering (1–500 per group), backdating | 4 days |
| 6 | Loan detail screen — day grid, TODAY cell, locked cells, overdue banner | 4 days |
| 7 | Payment marking modal — custom number pad, C key, cash/online, confirmation line | 4 days |
| 8 | Payment edit window (2-day rule) — server enforced lock | 2 days |
| 9 | Overdue detection + penalty screen (separate from payments, ₹0 valid) | 3 days |
| 10 | Loan closure + rollover — carried balance, new loan number, new interest | 3 days |
| 11 | Today's collection Home screen — by collector, by group, cash/online | 3 days |
| 12 | Offline sync — WatermelonDB, sync layer, offline/synced banner | 5 days |
| 13 | Reminders — per customer, once/daily, time picker, expo-notifications | 3 days |
| 14 | Tamil language (i18next) — UI strings only, native speaker review | 2 days |
| 15 | Testing, bug fixes, APK build, client delivery | 4 days |

**Total Phase 1: ~50 working days (~10 weeks)**

### Phase 2 — Customer-facing (future)
- Customer login — view own loan balance and payment history
- Online payment via Razorpay
- WhatsApp message integration

### Phase 3 — Analytics (future)
- Monthly collection reports per group and collector
- Export to PDF / Excel
- Overdue loan dashboard

---

## Notes for Developer

- Customer belongs to ONE group only — groupId on customer, no junction table
- Loan creation is ONLY possible from customer profile "+ Add Loan" button
- Loan numbering: compound unique index on (loanNumber + groupId) in MongoDB
- group.loanCounter must be incremented atomically — use findOneAndUpdate with $inc
- loanCounter max is 500 — reject and show error if exceeded
- Payment lock is server-enforced — PUT /payments/:id checks isLocked before updating
- ₹0 penalty is valid — do not add minimum value validation on penalty amount
- All currency: ₹X,XXX format — use Intl.NumberFormat('en-IN') — no decimals for display
- No $ symbol anywhere in the app — entirely Indian rupee (₹)
- Tamil strings in ta.json — get reviewed by native Tamil speaker before shipping
- Day grid must scroll horizontally for loans beyond 50 days
- Custom number pad on payment modal — no system keyboard, C key to clear, no 00 key
- Start date on new loan allows past dates — needed for backdating on launch day
- WatermelonDB setup is most complex — do Sprint 12 in isolation
- Test offline on physical Android device — emulator network simulation is unreliable
- Seed script must be idempotent — safe to run twice

---

*Document version: 3.0 | Updated: one group per customer, loan numbering system, screen flow corrections, $ → ₹ everywhere*
*Stack: React Native + Expo + Node.js + MongoDB Atlas*
