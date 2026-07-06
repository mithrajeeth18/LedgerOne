import apiClient from './client';

export const loansApi = {
  getAll: (params?: { groupId?: string; customerId?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get('/loans', { params }),

  getByCustomerId: (customerId: string) =>
    apiClient.get(`/loans/customer/${customerId}`),

  getById: (id: string) =>
    apiClient.get(`/loans/${id}`),

  create: (payload: {
    customerId: string;
    groupId: string;
    mode: 'daily' | 'principal';
    dailyAmount?: number;
    principalAmount?: number;
    interestRate?: number;
    totalDays: number;
    startDate: string; // YYYY-MM-DD
  }) => apiClient.post('/loans', payload),

  update: (id: string, payload: Partial<{
    status: string;
    notes: string;
  }>) => apiClient.put(`/loans/${id}`, payload),

  /** Edit an active loan's terms (daily amount, duration, start date). Recalculates all existing payments. */
  edit: (id: string, payload: {
    mode: 'daily' | 'principal';
    dailyAmount?: number;
    principalAmount?: number;
    interestRate?: number;
    totalDays: number;
    startDate: string; // YYYY-MM-DD
  }) => apiClient.put(`/loans/${id}/edit`, payload),

  /** Close an active loan (marks status = 'closed') */
  close: (id: string) =>
    apiClient.put(`/loans/${id}/close`, {}),

  /** Close current loan and create a new loan carrying the remaining balance */
  rollover: (id: string, payload: {
    newAmount: number;
    interestRate: number;
    totalDays: number;
    startDate: string; // ISO string
  }) => apiClient.post(`/loans/${id}/rollover`, payload),

  getPaymentSchedule: (id: string) =>
    apiClient.get(`/loans/${id}/schedule`),

  getSummary: (id: string) =>
    apiClient.get(`/loans/${id}/summary`),
};
