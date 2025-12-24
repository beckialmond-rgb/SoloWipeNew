import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { queryStorage } from './offlineStorage';

export const queryPersister = createAsyncStoragePersister({
  storage: {
    getItem: queryStorage.getItem,
    setItem: queryStorage.setItem,
    removeItem: queryStorage.removeItem,
  },
  key: 'solowipe-query-cache',
  throttleTime: 1000, // Throttle writes to IndexedDB
});

// Cache configuration
export const CACHE_TIME = 1000 * 60 * 60 * 24; // 24 hours
export const STALE_TIME = 1000 * 60 * 5; // 5 minutes
