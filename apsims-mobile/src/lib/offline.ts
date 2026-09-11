import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// APSIMS Mobile — Offline Queue & Smart Cache (Enhanced)
// Queue: FIFO pending writes synced when back online
// Cache: Stale-while-revalidate with configurable TTL
// ============================================================

const QUEUE_KEY = 'apsims_offline_queue';

// ── Types ─────────────────────────────────────────────────────

export type OfflineRecordType =
    | 'marks'
    | 'attendance'
    | 'cbc_marks'
    | 'fee_payment'
    | 'sms_log';

export interface OfflineRecord {
    id: string;
    type: OfflineRecordType;
    data: any;
    queuedAt: number;
    retryCount: number;
}

// ── Cache TTLs (milliseconds) ─────────────────────────────────

export const CACHE_TTL = {
    timetable:    6 * 60 * 60 * 1000,  // 6 hours — timetable rarely changes
    subjects:     6 * 60 * 60 * 1000,  // 6 hours
    marks:        30 * 60 * 1000,       // 30 minutes — marks update often
    attendance:   30 * 60 * 1000,       // 30 minutes
    cbc_marks:    30 * 60 * 1000,       // 30 minutes
    fees:         15 * 60 * 1000,       // 15 minutes — financial data
    students:     2 * 60 * 60 * 1000,  // 2 hours
    notices:      10 * 60 * 1000,       // 10 minutes
    results:      60 * 60 * 1000,       // 1 hour
    dashboard:    5 * 60 * 1000,        // 5 minutes — live stats
} as const;

export type CacheKey = keyof typeof CACHE_TTL | string;

// ── Queue Management ──────────────────────────────────────────

export async function queueOfflineRecord(
    type: OfflineRecordType,
    data: any
): Promise<void> {
    const queue = await getOfflineQueue();
    const record: OfflineRecord = {
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 9),
        type,
        data,
        queuedAt: Date.now(),
        retryCount: 0,
    };
    queue.push(record);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getOfflineQueue(): Promise<OfflineRecord[]> {
    try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as OfflineRecord[];
    } catch {
        return [];
    }
}

export async function removeFromQueue(id: string): Promise<void> {
    const queue = await getOfflineQueue();
    const updated = queue.filter(r => r.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export async function getQueueCount(): Promise<number> {
    const queue = await getOfflineQueue();
    return queue.length;
}

export async function getFailedCount(): Promise<number> {
    const queue = await getOfflineQueue();
    return queue.filter(r => r.retryCount >= 3).length;
}

export async function clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
}

// ── Sync ──────────────────────────────────────────────────────

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
    const queue = await getOfflineQueue();
    let synced = 0;
    let failed = 0;

    for (const record of queue) {
        try {
            await syncRecord(record);
            await removeFromQueue(record.id);
            synced++;
        } catch {
            const currentQueue = await getOfflineQueue();
            const idx = currentQueue.findIndex(r => r.id === record.id);
            if (idx >= 0) {
                currentQueue[idx].retryCount = (currentQueue[idx].retryCount || 0) + 1;
                await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(currentQueue));
            }
            failed++;
        }
    }

    return { synced, failed };
}

async function syncRecord(record: OfflineRecord): Promise<void> {
    const lib = require('./supabase');

    switch (record.type) {
        case 'marks': {
            const result = await lib.saveMarks(record.data);
            if (!result.success) throw new Error(result.error || 'saveMarks failed');
            break;
        }
        case 'attendance': {
            const result = await lib.saveAttendance(record.data);
            if (!result.success) throw new Error(result.error || 'saveAttendance failed');
            break;
        }
        case 'cbc_marks': {
            const result = await lib.saveCBCMarks(record.data);
            if (!result.success) throw new Error(result.error || 'saveCBCMarks failed');
            break;
        }
        case 'fee_payment': {
            // Fee payments log locally when offline; re-attempt STK push on reconnect
            const result = await lib.recordFeePayment(record.data);
            if (!result.success) throw new Error(result.error || 'recordFeePayment failed');
            break;
        }
        case 'sms_log': {
            // SMS logs queued when offline
            const result = await lib.logSmsRecord(record.data);
            if (!result.success) throw new Error(result.error || 'logSmsRecord failed');
            break;
        }
        default:
            throw new Error('Unknown offline record type: ' + (record as any).type);
    }
}

