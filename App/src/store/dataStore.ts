import { create } from 'zustand';
import { groupsApi } from '../api/groups.api';
import { customersApi } from '../api/customers.api';
import { paymentsApi } from '../api/payments.api';

interface DataState {
  groups: any[];
  groupsLoaded: boolean;
  customers: any[];
  customersLoaded: boolean;
  todayPayments: any[];
  paymentsLoaded: boolean;
  isLoading: boolean;

  fetchGroups: (force?: boolean) => Promise<any[]>;
  fetchCustomers: (force?: boolean) => Promise<any[]>;
  fetchTodayPayments: (force?: boolean) => Promise<any[]>;
  invalidateCache: () => void;
  lastCreatedCustomer: { id: string; name: string } | null;
  setLastCreatedCustomer: (customer: { id: string; name: string } | null) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  groups: [],
  groupsLoaded: false,
  customers: [],
  customersLoaded: false,
  todayPayments: [],
  paymentsLoaded: false,
  isLoading: false,

  fetchGroups: async (force = false) => {
    const { groups, groupsLoaded } = get();
    if (groupsLoaded && !force) {
      return groups;
    }
    set({ isLoading: true });
    try {
      const { data } = await groupsApi.getAll();
      set({ groups: data, groupsLoaded: true });
      return data;
    } catch (err) {
      console.error('[DataStore] Fetch groups failed:', err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCustomers: async (force = false) => {
    const { customers, customersLoaded } = get();
    if (customersLoaded && !force) {
      return customers;
    }
    set({ isLoading: true });
    try {
      const { data } = await customersApi.getAll({ limit: 1000 });
      const list = data.customers ?? data;
      set({ customers: list, customersLoaded: true });
      return list;
    } catch (err) {
      console.error('[DataStore] Fetch customers failed:', err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTodayPayments: async (force = false) => {
    const { todayPayments, paymentsLoaded } = get();
    if (paymentsLoaded && !force) {
      return todayPayments;
    }
    set({ isLoading: true });
    try {
      const { data } = await paymentsApi.getTodayPayments();
      const list = data.payments ?? data;
      set({ todayPayments: list, paymentsLoaded: true });
      return list;
    } catch (err) {
      console.error('[DataStore] Fetch today payments failed:', err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  invalidateCache: () => {
    set({
      groupsLoaded: false,
      customersLoaded: false,
      paymentsLoaded: false,
    });
  },
  lastCreatedCustomer: null,
  setLastCreatedCustomer: (customer) => set({ lastCreatedCustomer: customer }),
}));
