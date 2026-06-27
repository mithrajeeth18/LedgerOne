import apiClient from './client';

export const loansApi = {
  getAll: (params?: { groupId?: string; customerId?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get('/loans', { params }),

  getById: (id: string) =>
    apiClient.get(`/loans/${id}`),

  create: (payload: {
    customerId: string;
    groupId: string;
    principalAmount: number;
    interestRate: number;
    startDate: string;        // ISO date string
    loanTermDays: number;
    repaymentType: 'daily' | 'weekly' | 'monthly';
    installmentAmount: number;
  }) => apiClient.post('/loans', payload),

  update: (id: string, payload: Partial<{
    status: string;
    notes: string;
  }>) => apiClient.put(`/loans/${id}`, payload),

  close: (id: string) =>
    apiClient.post(`/loans/${id}/close`),

  getPaymentSchedule: (id: string) =>
    apiClient.get(`/loans/${id}/schedule`),

  getSummary: (id: string) =>
    apiClient.get(`/loans/${id}/summary`),
};
