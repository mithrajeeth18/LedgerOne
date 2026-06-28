import apiClient from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role?: string;
  groupId?: string;
  biometricEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<LoginResponse>('/auth/login', payload),

  me: () =>
    apiClient.get<LoginResponse['user']>('/auth/me'),

  changePin: (payload: { currentPin: string; newPin: string }) =>
    apiClient.put('/auth/change-pin', payload),
};
