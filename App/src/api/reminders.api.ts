import apiClient from './client';

export const remindersApi = {
  getAll: (params?: { groupId?: string; status?: string }) =>
    apiClient.get('/reminders', { params }),

  getForLoan: (loanId: string) =>
    apiClient.get(`/reminders/loan/${loanId}`),

  create: (payload: {
    loanId: string;
    customerId: string;
    message: string;
    scheduledAt: string;
    channel?: 'sms' | 'whatsapp' | 'call';
  }) => apiClient.post('/reminders', payload),

  markSent: (id: string) =>
    apiClient.post(`/reminders/${id}/sent`),

  delete: (id: string) =>
    apiClient.delete(`/reminders/${id}`),
};
