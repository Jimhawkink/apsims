/**
 * Offline queue processor for APSIMS PWA.
 *
 * Manages a persistent queue of API requests that failed due to network
 * unavailability. Items are stored in IndexedDB and retried with
 * exponential back-off when connectivity is restored.
 *
 * Store : offline_queue
 */

import type { OfflineQueueItem } from "./biometric-types";
import { getAll, put, remove, getCount } from "./indexeddb";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUEUE_STORE = "offline_queue";

/** Delays (ms) between retry attempts: attempt 2 waits 5 s, attempt 3 waits 30 s. */
const RETRY_DELAYS_MS = [0, 5_000, 30_000] as const;

/** Maximum number of attempts before an item is marked as failed. */
const MAX_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns true when running in a server-side (non-browser) environment. */
function isSSR(): boolean {
  return typeof window === "undefined";
}

/**
 * Resolves after `ms` milliseconds.
 * Used to introduce delays between retry attempts.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates a UUID v4 string.
 * Uses the native `crypto.randomUUID()` when available, otherwise falls back
 * to a manual implementation that works in older browsers.
 */
function generateUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof (crypto as Crypto & { randomUUID?: () => string }).randomUUID === "function"
  ) {
    return (crypto as Crypto & { randomUUID: () => string }).randomUUID();
  }

  // Fallback: RFC 4122 v4 UUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// addToQueue
// ---------------------------------------------------------------------------

/**
 * Adds a new item to the offline queue.
 *
 * Creates an {@link OfflineQueueItem} with a fresh UUID, timestamps it, and
 * persists it to the `offline_queue` IndexedDB store.
 *
 * @param type     - The category of the queued operation.
 * @param endpoint - The API route that should receive the POST request.
 * @param payload  - The JSON body to send when the request is replayed.
 */
export async function addToQueue(
  type: OfflineQueueItem["type"],
  endpoint: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (isSSR()) return;

  const item: OfflineQueueItem = {
    id: generateUUID(),
    type,
    endpoint,
    payload,
    queued_at: new Date().toISOString(),
    attempts: 0,
    status: "pending",
    last_error: null,
  };

  await put<OfflineQueueItem>(QUEUE_STORE, item);
}

// ---------------------------------------------------------------------------
// processOfflineQueue
// ---------------------------------------------------------------------------

/**
 * Processes all pending items in the offline queue.
 *
 * For each pending item the function attempts to POST its payload to the
 * stored endpoint. Up to {@link MAX_ATTEMPTS} attempts are made with
 * increasing delays between them (0 s → 5 s → 30 s).
 *
 * - On HTTP 200 / 201 the item is removed from the queue.
 * - After {@link MAX_ATTEMPTS} consecutive failures the item is updated with
 *   `status = 'failed'` and the last error message is recorded.
 *
 * @returns An object with three counts:
 *   - `processed`  — items successfully synced and removed from the queue.
 *   - `failed`     — items that exhausted all retries and were marked failed.
 *   - `remaining`  — items still in `pending` status after this run.
 */
export async function processOfflineQueue(): Promise<{
  processed: number;
  failed: number;
  remaining: number;
}> {
  if (isSSR()) return { processed: 0, failed: 0, remaining: 0 };

  const allItems = await getAll<OfflineQueueItem>(QUEUE_STORE);
  const pendingItems = allItems.filter((item) => item.status === "pending");

  let processed = 0;
  let failed = 0;

  for (const item of pendingItems) {
    let lastError = "";
    let succeeded = false;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // Wait before retrying (no delay on the first attempt)
      if (attempt > 0) {
        await sleep(RETRY_DELAYS_MS[attempt]);
      }

      try {
        const response = await fetch(item.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });

        if (response.status === 200 || response.status === 201) {
          succeeded = true;
          break;
        }

        lastError = `HTTP ${response.status}: ${response.statusText}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    if (succeeded) {
      await remove(QUEUE_STORE, item.id);
      processed++;
    } else {
      const failedItem: OfflineQueueItem = {
        ...item,
        status: "failed",
        attempts: MAX_ATTEMPTS,
        last_error: lastError,
      };
      await put<OfflineQueueItem>(QUEUE_STORE, failedItem);
      failed++;
    }
  }

  // Count items still pending after this run
  const afterItems = await getAll<OfflineQueueItem>(QUEUE_STORE);
  const remaining = afterItems.filter((item) => item.status === "pending").length;

  return { processed, failed, remaining };
}

// ---------------------------------------------------------------------------
// getQueueCount
// ---------------------------------------------------------------------------

/**
 * Returns the total number of items in the `offline_queue` store,
 * regardless of their status.
 */
export async function getQueueCount(): Promise<number> {
  if (isSSR()) return 0;
  return getCount(QUEUE_STORE);
}

// ---------------------------------------------------------------------------
// getPendingItems
// ---------------------------------------------------------------------------

/**
 * Returns all items in the queue that are still waiting to be synced.
 */
export async function getPendingItems(): Promise<OfflineQueueItem[]> {
  if (isSSR()) return [];
  const items = await getAll<OfflineQueueItem>(QUEUE_STORE);
  return items.filter((item) => item.status === "pending");
}

// ---------------------------------------------------------------------------
// getFailedItems
// ---------------------------------------------------------------------------

/**
 * Returns all items in the queue that have exhausted their retry attempts.
 */
export async function getFailedItems(): Promise<OfflineQueueItem[]> {
  if (isSSR()) return [];
  const items = await getAll<OfflineQueueItem>(QUEUE_STORE);
  return items.filter((item) => item.status === "failed");
}
