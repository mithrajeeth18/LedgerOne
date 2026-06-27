import apiClient from './client';

export interface LoginPayload {
  email: string;
  pin: string;
}

export interface LoginResponse {
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    groupId: string;
  };
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<LoginResponse>('/auth/login', payload),

  me: () =>
    apiClient.get<LoginResponse['user']>('/auth/me'),

  changePin: (payload: { currentPin: string; newPin: string }) =>
    apiClient.put('/auth/change-pin', payload),
};
