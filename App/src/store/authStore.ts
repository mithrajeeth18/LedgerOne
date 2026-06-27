import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi, LoginPayload } from '../api/auth.api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  groupId: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredSession: () => Promise<void>;
  clearError: () => void;
}

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.login(payload);
      await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Login failed. Please try again.';
      set({ error: message, isLoading: false });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadStoredSession: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const raw = await SecureStore.getItemAsync(USER_KEY);
      if (token && raw) {
        const user: User = JSON.parse(raw);
        set({ user, token, isAuthenticated: true });
      }
    } catch {
      // Nothing stored — stay unauthenticated
    }
  },

  clearError: () => set({ error: null }),
}));
