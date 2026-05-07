import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// APSIMS Mobile Phase 1 Ultra — Offline Queue & Cache
// ============================================================

const QUEUE_KEY = 'apsims_offline_queue';

export interface OfflineRecord {
    id: string;
    type: 'marks' | 'attendance' | 'cbc_marks';
    data: any;
    queuedAt: number;
    retryCount: number;
}

// ── Queue Management ─────────────────────────────────────────

/** Add a record to the end of the FIFO offline queue */
export async function queueOfflineRecord(
    type: 'marks' | 'attendance' | 'cbc_marks',
    data: any
): Promise<void> {
    const queue = await getOfflineQueue();
    const record: OfflineRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type,
        data,
        queuedAt: Date.now(),
        retryCount: 0,
    };
    queue.push(record);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Retrieve the full queue in insertion order (FIFO) */
export async function getOfflineQueue(): Promise<OfflineRecord[]> {
    try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as OfflineRecord[];
    } catch {
        return [];
    }
}

/** Remove a successfully synced record by ID */
export async function removeFromQueue(id: string): Promise<void> {
    const queue = await getOfflineQueue();
    const updated = queue.filter(r => r.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

/** Get count of pending records in the queue */
export async function getQueueCount(): Promise<number> {
    const queue = await getOfflineQueue();
    return queue.length;
}

/** Get count of records that have failed 3+ times */
export async function getFailedCount(): Promise<number> {
    const queue = await getOfflineQueue();
    return queue.filter(r => r.retryCount >= 3).length;
}

/** Clear all records from the queue (use with caution) */
export async function clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
}

// ── Sync ─────────────────────────────────────────────────────

/**
 * Sync all queued records in FIFO order.
 * Returns count of synced and failed records.
 */
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
            // Increment retry count
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

/** Internal: dispatch a queued record to the appropriate supabase function */
async function syncRecord(record: OfflineRecord): Promise<void> {
    // Import at top level to avoid dynamic import issues
    const supabaseLib = require('./supabase');
    const saveMarks = supabaseLib.saveMarks;
    const saveAttendance = supabaseLib.saveAttendance;
    const saveCBCMarks = supabaseLib.saveCBCMarks;

    switch (record.type) {
        case 'marks': {
            const result = await saveMarks(record.data);
            if (!result.success) throw new Error(result.error || 'saveMarks failed');
            break;
        }
        case 'attendance': {
            const result = await saveAttendance(record.data);
            if (!result.success) throw new Error(result.error || 'saveAttendance failed');
            break;
        }
        case 'cbc_marks': {
            const result = await saveCBCMarks(record.data);
            if (!result.success) throw new Error(result.error || 'saveCBCMarks failed');
            break;
        }
        default:
            throw new Error(`Unknown offline record type: ${(record as any).type}`);
    }
}

// ── Cache ─────────────────────────────────────────────────────

/** Cache arbitrary data with a timestamp */
export async function cacheData(key: string, data: any): Promise<void> {
    const entry = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(`apsims_cache_${key}`, JSON.stringify(entry));
}

/** Retrieve cached data; returns null data if not found */
export async function getCachedData<T>(
    key: string
): Promise<{ data: T | null; timestamp: number | null }> {
    try {
        const raw = await AsyncStorage.getItem(`apsims_cache_${key}`);
        if (!raw) return { data: null, timestamp: null };
        const entry = JSON.parse(raw);
        return { data: entry.data as T, timestamp: entry.timestamp as number };
    } catch {
        return { data: null, timestamp: null };
    }
}

/** Clear a specific cache entry */
export async function clearCache(key: string): Promise<void> {
    await AsyncStorage.removeItem(`apsims_cache_${key}`);
}

/** Format a cache timestamp for display: "Last updated: 12 Jan 2025, 10:30 AM" */
export function formatCacheTimestamp(timestamp: number | null): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const isOld = Date.now() - timestamp > 24 * 60 * 60 * 1000;
    const formatted = date.toLocaleString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    return isOld ? `⚠️ Data may be outdated — last updated ${formatted}` : `Last updated: ${formatted}`;
}
