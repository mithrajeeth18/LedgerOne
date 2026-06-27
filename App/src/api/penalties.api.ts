import apiClient from './client';

export const penaltiesApi = {
  getForLoan: (loanId: string) =>
    apiClient.get(`/penalties/loan/${loanId}`),

  create: (payload: {
    loanId: string;
    amount: number;
    reason: string;
    penaltyDate: string;
  }) => apiClient.post('/penalties', payload),

  waive: (id: string, reason?: string) =>
    apiClient.post(`/penalties/${id}/waive`, { reason }),

  delete: (id: string) =>
    apiClient.delete(`/penalties/${id}`),
};
