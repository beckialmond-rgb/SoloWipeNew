import { get, set, del, keys, createStore } from 'idb-keyval';

// Create dedicated stores for different data types
const queryStore = createStore('solowipe-queries', 'query-cache');
const mutationStore = createStore('solowipe-mutations', 'mutation-queue');

// Query cache persistence
export const queryStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await get(key, queryStore);
      return value ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await set(key, value, queryStore);
    } catch (error) {
      console.warn('Failed to persist query cache:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await del(key, queryStore);
    } catch (error) {
      console.warn('Failed to remove from query cache:', error);
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
    await set('queue', [...existingMutations, fullMutation], mutationStore);
    
    return id;
  },
  
  getAll: async (): Promise<OfflineMutation[]> => {
    try {
      const mutations = await get('queue', mutationStore);
      return mutations ?? [];
    } catch {
      return [];
    }
  },
  
  remove: async (id: string): Promise<void> => {
    const mutations = await mutationQueue.getAll();
    await set('queue', mutations.filter(m => m.id !== id), mutationStore);
  },
  
  updateRetryCount: async (id: string): Promise<void> => {
    const mutations = await mutationQueue.getAll();
    const updated = mutations.map(m => 
      m.id === id ? { ...m, retryCount: m.retryCount + 1 } : m
    );
    await set('queue', updated, mutationStore);
  },
  
  clear: async (): Promise<void> => {
    await set('queue', [], mutationStore);
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
const localDataStore = createStore('solowipe-local', 'optimistic-data');

export const localData = {
  // Store optimistic job updates
  setOptimisticJob: async (jobId: string, data: Record<string, unknown>): Promise<void> => {
    await set(`job_${jobId}`, data, localDataStore);
  },
  
  getOptimisticJob: async (jobId: string): Promise<Record<string, unknown> | null> => {
    try {
      return await get(`job_${jobId}`, localDataStore);
    } catch {
      return null;
    }
  },
  
  removeOptimisticJob: async (jobId: string): Promise<void> => {
    await del(`job_${jobId}`, localDataStore);
  },
  
  // Get all optimistic changes
  getAllOptimisticJobs: async (): Promise<Record<string, Record<string, unknown>>> => {
    try {
      const allKeys = await keys(localDataStore);
      const result: Record<string, Record<string, unknown>> = {};
      
      for (const key of allKeys) {
        if (typeof key === 'string' && key.startsWith('job_')) {
          const jobId = key.replace('job_', '');
          const data = await get(key, localDataStore);
          if (data) {
            result[jobId] = data;
          }
        }
      }
      
      return result;
    } catch {
      return {};
    }
  },
  
  clearAll: async (): Promise<void> => {
    const allKeys = await keys(localDataStore);
    for (const key of allKeys) {
      await del(key, localDataStore);
    }
  },
};
