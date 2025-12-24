import { get, set, del, keys, createStore } from 'idb-keyval';

// Check if IndexedDB is available (can fail on mobile browsers, especially iOS Safari in private mode)
let indexedDBAvailable: boolean | null = null;
let indexedDBTestPromise: Promise<boolean> | null = null;

async function testIndexedDBAvailability(): Promise<boolean> {
  if (indexedDBAvailable !== null) {
    return indexedDBAvailable;
  }

  if (indexedDBTestPromise) {
    return indexedDBTestPromise;
  }

  indexedDBTestPromise = (async () => {
    try {
      // Check if IndexedDB is supported
      if (!('indexedDB' in window)) {
        console.warn('[Storage] IndexedDB not supported, falling back to localStorage');
        indexedDBAvailable = false;
        return false;
      }

      // Try to open a test database
      const testDB = indexedDB.open('__solowipe_test__', 1);
      await new Promise<void>((resolve, reject) => {
        testDB.onsuccess = () => {
          testDB.result.close();
          indexedDB.deleteDatabase('__solowipe_test__');
          resolve();
        };
        testDB.onerror = () => reject(testDB.error);
        testDB.onblocked = () => reject(new Error('IndexedDB blocked'));
      });

      indexedDBAvailable = true;
      return true;
    } catch (error) {
      console.warn('[Storage] IndexedDB test failed, falling back to localStorage:', error);
      indexedDBAvailable = false;
      return false;
    }
  })();

  return indexedDBTestPromise;
}

// Create stores lazily with error handling
let queryStore: ReturnType<typeof createStore> | null = null;
let mutationStore: ReturnType<typeof createStore> | null = null;
let localDataStore: ReturnType<typeof createStore> | null = null;

async function getQueryStore() {
  if (queryStore) return queryStore;
  const available = await testIndexedDBAvailability();
  if (available) {
    try {
      queryStore = createStore('solowipe-queries', 'query-cache');
      return queryStore;
    } catch (error) {
      console.warn('[Storage] Failed to create query store:', error);
      indexedDBAvailable = false;
    }
  }
  return null;
}

async function getMutationStore() {
  if (mutationStore) return mutationStore;
  const available = await testIndexedDBAvailability();
  if (available) {
    try {
      mutationStore = createStore('solowipe-mutations', 'mutation-queue');
      return mutationStore;
    } catch (error) {
      console.warn('[Storage] Failed to create mutation store:', error);
      indexedDBAvailable = false;
    }
  }
  return null;
}

async function getLocalDataStore() {
  if (localDataStore) return localDataStore;
  const available = await testIndexedDBAvailability();
  if (available) {
    try {
      localDataStore = createStore('solowipe-local', 'optimistic-data');
      return localDataStore;
    } catch (error) {
      console.warn('[Storage] Failed to create local data store:', error);
      indexedDBAvailable = false;
    }
  }
  return null;
}

// localStorage fallback helpers
const getLocalStorageKey = (prefix: string, key: string) => `solowipe_${prefix}_${key}`;

const localStorageFallback = {
  getItem: async (prefix: string, key: string): Promise<string | null> => {
    try {
      const value = localStorage.getItem(getLocalStorageKey(prefix, key));
      return value;
    } catch (error) {
      console.warn(`[Storage] localStorage.getItem failed for ${key}:`, error);
      return null;
    }
  },
  setItem: async (prefix: string, key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(getLocalStorageKey(prefix, key), value);
    } catch (error) {
      console.warn(`[Storage] localStorage.setItem failed for ${key}:`, error);
      // If quota exceeded, try to clear old data
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('[Storage] Storage quota exceeded, clearing old cache data');
        try {
          // Clear old cache entries (keep last 100 keys)
          const keys = Object.keys(localStorage).filter(k => k.startsWith(`solowipe_${prefix}_`));
          if (keys.length > 100) {
            keys.slice(0, keys.length - 100).forEach(k => localStorage.removeItem(k));
          }
        } catch (clearError) {
          console.error('[Storage] Failed to clear old cache:', clearError);
        }
      }
    }
  },
  removeItem: async (prefix: string, key: string): Promise<void> => {
    try {
      localStorage.removeItem(getLocalStorageKey(prefix, key));
    } catch (error) {
      console.warn(`[Storage] localStorage.removeItem failed for ${key}:`, error);
    }
  },
  getAllKeys: async (prefix: string): Promise<string[]> => {
    try {
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`solowipe_${prefix}_`)) {
          allKeys.push(key.replace(`solowipe_${prefix}_`, ''));
        }
      }
      return allKeys;
    } catch (error) {
      console.warn(`[Storage] localStorage.getAllKeys failed:`, error);
      return [];
    }
  },
};