// ── Smart Cache (Stale-While-Revalidate) ──────────────────────

/**
 * Cache arbitrary data with a timestamp.
 * Use a key from CACHE_TTL for automatic TTL lookup.
 */
export async function cacheData(key: string, data: any): Promise<void> {
    const entry = { data, timestamp: Date.now() };
    await AsyncStorage.setItem('apsims_cache_' + key, JSON.stringify(entry));
}

/**
 * Retrieve cached data. Returns data even if stale (caller decides).
 * Use isCacheStale() to check freshness.
 */
export async function getCachedData<T>(
    key: string
): Promise<{ data: T | null; timestamp: number | null; isStale: boolean }> {
    try {
        const raw = await AsyncStorage.getItem('apsims_cache_' + key);
        if (!raw) return { data: null, timestamp: null, isStale: true };
        const entry = JSON.parse(raw);
        const ttl = (CACHE_TTL as any)[key] ?? 60 * 60 * 1000; // default 1h
        const isStale = Date.now() - entry.timestamp > ttl;
        return { data: entry.data as T, timestamp: entry.timestamp as number, isStale };
    } catch {
        return { data: null, timestamp: null, isStale: true };
    }
}

/**
 * Stale-while-revalidate: return cached data immediately AND
 * call fetcher() to refresh in background if stale.
 * Returns { data, fromCache } — data is never null if cache exists.
 */
export async function getCachedDataWithFallback<T>(
    key: string,
    fetcher: () => Promise<T | null>
): Promise<{ data: T | null; fromCache: boolean }> {
    const cached = await getCachedData<T>(key);

    if (cached.data !== null && !cached.isStale) {
        // Fresh — return immediately
        return { data: cached.data, fromCache: true };
    }

    if (cached.data !== null && cached.isStale) {
        // Stale — return cached immediately, refresh in background
        fetcher()
            .then(fresh => { if (fresh !== null) cacheData(key, fresh); })
            .catch(() => { /* silent — offline */ });
        return { data: cached.data, fromCache: true };
    }

    // No cache — must fetch
    try {
        const fresh = await fetcher();
        if (fresh !== null) await cacheData(key, fresh);
        return { data: fresh, fromCache: false };
    } catch {
        return { data: null, fromCache: false };
    }
}

/**
 * Check if a specific cache key is stale.
 */
export async function isCacheStale(key: string): Promise<boolean> {
    const { isStale } = await getCachedData(key);
    return isStale;
}

export async function clearCache(key: string): Promise<void> {
    await AsyncStorage.removeItem('apsims_cache_' + key);
}

/**
 * Clear ALL APSIMS cache entries (useful on logout).
 */
export async function clearAllCache(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith('apsims_cache_'));
    if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
    }
}

/**
 * Get a summary of offline status: queue length, failed count, cache entries.
 */
export async function getOfflineStatus(): Promise<{
    queueCount: number;
    failedCount: number;
    cacheEntries: number;
}> {
    const [queue, keys] = await Promise.all([
        getOfflineQueue(),
        AsyncStorage.getAllKeys(),
    ]);
    const cacheKeys = keys.filter(k => k.startsWith('apsims_cache_'));
    return {
        queueCount: queue.length,
        failedCount: queue.filter(r => r.retryCount >= 3).length,
        cacheEntries: cacheKeys.length,
    };
}

// ── Display Helpers ───────────────────────────────────────────

export function formatCacheTimestamp(timestamp: number | null): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const isOld = Date.now() - timestamp > 24 * 60 * 60 * 1000;
    const formatted = date.toLocaleString('en-KE', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
    return isOld
        ? 'Data may be outdated — last updated ' + formatted
        : 'Last updated: ' + formatted;
}
