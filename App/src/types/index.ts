export interface Group {
  _id: string;
  name: string;
  description?: string;
  collectorId: string;
  activeLoanCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  groupId: string | Group;
  guarantorName?: string;
  guarantorPhone?: string;
  activeLoanCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  _id: string;
  loanNumber: number;
  customerId: string | Customer;
  groupId: string | Group;
  principalAmount: number;
  interestRate: number;
  totalRepayable: number;
  installmentAmount: number;
  repaymentType: 'daily' | 'weekly' | 'monthly';
  loanTermDays: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'closed' | 'overdue';
  totalPaid: number;
  remainingBalance: number;
  pendingAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  loanId: string | Loan;
  amount: number;
  paymentDate: string;
  paymentMethod?: 'cash' | 'upi' | 'bank';
  notes?: string;
  isSynced?: boolean;
  localId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Penalty {
  _id: string;
  loanId: string | Loan;
  amount: number;
  reason: string;
  penaltyDate: string;
  isWaived: boolean;
  waivedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  _id: string;
  loanId: string | Loan;
  customerId: string | Customer;
  message: string;
  scheduledAt: string;
  channel?: 'sms' | 'whatsapp' | 'call';
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface DayGridCell {
  date: string;         // YYYY-MM-DD
  status: 'paid' | 'unpaid' | 'skipped' | 'future' | 'locked' | 'holiday';
  amount?: number;
  paymentId?: string;
}

export interface LoanSummary {
  loan: Loan;
  customer: Customer;
  totalPaid: number;
  remainingBalance: number;
  percentComplete: number;
  daysOverdue?: number;
  dayGrid: DayGridCell[];
}