// Query cache persistence
export const queryStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const store = await getQueryStore();
      if (store) {
        const value = await get(key, store);
        return value ?? null;
      }
      // Fallback to localStorage
      return await localStorageFallback.getItem('query', key);
    } catch (error) {
      console.warn('[Storage] Failed to get query cache item:', error);
      // Try localStorage fallback
      try {
        return await localStorageFallback.getItem('query', key);
      } catch {
        return null;
      }
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const store = await getQueryStore();
      if (store) {
        await set(key, value, store);
        return;
      }
      // Fallback to localStorage
      await localStorageFallback.setItem('query', key, value);
    } catch (error) {
      console.warn('[Storage] Failed to persist query cache:', error);
      // Try localStorage fallback
      try {
        await localStorageFallback.setItem('query', key, value);
      } catch (fallbackError) {
        console.error('[Storage] Both IndexedDB and localStorage failed:', fallbackError);
      }
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      const store = await getQueryStore();
      if (store) {
        await del(key, store);
        return;
      }
      // Fallback to localStorage
      await localStorageFallback.removeItem('query', key);
    } catch (error) {
      console.warn('[Storage] Failed to remove from query cache:', error);
      // Try localStorage fallback
      try {
        await localStorageFallback.removeItem('query', key);
      } catch {
        // Ignore fallback errors
      }
    }
  },
};

