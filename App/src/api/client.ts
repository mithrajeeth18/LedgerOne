import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEFAULT_BASE_URL = 'http://localhost:5003/api';

const getExpoDevHost = () => {
  const constants = Constants as any;
  const hostUri =
    constants.expoConfig?.hostUri ??
    constants.manifest2?.extra?.expoGo?.debuggerHost ??
    constants.manifest?.debuggerHost;

  return typeof hostUri === 'string' ? hostUri.split(':')[0] : null;
};

const getBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL;

  if (!__DEV__ || !configuredUrl.match(/\/\/(localhost|127\.0\.0\.1)(:|\/)/)) {
    return configuredUrl;
  }

  const expoDevHost = getExpoDevHost();
  if (expoDevHost && !['localhost', '127.0.0.1'].includes(expoDevHost)) {
    return configuredUrl.replace(/\/\/(localhost|127\.0\.0\.1)(:|\/)/, `//${expoDevHost}$2`);
  }

  if (Platform.OS === 'android') {
    return configuredUrl.replace(/\/\/(localhost|127\.0\.0\.1)(:|\/)/, '//10.0.2.2$2');
  }

  return configuredUrl;
};

const BASE_URL = getBaseUrl();

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return globalThis.localStorage?.getItem(key) ?? null;
    }
    return SecureStore.getItemAsync(key);
  },
  deleteItem: async (key: string) => {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// ─── Request interceptor — attach JWT ──────────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // secure store read failed — proceed without token
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — handle 401 ─────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired — clear stored credentials
      await storage.deleteItem('authToken').catch(() => {});
    }
    return Promise.reject(error);
  },
);

export default apiClient;
