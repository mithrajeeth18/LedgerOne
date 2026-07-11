import apiClient from './client';

export type ActiveLoanSummary = {
  _id: string;
  loanNumber: number;
  dailyAmount: number;
  startDate: string;
};

export type TodayPaymentSummary = {
  _id: string;
  loanId: string;
  status: 'paid' | 'underpaid' | 'skipped' | 'overpaid';
  paidAmount: number;
};

export type DashboardCustomer = {
  _id: string;
  name: string;
  phone: string;
  activeLoans: ActiveLoanSummary[];     // array — all active loans
  totalDailyAmount: number;             // sum of all dailyAmounts
  todayPayments: TodayPaymentSummary[]; // one entry per loan that has a payment today
  todayTotalPaid: number;               // sum of all paidAmounts today
};

export type DashboardResponse = {
  group: { _id: string; name: string };
  customers: DashboardCustomer[];
};

export const groupsApi = {
  getAll: () =>
    apiClient.get('/groups'),

  getById: (id: string) =>
    apiClient.get(`/groups/${id}`),

  create: (payload: { name: string; description?: string }) =>
    apiClient.post('/groups', payload),

  update: (id: string, payload: { name?: string; description?: string }) =>
    apiClient.put(`/groups/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete(`/groups/${id}`),

  getStats: (id: string) =>
    apiClient.get(`/groups/${id}/stats`),

  getDayGrid: (id: string, params: { year: number; month: number }) =>
    apiClient.get(`/groups/${id}/day-grid`, { params }),

  /** Single aggregation endpoint — one DB query, zero N+1 */
  getDashboard: (id: string) =>
    apiClient.get<DashboardResponse>(`/groups/${id}/dashboard`),
};
