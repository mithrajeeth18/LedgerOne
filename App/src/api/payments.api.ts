import apiClient from './client';

export const paymentsApi = {
  getForLoan: (loanId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/payments/loan/${loanId}`, { params }),

  create: (payload: {
    loanId: string;
    amount: number;
    paymentDate: string;       // ISO date string
    paymentMethod?: 'cash' | 'upi' | 'bank';
    notes?: string;
  }) => apiClient.post('/payments', payload),

  update: (id: string, payload: Partial<{
    amount: number;
    paymentDate: string;
    notes: string;
  }>) => apiClient.put(`/payments/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete(`/payments/${id}`),

  bulkSync: (payments: Array<{
    localId: string;
    loanId: string;
    amount: number;
    paymentDate: string;
    paymentMethod?: string;
    notes?: string;
  }>) => apiClient.post('/payments/bulk-sync', { payments }),
};
