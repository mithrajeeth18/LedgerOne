import apiClient from './client';

export const customersApi = {
  getAll: (params?: { groupId?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/customers', { params }),

  getById: (id: string) =>
    apiClient.get(`/customers/${id}`),

  create: (payload: {
    name: string;
    phone: string;
    address?: string;
    groupId: string;
    guarantorName?: string;
    guarantorPhone?: string;
  }) => apiClient.post('/customers', payload),

  update: (id: string, payload: Partial<{
    name: string;
    phone: string;
    address: string;
    guarantorName: string;
    guarantorPhone: string;
  }>) => apiClient.put(`/customers/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete(`/customers/${id}`),

  getLoans: (id: string) =>
    apiClient.get(`/customers/${id}/loans`),
};
