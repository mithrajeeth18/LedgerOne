import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AuthUser, authApi, LoginPayload } from '../api/auth.api';

interface AuthState {
  user: AuthUser | null;
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

const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return globalThis.localStorage?.getItem(key) ?? null;
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  deleteItem: async (key: string) => {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

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
      await storage.setItem(TOKEN_KEY, data.accessToken);
      await storage.setItem(USER_KEY, JSON.stringify(data.user));
      set({ user: data.user, token: data.accessToken, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.message ??
        'Login failed. Please try again.';
      set({ error: message, isLoading: false });
    }
  },

  logout: async () => {
    await storage.deleteItem(TOKEN_KEY).catch(() => {});
    await storage.deleteItem(USER_KEY).catch(() => {});
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadStoredSession: async () => {
    try {
      const token = await storage.getItem(TOKEN_KEY);
      const raw = await storage.getItem(USER_KEY);
      if (token && raw) {
        const user: AuthUser = JSON.parse(raw);
        set({ user, token, isAuthenticated: true });
      }
    } catch {
      // Nothing stored — stay unauthenticated
    }
  },

  clearError: () => set({ error: null }),
}));
