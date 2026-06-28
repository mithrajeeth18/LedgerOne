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

  close: (id: string) =>
    apiClient.post(`/loans/${id}/close`),

  getPaymentSchedule: (id: string) =>
    apiClient.get(`/loans/${id}/schedule`),

  getSummary: (id: string) =>
    apiClient.get(`/loans/${id}/summary`),
};
