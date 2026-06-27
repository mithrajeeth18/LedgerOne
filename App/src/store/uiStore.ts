import { create } from 'zustand';

type Language = 'en' | 'ta';

interface UIState {
  language: Language;
  isBottomSheetOpen: boolean;

  setLanguage: (lang: Language) => void;
  openBottomSheet: () => void;
  closeBottomSheet: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  language: 'en',
  isBottomSheetOpen: false,

  setLanguage: (lang) => set({ language: lang }),
  openBottomSheet: () => set({ isBottomSheetOpen: true }),
  closeBottomSheet: () => set({ isBottomSheetOpen: false }),
}));