// Offline mutation queue types
export interface OfflineMutation {
  id: string;
  type: 'completeJob' | 'markJobPaid' | 'rescheduleJob' | 'skipJob' | 'updateJobNotes' | 'batchMarkPaid';
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

// Mutation queue configuration
const MUTATION_QUEUE_MAX_SIZE = 100; // Maximum number of mutations in queue
const MUTATION_QUEUE_WARNING_THRESHOLD = 50; // Warn user when queue exceeds this

// Mutation queue operations
export const mutationQueue = {
  add: async (mutation: Omit<OfflineMutation, 'id' | 'createdAt' | 'retryCount'>): Promise<string> => {
    const id = `mutation_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const fullMutation: OfflineMutation = {
      ...mutation,
      id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    
    const existingMutations = await mutationQueue.getAll();
    let updatedMutations = [...existingMutations, fullMutation];
    
    // Trim queue if it exceeds max size (remove oldest mutations first)
    if (updatedMutations.length > MUTATION_QUEUE_MAX_SIZE) {
      // Sort by creation date (oldest first) and keep only the most recent ones
      updatedMutations.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const removedCount = updatedMutations.length - MUTATION_QUEUE_MAX_SIZE;
      updatedMutations = updatedMutations.slice(-MUTATION_QUEUE_MAX_SIZE);
      console.warn(
        `[MutationQueue] Queue exceeded max size (${MUTATION_QUEUE_MAX_SIZE}). ` +
        `Removed ${removedCount} oldest mutation(s).`
      );
    }
    
    // Warn if queue is getting large
    if (updatedMutations.length >= MUTATION_QUEUE_WARNING_THRESHOLD) {
      console.warn(
        `[MutationQueue] Queue size is ${updatedMutations.length}/${MUTATION_QUEUE_MAX_SIZE}. ` +
        `Please sync your changes when online.`
      );
    }
    
    try {
      const store = await getMutationStore();
      if (store) {
        await set('queue', updatedMutations, store);
      } else {
        // Fallback to localStorage
        await localStorageFallback.setItem('mutation', 'queue', JSON.stringify(updatedMutations));
      }
    } catch (error) {
      console.warn('[Storage] Failed to add mutation to queue:', error);
      // Try localStorage fallback
      try {
        await localStorageFallback.setItem('mutation', 'queue', JSON.stringify(updatedMutations));
      } catch (fallbackError) {
        console.error('[Storage] Both IndexedDB and localStorage failed for mutation queue:', fallbackError);
      }
    }
    
    return id;
  },
  
  getAll: async (): Promise<OfflineMutation[]> => {
    try {
      const store = await getMutationStore();
      if (store) {
        const mutations = await get('queue', store);
        return mutations ?? [];
      }
      // Fallback to localStorage
      const stored = await localStorageFallback.getItem('mutation', 'queue');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.warn('[Storage] Failed to get mutation queue:', error);
      // Try localStorage fallback
      try {
        const stored = await localStorageFallback.getItem('mutation', 'queue');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // Ignore parse errors
      }
      return [];
    }
  },
  
  remove: async (id: string): Promise<void> => {
    const mutations = await mutationQueue.getAll();
    const updated = mutations.filter(m => m.id !== id);
    
    try {
      const store = await getMutationStore();
      if (store) {
        await set('queue', updated, store);
      } else {
        await localStorageFallback.setItem('mutation', 'queue', JSON.stringify(updated));
      }
    } catch (error) {
      console.warn('[Storage] Failed to remove mutation:', error);
      try {
        await localStorageFallback.setItem('mutation', 'queue', JSON.stringify(updated));
      } catch {
        // Ignore fallback errors
      }
    }
  },
  
  updateRetryCount: async (id: string): Promise<void> => {
    const mutations = await mutationQueue.getAll();
    const updated = mutations.map(m => 
      m.id === id ? { ...m, retryCount: m.retryCount + 1 } : m
    );
    
    try {
      const store = await getMutationStore();
      if (store) {
        await set('queue', updated, store);
      } else {
        await localStorageFallback.setItem('mutation', 'queue', JSON.stringify(updated));
      }
    } catch (error) {
      console.warn('[Storage] Failed to update mutation retry count:', error);
      try {
        await localStorageFallback.setItem('mutation', 'queue', JSON.stringify(updated));
      } catch {
        // Ignore fallback errors
      }
    }
  },
  
  clear: async (): Promise<void> => {
    try {
      const store = await getMutationStore();
      if (store) {
        await set('queue', [], store);
      } else {
        await localStorageFallback.setItem('mutation', 'queue', JSON.stringify([]));
      }
    } catch (error) {
      console.warn('[Storage] Failed to clear mutation queue:', error);
      try {
        await localStorageFallback.setItem('mutation', 'queue', JSON.stringify([]));
      } catch {
        // Ignore fallback errors
      }
    }
  },
  
  count: async (): Promise<number> => {
    const mutations = await mutationQueue.getAll();
    return mutations.length;
  },
};

// Last sync timestamp storage
export const syncStatus = {
  setLastSynced: async (timestamp: string): Promise<void> => {
    try {
      localStorage.setItem('solowipe_last_synced', timestamp);
    } catch (error) {
      console.warn('Failed to save last synced timestamp:', error);
    }
  },
  
  getLastSynced: (): string | null => {
    try {
      return localStorage.getItem('solowipe_last_synced');
    } catch {
      return null;
    }
  },
};

// Local optimistic data store for offline changes
export const localData = {
  // Store optimistic job updates
  setOptimisticJob: async (jobId: string, data: Record<string, unknown>): Promise<void> => {
    try {
      const store = await getLocalDataStore();
      if (store) {
        await set(`job_${jobId}`, data, store);
      } else {
        await localStorageFallback.setItem('local', `job_${jobId}`, JSON.stringify(data));
      }
    } catch (error) {
      console.warn('[Storage] Failed to set optimistic job:', error);
      try {
        await localStorageFallback.setItem('local', `job_${jobId}`, JSON.stringify(data));
      } catch (fallbackError) {
        console.error('[Storage] Both IndexedDB and localStorage failed for optimistic job:', fallbackError);
      }
    }
  },
  
  getOptimisticJob: async (jobId: string): Promise<Record<string, unknown> | null> => {
    try {
      const store = await getLocalDataStore();
      if (store) {
        return await get(`job_${jobId}`, store);
      }
      // Fallback to localStorage
      const stored = await localStorageFallback.getItem('local', `job_${jobId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
      return null;
    } catch (error) {
      console.warn('[Storage] Failed to get optimistic job:', error);
      try {
        const stored = await localStorageFallback.getItem('local', `job_${jobId}`);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // Ignore parse errors
      }
      return null;
    }
  },
  
  removeOptimisticJob: async (jobId: string): Promise<void> => {
    try {
      const store = await getLocalDataStore();
      if (store) {
        await del(`job_${jobId}`, store);
      } else {
        await localStorageFallback.removeItem('local', `job_${jobId}`);
      }
    } catch (error) {
      console.warn('[Storage] Failed to remove optimistic job:', error);
      try {
        await localStorageFallback.removeItem('local', `job_${jobId}`);
      } catch {
        // Ignore fallback errors
      }
    }
  },
  
  // Get all optimistic changes
  getAllOptimisticJobs: async (): Promise<Record<string, Record<string, unknown>>> => {
    try {
      const store = await getLocalDataStore();
      if (store) {
        const allKeys = await keys(store);
        const result: Record<string, Record<string, unknown>> = {};
        
        for (const key of allKeys) {
          if (typeof key === 'string' && key.startsWith('job_')) {
            const jobId = key.replace('job_', '');
            const data = await get(key, store);
            if (data) {
              result[jobId] = data;
            }
          }
        }
        
        return result;
      }
      // Fallback to localStorage
      const allKeys = await localStorageFallback.getAllKeys('local');
      const result: Record<string, Record<string, unknown>> = {};
      
      for (const key of allKeys) {
        if (key.startsWith('job_')) {
          const jobId = key.replace('job_', '');
          const stored = await localStorageFallback.getItem('local', key);
          if (stored) {
            try {
              result[jobId] = JSON.parse(stored);
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
      
      return result;
    } catch (error) {
      console.warn('[Storage] Failed to get all optimistic jobs:', error);
      return {};
    }
  },
  
  clearAll: async (): Promise<void> => {
    try {
      const store = await getLocalDataStore();
      if (store) {
        const allKeys = await keys(store);
        for (const key of allKeys) {
          await del(key, store);
        }
      } else {
        const allKeys = await localStorageFallback.getAllKeys('local');
        for (const key of allKeys) {
          await localStorageFallback.removeItem('local', key);
        }
      }
    } catch (error) {
      console.warn('[Storage] Failed to clear all optimistic data:', error);
    }
  },
};
