import apiClient from './client';

export const paymentsApi = {
  getForLoan: (loanId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/payments/loan/${loanId}`, { params }),

  create: (payload: {
    loanId: string;
    paidAmount: number;
    paymentDate: string;       // ISO date string
    paymentMode: 'cash' | 'online';
    isOfflineEntry?: boolean;
  }) => apiClient.post('/payments', payload),

  update: (id: string, payload: Partial<{
    amount: number;
    paymentDate: string;
    notes: string;
  }>) => apiClient.put(`/payments/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete(`/payments/${id}`),

  getTodayPayments: () =>
    apiClient.get('/payments/today'),

  bulkSync: (payments: Array<{
    localId: string;
    loanId: string;
    amount: number;
    paymentDate: string;
    paymentMethod?: string;
    notes?: string;
  }>) => apiClient.post('/payments/bulk-sync', { payments }),
};
