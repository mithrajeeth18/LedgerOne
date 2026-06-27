import apiClient from './client';

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
};
