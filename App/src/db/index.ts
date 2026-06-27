import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';

// SQLite adapter — requires native build (expo-dev-client)
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'ledgerone',
  jsi: true,               // Enable JSI for better performance
  onSetUpError: (error) => {
    console.error('[WatermelonDB] Setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [],        // Model classes will be added per-feature
});

export default database;
