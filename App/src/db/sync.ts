/**
 * WatermelonDB Sync Helpers
 * 
 * Sync strategy: API is source of truth for all entities except unsynced payments.
 * Unsynced payments are queued locally and bulk-synced via paymentsApi.bulkSync().
 * 
 * NOTE: Full WatermelonDB sync (pull/push) requires expo-dev-client.
 *       Expo Go will skip the database write and use API data only.
 */
import database from './index';
import { groupsApi } from '../api/groups.api';
import { customersApi } from '../api/customers.api';
import { loansApi } from '../api/loans.api';

/**
 * Pull fresh data from the server and return it directly.
 * (In a full implementation this would write to WatermelonDB tables.)
 */
export async function pullFromServer(groupId: string) {
  const [groupsRes, customersRes, loansRes] = await Promise.all([
    groupsApi.getAll(),
    customersApi.getAll({ groupId }),
    loansApi.getAll({ groupId }),
  ]);

  return {
    groups: groupsRes.data,
    customers: customersRes.data,
    loans: loansRes.data,
  };
}

/**
 * Check if database is available (requires native build).
 */
export function isDatabaseAvailable(): boolean {
  try {
    return !!database;
  } catch {
    return false;
  }
}
