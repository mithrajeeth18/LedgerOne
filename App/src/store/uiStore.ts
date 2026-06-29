import { create } from 'zustand';
import i18n from '../i18n';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type Language = 'en' | 'ta';

interface UIState {
  language: Language;
  isBottomSheetOpen: boolean;

  setLanguage: (lang: Language) => Promise<void>;
  loadLanguage: () => Promise<void>;
  openBottomSheet: () => void;
  closeBottomSheet: () => void;
}

const LANG_KEY = 'appLanguage';

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
};

export const useUIStore = create<UIState>((set) => ({
  language: 'en',
  isBottomSheetOpen: false,

  setLanguage: async (lang) => {
    await storage.setItem(LANG_KEY, lang).catch(() => {});
    i18n.changeLanguage(lang);
    set({ language: lang });
  },
  loadLanguage: async () => {
    try {
      const stored = await storage.getItem(LANG_KEY);
      if (stored === 'ta' || stored === 'en') {
        i18n.changeLanguage(stored);
        set({ language: stored });
      }
    } catch {
      // ignore
    }
  },
  openBottomSheet: () => set({ isBottomSheetOpen: true }),
  closeBottomSheet: () => set({ isBottomSheetOpen: false }),
}));
