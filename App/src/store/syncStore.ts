import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import { paymentsApi } from '../api/payments.api';

interface PendingPayment {
  localId: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: number;
}

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingCount: number;
  pendingPayments: PendingPayment[];
  syncError: string | null;

  setOnline: (online: boolean) => void;
  addPendingPayment: (payment: Omit<PendingPayment, 'createdAt'>) => void;
  removePendingPayment: (localId: string) => void;
  syncNow: () => Promise<void>;
  startNetworkWatch: () => () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: true,
  isSyncing: false,
  lastSyncAt: null,
  pendingCount: 0,
  pendingPayments: [],
  syncError: null,

  setOnline: (online) => set({ isOnline: online }),

  addPendingPayment: (payment) => {
    const entry: PendingPayment = { ...payment, createdAt: Date.now() };
    set((state) => ({
      pendingPayments: [...state.pendingPayments, entry],
      pendingCount: state.pendingPayments.length + 1,
    }));
  },

  removePendingPayment: (localId) => {
    set((state) => {
      const updated = state.pendingPayments.filter((p) => p.localId !== localId);
      return { pendingPayments: updated, pendingCount: updated.length };
    });
  },

  syncNow: async () => {
    const { pendingPayments, isSyncing } = get();
    if (isSyncing || pendingPayments.length === 0) return;

    set({ isSyncing: true, syncError: null });
    try {
      await paymentsApi.bulkSync(pendingPayments);
      set({ pendingPayments: [], pendingCount: 0, lastSyncAt: Date.now() });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Sync failed. Will retry when online.';
      set({ syncError: msg });
    } finally {
      set({ isSyncing: false });
    }
  },

  startNetworkWatch: () => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      get().setOnline(online);
      if (online && get().pendingPayments.length > 0) {
        get().syncNow();
      }
    });
    return unsubscribe;
  },
}));
