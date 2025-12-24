import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { queryStorage } from './offlineStorage';

// Create persister with error handling to prevent module load failures
let queryPersisterInstance: ReturnType<typeof createAsyncStoragePersister> | null = null;

function createQueryPersister() {
  if (queryPersisterInstance) {
    return queryPersisterInstance;
  }

  try {
    queryPersisterInstance = createAsyncStoragePersister({
      storage: {
        getItem: async (key: string) => {
          try {
            return await queryStorage.getItem(key);
          } catch (error) {
            console.warn('[QueryPersister] getItem failed, returning null:', error);
            return null;
          }
        },
        setItem: async (key: string, value: string) => {
          try {
            await queryStorage.setItem(key, value);
          } catch (error) {
            console.warn('[QueryPersister] setItem failed (non-blocking):', error);
            // Don't throw - allow app to continue without persistence
          }
        },
        removeItem: async (key: string) => {
          try {
            await queryStorage.removeItem(key);
          } catch (error) {
            console.warn('[QueryPersister] removeItem failed (non-blocking):', error);
            // Don't throw - allow app to continue
          }
        },
      },
      key: 'solowipe-query-cache',
      throttleTime: 1000, // Throttle writes to IndexedDB
    });
    return queryPersisterInstance;
  } catch (error) {
    console.error('[QueryPersister] Failed to create persister:', error);
    // Return a no-op persister that won't crash the app
    return createAsyncStoragePersister({
      storage: {
        getItem: async () => null,
        setItem: async () => {},
        removeItem: async () => {},
      },
      key: 'solowipe-query-cache-fallback',
      throttleTime: 1000,
    });
  }
}

export const queryPersister = createQueryPersister();

// Cache configuration
export const CACHE_TIME = 1000 * 60 * 60 * 24; // 24 hours
export const STALE_TIME = 1000 * 60 * 5; // 5 minutes
