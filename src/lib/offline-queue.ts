// ─── APSIMS Offline Queue ─────────────────────────────────────────────────────
// Stores pending DB writes in localStorage when offline.
// Replays them against Supabase when back online.

export type QueuedOperation = {
    id: string;                 // unique id
    table: string;              // e.g. 'school_exam_marks'
    operation: 'insert' | 'update' | 'upsert';
    payload: Record<string, any>;
    matchKey?: Record<string, any>; // for update: {student_id, subject_id, ...}
    label: string;              // human-readable e.g. "John Doe — Maths mark"
    timestamp: string;          // ISO
    retries: number;
};

const QUEUE_KEY = 'apsims_offline_queue';

export function getQueue(): QueuedOperation[] {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch { return []; }
}

export function enqueue(op: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>): void {
    const queue = getQueue();
    queue.push({
        ...op,
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        timestamp: new Date().toISOString(),
        retries: 0,
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function dequeue(id: string): void {
    const queue = getQueue().filter(op => op.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue(): void {
    localStorage.removeItem(QUEUE_KEY);
}

export function getQueueSize(): number {
    return getQueue().length;
}

// ─── Replay all queued ops against Supabase ───────────────────────────────────
export async function replayQueue(
    supabase: any,
    onProgress?: (done: number, total: number, label: string) => void
): Promise<{ success: number; failed: number }> {
    const queue = getQueue();
    let success = 0;
    let failed = 0;

    for (let i = 0; i < queue.length; i++) {
        const op = queue[i];
        onProgress?.(i, queue.length, op.label);

        try {
            let error: any = null;

            if (op.operation === 'upsert') {
                ({ error } = await supabase.from(op.table).upsert(op.payload));
            } else if (op.operation === 'update' && op.matchKey) {
                let q = supabase.from(op.table).update(op.payload);
                Object.entries(op.matchKey).forEach(([k, v]) => { q = q.eq(k, v); });
                ({ error } = await q);
            } else {
                // insert — check if row already exists first (avoid duplicates)
                if (op.matchKey) {
                    let checkQ = supabase.from(op.table).select('id');
                    Object.entries(op.matchKey).forEach(([k, v]) => { checkQ = checkQ.eq(k, v); });
                    const { data: existing } = await checkQ.maybeSingle();
                    if (existing?.id) {
                        // row exists → update instead
                        let uq = supabase.from(op.table).update(op.payload).eq('id', existing.id);
                        ({ error } = await uq);
                    } else {
                        ({ error } = await supabase.from(op.table).insert([op.payload]));
                    }
                } else {
                    ({ error } = await supabase.from(op.table).insert([op.payload]));
                }
            }

            if (error) {
                failed++;
                // increment retry count but keep in queue
                const updated = getQueue().map(q =>
                    q.id === op.id ? { ...q, retries: q.retries + 1 } : q
                );
                localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
            } else {
                dequeue(op.id);
                success++;
            }
        } catch {
            failed++;
        }
    }

    onProgress?.(queue.length, queue.length, 'Done');
    return { success, failed };
}
